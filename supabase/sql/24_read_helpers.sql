-- ============================================================
-- 24_read_helpers.sql — SECURITY DEFINER Read RPC Functions
-- Project: The House of Pawz – Billing Pro
-- Purpose: Provide atomic, high-performance SECURITY DEFINER read procedures.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_all_invoices()
RETURNS SETOF public.invoices AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.invoices ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_all_customers()
RETURNS SETOF public.customers AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.customers ORDER BY customer_id ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_all_pets()
RETURNS SETOF public.pets AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.pets ORDER BY pet_id ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_all_payments()
RETURNS SETOF public.payments AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.payments ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_all_invoices() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_invoices() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_all_customers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_customers() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_all_pets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_pets() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_all_payments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_payments() TO anon, authenticated;
