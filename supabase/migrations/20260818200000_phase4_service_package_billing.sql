-- ====================================================================
-- 20260818200000_phase4_service_package_billing.sql
-- Module: The House of Pawz – Phase 4: Service Catalog, Package Master,
--         Monthly Package Billing & Atomic Invoice RPC
--
-- STATUS: PREPARED FOR REVIEW (DO NOT EXECUTE UNTIL EXPLICITLY APPROVED)
-- Baseline Check: Invoices: 67, Invoice Items: 95, Payments: 95, Customers: 66, Pets: 66
-- Zero Fake Data: Clean schema tables with empty initial states
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. SERVICE CATALOG MASTER (public.service_catalog)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'WITHOUT_PACKAGE',
    species_applicable VARCHAR(30) NOT NULL DEFAULT 'All',
    description TEXT,
    base_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_gst_applicable BOOLEAN NOT NULL DEFAULT TRUE,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    hsn_sac VARCHAR(20) NOT NULL DEFAULT '999799',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_service_species CHECK (species_applicable IN ('Dog', 'Cat', 'Bird', 'Rabbit', 'Other', 'All')),
    CONSTRAINT chk_service_category CHECK (category IN ('WITHOUT_PACKAGE', 'DOG_SERVICE', 'CAT_SERVICE', 'MANUAL_AMOUNT', 'PICK_DROP', 'OTHER_SERVICE'))
);

CREATE INDEX IF NOT EXISTS idx_service_catalog_active ON public.service_catalog (is_active);
CREATE INDEX IF NOT EXISTS idx_service_catalog_category ON public.service_catalog (category);
CREATE INDEX IF NOT EXISTS idx_service_catalog_species ON public.service_catalog (species_applicable);

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

-- Service Catalog Policies (Enforcing granular RBAC)
DROP POLICY IF EXISTS "service_catalog_select" ON public.service_catalog;
DROP POLICY IF EXISTS "service_catalog_insert" ON public.service_catalog;
DROP POLICY IF EXISTS "service_catalog_update" ON public.service_catalog;
DROP POLICY IF EXISTS "service_catalog_delete" ON public.service_catalog;

CREATE POLICY "service_catalog_select" ON public.service_catalog
FOR SELECT TO authenticated
USING (public.current_user_has_permission('service_catalog_view') OR public.current_user_has_permission('invoices_create'));

CREATE POLICY "service_catalog_insert" ON public.service_catalog
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('service_catalog_edit'));

CREATE POLICY "service_catalog_update" ON public.service_catalog
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('service_catalog_edit'))
WITH CHECK (public.current_user_has_permission('service_catalog_edit'));

CREATE POLICY "service_catalog_delete" ON public.service_catalog
FOR DELETE TO authenticated
USING (public.current_user_has_permission('service_catalog_delete'));

-- --------------------------------------------------------------------
-- 2. SERVICE PACKAGE MASTER (public.service_package_master)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_package_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'DOG_DAY_CARE',
    pet_species VARCHAR(30) NOT NULL DEFAULT 'Dog',
    description TEXT,
    included_services JSONB NOT NULL DEFAULT '[]'::jsonb,
    validity_days INTEGER NOT NULL DEFAULT 30,
    package_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_gst_applicable BOOLEAN NOT NULL DEFAULT TRUE,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    hsn_sac VARCHAR(20) NOT NULL DEFAULT '999799',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_package_category CHECK (category IN (
        'DOG_DAY_CARE', 'CAT_DAY_CARE', 'DOG_NIGHT_CARE', 'CAT_NIGHT_CARE',
        'BOARDING_PACKAGE', 'GROOMING_PACKAGE', 'TRAINING_PACKAGE',
        'PICK_DROP_PACKAGE', 'CUSTOM_PACKAGE'
    ))
);

CREATE INDEX IF NOT EXISTS idx_package_master_active ON public.service_package_master (is_active);
CREATE INDEX IF NOT EXISTS idx_package_master_category ON public.service_package_master (category);

ALTER TABLE public.service_package_master ENABLE ROW LEVEL SECURITY;

-- Package Master Policies (Enforcing granular RBAC)
DROP POLICY IF EXISTS "service_package_master_select" ON public.service_package_master;
DROP POLICY IF EXISTS "service_package_master_insert" ON public.service_package_master;
DROP POLICY IF EXISTS "service_package_master_update" ON public.service_package_master;
DROP POLICY IF EXISTS "service_package_master_delete" ON public.service_package_master;

CREATE POLICY "service_package_master_select" ON public.service_package_master
FOR SELECT TO authenticated
USING (public.current_user_has_permission('package_master_view') OR public.current_user_has_permission('invoices_create'));

CREATE POLICY "service_package_master_insert" ON public.service_package_master
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('package_master_edit'));

CREATE POLICY "service_package_master_update" ON public.service_package_master
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('package_master_edit'))
WITH CHECK (public.current_user_has_permission('package_master_edit'));

CREATE POLICY "service_package_master_delete" ON public.service_package_master
FOR DELETE TO authenticated
USING (public.current_user_has_permission('package_master_delete'));

