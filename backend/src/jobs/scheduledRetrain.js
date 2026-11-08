import cron from 'node-cron';
import { env } from '../config/env.js';
import { trainIsolationForestOnAllTransactions } from '../ml/isolationForestService.js';
import { pool } from '../config/database.js';

export async function persistHistoricalScores(items, databasePool = pool) {
  const client = await databasePool.connect();
  let transactionStarted = false;
  let releaseError;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    for (const item of items) {
      await client.query(
        `UPDATE transactions
         SET anomaly_score = $1, is_anomaly = $2, anomaly_level = $3
         WHERE id = $4`,
        [item.score, item.level !== 'NORMAL', item.level, item.id]
      );
    }
    await client.query('COMMIT');
    transactionStarted = false;
  } catch (err) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        releaseError = rollbackError;
        console.error('[ScheduledRetrain] Rollback failed:', rollbackError.message);
      }
    }
    throw err;
  } finally {
    if (releaseError) {
      client.release(releaseError);
    } else {
      client.release();
    }
  }
}

export function startScheduledRetrain() {
  const retrain = async () => {
    console.log('[ScheduledRetrain] Starting periodic model retrain...');
    try {
      const scored = await trainIsolationForestOnAllTransactions({
        afterTraining: (items) => persistHistoricalScores(items)
      });
      console.log(`[ScheduledRetrain] Updated ${scored.length} transactions.`);
    } catch (err) {
      console.error('[ScheduledRetrain] Error:', err.message);
    }
  };

  try {
    cron.schedule(env.retrainCron, retrain);
    console.log('[ScheduledRetrain] Cron registered:', env.retrainCron);
  } catch (err) {
    console.warn('[ScheduledRetrain] Invalid cron expression, skipping:', env.retrainCron);
  }

  return retrain();
}
