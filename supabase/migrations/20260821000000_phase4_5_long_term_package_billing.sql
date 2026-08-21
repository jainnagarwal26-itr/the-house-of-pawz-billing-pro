-- ====================================================================
-- 20260821000000_phase4_5_long_term_package_billing.sql
-- Module: The House of Pawz – Phase 4.5: Long-Term Packages & Contracts
--         (Multi-Component Allocations, Pet-Wise Usage & Periodic Billing)
--
-- STATUS: HARDENED PRE-PRODUCTION (DO NOT EXECUTE UNTIL EXPLICITLY APPROVED)
-- Hardening Features:
-- 1. Atomic Usage RPC (public.log_contract_service_usage) with FOR UPDATE row locking
-- 2. Non-Negative allocation/usage database check constraints
-- 3. Contract Delete Safety trigger (blocks deleting contracts with usage, billing, or invoices)
-- 4. Overlapping Billing Period Protection via btree_gist daterange exclusion constraint
-- 5. Strict RLS with public.current_user_has_permission(...)
-- ====================================================================

-- Enable btree_gist extension for overlapping period exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- --------------------------------------------------------------------
-- 1. CUSTOMERS TABLE ENHANCEMENT (Non-breaking additive columns)
-- --------------------------------------------------------------------
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(30) NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_name VARCHAR(200);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(150);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pan VARCHAR(20);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'Net 30';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_days INTEGER DEFAULT 30;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(30) DEFAULT 'Monthly';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contract_ref VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS special_billing_notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON public.customers (customer_type);

-- --------------------------------------------------------------------
-- 2. LONG-TERM CONTRACTS MASTER (public.long_term_contracts)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.long_term_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_code VARCHAR(50) NOT NULL UNIQUE,
    contract_name VARCHAR(200) NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(50),
    customer_email VARCHAR(150),
    customer_gstin VARCHAR(50),
    customer_type VARCHAR(30) NOT NULL DEFAULT 'INDIVIDUAL',
    contract_type VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    billing_frequency VARCHAR(50) NOT NULL DEFAULT 'Monthly',
    payment_terms VARCHAR(50) NOT NULL DEFAULT 'Net 30',
    credit_days INTEGER NOT NULL DEFAULT 30,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    is_gst_applicable BOOLEAN NOT NULL DEFAULT TRUE,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    total_contract_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_billed_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_contract_status CHECK (status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CANCELLED', 'TERMINATED')),
    CONSTRAINT chk_contract_period_type CHECK (contract_type IN ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM_PERIOD')),
    CONSTRAINT chk_contract_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_lt_contracts_cust ON public.long_term_contracts (customer_id);
CREATE INDEX IF NOT EXISTS idx_lt_contracts_status ON public.long_term_contracts (status);
CREATE INDEX IF NOT EXISTS idx_lt_contracts_dates ON public.long_term_contracts (start_date, end_date);

ALTER TABLE public.long_term_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "long_term_contracts_select" ON public.long_term_contracts;
DROP POLICY IF EXISTS "long_term_contracts_insert" ON public.long_term_contracts;
DROP POLICY IF EXISTS "long_term_contracts_update" ON public.long_term_contracts;
DROP POLICY IF EXISTS "long_term_contracts_delete" ON public.long_term_contracts;

CREATE POLICY "long_term_contracts_select" ON public.long_term_contracts
FOR SELECT TO authenticated
USING (public.current_user_has_permission('long_term_package_view'));

CREATE POLICY "long_term_contracts_insert" ON public.long_term_contracts
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('long_term_package_create'));

CREATE POLICY "long_term_contracts_update" ON public.long_term_contracts
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('long_term_package_edit'))
WITH CHECK (public.current_user_has_permission('long_term_package_edit'));

CREATE POLICY "long_term_contracts_delete" ON public.long_term_contracts
FOR DELETE TO authenticated
USING (public.current_user_has_permission('long_term_package_delete'));

