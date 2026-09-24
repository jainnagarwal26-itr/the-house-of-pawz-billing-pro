// ============================================================
// mysqlApi.ts — Centralized MySQL REST API Client
// Database: jainnaga_the_house_of_pawz
// Project: The House of Pawz – Billing Pro
// ============================================================

import { Invoice, InvoiceItem, Payment, Customer, Pet, CompanySettings, ServiceCatalogItem, ServicePackageMaster } from '../types';

// Detect API base path (e.g. './api' or window.location.pathname/api)
function getApiBaseUrl(): string {
  // If running in development with proxy or full URL
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    // Strip index.html or trailing slash
    const cleanPath = pathname.replace(/\/index\.html$/i, '').replace(/\/+$/, '');
    return `${cleanPath}/api`;
  }
  return './api';
}

/**
 * Generic Fetch helper for MySQL PHP API
 */
async function mysqlFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/${endpoint}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.error) errMsg = errJson.error;
    } catch (_) {}
    throw new Error(errMsg);
  }

  return response.json() as Promise<T>;
}

// ------------------------------------------------------------
// Health Check
// ------------------------------------------------------------
export async function checkMysqlHealth(): Promise<{ success: boolean; status: string; database?: string; invoices_count?: number }> {
  return mysqlFetch('health.php');
}

// ------------------------------------------------------------
// Invoices
// ------------------------------------------------------------
export async function fetchInvoicesFromMySQL(): Promise<Invoice[]> {
  const res = await mysqlFetch<{ success: boolean; data: any[] }>('invoices.php');
  if (!res.success || !Array.isArray(res.data)) {
    return [];
  }

  return res.data.map(i => ({
    id: i.internal_invoice_id || i.id,
    invoiceNumber: i.invoice_number,
    invoiceDate: i.invoice_date,
    dueDate: i.due_date || i.invoice_date,
    customerId: i.customer_id,
    customerName: i.customer_name,
    customerPhone: i.customer_phone || '',
    customerEmail: i.customer_email || '',
    customerAddress: i.customer_address || '',
    customerGSTIN: i.customer_gstin || '',
    petId: i.pet_id || '',
    petName: i.pet_name || '',
    placeOfSupply: i.place_of_supply || '27-Maharashtra',
    isInterState: Boolean(i.is_inter_state),
    items: Array.isArray(i.items) ? i.items.map((it: any) => ({
      id: it.line_item_id || it.id,
      catalogItemId: it.catalog_item_id || '',
      type: it.item_type || 'SERVICE',
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
      total: Number(it.item_total) || 0
    })) : [],
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
    paymentStatus: i.payment_status || 'UNPAID',
    paymentMode: i.payment_mode || 'UPI',
    notes: i.notes || '',
    createdByRole: i.created_by_role || 'ADMIN',
    createdByName: i.created_by_name || 'Staff',
    isCancelled: Boolean(i.is_cancelled),
    cancelledReason: i.cancelled_reason || undefined,
    createdAt: i.created_at || new Date().toISOString()
  }));
}

