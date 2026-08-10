-- ============================================================
-- 08_catalog_items.sql
-- Project: The House of Pawz – Billing Pro
-- Table: catalog_items
-- ============================================================

CREATE TABLE IF NOT EXISTS catalog_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_type item_type_enum DEFAULT 'SERVICE',
    hsn_sac VARCHAR(50) DEFAULT '999799',
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    unit VARCHAR(50) DEFAULT 'Session',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
