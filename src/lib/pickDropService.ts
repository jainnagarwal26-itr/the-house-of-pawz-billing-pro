// ============================================================
// pickDropService.ts — Pick & Drop Transportation Service
// Project: The House of Pawz – Billing Pro
// ============================================================

import { supabase } from './supabase';
import { 
  PickDropBooking, 
  PickDropStatusHistory, 
  PickDropDriver, 
  PickDropVehicle, 
  PickDropPricingRule, 
  PickDropStatus, 
  PickDropServiceType,
  User 
} from '../types';

const STORAGE_KEYS = {
  BOOKINGS: 'hop_pick_drop_bookings_v1',
  DRIVERS: 'hop_pick_drop_drivers_v1',
  VEHICLES: 'hop_pick_drop_vehicles_v1',
  PRICING: 'hop_pick_drop_pricing_v1',
  HISTORY: 'hop_pick_drop_history_v1'
};

// Initial default drivers
export const INITIAL_DRIVERS: PickDropDriver[] = [
  {
    id: 'drv-001',
    driverId: 'DRV-001',
    name: 'Ramesh Pawar',
    mobile: '9820112233',
    alternateMobile: '9820112244',
    licenseNumber: 'MH02-20190012345',
    licenseExpiry: '2029-05-15',
    emergencyContact: '9819001122 (Wife)',
    isActive: true,
    notes: 'Experienced senior pet driver, specialized in large breeds'
  },
  {
    id: 'drv-002',
    driverId: 'DRV-002',
    name: 'Santosh Shinde',
    mobile: '9833445566',
    licenseNumber: 'MH02-20210087654',
    licenseExpiry: '2031-10-20',
    emergencyContact: '9833445577 (Brother)',
    isActive: true,
    notes: 'Courteous and punctual, trained in cat transportation'
  }
];

// Initial default vehicles
export const INITIAL_VEHICLES: PickDropVehicle[] = [
  {
    id: 'veh-001',
    vehicleId: 'VEH-001',
    vehicleNumber: 'MH-02-DW-4589',
    vehicleType: 'Eeco AC Van',
    capacity: 3,
    isAc: true,
    isPetFriendly: true,
    isActive: true,
    insuranceExpiry: '2027-03-31',
    pucExpiry: '2026-11-30',
    notes: 'Fitted with safety partitions, hygienic non-slip rubber mats & AC'
  },
  {
    id: 'veh-002',
    vehicleId: 'VEH-002',
    vehicleNumber: 'MH-02-FE-8921',
    vehicleType: 'WagonR Pet Cab',
    capacity: 2,
    isAc: true,
    isPetFriendly: true,
    isActive: true,
    insuranceExpiry: '2027-01-15',
    pucExpiry: '2026-12-15',
    notes: 'Clean climate-controlled compact cab for quick single pet drops'
  }
];

// Initial default pricing rules
export const INITIAL_PRICING_RULES: PickDropPricingRule[] = [
  {
    id: 'rule-001',
    ruleName: 'Base One-Way Pickup',
    ruleType: 'FIXED',
    rate: 250.00,
    isActive: true,
    notes: 'Standard one-way pet pickup base rate'
  },
  {
    id: 'rule-002',
    ruleName: 'Base One-Way Drop',
    ruleType: 'FIXED',
    rate: 250.00,
    isActive: true,
    notes: 'Standard one-way pet drop base rate'
  },
  {
    id: 'rule-003',
    ruleName: 'Round Trip (Pickup + Drop)',
    ruleType: 'ROUND_TRIP',
    rate: 450.00,
    isActive: true,
    notes: 'Discounted combined two-way transportation'
  },
  {
    id: 'rule-004',
    ruleName: 'Distance Surcharge (per KM)',
    ruleType: 'PER_KM',
    rate: 20.00,
    isActive: true,
    notes: 'Rate per kilometer beyond base zone'
  },
  {
    id: 'rule-005',
    ruleName: 'Driver Waiting Charge (per 30 min)',
    ruleType: 'WAITING',
    rate: 100.00,
    isActive: true,
    notes: 'Charge for customer waiting over 15 mins'
  },
  {
    id: 'rule-006',
    ruleName: 'Additional Pet Surcharge',
    ruleType: 'PER_PET',
    rate: 150.00,
    isActive: true,
    notes: 'Charge for second or multiple pets in same ride'
  },
  {
    id: 'rule-007',
    ruleName: 'Night Surcharge (After 8 PM)',
    ruleType: 'NIGHT',
    rate: 200.00,
    isActive: true,
    notes: 'After-hours late evening transportation'
  },
  {
    id: 'rule-008',
    ruleName: 'Emergency / Immediate Pickup',
    ruleType: 'EMERGENCY',
    rate: 300.00,
    isActive: true,
    notes: 'Priority emergency dispatch'
  }
];

