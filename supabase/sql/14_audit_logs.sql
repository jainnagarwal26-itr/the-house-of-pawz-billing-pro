-- ============================================================
-- 14_audit_logs.sql — Security Corrected (Append-only)
-- Project: The House of Pawz – Billing Pro
-- Table: audit_logs
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_id VARCHAR(50) UNIQUE NOT NULL,
    timestamp VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    username VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
