-- ============================================================
-- 20_seed_reference_data.sql — Single Auth Authority & 45-Permission Role Matrix
-- Project: The House of Pawz – Billing Pro
-- Purpose: Seeds Company Settings, Catalog Items, 45-Permission Role Defaults, and Auth Users.
-- ============================================================

-- Seed Company Settings
INSERT INTO public.company_settings (
    company_name, tagline, address, phone, email, gstin, state_code, state_name,
    bank_name, bank_account_no, bank_ifsc, bank_branch, upi_id, invoice_prefix, financial_year, default_gst_rate
)
SELECT
    'The House of Pawz', 'Luxury Pet Boarding, Daycare, Training & Spa',
    'Bungalow No. 164, Aram Nagar 1, Versova, Andheri West, Mumbai, Maharashtra - 400061',
    '+91 98200 12345 / +91 98200 67890', 'billing@thehouseofpawz.com', '27AABCT1234H1Z5', '27', 'Maharashtra',
    'INDUSIND BANK', '201003400051', 'INDB0001074', 'Four Bunglow, Andheri (W).',
    'houseofpawz@idfcbank', 'HOP', '2026-27', 18.00
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- Seed Catalog Items
INSERT INTO catalog_items (item_id, item_name, item_type, hsn_sac, unit_price, gst_rate, unit) VALUES
('CAT-001', 'Deluxe Canine Boarding (Per Night)', 'SERVICE', '999799', 1500.00, 18.00, 'Night'),
('CAT-002', 'Executive Feline Boarding (Per Night)', 'SERVICE', '999799', 1200.00, 18.00, 'Night'),
('CAT-003', 'Full-Day Social Daycare (8 Hours)', 'SERVICE', '999799', 800.00, 18.00, 'Day'),
('CAT-004', 'Royal Paw Spa & Grooming Package', 'SERVICE', '999799', 2500.00, 18.00, 'Session'),
('CAT-005', 'Obedience & Behavioral Training (Per Session)', 'SERVICE', '999799', 1800.00, 18.00, 'Session'),
('CAT-006', 'Premium Organic Canine Kibble (10kg Bag)', 'PRODUCT', '23099090', 4500.00, 18.00, 'Bag'),
('CAT-007', 'Medicated Anti-Flea Bath & Dip Treatment', 'SERVICE', '999799', 1600.00, 18.00, 'Session'),
('CAT-008', 'Feline Complete Vaccination Package', 'SERVICE', '999799', 2200.00, 18.00, 'Package'),
('CAT-009', 'Pet Taxi Express Pick & Drop Service', 'SERVICE', '999799', 1000.00, 18.00, 'Trip')
ON CONFLICT (item_id) DO NOTHING;

