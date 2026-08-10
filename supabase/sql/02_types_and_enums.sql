-- ============================================================
-- 02_types_and_enums.sql
-- Project: The House of Pawz – Billing Pro
-- Purpose: Custom ENUM types for roles, statuses, item types.
-- ============================================================

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'USER', 'BILLING_STAFF', 'RECEPTION', 'SUPER_ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('PAID', 'PARTIAL', 'UNPAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE item_type_enum AS ENUM ('SERVICE', 'PRODUCT', 'PACKAGE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE pet_species_enum AS ENUM ('Dog', 'Cat', 'Bird', 'Rabbit', 'Other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE comm_status_enum AS ENUM ('INITIATED', 'OPENED', 'SENT', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
