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
      receivedBy: p.received_by || 'Chirag Jain'
    }));
  } catch (err) {
    console.error('Error in fetchPaymentsFromSupabase:', err);
    return [];
  }
}

export async function recordPaymentInSupabase(payment: Omit<Payment, 'id'> & { id?: string }): Promise<{ payment: Payment | null; error?: string }> {
  try {
    const nextId = payment.id || `PAY-${Date.now()}`;
    const payload = {
      payment_id: nextId,
      internal_invoice_id: payment.invoiceId,
      invoice_number: payment.invoiceNumber,
      customer_id: payment.customerId,
      customer_name: payment.customerName,
      amount: payment.amount,
      payment_date: payment.paymentDate,
      payment_mode: payment.paymentMode || 'UPI',
      transaction_ref: payment.transactionRef || null,
      notes: payment.notes || null,
      received_by: payment.receivedBy || 'Chirag Jain'
    };

    const { data, error } = await supabase
      .from('payments')
      .insert(payload as any)
      .select()
      .single();

    if (error || !data) {
      return { payment: null, error: error?.message || 'Failed to record payment' };
    }

    const { data: inv } = await supabase
      .from('invoices')
      .select('grand_total, paid_amount')
      .eq('internal_invoice_id', payment.invoiceId)
      .single();

    if (inv) {
      const cInv = inv as any;
      const newPaid = (Number(cInv.paid_amount) || 0) + payment.amount;
      const grandTotal = Number(cInv.grand_total) || 0;
      const newBalance = Math.max(0, grandTotal - newPaid);
      const newStatus = newBalance <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';

      await supabase
        .from('invoices')
        .update({
          paid_amount: newPaid,
          balance_due: newBalance,
          payment_status: newStatus
        } as any)
        .eq('internal_invoice_id', payment.invoiceId);
    }

    const cPay = data as any;
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
      receivedBy: cPay.received_by || 'Chirag Jain'
    };

    return { payment: created };
  } catch (err: any) {
    return { payment: null, error: err.message };
  }
}
