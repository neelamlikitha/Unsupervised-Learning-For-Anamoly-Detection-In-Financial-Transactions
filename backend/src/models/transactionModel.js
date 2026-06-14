import { query } from '../config/database.js';

export async function insertTransaction(tx) {
  const {
    userId,
    amount,
    currency,
    merchant,
    category,
    channel,
    city,
    country,
    transactedAt,
    timeOfDay,
    amountLast24h,
    txnCountLast24h,
    anomalyScore,
    isAnomaly,
    anomalyLevel
  } = tx;

  const result = await query(
    `INSERT INTO transactions (
      user_id, amount, currency, merchant, category, channel, city, country,
      transacted_at, time_of_day, amount_last_24h, txn_count_last_24h,
      anomaly_score, is_anomaly, anomaly_level
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14, $15
    )
    RETURNING *`,
    [
      userId,
      amount,
      currency,
      merchant,
      category,
      channel,
      city,
      country,
      transactedAt,
      timeOfDay ?? (transactedAt ? new Date(transactedAt).getHours() : null),
      amountLast24h,
      txnCountLast24h,
      anomalyScore,
      isAnomaly,
      anomalyLevel
    ]
  );

  return result.rows[0];
}

export async function getUserTransactions(userId, { limit = 50, offset = 0, dateFrom = null, dateTo = null, riskLevel = null, minAmount = null, maxAmount = null } = {}) {
  const conditions = ['user_id = $1'];
  const params = [userId];
  let paramIdx = 2;
  if (dateFrom) {
    conditions.push(`transacted_at >= $${paramIdx}`);
    params.push(dateFrom);
    paramIdx += 1;
  }
  if (dateTo) {
    conditions.push(`transacted_at <= $${paramIdx}`);
    params.push(dateTo);
    paramIdx += 1;
  }
  if (riskLevel) {
    conditions.push(`anomaly_level = $${paramIdx}`);
    params.push(riskLevel);
    paramIdx += 1;
  }
  if (minAmount != null) {
    conditions.push(`amount >= $${paramIdx}`);
    params.push(minAmount);
    paramIdx += 1;
  }
  if (maxAmount != null) {
    conditions.push(`amount <= $${paramIdx}`);
    params.push(maxAmount);
    paramIdx += 1;
  }
  params.push(limit, offset);
  const result = await query(
    `SELECT *
     FROM transactions
     WHERE ${conditions.join(' AND ')}
     ORDER BY transacted_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    params
  );
  return result.rows;
}

export async function getUserTransactionsCount(userId, { dateFrom = null, dateTo = null, riskLevel = null, minAmount = null, maxAmount = null } = {}) {
  const conditions = ['user_id = $1'];
  const params = [userId];
  let paramIdx = 2;
  if (dateFrom) {
    conditions.push(`transacted_at >= $${paramIdx}`);
    params.push(dateFrom);
    paramIdx += 1;
  }
  if (dateTo) {
    conditions.push(`transacted_at <= $${paramIdx}`);
    params.push(dateTo);
    paramIdx += 1;
  }
  if (riskLevel) {
    conditions.push(`anomaly_level = $${paramIdx}`);
    params.push(riskLevel);
    paramIdx += 1;
  }
  if (minAmount != null) {
    conditions.push(`amount >= $${paramIdx}`);
    params.push(minAmount);
    paramIdx += 1;
  }
  if (maxAmount != null) {
    conditions.push(`amount <= $${paramIdx}`);
    params.push(maxAmount);
  }
  const result = await query(
    `SELECT COUNT(*)::INT AS total FROM transactions WHERE ${conditions.join(' AND ')}`,
    params
  );
  return result.rows[0]?.total ?? 0;
}

export async function getTransactionById(id, userId) {
  const result = await query(
    `SELECT *
     FROM transactions
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] || null;
}

export async function getAdminOverview() {
  const statsResult = await query(
    `SELECT
        COUNT(*)::INT AS total_transactions,
        COUNT(*) FILTER (WHERE is_anomaly IS TRUE)::INT AS total_anomalies,
        ROUND(
          CASE WHEN COUNT(*) > 0
               THEN (COUNT(*) FILTER (WHERE is_anomaly IS TRUE)::DECIMAL / COUNT(*)) * 100
               ELSE 0 END,
          2
        ) AS anomaly_percentage,
        ROUND(AVG(amount) FILTER (WHERE is_anomaly IS TRUE), 2) AS avg_anomalous_amount,
        ROUND(AVG(amount) FILTER (WHERE is_anomaly IS NOT TRUE), 2) AS avg_normal_amount
     FROM transactions`
  );

  return statsResult.rows[0];
}

export async function getAdminTransactions({
  limit = 100,
  offset = 0,
  onlyAnomalies = false,
  dateFrom = null,
  dateTo = null,
  userId = null,
  riskLevel = null
} = {}) {
  const conditions = ['($1::BOOLEAN IS FALSE OR t.is_anomaly IS TRUE)'];
  const params = [onlyAnomalies];
  let paramIdx = 2;

  if (dateFrom) {
    conditions.push(`t.transacted_at >= $${paramIdx}`);
    params.push(dateFrom);
    paramIdx += 1;
  }
  if (dateTo) {
    conditions.push(`t.transacted_at <= $${paramIdx}`);
    params.push(dateTo);
    paramIdx += 1;
  }
  if (userId) {
    conditions.push(`t.user_id = $${paramIdx}`);
    params.push(userId);
    paramIdx += 1;
  }
  if (riskLevel) {
    conditions.push(`t.anomaly_level = $${paramIdx}`);
    params.push(riskLevel);
    paramIdx += 1;
  }

  params.push(limit, offset);
  const result = await query(
    `SELECT t.*, u.email AS user_email
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.transacted_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    params
  );

  return result.rows;
}

export async function updateTransactionReview(transactionId, { status, notes }, reviewedBy) {
  const result = await query(
    `UPDATE transactions
     SET admin_review_status = $1, admin_notes = $2, reviewed_at = NOW(), reviewed_by = $3
     WHERE id = $4
     RETURNING *`,
    [status, notes || null, reviewedBy, transactionId]
  );
  return result.rows[0] || null;
}

export async function getTransactionByIdAdmin(transactionId) {
  const result = await query(
    `SELECT t.*, u.email AS user_email
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     WHERE t.id = $1`,
    [transactionId]
  );
  return result.rows[0] || null;
}

