// ============================================================
// petService.ts — Pet Master Supabase Service
// Project: The House of Pawz – Billing Pro
// ============================================================

import { supabase } from './supabase';
import { Pet } from '../types';

import { STORAGE_KEYS, loadStoredData } from './storage';
import { PROD_PETS } from './productionData';

export async function fetchPetsFromSupabase(): Promise<Pet[]> {
  try {
    let data: any[] | null = null;
    const { data: rpcPets } = await supabase.rpc('get_all_pets' as any);
    if (rpcPets && rpcPets.length > 0) {
      data = rpcPets;
    } else {
      const { data: selectPets } = await supabase
        .from('pets')
        .select('*')
        .order('pet_id', { ascending: true });
      data = selectPets;
    }

    if (!data || data.length === 0) {
      return loadStoredData<Pet[]>(STORAGE_KEYS.PETS, PROD_PETS);
    }

    return (data as any[]).map(p => ({
      id: p.pet_id,
      customerId: p.customer_id,
      customerName: p.customer_name || '',
      name: p.pet_name,
      species: (p.species as any) || 'Dog',
      breed: p.breed || '',
      age: p.age || '',
      gender: (p.gender as any) || 'Male',
      vaccinationStatus: (p.vaccination_status as any) || 'Up to Date',
      medicalNotes: p.medical_notes || '',
      feedingPreferences: p.feeding_preferences || '',
      microchipId: p.microchip_id || '',
      barcode: p.barcode || '',
      isBoardingNow: Boolean(p.is_boarding_now),
      checkInDate: p.check_in_date || '',
      checkOutDate: p.check_out_date || '',
      roomNo: p.room_no || ''
    }));
  } catch (err) {
    console.error('Error in fetchPetsFromSupabase:', err);
    return [];
  }
}

export async function createPetInSupabase(pet: Omit<Pet, 'id'> & { id?: string }): Promise<{ pet: Pet | null; error?: string }> {
  try {
    const nextId = pet.id || `PET-${Date.now().toString().slice(-4)}`;
    const payload = {
      pet_id: nextId,
      customer_id: pet.customerId,
      customer_name: pet.customerName || null,
      pet_name: pet.name,
      species: pet.species || 'Dog',
      breed: pet.breed || null,
      age: pet.age || null,
      gender: pet.gender || 'Male',
      vaccination_status: pet.vaccinationStatus || 'Up to Date',
      medical_notes: pet.medicalNotes || null,
      feeding_preferences: pet.feedingPreferences || null,
      microchip_id: pet.microchipId || null,
      barcode: pet.barcode || null,
      is_boarding_now: pet.isBoardingNow || false,
      check_in_date: pet.checkInDate || null,
      check_out_date: pet.checkOutDate || null,
      room_no: pet.roomNo || null
    };

    const { data, error } = await supabase
      .from('pets')
      .insert(payload as any)
      .select()
      .single();

    if (error || !data) {
      return { pet: null, error: error?.message || 'Failed to create pet profile' };
    }

    const p = data as any;
    const created: Pet = {
      id: p.pet_id,
      customerId: p.customer_id,
      customerName: p.customer_name || '',
      name: p.pet_name,
      species: (p.species as any) || 'Dog',
      breed: p.breed || '',
      age: p.age || '',
      gender: (p.gender as any) || 'Male',
      vaccinationStatus: (p.vaccination_status as any) || 'Up to Date',
      medicalNotes: p.medical_notes || '',
      feedingPreferences: p.feeding_preferences || '',
      microchipId: p.microchip_id || '',
      barcode: p.barcode || '',
      isBoardingNow: Boolean(p.is_boarding_now),
      checkInDate: p.check_in_date || '',
      checkOutDate: p.check_out_date || '',
      roomNo: p.room_no || ''
    };

    return { pet: created };
  } catch (err: any) {
    return { pet: null, error: err.message };
  }
}

export async function updatePetInSupabase(id: string, updates: Partial<Pet>): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: any = {};
    if (updates.name !== undefined) payload.pet_name = updates.name;
    if (updates.customerId !== undefined) payload.customer_id = updates.customerId;
    if (updates.customerName !== undefined) payload.customer_name = updates.customerName;
    if (updates.species !== undefined) payload.species = updates.species;
    if (updates.breed !== undefined) payload.breed = updates.breed;
    if (updates.age !== undefined) payload.age = updates.age;
    if (updates.gender !== undefined) payload.gender = updates.gender;
    if (updates.vaccinationStatus !== undefined) payload.vaccination_status = updates.vaccinationStatus;
    if (updates.medicalNotes !== undefined) payload.medical_notes = updates.medicalNotes;
    if (updates.feedingPreferences !== undefined) payload.feeding_preferences = updates.feedingPreferences;
    if (updates.isBoardingNow !== undefined) payload.is_boarding_now = updates.isBoardingNow;
    if (updates.checkInDate !== undefined) payload.check_in_date = updates.checkInDate;
    if (updates.checkOutDate !== undefined) payload.check_out_date = updates.checkOutDate;
    if (updates.roomNo !== undefined) payload.room_no = updates.roomNo;

    const { error } = await supabase
      .from('pets')
      .update(payload)
      .eq('pet_id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deletePetFromSupabase(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('pets')
      .delete()
      .eq('pet_id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
