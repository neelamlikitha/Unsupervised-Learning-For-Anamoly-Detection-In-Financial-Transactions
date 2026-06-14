-- PostgreSQL schema for Unsupervised Anomaly Detection in Financial Transactions

-- Users table: authentication and roles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'user' or 'admin'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions table: financial transaction data + anomaly metadata
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Core transaction attributes
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    merchant VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,       -- e.g., 'shopping', 'food', 'travel'
    channel VARCHAR(50) NOT NULL,         -- e.g., 'online', 'pos', 'atm'
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',

    -- Time dimensions
    transacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_of_day SMALLINT,  -- hour 0-23, set by app on insert (GENERATED not used: EXTRACT is not immutable in PG)

    -- Behavioural features (for ML)
    amount_last_24h NUMERIC(12, 2),
    txn_count_last_24h INT,

    -- Isolation Forest outputs
    anomaly_score NUMERIC(5, 4),         -- 0.0000 - 1.0000
    is_anomaly BOOLEAN,
    anomaly_level VARCHAR(20),           -- 'NORMAL', 'SUSPICIOUS', 'HIGH_RISK'

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin review fields for flagged transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS admin_review_status VARCHAR(20),  -- 'pending', 'confirmed_fraud', 'rejected'
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);

-- Helpful indexes for querying by user and anomaly status
CREATE INDEX IF NOT EXISTS idx_transactions_user_id
    ON transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_is_anomaly
    ON transactions(is_anomaly);

CREATE INDEX IF NOT EXISTS idx_transactions_transacted_at
    ON transactions(transacted_at);

CREATE INDEX IF NOT EXISTS idx_transactions_admin_review
    ON transactions(admin_review_status);

-- Refresh tokens for JWT refresh flow
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Audit log for admin actions (who did what, when)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Admin seed (optional) – you can insert manually with a real hashed password
-- INSERT INTO users (name, email, password_hash, role)
-- VALUES ('Admin', 'admin@example.com', '<bcrypt_hash_here>', 'admin');

