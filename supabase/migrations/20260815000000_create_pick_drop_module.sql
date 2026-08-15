-- ============================================================
-- 20260815000000_create_pick_drop_module.sql
-- Lightweight Pick & Drop Module V1 (Text-First Architecture)
-- Project: The House of Pawz – Billing Pro
-- ============================================================

-- 1. Table: Drivers Master
CREATE TABLE IF NOT EXISTS public.pick_drop_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id VARCHAR(50) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    alternate_mobile TEXT,
    license_number TEXT,
    license_expiry DATE,
    emergency_contact TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Table: Vehicles Master
CREATE TABLE IF NOT EXISTS public.pick_drop_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id VARCHAR(50) UNIQUE NOT NULL,
    vehicle_number TEXT NOT NULL,
    vehicle_type TEXT NOT NULL DEFAULT 'Van',
    capacity INTEGER NOT NULL DEFAULT 2,
    is_ac BOOLEAN NOT NULL DEFAULT true,
    is_pet_friendly BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    insurance_expiry DATE,
    puc_expiry DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Table: Configurable Dynamic Pricing Rules
CREATE TABLE IF NOT EXISTS public.pick_drop_pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'FIXED', 'PER_KM', 'PER_PET', 'WAITING', 'NIGHT', 'EMERGENCY', 'ADDITIONAL', 'ROUND_TRIP'
    rate NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Table: Pick & Drop Bookings
CREATE TABLE IF NOT EXISTS public.pick_drop_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    pet_id VARCHAR(50) NOT NULL,
    pet_name TEXT NOT NULL,
    pet_species TEXT,
    pet_breed TEXT,
    pet_weight TEXT,
    pet_handling_notes TEXT,
    service_type TEXT NOT NULL, -- 'One Way Pickup', 'One Way Drop', 'Pickup + Drop', 'Round Trip', etc.
    
    -- Pickup Info
    pickup_address TEXT NOT NULL,
    pickup_landmark TEXT,
    pickup_date DATE NOT NULL,
    preferred_pickup_time TEXT NOT NULL,
    pickup_time_window TEXT,
    pickup_contact_person TEXT,
    pickup_maps_link TEXT,
    
    -- Drop Info
    drop_address TEXT NOT NULL,
    drop_landmark TEXT,
    drop_date DATE NOT NULL,
    preferred_drop_time TEXT NOT NULL,
    drop_contact_person TEXT,
    drop_maps_link TEXT,
    
    -- Driver & Vehicle Allocation
    driver_id VARCHAR(50),
    driver_name TEXT,
    vehicle_id VARCHAR(50),
    vehicle_number TEXT,
    
    -- Status & Lifecycle
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
    actual_pickup_time TIMESTAMPTZ,
    pickup_confirmed_by TEXT,
    pickup_note TEXT,
    actual_delivery_time TIMESTAMPTZ,
    delivered_to TEXT,
    receiver_name TEXT,
    receiver_relationship TEXT,
    delivery_note TEXT,
    delivered_by TEXT,
    
    -- Pricing & Billing
    base_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
    additional_charges NUMERIC(10,2) NOT NULL DEFAULT 0,
    waiting_charges NUMERIC(10,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    invoice_id VARCHAR(50),
    invoice_number TEXT,
    
    -- Notes & Metadata
    customer_notes TEXT,
    internal_staff_notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Table: Status History (Text-First Timeline Audit)
CREATE TABLE IF NOT EXISTS public.pick_drop_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT
);

-- Indexes for performant filtering
CREATE INDEX IF NOT EXISTS idx_pick_drop_bookings_customer ON public.pick_drop_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_pick_drop_bookings_pet ON public.pick_drop_bookings(pet_id);
CREATE INDEX IF NOT EXISTS idx_pick_drop_bookings_status ON public.pick_drop_bookings(status);
CREATE INDEX IF NOT EXISTS idx_pick_drop_bookings_pickup_date ON public.pick_drop_bookings(pickup_date);
CREATE INDEX IF NOT EXISTS idx_pick_drop_status_history_booking ON public.pick_drop_status_history(booking_id);

-- Enable RLS
ALTER TABLE public.pick_drop_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_drop_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_drop_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_drop_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_drop_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Drivers
CREATE POLICY "pick_drop_drivers_select" ON public.pick_drop_drivers FOR SELECT TO authenticated USING (current_user_has_permission('pick_drop_view'));
CREATE POLICY "pick_drop_drivers_insert" ON public.pick_drop_drivers FOR INSERT TO authenticated WITH CHECK (current_user_has_permission('pick_drop_edit') OR current_user_has_permission('settings_edit'));
CREATE POLICY "pick_drop_drivers_update" ON public.pick_drop_drivers FOR UPDATE TO authenticated USING (current_user_has_permission('pick_drop_edit') OR current_user_has_permission('settings_edit')) WITH CHECK (current_user_has_permission('pick_drop_edit') OR current_user_has_permission('settings_edit'));
CREATE POLICY "pick_drop_drivers_delete" ON public.pick_drop_drivers FOR DELETE TO authenticated USING (current_user_has_permission('pick_drop_delete'));

