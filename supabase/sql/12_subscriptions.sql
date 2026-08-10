-- ============================================================
-- 12_subscriptions.sql
-- Project: The House of Pawz – Billing Pro
-- Table: subscriptions
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    billing_cycle VARCHAR(50) DEFAULT 'MONTHLY',
    next_billing_date VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
