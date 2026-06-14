import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev_refresh_secret_change_me',
  jwtExpiry: process.env.JWT_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  pg: {
    host: process.env.PG_HOST || 'localhost',
    port: Number(process.env.PG_PORT || 5432),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    database: process.env.PG_DATABASE || 'anomaly_detection_db'
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 100)
  },
  anomaly: {
    thresholdSuspicious: Number(process.env.ANOMALY_THRESHOLD_SUSPICIOUS ?? 0.55),
    thresholdHighRisk: Number(process.env.ANOMALY_THRESHOLD_HIGH_RISK ?? 0.75)
  },
  alert: {
    webhookUrl: process.env.ALERT_WEBHOOK_URL || '',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    alertEmailTo: process.env.ALERT_EMAIL_TO || ''
  },
  retrainCron: process.env.RETRAIN_CRON || '0 2 * * *' // 2 AM daily
};

