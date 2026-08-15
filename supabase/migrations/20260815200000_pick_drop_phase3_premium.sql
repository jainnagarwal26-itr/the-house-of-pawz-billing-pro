-- ============================================================
-- 20260815200000_pick_drop_phase3_premium.sql
-- Lightweight Pick & Drop Module Phase 3 (Premium Additive Enhancements)
-- Project: The House of Pawz – Billing Pro
-- ============================================================

-- 1. Table: Pick & Drop Lightweight Communication History (Text-only)
CREATE TABLE IF NOT EXISTS public.pick_drop_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_type VARCHAR(50) NOT NULL, -- 'BOOKING_CONFIRMED', 'DRIVER_ASSIGNED', 'PICKUP_NOTIFIED', 'DELIVERY_NOTIFIED', 'INVOICE_NOTIFIED'
    booking_id VARCHAR(50) NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_by TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT', -- 'SENT', 'FAILED', 'PENDING'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Additive Fields to Pick & Drop Bookings for Phase 3 Premium
ALTER TABLE public.pick_drop_bookings 
    ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
    ADD COLUMN IF NOT EXISTS booking_source VARCHAR(50) DEFAULT 'Phone',
    ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Normal',
    ADD COLUMN IF NOT EXISTS preferred_vehicle_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS preferred_driver_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS status_changed_by TEXT,
    ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS operational_note TEXT,
    ADD COLUMN IF NOT EXISTS delay_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT,
    ADD COLUMN IF NOT EXISTS estimated_pickup_time TEXT,
    ADD COLUMN IF NOT EXISTS estimated_delivery_time TEXT,
    ADD COLUMN IF NOT EXISTS delay_minutes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS delay_status VARCHAR(30) DEFAULT 'ON_TIME';

-- 3. Indexes for Performance & Lightweight Lookup
CREATE INDEX IF NOT EXISTS idx_pick_drop_comm_booking ON public.pick_drop_communications(booking_id);
CREATE INDEX IF NOT EXISTS idx_pick_drop_comm_customer ON public.pick_drop_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_pick_drop_bookings_priority ON public.pick_drop_bookings(priority);
CREATE INDEX IF NOT EXISTS idx_pick_drop_bookings_delay_status ON public.pick_drop_bookings(delay_status);

-- 4. Enable RLS on Communications Table
ALTER TABLE public.pick_drop_communications ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if any to ensure idempotency
DROP POLICY IF EXISTS "pick_drop_comm_select" ON public.pick_drop_communications;
DROP POLICY IF EXISTS "pick_drop_comm_insert" ON public.pick_drop_communications;

-- 6. RLS Policies for Communication Table
CREATE POLICY "pick_drop_comm_select" ON public.pick_drop_communications 
    FOR SELECT TO authenticated 
    USING (current_user_has_permission('pick_drop_view'));

CREATE POLICY "pick_drop_comm_insert" ON public.pick_drop_communications 
    FOR INSERT TO authenticated 
    WITH CHECK (current_user_has_permission('pick_drop_edit') OR current_user_has_permission('pick_drop_status_update') OR current_user_has_permission('pick_drop_create'));
