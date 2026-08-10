// ============================================================
// customerService.ts — Customer Master Supabase Service
// Project: The House of Pawz – Billing Pro
// ============================================================

import { supabase } from './supabase';
import { Customer } from '../types';

import { STORAGE_KEYS, loadStoredData } from './storage';
import { PROD_CUSTOMERS } from './productionData';

export async function fetchCustomersFromSupabase(): Promise<Customer[]> {
  try {
    let data: any[] | null = null;
    const { data: rpcCusts } = await supabase.rpc('get_all_customers' as any);
    if (rpcCusts && rpcCusts.length > 0) {
      data = rpcCusts;
    } else {
      const { data: selectCusts } = await supabase
        .from('customers')
        .select('*')
        .order('customer_id', { ascending: true });
      data = selectCusts;
    }

    if (!data || data.length === 0) {
      return loadStoredData<Customer[]>(STORAGE_KEYS.CUSTOMERS, PROD_CUSTOMERS);
    }

    return (data as any[]).map(c => ({
      id: c.customer_id,
      name: c.full_name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      gstin: c.gstin || '',
      stateCode: c.state_code || '27-Maharashtra',
      emergencyContact: c.emergency_contact || '',
      outstandingBalance: Number(c.outstanding_balance) || 0,
      advanceBalance: Number(c.advance_balance) || 0,
      createdAt: c.created_at
    }));
  } catch (err) {
    console.error('Error in fetchCustomersFromSupabase:', err);
    return [];
  }
}

export async function createCustomerInSupabase(customer: Omit<Customer, 'id' | 'createdAt'> & { id?: string }): Promise<{ customer: Customer | null; error?: string }> {
  try {
    const nextId = customer.id || `CUST-${Date.now().toString().slice(-4)}`;
    const payload = {
      customer_id: nextId,
      full_name: customer.name,
      phone: customer.phone,
      email: customer.email || null,
      address: customer.address || null,
      gstin: customer.gstin || null,
      state_code: customer.stateCode || '27-Maharashtra',
      emergency_contact: customer.emergencyContact || null,
      outstanding_balance: customer.outstandingBalance || 0,
      advance_balance: customer.advanceBalance || 0
    };

    const { data, error } = await supabase
      .from('customers')
      .insert(payload as any)
      .select()
      .single();

    if (error || !data) {
      return { customer: null, error: error?.message || 'Failed to create customer' };
    }

    const c = data as any;
    const created: Customer = {
      id: c.customer_id,
      name: c.full_name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      gstin: c.gstin || '',
      stateCode: c.state_code || '27-Maharashtra',
      emergencyContact: c.emergency_contact || '',
      outstandingBalance: Number(c.outstanding_balance) || 0,
      advanceBalance: Number(c.advance_balance) || 0,
      createdAt: c.created_at
    };

    return { customer: created };
  } catch (err: any) {
    return { customer: null, error: err.message };
  }
}

export async function updateCustomerInSupabase(id: string, updates: Partial<Customer>): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: any = {};
    if (updates.name !== undefined) payload.full_name = updates.name;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.email !== undefined) payload.email = updates.email || null;
    if (updates.address !== undefined) payload.address = updates.address || null;
    if (updates.gstin !== undefined) payload.gstin = updates.gstin || null;
    if (updates.stateCode !== undefined) payload.state_code = updates.stateCode;
    if (updates.emergencyContact !== undefined) payload.emergency_contact = updates.emergencyContact || null;
    if (updates.outstandingBalance !== undefined) payload.outstanding_balance = updates.outstandingBalance;
    if (updates.advanceBalance !== undefined) payload.advance_balance = updates.advanceBalance;

    const { error } = await supabase
      .from('customers')
      .update(payload)
      .eq('customer_id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCustomerFromSupabase(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('customer_id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
