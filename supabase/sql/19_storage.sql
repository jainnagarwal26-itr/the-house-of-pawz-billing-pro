-- ============================================================
-- 19_storage.sql — Final Storage Security
-- Project: The House of Pawz – Billing Pro
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-assets', 'invoice-assets', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('stamps', 'stamps', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Idempotent policy replacement
-- ============================================================
DROP POLICY IF EXISTS "Company Assets Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Company Assets Admin Insert" ON storage.objects;
DROP POLICY IF EXISTS "Company Assets Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Company Assets Admin Delete" ON storage.objects;

DROP POLICY IF EXISTS "Invoice Assets Select" ON storage.objects;
DROP POLICY IF EXISTS "Invoice Assets Insert" ON storage.objects;
DROP POLICY IF EXISTS "Invoice Assets Update" ON storage.objects;
DROP POLICY IF EXISTS "Invoice Assets Delete" ON storage.objects;

DROP POLICY IF EXISTS "Signatures Select" ON storage.objects;
DROP POLICY IF EXISTS "Signatures Insert" ON storage.objects;
DROP POLICY IF EXISTS "Signatures Update" ON storage.objects;
DROP POLICY IF EXISTS "Signatures Delete" ON storage.objects;

DROP POLICY IF EXISTS "Stamps Select" ON storage.objects;
DROP POLICY IF EXISTS "Stamps Insert" ON storage.objects;
DROP POLICY IF EXISTS "Stamps Update" ON storage.objects;
DROP POLICY IF EXISTS "Stamps Delete" ON storage.objects;

DROP POLICY IF EXISTS "Documents Select" ON storage.objects;
DROP POLICY IF EXISTS "Documents Insert" ON storage.objects;
DROP POLICY IF EXISTS "Documents Update" ON storage.objects;
DROP POLICY IF EXISTS "Documents Delete" ON storage.objects;

DROP POLICY IF EXISTS "Backups Select" ON storage.objects;
DROP POLICY IF EXISTS "Backups Insert" ON storage.objects;
DROP POLICY IF EXISTS "Backups Update" ON storage.objects;
DROP POLICY IF EXISTS "Backups Delete" ON storage.objects;

-- ============================================================
-- COMPANY ASSETS
-- Public read is intentional for logo/branding.
-- ============================================================
CREATE POLICY "Company Assets Public Select"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

CREATE POLICY "Company Assets Admin Insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'company-assets'
    AND public.current_user_has_permission('settings_edit')
);

CREATE POLICY "Company Assets Admin Update"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'company-assets'
    AND public.current_user_has_permission('settings_edit')
)
WITH CHECK (
    bucket_id = 'company-assets'
    AND public.current_user_has_permission('settings_edit')
);

CREATE POLICY "Company Assets Admin Delete"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'company-assets'
    AND public.current_user_has_permission('settings_edit')
);

-- ============================================================
-- INVOICE ASSETS
-- ============================================================
CREATE POLICY "Invoice Assets Select"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'invoice-assets'
    AND public.current_user_has_permission('invoices_view')
);

CREATE POLICY "Invoice Assets Insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'invoice-assets'
    AND public.current_user_has_permission('invoices_create')
);

CREATE POLICY "Invoice Assets Update"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'invoice-assets'
    AND public.current_user_has_permission('invoices_edit')
)
WITH CHECK (
    bucket_id = 'invoice-assets'
    AND public.current_user_has_permission('invoices_edit')
);

CREATE POLICY "Invoice Assets Delete"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'invoice-assets'
    AND public.current_user_has_permission('invoices_delete')
);

-- ============================================================
-- SIGNATURES
-- ============================================================
CREATE POLICY "Signatures Select"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'signatures'
    AND (
        public.current_user_has_permission('settings_view')
        OR public.current_user_has_permission('invoices_view')
    )
);

CREATE POLICY "Signatures Insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'signatures'
    AND public.current_user_has_permission('settings_edit')
);

CREATE POLICY "Signatures Update"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'signatures'
    AND public.current_user_has_permission('settings_edit')
)
WITH CHECK (
    bucket_id = 'signatures'
    AND public.current_user_has_permission('settings_edit')
);

CREATE POLICY "Signatures Delete"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'signatures'
    AND public.current_user_has_permission('settings_edit')
);

-- ============================================================
-- STAMPS
-- ============================================================
CREATE POLICY "Stamps Select"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'stamps'
    AND (
        public.current_user_has_permission('settings_view')
        OR public.current_user_has_permission('invoices_view')
    )
);

CREATE POLICY "Stamps Insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'stamps'
    AND public.current_user_has_permission('settings_edit')
);

CREATE POLICY "Stamps Update"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'stamps'
    AND public.current_user_has_permission('settings_edit')
)
WITH CHECK (
    bucket_id = 'stamps'
    AND public.current_user_has_permission('settings_edit')
);

CREATE POLICY "Stamps Delete"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'stamps'
    AND public.current_user_has_permission('settings_edit')
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE POLICY "Documents Select"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'documents'
    AND public.current_user_has_permission('customers_view')
);

CREATE POLICY "Documents Insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'documents'
    AND public.current_user_has_permission('customers_edit')
);

CREATE POLICY "Documents Update"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'documents'
    AND public.current_user_has_permission('customers_edit')
)
WITH CHECK (
    bucket_id = 'documents'
    AND public.current_user_has_permission('customers_edit')
);

CREATE POLICY "Documents Delete"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'documents'
    AND public.current_user_has_permission('customers_delete')
);

-- ============================================================
-- BACKUPS — ADMIN-LEVEL DATABASE BACKUP / RESTORE
-- ============================================================
CREATE POLICY "Backups Select"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'backups'
    AND (
        public.current_user_has_permission('excel_db_view')
        OR public.current_user_has_permission('excel_db_export')
    )
);

CREATE POLICY "Backups Insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'backups'
    AND public.current_user_has_permission('excel_db_export')
);

CREATE POLICY "Backups Update"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'backups'
    AND public.current_user_has_permission('excel_db_restore')
)
WITH CHECK (
    bucket_id = 'backups'
    AND public.current_user_has_permission('excel_db_restore')
);

CREATE POLICY "Backups Delete"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'backups'
    AND public.current_user_has_permission('excel_db_restore')
);
