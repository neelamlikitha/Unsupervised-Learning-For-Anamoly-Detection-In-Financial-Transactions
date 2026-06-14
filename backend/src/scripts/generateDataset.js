import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';

const TARGET_TRANSACTIONS = 15000;

const merchants = [
  'Amazon', 'Flipkart', 'Myntra', 'BigBasket', 'Swiggy', 'Zomato',
  'Uber', 'Ola', 'MakeMyTrip', 'BookMyShow', 'Paytm Mall', 'Ajio',
  'Meesho', 'Nykaa', 'PharmEasy', 'Dunzo', 'Blinkit', 'Zepto'
];

const categories = [
  'shopping', 'food', 'travel', 'entertainment', 'groceries', 'utilities', 'electronics'
];

const channels = ['online', 'pos', 'atm', 'upi'];

const cities = [
  'Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai', 'Delhi', 'Pune', 'Kolkata',
  'Ahmedabad', 'Jaipur', 'Kochi'
];

// Fraud patterns – 5 distinct anomaly scenarios
const FRAUD_PATTERNS = [
  'high_amount',          // Very large one-time transaction
  'late_night_spike',     // Normal merchant but unusual hour (2-4 AM)
  'rapid_transactions',   // Many small txns in short time (burst)
  'foreign_large',        // Large amount + unusual city combination
  'category_mismatch'     // Very high amount in food/groceries (ATM withdrawal-like)
];

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomNormal() {
  return Number((Math.random() * 4500 + 100).toFixed(2));
}

function randomPastDate(daysBack = 90, hourOverride = null) {
  const now = new Date();
  const offsetDays = Math.floor(Math.random() * daysBack);
  const d = new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000);
  d.setHours(
    hourOverride != null ? hourOverride : Math.floor(Math.random() * 24),
    Math.floor(Math.random() * 60),
    0,
    0
  );
  return d;
}

function fraudTransaction(pattern, userId, history) {
  let amount, category, channel, city, transactedAt;
  const merchant = randomChoice(merchants);
  const country = 'India';

  switch (pattern) {
    case 'high_amount':
      amount = Number((Math.random() * 100000 + 50000).toFixed(2));
      category = randomChoice(categories);
      channel = randomChoice(channels);
      city = randomChoice(cities);
      transactedAt = randomPastDate(90);
      break;
    case 'late_night_spike':
      amount = Number((Math.random() * 15000 + 5000).toFixed(2));
      category = 'shopping';
      channel = 'online';
      city = randomChoice(cities);
      transactedAt = randomPastDate(90, 2 + Math.floor(Math.random() * 3)); // 2-4 AM
      break;
    case 'rapid_transactions': {
      amount = Number((Math.random() * 500 + 50).toFixed(2));
      category = 'shopping';
      channel = 'online';
      city = randomChoice(cities);
      const baseDate = randomPastDate(90);
      // Simulate short burst – override amount_last_24h later
      transactedAt = baseDate;
      break;
    }
    case 'foreign_large':
      amount = Number((Math.random() * 80000 + 20000).toFixed(2));
      category = 'travel';
      channel = 'pos';
      city = 'Leh'; // unusual city not in normal list
      transactedAt = randomPastDate(90);
      break;
    case 'category_mismatch':
      amount = Number((Math.random() * 30000 + 10000).toFixed(2));
      category = 'groceries';
      channel = 'atm';
      city = randomChoice(cities);
      transactedAt = randomPastDate(90);
      break;
    default:
      amount = Number((Math.random() * 50000 + 10000).toFixed(2));
      category = randomChoice(categories);
      channel = randomChoice(channels);
      city = randomChoice(cities);
      transactedAt = randomPastDate(90);
  }

  return { amount, merchant, category, channel, city, country, transactedAt };
}

