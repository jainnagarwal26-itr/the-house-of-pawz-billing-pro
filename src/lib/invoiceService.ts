// ============================================================
// invoiceService.ts — Invoice & Line Items Supabase Service
// Project: The House of Pawz – Billing Pro
// ============================================================

import { supabase } from './supabase';
import { Invoice, InvoiceItem } from '../types';
import { 
  fetchInvoicesFromMySQL, 
  createInvoiceInMySQL, 
  updateInvoiceInMySQL, 
  fetchNextInvoiceNumberFromMySQL 
} from './mysqlApi';

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
export async function fetchNextInvoiceNumberFromDB(
  financialYear?: string,
  invoiceDate?: string
): Promise<string> {
  // 1. Try MySQL first
  try {
    let monthStr: string | undefined;
    if (invoiceDate && invoiceDate.includes('/')) {
      monthStr = invoiceDate.split('/')[1];
    }
    const nextNum = await fetchNextInvoiceNumberFromMySQL(financialYear, monthStr);
    if (nextNum && nextNum.startsWith('HOP/')) {
      return nextNum;
    }
  } catch (_) {}

  // 2. Supabase Fallback
  let sqlDate: string = new Date().toISOString().slice(0, 10);
  if (invoiceDate && invoiceDate.includes('/')) {
    const parts = invoiceDate.split('/');
    if (parts.length === 3) {
      sqlDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  } else if (invoiceDate) {
    sqlDate = invoiceDate;
  }

  const { data, error } = await supabase.rpc('generate_next_invoice_number' as any, { 
    p_invoice_date: sqlDate,
    p_fy_input: financialYear || null
  });

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

/**
 * Helper: converts month index (1-12) to fiscal rank in April-March financial year.
 * April (4) -> 1, May (5) -> 2, June (6) -> 3, July (7) -> 4, August (8) -> 5, September (9) -> 6,
 * October (10) -> 7, November (11) -> 8, December (12) -> 9, January (1) -> 10, February (2) -> 11, March (3) -> 12.
 */
export function getFiscalMonthRank(month: number): number {
  if (month >= 4 && month <= 12) {
    return month - 3;
  }
  if (month >= 1 && month <= 3) {
    return month + 9;
  }
  return 0;
}

/**
 * Parses an invoice number for high-precision financial year, fiscal month, and numeric serial sorting.
 */
export function parseInvoiceNumberForSort(invoiceNumber?: string, invoiceDate?: string): {
  fyYear: number;
  fiscalRank: number;
  serial: number;
  hasSerial: boolean;
} {
  const clean = (invoiceNumber || '').trim();
  let fyYear = 2026;
  let month = 0;
  let serial = 0;

  // Pattern 1: Monthly format e.g. HOP/26-27/08/000020 or HOP/2026-2027/08/000020
  const m1 = clean.match(/^([a-zA-Z]+)\/(\d{2,4}-\d{2,4})\/(\d{1,2})\/(\d+)$/i);
  if (m1) {
    const fyPart = m1[2].split('-')[0];
    fyYear = fyPart.length === 2 ? 2000 + parseInt(fyPart, 10) : parseInt(fyPart, 10);
    month = parseInt(m1[3], 10);
    serial = parseInt(m1[4], 10);
    return { fyYear, fiscalRank: getFiscalMonthRank(month), serial, hasSerial: true };
  }

  // Pattern 2: Historical annual series e.g. HOP/26-27/000067 (July base series)
  const m2 = clean.match(/^([a-zA-Z]+)\/(\d{2,4}-\d{2,4})\/(\d+)$/i);
  if (m2) {
    const fyPart = m2[2].split('-')[0];
    fyYear = fyPart.length === 2 ? 2000 + parseInt(fyPart, 10) : parseInt(fyPart, 10);
    // Historical initial series was July (month 7)
    month = 7;
    serial = parseInt(m2[3], 10);
    return { fyYear, fiscalRank: getFiscalMonthRank(month), serial, hasSerial: true };
  }

  // Pattern 3: Legacy variant e.g. HOP/08/001/26-27
  const m3 = clean.match(/^([a-zA-Z]+)\/(\d{1,2})\/(\d+)\/(\d{2,4}-\d{2,4})$/i);
  if (m3) {
    const fyPart = m3[4].split('-')[0];
    fyYear = fyPart.length === 2 ? 2000 + parseInt(fyPart, 10) : parseInt(fyPart, 10);
    month = parseInt(m3[2], 10);
    serial = parseInt(m3[3], 10);
    return { fyYear, fiscalRank: getFiscalMonthRank(month), serial, hasSerial: true };
  }

  // Generic fallback: extract last numeric segment as serial
  const lastDigits = clean.match(/(\d+)$/);
  if (lastDigits) {
    serial = parseInt(lastDigits[1], 10);
  }

  // Parse date if month not extracted
  if (invoiceDate) {
    const ddmmyyyy = invoiceDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (ddmmyyyy) {
      month = parseInt(ddmmyyyy[2], 10);
      fyYear = parseInt(ddmmyyyy[3], 10);
    }
  }

  return { fyYear, fiscalRank: getFiscalMonthRank(month), serial, hasSerial: Boolean(lastDigits) };
}

/**
 * Compares invoices according to GST Invoice Management requirement:
 * LEVEL 1: Financial Year (newest FY first)
 * LEVEL 2: Invoice series / Fiscal month rank (newest month first: Sep > Aug > Jul ...)
 * LEVEL 3: Numeric invoice serial DESCENDING (e.g. 20 > 6 > 5 > 1, 67 > 66 > ...)
 * LEVEL 4: Creation timestamp fallback
 * LEVEL 5: Internal ID tie-breaker
 */
export function compareInvoicesDesc(a: Invoice, b: Invoice): number {
  const pA = parseInvoiceNumberForSort(a.invoiceNumber, a.invoiceDate);
  const pB = parseInvoiceNumberForSort(b.invoiceNumber, b.invoiceDate);

  // LEVEL 1: Financial Year (Newest FY first)
  if (pA.fyYear !== pB.fyYear) {
    return pB.fyYear - pA.fyYear;
  }

  // LEVEL 2: Fiscal Month Rank (Newest Month in FY first)
  if (pA.fiscalRank !== pB.fiscalRank) {
    return pB.fiscalRank - pA.fiscalRank;
  }

  // LEVEL 3: Numeric Serial DESC (Highest serial first)
  if (pA.hasSerial && pB.hasSerial && pA.serial !== pB.serial) {
    return pB.serial - pA.serial;
  }

  // LEVEL 4: Primary creation timestamp (createdAt)
  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB && timeA > 0 && timeB > 0) {
    return timeB - timeA;
  }

  // LEVEL 5: Tertiary tie breaker on internal ID
  return (b.id || '').localeCompare(a.id || '');
}

export async function fetchInvoicesFromSupabase(): Promise<Invoice[]> {
  try {
    // 1. Primary: Try MySQL first
    try {
      const mysqlInvoices = await fetchInvoicesFromMySQL();
      if (mysqlInvoices && mysqlInvoices.length > 0) {
        mysqlInvoices.sort(compareInvoicesDesc);
        return mysqlInvoices;
      }
    } catch (mysqlErr) {
      console.warn('[invoiceService] MySQL fetch failed, trying Supabase:', mysqlErr);
    }

    // 2. Fallback: Supabase
    let invs: any[] | null = null;
    const { data: rpcInvs } = await supabase.rpc('get_all_invoices' as any);
    if (rpcInvs && rpcInvs.length > 0) {
      invs = rpcInvs;
    } else {
      const { data: selectInvs } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
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
          isGstApplicable: Number(it.gst_rate) > 0,
          gstRate: Number(it.gst_rate) || 0,
          cgstRate: Number(it.gst_rate) ? Number(it.gst_rate) / 2 : 0,
          cgstAmount: Number(it.cgst_amount) || 0,
          sgstRate: Number(it.gst_rate) ? Number(it.gst_rate) / 2 : 0,
          sgstAmount: Number(it.sgst_amount) || 0,
          igstRate: Number(it.gst_rate) || 0,
          igstAmount: Number(it.igst_amount) || 0,
          total: Number(it.item_total) || 0,
          serviceDate: it.service_date || undefined,
          serviceStartDate: it.service_start_date || undefined,
          serviceEndDate: it.service_end_date || undefined,
          duration: it.duration ? Number(it.duration) : undefined,
          unit: it.unit || undefined
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

    // Sort descending chronologically (newest first)
    mapped.sort(compareInvoicesDesc);

    return mapped;
  } catch (err) {
    console.error('Error in fetchInvoicesFromSupabase:', err);
    return [];
  }
}

export async function createInvoiceInSupabase(inv: Omit<Invoice, 'id' | 'createdAt'> & { id?: string }): Promise<{ invoice: Invoice | null; error?: string }> {
  try {
    // 1. Primary: Save to MySQL
    try {
      const mysqlInv = await createInvoiceInMySQL(inv as Invoice);
      if (mysqlInv) {
        return { invoice: mysqlInv };
      }
    } catch (mysqlErr: any) {
      console.warn('[invoiceService] MySQL create failed, trying Supabase fallback:', mysqlErr);
      if (mysqlErr?.message && !mysqlErr.message.includes('fetch')) {
        return { invoice: null, error: `MySQL Error: ${mysqlErr.message}` };
      }
    }

    // 2. Fallback: Save to Supabase
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
      is_cancelled: inv.isCancelled || false,
      payments: (inv.initialPayments || (inv as any).payments || []).map((p: any, idx: number) => ({
        payment_id: p.id || undefined,
        payment_date: p.paymentDate,
        amount: Number(p.amount) || 0,
        payment_mode: p.paymentMode || 'UPI',
        transaction_ref: p.transactionRef || undefined,
        notes: p.notes || undefined
      }))
    };

    // Execute atomic transactional RPC create_invoice_with_items
    // STRICT PRODUCTION RULE: No silent fallback to multi-step insert.
    // Atomic RPC success = invoice created with all line items.
    // RPC failure = entire transaction rolled back safely, zero orphan records.
    const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)('create_invoice_with_items', {
      p_invoice: invoicePayload,
      p_items: (inv.items || []).map((item, idx) => ({
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
        gst_rate: item.gstRate !== undefined ? item.gstRate : 18,
        cgst_amount: item.cgstAmount || 0,
        sgst_amount: item.sgstAmount || 0,
        igst_amount: item.igstAmount || 0,
        item_total: item.total,
        service_date: item.serviceDate || null,
        service_start_date: item.serviceStartDate || null,
        service_end_date: item.serviceEndDate || null,
        duration: item.duration || null,
        unit: item.unit || null
      }))
    });

    if (rpcError || !rpcResult) {
      console.error('[createInvoiceInSupabase] Atomic RPC create_invoice_with_items failed:', rpcError);
      return { 
        invoice: null, 
        error: rpcError?.message || 'Atomic invoice creation failed on database. Transaction rolled back.' 
      };
    }

    const created: Invoice = {
      ...inv,
      id: rpcResult.internal_invoice_id || internalId,
      createdAt: rpcResult.created_at || new Date().toISOString()
    };

    return { invoice: created };
  } catch (err: any) {
    return { invoice: null, error: err.message };
  }
}

