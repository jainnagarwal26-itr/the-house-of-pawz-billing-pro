-- ============================================================
-- 07_pets.sql
-- Project: The House of Pawz – Billing Pro
-- Table: pets
-- ============================================================

CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    customer_name VARCHAR(255),
    pet_name VARCHAR(255) NOT NULL,
    species pet_species_enum DEFAULT 'Dog',
    breed VARCHAR(100) DEFAULT 'Standard',
    age VARCHAR(50) DEFAULT '2 Years',
    gender VARCHAR(20) DEFAULT 'Male',
    vaccination_status VARCHAR(100) DEFAULT 'Up to Date',
    medical_notes TEXT,
    feeding_preferences TEXT,
    microchip_id VARCHAR(100),
    barcode VARCHAR(100),
    is_boarding_now BOOLEAN DEFAULT FALSE,
    check_in_date VARCHAR(50),
    check_out_date VARCHAR(50),
    room_no VARCHAR(50) DEFAULT 'Standard Care',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
