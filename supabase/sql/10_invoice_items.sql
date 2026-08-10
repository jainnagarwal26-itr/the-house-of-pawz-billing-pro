-- ============================================================
-- 10_invoice_items.sql
-- Project: The House of Pawz – Billing Pro
-- Table: invoice_items
-- ============================================================

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_item_id VARCHAR(50) UNIQUE NOT NULL,
    internal_invoice_id VARCHAR(50) NOT NULL REFERENCES invoices(internal_invoice_id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    catalog_item_id VARCHAR(50),
    item_type item_type_enum DEFAULT 'SERVICE',
    item_name VARCHAR(255) NOT NULL,
    hsn_sac VARCHAR(50) DEFAULT '999799',
    price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    discount_percent NUMERIC(5,2) DEFAULT 0.00,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    taxable_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5,2) DEFAULT 18.00,
    cgst_amount NUMERIC(12,2) DEFAULT 0.00,
    sgst_amount NUMERIC(12,2) DEFAULT 0.00,
    igst_amount NUMERIC(12,2) DEFAULT 0.00,
    item_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
