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
  PickDropRecurringSchedule,
  User 
} from '../types';

const STORAGE_KEYS = {
  BOOKINGS: 'hop_pick_drop_bookings_v1',
  DRIVERS: 'hop_pick_drop_drivers_v1',
  VEHICLES: 'hop_pick_drop_vehicles_v1',
  PRICING: 'hop_pick_drop_pricing_v1',
  HISTORY: 'hop_pick_drop_history_v1',
  RECURRING: 'hop_pick_drop_recurring_v2'
};

// Initial collections are 100% empty — Supabase DB is the Single Source of Truth
export const INITIAL_DRIVERS: PickDropDriver[] = [];
export const INITIAL_VEHICLES: PickDropVehicle[] = [];
export const INITIAL_PRICING_RULES: PickDropPricingRule[] = [];

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
 * Generate Sequence ID for Bookings (e.g. PND-2627-0001)
 */
export function generateNextBookingId(existingBookings: PickDropBooking[], fy: string = '26-27'): string {
  let maxSeq = 0;
  existingBookings.forEach(b => {
    if (b.bookingId && b.bookingId.startsWith(`PND-${fy}-`)) {
      const numPart = parseInt(b.bookingId.replace(`PND-${fy}-`, ''), 10);
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  });
  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `PND-${fy}-${nextSeq}`;
}

export interface PickDropPriceBreakdown {
  baseCharge: number;
  distanceCharge: number;
  additionalPetsCharge: number;
  additionalStopsCharge: number;
  waitingCharge: number;
  nightCharge: number;
  holidayCharge: number;
  emergencyCharge: number;
  additionalCharges: number;
  waitingCharges: number;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
}

/**
 * Calculate Pricing from Rules with Comprehensive Breakdown
 */
export function calculatePickDropPrice(
  serviceType: PickDropServiceType,
  distanceKm: number,
  waitingMins: number,
  additionalPetsCount: number,
  isNight: boolean,
  isEmergency: boolean,
  rules: PickDropPricingRule[],
  isHoliday: boolean = false,
  additionalStopsCount: number = 0
): PickDropPriceBreakdown {
  let baseCharge = 250;
  let distanceCharge = 0;
  let additionalPetsCharge = 0;
  let additionalStopsCharge = 0;
  let waitingCharge = 0;
  let nightCharge = 0;
  let holidayCharge = 0;
  let emergencyCharge = 0;

  // Base rule lookup
  const isRound = serviceType === 'Pickup + Drop' || serviceType === 'Round Trip' || serviceType === 'Home → HOP → Home';
  const roundRule = rules.find(r => (r.ruleType === 'ROUND_TRIP') && r.isActive);
  const oneWayRule = rules.find(r => (r.ruleType === 'ONE_WAY' || r.ruleType === 'FIXED') && r.isActive);
  const fixedPickupRule = rules.find(r => r.ruleType === 'FIXED' && r.isActive && r.ruleName.toLowerCase().includes('pickup'));
  const fixedDropRule = rules.find(r => r.ruleType === 'FIXED' && r.isActive && r.ruleName.toLowerCase().includes('drop'));

  if (isRound) {
    baseCharge = roundRule ? roundRule.rate : 0;
  } else if (serviceType.toLowerCase().includes('drop') && fixedDropRule) {
    baseCharge = fixedDropRule.rate;
  } else if (fixedPickupRule) {
    baseCharge = fixedPickupRule.rate;
  } else if (oneWayRule) {
    baseCharge = oneWayRule.rate;
  }

  // Distance Charge
  const kmRule = rules.find(r => r.ruleType === 'PER_KM' && r.isActive);
  if (kmRule && distanceKm > 0) {
    distanceCharge = distanceKm * kmRule.rate;
  }

  // Waiting Charge
  const waitRule = rules.find(r => r.ruleType === 'WAITING' && r.isActive);
  if (waitRule && waitingMins > 0) {
    const slots = Math.ceil(waitingMins / 30);
    waitingCharge = slots * waitRule.rate;
  }

  // Additional Pet Surcharge
  const petRule = rules.find(r => (r.ruleType === 'PER_PET' || r.ruleType === 'MULTI_PET') && r.isActive);
  if (petRule && additionalPetsCount > 0) {
    additionalPetsCharge = additionalPetsCount * petRule.rate;
  }

  // Additional Stop Surcharge
  const stopRule = rules.find(r => (r.ruleType === 'ADDITIONAL_STOP' || r.ruleType === 'ADDITIONAL') && r.isActive);
  if (stopRule && additionalStopsCount > 0) {
    additionalStopsCharge = additionalStopsCount * stopRule.rate;
  }

  // Night Surcharge
  const nightRule = rules.find(r => r.ruleType === 'NIGHT' && r.isActive);
  if (nightRule && isNight) {
    nightCharge = nightRule.rate;
  }

  // Holiday Surcharge
  const holidayRule = rules.find(r => r.ruleType === 'HOLIDAY' && r.isActive);
  if (holidayRule && isHoliday) {
    holidayCharge = holidayRule.rate;
  }

  // Emergency Surcharge
  const emergRule = rules.find(r => r.ruleType === 'EMERGENCY' && r.isActive);
  if (emergRule && isEmergency) {
    emergencyCharge = emergRule.rate;
  }

  const additionalCharges = Math.round((distanceCharge + additionalPetsCharge + additionalStopsCharge + nightCharge + holidayCharge + emergencyCharge) * 100) / 100;
  const subtotal = Math.round((baseCharge + additionalCharges + waitingCharge) * 100) / 100;
  const gstAmount = Math.round(subtotal * 0.18 * 100) / 100;
  const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;

  return {
    baseCharge: Math.round(baseCharge * 100) / 100,
    distanceCharge: Math.round(distanceCharge * 100) / 100,
    additionalPetsCharge: Math.round(additionalPetsCharge * 100) / 100,
    additionalStopsCharge: Math.round(additionalStopsCharge * 100) / 100,
    waitingCharge: Math.round(waitingCharge * 100) / 100,
    nightCharge: Math.round(nightCharge * 100) / 100,
    holidayCharge: Math.round(holidayCharge * 100) / 100,
    emergencyCharge: Math.round(emergencyCharge * 100) / 100,
    additionalCharges,
    waitingCharges: Math.round(waitingCharge * 100) / 100,
    subtotal,
    gstAmount,
    grandTotal
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
      distanceKm: Number(b.distance_km) || 0,
      additionalPetsCount: Number(b.additional_pets_count) || 0,
      additionalStopsCount: Number(b.additional_stops_count) || 0,
      waitingMinutes: Number(b.waiting_minutes) || 0,
      isNight: !!b.is_night,
      isHoliday: !!b.is_holiday,
      isEmergency: !!b.is_emergency,
      recurringScheduleId: b.recurring_schedule_id,
      emergencyContact: b.emergency_contact,
      bookingSource: b.booking_source || 'Phone',
      priority: b.priority || 'Normal',
      preferredVehicleType: b.preferred_vehicle_type,
      preferredDriverId: b.preferred_driver_id,
      statusChangedBy: b.status_changed_by,
      statusChangedAt: b.status_changed_at,
      operationalNote: b.operational_note,
      delayReason: b.delay_reason,
      cancellationReason: b.cancellation_reason,
      failureReason: b.failure_reason,
      estimatedPickupTime: b.estimated_pickup_time,
      estimatedDeliveryTime: b.estimated_delivery_time,
      delayMinutes: Number(b.delay_minutes) || 0,
      delayStatus: b.delay_status || 'ON_TIME',
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
      recurring_schedule_id: booking.recurringScheduleId || null,
      customer_id: booking.customerId,
      customer_name: booking.customerName,
      customer_phone: booking.customerPhone,
      pet_id: booking.petId,
      pet_name: booking.petName,
      pet_species: booking.petSpecies || '',
      pet_breed: booking.petBreed || '',
      pet_weight: booking.petWeight || '',
      pet_handling_notes: booking.petHandlingNotes || '',
      emergency_contact: booking.emergencyContact || null,
      booking_source: booking.bookingSource || 'Phone',
      priority: booking.priority || 'Normal',
      preferred_vehicle_type: booking.preferredVehicleType || null,
      preferred_driver_id: booking.preferredDriverId || null,
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
      status_changed_by: user.name || user.username,
      status_changed_at: new Date().toISOString(),
      operational_note: booking.operationalNote || null,
      estimated_pickup_time: booking.estimatedPickupTime || booking.preferredPickupTime,
      estimated_delivery_time: booking.estimatedDeliveryTime || booking.preferredDropTime,
      delay_minutes: booking.delayMinutes || 0,
      delay_status: booking.delayStatus || 'ON_TIME',
      distance_km: booking.distanceKm || 0,
      additional_pets_count: booking.additionalPetsCount || 0,
      additional_stops_count: booking.additionalStopsCount || 0,
      waiting_minutes: booking.waitingMinutes || 0,
      is_night: !!booking.isNight,
      is_holiday: !!booking.isHoliday,
      is_emergency: !!booking.isEmergency,
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
    if (extraPayload?.statusChangedBy !== undefined) updateFields.status_changed_by = extraPayload.statusChangedBy;
    if (extraPayload?.statusChangedAt !== undefined) updateFields.status_changed_at = extraPayload.statusChangedAt;
    if (extraPayload?.operationalNote !== undefined) updateFields.operational_note = extraPayload.operationalNote;
    if (extraPayload?.delayReason !== undefined) updateFields.delay_reason = extraPayload.delayReason;
    if (extraPayload?.cancellationReason !== undefined) updateFields.cancellation_reason = extraPayload.cancellationReason;
    if (extraPayload?.failureReason !== undefined) updateFields.failure_reason = extraPayload.failureReason;
    if (extraPayload?.estimatedPickupTime !== undefined) updateFields.estimated_pickup_time = extraPayload.estimatedPickupTime;
    if (extraPayload?.estimatedDeliveryTime !== undefined) updateFields.estimated_delivery_time = extraPayload.estimatedDeliveryTime;
    if (extraPayload?.delayMinutes !== undefined) updateFields.delay_minutes = extraPayload.delayMinutes;
    if (extraPayload?.delayStatus !== undefined) updateFields.delay_status = extraPayload.delayStatus;
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
      emergency_contact: booking.emergencyContact || null,
      booking_source: booking.bookingSource || 'Phone',
      priority: booking.priority || 'Normal',
      preferred_vehicle_type: booking.preferredVehicleType || null,
      preferred_driver_id: booking.preferredDriverId || null,
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
      estimated_pickup_time: booking.estimatedPickupTime || booking.preferredPickupTime,
      estimated_delivery_time: booking.estimatedDeliveryTime || booking.preferredDropTime,
      delay_minutes: booking.delayMinutes || 0,
      delay_status: booking.delayStatus || 'ON_TIME',
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
    setLocal(STORAGE_KEYS.DRIVERS, []);
    return [];
  } catch {
    return getLocal<PickDropDriver[]>(STORAGE_KEYS.DRIVERS, []);
  }
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

    if (driver.id && !driver.id.startsWith('drv-local-')) {
      await supabase.from('pick_drop_drivers').update(payload).eq('id', driver.id);
    } else {
      const { data } = await supabase.from('pick_drop_drivers').insert([payload]).select().single();
      if (data) driver.id = data.id;
    }
  } catch (err: any) {
    console.warn('savePickDropDriver database notice:', err?.message);
  }

  const current = getLocal<PickDropDriver[]>(STORAGE_KEYS.DRIVERS, []);
  const updated = [driver, ...current.filter(d => d.driverId !== driver.driverId)];
  setLocal(STORAGE_KEYS.DRIVERS, updated);
  return { data: driver };
}

