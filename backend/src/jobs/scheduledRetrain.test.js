import assert from 'node:assert/strict';
import test from 'node:test';
import { persistHistoricalScores } from './scheduledRetrain.js';

function createTestPool({ failOnUpdate = false, failOnRollback = false } = {}) {
  const calls = [];
  let updateCount = 0;
  const client = {
    async query(sql, params) {
      calls.push({ sql: sql.trim().split(/\s+/)[0], params });
      if (sql.trim() === 'ROLLBACK' && failOnRollback) {
        throw new Error('simulated rollback failure');
      }
      if (sql.trim().startsWith('UPDATE')) {
        updateCount += 1;
        if (failOnUpdate && updateCount === 2) {
          throw new Error('simulated update failure');
        }
      }
    },
    release(error) {
      calls.push({ sql: 'RELEASE', error });
    }
  };
  return {
    calls,
    pool: {
      async connect() {
        calls.push({ sql: 'CONNECT' });
        return client;
      }
    }
  };
}

const scores = [
  { id: 'txn-1', score: 0.2, level: 'NORMAL' },
  { id: 'txn-2', score: 0.8, level: 'HIGH_RISK' }
];

test('historical score updates commit together and release the pool client', async () => {
  const { calls, pool } = createTestPool();

  await persistHistoricalScores(scores, pool);

  assert.deepEqual(calls.map((call) => call.sql), [
    'CONNECT', 'BEGIN', 'UPDATE', 'UPDATE', 'COMMIT', 'RELEASE'
  ]);
  assert.deepEqual(calls[2].params, [0.2, false, 'NORMAL', 'txn-1']);
  assert.deepEqual(calls[3].params, [0.8, true, 'HIGH_RISK', 'txn-2']);
});

test('historical update failure rolls back the batch and releases the pool client', async () => {
  const { calls, pool } = createTestPool({ failOnUpdate: true });

  await assert.rejects(persistHistoricalScores(scores, pool), /simulated update failure/);

  assert.deepEqual(calls.map((call) => call.sql), [
    'CONNECT', 'BEGIN', 'UPDATE', 'UPDATE', 'ROLLBACK', 'RELEASE'
  ]);
  assert.equal(calls.at(-1).error, undefined);
});

test('rollback failure releases the client with the rollback error so the pool discards it', async () => {
  const { calls, pool } = createTestPool({ failOnUpdate: true, failOnRollback: true });

  await assert.rejects(persistHistoricalScores(scores, pool), /simulated update failure/);

  assert.deepEqual(calls.map((call) => call.sql), [
    'CONNECT', 'BEGIN', 'UPDATE', 'UPDATE', 'ROLLBACK', 'RELEASE'
  ]);
  assert.equal(calls.at(-1).error.message, 'simulated rollback failure');
});