-- --------------------------------------------------------------------
-- 3. LONG-TERM CONTRACT COMPONENTS / ALLOCATIONS (public.long_term_contract_items)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.long_term_contract_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.long_term_contracts(id) ON DELETE RESTRICT,
    service_id VARCHAR(100),
    service_name VARCHAR(150) NOT NULL,
    species_applicable VARCHAR(30) NOT NULL DEFAULT 'All',
    pricing_method VARCHAR(30) NOT NULL DEFAULT 'FIXED_RATE',
    allocated_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(30) NOT NULL DEFAULT 'Nights',
    rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    fixed_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    is_gst_applicable BOOLEAN NOT NULL DEFAULT TRUE,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    hsn_sac VARCHAR(20) NOT NULL DEFAULT '999799',
    used_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_component_pricing_method CHECK (pricing_method IN ('FIXED_RATE', 'FLAT_AMOUNT', 'PERCENTAGE')),
    CONSTRAINT chk_component_species CHECK (species_applicable IN ('Dog', 'Cat', 'Bird', 'Rabbit', 'Other', 'All')),
    CONSTRAINT chk_component_allocated_non_neg CHECK (allocated_quantity >= 0),
    CONSTRAINT chk_component_used_non_neg CHECK (used_quantity >= 0),
    CONSTRAINT chk_component_rate_non_neg CHECK (rate >= 0),
    CONSTRAINT chk_component_fixed_amt_non_neg CHECK (fixed_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_lt_items_contract ON public.long_term_contract_items (contract_id);

ALTER TABLE public.long_term_contract_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "long_term_contract_items_select" ON public.long_term_contract_items;
DROP POLICY IF EXISTS "long_term_contract_items_insert" ON public.long_term_contract_items;
DROP POLICY IF EXISTS "long_term_contract_items_update" ON public.long_term_contract_items;
DROP POLICY IF EXISTS "long_term_contract_items_delete" ON public.long_term_contract_items;

CREATE POLICY "long_term_contract_items_select" ON public.long_term_contract_items
FOR SELECT TO authenticated
USING (public.current_user_has_permission('long_term_package_view'));

CREATE POLICY "long_term_contract_items_insert" ON public.long_term_contract_items
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('long_term_package_create') OR public.current_user_has_permission('long_term_package_edit'));

CREATE POLICY "long_term_contract_items_update" ON public.long_term_contract_items
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('long_term_package_edit'))
WITH CHECK (public.current_user_has_permission('long_term_package_edit'));

CREATE POLICY "long_term_contract_items_delete" ON public.long_term_contract_items
FOR DELETE TO authenticated
USING (public.current_user_has_permission('long_term_package_delete'));

-- --------------------------------------------------------------------
-- 4. SERVICE USAGE LOG (public.long_term_service_usage)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.long_term_service_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.long_term_contracts(id) ON DELETE RESTRICT,
    contract_code VARCHAR(50) NOT NULL,
    contract_item_id UUID NOT NULL REFERENCES public.long_term_contract_items(id) ON DELETE RESTRICT,
    customer_id VARCHAR(100) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    pet_id VARCHAR(100),
    pet_name VARCHAR(100),
    pet_species VARCHAR(30),
    service_name VARCHAR(150) NOT NULL,
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE,
    end_date DATE,
    quantity_used NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit VARCHAR(30) NOT NULL DEFAULT 'Nights',
    pick_drop_booking_id VARCHAR(100),
    pickup_address TEXT,
    drop_address TEXT,
    driver_name VARCHAR(150),
    vehicle_number VARCHAR(50),
    base_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    billing_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    billing_period_id UUID,
    invoice_number VARCHAR(50),
    notes TEXT,
    logged_by VARCHAR(150) NOT NULL DEFAULT 'Chirag Jain',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_usage_billing_status CHECK (billing_status IN ('PENDING', 'BILLED', 'EXEMPT')),
    CONSTRAINT chk_usage_quantity_pos CHECK (quantity_used > 0),
    CONSTRAINT chk_usage_base_non_neg CHECK (base_amount >= 0),
    CONSTRAINT chk_usage_gst_non_neg CHECK (gst_amount >= 0),
    CONSTRAINT chk_usage_total_non_neg CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_lt_usage_contract ON public.long_term_service_usage (contract_id);
CREATE INDEX IF NOT EXISTS idx_lt_usage_item ON public.long_term_service_usage (contract_item_id);
CREATE INDEX IF NOT EXISTS idx_lt_usage_cust ON public.long_term_service_usage (customer_id);
CREATE INDEX IF NOT EXISTS idx_lt_usage_pet ON public.long_term_service_usage (pet_id);
CREATE INDEX IF NOT EXISTS idx_lt_usage_status ON public.long_term_service_usage (billing_status);

ALTER TABLE public.long_term_service_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "long_term_service_usage_select" ON public.long_term_service_usage;
DROP POLICY IF EXISTS "long_term_service_usage_insert" ON public.long_term_service_usage;
DROP POLICY IF EXISTS "long_term_service_usage_update" ON public.long_term_service_usage;
DROP POLICY IF EXISTS "long_term_service_usage_delete" ON public.long_term_service_usage;

CREATE POLICY "long_term_service_usage_select" ON public.long_term_service_usage
FOR SELECT TO authenticated
USING (public.current_user_has_permission('long_term_usage_view'));

