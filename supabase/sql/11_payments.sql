-- ============================================================
-- 11_payments.sql
-- Project: The House of Pawz – Billing Pro
-- Table: payments
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id VARCHAR(50) UNIQUE NOT NULL,
    internal_invoice_id VARCHAR(50) NOT NULL REFERENCES invoices(internal_invoice_id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) NOT NULL,
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_date VARCHAR(50) NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'UPI',
    transaction_ref VARCHAR(100),
    notes TEXT,
    received_by VARCHAR(100) DEFAULT 'Chirag Jain',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
