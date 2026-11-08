import { IsolationForest } from 'ml-isolation-forest';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

const MIN_TRAINING_SAMPLES = 10;

const CATEGORY_INDEX = Object.fromEntries(
  ['shopping', 'food', 'travel', 'entertainment', 'groceries', 'utilities', 'electronics', 'other']
    .map((category, index) => [category, index])
);

function normalizeCategory(category) {
  return String(category ?? '').trim().toLowerCase();
}

export function getCategoryIndex(category) {
  return CATEGORY_INDEX[normalizeCategory(category)] ?? CATEGORY_INDEX.other;
}

function buildFeatureVector(row) {
  const amount = Number(row.amount) || 0;
  const parsedTimeOfDay = Number(row.time_of_day);
  const timeOfDay = Number.isFinite(parsedTimeOfDay) ? parsedTimeOfDay : 12;
  const amountLast24h = Number(row.amount_last_24h) || 0;
  const txnCountLast24h = Number(row.txn_count_last_24h) || 0;
  const categoryIndex = row.category != null ? getCategoryIndex(row.category) : 0;
  return [amount, timeOfDay, amountLast24h, txnCountLast24h, categoryIndex];
}

export function scoreToLevel(score) {
  if (!Number.isFinite(score) || score < 0 || score > 1) return null;
  const { thresholdHighRisk, thresholdSuspicious } = env.anomaly;
  if (score > thresholdHighRisk) return 'HIGH_RISK';
  if (score > thresholdSuspicious) return 'SUSPICIOUS';
  return 'NORMAL';
}

export function classifyTransaction(
  { score, level: mlLevel, modelVersion = null, category, amount },
  { highValueElectronicsMinAmount = env.anomaly.highValueElectronicsMinAmount } = {}
) {
  const hasMlScore = Number.isFinite(score) && score >= 0 && score <= 1
    && ['NORMAL', 'SUSPICIOUS', 'HIGH_RISK'].includes(mlLevel);
  const matchesElectronicsRule = normalizeCategory(category) === 'electronics'
    && Number.isFinite(Number(amount))
    && Number(amount) >= highValueElectronicsMinAmount;

  if (!hasMlScore && !matchesElectronicsRule) {
    return {
      score: null,
      level: 'INSUFFICIENT_HISTORY',
      mlLevel: null,
      status: 'INSUFFICIENT_HISTORY',
      source: 'INSUFFICIENT_HISTORY',
      explanation: 'No active Isolation Forest model is available to score this transaction.',
      modelVersion: null
    };
  }

  const level = matchesElectronicsRule ? 'HIGH_RISK' : mlLevel;
  const source = matchesElectronicsRule
    ? hasMlScore ? 'ML_AND_BUSINESS_RULE' : 'BUSINESS_RULE'
    : 'ML';
  const explanation = matchesElectronicsRule
    ? hasMlScore
    ? `Isolation Forest result: ${mlLevel}. The high-value electronics rule also matched (amount >= INR ${highValueElectronicsMinAmount}).`
    : `The high-value electronics rule matched (amount >= INR ${highValueElectronicsMinAmount}); no Isolation Forest score is available.`
    : `Classified by the active Isolation Forest model (${mlLevel}).`;

  return {
    score: hasMlScore ? score : null,
    level,
    mlLevel: hasMlScore ? mlLevel : null,
    status: hasMlScore ? 'SCORED' : 'BUSINESS_RULE',
    source,
    explanation,
    modelVersion: hasMlScore ? modelVersion : null
  };
}

export function createIsolationForestModelManager({
  loadTrainingRows,
  forestFactory = () => new IsolationForest(),
  minTrainingSamples = MIN_TRAINING_SAMPLES
}) {
  let activeModel = null;
  let nextVersion = 1;
  let retraining = null;

  async function retrain(afterTraining) {
    if (retraining) return retraining;

    retraining = (async () => {
      const rows = await loadTrainingRows();
      if (rows.length < minTrainingSamples) {
        return { scores: [], activated: false, modelVersion: activeModel?.version ?? null };
      }

      const features = rows.map(buildFeatureVector);
      const candidate = forestFactory();
      candidate.train(features);
      const scores = candidate.predict(features);
      if (scores.length !== rows.length
        || !scores.every((score) => Number.isFinite(score) && score >= 0 && score <= 1)) {
        throw new Error('Isolation Forest returned invalid training scores.');
      }

      const version = nextVersion;
      const scoredRows = rows.map((row, index) => {
        const score = Number(scores[index]);
        const classification = classifyTransaction({
          score,
          level: scoreToLevel(score),
          modelVersion: version,
          category: row.category,
          amount: Number(row.amount)
        });
        return { id: row.id, score, level: classification.level };
      });

      if (afterTraining) await afterTraining(scoredRows);

      activeModel = { forest: candidate, version, trainingSize: rows.length };
      nextVersion += 1;
      return { scores: scoredRows, activated: true, modelVersion: version };
    })();

    try {
      return await retraining;
    } finally {
      retraining = null;
    }
  }

  function score(features) {
    if (!Array.isArray(features) || features.length !== 5 || !features.every(Number.isFinite)) {
      throw new TypeError('Transaction features must contain five finite numbers.');
    }
    if (!activeModel) {
      return {
        score: null,
        level: 'INSUFFICIENT_HISTORY',
        modelVersion: null
      };
    }

    const [rawScore] = activeModel.forest.predict([features]);
    const score = Number(rawScore);
    const level = scoreToLevel(score);
    if (level == null) {
      throw new Error('Active Isolation Forest returned an invalid score.');
    }
    return { score, level, modelVersion: activeModel.version };
  }

  return {
    retrain,
    score,
    getActiveModelInfo: () => activeModel
      ? { version: activeModel.version, trainingSize: activeModel.trainingSize }
      : null
  };
}

const modelManager = createIsolationForestModelManager({
  loadTrainingRows: async () => {
    const result = await query(
      `SELECT id, amount, time_of_day, amount_last_24h, txn_count_last_24h, category
       FROM transactions
       ORDER BY id ASC`
    );
    return result.rows;
  }
});

export async function trainIsolationForestOnAllTransactions({ afterTraining } = {}) {
  const result = await modelManager.retrain(afterTraining);
  return result.scores;
}

export async function scoreNewTransaction(features, { category, amount } = {}) {
  const modelResult = modelManager.score(features);
  return classifyTransaction({ ...modelResult, category, amount });
}