-- --------------------------------------------------------------------
-- 3. MONTHLY SERVICE PACKAGES (public.monthly_service_packages)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monthly_service_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_code VARCHAR(50) NOT NULL UNIQUE,
    customer_id VARCHAR(100) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(50),
    pet_id VARCHAR(100) NOT NULL,
    pet_name VARCHAR(100) NOT NULL,
    pet_species VARCHAR(30) NOT NULL DEFAULT 'Dog',
    package_id VARCHAR(100) NOT NULL,
    package_name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    gst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_monthly_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_monthly_sub_status CHECK (status IN ('ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED', 'COMPLETED'))
);

CREATE INDEX IF NOT EXISTS idx_monthly_subs_cust ON public.monthly_service_packages (customer_id);
CREATE INDEX IF NOT EXISTS idx_monthly_subs_pet ON public.monthly_service_packages (pet_id);
CREATE INDEX IF NOT EXISTS idx_monthly_subs_status ON public.monthly_service_packages (status);

ALTER TABLE public.monthly_service_packages ENABLE ROW LEVEL SECURITY;

-- Monthly Service Package Policies
DROP POLICY IF EXISTS "monthly_service_packages_select" ON public.monthly_service_packages;
DROP POLICY IF EXISTS "monthly_service_packages_insert" ON public.monthly_service_packages;
DROP POLICY IF EXISTS "monthly_service_packages_update" ON public.monthly_service_packages;
DROP POLICY IF EXISTS "monthly_service_packages_delete" ON public.monthly_service_packages;

CREATE POLICY "monthly_service_packages_select" ON public.monthly_service_packages
FOR SELECT TO authenticated
USING (public.current_user_has_permission('monthly_package_view'));

CREATE POLICY "monthly_service_packages_insert" ON public.monthly_service_packages
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('monthly_package_manage'));

CREATE POLICY "monthly_service_packages_update" ON public.monthly_service_packages
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('monthly_package_manage'))
WITH CHECK (public.current_user_has_permission('monthly_package_manage'));

CREATE POLICY "monthly_service_packages_delete" ON public.monthly_service_packages
FOR DELETE TO authenticated
USING (public.current_user_has_permission('monthly_package_delete'));

-- --------------------------------------------------------------------
-- 4. MONTHLY PACKAGE BILLINGS LOG (public.monthly_package_billings)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monthly_package_billings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monthly_package_id UUID NOT NULL REFERENCES public.monthly_service_packages(id) ON DELETE CASCADE,
    billing_month VARCHAR(7) NOT NULL, -- e.g. '2026-08'
    invoice_number VARCHAR(50) NOT NULL,
    invoice_internal_id VARCHAR(100),
    billed_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_monthly_pkg_month UNIQUE (monthly_package_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_billings_pkg ON public.monthly_package_billings (monthly_package_id);
CREATE INDEX IF NOT EXISTS idx_monthly_billings_month ON public.monthly_package_billings (billing_month);

ALTER TABLE public.monthly_package_billings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monthly_package_billings_select" ON public.monthly_package_billings;
DROP POLICY IF EXISTS "monthly_package_billings_insert" ON public.monthly_package_billings;
DROP POLICY IF EXISTS "monthly_package_billings_update" ON public.monthly_package_billings;
DROP POLICY IF EXISTS "monthly_package_billings_delete" ON public.monthly_package_billings;

CREATE POLICY "monthly_package_billings_select" ON public.monthly_package_billings
FOR SELECT TO authenticated
USING (public.current_user_has_permission('monthly_package_view'));

CREATE POLICY "monthly_package_billings_insert" ON public.monthly_package_billings
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('monthly_package_manage'));

CREATE POLICY "monthly_package_billings_update" ON public.monthly_package_billings
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('monthly_package_manage'))
WITH CHECK (public.current_user_has_permission('monthly_package_manage'));

CREATE POLICY "monthly_package_billings_delete" ON public.monthly_package_billings
FOR DELETE TO authenticated
USING (public.current_user_has_permission('monthly_package_delete'));

