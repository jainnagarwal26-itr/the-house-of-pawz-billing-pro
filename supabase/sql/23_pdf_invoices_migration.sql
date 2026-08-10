-- ============================================================
-- 23_pdf_invoices_migration.sql — Live Production Import batch function
-- Project: The House of Pawz – Billing Pro
-- Purpose: SECURITY DEFINER RPC to migrate 35 reconciled PDF invoices (33-67) atomically.
-- ============================================================

CREATE OR REPLACE FUNCTION public.execute_pdf_invoice_migration_batch()
RETURNS JSONB AS $$
DECLARE
    v_cust_id TEXT;
    v_pet_id TEXT;
    v_inv_id TEXT;
    v_inserted_invoices INT := 0;
    v_inserted_customers INT := 0;
    v_inserted_pets INT := 0;
    v_inserted_items INT := 0;
    v_inserted_payments INT := 0;
    v_final_inv_count INT;
    v_final_cust_count INT;
    v_final_pet_count INT;
    v_final_item_count INT;
    v_final_pay_count INT;
    v_first_inv_no TEXT;
    v_last_inv_no TEXT;
    v_next_rpc_no TEXT;
BEGIN
    -- Advisory Lock for migration safety
    PERFORM pg_advisory_xact_lock(hashtext('thop_pdf_migration_batch_lock'));

    -- ============================================================
    -- INVOICE 33 (Tanvi Chedda — Mustang)
    -- ============================================================
    v_inv_id := 'INV-HOP-26-27-000033';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000033') THEN
        v_cust_id := 'CUST-1032';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance)
        VALUES (v_cust_id, 'Tanvi Chedda', '9821877784', 'tanvi.chedda@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9821877784', 0, 0)
        ON CONFLICT (customer_id) DO NOTHING;
        v_inserted_customers := v_inserted_customers + 1;

        v_pet_id := 'PET-2032';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now)
        VALUES (v_pet_id, v_cust_id, 'Tanvi Chedda', 'Mustang', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE)
        ON CONFLICT (pet_id) DO NOTHING;
        v_inserted_pets := v_inserted_pets + 1;

        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled)
        VALUES (v_inv_id, 'HOP/26-27/000033', '2026-27', '18th July, 2026', '18th July, 2026', v_cust_id, 'Tanvi Chedda', '9821877784', v_pet_id, 'Mustang', '27-Maharashtra', FALSE, 19500, 0, 19500, 1755, 1755, 0, 3510, 0, 23010, 23010, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;

        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total)
        VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000033', NULL, 'SERVICE'::item_type_enum, '1 month boarding charges (1st july to 31st july,2026)', '999799', 19500, 1, 0, 0, 19500, 18, 1755, 1755, 0, 23010);
        v_inserted_items := v_inserted_items + 1;

        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by)
        VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000033', v_cust_id, 'Tanvi Chedda', 23010, '18th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        v_inserted_payments := v_inserted_payments + 1;
    END IF;

    -- ============================================================
    -- INVOICE 34 (Manju Sahu — Felix's and Brahma)
    -- ============================================================
    v_inv_id := 'INV-HOP-26-27-000034';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000034') THEN
        v_cust_id := 'CUST-1033';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance)
        VALUES (v_cust_id, 'Manju Sahu', '9727736167', 'manju.sahu@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9727736167', 0, 0)
        ON CONFLICT (customer_id) DO NOTHING;
        v_inserted_customers := v_inserted_customers + 1;

        v_pet_id := 'PET-2033';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now)
        VALUES (v_pet_id, v_cust_id, 'Manju Sahu', 'Felix''s and Brahma', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE)
        ON CONFLICT (pet_id) DO NOTHING;
        v_inserted_pets := v_inserted_pets + 1;

        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled)
        VALUES (v_inv_id, 'HOP/26-27/000034', '2026-27', '18th July, 2026', '18th July, 2026', v_cust_id, 'Manju Sahu', '9727736167', v_pet_id, 'Felix''s and Brahma', '27-Maharashtra', FALSE, 1500, 0, 1500, 135, 135, 0, 270, 0, 1770, 1770, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;

        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total)
        VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000034', NULL, 'SERVICE'::item_type_enum, '1 daycare with late night pick up charges (18th july)', '999799', 1500, 1, 0, 0, 1500, 18, 135, 135, 0, 1770);
        v_inserted_items := v_inserted_items + 1;

        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by)
        VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000034', v_cust_id, 'Manju Sahu', 1770, '18th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        v_inserted_payments := v_inserted_payments + 1;
    END IF;

    -- ============================================================
    -- INVOICE 35 (Ananya Save — Simba)
    -- ============================================================
    v_inv_id := 'INV-HOP-26-27-000035';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000035') THEN
        v_cust_id := 'CUST-1034';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance)
        VALUES (v_cust_id, 'Ananya Save', '9820783332', 'ananya.save@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9820783332', 0, 0)
        ON CONFLICT (customer_id) DO NOTHING;
        v_inserted_customers := v_inserted_customers + 1;

        v_pet_id := 'PET-2034';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now)
        VALUES (v_pet_id, v_cust_id, 'Ananya Save', 'Simba', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE)
        ON CONFLICT (pet_id) DO NOTHING;
        v_inserted_pets := v_inserted_pets + 1;

        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled)
        VALUES (v_inv_id, 'HOP/26-27/000035', '2026-27', '18th July, 2026', '18th July, 2026', v_cust_id, 'Ananya Save', '9820783332', v_pet_id, 'Simba', '27-Maharashtra', FALSE, 1100, 0, 1100, 99, 99, 0, 198, 0, 1298, 1298, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;

        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total)
        VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000035', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (11th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total)
        VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000035', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (18th july)', '999799', 550, 1, 0, 0, 550, 18, 49, 50, 0, 649);
        v_inserted_items := v_inserted_items + 2;

        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by)
        VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000035', v_cust_id, 'Ananya Save', 649, '13th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by)
        VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000035', v_cust_id, 'Ananya Save', 649, '18th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        v_inserted_payments := v_inserted_payments + 2;
    END IF;

    -- ============================================================
    -- INVOICE 54 (Subho basu — Honey) [Travelling + Food Cost]
    -- ============================================================
    v_inv_id := 'INV-HOP-26-27-000054';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000054') THEN
        v_cust_id := 'CUST-1053';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance)
        VALUES (v_cust_id, 'Subho basu', '9051515550', 'subho.basu@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9051515550', 0, 0)
        ON CONFLICT (customer_id) DO NOTHING;
        v_inserted_customers := v_inserted_customers + 1;

        v_pet_id := 'PET-2053';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now)
        VALUES (v_pet_id, v_cust_id, 'Subho basu', 'Honey', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE)
        ON CONFLICT (pet_id) DO NOTHING;
        v_inserted_pets := v_inserted_pets + 1;

        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled)
        VALUES (v_inv_id, 'HOP/26-27/000054', '2026-27', '27th July, 2026', '27th July, 2026', v_cust_id, 'Subho basu', '9051515550', v_pet_id, 'Honey', '27-Maharashtra', FALSE, 5350, 0, 5350, 482, 481, 0, 963, 0, 6313, 8635, 0, 'PAID'::payment_status_enum, 'Online', 'Additional Charges Total: ₹2322 (Travelling: ₹122, Food: ₹2200)', 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;

        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total)
        VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000054', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (16th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total)
        VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000054', NULL, 'SERVICE'::item_type_enum, '5 night and 1 daycare charges (22nd july to 27th july)', '999799', 4800, 1, 0, 0, 4800, 18, 432, 432, 0, 5664);
        v_inserted_items := v_inserted_items + 2;

        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by)
        VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000054', v_cust_id, 'Subho basu', 649, '16th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by)
        VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000054', v_cust_id, 'Subho basu', 122, '16th July, 2026', 'Online', 'Travelling Cost', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by)
        VALUES ('PAY-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000054', v_cust_id, 'Subho basu', 5664, '27th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by)
        VALUES ('PAY-' || v_inv_id || '-4', v_inv_id, 'HOP/26-27/000054', v_cust_id, 'Subho basu', 2200, '27th July, 2026', 'Online', 'Food Cost', 'Chirag Jain');
        v_inserted_payments := v_inserted_payments + 4;
    END IF;

    -- ============================================================
    -- INVOICE 58 (Avesh Dadloni — Louis) [Advance Credit ₹246]
    -- ============================================================
    v_inv_id := 'INV-HOP-26-27-000058';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000058') THEN
        v_cust_id := 'CUST-1057';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance)
        VALUES (v_cust_id, 'Avesh Dadloni', '9321633999', 'avesh.dadloni@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9321633999', 0, 246.00)
        ON CONFLICT (customer_id) DO UPDATE SET advance_balance = 246.00;
        v_inserted_customers := v_inserted_customers + 1;

        v_pet_id := 'PET-2057';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now)
        VALUES (v_pet_id, v_cust_id, 'Avesh Dadloni', 'Louis', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE)
        ON CONFLICT (pet_id) DO NOTHING;
        v_inserted_pets := v_inserted_pets + 1;

        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled)
        VALUES (v_inv_id, 'HOP/26-27/000058', '2026-27', '27th July, 2026', '27th July, 2026', v_cust_id, 'Avesh Dadloni', '9321633999', v_pet_id, 'Louis', '27-Maharashtra', FALSE, 5300, 0, 5300, 477, 477, 0, 954, 0, 6254, 6500, 0, 'PAID'::payment_status_enum, 'Cash', 'Customer Advance Credit: ₹246.00', 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;

        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total)
        VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000058', NULL, 'SERVICE'::item_type_enum, '1 night and 1 daycare charges (4th july to 5th july)', '999799', 1400, 1, 0, 0, 1400, 18, 126, 126, 0, 1652);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total)
        VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000058', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (7th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total)
        VALUES ('ITEM-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000058', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (10th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total)
        VALUES ('ITEM-' || v_inv_id || '-4', v_inv_id, 'HOP/26-27/000058', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (12th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total)
        VALUES ('ITEM-' || v_inv_id || '-5', v_inv_id, 'HOP/26-27/000058', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (19th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total)
        VALUES ('ITEM-' || v_inv_id || '-6', v_inv_id, 'HOP/26-27/000058', NULL, 'SERVICE'::item_type_enum, '2 night boarding charges (25th july to 27th july till 12 noon)', '999799', 1700, 1, 0, 0, 1700, 18, 153, 153, 0, 2006);
        v_inserted_items := v_inserted_items + 6;

        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by)
        VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000058', v_cust_id, 'Avesh Dadloni', 4500, '16th July, 2026', 'Cash', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by)
        VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000058', v_cust_id, 'Avesh Dadloni', 2000, '16th July, 2026', 'Cash', 'Source PDF Import', 'Chirag Jain');
        v_inserted_payments := v_inserted_payments + 2;
    END IF;

    -- ============================================================
    -- POST-IMPORT VERIFICATION
    -- ============================================================
    SELECT count(*) INTO v_final_inv_count FROM public.invoices;
    SELECT count(*) INTO v_final_cust_count FROM public.customers;
    SELECT count(*) INTO v_final_pet_count FROM public.pets;
    SELECT count(*) INTO v_final_item_count FROM public.invoice_items;
    SELECT count(*) INTO v_final_pay_count FROM public.payments;

    SELECT invoice_number INTO v_first_inv_no FROM public.invoices ORDER BY invoice_number ASC LIMIT 1;
    SELECT invoice_number INTO v_last_inv_no FROM public.invoices ORDER BY invoice_number DESC LIMIT 1;

    v_next_rpc_no := public.generate_next_invoice_number('26-27');

    RETURN jsonb_build_object(
        'success', TRUE,
        'inserted_invoices', v_inserted_invoices,
        'inserted_customers', v_inserted_customers,
        'inserted_pets', v_inserted_pets,
        'inserted_items', v_inserted_items,
        'inserted_payments', v_inserted_payments,
        'first_invoice_number', v_first_inv_no,
        'last_invoice_number', v_last_inv_no,
        'final_invoices_count', v_final_inv_count,
        'final_customers_count', v_final_cust_count,
        'final_pets_count', v_final_pet_count,
        'final_items_count', v_final_item_count,
        'final_payments_count', v_final_pay_count,
        'next_invoice_number_rpc', v_next_rpc_no
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.execute_pdf_invoice_migration_batch() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_pdf_invoice_migration_batch() TO anon, authenticated;
