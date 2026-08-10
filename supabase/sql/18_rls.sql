-- ============================================================
-- 18_rls.sql — Final Production RLS / RBAC Engine
-- Project: The House of Pawz – Billing Pro
-- IMPORTANT: This file defines authorization only. It does not
-- create demo data or execute application migrations.
-- ============================================================

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Authoritative Permission Evaluator
-- Rule:
--   known permission + ADMIN/SUPER_ADMIN => TRUE
--   else explicit user override => override
--   else role default => role default
--   unknown permission => FALSE
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_has_permission(p_permission_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id VARCHAR(50);
    v_role public.user_role_enum;
    v_user_override BOOLEAN;
    v_role_default BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Unknown permission keys are always denied, including for ADMIN.
    IF NOT EXISTS (
        SELECT 1
        FROM public.role_permissions
        WHERE permission_key = p_permission_key
    ) THEN
        RETURN FALSE;
    END IF;

    SELECT user_id, role
      INTO v_user_id, v_role
      FROM public.users
     WHERE id = auth.uid();

    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF v_role IN ('ADMIN', 'SUPER_ADMIN') THEN
        RETURN TRUE;
    END IF;

    SELECT is_granted
      INTO v_user_override
      FROM public.user_permissions
     WHERE user_id = v_user_id
       AND permission_key = p_permission_key;

    IF v_user_override IS NOT NULL THEN
        RETURN v_user_override;
    END IF;

    SELECT is_granted
      INTO v_role_default
      FROM public.role_permissions
     WHERE role = v_role
       AND permission_key = p_permission_key;

    IF v_role_default IS NOT NULL THEN
        RETURN v_role_default;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.current_user_has_permission(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_has_permission(TEXT) TO authenticated;

-- ============================================================
-- COMPANY SETTINGS
-- ============================================================
DROP POLICY IF EXISTS "company_settings_select" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_insert" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_update" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_delete" ON public.company_settings;

CREATE POLICY "company_settings_select"
ON public.company_settings FOR SELECT TO authenticated
USING (public.current_user_has_permission('settings_view'));

CREATE POLICY "company_settings_insert"
ON public.company_settings FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('settings_edit'));

CREATE POLICY "company_settings_update"
ON public.company_settings FOR UPDATE TO authenticated
USING (public.current_user_has_permission('settings_edit'))
WITH CHECK (public.current_user_has_permission('settings_edit'));

CREATE POLICY "company_settings_delete"
ON public.company_settings FOR DELETE TO authenticated
USING (public.current_user_has_permission('settings_edit'));

-- ============================================================
-- USERS
-- ============================================================
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;

CREATE POLICY "users_select"
ON public.users FOR SELECT TO authenticated
USING (
    public.current_user_has_permission('user_management_view')
    OR auth.uid() = id
);

CREATE POLICY "users_insert"
ON public.users FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('user_management_edit'));

CREATE POLICY "users_update"
ON public.users FOR UPDATE TO authenticated
USING (public.current_user_has_permission('user_management_edit'))
WITH CHECK (public.current_user_has_permission('user_management_edit'));

CREATE POLICY "users_delete"
ON public.users FOR DELETE TO authenticated
USING (public.current_user_has_permission('user_management_edit'));

-- ============================================================
-- ROLE PERMISSIONS
-- ============================================================
DROP POLICY IF EXISTS "role_permissions_select" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_insert" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_update" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_delete" ON public.role_permissions;

CREATE POLICY "role_permissions_select"
ON public.role_permissions FOR SELECT TO authenticated
USING (public.current_user_has_permission('user_management_view'));

CREATE POLICY "role_permissions_insert"
ON public.role_permissions FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('user_management_permissions'));

CREATE POLICY "role_permissions_update"
ON public.role_permissions FOR UPDATE TO authenticated
USING (public.current_user_has_permission('user_management_permissions'))
WITH CHECK (public.current_user_has_permission('user_management_permissions'));

