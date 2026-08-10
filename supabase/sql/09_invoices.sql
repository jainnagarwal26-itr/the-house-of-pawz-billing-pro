-- ============================================================
-- 09_invoices.sql
-- Project: The House of Pawz – Billing Pro
-- Table: invoices
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    internal_invoice_id VARCHAR(50) UNIQUE NOT NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    financial_year VARCHAR(20) NOT NULL DEFAULT '2026-27',
    invoice_date VARCHAR(50) NOT NULL,
    due_date VARCHAR(50),
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    customer_gstin VARCHAR(20),
    pet_id VARCHAR(50),
    pet_name VARCHAR(255),
    place_of_supply VARCHAR(100) DEFAULT '27-Maharashtra',
    is_inter_state BOOLEAN DEFAULT FALSE,
    sub_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_discount NUMERIC(12,2) DEFAULT 0.00,
    taxable_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cgst_total NUMERIC(12,2) DEFAULT 0.00,
    sgst_total NUMERIC(12,2) DEFAULT 0.00,
    igst_total NUMERIC(12,2) DEFAULT 0.00,
    total_gst NUMERIC(12,2) DEFAULT 0.00,
    round_off NUMERIC(12,2) DEFAULT 0.00,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12,2) DEFAULT 0.00,
    balance_due NUMERIC(12,2) DEFAULT 0.00,
    payment_status payment_status_enum DEFAULT 'UNPAID',
    payment_mode VARCHAR(50) DEFAULT 'UPI',
    notes TEXT,
    created_by_role VARCHAR(50) DEFAULT 'ADMIN',
    created_by_name VARCHAR(100) DEFAULT 'Chirag Jain',
    is_cancelled BOOLEAN DEFAULT FALSE,
    cancelled_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_invoice_number UNIQUE (invoice_number)
);
