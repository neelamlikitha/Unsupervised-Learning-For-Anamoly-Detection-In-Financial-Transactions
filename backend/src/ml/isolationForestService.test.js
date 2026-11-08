import assert from 'node:assert/strict';
import test from 'node:test';
import { createIsolationForestModelManager, classifyTransaction } from './isolationForestService.js';

const trainingRows = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  amount: 800 + index * 75,
  time_of_day: 9 + (index % 8),
  amount_last_24h: index * 120,
  txn_count_last_24h: index % 4,
  category: index % 2 ? 'groceries' : 'shopping'
}));

test('identical feature vectors score consistently against the same model version', async () => {
  const manager = createIsolationForestModelManager({
    loadTrainingRows: async () => trainingRows
  });
  const trained = await manager.retrain();
  const features = [85000, 13, 0, 0, 6];
  const first = manager.score(features);
  const second = manager.score(features);

  assert.equal(trained.activated, true);
  assert.deepEqual(second, first);
  assert.equal(first.modelVersion, trained.modelVersion);
});

test('electronics business rule includes amounts at and above threshold and normalizes category', () => {
  const base = { score: 0.2, level: 'NORMAL', modelVersion: 4, category: ' Electronics ' };
  const options = { highValueElectronicsMinAmount: 50000 };
  assert.equal(classifyTransaction({ ...base, amount: 49999 }, options).level, 'NORMAL');
  const atThreshold = classifyTransaction({ ...base, amount: 50000 }, options);
  assert.equal(atThreshold.level, 'HIGH_RISK');
  assert.equal(atThreshold.score, 0.2);
  assert.equal(atThreshold.source, 'ML_AND_BUSINESS_RULE');
  assert.equal(classifyTransaction({ ...base, amount: 50001 }, options).level, 'HIGH_RISK');
});

test('ordinary transactions retain Isolation Forest classification and source', () => {
  const result = classifyTransaction({
    score: 0.6,
    level: 'SUSPICIOUS',
    modelVersion: 2,
    category: 'food',
    amount: 18000
  });

  assert.equal(result.level, 'SUSPICIOUS');
  assert.equal(result.mlLevel, 'SUSPICIOUS');
  assert.equal(result.source, 'ML');
  assert.equal(result.status, 'SCORED');
});

test('without an active model, ordinary transactions remain insufficiently scored', () => {
  const manager = createIsolationForestModelManager({
    loadTrainingRows: async () => []
  });
  const modelResult = manager.score([1000, 12, 0, 0, 0]);
  const result = classifyTransaction({
    ...modelResult,
    category: 'shopping',
    amount: 1000
  });

  assert.equal(result.score, null);
  assert.equal(result.level, 'INSUFFICIENT_HISTORY');
  assert.equal(result.status, 'INSUFFICIENT_HISTORY');
});

test('failed scheduled replacement retains the previous active model', async () => {
  const manager = createIsolationForestModelManager({
    loadTrainingRows: async () => trainingRows
  });
  await manager.retrain();
  const features = [1200, 12, 0, 0, 0];
  const previousScore = manager.score(features);
  const previousInfo = manager.getActiveModelInfo();

  await assert.rejects(
    manager.retrain(async () => {
      throw new Error('simulated persistence failure');
    }),
    /simulated persistence failure/
  );

  assert.deepEqual(manager.getActiveModelInfo(), previousInfo);
  assert.deepEqual(manager.score(features), previousScore);
});

test('candidate training failure retains the previous active model', async () => {
  let factoryCalls = 0;
  const manager = createIsolationForestModelManager({
    loadTrainingRows: async () => trainingRows,
    forestFactory: () => {
      factoryCalls += 1;
      if (factoryCalls === 1) return {
        train() {},
        predict: (features) => features.map(() => 0.2)
      };
      return {
        train() {
          throw new Error('simulated training failure');
        },
        predict: () => []
      };
    }
  });
  await manager.retrain();
  const features = [1200, 12, 0, 0, 0];
  const previousScore = manager.score(features);
  const previousInfo = manager.getActiveModelInfo();

  await assert.rejects(manager.retrain(), /simulated training failure/);

  assert.deepEqual(manager.getActiveModelInfo(), previousInfo);
  assert.deepEqual(manager.score(features), previousScore);
});

test('invalid candidate scores retain the previous active model', async () => {
  let factoryCalls = 0;
  const manager = createIsolationForestModelManager({
    loadTrainingRows: async () => trainingRows,
    forestFactory: () => {
      factoryCalls += 1;
      const currentFactoryCall = factoryCalls;
      return {
        train() {},
        predict: (features) => features.map(() => currentFactoryCall === 1 ? 0.2 : Number.NaN)
      };
    }
  });
  await manager.retrain();
  const features = [1200, 12, 0, 0, 0];
  const previousScore = manager.score(features);
  const previousInfo = manager.getActiveModelInfo();

  await assert.rejects(manager.retrain(), /invalid training scores/);

  assert.deepEqual(manager.getActiveModelInfo(), previousInfo);
  assert.deepEqual(manager.score(features), previousScore);
});

test('scheduled model scores retain the business-rule classification for matching history', async () => {
  const rows = trainingRows.map((row, index) => index === 0
    ? { ...row, amount: 50000, category: ' Electronics ' }
    : row);
  const manager = createIsolationForestModelManager({
    loadTrainingRows: async () => rows,
    forestFactory: () => ({
      train() {},
      predict: (features) => features.map(() => 0.2)
    })
  });
  let persisted;
  await manager.retrain(async (scores) => {
    persisted = scores;
  });

  assert.equal(persisted[0].score, 0.2);
  assert.equal(persisted[0].level, 'HIGH_RISK');
});