export async function deletePickDropDriver(driverId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.from('pick_drop_drivers').delete().eq('driver_id', driverId);
  } catch (err: any) {
    console.warn('deletePickDropDriver notice:', err?.message);
  }

  const current = getLocal<PickDropDriver[]>(STORAGE_KEYS.DRIVERS, []);
  const updated = current.filter(d => d.driverId !== driverId);
  setLocal(STORAGE_KEYS.DRIVERS, updated);
  return { success: true };
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
    setLocal(STORAGE_KEYS.VEHICLES, []);
    return [];
  } catch {
    return getLocal<PickDropVehicle[]>(STORAGE_KEYS.VEHICLES, []);
  }
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

    if (vehicle.id && !vehicle.id.startsWith('veh-local-')) {
      await supabase.from('pick_drop_vehicles').update(payload).eq('id', vehicle.id);
    } else {
      const { data } = await supabase.from('pick_drop_vehicles').insert([payload]).select().single();
      if (data) vehicle.id = data.id;
    }
  } catch (err: any) {
    console.warn('savePickDropVehicle database notice:', err?.message);
  }

  const current = getLocal<PickDropVehicle[]>(STORAGE_KEYS.VEHICLES, []);
  const updated = [vehicle, ...current.filter(v => v.vehicleId !== vehicle.vehicleId)];
  setLocal(STORAGE_KEYS.VEHICLES, updated);
  return { data: vehicle };
}