CREATE POLICY "long_term_service_usage_insert" ON public.long_term_service_usage
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('long_term_usage_create'));

CREATE POLICY "long_term_service_usage_update" ON public.long_term_service_usage
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('long_term_usage_edit'))
WITH CHECK (public.current_user_has_permission('long_term_usage_edit'));

CREATE POLICY "long_term_service_usage_delete" ON public.long_term_service_usage
FOR DELETE TO authenticated
USING (public.current_user_has_permission('long_term_usage_delete'));

-- --------------------------------------------------------------------
-- 5. BILLING PERIODS & OVERLAP PROTECTION (public.long_term_billing_periods)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.long_term_billing_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.long_term_contracts(id) ON DELETE RESTRICT,
    contract_code VARCHAR(50) NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    period_name VARCHAR(200) NOT NULL,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    service_period_description TEXT NOT NULL,
    invoice_id VARCHAR(100),
    invoice_number VARCHAR(50),
    sub_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_gst NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_billing_period_status CHECK (status IN ('PENDING', 'INVOICED', 'CANCELLED')),
    CONSTRAINT chk_billing_period_dates CHECK (period_end_date >= period_start_date),
    CONSTRAINT uq_lt_contract_period_dates EXCLUDE USING gist (
        contract_id WITH =,
        daterange(period_start_date, period_end_date, '[]') WITH &&
    )
);

CREATE INDEX IF NOT EXISTS idx_lt_billing_contract ON public.long_term_billing_periods (contract_id);
CREATE INDEX IF NOT EXISTS idx_lt_billing_period_dates ON public.long_term_billing_periods (period_start_date, period_end_date);

ALTER TABLE public.long_term_billing_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "long_term_billing_periods_select" ON public.long_term_billing_periods;
DROP POLICY IF EXISTS "long_term_billing_periods_insert" ON public.long_term_billing_periods;
DROP POLICY IF EXISTS "long_term_billing_periods_update" ON public.long_term_billing_periods;
DROP POLICY IF EXISTS "long_term_billing_periods_delete" ON public.long_term_billing_periods;

CREATE POLICY "long_term_billing_periods_select" ON public.long_term_billing_periods
FOR SELECT TO authenticated
USING (public.current_user_has_permission('long_term_billing_view'));

CREATE POLICY "long_term_billing_periods_insert" ON public.long_term_billing_periods
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('long_term_billing_create'));

CREATE POLICY "long_term_billing_periods_update" ON public.long_term_billing_periods
FOR UPDATE TO authenticated
USING (public.current_user_has_permission('long_term_billing_create'))
WITH CHECK (public.current_user_has_permission('long_term_billing_create'));

CREATE POLICY "long_term_billing_periods_delete" ON public.long_term_billing_periods
FOR DELETE TO authenticated
USING (public.current_user_has_permission('long_term_billing_delete'));

-- --------------------------------------------------------------------
-- 6. CONTRACT DELETE SAFETY TRIGGER (PREVENTS ACCIDENTAL DESTRUCTION OF FINANCIAL HISTORY)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_contract_delete_safety()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_usage_count INTEGER;
    v_billing_count INTEGER;
BEGIN
    -- Check if any service usage exists for this contract
    SELECT COUNT(*) INTO v_usage_count
    FROM public.long_term_service_usage
    WHERE contract_id = OLD.id;

    IF v_usage_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete contract % (%): contract has % recorded service usage log(s). Please set contract status to TERMINATED or CANCELLED instead.', OLD.contract_code, OLD.contract_name, v_usage_count;
    END IF;

    -- Check if any billing period / invoice exists for this contract
    SELECT COUNT(*) INTO v_billing_count
    FROM public.long_term_billing_periods
    WHERE contract_id = OLD.id;

    IF v_billing_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete contract % (%): contract has % generated billing period(s)/invoice(s). Financial history must be preserved.', OLD.contract_code, OLD.contract_name, v_billing_count;
    END IF;

    -- If no history exists, allow deletion of unused draft contract components
    DELETE FROM public.long_term_contract_items WHERE contract_id = OLD.id;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_delete_safety ON public.long_term_contracts;
CREATE TRIGGER trg_contract_delete_safety
BEFORE DELETE ON public.long_term_contracts
FOR EACH ROW
EXECUTE FUNCTION public.check_contract_delete_safety();