CREATE POLICY "role_permissions_delete"
ON public.role_permissions FOR DELETE TO authenticated
USING (public.current_user_has_permission('user_management_permissions'));

-- ============================================================
-- USER PERMISSION OVERRIDES
-- ============================================================
DROP POLICY IF EXISTS "user_permissions_select" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_insert" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_update" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_delete" ON public.user_permissions;

CREATE POLICY "user_permissions_select"
ON public.user_permissions FOR SELECT TO authenticated
USING (public.current_user_has_permission('user_management_view'));

CREATE POLICY "user_permissions_insert"
ON public.user_permissions FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('user_management_permissions'));

CREATE POLICY "user_permissions_update"
ON public.user_permissions FOR UPDATE TO authenticated
USING (public.current_user_has_permission('user_management_permissions'))
WITH CHECK (public.current_user_has_permission('user_management_permissions'));

CREATE POLICY "user_permissions_delete"
ON public.user_permissions FOR DELETE TO authenticated
USING (public.current_user_has_permission('user_management_permissions'));

-- ============================================================
-- CUSTOMERS
-- ============================================================
DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;

CREATE POLICY "customers_select" ON public.customers
FOR SELECT TO authenticated
USING (public.current_user_has_permission('customers_view'));

CREATE POLICY "customers_insert" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('customers_create'));

CREATE POLICY "customers_update" ON public.customers
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('customers_edit'))
WITH CHECK (public.current_user_has_permission('customers_edit'));

CREATE POLICY "customers_delete" ON public.customers
FOR DELETE TO authenticated
USING (public.current_user_has_permission('customers_delete'));

-- ============================================================
-- PETS
-- ============================================================
DROP POLICY IF EXISTS "pets_select" ON public.pets;
DROP POLICY IF EXISTS "pets_insert" ON public.pets;
DROP POLICY IF EXISTS "pets_update" ON public.pets;
DROP POLICY IF EXISTS "pets_delete" ON public.pets;

CREATE POLICY "pets_select" ON public.pets
FOR SELECT TO authenticated
USING (public.current_user_has_permission('pets_view'));

CREATE POLICY "pets_insert" ON public.pets
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('pets_create'));

CREATE POLICY "pets_update" ON public.pets
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('pets_edit'))
WITH CHECK (public.current_user_has_permission('pets_edit'));

CREATE POLICY "pets_delete" ON public.pets
FOR DELETE TO authenticated
USING (public.current_user_has_permission('pets_delete'));

-- ============================================================
-- CATALOG ITEMS
-- ============================================================
DROP POLICY IF EXISTS "catalog_select" ON public.catalog_items;
DROP POLICY IF EXISTS "catalog_insert" ON public.catalog_items;
DROP POLICY IF EXISTS "catalog_update" ON public.catalog_items;
DROP POLICY IF EXISTS "catalog_delete" ON public.catalog_items;

CREATE POLICY "catalog_select" ON public.catalog_items
FOR SELECT TO authenticated
USING (
    public.current_user_has_permission('invoices_view')
    OR public.current_user_has_permission('invoices_create')
    OR public.current_user_has_permission('settings_view')
);

CREATE POLICY "catalog_insert" ON public.catalog_items
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('settings_edit'));

CREATE POLICY "catalog_update" ON public.catalog_items
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('settings_edit'))
WITH CHECK (public.current_user_has_permission('settings_edit'));

CREATE POLICY "catalog_delete" ON public.catalog_items
FOR DELETE TO authenticated
USING (public.current_user_has_permission('settings_edit'));

-- ============================================================
-- INVOICES
-- ============================================================
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete" ON public.invoices;

CREATE POLICY "invoices_select" ON public.invoices
FOR SELECT TO authenticated
USING (public.current_user_has_permission('invoices_view'));

CREATE POLICY "invoices_insert" ON public.invoices
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('invoices_create'));

CREATE POLICY "invoices_update" ON public.invoices
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('invoices_edit'))
WITH CHECK (public.current_user_has_permission('invoices_edit'));