export async function createInvoiceInMySQL(inv: Invoice): Promise<Invoice> {
  const payload = {
    invoice: {
      id: inv.id,
      internal_invoice_id: (inv as any).internalInvoiceId || inv.id,
      invoice_number: inv.invoiceNumber,
      financial_year: '2026-27',
      invoice_date: inv.invoiceDate,
      due_date: inv.dueDate,
      customer_id: inv.customerId,
      customer_name: inv.customerName,
      customer_phone: inv.customerPhone,
      customer_email: inv.customerEmail,
      customer_address: inv.customerAddress,
      customer_gstin: inv.customerGSTIN,
      pet_id: inv.petId,
      pet_name: inv.petName,
      place_of_supply: inv.placeOfSupply,
      is_inter_state: inv.isInterState,
      sub_total: inv.subTotal,
      total_discount: inv.totalDiscount,
      taxable_amount: inv.taxableAmount,
      cgst_total: inv.cgstTotal,
      sgst_total: inv.sgstTotal,
      igst_total: inv.igstTotal,
      total_gst: inv.totalGst,
      round_off: inv.roundOff,
      grand_total: inv.grandTotal,
      paid_amount: inv.paidAmount,
      balance_due: inv.balanceDue,
      payment_status: inv.paymentStatus,
      payment_mode: inv.paymentMode,
      notes: inv.notes,
      created_by_role: inv.createdByRole,
      created_by_name: inv.createdByName
    },
    items: (inv.items || []).map(it => ({
      catalog_item_id: it.catalogItemId,
      item_type: it.type,
      item_name: it.name,
      hsn_sac: it.hsnSac,
      price: it.price,
      quantity: it.qty,
      discount_percent: it.discount,
      discount_amount: it.discountAmount,
      taxable_value: it.taxableValue,
      gst_rate: it.gstRate,
      cgst_amount: it.cgstAmount,
      sgst_amount: it.sgstAmount,
      igst_amount: it.igstAmount,
      item_total: it.total
    })),
    payments: inv.initialPayments ? inv.initialPayments.map(p => ({
      amount: p.amount,
      payment_date: p.paymentDate,
      payment_mode: p.paymentMode,
      transaction_ref: p.transactionRef,
      notes: p.notes
    })) : []
  };

  const res = await mysqlFetch<{ success: boolean; data: any }>('invoices.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (res.data?.invoice_number) {
    inv.invoiceNumber = res.data.invoice_number;
  }
  return inv;
}

