-- ============================================================
-- 22_verification_queries.sql — FINAL READ-ONLY VERIFICATION SUITE
-- Project: The House of Pawz – Billing Pro
-- IMPORTANT: This file MUST NOT INSERT, UPDATE, DELETE, ALTER, DROP,
-- TRUNCATE, or CREATE anything.
-- ============================================================

-- A. Exact production/reference record counts
SELECT
    'A. Record Counts' AS test_name,
    (SELECT COUNT(*) FROM public.company_settings) = 1 AS company_settings_pass,
    (SELECT COUNT(*) FROM public.users) = 3 AS users_pass,
    (SELECT COUNT(*) FROM public.customers) = 31 AS customers_pass,
    (SELECT COUNT(*) FROM public.pets) = 31 AS pets_pass,
    (SELECT COUNT(*) FROM public.catalog_items) = 9 AS catalog_items_pass,
    (SELECT COUNT(*) FROM public.invoices) = 32 AS invoices_pass,
    (SELECT COUNT(*) FROM public.invoice_items) = 36 AS invoice_items_pass,
    (SELECT COUNT(*) FROM public.payments) = 32 AS payments_pass,
    (SELECT COUNT(*) FROM public.subscriptions) = 0 AS subscriptions_pass,
    (SELECT COUNT(*) FROM public.communication_logs) = 0 AS communication_logs_pass,
    (SELECT COUNT(*) FROM public.audit_logs) = 2 AS audit_logs_pass;

-- B. Duplicate business IDs
SELECT
    'B. Duplicate IDs' AS test_name,
    (SELECT COUNT(customer_id) - COUNT(DISTINCT customer_id) FROM public.customers) = 0 AS customers_unique,
    (SELECT COUNT(pet_id) - COUNT(DISTINCT pet_id) FROM public.pets) = 0 AS pets_unique,
    (SELECT COUNT(invoice_number) - COUNT(DISTINCT invoice_number) FROM public.invoices) = 0 AS invoices_unique,
    (SELECT COUNT(payment_id) - COUNT(DISTINCT payment_id) FROM public.payments) = 0 AS payments_unique;

-- C. Historical invoice sequence
SELECT
    'C. Historical Invoice Sequence' AS test_name,
    MIN(invoice_number) AS min_invoice,
    MAX(invoice_number) AS max_invoice,
    COUNT(*) AS invoice_count,
    CASE
        WHEN MIN(invoice_number) = 'HOP/26-27/000001'
         AND MAX(invoice_number) = 'HOP/26-27/000032'
         AND COUNT(*) = 32
        THEN 'PASS' ELSE 'FAIL'
    END AS status
FROM public.invoices;

-- D. Orphan checks
SELECT
    'D. Orphan Records' AS test_name,
    (SELECT COUNT(*) FROM public.pets p
      WHERE NOT EXISTS (
          SELECT 1 FROM public.customers c WHERE c.customer_id = p.customer_id
      )) = 0 AS orphan_pets_pass,
    (SELECT COUNT(*) FROM public.invoices i
      WHERE NOT EXISTS (
          SELECT 1 FROM public.customers c WHERE c.customer_id = i.customer_id
      )) = 0 AS orphan_invoices_pass,
    (SELECT COUNT(*) FROM public.invoice_items ii
      WHERE NOT EXISTS (
          SELECT 1 FROM public.invoices i WHERE i.internal_invoice_id = ii.internal_invoice_id
      )) = 0 AS orphan_invoice_items_pass,
    (SELECT COUNT(*) FROM public.payments p
      WHERE NOT EXISTS (
          SELECT 1 FROM public.invoices i WHERE i.internal_invoice_id = p.internal_invoice_id
      )) = 0 AS orphan_payments_pass;

-- E. Financial reconciliation
SELECT
    'E. Financial Reconciliation' AS test_name,
    COUNT(*) AS invoices_checked,
    SUM(CASE WHEN ROUND(grand_total,2) = ROUND(COALESCE(paid_amount,0) + COALESCE(balance_due,0),2)
             THEN 0 ELSE 1 END) AS mismatched_balance_rows
FROM public.invoices;

