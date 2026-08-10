-- ============================================================
-- 05_user_permissions.sql — Role Defaults & User Overrides Tables
-- Project: The House of Pawz – Billing Pro
-- Tables: role_permissions & user_permissions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role_enum NOT NULL,
    permission_key VARCHAR(100) NOT NULL,
    is_granted BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_role_permission UNIQUE (role, permission_key)
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(50) NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    is_granted BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_user_permission UNIQUE (user_id, permission_key)
);