export async function deletePickDropVehicle(vehicleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.from('pick_drop_vehicles').delete().eq('vehicle_id', vehicleId);
  } catch (err: any) {
    console.warn('deletePickDropVehicle notice:', err?.message);
  }

  const current = getLocal<PickDropVehicle[]>(STORAGE_KEYS.VEHICLES, []);
  const updated = current.filter(v => v.vehicleId !== vehicleId);
  setLocal(STORAGE_KEYS.VEHICLES, updated);
  return { success: true };
}

// Pricing Rules
export async function fetchPickDropPricingRules(): Promise<PickDropPricingRule[]> {
  try {
    const { data } = await supabase.from('pick_drop_pricing_rules').select('*').order('rule_name');
    if (data) {
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
  return getLocal<PickDropPricingRule[]>(STORAGE_KEYS.PRICING, []);
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

    if (rule.id && !rule.id.startsWith('rule-local-') && !rule.id.startsWith('rule-00')) {
      const { data, error } = await supabase.from('pick_drop_pricing_rules').update(payload).eq('id', rule.id).select().single();
      if (data) {
        rule.id = data.id;
        rule.effectiveFrom = data.effective_from;
      }
      if (error) {
        console.error('Error updating pricing rule:', error);
      }
    } else {
      const { data, error } = await supabase.from('pick_drop_pricing_rules').insert([payload]).select().single();
      if (data) {
        rule.id = data.id;
        rule.effectiveFrom = data.effective_from;
      }
      if (error) {
        console.error('Error inserting pricing rule:', error);
      }
    }
  } catch (err) {
    console.error('savePickDropPricingRule exception:', err);
  }

  const current = getLocal<PickDropPricingRule[]>(STORAGE_KEYS.PRICING, []);
  const updated = [rule, ...current.filter(r => r.id !== rule.id && r.ruleName !== rule.ruleName)];
  setLocal(STORAGE_KEYS.PRICING, updated);
  return { data: rule };
}

export async function deletePickDropPricingRule(ruleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (ruleId && !ruleId.startsWith('rule-local-')) {
      const { error } = await supabase.from('pick_drop_pricing_rules').delete().eq('id', ruleId);
      if (error) {
        console.error('Error deleting pricing rule from DB:', error);
      }
    }
  } catch (err) {
    console.error('deletePickDropPricingRule exception:', err);
  }

  const current = getLocal<PickDropPricingRule[]>(STORAGE_KEYS.PRICING, []);
  const updated = current.filter(r => r.id !== ruleId);
  setLocal(STORAGE_KEYS.PRICING, updated);
  return { success: true };
}

