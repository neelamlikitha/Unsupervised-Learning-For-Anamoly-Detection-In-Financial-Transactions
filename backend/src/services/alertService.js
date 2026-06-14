import { env } from '../config/env.js';

export async function sendHighRiskAlert(transaction, userEmail) {
  const payload = {
    event: 'high_risk_anomaly',
    timestamp: new Date().toISOString(),
    transaction: {
      id: transaction.id,
      amount: transaction.amount,
      merchant: transaction.merchant,
      category: transaction.category,
      anomaly_score: transaction.anomaly_score,
      anomaly_level: transaction.anomaly_level
    },
    user_email: userEmail
  };

  const webhookUrl = env.alert?.webhookUrl;
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        console.warn('[Alert] Webhook returned', res.status);
      }
    } catch (err) {
      console.warn('[Alert] Webhook failed:', err.message);
    }
  }
}