-- F. Exact 45 permission keys in SQL
WITH expected(permission_key) AS (
    VALUES
        ('dashboard_view'),
        ('invoices_view'),
        ('invoices_create'),
        ('invoices_edit'),
        ('invoices_delete'),
        ('invoices_change_number'),
        ('invoices_cancel'),
        ('invoices_download_pdf'),
        ('invoices_print'),
        ('invoices_whatsapp'),
        ('invoices_email'),
        ('customers_view'),
        ('customers_create'),
        ('customers_edit'),
        ('customers_delete'),
        ('pets_view'),
        ('pets_create'),
        ('pets_edit'),
        ('pets_delete'),
        ('pets_checkin_checkout'),
        ('boarding_view'),
        ('boarding_manage'),
        ('payments_view'),
        ('payments_record'),
        ('payments_delete'),
        ('gst_reports_view'),
        ('gst_reports_export'),
        ('excel_db_view'),
        ('excel_db_export'),
        ('excel_db_restore'),
        ('import_engine_view'),
        ('import_engine_execute'),
        ('audit_logs_view'),
        ('communication_center_view'),
        ('receipt_share'),
        ('statement_share'),
        ('user_management_view'),
        ('user_management_edit'),
        ('user_management_permissions'),
        ('user_management_reset_password'),
        ('settings_view'),
        ('settings_edit'),
        ('settings_factory_reset'),
        ('reports_view'),
        ('reports_export')
)
SELECT
    'F. Permission Key Reconciliation' AS test_name,
    (SELECT COUNT(*) FROM expected) AS expected_key_count,
    (SELECT COUNT(DISTINCT permission_key) FROM public.role_permissions) AS sql_key_count,
    (SELECT COUNT(*) FROM (
        SELECT permission_key FROM expected
        EXCEPT
        SELECT permission_key FROM public.role_permissions
    ) x) AS app_only_count,
    (SELECT COUNT(*) FROM (
        SELECT permission_key FROM public.role_permissions
        EXCEPT
        SELECT permission_key FROM expected
    ) x) AS sql_only_count;

-- G. Role matrix completeness
SELECT
    'G. Role Matrix' AS test_name,
    (SELECT COUNT(*) FROM public.role_permissions) = 135 AS total_rows_pass,
    (SELECT COUNT(*) FROM public.role_permissions WHERE role = 'ADMIN') = 45 AS admin_rows_pass,
    (SELECT COUNT(*) FROM public.role_permissions WHERE role = 'USER') = 45 AS user_rows_pass,
    (SELECT COUNT(*) FROM public.role_permissions WHERE role = 'BILLING_STAFF') = 45 AS billing_staff_rows_pass,
    (SELECT COUNT(*) FROM (
        SELECT role, permission_key
        FROM public.role_permissions
        GROUP BY role, permission_key
        HAVING COUNT(*) > 1
    ) d) = 0 AS duplicate_role_permission_pass;

-- H. User override status (0 is valid)
SELECT
    'H. User Overrides' AS test_name,
    COUNT(*) AS override_rows,
    '0 is valid when no user-specific override has been intentionally configured' AS interpretation
FROM public.user_permissions;

-- I. Unknown permission must be denied
SELECT
    'I. Unknown Permission' AS test_name,
    public.current_user_has_permission('__UNKNOWN_PERMISSION__') AS result_for_current_session,
    CASE
        WHEN auth.uid() IS NULL THEN 'NOT AUTHENTICATED IN SQL EDITOR SESSION'
        ELSE 'AUTHENTICATED SESSION RESULT ABOVE'
    END AS execution_context;

-- J. RLS enabled on all application tables
SELECT
    'J. RLS Enabled' AS test_name,
    COUNT(*) AS expected_table_count,
    COUNT(*) FILTER (WHERE c.relrowsecurity) AS rls_enabled_count,
    CASE WHEN COUNT(*) FILTER (WHERE c.relrowsecurity) = COUNT(*) THEN 'PASS' ELSE 'FAIL' END AS status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
      'company_settings','users','user_permissions','role_permissions',
      'customers','pets','catalog_items','invoices','invoice_items',
      'payments','subscriptions','communication_logs','audit_logs'
  );