// ==========================================
// PHASE 2: RECURRING TRANSIT SCHEDULES
// ==========================================

export async function fetchPickDropRecurringSchedules(): Promise<PickDropRecurringSchedule[]> {
  try {
    const { data, error } = await supabase
      .from('pick_drop_recurring_schedules')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const schedules: PickDropRecurringSchedule[] = data.map((r: any) => ({
        id: r.id,
        scheduleId: r.schedule_id,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        petId: r.pet_id,
        petName: r.pet_name,
        serviceType: r.service_type,
        pickupAddress: r.pickup_address,
        dropAddress: r.drop_address,
        preferredPickupTime: r.preferred_pickup_time,
        preferredDropTime: r.preferred_drop_time,
        pattern: r.pattern,
        daysOfWeek: r.days_of_week || [],
        startDate: r.start_date,
        endDate: r.end_date,
        driverId: r.driver_id,
        driverName: r.driver_name,
        vehicleId: r.vehicle_id,
        vehicleNumber: r.vehicle_number,
        estimatedBaseCharge: Number(r.estimated_base_charge) || 0,
        isActive: r.is_active,
        notes: r.notes,
        createdAt: r.created_at,
        lastGeneratedDate: r.last_generated_date
      }));
      setLocal(STORAGE_KEYS.RECURRING, schedules);
      return schedules;
    }
  } catch {}
  return getLocal<PickDropRecurringSchedule[]>(STORAGE_KEYS.RECURRING, []);
}

export async function savePickDropRecurringSchedule(
  schedule: PickDropRecurringSchedule
): Promise<{ data?: PickDropRecurringSchedule; error?: string }> {
  try {
    const payload = {
      schedule_id: schedule.scheduleId,
      customer_id: schedule.customerId,
      customer_name: schedule.customerName,
      customer_phone: schedule.customerPhone,
      pet_id: schedule.petId,
      pet_name: schedule.petName,
      service_type: schedule.serviceType,
      pickup_address: schedule.pickupAddress,
      drop_address: schedule.dropAddress,
      preferred_pickup_time: schedule.preferredPickupTime,
      preferred_drop_time: schedule.preferredDropTime,
      pattern: schedule.pattern,
      days_of_week: schedule.daysOfWeek || [],
      start_date: schedule.startDate,
      end_date: schedule.endDate || null,
      driver_id: schedule.driverId || null,
      driver_name: schedule.driverName || null,
      vehicle_id: schedule.vehicleId || null,
      vehicle_number: schedule.vehicleNumber || null,
      estimated_base_charge: schedule.estimatedBaseCharge,
      is_active: schedule.isActive,
      notes: schedule.notes || null,
      last_generated_date: schedule.lastGeneratedDate || null,
      updated_at: new Date().toISOString()
    };

    if (schedule.id && !schedule.id.startsWith('rec-local-')) {
      await supabase.from('pick_drop_recurring_schedules').update(payload).eq('id', schedule.id);
    } else {
      const { data } = await supabase.from('pick_drop_recurring_schedules').insert([payload]).select().single();
      if (data) schedule.id = data.id;
    }
  } catch {}

  const current = getLocal<PickDropRecurringSchedule[]>(STORAGE_KEYS.RECURRING, []);
  const updated = [schedule, ...current.filter(s => s.scheduleId !== schedule.scheduleId)];
  setLocal(STORAGE_KEYS.RECURRING, updated);
  return { data: schedule };
}

