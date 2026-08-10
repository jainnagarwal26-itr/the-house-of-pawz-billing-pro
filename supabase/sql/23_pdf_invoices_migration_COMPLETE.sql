-- ============================================================
-- 23_pdf_invoices_migration_COMPLETE.sql — All 35 Invoices (33 to 67)
-- Project: The House of Pawz – Billing Pro
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
    PERFORM pg_advisory_xact_lock(hashtext('thop_pdf_migration_batch_lock'));

    -- 33
    v_inv_id := 'INV-HOP-26-27-000033';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000033') THEN
        v_cust_id := 'CUST-1032';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Tanvi Chedda', '9821877784', 'tanvi.chedda@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9821877784', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2032';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Tanvi Chedda', 'Mustang', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000033', '2026-27', '18th July, 2026', '18th July, 2026', v_cust_id, 'Tanvi Chedda', '9821877784', v_pet_id, 'Mustang', '27-Maharashtra', FALSE, 19500, 0, 19500, 1755, 1755, 0, 3510, 0, 23010, 23010, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000033', NULL, 'SERVICE'::item_type_enum, '1 month boarding charges (1st july to 31st july,2026)', '999799', 19500, 1, 0, 0, 19500, 18, 1755, 1755, 0, 23010);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000033', v_cust_id, 'Tanvi Chedda', 23010, '18th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 34
    v_inv_id := 'INV-HOP-26-27-000034';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000034') THEN
        v_cust_id := 'CUST-1033';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Manju Sahu', '9727736167', 'manju.sahu@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9727736167', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2033';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Manju Sahu', 'Felix''s and Brahma', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000034', '2026-27', '18th July, 2026', '18th July, 2026', v_cust_id, 'Manju Sahu', '9727736167', v_pet_id, 'Felix''s and Brahma', '27-Maharashtra', FALSE, 1500, 0, 1500, 135, 135, 0, 270, 0, 1770, 1770, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000034', NULL, 'SERVICE'::item_type_enum, '1 daycare with late night pick up charges (18th july)', '999799', 1500, 1, 0, 0, 1500, 18, 135, 135, 0, 1770);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000034', v_cust_id, 'Manju Sahu', 1770, '18th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 35
    v_inv_id := 'INV-HOP-26-27-000035';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000035') THEN
        v_cust_id := 'CUST-1034';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Ananya Save', '9820783332', 'ananya.save@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9820783332', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2034';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Ananya Save', 'Simba', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000035', '2026-27', '18th July, 2026', '18th July, 2026', v_cust_id, 'Ananya Save', '9820783332', v_pet_id, 'Simba', '27-Maharashtra', FALSE, 1100, 0, 1100, 99, 99, 0, 198, 0, 1298, 1298, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000035', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (11th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000035', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (18th july)', '999799', 550, 1, 0, 0, 550, 18, 49, 50, 0, 649);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000035', v_cust_id, 'Ananya Save', 649, '13th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000035', v_cust_id, 'Ananya Save', 649, '18th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 36
    v_inv_id := 'INV-HOP-26-27-000036';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000036') THEN
        v_cust_id := 'CUST-1035';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Valerian Raj Felix', '9073100971', 'valerian.raj.felix@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9073100971', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2035';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Valerian Raj Felix', 'Krypto', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000036', '2026-27', '19th July, 2026', '19th July, 2026', v_cust_id, 'Valerian Raj Felix', '9073100971', v_pet_id, 'Krypto', '27-Maharashtra', FALSE, 11050, 0, 11050, 995, 994, 0, 1989, 0, 13039, 13039, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000036', NULL, 'SERVICE'::item_type_enum, '13 nights boarding charges (6th july to 19th july, 12 noon)', '999799', 11050, 1, 0, 0, 11050, 18, 995, 994, 0, 13039);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000036', v_cust_id, 'Valerian Raj Felix', 13039, '19th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 37
    v_inv_id := 'INV-HOP-26-27-000037';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000037') THEN
        v_cust_id := 'CUST-1036';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Pampa', '9870100217', 'pampa@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9870100217', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2036';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Pampa', 'Tyson and Thea', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000037', '2026-27', '19th July, 2026', '19th July, 2026', v_cust_id, 'Pampa', '9870100217', v_pet_id, 'Tyson and Thea', '27-Maharashtra', FALSE, 6200, 0, 6200, 558, 558, 0, 1116, 0, 7316, 7316, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000037', NULL, 'SERVICE'::item_type_enum, '3 night boarding and 1 daycare charges (16th july to 19th july, evening)', '999799', 6200, 1, 0, 0, 6200, 18, 558, 558, 0, 7316);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000037', v_cust_id, 'Pampa', 7316, '19th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 38
    v_inv_id := 'INV-HOP-26-27-000038';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000038') THEN
        v_cust_id := 'CUST-1037';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Tashhi Grewal', '9819681613', 'tashhi.grewal@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9819681613', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2037';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Tashhi Grewal', 'Simba', 'Cat'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000038', '2026-27', '19th July, 2026', '19th July, 2026', v_cust_id, 'Tashhi Grewal', '9819681613', v_pet_id, 'Simba', '27-Maharashtra', FALSE, 1300, 0, 1300, 117, 117, 0, 234, 0, 1534, 1534, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000038', NULL, 'SERVICE'::item_type_enum, '2 boarding and 1 daycare charges (18th july to 20th July, till evening)', '999799', 1300, 1, 0, 0, 1300, 18, 117, 117, 0, 1534);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000038', v_cust_id, 'Tashhi Grewal', 1534, '19th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 39
    v_inv_id := 'INV-HOP-26-27-000039';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000039') THEN
        v_cust_id := 'CUST-1038';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Anupama Das', '9819811755', 'anupama.das@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9819811755', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2038';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Anupama Das', 'Greentee And Boba', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000039', '2026-27', '20th July, 2026', '20th July, 2026', v_cust_id, 'Anupama Das', '9819811755', v_pet_id, 'Greentee And Boba', '27-Maharashtra', FALSE, 11300, 0, 11300, 1017, 1017, 0, 2034, 0, 13334, 13334, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000039', NULL, 'SERVICE'::item_type_enum, '6 charges and 1 daycare for 2 pets (14th july 20th July, evening )', '999799', 11300, 1, 0, 0, 11300, 18, 1017, 1017, 0, 13334);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000039', v_cust_id, 'Anupama Das', 13334, '20th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 40
    v_inv_id := 'INV-HOP-26-27-000040';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000040') THEN
        v_cust_id := 'CUST-1039';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Pratima Rohra', '9930023495', 'pratima.rohra@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9930023495', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2039';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Pratima Rohra', 'Shadow', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000040', '2026-27', '20th July, 2026', '20th July, 2026', v_cust_id, 'Pratima Rohra', '9930023495', v_pet_id, 'Shadow', '27-Maharashtra', FALSE, 850, 0, 850, 77, 76, 0, 153, 0, 1003, 1003, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000040', NULL, 'SERVICE'::item_type_enum, '1 night boarding charges (19th july to 20th July until 12 noon)', '999799', 850, 1, 0, 0, 850, 18, 77, 76, 0, 1003);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000040', v_cust_id, 'Pratima Rohra', 1003, '20th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 41
    v_inv_id := 'INV-HOP-26-27-000041';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000041') THEN
        v_cust_id := 'CUST-1040';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Celesty Mahesh', '7796118357', 'celesty.mahesh@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '7796118357', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2040';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Celesty Mahesh', 'Lucy', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000041', '2026-27', '20th June, 2026', '20th June, 2026', v_cust_id, 'Celesty Mahesh', '7796118357', v_pet_id, 'Lucy', '27-Maharashtra', FALSE, 2250, 0, 2250, 203, 202, 0, 405, 0, 2655, 2655, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000041', NULL, 'SERVICE'::item_type_enum, '2 night boarding and 1 daycare charges (18th july to 20th julu, till evening)', '999799', 2250, 1, 0, 0, 2250, 18, 203, 202, 0, 2655);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000041', v_cust_id, 'Celesty Mahesh', 2655, '20th June, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 42
    v_inv_id := 'INV-HOP-26-27-000042';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000042') THEN
        v_cust_id := 'CUST-1041';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Rakesh Singh', '8850724529', 'rakesh.singh@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '8850724529', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2041';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Rakesh Singh', 'Dexter', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000042', '2026-27', '21st July, 2026', '21st July, 2026', v_cust_id, 'Rakesh Singh', '8850724529', v_pet_id, 'Dexter', '27-Maharashtra', FALSE, 550, 0, 550, 50, 49, 0, 99, 0, 649, 649, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000042', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (21st July)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000042', v_cust_id, 'Rakesh Singh', 649, '21st July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 43
    v_inv_id := 'INV-HOP-26-27-000043';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000043') THEN
        v_cust_id := 'CUST-1042';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Parth Pandya', '9987003663', 'parth.pandya@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9987003663', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2042';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Parth Pandya', 'Whitey', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000043', '2026-27', '22nd July, 2026', '22nd July, 2026', v_cust_id, 'Parth Pandya', '9987003663', v_pet_id, 'Whitey', '27-Maharashtra', FALSE, 34112, 0, 34112, 3070, 3070, 0, 6140, 0, 40252, 40252, 0, 'PAID'::payment_status_enum, 'Cash', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000043', NULL, 'SERVICE'::item_type_enum, '15 night boarding charges (6th july to 20th july , till 12 noon)', '999799', 12112, 1, 0, 0, 12112, 18, 1090, 1090, 0, 14292);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000043', NULL, 'SERVICE'::item_type_enum, '1 month night boarding charges (21st july to 21st aug, till 12 noon)', '999799', 22000, 1, 0, 0, 22000, 18, 1980, 1980, 0, 25960);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000043', v_cust_id, 'Parth Pandya', 14292, '6th July, 2026', 'Cash', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000043', v_cust_id, 'Parth Pandya', 25960, '22nd July, 2026', 'Cash', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 44
    v_inv_id := 'INV-HOP-26-27-000044';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000044') THEN
        v_cust_id := 'CUST-1043';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Jaikishin Chhaproo', '9582252474', 'jaikishin.chhaproo@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9582252474', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2043';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Jaikishin Chhaproo', 'Simba', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000044', '2026-27', '23rd July, 2026', '23rd July, 2026', v_cust_id, 'Jaikishin Chhaproo', '9582252474', v_pet_id, 'Simba', '27-Maharashtra', FALSE, 3100, 0, 3100, 279, 279, 0, 558, 0, 3658, 3658, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000044', NULL, 'SERVICE'::item_type_enum, '3 night boarding and 1 daycare (20th july to 23rd july till evening)', '999799', 3100, 1, 0, 0, 3100, 18, 279, 279, 0, 3658);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000044', v_cust_id, 'Jaikishin Chhaproo', 3658, '23rd July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 45
    v_inv_id := 'INV-HOP-26-27-000045';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000045') THEN
        v_cust_id := 'CUST-1044';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Anshuman Roy', '8104795267', 'anshuman.roy@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '8104795267', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2044';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Anshuman Roy', 'Dali', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000045', '2026-27', '23rd July, 2026', '23rd July, 2026', v_cust_id, 'Anshuman Roy', '8104795267', v_pet_id, 'Dali', '27-Maharashtra', FALSE, 5100, 0, 5100, 459, 459, 0, 918, 0, 6018, 6018, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000045', NULL, 'SERVICE'::item_type_enum, '2 night boarding charges (22nd june to 24th june, 12 noon)', '999799', 1700, 1, 0, 0, 1700, 18, 153, 153, 0, 2006);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000045', NULL, 'SERVICE'::item_type_enum, '2 night boarding charges (9th july to 11th july, 12 noon)', '999799', 1700, 1, 0, 0, 1700, 18, 153, 153, 0, 2006);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000045', NULL, 'SERVICE'::item_type_enum, '2 night boarding charges (20th july to 22nd july, 12 noon)', '999799', 1700, 1, 0, 0, 1700, 18, 153, 153, 0, 2006);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000045', v_cust_id, 'Anshuman Roy', 2006, '9th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000045', v_cust_id, 'Anshuman Roy', 2006, '11th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000045', v_cust_id, 'Anshuman Roy', 2006, '23rd July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 46
    v_inv_id := 'INV-HOP-26-27-000046';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000046') THEN
        v_cust_id := 'CUST-1045';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Shilpi Soni', '9004077939', 'shilpi.soni@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9004077939', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2045';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Shilpi Soni', 'Gomu', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000046', '2026-27', '24th July, 2026', '24th July, 2026', v_cust_id, 'Shilpi Soni', '9004077939', v_pet_id, 'Gomu', '27-Maharashtra', FALSE, 850, 0, 850, 77, 76, 0, 153, 0, 1003, 1003, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000046', NULL, 'SERVICE'::item_type_enum, '1 night boarding charges (23rd july to 24th july till 12 noon', '999799', 850, 1, 0, 0, 850, 18, 77, 76, 0, 1003);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000046', v_cust_id, 'Shilpi Soni', 1003, '24th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 47
    v_inv_id := 'INV-HOP-26-27-000047';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000047') THEN
        v_cust_id := 'CUST-1046';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Arav Vijh', '9933024446', 'arav.vijh@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9933024446', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2046';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Arav Vijh', 'Josie', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000047', '2026-27', '24th July, 2026', '24th July, 2026', v_cust_id, 'Arav Vijh', '9933024446', v_pet_id, 'Josie', '27-Maharashtra', FALSE, 3950, 0, 3950, 356, 355, 0, 711, 0, 4661, 4661, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000047', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (13th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000047', NULL, 'SERVICE'::item_type_enum, '4 night boarding (25th july to 29th julu till 12 noon)', '999799', 3400, 1, 0, 0, 3400, 18, 306, 306, 0, 4012);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000047', v_cust_id, 'Arav Vijh', 649, '13th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000047', v_cust_id, 'Arav Vijh', 4012, '24th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 48
    v_inv_id := 'INV-HOP-26-27-000048';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000048') THEN
        v_cust_id := 'CUST-1047';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Diksha Dwivedi', '9871622380', 'diksha.dwivedi@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9871622380', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2047';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Diksha Dwivedi', 'Miss Pinto', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000048', '2026-27', '24th July, 2026', '24th July, 2026', v_cust_id, 'Diksha Dwivedi', '9871622380', v_pet_id, 'Miss Pinto', '27-Maharashtra', FALSE, 2050, 0, 2050, 185, 184, 0, 369, 0, 2419, 2419, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000048', NULL, 'SERVICE'::item_type_enum, '1 daycare with late night charges (5th july)', '999799', 750, 1, 0, 0, 750, 18, 68, 67, 0, 885);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000048', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (8th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000048', NULL, 'SERVICE'::item_type_enum, '1 daycare with late night charges (9th july)', '999799', 750, 1, 0, 0, 750, 18, 67, 68, 0, 885);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000048', v_cust_id, 'Diksha Dwivedi', 885, '5th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000048', v_cust_id, 'Diksha Dwivedi', 649, '8th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000048', v_cust_id, 'Diksha Dwivedi', 885, '24th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 49 (PARTIAL)
    v_inv_id := 'INV-HOP-26-27-000049';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000049') THEN
        v_cust_id := 'CUST-1048';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Pooja Manian', '9975045126', 'pooja.manian@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9975045126', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2048';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Pooja Manian', 'Yoda', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000049', '2026-27', '25th July, 2026', '25th July, 2026', v_cust_id, 'Pooja Manian', '9975045126', v_pet_id, 'Yoda', '27-Maharashtra', FALSE, 10950, 0, 10950, 986, 985, 0, 1971, 0, 12921, 11269, 1652, 'PARTIAL'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000049', NULL, 'SERVICE'::item_type_enum, '1 night boarding and 1 daycare charges (4th july to 5th july till evening)', '999799', 1400, 1, 0, 0, 1400, 18, 126, 126, 0, 1652);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000049', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (7th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000049', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (7th july)', '999799', 550, 1, 0, 0, 550, 18, 49, 50, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-4', v_inv_id, 'HOP/26-27/000049', NULL, 'SERVICE'::item_type_enum, '2 daycare charges (13th july and 14th july)', '999799', 1400, 1, 0, 0, 1400, 18, 126, 126, 0, 1652);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-5', v_inv_id, 'HOP/26-27/000049', NULL, 'SERVICE'::item_type_enum, '5 night boarding and 1 daycare charges (16th july to 21st july till 12 noon)', '999799', 4800, 1, 0, 0, 4800, 18, 432, 432, 0, 5664);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-6', v_inv_id, 'HOP/26-27/000049', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (22nd july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-7', v_inv_id, 'HOP/26-27/000049', NULL, 'SERVICE'::item_type_enum, '2 night boarding charges (23rd july to 25th july, 12 noon', '999799', 1700, 1, 0, 0, 1700, 18, 153, 153, 0, 2006);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000049', v_cust_id, 'Pooja Manian', 1700, '16th July, 2026', 'Cash', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000049', v_cust_id, 'Pooja Manian', 601, '7th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000049', v_cust_id, 'Pooja Manian', 1298, '14th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-4', v_inv_id, 'HOP/26-27/000049', v_cust_id, 'Pooja Manian', 5664, '21st July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-5', v_inv_id, 'HOP/26-27/000049', v_cust_id, 'Pooja Manian', 2006, '25th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 50
    v_inv_id := 'INV-HOP-26-27-000050';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000050') THEN
        v_cust_id := 'CUST-1049';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Shardul Kekar', '9769867430', 'shardul.kekar@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9769867430', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2049';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Shardul Kekar', 'Piku', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000050', '2026-27', '25th July, 2026', '25th July, 2026', v_cust_id, 'Shardul Kekar', '9769867430', v_pet_id, 'Piku', '27-Maharashtra', FALSE, 850, 0, 850, 77, 76, 0, 153, 0, 1003, 1003, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000050', NULL, 'SERVICE'::item_type_enum, '1 night boarding charges (25th july to 26th july, 12 noon)', '999799', 850, 1, 0, 0, 850, 18, 77, 76, 0, 1003);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000050', v_cust_id, 'Shardul Kekar', 1003, '25th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 51
    v_inv_id := 'INV-HOP-26-27-000051';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000051') THEN
        v_cust_id := 'CUST-1050';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Panchami Nayak', '9920431193', 'panchami.nayak@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9920431193', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2050';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Panchami Nayak', 'Luna and Kaaapi', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000051', '2026-27', '26th July, 2026', '26th July, 2026', v_cust_id, 'Panchami Nayak', '9920431193', v_pet_id, 'Luna and Kaaapi', '27-Maharashtra', FALSE, 11300, 0, 11300, 1017, 1017, 0, 2034, 0, 13334, 13334, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000051', NULL, 'SERVICE'::item_type_enum, '6 night boarding and 1 daycare charges (20th july to 26th july, till evening)', '999799', 11300, 1, 0, 0, 11300, 18, 1017, 1017, 0, 13334);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000051', v_cust_id, 'Panchami Nayak', 13334, '26th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 52
    v_inv_id := 'INV-HOP-26-27-000052';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000052') THEN
        v_cust_id := 'CUST-1051';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Mausumi', '9820096054', 'mausumi@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9820096054', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2051';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Mausumi', 'Jinny', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000052', '2026-27', '26th July, 2026', '26th July, 2026', v_cust_id, 'Mausumi', '9820096054', v_pet_id, 'Jinny', '27-Maharashtra', FALSE, 1950, 0, 1950, 176, 175, 0, 351, 0, 2301, 2301, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000052', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (19th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000052', NULL, 'SERVICE'::item_type_enum, '1 night and 1 daycare charges (25th july to 26th july)', '999799', 1400, 1, 0, 0, 1400, 18, 126, 126, 0, 1652);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000052', v_cust_id, 'Mausumi', 649, '19th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000052', v_cust_id, 'Mausumi', 1652, '26th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 53
    v_inv_id := 'INV-HOP-26-27-000053';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000053') THEN
        v_cust_id := 'CUST-1052';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Amit Shetty', '9820700009', 'amit.shetty@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9820700009', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2052';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Amit Shetty', 'Simba', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000053', '2026-27', '26th July, 2026', '26th July, 2026', v_cust_id, 'Amit Shetty', '9820700009', v_pet_id, 'Simba', '27-Maharashtra', FALSE, 1700, 0, 1700, 153, 153, 0, 306, 0, 2006, 2006, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000053', NULL, 'SERVICE'::item_type_enum, '2 night boarding (24th july to 26th july, 12noon)', '999799', 1700, 1, 0, 0, 1700, 18, 153, 153, 0, 2006);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000053', v_cust_id, 'Amit Shetty', 2006, '26th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 54
    v_inv_id := 'INV-HOP-26-27-000054';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000054') THEN
        v_cust_id := 'CUST-1053';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Subho basu', '9051515550', 'subho.basu@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9051515550', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2053';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Subho basu', 'Honey', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000054', '2026-27', '27th July, 2026', '27th July, 2026', v_cust_id, 'Subho basu', '9051515550', v_pet_id, 'Honey', '27-Maharashtra', FALSE, 5350, 0, 5350, 482, 481, 0, 963, 0, 6313, 8635, 0, 'PAID'::payment_status_enum, 'Online', 'Additional Charges Total: ₹2322 (Travelling: ₹122, Food: ₹2200)', 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000054', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (16th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000054', NULL, 'SERVICE'::item_type_enum, '5 night and 1 daycare charges (22nd july to 27th july)', '999799', 4800, 1, 0, 0, 4800, 18, 432, 432, 0, 5664);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000054', v_cust_id, 'Subho basu', 649, '16th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000054', v_cust_id, 'Subho basu', 122, '16th July, 2026', 'Online', 'Travelling Cost', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000054', v_cust_id, 'Subho basu', 5664, '27th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-4', v_inv_id, 'HOP/26-27/000054', v_cust_id, 'Subho basu', 2200, '27th July, 2026', 'Online', 'Food Cost', 'Chirag Jain');
    END IF;

    -- 55
    v_inv_id := 'INV-HOP-26-27-000055';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000055') THEN
        v_cust_id := 'CUST-1054';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Deepti Unni', '9821281631', 'deepti.unni@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9821281631', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2054';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Deepti Unni', 'Miso', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000055', '2026-27', '27th July, 2026', '27th July, 2026', v_cust_id, 'Deepti Unni', '9821281631', v_pet_id, 'Miso', '27-Maharashtra', FALSE, 1700, 0, 1700, 153, 153, 0, 306, 0, 2006, 2006, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000055', NULL, 'SERVICE'::item_type_enum, '2 night boarding (25th july to 27th july, 12 noon)', '999799', 1700, 1, 0, 0, 1700, 18, 153, 153, 0, 2006);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000055', v_cust_id, 'Deepti Unni', 2006, '27th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 56
    v_inv_id := 'INV-HOP-26-27-000056';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000056') THEN
        v_cust_id := 'CUST-1055';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Hirdeya Goyal', '8080339037', 'hirdeya.goyal@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '8080339037', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2055';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Hirdeya Goyal', 'Brownie', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000056', '2026-27', '27th July, 2026', '27th July, 2026', v_cust_id, 'Hirdeya Goyal', '8080339037', v_pet_id, 'Brownie', '27-Maharashtra', FALSE, 19500, 0, 19500, 1755, 1755, 0, 3510, 0, 23010, 23010, 0, 'PAID'::payment_status_enum, 'Cash', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000056', NULL, 'SERVICE'::item_type_enum, '1 month boarding charges (19th july to 19th aug, till 12 noon )', '999799', 19500, 1, 0, 0, 19500, 18, 1755, 1755, 0, 23010);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000056', v_cust_id, 'Hirdeya Goyal', 23010, '27th July, 2026', 'Cash', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 57
    v_inv_id := 'INV-HOP-26-27-000057';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000057') THEN
        v_cust_id := 'CUST-1056';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Saloni Patel', '9820199926', 'saloni.patel@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9820199926', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2056';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Saloni Patel', 'Sansa', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000057', '2026-27', '27th July, 2026', '27th July, 2026', v_cust_id, 'Saloni Patel', '9820199926', v_pet_id, 'Sansa', '27-Maharashtra', FALSE, 9600, 0, 9600, 864, 864, 0, 1728, 0, 11328, 11328, 0, 'PAID'::payment_status_enum, 'Cash', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000057', NULL, 'SERVICE'::item_type_enum, '2 night boarding charges( 12th july to 14th july evening)', '999799', 2250, 1, 0, 0, 2250, 18, 203, 202, 0, 2655);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000057', NULL, 'SERVICE'::item_type_enum, '1 night boarding and 1 daycare (9th July to 10th July evening)', '999799', 1400, 1, 0, 0, 1400, 18, 126, 126, 0, 1652);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000057', NULL, 'SERVICE'::item_type_enum, '4 night boarding charges (13th July to 17th July evenings)', '999799', 3400, 1, 0, 0, 3400, 18, 306, 306, 0, 4012);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-4', v_inv_id, 'HOP/26-27/000057', NULL, 'SERVICE'::item_type_enum, '3 night boarding charges (21st July to 24th July until 12 noon)', '999799', 2550, 1, 0, 0, 2550, 18, 229, 230, 0, 3009);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000057', v_cust_id, 'Saloni Patel', 11328, '27th July, 2026', 'Cash', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 58 (Avesh Dadloni — Louis) [Advance Credit ₹246]
    v_inv_id := 'INV-HOP-26-27-000058';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000058') THEN
        v_cust_id := 'CUST-1057';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Avesh Dadloni', '9321633999', 'avesh.dadloni@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9321633999', 0, 246.00) ON CONFLICT (customer_id) DO UPDATE SET advance_balance = 246.00;
        v_pet_id := 'PET-2057';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Avesh Dadloni', 'Louis', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000058', '2026-27', '27th July, 2026', '27th July, 2026', v_cust_id, 'Avesh Dadloni', '9321633999', v_pet_id, 'Louis', '27-Maharashtra', FALSE, 5300, 0, 5300, 477, 477, 0, 954, 0, 6254, 6500, 0, 'PAID'::payment_status_enum, 'Cash', 'Customer Advance Credit: ₹246.00', 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000058', NULL, 'SERVICE'::item_type_enum, '1 night and 1 daycare charges (4th july to 5th july)', '999799', 1400, 1, 0, 0, 1400, 18, 126, 126, 0, 1652);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000058', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (7th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000058', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (10th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-4', v_inv_id, 'HOP/26-27/000058', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (12th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-5', v_inv_id, 'HOP/26-27/000058', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (19th july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-6', v_inv_id, 'HOP/26-27/000058', NULL, 'SERVICE'::item_type_enum, '2 night boarding charges (25th july to 27th july till 12 noon)', '999799', 1700, 1, 0, 0, 1700, 18, 153, 153, 0, 2006);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000058', v_cust_id, 'Avesh Dadloni', 4500, '16th July, 2026', 'Cash', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000058', v_cust_id, 'Avesh Dadloni', 2000, '16th July, 2026', 'Cash', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 59
    v_inv_id := 'INV-HOP-26-27-000059';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000059') THEN
        v_cust_id := 'CUST-1058';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Kanchan Marathe', '9820518989', 'kanchan.marathe@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9820518989', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2058';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Kanchan Marathe', 'Hobbes', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000059', '2026-27', '27th July, 2026', '27th July, 2026', v_cust_id, 'Kanchan Marathe', '9820518989', v_pet_id, 'Hobbes', '27-Maharashtra', FALSE, 4250, 0, 4250, 383, 382, 0, 765, 0, 5015, 5015, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000059', NULL, 'SERVICE'::item_type_enum, '3 night boarding charges (10th july to 13th july, 12 noon)', '999799', 2550, 1, 0, 0, 2550, 18, 229, 230, 0, 3009);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000059', NULL, 'SERVICE'::item_type_enum, '2 night boarding charges (24th july to 26th july 12 noon)', '999799', 1700, 1, 0, 0, 1700, 18, 153, 153, 0, 2006);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000059', v_cust_id, 'Kanchan Marathe', 3009, '13th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000059', v_cust_id, 'Kanchan Marathe', 2006, '26th July, 2026', 'Cash', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 60
    v_inv_id := 'INV-HOP-26-27-000060';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000060') THEN
        v_cust_id := 'CUST-1059';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Amey Nadkarni', '9820501869', 'amey.nadkarni@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9820501869', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2059';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Amey Nadkarni', 'Honey', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000060', '2026-27', '29th July, 2026', '29th July, 2026', v_cust_id, 'Amey Nadkarni', '9820501869', v_pet_id, 'Honey', '27-Maharashtra', FALSE, 3850, 0, 3850, 347, 346, 0, 693, 0, 4543, 4543, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000060', NULL, 'SERVICE'::item_type_enum, '7 daycare charges (2nd july, 7th july, 9th july, 14th july, 27th july, 29th july)', '999799', 3850, 1, 0, 0, 3850, 18, 347, 346, 0, 4543);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000060', v_cust_id, 'Amey Nadkarni', 649, '2nd July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000060', v_cust_id, 'Amey Nadkarni', 649, '7th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000060', v_cust_id, 'Amey Nadkarni', 649, '9th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-4', v_inv_id, 'HOP/26-27/000060', v_cust_id, 'Amey Nadkarni', 649, '14th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-5', v_inv_id, 'HOP/26-27/000060', v_cust_id, 'Amey Nadkarni', 649, '27th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-6', v_inv_id, 'HOP/26-27/000060', v_cust_id, 'Amey Nadkarni', 649, '29th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 61
    v_inv_id := 'INV-HOP-26-27-000061';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000061') THEN
        v_cust_id := 'CUST-1060';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Maya Menon', '9820403531', 'maya.menon@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9820403531', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2060';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Maya Menon', 'Moh', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000061', '2026-27', '29th July, 2026', '29th July, 2026', v_cust_id, 'Maya Menon', '9820403531', v_pet_id, 'Moh', '27-Maharashtra', FALSE, 3400, 0, 3400, 306, 306, 0, 612, 0, 4012, 4012, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000061', NULL, 'SERVICE'::item_type_enum, '4 night boarding charges (25th july to 29th july, 12 noon)', '999799', 3400, 1, 0, 0, 3400, 18, 306, 306, 0, 4012);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000061', v_cust_id, 'Maya Menon', 4012, '29th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 62
    v_inv_id := 'INV-HOP-26-27-000062';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000062') THEN
        v_cust_id := 'CUST-1061';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Ambika Chauhan', '9820066538', 'ambika.chauhan@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9820066538', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2061';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Ambika Chauhan', 'Rocket', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000062', '2026-27', '30th July, 2026', '30th July, 2026', v_cust_id, 'Ambika Chauhan', '9820066538', v_pet_id, 'Rocket', '27-Maharashtra', FALSE, 8500, 0, 8500, 765, 765, 0, 1530, 0, 10030, 10030, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000062', NULL, 'SERVICE'::item_type_enum, '10 night boarding charges (19th july to 30th july , till 12 noon)', '999799', 8500, 1, 0, 0, 8500, 18, 765, 765, 0, 10030);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000062', v_cust_id, 'Ambika Chauhan', 10030, '30th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 63
    v_inv_id := 'INV-HOP-26-27-000063';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000063') THEN
        v_cust_id := 'CUST-1062';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Subhadeep Bhattacharjee', '9123312806', 'subhadeep.b@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9123312806', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2062';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Subhadeep Bhattacharjee', 'Rocket', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000063', '2026-27', '30th July, 2026', '30th July, 2026', v_cust_id, 'Subhadeep Bhattacharjee', '9123312806', v_pet_id, 'Rocket', '27-Maharashtra', FALSE, 18950, 0, 18950, 1706, 1705, 0, 3411, 0, 22361, 22361, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000063', NULL, 'SERVICE'::item_type_enum, '21 night boarding and 2 charges (9th july to 30th july)', '999799', 18950, 1, 0, 0, 18950, 18, 1706, 1705, 0, 22361);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000063', v_cust_id, 'Subhadeep Bhattacharjee', 9027, '9th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000063', v_cust_id, 'Subhadeep Bhattacharjee', 3658, '20th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000063', v_cust_id, 'Subhadeep Bhattacharjee', 9676, '30th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 64
    v_inv_id := 'INV-HOP-26-27-000064';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000064') THEN
        v_cust_id := 'CUST-1063';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Karan Pradhan', '9820702747', 'karan.pradhan@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9820702747', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2063';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Karan Pradhan', 'Blu', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000064', '2026-27', '31st July, 2026', '31st July, 2026', v_cust_id, 'Karan Pradhan', '9820702747', v_pet_id, 'Blu', '27-Maharashtra', FALSE, 2550, 0, 2550, 229, 230, 0, 459, 0, 3009, 3009, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000064', NULL, 'SERVICE'::item_type_enum, '3 night boarding charges (31st july to 3rd aug, 12 noon)', '999799', 2550, 1, 0, 0, 2550, 18, 229, 230, 0, 3009);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000064', v_cust_id, 'Karan Pradhan', 3009, '31st July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 65
    v_inv_id := 'INV-HOP-26-27-000065';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000065') THEN
        v_cust_id := 'CUST-1064';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Sachin Jadhav', '8169974084', 'sachin.jadhav@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '8169974084', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2064';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Sachin Jadhav', 'Rey', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000065', '2026-27', '31st July, 2026', '31st July, 2026', v_cust_id, 'Sachin Jadhav', '8169974084', v_pet_id, 'Rey', '27-Maharashtra', FALSE, 9900, 0, 9900, 891, 891, 0, 1782, 0, 11682, 11682, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000065', NULL, 'SERVICE'::item_type_enum, '7 night boarding and 1 daycare charges (3rd july to 10th july, evening)', '999799', 6500, 1, 0, 0, 6500, 18, 585, 585, 0, 7670);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000065', NULL, 'SERVICE'::item_type_enum, '4 night boarding charges (31st july to 4th aug till 12 noon)', '999799', 3400, 1, 0, 0, 3400, 18, 306, 306, 0, 4012);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000065', v_cust_id, 'Sachin Jadhav', 7670, '3rd July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000065', v_cust_id, 'Sachin Jadhav', 4012, '31st July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 66 (PARTIAL)
    v_inv_id := 'INV-HOP-26-27-000066';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000066') THEN
        v_cust_id := 'CUST-1065';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Ananya', '9739357477', 'ananya@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '9739357477', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2065';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Ananya', 'Bambam', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000066', '2026-27', '31st July, 2026', '31st July, 2026', v_cust_id, 'Ananya', '9739357477', v_pet_id, 'Bambam', '27-Maharashtra', FALSE, 6200, 0, 6200, 558, 558, 0, 1116, 0, 7316, 6667, 649, 'PARTIAL'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000066', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (3rd july)', '999799', 550, 1, 0, 0, 550, 18, 50, 49, 0, 649);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000066', NULL, 'SERVICE'::item_type_enum, '6 night boarding charges (14th july to 20th july, 12 noon)', '999799', 5100, 1, 0, 0, 5100, 18, 459, 459, 0, 6018);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000066', NULL, 'SERVICE'::item_type_enum, '1 daycare charges (31st july)', '999799', 550, 1, 0, 0, 550, 18, 49, 50, 0, 649);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000066', v_cust_id, 'Ananya', 6667, '20th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- 67
    v_inv_id := 'INV-HOP-26-27-000067';
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'HOP/26-27/000067') THEN
        v_cust_id := 'CUST-1066';
        INSERT INTO public.customers (customer_id, full_name, phone, email, address, state_code, emergency_contact, outstanding_balance, advance_balance) VALUES (v_cust_id, 'Payal Shetye', '7709981040', 'payal.shetye@example.com', 'Mumbai, Maharashtra', '27-Maharashtra', '7709981040', 0, 0) ON CONFLICT (customer_id) DO NOTHING;
        v_pet_id := 'PET-2066';
        INSERT INTO public.pets (pet_id, customer_id, customer_name, pet_name, species, breed, age, gender, vaccination_status, is_boarding_now) VALUES (v_pet_id, v_cust_id, 'Payal Shetye', 'Zuri', 'Dog'::pet_species_enum, 'Standard', '2 Years', 'Male', 'Up to Date', FALSE) ON CONFLICT (pet_id) DO NOTHING;
        INSERT INTO public.invoices (internal_invoice_id, invoice_number, financial_year, invoice_date, due_date, customer_id, customer_name, customer_phone, pet_id, pet_name, place_of_supply, is_inter_state, sub_total, total_discount, taxable_amount, cgst_total, sgst_total, igst_total, total_gst, round_off, grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, created_by_role, created_by_name, is_cancelled) VALUES (v_inv_id, 'HOP/26-27/000067', '2026-27', '31st July, 2026', '31st July, 2026', v_cust_id, 'Payal Shetye', '7709981040', v_pet_id, 'Zuri', '27-Maharashtra', FALSE, 3900, 0, 3900, 351, 351, 0, 702, 0, 4602, 4602, 0, 'PAID'::payment_status_enum, 'Online', NULL, 'ADMIN', 'Chirag Jain', FALSE);
        v_inserted_invoices := v_inserted_invoices + 1;
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000067', NULL, 'SERVICE'::item_type_enum, '3 daycare charges (13th jul, 18th jul, 27th jul)', '999799', 1650, 1, 0, 0, 1650, 18, 149, 148, 0, 1947);
        INSERT INTO public.invoice_items (line_item_id, internal_invoice_id, invoice_number, catalog_item_id, item_type, item_name, hsn_sac, price, quantity, discount_percent, discount_amount, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, item_total) VALUES ('ITEM-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000067', NULL, 'SERVICE'::item_type_enum, '2 night and 1 daycare charges (31st july to 2nd aug till evening)', '999799', 2250, 1, 0, 0, 2250, 18, 202, 203, 0, 2655);
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-1', v_inv_id, 'HOP/26-27/000067', v_cust_id, 'Payal Shetye', 649, '13th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-2', v_inv_id, 'HOP/26-27/000067', v_cust_id, 'Payal Shetye', 649, '18th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-3', v_inv_id, 'HOP/26-27/000067', v_cust_id, 'Payal Shetye', 649, '27th July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
        INSERT INTO public.payments (payment_id, internal_invoice_id, invoice_number, customer_id, customer_name, amount, payment_date, payment_mode, transaction_ref, received_by) VALUES ('PAY-' || v_inv_id || '-4', v_inv_id, 'HOP/26-27/000067', v_cust_id, 'Payal Shetye', 2655, '31st July, 2026', 'Online', 'Source PDF Import', 'Chirag Jain');
    END IF;

    -- READ STATS
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
        'final_invoices_count', v_final_inv_count,
        'final_customers_count', v_final_cust_count,
        'final_pets_count', v_final_pet_count,
        'final_items_count', v_final_item_count,
        'final_payments_count', v_final_pay_count,
        'first_invoice_number', v_first_inv_no,
        'last_invoice_number', v_last_inv_no,
        'next_invoice_number_rpc', v_next_rpc_no
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.execute_pdf_invoice_migration_batch() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_pdf_invoice_migration_batch() TO anon, authenticated;

-- EXECUTE NOW
SELECT public.execute_pdf_invoice_migration_batch();