// Helper: Local Storage Sync
function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`Failed to save ${key} in localStorage:`, err);
  }
}

/**
 * Generate Next Unique Booking ID (e.g. PND-2627-0001)
 */
export function generateNextBookingId(existingBookings: PickDropBooking[]): string {
  const fy = '2627';
  let maxSeq = 0;
  existingBookings.forEach(b => {
    const match = b.bookingId?.match(/PND-\d+-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  });
  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `PND-${fy}-${nextSeq}`;
}

/**
 * Calculate Pricing from Rules
 */
export function calculatePickDropPrice(
  serviceType: PickDropServiceType,
  distanceKm: number,
  waitingMins: number,
  additionalPetsCount: number,
  isNight: boolean,
  isEmergency: boolean,
  rules: PickDropPricingRule[]
): { baseCharge: number; additionalCharges: number; waitingCharges: number; subtotal: number } {
  let baseCharge = 250;
  let additionalCharges = 0;
  let waitingCharges = 0;

  // Base rule lookup
  const isRound = serviceType === 'Pickup + Drop' || serviceType === 'Round Trip' || serviceType === 'Home → HOP → Home';
  const roundRule = rules.find(r => r.ruleType === 'ROUND_TRIP' && r.isActive);
  const fixedPickupRule = rules.find(r => r.ruleType === 'FIXED' && r.isActive && r.ruleName.toLowerCase().includes('pickup'));
  const fixedDropRule = rules.find(r => r.ruleType === 'FIXED' && r.isActive && r.ruleName.toLowerCase().includes('drop'));
  const defaultFixed = rules.find(r => r.ruleType === 'FIXED' && r.isActive);

  if (isRound) {
    baseCharge = roundRule ? roundRule.rate : 450;
  } else if (serviceType.toLowerCase().includes('drop') && fixedDropRule) {
    baseCharge = fixedDropRule.rate;
  } else if (fixedPickupRule) {
    baseCharge = fixedPickupRule.rate;
  } else if (defaultFixed) {
    baseCharge = defaultFixed.rate;
  }

  // Distance Charge
  const kmRule = rules.find(r => r.ruleType === 'PER_KM' && r.isActive);
  if (kmRule && distanceKm > 0) {
    additionalCharges += distanceKm * kmRule.rate;
  }

  // Waiting Charge
  const waitRule = rules.find(r => r.ruleType === 'WAITING' && r.isActive);
  if (waitRule && waitingMins > 0) {
    const slots = Math.ceil(waitingMins / 30);
    waitingCharges += slots * waitRule.rate;
  }

  // Additional Pet Surcharge
  const petRule = rules.find(r => r.ruleType === 'PER_PET' && r.isActive);
  if (petRule && additionalPetsCount > 0) {
    additionalCharges += additionalPetsCount * petRule.rate;
  }

  // Night Surcharge
  const nightRule = rules.find(r => r.ruleType === 'NIGHT' && r.isActive);
  if (nightRule && isNight) {
    additionalCharges += nightRule.rate;
  }

  // Emergency Surcharge
  const emergRule = rules.find(r => r.ruleType === 'EMERGENCY' && r.isActive);
  if (emergRule && isEmergency) {
    additionalCharges += emergRule.rate;
  }

  const subtotal = Math.round((baseCharge + additionalCharges + waitingCharges) * 100) / 100;

  return {
    baseCharge,
    additionalCharges: Math.round(additionalCharges * 100) / 100,
    waitingCharges: Math.round(waitingCharges * 100) / 100,
    subtotal
  };
}

// ==========================================
// SUPABASE + FALLBACK API CALLS
// ==========================================

export async function fetchPickDropBookingsFromSupabase(): Promise<PickDropBooking[]> {
  try {
    const { data, error } = await supabase
      .from('pick_drop_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return getLocal<PickDropBooking[]>(STORAGE_KEYS.BOOKINGS, []);
    }

    const bookings: PickDropBooking[] = data.map((b: any) => ({
      id: b.id,
      bookingId: b.booking_id,
      customerId: b.customer_id,
      customerName: b.customer_name,
      customerPhone: b.customer_phone,
      petId: b.pet_id,
      petName: b.pet_name,
      petSpecies: b.pet_species,
      petBreed: b.pet_breed,
      petWeight: b.pet_weight,
      petHandlingNotes: b.pet_handling_notes,
      serviceType: b.service_type,
      pickupAddress: b.pickup_address,
      pickupLandmark: b.pickup_landmark,
      pickupDate: b.pickup_date,
      preferredPickupTime: b.preferred_pickup_time,
      pickupTimeWindow: b.pickup_time_window,
      pickupContactPerson: b.pickup_contact_person,
      pickupMapsLink: b.pickup_maps_link,
      dropAddress: b.drop_address,
      dropLandmark: b.drop_landmark,
      dropDate: b.drop_date,
      preferredDropTime: b.preferred_drop_time,
      dropContactPerson: b.drop_contact_person,
      dropMapsLink: b.drop_maps_link,
      driverId: b.driver_id,
      driverName: b.driver_name,
      vehicleId: b.vehicle_id,
      vehicleNumber: b.vehicle_number,
      status: b.status,
      actualPickupTime: b.actual_pickup_time,
      pickupConfirmedBy: b.pickup_confirmed_by,
      pickupNote: b.pickup_note,
      actualDeliveryTime: b.actual_delivery_time,
      deliveredTo: b.delivered_to,
      receiverName: b.receiver_name,
      receiverRelationship: b.receiver_relationship,
      deliveryNote: b.delivery_note,
      deliveredBy: b.delivered_by,
      baseCharge: Number(b.base_charge) || 0,
      additionalCharges: Number(b.additional_charges) || 0,
      waitingCharges: Number(b.waiting_charges) || 0,
      subtotal: Number(b.subtotal) || 0,
      invoiceId: b.invoice_id,
      invoiceNumber: b.invoice_number,
      customerNotes: b.customer_notes,
      internalStaffNotes: b.internal_staff_notes,
      createdBy: b.created_by,
      createdAt: b.created_at,
      updatedAt: b.updated_at
    }));

    setLocal(STORAGE_KEYS.BOOKINGS, bookings);
    return bookings;
  } catch {
    return getLocal<PickDropBooking[]>(STORAGE_KEYS.BOOKINGS, []);
  }
}

export async function createPickDropBookingInSupabase(
  booking: PickDropBooking, 
  user: User
): Promise<{ data?: PickDropBooking; error?: string }> {
  try {
    const payload = {
      booking_id: booking.bookingId,
      customer_id: booking.customerId,
      customer_name: booking.customerName,
      customer_phone: booking.customerPhone,
      pet_id: booking.petId,
      pet_name: booking.petName,
      pet_species: booking.petSpecies || '',
      pet_breed: booking.petBreed || '',
      pet_weight: booking.petWeight || '',
      pet_handling_notes: booking.petHandlingNotes || '',
      service_type: booking.serviceType,
      pickup_address: booking.pickupAddress,
      pickup_landmark: booking.pickupLandmark || '',
      pickup_date: booking.pickupDate,
      preferred_pickup_time: booking.preferredPickupTime,
      pickup_time_window: booking.pickupTimeWindow || '',
      pickup_contact_person: booking.pickupContactPerson || '',
      pickup_maps_link: booking.pickupMapsLink || '',
      drop_address: booking.dropAddress,
      drop_landmark: booking.dropLandmark || '',
      drop_date: booking.dropDate,
      preferred_drop_time: booking.preferredDropTime,
      drop_contact_person: booking.dropContactPerson || '',
      drop_maps_link: booking.dropMapsLink || '',
      driver_id: booking.driverId || null,
      driver_name: booking.driverName || null,
      vehicle_id: booking.vehicleId || null,
      vehicle_number: booking.vehicleNumber || null,
      status: booking.status || 'REQUESTED',
      base_charge: booking.baseCharge,
      additional_charges: booking.additionalCharges,
      waiting_charges: booking.waitingCharges,
      subtotal: booking.subtotal,
      invoice_id: booking.invoiceId || null,
      invoice_number: booking.invoiceNumber || null,
      customer_notes: booking.customerNotes || '',
      internal_staff_notes: booking.internalStaffNotes || '',
      created_by: user.name || user.username
    };

    const { data, error } = await supabase
      .from('pick_drop_bookings')
      .insert([payload])
      .select()
      .single();

    // Log initial status history
    await logPickDropStatusHistory(booking.bookingId, booking.status, user.name || user.username, 'Trip Booking Created');

    // Local state fallback update
    const current = getLocal<PickDropBooking[]>(STORAGE_KEYS.BOOKINGS, []);
    const savedBooking = { ...booking, id: data?.id || booking.id };
    setLocal(STORAGE_KEYS.BOOKINGS, [savedBooking, ...current.filter(b => b.bookingId !== booking.bookingId)]);

    if (error) {
      console.warn('Supabase pick_drop_bookings insert notice (using local mirror):', error.message);
      return { data: savedBooking };
    }

    return { data: savedBooking };
  } catch (err: any) {
    const current = getLocal<PickDropBooking[]>(STORAGE_KEYS.BOOKINGS, []);
    setLocal(STORAGE_KEYS.BOOKINGS, [booking, ...current.filter(b => b.bookingId !== booking.bookingId)]);
    return { data: booking };
  }
}

export async function updatePickDropBookingStatus(
  bookingId: string,
  newStatus: PickDropStatus,
  note: string | undefined,
  user: User,
  extraPayload?: Partial<PickDropBooking>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateFields: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (extraPayload?.driverId !== undefined) updateFields.driver_id = extraPayload.driverId;
    if (extraPayload?.driverName !== undefined) updateFields.driver_name = extraPayload.driverName;
    if (extraPayload?.vehicleId !== undefined) updateFields.vehicle_id = extraPayload.vehicleId;
    if (extraPayload?.vehicleNumber !== undefined) updateFields.vehicle_number = extraPayload.vehicleNumber;
    if (extraPayload?.actualPickupTime !== undefined) updateFields.actual_pickup_time = extraPayload.actualPickupTime;
    if (extraPayload?.pickupConfirmedBy !== undefined) updateFields.pickup_confirmed_by = extraPayload.pickupConfirmedBy;
    if (extraPayload?.pickupNote !== undefined) updateFields.pickup_note = extraPayload.pickupNote;
    if (extraPayload?.actualDeliveryTime !== undefined) updateFields.actual_delivery_time = extraPayload.actualDeliveryTime;
    if (extraPayload?.deliveredTo !== undefined) updateFields.delivered_to = extraPayload.deliveredTo;
    if (extraPayload?.receiverName !== undefined) updateFields.receiver_name = extraPayload.receiverName;
    if (extraPayload?.receiverRelationship !== undefined) updateFields.receiver_relationship = extraPayload.receiverRelationship;
    if (extraPayload?.deliveryNote !== undefined) updateFields.delivery_note = extraPayload.deliveryNote;
    if (extraPayload?.deliveredBy !== undefined) updateFields.delivered_by = extraPayload.deliveredBy;
    if (extraPayload?.invoiceId !== undefined) updateFields.invoice_id = extraPayload.invoiceId;
    if (extraPayload?.invoiceNumber !== undefined) updateFields.invoice_number = extraPayload.invoiceNumber;

    await supabase
      .from('pick_drop_bookings')
      .update(updateFields)
      .eq('booking_id', bookingId);

    await logPickDropStatusHistory(bookingId, newStatus, user.name || user.username, note);

    // Update local mirror
    const current = getLocal<PickDropBooking[]>(STORAGE_KEYS.BOOKINGS, []);
    const updated = current.map(b => {
      if (b.bookingId === bookingId) {
        return {
          ...b,
          ...extraPayload,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return b;
    });
    setLocal(STORAGE_KEYS.BOOKINGS, updated);

    return { success: true };
  } catch (err: any) {
    // Update local mirror on error
    const current = getLocal<PickDropBooking[]>(STORAGE_KEYS.BOOKINGS, []);
    const updated = current.map(b => b.bookingId === bookingId ? { ...b, ...extraPayload, status: newStatus } : b);
    setLocal(STORAGE_KEYS.BOOKINGS, updated);
    return { success: true };
  }
}

export async function updatePickDropBooking(
  booking: PickDropBooking, 
  user: User
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      customer_id: booking.customerId,
      customer_name: booking.customerName,
      customer_phone: booking.customerPhone,
      pet_id: booking.petId,
      pet_name: booking.petName,
      pet_species: booking.petSpecies || '',
      pet_breed: booking.petBreed || '',
      pet_weight: booking.petWeight || '',
      pet_handling_notes: booking.petHandlingNotes || '',
      service_type: booking.serviceType,
      pickup_address: booking.pickupAddress,
      pickup_landmark: booking.pickupLandmark || '',
      pickup_date: booking.pickupDate,
      preferred_pickup_time: booking.preferredPickupTime,
      pickup_time_window: booking.pickupTimeWindow || '',
      pickup_contact_person: booking.pickupContactPerson || '',
      pickup_maps_link: booking.pickupMapsLink || '',
      drop_address: booking.dropAddress,
      drop_landmark: booking.dropLandmark || '',
      drop_date: booking.dropDate,
      preferred_drop_time: booking.preferredDropTime,
      drop_contact_person: booking.dropContactPerson || '',
      drop_maps_link: booking.dropMapsLink || '',
      driver_id: booking.driverId || null,
      driver_name: booking.driverName || null,
      vehicle_id: booking.vehicleId || null,
      vehicle_number: booking.vehicleNumber || null,
      base_charge: booking.baseCharge,
      additional_charges: booking.additionalCharges,
      waiting_charges: booking.waitingCharges,
      subtotal: booking.subtotal,
      invoice_id: booking.invoiceId || null,
      invoice_number: booking.invoiceNumber || null,
      customer_notes: booking.customerNotes || '',
      internal_staff_notes: booking.internalStaffNotes || '',
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('pick_drop_bookings')
      .update(payload)
      .eq('booking_id', booking.bookingId);

    const current = getLocal<PickDropBooking[]>(STORAGE_KEYS.BOOKINGS, []);
    setLocal(STORAGE_KEYS.BOOKINGS, current.map(b => b.bookingId === booking.bookingId ? booking : b));
    return { success: true };
  } catch (err: any) {
    const current = getLocal<PickDropBooking[]>(STORAGE_KEYS.BOOKINGS, []);
    setLocal(STORAGE_KEYS.BOOKINGS, current.map(b => b.bookingId === booking.bookingId ? booking : b));
    return { success: true };
  }
}

export async function deletePickDropBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase
      .from('pick_drop_bookings')
      .delete()
      .eq('booking_id', bookingId);

    const current = getLocal<PickDropBooking[]>(STORAGE_KEYS.BOOKINGS, []);
    setLocal(STORAGE_KEYS.BOOKINGS, current.filter(b => b.bookingId !== bookingId));
    return { success: true };
  } catch (err: any) {
    const current = getLocal<PickDropBooking[]>(STORAGE_KEYS.BOOKINGS, []);
    setLocal(STORAGE_KEYS.BOOKINGS, current.filter(b => b.bookingId !== bookingId));
    return { success: true };
  }
}

