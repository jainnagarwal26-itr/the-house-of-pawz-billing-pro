-- ============================================================
-- 06_customers.sql
-- Project: The House of Pawz – Billing Pro
-- Table: customers
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(20),
    state_code VARCHAR(100) DEFAULT '27-Maharashtra',
    emergency_contact VARCHAR(50),
    outstanding_balance NUMERIC(12,2) DEFAULT 0.00,
    advance_balance NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
