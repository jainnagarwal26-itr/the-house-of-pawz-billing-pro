// ============================================================
// paymentService.ts — Payment Receipts Supabase Service
// Project: The House of Pawz – Billing Pro
// ============================================================

import { supabase } from './supabase';
import { Payment } from '../types';

import { STORAGE_KEYS, loadStoredData } from './storage';

export async function fetchPaymentsFromSupabase(): Promise<Payment[]> {
  try {
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
 * Record a payment against an invoice using atomic database RPC.
 */
export async function recordInvoicePaymentInSupabase(
  payment: Omit<Payment, 'id'> & { id?: string }
): Promise<{ payment: Payment | null; error?: string }> {
  try {
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
