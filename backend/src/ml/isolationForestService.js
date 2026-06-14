import { IsolationForest } from 'ml-isolation-forest';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

const CATEGORY_INDEX = Object.fromEntries(
  ['shopping', 'food', 'travel', 'entertainment', 'groceries', 'utilities', 'electronics', 'other'].map((c, i) => [c, i])
);
export function getCategoryIndex(cat) {
  return CATEGORY_INDEX[String(cat).toLowerCase()] ?? CATEGORY_INDEX.other ?? 0;
}

// Feature vector: amount, time_of_day, amount_last_24h, txn_count_last_24h, category_index
function buildFeatureVector(row) {
  const amount = Number(row.amount) || 0;
  const timeOfDay = Number(row.time_of_day) ?? 12;
  const amountLast24h = Number(row.amount_last_24h) || 0;
  const txnCountLast24h = Number(row.txn_count_last_24h) || 0;
  const categoryIndex = row.category != null ? getCategoryIndex(row.category) : 0;
  return [amount, timeOfDay, amountLast24h, txnCountLast24h, categoryIndex];
}

export function scoreToLevel(score) {
  if (score === null || score === undefined) return null;
  const { thresholdHighRisk, thresholdSuspicious } = env.anomaly;
  if (score > thresholdHighRisk) return 'HIGH_RISK';
  if (score > thresholdSuspicious) return 'SUSPICIOUS';
  return 'NORMAL';
}

// Train Isolation Forest on all existing transactions and return scores per id
export async function trainIsolationForestOnAllTransactions() {
  const res = await query(
    `SELECT id, amount, time_of_day, amount_last_24h, txn_count_last_24h, category
     FROM transactions`
  );

  const rows = res.rows;
  if (!rows.length) {
    throw new Error('No transactions available for training.');
  }

  const X = rows.map(buildFeatureVector);

  const forest = new IsolationForest(); // default nEstimators = 100
  forest.train(X);

  const scores = forest.predict(X);

  return rows.map((row, idx) => {
    const score = Number(scores[idx]);
    return {
      id: row.id,
      score,
      level: scoreToLevel(score)
    };
  });
}

// Train on all transactions, then score a single new feature vector. features = [amount, timeOfDay, amountLast24h, txnCountLast24h, categoryIndex]
export async function scoreNewTransaction(features) {
  const res = await query(
    `SELECT amount, time_of_day, amount_last_24h, txn_count_last_24h, category
     FROM transactions`
  );

  const rows = res.rows;
  if (!rows.length) {
    throw new Error('No transactions available for training.');
  }

  const X = rows.map(buildFeatureVector);
  const forest = new IsolationForest();
  forest.train(X);
  const newVector = Array.isArray(features) && features.length >= 5
    ? features
    : [...features, 0];
  const allScores = forest.predict([...X, newVector]);
  const score = Number(allScores[allScores.length - 1]);
  return {
    score,
    level: scoreToLevel(score)
  };
}

