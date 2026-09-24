// ============================================================
// paymentService.ts — Payment Receipts Service (MySQL & Supabase)
// Project: The House of Pawz – Billing Pro
// ============================================================

import { supabase } from './supabase';
import { Payment } from '../types';
import { STORAGE_KEYS, loadStoredData } from './storage';
import { 
  fetchPaymentsFromMySQL, 
  recordPaymentInMySQL, 
  updatePaymentInMySQL, 
  deletePaymentInMySQL 
} from './mysqlApi';

export async function fetchPaymentsFromSupabase(): Promise<Payment[]> {
  try {
    // 1. Primary: Try MySQL first
    try {
      const mysqlPayments = await fetchPaymentsFromMySQL();
      if (mysqlPayments && mysqlPayments.length > 0) {
        return mysqlPayments;
      }
    } catch (mysqlErr) {
      console.warn('[paymentService] MySQL fetch failed, trying Supabase:', mysqlErr);
    }

    // 2. Fallback: Supabase
    let data: any[] | null = null;
    const { data: rpcPays } = await supabase.rpc('get_all_payments' as any);
    if (rpcPays && rpcPays.length > 0) {
      data = rpcPays;
    } else {
      const { data: selectPays } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      data = selectPays;
    }

    if (!data || data.length === 0) {
      return loadStoredData<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    }

    return (data as any[]).map(p => ({
      id: p.payment_id,
      invoiceId: p.internal_invoice_id,
      invoiceNumber: p.invoice_number,
      customerId: p.customer_id,
      customerName: p.customer_name,
      amount: Number(p.amount) || 0,
      paymentDate: p.payment_date,
      paymentMode: (p.payment_mode as any) || 'UPI',
      transactionRef: p.transaction_ref || '',
      notes: p.notes || '',
      receivedBy: p.received_by || 'Chirag Jain',
      createdAt: p.created_at
    }));
  } catch (err) {
    console.error('Error in fetchPaymentsFromSupabase:', err);
    return [];
  }
}

/**
 * Record a payment against an invoice using atomic MySQL / Supabase backend.
 */
export async function recordInvoicePaymentInSupabase(
  payment: Omit<Payment, 'id'> & { id?: string }
): Promise<{ payment: Payment | null; error?: string }> {
  try {
    // 1. Primary: Record in MySQL
    try {
      await recordPaymentInMySQL(payment);
      const created: Payment = {
        id: payment.id || `PAY-${payment.invoiceId}-${Date.now()}`,
        invoiceId: payment.invoiceId,
        invoiceNumber: payment.invoiceNumber,
        customerId: payment.customerId,
        customerName: payment.customerName,
        amount: Number(payment.amount) || 0,
        paymentDate: payment.paymentDate,
        paymentMode: payment.paymentMode,
        transactionRef: payment.transactionRef || '',
        notes: payment.notes || '',
        receivedBy: payment.receivedBy || 'Staff',
        createdAt: new Date().toISOString()
      };
      return { payment: created };
    } catch (mysqlErr: any) {
      console.warn('[paymentService] MySQL record payment failed, trying Supabase fallback:', mysqlErr);
      if (mysqlErr?.message && !mysqlErr.message.includes('fetch')) {
        return { payment: null, error: `MySQL Error: ${mysqlErr.message}` };
      }
    }

    // 2. Fallback: Supabase RPC
    const payload = {
      payment_id: payment.id || undefined,
      internal_invoice_id: payment.invoiceId,
      amount: payment.amount,
      payment_date: payment.paymentDate,
      payment_mode: payment.paymentMode || 'UPI',
      transaction_ref: payment.transactionRef || null,
      notes: payment.notes || null,
      received_by: payment.receivedBy || 'Chirag Jain'
    };

    const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)('record_invoice_payment', {
      p_payment: payload
    });

    if (rpcError || !rpcResult || !rpcResult.payment) {
      console.error('[recordInvoicePaymentInSupabase] RPC record_invoice_payment failed:', rpcError);
      return { 
        payment: null, 
        error: rpcError?.message || 'Failed to record payment in database.' 
      };
    }

    const cPay = rpcResult.payment;
    const created: Payment = {
      id: cPay.payment_id,
      invoiceId: cPay.internal_invoice_id,
      invoiceNumber: cPay.invoice_number,
      customerId: cPay.customer_id,
      customerName: cPay.customer_name,
      amount: Number(cPay.amount) || 0,
      paymentDate: cPay.payment_date,
      paymentMode: (cPay.payment_mode as any) || 'UPI',
      transactionRef: cPay.transaction_ref || '',
      notes: cPay.notes || '',
      receivedBy: cPay.received_by || 'Chirag Jain',
      createdAt: cPay.created_at
    };

    return { payment: created };
  } catch (err: any) {
    return { payment: null, error: err.message };
  }
}

