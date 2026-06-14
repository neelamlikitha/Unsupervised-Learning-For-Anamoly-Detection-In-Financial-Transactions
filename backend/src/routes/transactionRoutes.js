import express from 'express';
import { authRequired } from '../middleware/auth.js';
import {
  getUserTransactions,
  getUserTransactionsCount,
  getTransactionById,
  insertTransaction
} from '../models/transactionModel.js';
import { scoreNewTransaction, getCategoryIndex } from '../ml/isolationForestService.js';
import { sendHighRiskAlert } from '../services/alertService.js';
import { query } from '../config/database.js';

const router = express.Router();

router.use(authRequired);

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const dateFrom = req.query.dateFrom || null;
    const dateTo = req.query.dateTo || null;
    const riskLevel = req.query.riskLevel || null;
    const minAmount = req.query.minAmount != null ? Number(req.query.minAmount) : null;
    const maxAmount = req.query.maxAmount != null ? Number(req.query.maxAmount) : null;
    const filters = { limit, offset, dateFrom, dateTo, riskLevel, minAmount, maxAmount };
    const [transactions, total] = await Promise.all([
      getUserTransactions(req.user.id, filters),
      getUserTransactionsCount(req.user.id, filters)
    ]);
    return res.json({ data: transactions, total });
  } catch (err) {
    console.error('Get transactions error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tx = await getTransactionById(req.params.id, req.user.id);
    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    return res.json(tx);
  } catch (err) {
    console.error('Get transaction error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Simulate a new transaction, score it with Isolation Forest, store and return result
router.post('/simulate', async (req, res) => {
  try {
    const {
      amount,
      merchant,
      category,
      channel,
      city,
      country = 'India'
    } = req.body;

    if (!amount || !merchant || !category || !channel) {
      return res.status(400).json({ message: 'amount, merchant, category and channel are required' });
    }

    const transactedAt = new Date();

    const twentyFourHoursAgo = new Date(transactedAt.getTime() - 24 * 60 * 60 * 1000);
    const recentRes = await query(
      `SELECT amount, transacted_at
       FROM transactions
       WHERE user_id = $1
         AND transacted_at > $2
         AND transacted_at <= $3`,
      [req.user.id, twentyFourHoursAgo, transactedAt]
    );

    const recent = recentRes.rows;
    const amountLast24h = recent.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const txnCountLast24h = recent.length;

    const timeOfDay = transactedAt.getHours();
    const categoryIndex = getCategoryIndex(category || 'other');
    const features = [
      Number(amount) || 0,
      timeOfDay,
      amountLast24h,
      txnCountLast24h,
      categoryIndex
    ];

    const { score, level } = await scoreNewTransaction(features);

    const saved = await insertTransaction({
      userId: req.user.id,
      amount,
      currency: 'INR',
      merchant,
      category,
      channel,
      city,
      country,
      transactedAt,
      timeOfDay: transactedAt.getHours(),
      amountLast24h,
      txnCountLast24h,
      anomalyScore: score,
      isAnomaly: level !== 'NORMAL',
      anomalyLevel: level
    });

    if (level === 'HIGH_RISK') {
      sendHighRiskAlert(saved, req.user.email).catch(() => {});
    }

    return res.status(201).json({
      transaction: saved,
      anomaly: {
        score,
        level
      }
    });
  } catch (err) {
    console.error('Simulate transaction error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