async function ensureSyntheticUsers(count = 200) {
  const existing = await query('SELECT COUNT(*)::INT AS c FROM users');
  if (existing.rows[0].c >= count) return;

  const passwordHash = await bcrypt.hash('Password123!', 10);
  for (let i = 0; i < count; i++) {
    const idx = i + 1;
    await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       ON CONFLICT (email) DO NOTHING`,
      [`User ${idx}`, `user${idx}@example.com`, passwordHash]
    );
  }
}

async function getAllUserIds() {
  const res = await query('SELECT id FROM users');
  return res.rows.map((r) => r.id);
}

// Model performance metrics (precision/recall approximation after labelling)
function computeMetrics(scored) {
  // Treat is_anomaly=true as positive, HIGH_RISK/SUSPICIOUS as predicted positive
  const TP = scored.filter((s) => s.is_anomaly && s.anomaly_level !== 'NORMAL').length;
  const FP = scored.filter((s) => !s.is_anomaly && s.anomaly_level !== 'NORMAL').length;
  const FN = scored.filter((s) => s.is_anomaly && s.anomaly_level === 'NORMAL').length;
  const TN = scored.filter((s) => !s.is_anomaly && s.anomaly_level === 'NORMAL').length;
  const precision = TP + FP > 0 ? (TP / (TP + FP)).toFixed(4) : 'N/A';
  const recall = TP + FN > 0 ? (TP / (TP + FN)).toFixed(4) : 'N/A';
  const f1 = precision !== 'N/A' && recall !== 'N/A' && (Number(precision) + Number(recall)) > 0
    ? (2 * Number(precision) * Number(recall) / (Number(precision) + Number(recall))).toFixed(4)
    : 'N/A';
  return { TP, FP, FN, TN, precision, recall, f1 };
}

async function main() {
  console.log('Generating synthetic users and transactions...');
  await ensureSyntheticUsers();
  const userIds = await getAllUserIds();

  const userHistory = new Map();
  const labelledFraud = new Set();

  let inserted = 0;
  let fraudInserted = 0;

  // 5% fraud transactions from known patterns
  const fraudTarget = Math.floor(TARGET_TRANSACTIONS * 0.05);

  while (inserted < TARGET_TRANSACTIONS) {
    const userId = randomChoice(userIds);
    const isFraud = fraudInserted < fraudTarget && Math.random() < 0.06;
    const pattern = isFraud ? randomChoice(FRAUD_PATTERNS) : null;

    let amount, merchant, category, channel, city, transactedAt;
    const country = 'India';

    if (isFraud) {
      const f = fraudTransaction(pattern, userId, userHistory.get(userId) || []);
      ({ amount, merchant, category, channel, city, transactedAt } = f);
    } else {
      amount = Math.random() < 0.9 ? randomNormal() : Number((Math.random() * 50000 + 5000).toFixed(2));
      merchant = randomChoice(merchants);
      category = randomChoice(categories);
      channel = randomChoice(channels);
      city = randomChoice(cities);
      transactedAt = randomPastDate();
    }

    const history = userHistory.get(userId) || [];
    const twentyFourHoursAgo = new Date(transactedAt.getTime() - 24 * 60 * 60 * 1000);
    const recent = history.filter((h) => h.transactedAt > twentyFourHoursAgo && h.transactedAt <= transactedAt);

    let amountLast24h = recent.reduce((sum, h) => sum + h.amount, 0);
    let txnCountLast24h = recent.length;

    if (isFraud && pattern === 'rapid_transactions') {
      txnCountLast24h += 30;
      amountLast24h += amount * 30;
    }

    const timeOfDay = transactedAt.getHours();

    const rowId = (await query(
      `INSERT INTO transactions (
        user_id, amount, currency, merchant, category, channel, city, country,
        transacted_at, time_of_day, amount_last_24h, txn_count_last_24h,
        anomaly_score, is_anomaly, anomaly_level
      ) VALUES (
        $1, $2, 'INR', $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        NULL, NULL, NULL
      ) RETURNING id`,
      [
        userId, amount, merchant, category, channel, city, country,
        transactedAt, timeOfDay, amountLast24h, txnCountLast24h
      ]
    )).rows[0].id;

    if (isFraud) {
      labelledFraud.add(rowId);
      fraudInserted += 1;
    }

    history.push({ amount, transactedAt });
    userHistory.set(userId, history);

    inserted += 1;
    if (inserted % 1000 === 0) {
      console.log(`Inserted ${inserted} transactions (${fraudInserted} fraud patterns)...`);
    }
  }

  console.log(`Done. Inserted ${inserted} transactions (${fraudInserted} known-fraud patterns).`);

  // Print simple metrics stub (no scores yet – run train:model to get scores)
  console.log('\n--- Metrics stub (run train:model to compute actual scores) ---');
  console.log('Fraud patterns inserted:', fraudInserted);
  console.log('Total inserted:', inserted);
  console.log('Fraud %:', ((fraudInserted / inserted) * 100).toFixed(2) + '%');

  process.exit(0);
}

main().catch((err) => {
  console.error('Error generating dataset', err);
  process.exit(1);
});