// Status History
export async function logPickDropStatusHistory(
  bookingId: string,
  status: PickDropStatus,
  changedBy: string,
  notes?: string
): Promise<void> {
  const historyItem: PickDropStatusHistory = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    bookingId,
    status,
    changedBy,
    changedAt: new Date().toISOString(),
    notes
  };

  try {
    await supabase.from('pick_drop_status_history').insert([{
      booking_id: bookingId,
      status,
      changed_by: changedBy,
      notes: notes || null
    }]);
  } catch {
    // Ignore DB error, sync with local mirror
  }

  const allHist = getLocal<PickDropStatusHistory[]>(STORAGE_KEYS.HISTORY, []);
  setLocal(STORAGE_KEYS.HISTORY, [historyItem, ...allHist]);
}

export async function fetchStatusHistoryForBooking(bookingId: string): Promise<PickDropStatusHistory[]> {
  try {
    const { data } = await supabase
      .from('pick_drop_status_history')
      .select('*')
      .eq('booking_id', bookingId)
      .order('changed_at', { ascending: true });

    if (data && data.length > 0) {
      return data.map((h: any) => ({
        id: h.id,
        bookingId: h.booking_id,
        status: h.status,
        changedBy: h.changed_by,
        changedAt: h.changed_at,
        notes: h.notes
      }));
    }
  } catch {
    // Fallback to local
  }

  const allHist = getLocal<PickDropStatusHistory[]>(STORAGE_KEYS.HISTORY, []);
  return allHist.filter(h => h.bookingId === bookingId);
}