export async function deletePickDropRecurringSchedule(scheduleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.from('pick_drop_recurring_schedules').delete().eq('schedule_id', scheduleId);
  } catch {}

  const current = getLocal<PickDropRecurringSchedule[]>(STORAGE_KEYS.RECURRING, []);
  const updated = current.filter(s => s.scheduleId !== scheduleId);
  setLocal(STORAGE_KEYS.RECURRING, updated);
  return { success: true };
}

/**
 * Generate Upcoming Bookings for Next 7 Days from Recurring Schedule
 */
export function generateUpcomingBookingsForRecurring(
  schedule: PickDropRecurringSchedule,
  existingBookings: PickDropBooking[],
  horizonDays: number = 7,
  user?: User
): PickDropBooking[] {
  const generated: PickDropBooking[] = [];
  const today = new Date();
  
  for (let i = 0; i < horizonDays; i++) {
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + i);
    const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayOfWeek = targetDate.getDay() === 0 ? 7 : targetDate.getDay(); // 1=Mon ... 7=Sun

    if (schedule.startDate && dateStr < schedule.startDate) continue;
    if (schedule.endDate && dateStr > schedule.endDate) continue;

    let shouldGenerate = false;

    if (schedule.pattern === 'DAILY') {
      shouldGenerate = true;
    } else if (schedule.pattern === 'ALTERNATE_DAYS') {
      const start = new Date(schedule.startDate);
      const diffDays = Math.round((targetDate.getTime() - start.getTime()) / (1000 * 3600 * 24));
      if (diffDays % 2 === 0) shouldGenerate = true;
    } else if (schedule.pattern === 'WEEKLY') {
      const start = new Date(schedule.startDate);
      const startDay = start.getDay() === 0 ? 7 : start.getDay();
      if (dayOfWeek === startDay) shouldGenerate = true;
    } else if (schedule.pattern === 'CUSTOM_DAYS') {
      if (schedule.daysOfWeek && schedule.daysOfWeek.includes(dayOfWeek)) {
        shouldGenerate = true;
      }
    }

    if (shouldGenerate) {
      // Check if a booking already exists for this schedule & date
      const alreadyExists = existingBookings.some(
        b => b.recurringScheduleId === schedule.scheduleId && b.pickupDate === dateStr && b.status !== 'CANCELLED'
      );

      if (!alreadyExists) {
        const newBookingId = generateNextBookingId([...existingBookings, ...generated]);
        generated.push({
          id: `pnd-rec-${Date.now()}-${i}`,
          bookingId: newBookingId,
          recurringScheduleId: schedule.scheduleId,
          customerId: schedule.customerId,
          customerName: schedule.customerName,
          customerPhone: schedule.customerPhone,
          petId: schedule.petId,
          petName: schedule.petName,
          serviceType: schedule.serviceType,
          pickupAddress: schedule.pickupAddress,
          pickupDate: dateStr,
          preferredPickupTime: schedule.preferredPickupTime,
          dropAddress: schedule.dropAddress,
          dropDate: dateStr,
          preferredDropTime: schedule.preferredDropTime,
          driverId: schedule.driverId,
          driverName: schedule.driverName,
          vehicleId: schedule.vehicleId,
          vehicleNumber: schedule.vehicleNumber,
          status: schedule.driverId ? 'DRIVER_ASSIGNED' : 'CONFIRMED',
          baseCharge: schedule.estimatedBaseCharge,
          additionalCharges: 0,
          waitingCharges: 0,
          subtotal: schedule.estimatedBaseCharge,
          customerNotes: `Auto-generated from Recurring Schedule #${schedule.scheduleId}`,
          createdBy: user?.name || 'Recurring Automation Engine',
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  return generated;
}

// ==========================================
// PHASE 2: DRIVER CONFLICT / OVERLAP DETECTION
// ==========================================

export function checkDriverConflict(
  driverId: string,
  pickupDate: string,
  preferredTime: string,
  existingBookings: PickDropBooking[],
  excludeBookingId?: string
): { hasConflict: boolean; conflictingBooking?: PickDropBooking; message?: string } {
  if (!driverId || !pickupDate) return { hasConflict: false };

  // Find other non-terminal trips for the same driver on the same date
  const activeStatuses: PickDropStatus[] = ['DRIVER_ASSIGNED', 'ON_THE_WAY', 'PET_PICKED_UP', 'IN_TRANSIT'];

  const sameDayDriverTrips = existingBookings.filter(
    b => b.driverId === driverId && 
         b.pickupDate === pickupDate && 
         b.bookingId !== excludeBookingId &&
         activeStatuses.includes(b.status)
  );

  if (sameDayDriverTrips.length === 0) {
    return { hasConflict: false };
  }

  // Check for time overlap
  const conflict = sameDayDriverTrips.find(b => {
    if (!b.preferredPickupTime || !preferredTime) return true;
    return b.preferredPickupTime === preferredTime;
  });

  if (conflict) {
    return {
      hasConflict: true,
      conflictingBooking: conflict,
      message: `Driver is already assigned to active Trip #${conflict.bookingId} (${conflict.customerName} - ${conflict.petName}) at ${conflict.preferredPickupTime} on ${pickupDate}.`
    };
  }

  // If driver has 3+ trips on same day, provide soft workload notice
  if (sameDayDriverTrips.length >= 3) {
    return {
      hasConflict: false,
      message: `Driver already has ${sameDayDriverTrips.length} scheduled trips on this day.`
    };
  }

  return { hasConflict: false };
}

// ==========================================
// PHASE 2: CLIENT-SIDE CSV EXPORT UTILITIES
// ==========================================

function downloadCSV(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportPickDropTripsCSV(bookings: PickDropBooking[]) {
  const headers = [
    'Booking ID', 'Date', 'Customer Name', 'Phone', 'Pet Name', 'Service Type', 
    'Pickup Address', 'Drop Address', 'Driver', 'Vehicle', 'Status', 
    'Base Charge (INR)', 'Extra Charges (INR)', 'Waiting Charges (INR)', 
    'Subtotal (INR)', 'Invoice Number', 'Created By', 'Created At'
  ];

  const rows = bookings.map(b => [
    `"${b.bookingId}"`,
    `"${b.pickupDate}"`,
    `"${b.customerName.replace(/"/g, '""')}"`,
    `"${b.customerPhone}"`,
    `"${b.petName.replace(/"/g, '""')}"`,
    `"${b.serviceType}"`,
    `"${(b.pickupAddress || '').replace(/"/g, '""')}"`,
    `"${(b.dropAddress || '').replace(/"/g, '""')}"`,
    `"${b.driverName || 'Unassigned'}"`,
    `"${b.vehicleNumber || 'Unassigned'}"`,
    `"${b.status}"`,
    b.baseCharge,
    b.additionalCharges,
    b.waitingCharges,
    b.subtotal,
    `"${b.invoiceNumber || 'Not Invoiced'}"`,
    `"${b.createdBy || ''}"`,
    `"${b.createdAt}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(csv, `HOP_PickDrop_Trips_Export_${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportPickDropDriversCSV(drivers: PickDropDriver[], bookings: PickDropBooking[]) {
  const headers = ['Driver ID', 'Name', 'Mobile', 'License Number', 'Status', 'Total Assigned Trips', 'Completed Trips', 'Notes'];

  const rows = drivers.map(d => {
    const driverBookings = bookings.filter(b => b.driverId === d.driverId);
    const completed = driverBookings.filter(b => b.status === 'COMPLETED').length;
    return [
      `"${d.driverId}"`,
      `"${d.name.replace(/"/g, '""')}"`,
      `"${d.mobile}"`,
      `"${d.licenseNumber || ''}"`,
      d.isActive ? '"Active"' : '"Inactive"',
      driverBookings.length,
      completed,
      `"${(d.notes || '').replace(/"/g, '""')}"`
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(csv, `HOP_PickDrop_Drivers_Report_${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportPickDropVehiclesCSV(vehicles: PickDropVehicle[], bookings: PickDropBooking[]) {
  const headers = ['Vehicle ID', 'Vehicle Number', 'Type', 'Capacity', 'AC', 'Pet Friendly', 'Status', 'Insurance Expiry', 'PUC Expiry', 'Total Trips Completed'];

  const rows = vehicles.map(v => {
    const vehBookings = bookings.filter(b => b.vehicleId === v.vehicleId);
    const completed = vehBookings.filter(b => b.status === 'COMPLETED').length;
    return [
      `"${v.vehicleId}"`,
      `"${v.vehicleNumber}"`,
      `"${v.vehicleType}"`,
      v.capacity,
      v.isAc ? '"Yes"' : '"No"',
      v.isPetFriendly ? '"Yes"' : '"No"',
      v.isActive ? '"Active"' : '"Inactive"',
      `"${v.insuranceExpiry || 'N/A'}"`,
      `"${v.pucExpiry || 'N/A'}"`,
      completed
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(csv, `HOP_PickDrop_Vehicles_Report_${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportPickDropRevenueCSV(bookings: PickDropBooking[]) {
  const headers = ['Booking ID', 'Date', 'Customer Name', 'Service Type', 'Base (INR)', 'Extra (INR)', 'Waiting (INR)', 'Subtotal (INR)', 'GST 18% (INR)', 'Grand Total (INR)', 'Status', 'Invoiced'];

  const rows = bookings.map(b => {
    const gst = Math.round(b.subtotal * 0.18 * 100) / 100;
    const total = Math.round((b.subtotal + gst) * 100) / 100;
    return [
      `"${b.bookingId}"`,
      `"${b.pickupDate}"`,
      `"${b.customerName.replace(/"/g, '""')}"`,
      `"${b.serviceType}"`,
      b.baseCharge,
      b.additionalCharges,
      b.waitingCharges,
      b.subtotal,
      gst,
      total,
      `"${b.status}"`,
      b.invoiceNumber ? `"${b.invoiceNumber}"` : '"Pending"'
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(csv, `HOP_PickDrop_Revenue_Report_${new Date().toISOString().split('T')[0]}.csv`);
}

// ==========================================
// PHASE 3: ETA & DELAY CALCULATION ENGINE
// ==========================================

export function calculateDelayStatus(
  scheduledTime: string,
  actualTime?: string
): { delayMinutes: number; delayStatus: 'ON_TIME' | 'DELAYED' | 'MAJOR_DELAY' | 'COMPLETED' } {
  if (!scheduledTime) return { delayMinutes: 0, delayStatus: 'ON_TIME' };
  if (!actualTime) return { delayMinutes: 0, delayStatus: 'ON_TIME' };

  try {
    const parseTimeToMinutes = (timeStr: string): number => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return 0;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3]?.toUpperCase();

      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      return hours * 60 + minutes;
    };

    const scheduledMins = parseTimeToMinutes(scheduledTime);
    let actualMins = 0;

    if (actualTime.includes('T')) {
      const date = new Date(actualTime);
      actualMins = date.getHours() * 60 + date.getMinutes();
    } else {
      actualMins = parseTimeToMinutes(actualTime);
    }

    const diffMinutes = actualMins - scheduledMins;

    if (diffMinutes <= 10) {
      return { delayMinutes: Math.max(0, diffMinutes), delayStatus: 'ON_TIME' };
    } else if (diffMinutes <= 30) {
      return { delayMinutes: diffMinutes, delayStatus: 'DELAYED' };
    } else {
      return { delayMinutes: diffMinutes, delayStatus: 'MAJOR_DELAY' };
    }
  } catch {
    return { delayMinutes: 0, delayStatus: 'ON_TIME' };
  }
}

// ==========================================
// PHASE 3: DRIVER & VEHICLE PERFORMANCE
// ==========================================

export interface DriverPerformanceMetrics {
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  failedPickups: number;
  failedDeliveries: number;
  onTimeTrips: number;
  delayedTrips: number;
  totalRevenue: number;
  activeTrips: number;
  completionRate: number;
  rating: 'Excellent' | 'Good' | 'Average' | 'Needs Attention';
}

export function calculateDriverPerformance(
  driverId: string,
  bookings: PickDropBooking[]
): DriverPerformanceMetrics {
  const driverBookings = bookings.filter(b => b.driverId === driverId);
  const total = driverBookings.length;
  const completed = driverBookings.filter(b => b.status === 'COMPLETED').length;
  const cancelled = driverBookings.filter(b => b.status === 'CANCELLED').length;
  const failedPickups = driverBookings.filter(b => b.status === 'PICKUP_FAILED').length;
  const failedDeliveries = driverBookings.filter(b => b.status === 'DROP_FAILED').length;
  const activeTrips = driverBookings.filter(b => ['DRIVER_ASSIGNED', 'ON_THE_WAY', 'PET_PICKED_UP', 'IN_TRANSIT'].includes(b.status)).length;
  const delayed = driverBookings.filter(b => b.delayStatus === 'DELAYED' || b.delayStatus === 'MAJOR_DELAY').length;
  const onTime = Math.max(0, completed - delayed);
  const revenue = driverBookings.filter(b => b.status === 'COMPLETED').reduce((acc, b) => acc + (b.subtotal || 0), 0);

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;
  let rating: 'Excellent' | 'Good' | 'Average' | 'Needs Attention' = 'Good';

  if (total === 0) rating = 'Good';
  else if (completionRate >= 95 && delayed === 0) rating = 'Excellent';
  else if (completionRate >= 85) rating = 'Good';
  else if (completionRate >= 70) rating = 'Average';
  else rating = 'Needs Attention';

  return {
    totalTrips: total,
    completedTrips: completed,
    cancelledTrips: cancelled,
    failedPickups,
    failedDeliveries,
    onTimeTrips: onTime,
    delayedTrips: delayed,
    totalRevenue: revenue,
    activeTrips,
    completionRate,
    rating
  };
}

export interface VehiclePerformanceMetrics {
  totalTrips: number;
  completedTrips: number;
  activeTrips: number;
  utilizationRate: number;
  totalRevenue: number;
  insuranceStatus: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  pucStatus: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
}

export function calculateVehiclePerformance(
  vehicle: PickDropVehicle,
  bookings: PickDropBooking[]
): VehiclePerformanceMetrics {
  const vehBookings = bookings.filter(b => b.vehicleId === vehicle.vehicleId);
  const total = vehBookings.length;
  const completed = vehBookings.filter(b => b.status === 'COMPLETED').length;
  const activeTrips = vehBookings.filter(b => ['DRIVER_ASSIGNED', 'ON_THE_WAY', 'PET_PICKED_UP', 'IN_TRANSIT'].includes(b.status)).length;
  const revenue = vehBookings.filter(b => b.status === 'COMPLETED').reduce((acc, b) => acc + (b.subtotal || 0), 0);
  const utilizationRate = Math.min(100, Math.round((total / 10) * 100)); // normalized scale

  const checkExpiry = (expiryDateStr?: string): 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' => {
    if (!expiryDateStr) return 'VALID';
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    const diffDays = Math.round((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) return 'EXPIRED';
    if (diffDays <= 30) return 'EXPIRING_SOON';
    return 'VALID';
  };

  return {
    totalTrips: total,
    completedTrips: completed,
    activeTrips,
    utilizationRate,
    totalRevenue: revenue,
    insuranceStatus: checkExpiry(vehicle.insuranceExpiry),
    pucStatus: checkExpiry(vehicle.pucExpiry)
  };
}

// ==========================================
// PHASE 3: LIGHTWEIGHT ESTIMATES / QUOTATIONS
// ==========================================

export function generatePickDropEstimate(
  booking: Partial<PickDropBooking>,
  priceBreakdown: any,
  validityDays: number = 7
): any {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validityDays);

  return {
    estimateId: `EST-PND-${Date.now().toString().slice(-6)}`,
    bookingId: booking.bookingId,
    customerId: booking.customerId || '',
    customerName: booking.customerName || 'Customer',
    customerPhone: booking.customerPhone || '',
    petId: booking.petId || '',
    petName: booking.petName || 'Pet',
    serviceType: booking.serviceType || 'One Way Pickup',
    pickupAddress: booking.pickupAddress || '',
    dropAddress: booking.dropAddress || '',
    pickupDate: booking.pickupDate || new Date().toISOString().split('T')[0],
    preferredPickupTime: booking.preferredPickupTime || '10:00 AM',
    distanceKm: booking.distanceKm || 0,
    baseCharge: priceBreakdown.baseCharge,
    additionalCharges: priceBreakdown.additionalCharges,
    waitingCharges: priceBreakdown.waitingCharges,
    subtotal: priceBreakdown.subtotal,
    gstAmount: priceBreakdown.gstAmount,
    grandTotal: priceBreakdown.grandTotal,
    validUntil: validUntil.toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    createdBy: booking.createdBy || 'HOP Admin'
  };
}

// ==========================================
// PHASE 3: LIGHTWEIGHT COMMUNICATIONS
// ==========================================

export async function logPickDropCommunication(record: {
  communicationType: 'BOOKING_CONFIRMED' | 'DRIVER_ASSIGNED' | 'PICKUP_NOTIFIED' | 'DELIVERY_NOTIFIED' | 'INVOICE_NOTIFIED';
  bookingId: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  sentBy: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  notes?: string;
}): Promise<void> {
  try {
    const payload = {
      communication_type: record.communicationType,
      booking_id: record.bookingId,
      customer_id: record.customerId,
      customer_name: record.customerName || null,
      customer_phone: record.customerPhone || null,
      sent_at: new Date().toISOString(),
      sent_by: record.sentBy,
      status: record.status,
      notes: record.notes || null
    };

    await supabase.from('pick_drop_communications').insert([payload]);
  } catch (err) {
    console.warn('Pick & Drop communication logging fallback notice:', err);
  }
}
