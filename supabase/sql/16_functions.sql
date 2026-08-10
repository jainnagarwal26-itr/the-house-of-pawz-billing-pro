-- ============================================================
-- 16_functions.sql — Concurrency-Safe & Search-Path Hardened Functions
-- Project: The House of Pawz – Billing Pro
-- Purpose: Atomic sequence generator and SECURITY DEFINER audit logger.
-- ============================================================

CREATE OR REPLACE FUNCTION generate_next_invoice_number(fy_input TEXT DEFAULT '26-27')
RETURNS TEXT AS $$
DECLARE
    max_num INT;
    next_num INT;
    seq_str TEXT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('thop_invoice_seq_' || fy_input));

    SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '/', 3) AS INTEGER)), 0)
    INTO max_num
    FROM public.invoices
    WHERE invoice_number LIKE 'HOP/' || fy_input || '/%';

    next_num := max_num + 1;
    seq_str := LPAD(next_num::TEXT, 6, '0');

    RETURN 'HOP/' || fy_input || '/' || seq_str;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Secure Audit Log Inserter with Controlled Search Path
CREATE OR REPLACE FUNCTION log_audit_event(
    p_log_id TEXT,
    p_action TEXT,
    p_details TEXT
)
RETURNS VOID AS $$
DECLARE
    v_user_id VARCHAR(50);
    v_username VARCHAR(100);
    v_role VARCHAR(50);
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated audit attempt';
    END IF;

    SELECT user_id, username, role::TEXT INTO v_user_id, v_username, v_role
    FROM public.users WHERE id = auth.uid();

    INSERT INTO public.audit_logs (log_id, timestamp, user_id, username, role, action, details, created_at)
    VALUES (p_log_id, NOW()::TEXT, COALESCE(v_user_id, 'SYSTEM'), COALESCE(v_username, 'authenticated'), COALESCE(v_role, 'USER'), p_action, p_details, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- SECURITY DEFINER execution is authenticated-only.
REVOKE ALL ON FUNCTION public.generate_next_invoice_number(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_invoice_number(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.log_audit_event(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, TEXT) TO authenticated;
