-- ============================================================
-- 01_extensions.sql — Security & Cryptography Extensions
-- Project: The House of Pawz – Billing Pro
-- Purpose: Enable required PostgreSQL & Cryptographic extensions.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
