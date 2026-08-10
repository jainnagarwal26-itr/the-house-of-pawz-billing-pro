-- ============================================================
-- 15_indexes.sql
-- Project: The House of Pawz – Billing Pro
-- Purpose: Performance indexing for fast relational lookups.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_pets_customer_id ON pets(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_fy ON invoices(financial_year);
CREATE INDEX IF NOT EXISTS idx_invoice_items_internal_id ON invoice_items(internal_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(internal_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(username);
