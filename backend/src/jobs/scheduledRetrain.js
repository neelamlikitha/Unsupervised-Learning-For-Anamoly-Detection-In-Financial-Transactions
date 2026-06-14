import cron from 'node-cron';
import { env } from '../config/env.js';
import { trainIsolationForestOnAllTransactions } from '../ml/isolationForestService.js';
import { query } from '../config/database.js';

export function startScheduledRetrain() {
  try {
    cron.schedule(env.retrainCron, async () => {
      console.log('[ScheduledRetrain] Starting periodic model retrain...');
      try {
        const scored = await trainIsolationForestOnAllTransactions();
        for (const item of scored) {
          await query(
            `UPDATE transactions
             SET anomaly_score = $1, is_anomaly = $2, anomaly_level = $3
             WHERE id = $4`,
            [item.score, item.level !== 'NORMAL', item.level, item.id]
          );
        }
        console.log(`[ScheduledRetrain] Updated ${scored.length} transactions.`);
      } catch (err) {
        console.error('[ScheduledRetrain] Error:', err.message);
      }
    });
    console.log('[ScheduledRetrain] Cron registered:', env.retrainCron);
  } catch (err) {
    console.warn('[ScheduledRetrain] Invalid cron expression, skipping:', env.retrainCron);
  }
}