export async function updateInvoiceInSupabase(inv: Invoice): Promise<{ invoice: Invoice | null; error?: string }> {
  try {
    const internalId = inv.id;
    if (!internalId) {
      return { invoice: null, error: 'Cannot update invoice: missing internal invoice ID' };
    }

    // 1. Primary: Update in MySQL
    try {
      await updateInvoiceInMySQL(inv);
      return { invoice: inv };
    } catch (mysqlErr: any) {
      console.warn('[invoiceService] MySQL update failed, trying Supabase fallback:', mysqlErr);
      if (mysqlErr?.message && !mysqlErr.message.includes('fetch')) {
        return { invoice: null, error: `MySQL Error: ${mysqlErr.message}` };
      }
    }

    // 2. Fallback: Update in Supabase
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

    const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)('update_invoice_with_items', {
      p_invoice: invoicePayload,
      p_items: (inv.items || []).map((item, idx) => ({
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
        gst_rate: item.gstRate !== undefined ? item.gstRate : 18,
        cgst_amount: item.cgstAmount || 0,
        sgst_amount: item.sgstAmount || 0,
        igst_amount: item.igstAmount || 0,
        item_total: item.total,
        service_date: item.serviceDate || null,
        service_start_date: item.serviceStartDate || null,
        service_end_date: item.serviceEndDate || null,
        duration: item.duration || null,
        unit: item.unit || null
      }))
    });

    if (rpcError || !rpcResult) {
      console.error('[updateInvoiceInSupabase] Atomic RPC update_invoice_with_items failed:', rpcError);
      return { 
        invoice: null, 
        error: rpcError?.message || 'Atomic invoice update failed on database.' 
      };
    }

    const updated: Invoice = {
      ...inv,
      id: rpcResult.internal_invoice_id || internalId,
      createdAt: rpcResult.created_at || inv.createdAt || new Date().toISOString()
    };

    return { invoice: updated };
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
