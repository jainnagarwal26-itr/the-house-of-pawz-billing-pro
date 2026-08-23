// ============================================================
// vaccinationService.ts — Pet Vaccination & Smart Alert System
// Project: The House of Pawz – Billing Pro
// ============================================================

import { supabase } from './supabase';
import { VaccinationRecord, VaccinationStatus, CompanySettings } from '../types';

export const COMMON_DOG_VACCINES = [
  'Rabies',
  'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)',
  'DHLPP (Distemper, Hepatitis, Leptospirosis, Parvovirus, Parainfluenza)',
  'Bordetella (Kennel Cough)',
  'Canine Distemper',
  'Parvovirus',
  'Canine Coronavirus',
  'Lyme Disease'
];

export const COMMON_CAT_VACCINES = [
  'Rabies',
  'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)',
  'FeLV (Feline Leukemia Virus)',
  'FIV (Feline Immunodeficiency Virus)',
  'Chlamydia'
];

/**
 * Calculates real-time vaccination status based on Next Due Date.
 * - EXPIRED: Next Due Date is in the past (< 0 days)
 * - DUE_SOON: Next Due Date is within 0 to 7 days
 * - UPCOMING: Next Due Date is within 8 to 30 days
 * - VALID: Next Due Date is > 30 days in the future
 */
export function calculateVaccinationStatus(nextDueDate: string): VaccinationStatus {
  if (!nextDueDate) return 'EXPIRED';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(nextDueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'EXPIRED';
  if (diffDays <= 7) return 'DUE_SOON';
  if (diffDays <= 30) return 'UPCOMING';
  return 'VALID';
}

/**
 * Fetches all pet vaccination records from Supabase public.pet_vaccinations
 */
export async function fetchVaccinationsFromSupabase(): Promise<VaccinationRecord[]> {
  try {
    const { data, error } = await supabase
      .from('pet_vaccinations')
      .select('*')
      .order('next_due_date', { ascending: true });

    if (error) {
      console.error('Error in fetchVaccinationsFromSupabase:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((v: any) => ({
      id: v.id,
      vaccinationId: v.vaccination_id,
      petId: v.pet_id,
      customerId: v.customer_id,
      petName: v.pet_name,
      customerName: v.customer_name,
      customerPhone: v.customer_phone || '',
      customerEmail: v.customer_email || '',
      species: v.species || 'Dog',
      vaccineName: v.vaccine_name,
      vaccinationDate: v.vaccination_date,
      nextDueDate: v.next_due_date,
      notes: v.notes || '',
      createdAt: v.created_at,
      updatedAt: v.updated_at
    }));
  } catch (err) {
    console.error('Exception in fetchVaccinationsFromSupabase:', err);
    return [];
  }
}

/**
 * Saves (inserts or updates) a pet vaccination record in Supabase
 */
export async function saveVaccinationToSupabase(
  record: Omit<VaccinationRecord, 'id' | 'vaccinationId'> & { id?: string; vaccinationId?: string }
): Promise<{ success: boolean; data?: VaccinationRecord; error?: string }> {
  try {
    const isEdit = Boolean(record.id);
    const vaccinationId = record.vaccinationId || `VAC-${Date.now().toString().slice(-6)}`;

    const payload = {
      vaccination_id: vaccinationId,
      pet_id: record.petId,
      customer_id: record.customerId,
      pet_name: record.petName,
      customer_name: record.customerName,
      customer_phone: record.customerPhone || null,
      customer_email: record.customerEmail || null,
      species: record.species || 'Dog',
      vaccine_name: record.vaccineName,
      vaccination_date: record.vaccinationDate,
      next_due_date: record.nextDueDate,
      notes: record.notes || null,
      updated_at: new Date().toISOString()
    };

    let query = supabase.from('pet_vaccinations');
    let res;

    if (isEdit && record.id) {
      res = await query.update(payload as any).eq('id', record.id).select().single();
    } else {
      res = await query.insert(payload as any).select().single();
    }

    if (res.error) {
      console.error('Error saving vaccination to Supabase:', res.error);
      return { success: false, error: res.error.message };
    }

    const saved = res.data as any;
    return {
      success: true,
      data: {
        id: saved.id,
        vaccinationId: saved.vaccination_id,
        petId: saved.pet_id,
        customerId: saved.customer_id,
        petName: saved.pet_name,
        customerName: saved.customer_name,
        customerPhone: saved.customer_phone || '',
        customerEmail: saved.customer_email || '',
        species: saved.species || 'Dog',
        vaccineName: saved.vaccine_name,
        vaccinationDate: saved.vaccination_date,
        nextDueDate: saved.next_due_date,
        notes: saved.notes || '',
        createdAt: saved.created_at,
        updatedAt: saved.updated_at
      }
    };
  } catch (err: any) {
    console.error('Exception in saveVaccinationToSupabase:', err);
    return { success: false, error: err?.message || 'Failed to save vaccination record' };
  }
}