-- --------------------------------------------------------------------
-- 7. ATOMIC USAGE LOGGING RPC WITH ROW-LEVEL LOCKING (CONCURRENCY-SAFE)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_contract_service_usage(
    p_contract_id UUID,
    p_contract_item_id UUID,
    p_customer_id VARCHAR(100),
    p_customer_name VARCHAR(150),
    p_pet_id VARCHAR(100),
    p_pet_name VARCHAR(100),
    p_pet_species VARCHAR(30),
    p_service_name VARCHAR(150),
    p_service_date DATE,
    p_start_date DATE,
    p_end_date DATE,
    p_quantity_used NUMERIC(10, 2),
    p_unit VARCHAR(30),
    p_pick_drop_booking_id VARCHAR(100),
    p_pickup_address TEXT,
    p_drop_address TEXT,
    p_driver_name VARCHAR(150),
    p_vehicle_number VARCHAR(50),
    p_base_amount NUMERIC(12, 2),
    p_gst_amount NUMERIC(12, 2),
    p_total_amount NUMERIC(12, 2),
    p_notes TEXT,
    p_logged_by VARCHAR(150)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_item RECORD;
    v_contract RECORD;
    v_usage_id UUID;
    v_new_used_qty NUMERIC(10, 2);
BEGIN
    -- 1. Permission Validation
    IF NOT public.current_user_has_permission('long_term_usage_create') THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to log long-term package service usage.';
    END IF;

    -- 2. Validate requested quantity
    IF p_quantity_used <= 0 THEN
        RAISE EXCEPTION 'Invalid quantity: quantity used must be greater than 0.';
    END IF;

    -- 3. Lock and retrieve the contract item row FOR UPDATE
    SELECT * INTO v_item
    FROM public.long_term_contract_items
    WHERE id = p_contract_item_id AND contract_id = p_contract_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract component not found or contract ID mismatch.';
    END IF;

    -- 4. Verify contract status
    SELECT * INTO v_contract
    FROM public.long_term_contracts
    WHERE id = p_contract_id;

    IF v_contract.status NOT IN ('ACTIVE', 'EXPIRING_SOON') THEN
        RAISE EXCEPTION 'Cannot log usage on contract % with status %.', v_contract.contract_code, v_contract.status;
    END IF;

    -- 5. Enforce non-negative allocation limits for FIXED_RATE components with fixed allocations
    IF v_item.pricing_method = 'FIXED_RATE' AND v_item.allocated_quantity > 0 THEN
        IF (v_item.used_quantity + p_quantity_used) > v_item.allocated_quantity THEN
            RAISE EXCEPTION 'Package Allocation Exhausted! Allocated: % %, Already Used: % %, Attempting to use: % % (Remaining: % %).',
                v_item.allocated_quantity, v_item.unit,
                v_item.used_quantity, v_item.unit,
                p_quantity_used, v_item.unit,
                (v_item.allocated_quantity - v_item.used_quantity), v_item.unit;
        END IF;
    END IF;

    -- 6. Insert usage record within the same transaction
    INSERT INTO public.long_term_service_usage (
        contract_id,
        contract_code,
        contract_item_id,
        customer_id,
        customer_name,
        pet_id,
        pet_name,
        pet_species,
        service_name,
        service_date,
        start_date,
        end_date,
        quantity_used,
        unit,
        pick_drop_booking_id,
        pickup_address,
        drop_address,
        driver_name,
        vehicle_number,
        base_amount,
        gst_amount,
        total_amount,
        billing_status,
        notes,
        logged_by
    ) VALUES (
        p_contract_id,
        v_contract.contract_code,
        p_contract_item_id,
        p_customer_id,
        p_customer_name,
        p_pet_id,
        p_pet_name,
        p_pet_species,
        p_service_name,
        p_service_date,
        p_start_date,
        p_end_date,
        p_quantity_used,
        p_unit,
        p_pick_drop_booking_id,
        p_pickup_address,
        p_drop_address,
        p_driver_name,
        p_vehicle_number,
        p_base_amount,
        p_gst_amount,
        p_total_amount,
        'PENDING',
        p_notes,
        COALESCE(p_logged_by, 'Chirag Jain')
    ) RETURNING id INTO v_usage_id;

    -- 7. Update contract item used_quantity
    v_new_used_qty := v_item.used_quantity + p_quantity_used;
    UPDATE public.long_term_contract_items
    SET used_quantity = v_new_used_qty,
        updated_at = NOW()
    WHERE id = p_contract_item_id;

    -- 8. Return success payload
    RETURN jsonb_build_object(
        'success', true,
        'usage_id', v_usage_id,
        'contract_code', v_contract.contract_code,
        'new_used_quantity', v_new_used_qty,
        'allocated_quantity', v_item.allocated_quantity,
        'remaining_quantity', GREATEST(0, v_item.allocated_quantity - v_new_used_qty)
    );
END;
$$;