-- K. Wildcard policy scan
SELECT
    'K. Wildcard RLS Policy Scan' AS test_name,
    COUNT(*) FILTER (
        WHERE qual::text ILIKE '%USING (true)%'
           OR qual::text ILIKE '%USING(true)%'
           OR with_check::text ILIKE '%WITH CHECK (true)%'
           OR with_check::text ILIKE '%WITH CHECK(true)%'
    ) AS wildcard_policy_count,
    CASE WHEN COUNT(*) FILTER (
        WHERE qual::text ILIKE '%USING (true)%'
           OR qual::text ILIKE '%USING(true)%'
           OR with_check::text ILIKE '%WITH CHECK (true)%'
           OR with_check::text ILIKE '%WITH CHECK(true)%'
    ) = 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM pg_policies
WHERE schemaname = 'public';

-- L. Audit log policy immutability
SELECT
    'L. Audit Append-Only' AS test_name,
    COUNT(*) FILTER (WHERE cmd = 'UPDATE') AS update_policy_count,
    COUNT(*) FILTER (WHERE cmd = 'DELETE') AS delete_policy_count,
    CASE WHEN
        COUNT(*) FILTER (WHERE cmd = 'UPDATE') = 0
        AND COUNT(*) FILTER (WHERE cmd = 'DELETE') = 0
    THEN 'PASS' ELSE 'FAIL' END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'audit_logs';

-- M. Storage bucket privacy
SELECT
    'M. Storage Buckets' AS test_name,
    COUNT(*) FILTER (WHERE id = 'company-assets' AND public = TRUE) AS company_assets_public,
    COUNT(*) FILTER (WHERE id IN ('invoice-assets','signatures','stamps','documents','backups') AND public = FALSE) AS private_bucket_count,
    CASE WHEN
        EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'company-assets' AND public = TRUE)
        AND (SELECT COUNT(*) FROM storage.buckets
             WHERE id IN ('invoice-assets','signatures','stamps','documents','backups') AND public = FALSE) = 5
    THEN 'PASS' ELSE 'FAIL' END AS status
FROM storage.buckets;

-- N. SECURITY DEFINER search_path hardening
SELECT
    'N. SECURITY DEFINER Hardening' AS test_name,
    p.proname,
    p.prosecdef AS security_definer,
    p.proconfig AS function_config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'generate_next_invoice_number',
      'log_audit_event',
      'current_user_has_permission'
  )
ORDER BY p.proname;

-- O. Trigger existence
SELECT
    'O. Updated_at Triggers' AS test_name,
    COUNT(*) FILTER (WHERE tgname = 'trg_customers_updated') AS customers_trigger,
    COUNT(*) FILTER (WHERE tgname = 'trg_pets_updated') AS pets_trigger,
    COUNT(*) FILTER (WHERE tgname = 'trg_invoices_updated') AS invoices_trigger,
    COUNT(*) FILTER (WHERE tgname = 'trg_payments_updated') AS payments_trigger
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgname IN (
      'trg_customers_updated',
      'trg_pets_updated',
      'trg_invoices_updated',
      'trg_payments_updated'
  );

-- P. Invoice uniqueness constraint
SELECT
    'P. Invoice Unique Constraint' AS test_name,
    COUNT(*) AS matching_constraints
FROM pg_constraint
WHERE conrelid = 'public.invoices'::regclass
  AND contype = 'u'
  AND conname = 'uk_invoice_number';

-- Q. Placeholder data scan
SELECT
    'Q. Placeholder Data' AS test_name,
    (SELECT COUNT(*) FROM public.customers WHERE email ILIKE '%@example.com') AS example_email_count,
    (SELECT COUNT(*) FROM public.payments WHERE transaction_ref = 'DUMMY_REF') AS dummy_ref_count;

-- R. Role/user profile linkage
SELECT
    'R. Auth Profile Linkage' AS test_name,
    COUNT(*) AS public_users_count,
    COUNT(*) FILTER (WHERE id IN (SELECT id FROM auth.users)) AS linked_auth_users_count
FROM public.users;

-- S. Communication log mutability policy
SELECT
    'S. Communication Logs' AS test_name,
    COUNT(*) FILTER (WHERE cmd = 'UPDATE') AS update_policy_count,
    COUNT(*) FILTER (WHERE cmd = 'DELETE') AS delete_policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'communication_logs';

-- T. Read-only verification notice
SELECT
    'T. Verification Safety' AS test_name,
    'This file contains SELECT/CTE inspection queries only. No INSERT/UPDATE/DELETE/ALTER/TRUNCATE/DROP statements are intended.' AS status;