// Drivers Master
export async function fetchPickDropDrivers(): Promise<PickDropDriver[]> {
  try {
    const { data } = await supabase.from('pick_drop_drivers').select('*').order('name');
    if (data && data.length > 0) {
      const drivers: PickDropDriver[] = data.map((d: any) => ({
        id: d.id,
        driverId: d.driver_id,
        name: d.name,
        mobile: d.mobile,
        alternateMobile: d.alternate_mobile,
        licenseNumber: d.license_number,
        licenseExpiry: d.license_expiry,
        emergencyContact: d.emergency_contact,
        isActive: d.is_active,
        notes: d.notes,
        createdAt: d.created_at
      }));
      setLocal(STORAGE_KEYS.DRIVERS, drivers);
      return drivers;
    }
  } catch {}
  return getLocal<PickDropDriver[]>(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
}

export async function savePickDropDriver(driver: PickDropDriver): Promise<{ data?: PickDropDriver; error?: string }> {
  try {
    const payload = {
      driver_id: driver.driverId,
      name: driver.name,
      mobile: driver.mobile,
      alternate_mobile: driver.alternateMobile || null,
      license_number: driver.licenseNumber || null,
      license_expiry: driver.licenseExpiry || null,
      emergency_contact: driver.emergencyContact || null,
      is_active: driver.isActive,
      notes: driver.notes || null,
      updated_at: new Date().toISOString()
    };

    if (driver.id && !driver.id.startsWith('drv-')) {
      await supabase.from('pick_drop_drivers').update(payload).eq('id', driver.id);
    } else {
      const { data } = await supabase.from('pick_drop_drivers').insert([payload]).select().single();
      if (data) driver.id = data.id;
    }
  } catch {}

  const current = getLocal<PickDropDriver[]>(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
  const updated = [driver, ...current.filter(d => d.driverId !== driver.driverId)];
  setLocal(STORAGE_KEYS.DRIVERS, updated);
  return { data: driver };
}

// Vehicles Master
export async function fetchPickDropVehicles(): Promise<PickDropVehicle[]> {
  try {
    const { data } = await supabase.from('pick_drop_vehicles').select('*').order('vehicle_number');
    if (data && data.length > 0) {
      const vehicles: PickDropVehicle[] = data.map((v: any) => ({
        id: v.id,
        vehicleId: v.vehicle_id,
        vehicleNumber: v.vehicle_number,
        vehicleType: v.vehicle_type,
        capacity: v.capacity,
        isAc: v.is_ac,
        isPetFriendly: v.is_pet_friendly,
        isActive: v.is_active,
        insuranceExpiry: v.insurance_expiry,
        pucExpiry: v.puc_expiry,
        notes: v.notes,
        createdAt: v.created_at
      }));
      setLocal(STORAGE_KEYS.VEHICLES, vehicles);
      return vehicles;
    }
  } catch {}
  return getLocal<PickDropVehicle[]>(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES);
}

export async function savePickDropVehicle(vehicle: PickDropVehicle): Promise<{ data?: PickDropVehicle; error?: string }> {
  try {
    const payload = {
      vehicle_id: vehicle.vehicleId,
      vehicle_number: vehicle.vehicleNumber,
      vehicle_type: vehicle.vehicleType,
      capacity: vehicle.capacity,
      is_ac: vehicle.isAc,
      is_pet_friendly: vehicle.isPetFriendly,
      is_active: vehicle.isActive,
      insurance_expiry: vehicle.insuranceExpiry || null,
      puc_expiry: vehicle.pucExpiry || null,
      notes: vehicle.notes || null,
      updated_at: new Date().toISOString()
    };

    if (vehicle.id && !vehicle.id.startsWith('veh-')) {
      await supabase.from('pick_drop_vehicles').update(payload).eq('id', vehicle.id);
    } else {
      const { data } = await supabase.from('pick_drop_vehicles').insert([payload]).select().single();
      if (data) vehicle.id = data.id;
    }
  } catch {}

  const current = getLocal<PickDropVehicle[]>(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES);
  const updated = [vehicle, ...current.filter(v => v.vehicleId !== vehicle.vehicleId)];
  setLocal(STORAGE_KEYS.VEHICLES, updated);
  return { data: vehicle };
}

// Pricing Rules
export async function fetchPickDropPricingRules(): Promise<PickDropPricingRule[]> {
  try {
    const { data } = await supabase.from('pick_drop_pricing_rules').select('*').order('rule_name');
    if (data && data.length > 0) {
      const rules: PickDropPricingRule[] = data.map((r: any) => ({
        id: r.id,
        ruleName: r.rule_name,
        ruleType: r.rule_type,
        rate: Number(r.rate) || 0,
        isActive: r.is_active,
        effectiveFrom: r.effective_from,
        notes: r.notes,
        createdAt: r.created_at
      }));
      setLocal(STORAGE_KEYS.PRICING, rules);
      return rules;
    }
  } catch {}
  return getLocal<PickDropPricingRule[]>(STORAGE_KEYS.PRICING, INITIAL_PRICING_RULES);
}

export async function savePickDropPricingRule(rule: PickDropPricingRule): Promise<{ data?: PickDropPricingRule; error?: string }> {
  try {
    const payload = {
      rule_name: rule.ruleName,
      rule_type: rule.ruleType,
      rate: rule.rate,
      is_active: rule.isActive,
      effective_from: rule.effectiveFrom || new Date().toISOString().split('T')[0],
      notes: rule.notes || null,
      updated_at: new Date().toISOString()
    };

    if (rule.id && !rule.id.startsWith('rule-')) {
      await supabase.from('pick_drop_pricing_rules').update(payload).eq('id', rule.id);
    } else {
      const { data } = await supabase.from('pick_drop_pricing_rules').insert([payload]).select().single();
      if (data) rule.id = data.id;
    }
  } catch {}

  const current = getLocal<PickDropPricingRule[]>(STORAGE_KEYS.PRICING, INITIAL_PRICING_RULES);
  const updated = [rule, ...current.filter(r => r.id !== rule.id && r.ruleName !== rule.ruleName)];
  setLocal(STORAGE_KEYS.PRICING, updated);
  return { data: rule };
}