CREATE POLICY "invoices_delete" ON public.invoices
FOR DELETE TO authenticated
USING (public.current_user_has_permission('invoices_delete'));

-- ============================================================
-- INVOICE ITEMS
-- ============================================================
DROP POLICY IF EXISTS "invoice_items_select" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_insert" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_update" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_delete" ON public.invoice_items;

CREATE POLICY "invoice_items_select" ON public.invoice_items
FOR SELECT TO authenticated
USING (public.current_user_has_permission('invoices_view'));

CREATE POLICY "invoice_items_insert" ON public.invoice_items
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('invoices_create'));

CREATE POLICY "invoice_items_update" ON public.invoice_items
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('invoices_edit'))
WITH CHECK (public.current_user_has_permission('invoices_edit'));

CREATE POLICY "invoice_items_delete" ON public.invoice_items
FOR DELETE TO authenticated
USING (public.current_user_has_permission('invoices_delete'));

-- ============================================================
-- PAYMENTS
-- ============================================================
DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_update" ON public.payments;
DROP POLICY IF EXISTS "payments_delete" ON public.payments;

CREATE POLICY "payments_select" ON public.payments
FOR SELECT TO authenticated
USING (public.current_user_has_permission('payments_view'));

CREATE POLICY "payments_insert" ON public.payments
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('payments_record'));

CREATE POLICY "payments_update" ON public.payments
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('payments_record'))
WITH CHECK (public.current_user_has_permission('payments_record'));

CREATE POLICY "payments_delete" ON public.payments
FOR DELETE TO authenticated
USING (public.current_user_has_permission('payments_delete'));

-- ============================================================
-- SUBSCRIPTIONS / RECURRING BILLING
-- ============================================================
DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_delete" ON public.subscriptions;

CREATE POLICY "subscriptions_select" ON public.subscriptions
FOR SELECT TO authenticated
USING (public.current_user_has_permission('boarding_view'));

CREATE POLICY "subscriptions_insert" ON public.subscriptions
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('boarding_manage'));

CREATE POLICY "subscriptions_update" ON public.subscriptions
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('boarding_manage'))
WITH CHECK (public.current_user_has_permission('boarding_manage'));

CREATE POLICY "subscriptions_delete" ON public.subscriptions
FOR DELETE TO authenticated
USING (public.current_user_has_permission('boarding_manage'));

-- ============================================================
-- COMMUNICATION LOGS
-- Append-only from the application perspective.
-- ============================================================
DROP POLICY IF EXISTS "communication_logs_select" ON public.communication_logs;
DROP POLICY IF EXISTS "communication_logs_insert" ON public.communication_logs;
DROP POLICY IF EXISTS "communication_logs_update" ON public.communication_logs;
DROP POLICY IF EXISTS "communication_logs_delete" ON public.communication_logs;

CREATE POLICY "communication_logs_select" ON public.communication_logs
FOR SELECT TO authenticated
USING (public.current_user_has_permission('communication_center_view'));

CREATE POLICY "communication_logs_insert" ON public.communication_logs
FOR INSERT TO authenticated
WITH CHECK (
    public.current_user_has_permission('communication_center_view')
    OR public.current_user_has_permission('receipt_share')
    OR public.current_user_has_permission('statement_share')
    OR public.current_user_has_permission('invoices_whatsapp')
    OR public.current_user_has_permission('invoices_email')
);

-- No UPDATE/DELETE policies for communication history.

-- ============================================================
-- AUDIT LOGS — APPEND ONLY
-- Direct table INSERT is intentionally denied.
-- log_audit_event() is the controlled SECURITY DEFINER writer.
-- ============================================================
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete" ON public.audit_logs;

CREATE POLICY "audit_logs_select" ON public.audit_logs
FOR SELECT TO authenticated
USING (public.current_user_has_permission('audit_logs_view'));

-- No INSERT/UPDATE/DELETE policy is intentionally created.
-- The SECURITY DEFINER function is the controlled writer.
