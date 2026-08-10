// ============================================================
// settingsService.ts — Company & Software Settings Supabase Service
// Project: The House of Pawz – Billing Pro
// ============================================================

import { supabase } from './supabase';
import { CompanySettings } from '../types';

export async function fetchCompanySettingsFromSupabase(): Promise<CompanySettings | null> {
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      console.error('Error fetching company settings from Supabase:', error);
      return null;
    }

    const s = data as any;
    const rawAddr = s.address || '';
    let streetAddr = rawAddr;
    let cityZip = 'Mumbai, Maharashtra - 400061';

    if (rawAddr.includes(', Mumbai, Maharashtra')) {
      const parts = rawAddr.split(', Mumbai, Maharashtra');
      streetAddr = parts[0].trim();
      cityZip = `Mumbai, Maharashtra${parts[1] || ''}`.trim();
    }

    return {
      companyName: s.company_name,
      tagline: s.tagline || 'Luxury Pet Boarding, Daycare, Training & Spa',
      address: streetAddr,
      cityStateZip: cityZip,
      phone: s.phone || '',
      email: s.email || '',
      gstin: s.gstin || '',
      stateCode: `${s.state_code || '27'}-${s.state_name || 'Maharashtra'}`,
      accountName: s.company_name,
      bankName: s.bank_name || '',
      accountNo: s.bank_account_no || '',
      ifscCode: s.bank_ifsc || '',
      branch: s.bank_branch || '',
      upiId: s.upi_id || '',
      logoPath: s.logo_url || '/assets/logo.png',
      signaturePath: s.signature_url || '',
      invoicePrefix: s.invoice_prefix || 'HOP',
      financialYear: s.financial_year || '2026-27',
      defaultGstRate: Number(s.default_gst_rate) || 18,
      terms: s.terms_and_conditions ? s.terms_and_conditions.split('\n') : [
        '1. Goods/Services once billed will not be refunded.',
        '2. All disputes subject to Mumbai Jurisdiction.'
      ]
    };
  } catch (err) {
    console.error('Error in fetchCompanySettingsFromSupabase:', err);
    return null;
  }
}

export async function updateCompanySettingsInSupabase(settings: Partial<CompanySettings>): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: any = {};
    if (settings.companyName !== undefined) payload.company_name = settings.companyName;
    if (settings.tagline !== undefined) payload.tagline = settings.tagline;
    if (settings.address !== undefined) payload.address = settings.address;
    if (settings.phone !== undefined) payload.phone = settings.phone;
    if (settings.email !== undefined) payload.email = settings.email;
    if (settings.gstin !== undefined) payload.gstin = settings.gstin;
    if (settings.bankName !== undefined) payload.bank_name = settings.bankName;
    if (settings.accountNo !== undefined) payload.bank_account_no = settings.accountNo;
    if (settings.ifscCode !== undefined) payload.bank_ifsc = settings.ifscCode;
    if (settings.branch !== undefined) payload.bank_branch = settings.branch;
    if (settings.upiId !== undefined) payload.upi_id = settings.upiId;
    if (settings.logoPath !== undefined) payload.logo_url = settings.logoPath;
    if (settings.signaturePath !== undefined) payload.signature_url = settings.signaturePath;
    if (settings.invoicePrefix !== undefined) payload.invoice_prefix = settings.invoicePrefix;
    if (settings.financialYear !== undefined) payload.financial_year = settings.financialYear;
    if (settings.defaultGstRate !== undefined) payload.default_gst_rate = settings.defaultGstRate;
    if (settings.terms !== undefined) payload.terms_and_conditions = Array.isArray(settings.terms) ? settings.terms.join('\n') : settings.terms;

    const { data: existing } = await supabase.from('company_settings').select('id').limit(1).single();

    if (existing) {
      const { error } = await supabase.from('company_settings').update(payload).eq('id', (existing as any).id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from('company_settings').insert(payload);
      if (error) return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
