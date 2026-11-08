import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyTransaction,
  createIsolationForestModelManager
} from '../ml/isolationForestService.js';
import { createSimulationHandler } from './transactionRoutes.js';

async function invokeSimulation({ classification, scoreTransaction, savedTransaction, payload = {} }) {
  let inserted;
  const handler = createSimulationHandler({
    queryTransactions: async () => ({ rows: [] }),
    scoreTransaction: scoreTransaction ?? (async () => classification),
    saveTransaction: async (transaction) => {
      inserted = transaction;
      return savedTransaction;
    },
    sendAlert: async () => {}
  });
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };

  await handler({
    user: { id: 21, email: 'user@example.test' },
    body: {
      amount: 85000,
      merchant: 'Flipkart',
      category: 'electronics',
      channel: 'online',
      city: 'Mumbai',
      ...payload
    }
  }, response);

  return { inserted, response };
}

test('simulation keeps response compatibility and persists raw ML score and final level', async () => {
  const savedTransaction = { id: 91, amount: '85000', anomaly_level: 'HIGH_RISK' };
  const { inserted, response } = await invokeSimulation({
    classification: {
      score: 0.81,
      level: 'HIGH_RISK',
      mlLevel: 'HIGH_RISK',
      status: 'SCORED',
      source: 'ML_AND_BUSINESS_RULE',
      explanation: 'Both scoring methods matched.',
      modelVersion: 3
    },
    savedTransaction
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body.transaction, savedTransaction);
  assert.equal(response.body.anomaly.score, 0.81);
  assert.equal(response.body.anomaly.level, 'HIGH_RISK');
  assert.equal(response.body.anomaly.status, 'SCORED');
  assert.equal(response.body.anomaly.source, 'ML_AND_BUSINESS_RULE');
  assert.equal(response.body.anomaly.modelVersion, 3);
  assert.equal(inserted.anomalyScore, 0.81);
  assert.equal(inserted.isAnomaly, true);
  assert.equal(inserted.anomalyLevel, 'HIGH_RISK');
});

test('business-rule-only result is persisted as high risk without inventing an ML score', async () => {
  const { inserted, response } = await invokeSimulation({
    classification: {
      score: null,
      level: 'HIGH_RISK',
      mlLevel: null,
      status: 'BUSINESS_RULE',
      source: 'BUSINESS_RULE',
      explanation: 'The high-value electronics rule matched.',
      modelVersion: null
    },
    savedTransaction: { id: 92, anomaly_level: 'HIGH_RISK' }
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.anomaly.score, null);
  assert.equal(response.body.anomaly.status, 'BUSINESS_RULE');
  assert.equal(response.body.anomaly.source, 'BUSINESS_RULE');
  assert.equal(inserted.anomalyScore, null);
  assert.equal(inserted.isAnomaly, true);
  assert.equal(inserted.anomalyLevel, 'HIGH_RISK');
});

test('real electronics rule without an active model persists high risk without an ML score', async () => {
  const modelManager = createIsolationForestModelManager({
    loadTrainingRows: async () => []
  });
  const { inserted, response } = await invokeSimulation({
    scoreTransaction: async (features, transaction) => classifyTransaction({
      ...modelManager.score(features),
      ...transaction
    }),
    payload: { amount: 50000, category: ' Electronics ' },
    savedTransaction: { id: 94, anomaly_level: 'HIGH_RISK' }
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.anomaly.level, 'HIGH_RISK');
  assert.equal(response.body.anomaly.status, 'BUSINESS_RULE');
  assert.equal(response.body.anomaly.score, null);
  assert.equal(inserted.anomalyScore, null);
  assert.equal(inserted.isAnomaly, true);
  assert.equal(inserted.anomalyLevel, 'HIGH_RISK');
});

test('insufficient-history result is never persisted as normal', async () => {
  const { inserted, response } = await invokeSimulation({
    payload: { amount: 1200, category: 'shopping' },
    classification: {
      score: null,
      level: 'INSUFFICIENT_HISTORY',
      mlLevel: null,
      status: 'INSUFFICIENT_HISTORY',
      source: 'INSUFFICIENT_HISTORY',
      explanation: 'No active model is available.',
      modelVersion: null
    },
    savedTransaction: { id: 93, anomaly_level: 'INSUFFICIENT_HISTORY' }
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.anomaly.level, 'INSUFFICIENT_HISTORY');
  assert.equal(response.body.anomaly.status, 'INSUFFICIENT_HISTORY');
  assert.equal(inserted.anomalyScore, null);
  assert.equal(inserted.isAnomaly, null);
  assert.equal(inserted.anomalyLevel, 'INSUFFICIENT_HISTORY');
});
