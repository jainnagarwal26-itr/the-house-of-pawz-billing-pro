// ============================================================
// invoiceService.ts — Invoice & Line Items Supabase Service
// Project: The House of Pawz – Billing Pro
// ============================================================

import { supabase } from './supabase';
import { Invoice, InvoiceItem } from '../types';

/**
 * Fetches the next invoice number from the Supabase sequence RPC.
 *
 * FAIL-CLOSED POLICY:
 * If the RPC fails, times out, or returns an invalid value, this function
 * throws an error. The caller MUST handle this error by showing a user-facing
 * message and NOT creating an invoice.
 *
 * NEVER use MAX+1, Date.now(), or hardcoded numbers as fallbacks.
 * The database RPC is the ONLY authority for invoice numbering.
 */
export async function fetchNextInvoiceNumberFromDB(financialYear: string = '26-27'): Promise<string> {
  const { data, error } = await supabase.rpc('generate_next_invoice_number' as any, { fy_input: financialYear });

  if (error) {
    throw new Error(
      `Unable to generate a secure invoice number from the database. Please try again. (DB error: ${error.message})`
    );
  }

  if (!data || typeof data !== 'string' || !data.startsWith('HOP/')) {
    throw new Error(
      `Unable to generate a secure invoice number from the database. Please try again. (Unexpected RPC response: ${JSON.stringify(data)})`
    );
  }

  return data as string;
}


import { STORAGE_KEYS, loadStoredData } from './storage';

// Helper: extract numeric suffix from invoice_number e.g. 'HOP/26-27/000067' → 67
function invoiceNumericSuffix(invNum: string): number {
  if (!invNum) return 0;
  const parts = invNum.split('/');
  return parseInt(parts[parts.length - 1], 10) || 0;
}

export async function fetchInvoicesFromSupabase(): Promise<Invoice[]> {
  try {
    let invs: any[] | null = null;
    const { data: rpcInvs } = await supabase.rpc('get_all_invoices' as any);
    if (rpcInvs && rpcInvs.length > 0) {
      invs = rpcInvs;
    } else {
      const { data: selectInvs } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_number', { ascending: false });
      invs = selectInvs;
    }

    if (!invs || invs.length === 0) {
      console.warn('Supabase returned 0 invoices (or RLS restricted). Falling back to cached invoices.');
      return loadStoredData<Invoice[]>(STORAGE_KEYS.INVOICES, []);
    }

    const { data: items } = await supabase
      .from('invoice_items')
      .select('*');

    const itemMap = new Map<string, InvoiceItem[]>();
    if (items) {
      (items as any[]).forEach(it => {
        const list = itemMap.get(it.internal_invoice_id) || [];
        list.push({
          id: it.line_item_id,
          catalogItemId: it.catalog_item_id || '',
          type: (it.item_type as any) || 'SERVICE',
          name: it.item_name,
          hsnSac: it.hsn_sac || '999799',
          price: Number(it.price) || 0,
          qty: Number(it.quantity) || 1,
          discount: Number(it.discount_percent) || 0,
          discountAmount: Number(it.discount_amount) || 0,
          taxableValue: Number(it.taxable_value) || 0,
          gstRate: Number(it.gst_rate) || 18,
          cgstRate: Number(it.gst_rate) ? Number(it.gst_rate) / 2 : 9,
          cgstAmount: Number(it.cgst_amount) || 0,
          sgstRate: Number(it.gst_rate) ? Number(it.gst_rate) / 2 : 9,
          sgstAmount: Number(it.sgst_amount) || 0,
          igstRate: Number(it.gst_rate) || 18,
          igstAmount: Number(it.igst_amount) || 0,
          total: Number(it.item_total) || 0
        });
        itemMap.set(it.internal_invoice_id, list);
      });
    }

    const mapped: Invoice[] = (invs as any[]).map(i => ({
      id: i.internal_invoice_id,
      invoiceNumber: i.invoice_number,
      invoiceDate: i.invoice_date,
      dueDate: i.due_date || i.invoice_date,
      customerId: i.customer_id,
      customerName: i.customer_name,
      customerPhone: i.customer_phone || '',
      customerEmail: i.customer_email || '',
      customerAddress: '',
      customerGSTIN: i.customer_gstin || '',
      petId: i.pet_id || '',
      petName: i.pet_name || '',
      placeOfSupply: i.place_of_supply || '27-Maharashtra',
      isInterState: Boolean(i.is_inter_state),
      items: itemMap.get(i.internal_invoice_id) || [],
      subTotal: Number(i.sub_total) || 0,
      totalDiscount: Number(i.total_discount) || 0,
      taxableAmount: Number(i.taxable_amount) || 0,
      cgstTotal: Number(i.cgst_total) || 0,
      sgstTotal: Number(i.sgst_total) || 0,
      igstTotal: Number(i.igst_total) || 0,
      totalGst: Number(i.total_gst) || 0,
      roundOff: Number(i.round_off) || 0,
      grandTotal: Number(i.grand_total) || 0,
      paidAmount: Number(i.paid_amount) || 0,
      balanceDue: Number(i.balance_due) || 0,
      paymentStatus: (i.payment_status as any) || 'UNPAID',
      paymentMode: (i.payment_mode as any) || 'UPI',
      notes: i.notes || '',
      createdByRole: (i.created_by_role as any) || 'ADMIN',
      createdByName: i.created_by_name || 'Chirag Jain',
      createdAt: i.created_at,
      isCancelled: Boolean(i.is_cancelled),
      cancelledReason: i.cancelled_reason || ''
    }));

    // Sort descending by numeric invoice number (newest first)
    mapped.sort((a, b) => invoiceNumericSuffix(b.invoiceNumber) - invoiceNumericSuffix(a.invoiceNumber));

    return mapped;
  } catch (err) {
    console.error('Error in fetchInvoicesFromSupabase:', err);
    return [];
  }
}