/**
 * Update an existing payment entry using atomic database RPC.
 */
export async function updateInvoicePaymentInSupabase(
  payment: Payment
): Promise<{ payment: Payment | null; error?: string }> {
  try {
    // 1. Primary: MySQL
    try {
      await updatePaymentInMySQL(payment);
      return { payment };
    } catch (mysqlErr: any) {
      console.warn('[paymentService] MySQL update payment failed, trying Supabase fallback:', mysqlErr);
      if (mysqlErr?.message && !mysqlErr.message.includes('fetch')) {
        return { payment: null, error: `MySQL Error: ${mysqlErr.message}` };
      }
    }

    // 2. Fallback: Supabase RPC
    const payload = {
      payment_id: payment.id,
      amount: payment.amount,
      payment_date: payment.paymentDate,
      payment_mode: payment.paymentMode,
      transaction_ref: payment.transactionRef || null,
      notes: payment.notes || null,
      received_by: payment.receivedBy || 'Chirag Jain'
    };

    const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)('update_invoice_payment', {
      p_payment: payload
    });

    if (rpcError || !rpcResult || !rpcResult.payment) {
      console.error('[updateInvoicePaymentInSupabase] RPC update_invoice_payment failed:', rpcError);
      return { 
        payment: null, 
        error: rpcError?.message || 'Failed to update payment in database.' 
      };
    }

    const cPay = rpcResult.payment;
    const updated: Payment = {
      id: cPay.payment_id,
      invoiceId: cPay.internal_invoice_id,
      invoiceNumber: cPay.invoice_number,
      customerId: cPay.customer_id,
      customerName: cPay.customer_name,
      amount: Number(cPay.amount) || 0,
      paymentDate: cPay.payment_date,
      paymentMode: (cPay.payment_mode as any) || 'UPI',
      transactionRef: cPay.transaction_ref || '',
      notes: cPay.notes || '',
      receivedBy: cPay.received_by || 'Chirag Jain',
      createdAt: cPay.created_at
    };

    return { payment: updated };
  } catch (err: any) {
    return { payment: null, error: err.message };
  }
}

/**
 * Delete a payment entry and recalculate invoice balance using atomic database RPC.
 */
export async function deleteInvoicePaymentInSupabase(
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Primary: MySQL
    try {
      await deletePaymentInMySQL(paymentId);
      return { success: true };
    } catch (mysqlErr: any) {
      console.warn('[paymentService] MySQL delete payment failed, trying Supabase fallback:', mysqlErr);
    }

    // 2. Fallback: Supabase
    const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)('delete_invoice_payment', {
      p_payment_id: paymentId
    });

    if (rpcError || !rpcResult || !rpcResult.success) {
      console.error('[deleteInvoicePaymentInSupabase] RPC delete_invoice_payment failed:', rpcError);
      return { 
        success: false, 
        error: rpcError?.message || 'Failed to delete payment from database.' 
      };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Backward compatibility alias for legacy callers
export const recordPaymentInSupabase = recordInvoicePaymentInSupabase;
