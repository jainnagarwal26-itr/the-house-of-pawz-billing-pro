-- ============================================================
-- 13_communication_logs.sql
-- Project: The House of Pawz – Billing Pro
-- Table: communication_logs
-- ============================================================

CREATE TABLE IF NOT EXISTS communication_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comm_id VARCHAR(50) UNIQUE NOT NULL,
    channel VARCHAR(50) NOT NULL,
    recipient_phone VARCHAR(50),
    recipient_email VARCHAR(255),
    recipient_name VARCHAR(255),
    invoice_number VARCHAR(100),
    status comm_status_enum DEFAULT 'INITIATED',
    message_content TEXT,
    error_message TEXT,
    sent_by VARCHAR(100),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