export async function createInvoiceInSupabase(inv: Omit<Invoice, 'id' | 'createdAt'> & { id?: string }): Promise<{ invoice: Invoice | null; error?: string }> {
  try {
    const internalId = inv.id || `INV-${Date.now()}`;
    const invoicePayload = {
      internal_invoice_id: internalId,
      invoice_number: inv.invoiceNumber,
      financial_year: '2026-27',
      invoice_date: inv.invoiceDate,
      due_date: inv.dueDate || null,
      customer_id: inv.customerId,
      customer_name: inv.customerName,
      customer_phone: inv.customerPhone || null,
      customer_email: inv.customerEmail || null,
      customer_gstin: inv.customerGSTIN || null,
      pet_id: inv.petId || null,
      pet_name: inv.petName || null,
      place_of_supply: inv.placeOfSupply || '27-Maharashtra',
      is_inter_state: inv.isInterState || false,
      sub_total: inv.subTotal,
      total_discount: inv.totalDiscount || 0,
      taxable_amount: inv.taxableAmount,
      cgst_total: inv.cgstTotal || 0,
      sgst_total: inv.sgstTotal || 0,
      igst_total: inv.igstTotal || 0,
      total_gst: inv.totalGst,
      round_off: inv.roundOff || 0,
      grand_total: inv.grandTotal,
      paid_amount: inv.paidAmount || 0,
      balance_due: inv.balanceDue || 0,
      payment_status: inv.paymentStatus || 'UNPAID',
      payment_mode: inv.paymentMode || 'UPI',
      notes: inv.notes || null,
      created_by_role: inv.createdByRole || 'ADMIN',
      created_by_name: inv.createdByName || 'Chirag Jain',
      is_cancelled: inv.isCancelled || false
    };

    const { data: createdInv, error: invErr } = await supabase
      .from('invoices')
      .insert(invoicePayload as any)
      .select()
      .single();

    if (invErr || !createdInv) {
      return { invoice: null, error: invErr?.message || 'Failed to create invoice' };
    }

    const cInv = createdInv as any;

    if (inv.items && inv.items.length > 0) {
      const itemsPayload = inv.items.map((item, idx) => ({
        line_item_id: item.id || `ITEM-${internalId}-${idx + 1}`,
        internal_invoice_id: internalId,
        invoice_number: inv.invoiceNumber,
        catalog_item_id: item.catalogItemId || null,
        item_type: item.type || 'SERVICE',
        item_name: item.name,
        hsn_sac: item.hsnSac || '999799',
        price: item.price,
        quantity: item.qty,
        discount_percent: item.discount || 0,
        discount_amount: item.discountAmount || 0,
        taxable_value: item.taxableValue,
        gst_rate: item.gstRate || 18,
        cgst_amount: item.cgstAmount || 0,
        sgst_amount: item.sgstAmount || 0,
        igst_amount: item.igstAmount || 0,
        item_total: item.total
      }));

      const { error: itemsErr } = await supabase
        .from('invoice_items')
        .insert(itemsPayload as any);

      if (itemsErr) {
        console.error('Error inserting line items:', itemsErr);
      }
    }

    const created: Invoice = {
      ...inv,
      id: cInv.internal_invoice_id,
      createdAt: cInv.created_at
    };

    return { invoice: created };
  } catch (err: any) {
    return { invoice: null, error: err.message };
  }
}

export async function cancelInvoiceInSupabase(internalId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({
        is_cancelled: true,
        cancelled_reason: reason,
        payment_status: 'CANCELLED'
      } as any)
      .eq('internal_invoice_id', internalId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteInvoiceFromSupabase(internalId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.from('invoice_items').delete().eq('internal_invoice_id', internalId);
    const { error } = await supabase.from('invoices').delete().eq('internal_invoice_id', internalId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
