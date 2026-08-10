-- ============================================================
-- 03_company_settings.sql
-- Project: The House of Pawz – Billing Pro
-- Table: company_settings
-- ============================================================

CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL DEFAULT 'The House of Pawz',
    tagline VARCHAR(255) DEFAULT 'Pet Care & Boarding GST Software',
    address TEXT DEFAULT 'Shop 1 & 2, Ground Floor, Royal Palms, Aarey Colony, Goregaon East, Mumbai, Maharashtra 400065',
    phone VARCHAR(50) DEFAULT '+91 98197 02638',
    email VARCHAR(255) DEFAULT 'info@thehouseofpawz.com',
    gstin VARCHAR(20) DEFAULT '27AMIPB3225A1ZS',
    state_code VARCHAR(10) DEFAULT '27',
    state_name VARCHAR(100) DEFAULT 'Maharashtra',
    bank_name VARCHAR(255) DEFAULT 'ICICI Bank',
    bank_account_no VARCHAR(100) DEFAULT '000405001234',
    bank_ifsc VARCHAR(50) DEFAULT 'ICIC0000004',
    bank_branch VARCHAR(255) DEFAULT 'Goregaon East Branch, Mumbai',
    upi_id VARCHAR(255) DEFAULT 'thehouseofpawz@icici',
    logo_url TEXT DEFAULT '/assets/logo.png',
    signature_url TEXT DEFAULT '',
    stamp_url TEXT DEFAULT '',
    invoice_prefix VARCHAR(50) DEFAULT 'HOP',
    financial_year VARCHAR(20) DEFAULT '2026-27',
    default_gst_rate NUMERIC(5,2) DEFAULT 18.00,
    terms_and_conditions TEXT DEFAULT '1. Goods/Services once billed will not be refunded. 2. All disputes subject to Mumbai Jurisdiction.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