-- Seed 45 Role Default Permissions Matrix for ADMIN, USER, BILLING_STAFF
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'dashboard_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'invoices_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'invoices_create', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'invoices_edit', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'invoices_delete', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'invoices_change_number', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'invoices_cancel', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'invoices_download_pdf', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'invoices_print', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'invoices_whatsapp', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'invoices_email', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'customers_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'customers_create', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'customers_edit', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'customers_delete', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'pets_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'pets_create', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'pets_edit', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'pets_delete', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'pets_checkin_checkout', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'boarding_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'boarding_manage', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'payments_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'payments_record', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'payments_delete', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'gst_reports_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'gst_reports_export', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'excel_db_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'excel_db_export', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'excel_db_restore', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'import_engine_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'import_engine_execute', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'audit_logs_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'communication_center_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'receipt_share', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'statement_share', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'user_management_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'user_management_edit', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'user_management_permissions', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'user_management_reset_password', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'settings_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'settings_edit', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'settings_factory_reset', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'reports_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('ADMIN'::user_role_enum, 'reports_export', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'dashboard_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'invoices_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'invoices_create', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'invoices_edit', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'invoices_delete', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'invoices_change_number', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'invoices_cancel', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'invoices_download_pdf', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'invoices_print', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'invoices_whatsapp', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'invoices_email', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'customers_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'customers_create', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'customers_edit', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'customers_delete', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'pets_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'pets_create', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'pets_edit', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'pets_delete', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'pets_checkin_checkout', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'boarding_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'boarding_manage', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'payments_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'payments_record', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'payments_delete', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'gst_reports_view', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'gst_reports_export', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'excel_db_view', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'excel_db_export', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'excel_db_restore', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'import_engine_view', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'import_engine_execute', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'audit_logs_view', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'communication_center_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'receipt_share', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'statement_share', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'user_management_view', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'user_management_edit', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'user_management_permissions', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'user_management_reset_password', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'settings_view', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'settings_edit', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'settings_factory_reset', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'reports_view', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('USER'::user_role_enum, 'reports_export', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'dashboard_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'invoices_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'invoices_create', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'invoices_edit', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'invoices_delete', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'invoices_change_number', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'invoices_cancel', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'invoices_download_pdf', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'invoices_print', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'invoices_whatsapp', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'invoices_email', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'customers_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'customers_create', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'customers_edit', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'customers_delete', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'pets_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'pets_create', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'pets_edit', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'pets_delete', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'pets_checkin_checkout', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'boarding_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'boarding_manage', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'payments_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'payments_record', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'payments_delete', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'gst_reports_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'gst_reports_export', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'excel_db_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'excel_db_export', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'excel_db_restore', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'import_engine_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'import_engine_execute', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'audit_logs_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'communication_center_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'receipt_share', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'statement_share', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'user_management_view', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'user_management_edit', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'user_management_permissions', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'user_management_reset_password', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'settings_view', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'settings_edit', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'settings_factory_reset', FALSE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'reports_view', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;
INSERT INTO public.role_permissions (role, permission_key, is_granted) VALUES ('BILLING_STAFF'::user_role_enum, 'reports_export', TRUE) ON CONFLICT (role, permission_key) DO NOTHING;

-- ============================================================
-- Seed Auth Users & Public Users
-- Supabase Auth is the authentication authority.
-- Passwords are bcrypt-hashed in auth.users; no password/pin is
-- stored in public.users.
--
-- This block is rerun-safe:
--   1) inserts the Auth user only if its email is not already present
--   2) resolves the actual Auth UUID by email
--   3) upserts the public.users profile against that UUID
-- ============================================================
DO $$
DECLARE
    chirag_uuid UUID;
    poonam_uuid UUID;
    staff_uuid UUID;
BEGIN
    -- Create Auth users only when the email does not already exist.
    IF NOT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'chirag@thehouseofpawz.com'
    ) THEN
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        )
        VALUES (
            'a0000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0000-000000000000'::uuid,
            'authenticated',
            'authenticated',
            'chirag@thehouseofpawz.com',
            extensions.crypt('Chirag@2026', extensions.gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Chirag Jain"}'::jsonb,
            NOW(),
            NOW()
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'poonam@thehouseofpawz.com'
    ) THEN
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        )
        VALUES (
            'a0000000-0000-0000-0000-000000000002'::uuid,
            '00000000-0000-0000-0000-000000000000'::uuid,
            'authenticated',
            'authenticated',
            'poonam@thehouseofpawz.com',
            extensions.crypt('Poonam@123', extensions.gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Poonam Bharti"}'::jsonb,
            NOW(),
            NOW()
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'staff@thehouseofpawz.com'
    ) THEN
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        )
        VALUES (
            'a0000000-0000-0000-0000-000000000003'::uuid,
            '00000000-0000-0000-0000-000000000000'::uuid,
            'authenticated',
            'authenticated',
            'staff@thehouseofpawz.com',
            extensions.crypt('Staff@2026', extensions.gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Staff"}'::jsonb,
            NOW(),
            NOW()
        );
    END IF;

    SELECT id INTO chirag_uuid
      FROM auth.users
     WHERE email = 'chirag@thehouseofpawz.com'
     LIMIT 1;

    SELECT id INTO poonam_uuid
      FROM auth.users
     WHERE email = 'poonam@thehouseofpawz.com'
     LIMIT 1;

    SELECT id INTO staff_uuid
      FROM auth.users
     WHERE email = 'staff@thehouseofpawz.com'
     LIMIT 1;

    INSERT INTO public.users (
        id, user_id, username, full_name, role, email, is_active
    )
    VALUES
        (chirag_uuid, 'USR-1001', 'chirag', 'Chirag Jain', 'ADMIN', 'chirag@thehouseofpawz.com', TRUE),
        (poonam_uuid, 'USR-1002', 'poonam', 'Poonam Bharti', 'USER', 'poonam@thehouseofpawz.com', TRUE),
        (staff_uuid, 'USR-1003', 'staff', 'Staff', 'BILLING_STAFF', 'staff@thehouseofpawz.com', TRUE)
    ON CONFLICT (id) DO UPDATE
    SET
        user_id = EXCLUDED.user_id,
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        email = EXCLUDED.email,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
END $$;