/**
 * Deletes a vaccination record from Supabase
 */
export async function deleteVaccinationFromSupabase(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('pet_vaccinations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vaccination from Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Exception in deleteVaccinationFromSupabase:', err);
    return { success: false, error: err?.message || 'Failed to delete vaccination record' };
  }
}

/**
 * Formats a Date object or YYYY-MM-DD string to readable Indian date (e.g. 21 August 2026)
 */
export function formatLongDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Normalizes phone numbers for WhatsApp
 */
export function normalizeWhatsAppNumber(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

/**
 * Generates dynamic manual WhatsApp URL
 */
export function generateVaccinationWhatsAppUrl(
  record: VaccinationRecord,
  settings: CompanySettings
): string {
  const phone = normalizeWhatsAppNumber(record.customerPhone);
  const formattedAdminDate = formatLongDate(record.vaccinationDate);
  const formattedDueDate = formatLongDate(record.nextDueDate);
  const speciesEmoji = record.species === 'Cat' ? '🐱' : '🐶';

  const message = `🐾 The House of Pawz – Vaccination Reminder

Dear ${record.customerName},

This is a friendly reminder regarding ${record.petName}'s vaccination.

💉 Vaccination: ${record.vaccineName}
📅 Vaccination Date: ${formattedAdminDate}
⚠️ Next Due Date: ${formattedDueDate}

We recommend keeping ${record.petName}'s vaccination up to date for their continued health and safety. ${speciesEmoji}❤️

Please contact The House of Pawz to schedule the required vaccination or update your records.

Thank you for choosing ${settings.companyName || 'The House of Pawz'}. 🐾

📞 Contact: ${settings.phone || '+91 98200 12345'}`;

  const encoded = encodeURIComponent(message);
  if (phone) {
    return `https://wa.me/${phone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

/**
 * Generates dynamic manual Email mailto: URL
 */
export function generateVaccinationEmailUrl(
  record: VaccinationRecord,
  settings: CompanySettings
): string {
  const formattedAdminDate = formatLongDate(record.vaccinationDate);
  const formattedDueDate = formatLongDate(record.nextDueDate);
  const speciesEmoji = record.species === 'Cat' ? '🐱' : '🐶';

  const subject = `🐾 Vaccination Reminder – ${record.petName} | ${settings.companyName || 'The House of Pawz'}`;

  const body = `Dear ${record.customerName},

This is a friendly reminder from ${settings.companyName || 'The House of Pawz'} regarding ${record.petName}'s vaccination schedule.

• Pet / Animal: ${record.petName} (${record.species})
• Vaccination: ${record.vaccineName}
• Administered On: ${formattedAdminDate}
• Next Due / Expiry Date: ${formattedDueDate}

We recommend keeping ${record.petName}'s vaccination up to date to ensure their health, well-being, and compliance for boarding and spa visits. ${speciesEmoji}

If you have already administered this renewal, please share the updated details with us so we can refresh ${record.petName}'s profile.

Warm Regards,
${settings.companyName || 'The House of Pawz'}
${settings.tagline || 'Luxury Pet Boarding, Daycare, Training & Spa'}
📞 ${settings.phone || ''}
🌐 www.wisdomcentre.co.in`;

  return `mailto:${record.customerEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