-- --------------------------------------------------------------------
-- 5. ATOMIC INVOICE CREATION RPC (public.create_invoice_with_items)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_invoice_with_items(
    p_invoice JSONB,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_created_invoice public.invoices%ROWTYPE;
    v_item JSONB;
    v_internal_id VARCHAR(100);
    v_invoice_num VARCHAR(50);
BEGIN
    -- 1. Security & RBAC Guard: Verify caller authentication and permission
    IF auth.uid() IS NOT NULL THEN
        IF NOT public.current_user_has_permission('invoices_create') THEN
            RAISE EXCEPTION 'Access Denied: You do not have permission to create invoices';
        END IF;
    END IF;

    -- 2. Invoice ID Resolution
    v_internal_id := p_invoice->>'internal_invoice_id';
    IF v_internal_id IS NULL OR v_internal_id = '' THEN
        v_internal_id := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    END IF;

    -- 3. Invoice Number Resolution: Use authoritative number or invoke sequence RPC
    v_invoice_num := p_invoice->>'invoice_number';
    IF v_invoice_num IS NULL OR v_invoice_num = '' THEN
        v_invoice_num := public.generate_next_invoice_number(COALESCE(p_invoice->>'financial_year', '26-27'));
    END IF;

    -- 4. Check for duplicate invoice number conflict
    IF EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = v_invoice_num) THEN
        RAISE EXCEPTION 'Invoice Number % already exists in database', v_invoice_num;
    END IF;

    -- 5. Insert Invoice Header inside transaction
    INSERT INTO public.invoices (
        internal_invoice_id,
        invoice_number,
        financial_year,
        invoice_date,
        due_date,
        customer_id,
        customer_name,
        customer_phone,
        customer_email,
        customer_gstin,
        pet_id,
        pet_name,
        place_of_supply,
        is_inter_state,
        sub_total,
        total_discount,
        taxable_amount,
        cgst_total,
        sgst_total,
        igst_total,
        total_gst,
        round_off,
        grand_total,
        paid_amount,
        balance_due,
        payment_status,
        payment_mode,
        notes,
        created_by_role,
        created_by_name,
        is_cancelled
    ) VALUES (
        v_internal_id,
        v_invoice_num,
        COALESCE(p_invoice->>'financial_year', '2026-27'),
        p_invoice->>'invoice_date',
        NULLIF(p_invoice->>'due_date', ''),
        p_invoice->>'customer_id',
        p_invoice->>'customer_name',
        NULLIF(p_invoice->>'customer_phone', ''),
        NULLIF(p_invoice->>'customer_email', ''),
        NULLIF(p_invoice->>'customer_gstin', ''),
        NULLIF(p_invoice->>'pet_id', ''),
        NULLIF(p_invoice->>'pet_name', ''),
        COALESCE(p_invoice->>'place_of_supply', '27-Maharashtra'),
        COALESCE((p_invoice->>'is_inter_state')::BOOLEAN, false),
        COALESCE((p_invoice->>'sub_total')::NUMERIC, 0.00),
        COALESCE((p_invoice->>'total_discount')::NUMERIC, 0.00),
        COALESCE((p_invoice->>'taxable_amount')::NUMERIC, 0.00),
        COALESCE((p_invoice->>'cgst_total')::NUMERIC, 0.00),
        COALESCE((p_invoice->>'sgst_total')::NUMERIC, 0.00),
        COALESCE((p_invoice->>'igst_total')::NUMERIC, 0.00),
        COALESCE((p_invoice->>'total_gst')::NUMERIC, 0.00),
        COALESCE((p_invoice->>'round_off')::NUMERIC, 0.00),
        COALESCE((p_invoice->>'grand_total')::NUMERIC, 0.00),
        COALESCE((p_invoice->>'paid_amount')::NUMERIC, 0.00),
        COALESCE((p_invoice->>'balance_due')::NUMERIC, 0.00),
        COALESCE(p_invoice->>'payment_status', 'UNPAID'),
        COALESCE(p_invoice->>'payment_mode', 'UPI'),
        NULLIF(p_invoice->>'notes', ''),
        COALESCE(p_invoice->>'created_by_role', 'ADMIN'),
        COALESCE(p_invoice->>'created_by_name', 'Chirag Jain'),
        COALESCE((p_invoice->>'is_cancelled')::BOOLEAN, false)
    )
    RETURNING * INTO v_created_invoice;

    -- 6. Insert Invoice Line Items Atomically inside transaction
    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO public.invoice_items (
                line_item_id,
                internal_invoice_id,
                invoice_number,
                catalog_item_id,
                item_type,
                item_name,
                hsn_sac,
                price,
                quantity,
                discount_percent,
                discount_amount,
                taxable_value,
                gst_rate,
                cgst_amount,
                sgst_amount,
                igst_amount,
                item_total
            ) VALUES (
                COALESCE(v_item->>'line_item_id', 'ITEM-' || v_internal_id || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)),
                v_internal_id,
                v_created_invoice.invoice_number,
                NULLIF(v_item->>'catalog_item_id', ''),
                COALESCE(v_item->>'item_type', 'SERVICE'),
                v_item->>'item_name',
                COALESCE(v_item->>'hsn_sac', '999799'),
                COALESCE((v_item->>'price')::NUMERIC, 0.00),
                COALESCE((v_item->>'quantity')::NUMERIC, 1),
                COALESCE((v_item->>'discount_percent')::NUMERIC, 0.00),
                COALESCE((v_item->>'discount_amount')::NUMERIC, 0.00),
                COALESCE((v_item->>'taxable_value')::NUMERIC, 0.00),
                COALESCE((v_item->>'gst_rate')::NUMERIC, 18.00),
                COALESCE((v_item->>'cgst_amount')::NUMERIC, 0.00),
                COALESCE((v_item->>'sgst_amount')::NUMERIC, 0.00),
                COALESCE((v_item->>'igst_amount')::NUMERIC, 0.00),
                COALESCE((v_item->>'item_total')::NUMERIC, 0.00)
            );
        END LOOP;
    END IF;

    -- Return JSON payload of the created invoice header
    RETURN row_to_json(v_created_invoice)::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.create_invoice_with_items(JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_invoice_with_items(JSONB, JSONB) TO authenticated;