export async function updateInvoiceInMySQL(inv: Invoice): Promise<void> {
  const payload = {
    invoice: {
      id: inv.id,
      internal_invoice_id: (inv as any).internalInvoiceId || inv.id,
      invoice_number: inv.invoiceNumber,
      customer_id: inv.customerId,
      customer_name: inv.customerName,
      customer_phone: inv.customerPhone,
      customer_email: inv.customerEmail,
      customer_address: inv.customerAddress,
      customer_gstin: inv.customerGSTIN,
      pet_id: inv.petId,
      pet_name: inv.petName,
      place_of_supply: inv.placeOfSupply,
      is_inter_state: inv.isInterState,
      sub_total: inv.subTotal,
      total_discount: inv.totalDiscount,
      taxable_amount: inv.taxableAmount,
      cgst_total: inv.cgstTotal,
      sgst_total: inv.sgstTotal,
      igst_total: inv.igstTotal,
      total_gst: inv.totalGst,
      round_off: inv.roundOff,
      grand_total: inv.grandTotal,
      notes: inv.notes
    },
    items: (inv.items || []).map(it => ({
      catalog_item_id: it.catalogItemId,
      item_type: it.type,
      item_name: it.name,
      hsn_sac: it.hsnSac,
      price: it.price,
      quantity: it.qty,
      discount_percent: it.discount,
      discount_amount: it.discountAmount,
      taxable_value: it.taxableValue,
      gst_rate: it.gstRate,
      cgst_amount: it.cgstAmount,
      sgst_amount: it.sgstAmount,
      igst_amount: it.igstAmount,
      item_total: it.total
    }))
  };

  await mysqlFetch('invoices.php', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function fetchNextInvoiceNumberFromMySQL(fy = '2026-27', month?: string): Promise<string> {
  const m = month || String(new Date().getMonth() + 1).padStart(2, '0');
  const res = await mysqlFetch<{ success: boolean; next_invoice_number: string }>(`next_number.php?fy=${encodeURIComponent(fy)}&month=${encodeURIComponent(m)}`);
  return res.next_invoice_number;
}

// ------------------------------------------------------------
// Payments
// ------------------------------------------------------------
export async function fetchPaymentsFromMySQL(): Promise<Payment[]> {
  const res = await mysqlFetch<{ success: boolean; data: any[] }>('payments.php');
  if (!res.success || !Array.isArray(res.data)) {
    return [];
  }

  return res.data.map(p => ({
    id: p.payment_id || p.id,
    invoiceId: p.internal_invoice_id,
    invoiceNumber: p.invoice_number,
    customerId: p.customer_id,
    customerName: p.customer_name,
    amount: Number(p.amount) || 0,
    paymentDate: p.payment_date,
    paymentMode: p.payment_mode,
    transactionRef: p.transaction_ref || undefined,
    notes: p.notes || undefined,
    receivedBy: p.received_by || 'Staff',
    createdAt: p.created_at
  }));
}

export async function recordPaymentInMySQL(payment: Omit<Payment, 'id'> & { id?: string }): Promise<void> {
  await mysqlFetch('payments.php', {
    method: 'POST',
    body: JSON.stringify({
      payment: {
        internal_invoice_id: payment.invoiceId,
        amount: payment.amount,
        payment_date: payment.paymentDate,
        payment_mode: payment.paymentMode,
        transaction_ref: payment.transactionRef,
        notes: payment.notes,
        received_by: payment.receivedBy
      }
    })
  });
}

export async function updatePaymentInMySQL(payment: Payment): Promise<void> {
  await mysqlFetch('payments.php', {
    method: 'PUT',
    body: JSON.stringify({
      payment: {
        payment_id: payment.id,
        amount: payment.amount,
        payment_date: payment.paymentDate,
        payment_mode: payment.paymentMode,
        transaction_ref: payment.transactionRef,
        notes: payment.notes
      }
    })
  });
}

export async function deletePaymentInMySQL(paymentId: string): Promise<void> {
  await mysqlFetch(`payments.php?id=${encodeURIComponent(paymentId)}`, {
    method: 'DELETE'
  });
}

// ------------------------------------------------------------
// Customers & Pets
// ------------------------------------------------------------
export async function fetchCustomersFromMySQL(): Promise<Customer[]> {
  const res = await mysqlFetch<{ success: boolean; data: any[] }>('customers.php');
  return (res.data || []).map(c => ({
    id: c.customer_id || c.id,
    name: c.name || c.full_name || 'Customer',
    phone: c.phone || '',
    email: c.email || '',
    address: c.address || '',
    gstin: c.gstin || '',
    stateCode: c.state_code || c.state || '27-Maharashtra',
    emergencyContact: c.emergency_contact || '',
    outstandingBalance: Number(c.outstanding_balance) || 0,
    advanceBalance: Number(c.advance_balance) || 0,
    createdAt: c.created_at || new Date().toISOString()
  }));
}

export async function saveCustomerToMySQL(c: Customer): Promise<void> {
  await mysqlFetch('customers.php', {
    method: 'POST',
    body: JSON.stringify({ customer: c })
  });
}

export async function fetchPetsFromMySQL(): Promise<Pet[]> {
  const res = await mysqlFetch<{ success: boolean; data: any[] }>('pets.php');
  return (res.data || []).map(p => ({
    id: p.pet_id || p.id,
    customerId: p.customer_id,
    customerName: p.customer_name || '',
    name: p.name || p.pet_name || 'Pet',
    species: p.species || 'Dog',
    breed: p.breed || '',
    age: p.age || '',
    gender: p.gender || 'Unknown',
    weight: p.weight ? Number(p.weight) : undefined,
    vaccinationStatus: p.vaccination_status || 'Up to Date',
    medicalNotes: p.medical_notes || '',
    feedingPreferences: p.feeding_preferences || '',
    microchipId: p.microchip_number || p.microchip_id || '',
    isBoardingNow: Boolean(p.is_boarding_now),
    checkInDate: p.check_in_date || '',
    checkOutDate: p.check_out_date || '',
    roomNo: p.room_no || ''
  }));
}

export async function savePetToMySQL(p: Pet): Promise<void> {
  await mysqlFetch('pets.php', {
    method: 'POST',
    body: JSON.stringify({ pet: p })
  });
}