-- RLS Policies: Vehicles
CREATE POLICY "pick_drop_vehicles_select" ON public.pick_drop_vehicles FOR SELECT TO authenticated USING (current_user_has_permission('pick_drop_view'));
CREATE POLICY "pick_drop_vehicles_insert" ON public.pick_drop_vehicles FOR INSERT TO authenticated WITH CHECK (current_user_has_permission('pick_drop_edit') OR current_user_has_permission('settings_edit'));
CREATE POLICY "pick_drop_vehicles_update" ON public.pick_drop_vehicles FOR UPDATE TO authenticated USING (current_user_has_permission('pick_drop_edit') OR current_user_has_permission('settings_edit')) WITH CHECK (current_user_has_permission('pick_drop_edit') OR current_user_has_permission('settings_edit'));
CREATE POLICY "pick_drop_vehicles_delete" ON public.pick_drop_vehicles FOR DELETE TO authenticated USING (current_user_has_permission('pick_drop_delete'));

-- RLS Policies: Pricing Rules
CREATE POLICY "pick_drop_pricing_rules_select" ON public.pick_drop_pricing_rules FOR SELECT TO authenticated USING (current_user_has_permission('pick_drop_pricing_view'));
CREATE POLICY "pick_drop_pricing_rules_insert" ON public.pick_drop_pricing_rules FOR INSERT TO authenticated WITH CHECK (current_user_has_permission('pick_drop_pricing_edit'));
CREATE POLICY "pick_drop_pricing_rules_update" ON public.pick_drop_pricing_rules FOR UPDATE TO authenticated USING (current_user_has_permission('pick_drop_pricing_edit')) WITH CHECK (current_user_has_permission('pick_drop_pricing_edit'));
CREATE POLICY "pick_drop_pricing_rules_delete" ON public.pick_drop_pricing_rules FOR DELETE TO authenticated USING (current_user_has_permission('pick_drop_pricing_edit'));

-- RLS Policies: Bookings
CREATE POLICY "pick_drop_bookings_select" ON public.pick_drop_bookings FOR SELECT TO authenticated USING (current_user_has_permission('pick_drop_view'));
CREATE POLICY "pick_drop_bookings_insert" ON public.pick_drop_bookings FOR INSERT TO authenticated WITH CHECK (current_user_has_permission('pick_drop_create'));
CREATE POLICY "pick_drop_bookings_update" ON public.pick_drop_bookings FOR UPDATE TO authenticated USING (current_user_has_permission('pick_drop_status_update') OR current_user_has_permission('pick_drop_edit')) WITH CHECK (current_user_has_permission('pick_drop_status_update') OR current_user_has_permission('pick_drop_edit'));
CREATE POLICY "pick_drop_bookings_delete" ON public.pick_drop_bookings FOR DELETE TO authenticated USING (current_user_has_permission('pick_drop_delete'));

-- RLS Policies: Status History
CREATE POLICY "pick_drop_status_history_select" ON public.pick_drop_status_history FOR SELECT TO authenticated USING (current_user_has_permission('pick_drop_view'));
CREATE POLICY "pick_drop_status_history_insert" ON public.pick_drop_status_history FOR INSERT TO authenticated WITH CHECK (current_user_has_permission('pick_drop_status_update') OR current_user_has_permission('pick_drop_create'));

-- Seed Initial Default Pricing Rules
INSERT INTO public.pick_drop_pricing_rules (rule_name, rule_type, rate, is_active, notes)
VALUES 
('Base One-Way Pickup', 'FIXED', 250.00, true, 'Standard one-way pet pickup charge'),
('Base One-Way Drop', 'FIXED', 250.00, true, 'Standard one-way pet drop charge'),
('Round Trip (Pickup + Drop)', 'ROUND_TRIP', 450.00, true, 'Combined two-way transportation'),
('Distance Surcharge (per KM)', 'PER_KM', 20.00, true, 'Per kilometer beyond standard zone'),
('Waiting Charge (per 30 min)', 'WAITING', 100.00, true, 'Driver waiting charge at location'),
('Additional Pet Surcharge', 'PER_PET', 150.00, true, 'For second/multiple pets in same trip'),
('Night Surcharge (After 8 PM)', 'NIGHT', 200.00, true, 'Late evening transportation surcharge'),
('Emergency / Immediate Pickup', 'EMERGENCY', 300.00, true, 'Emergency prioritized pickup service')
ON CONFLICT DO NOTHING;
