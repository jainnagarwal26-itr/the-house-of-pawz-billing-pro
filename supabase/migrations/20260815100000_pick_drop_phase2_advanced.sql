-- ============================================================
-- 20260815100000_pick_drop_phase2_advanced.sql
-- Lightweight Pick & Drop Module Phase 2 (Advanced Additive Enhancements)
-- Project: The House of Pawz – Billing Pro
-- ============================================================

-- 1. Table: Recurring Transit Schedules
CREATE TABLE IF NOT EXISTS public.pick_drop_recurring_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    pet_id VARCHAR(50) NOT NULL,
    pet_name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    pickup_address TEXT NOT NULL,
    drop_address TEXT NOT NULL,
    preferred_pickup_time TEXT NOT NULL,
    preferred_drop_time TEXT NOT NULL,
    pattern VARCHAR(50) NOT NULL, -- 'DAILY', 'ALTERNATE_DAYS', 'WEEKLY', 'CUSTOM_DAYS'
    days_of_week INTEGER[], -- Array of day numbers [1..7] where 1 = Monday
    start_date DATE NOT NULL,
    end_date DATE,
    driver_id VARCHAR(50),
    driver_name TEXT,
    vehicle_id VARCHAR(50),
    vehicle_number TEXT,
    estimated_base_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    last_generated_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Additive Fields to Pick & Drop Bookings (Safe Schema Expansion)
ALTER TABLE public.pick_drop_bookings 
    ADD COLUMN IF NOT EXISTS recurring_schedule_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS additional_pets_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS additional_stops_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS waiting_minutes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_night BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_holiday BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pick_drop_recurring_customer ON public.pick_drop_recurring_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_pick_drop_recurring_pet ON public.pick_drop_recurring_schedules(pet_id);
CREATE INDEX IF NOT EXISTS idx_pick_drop_recurring_active ON public.pick_drop_recurring_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_pick_drop_bookings_recurring ON public.pick_drop_bookings(recurring_schedule_id);

-- Enable RLS on new table
ALTER TABLE public.pick_drop_recurring_schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "pick_drop_recurring_select" ON public.pick_drop_recurring_schedules;
DROP POLICY IF EXISTS "pick_drop_recurring_insert" ON public.pick_drop_recurring_schedules;
DROP POLICY IF EXISTS "pick_drop_recurring_update" ON public.pick_drop_recurring_schedules;
DROP POLICY IF EXISTS "pick_drop_recurring_delete" ON public.pick_drop_recurring_schedules;

-- RLS Policies for Recurring Schedules
CREATE POLICY "pick_drop_recurring_select" ON public.pick_drop_recurring_schedules 
    FOR SELECT TO authenticated 
    USING (current_user_has_permission('pick_drop_recurring_view') OR current_user_has_permission('pick_drop_view'));

CREATE POLICY "pick_drop_recurring_insert" ON public.pick_drop_recurring_schedules 
    FOR INSERT TO authenticated 
    WITH CHECK (current_user_has_permission('pick_drop_recurring_edit') OR current_user_has_permission('pick_drop_create'));

CREATE POLICY "pick_drop_recurring_update" ON public.pick_drop_recurring_schedules 
    FOR UPDATE TO authenticated 
    USING (current_user_has_permission('pick_drop_recurring_edit')) 
    WITH CHECK (current_user_has_permission('pick_drop_recurring_edit'));

CREATE POLICY "pick_drop_recurring_delete" ON public.pick_drop_recurring_schedules 
    FOR DELETE TO authenticated 
    USING (current_user_has_permission('pick_drop_recurring_edit') OR current_user_has_permission('pick_drop_delete'));

-- Seed Phase 2 Role Permissions in Supabase DB
INSERT INTO public.role_permissions (role, permission_key, is_granted)
VALUES
-- ACCOUNTANT (Full Control)
('ACCOUNTANT', 'pick_drop_recurring_view', true),
('ACCOUNTANT', 'pick_drop_recurring_edit', true),
('ACCOUNTANT', 'pick_drop_reports_export', true),

-- ADMIN (Operational)
('ADMIN', 'pick_drop_recurring_view', true),
('ADMIN', 'pick_drop_recurring_edit', true),
('ADMIN', 'pick_drop_reports_export', true),

-- BILLING_STAFF (No Recurring or Reports Export)
('BILLING_STAFF', 'pick_drop_recurring_view', false),
('BILLING_STAFF', 'pick_drop_recurring_edit', false),
('BILLING_STAFF', 'pick_drop_reports_export', false),

-- USER (All Denied)
('USER', 'pick_drop_recurring_view', false),
('USER', 'pick_drop_recurring_edit', false),
('USER', 'pick_drop_reports_export', false)
ON CONFLICT (role, permission_key) DO UPDATE
SET is_granted = EXCLUDED.is_granted;
