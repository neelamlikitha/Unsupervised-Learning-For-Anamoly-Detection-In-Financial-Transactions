import { query } from '../config/database.js';
import { trainIsolationForestOnAllTransactions } from '../ml/isolationForestService.js';

async function main() {
  console.log('Training Isolation Forest on all transactions...');
  const scored = await trainIsolationForestOnAllTransactions({
    afterTraining: async (items) => {
      console.log(`Updating ${items.length} transactions with anomaly scores...`);
      for (const item of items) {
        await query(
          `UPDATE transactions
           SET anomaly_score = $1,
               is_anomaly = $2,
               anomaly_level = $3
           WHERE id = $4`,
          [item.score, item.level !== 'NORMAL', item.level, item.id]
        );
      }
    }
  });
  console.log('Training and update completed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error training Isolation Forest', err);
  process.exit(1);
});
