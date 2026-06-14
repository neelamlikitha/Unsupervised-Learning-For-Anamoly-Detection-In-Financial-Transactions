import express from 'express';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';
import {
  getAdminOverview,
  getAdminTransactions,
  updateTransactionReview,
  getTransactionByIdAdmin
} from '../models/transactionModel.js';

const router = express.Router();

router.use(authRequired);
router.use(adminOnly);

router.get('/overview', auditLog('admin_overview', 'overview'), async (req, res) => {
  try {
    const overview = await getAdminOverview();
    return res.json(overview);
  } catch (err) {
    console.error('Admin overview error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/transactions/export', auditLog('admin_export_transactions', 'transaction'), async (req, res) => {
  try {
    const onlyAnomalies = String(req.query.onlyAnomalies || 'false') === 'true';
    const dateFrom = req.query.dateFrom || null;
    const dateTo = req.query.dateTo || null;
    const userId = req.query.userId || null;
    const riskLevel = req.query.riskLevel || null;

    const rows = await getAdminTransactions({
      limit: 10000,
      offset: 0,
      onlyAnomalies,
      dateFrom,
      dateTo,
      userId,
      riskLevel
    });

    const headers = [
      'id', 'user_email', 'amount', 'currency', 'merchant', 'category', 'channel', 'city', 'country',
      'transacted_at', 'anomaly_score', 'is_anomaly', 'anomaly_level', 'admin_review_status', 'admin_notes', 'reviewed_at'
    ];
    const escape = (v) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        headers.map((h) => escape(r[h])).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions_export.csv');
    return res.send(csv);
  } catch (err) {
    console.error('Admin export error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/transactions', auditLog('admin_list_transactions', 'transaction'), async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;
    const onlyAnomalies = String(req.query.onlyAnomalies || 'false') === 'true';
    const dateFrom = req.query.dateFrom || null;
    const dateTo = req.query.dateTo || null;
    const userId = req.query.userId || null;
    const riskLevel = req.query.riskLevel || null;

    const data = await getAdminTransactions({
      limit,
      offset,
      onlyAnomalies,
      dateFrom,
      dateTo,
      userId,
      riskLevel
    });
    return res.json({ data });
  } catch (err) {
    console.error('Admin transactions error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/transactions/:id/review', auditLog('admin_review_transaction', 'transaction', (req) => req.params.id), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status || !['confirmed_fraud', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'status must be one of: confirmed_fraud, rejected, pending' });
    }

    const existing = await getTransactionByIdAdmin(id);
    if (!existing) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const updated = await updateTransactionReview(id, { status, notes }, req.user.id);
    return res.json(updated);
  } catch (err) {
    console.error('Admin review error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
