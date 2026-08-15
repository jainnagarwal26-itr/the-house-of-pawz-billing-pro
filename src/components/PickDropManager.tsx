// ============================================================
// PickDropManager.tsx — Pick & Drop Transportation Hub (Phase 3 Premium)
// Project: The House of Pawz – Billing Pro
// ============================================================

import React, { useState, useMemo } from 'react';
import { 
  Car, Calendar, Clock, MapPin, User as UserIcon, Phone, 
  Search, Filter, Plus, CheckCircle, AlertTriangle, XCircle, 
  ArrowRight, CheckCircle2, ShieldCheck, Tag, ExternalLink,
  ChevronRight, RefreshCw, FileText, IndianRupee, Truck,
  Navigation, Eye, Edit3, Trash2, Check, AlertCircle, Info,
  Download, FileSpreadsheet, Repeat, ShieldAlert, Layers,
  Send, Award, Star, Activity, Sparkles, Printer, MessageSquare
} from 'lucide-react';
import { 
  PickDropBooking, 
  PickDropStatus, 
  PickDropServiceType, 
  PickDropDriver, 
  PickDropVehicle, 
  PickDropPricingRule, 
  PickDropRecurringSchedule,
  RecurringTransitPattern,
  PricingRuleType,
  BookingSource,
  BookingPriority,
  DelayStatus,
  PickDropEstimate,
  PickDropCommunicationRecord,
  Customer, 
  Pet, 
  User, 
  formatINR, 
  formatDateDDMMYYYY 
} from '../types';
import { hasPermission } from '../lib/permissions';
import { 
  calculatePickDropPrice, 
  generateNextBookingId,
  checkDriverConflict,
  generateUpcomingBookingsForRecurring,
  exportPickDropTripsCSV,
  exportPickDropDriversCSV,
  exportPickDropVehiclesCSV,
  exportPickDropRevenueCSV,
  calculateDelayStatus,
  calculateDriverPerformance,
  calculateVehiclePerformance,
  generatePickDropEstimate,
  logPickDropCommunication
} from '../lib/pickDropService';

interface PickDropManagerProps {
  bookings: PickDropBooking[];
  drivers: PickDropDriver[];
  vehicles: PickDropVehicle[];
  pricingRules: PickDropPricingRule[];
  recurringSchedules?: PickDropRecurringSchedule[];
  customers: Customer[];
  pets: Pet[];
  currentUser: User | null;
  onAddBooking: (booking: PickDropBooking) => Promise<void>;
  onUpdateStatus: (bookingId: string, newStatus: PickDropStatus, note: string | undefined, extraPayload?: Partial<PickDropBooking>) => Promise<void>;
  onUpdateBooking: (booking: PickDropBooking) => Promise<void>;
  onDeleteBooking: (bookingId: string) => Promise<void>;
  onSaveDriver: (driver: PickDropDriver) => Promise<void>;
  onDeleteDriver?: (driverId: string) => Promise<void>;
  onSaveVehicle: (vehicle: PickDropVehicle) => Promise<void>;
  onDeleteVehicle?: (vehicleId: string) => Promise<void>;
  onSavePricingRule: (rule: PickDropPricingRule) => Promise<void>;
  onDeletePricingRule?: (ruleId: string) => Promise<void>;
  onSaveRecurringSchedule?: (schedule: PickDropRecurringSchedule) => Promise<void>;
  onDeleteRecurringSchedule?: (scheduleId: string) => Promise<void>;
  onGenerateRecurringBookings?: (schedule: PickDropRecurringSchedule) => Promise<void>;
  onGenerateInvoiceForBooking: (booking: PickDropBooking) => void;
}

const SERVICE_TYPES: PickDropServiceType[] = [
  'One Way Pickup',
  'One Way Drop',
  'Pickup + Drop',
  'Round Trip',
  'Home → HOP',
  'HOP → Home',
  'Home → HOP → Home'
];

const BOOKING_SOURCES: BookingSource[] = [
  'Phone',
  'WhatsApp',
  'Website',
  'Walk-in',
  'Existing Customer',
  'Staff',
  'Admin',
  'Other'
];

export const PickDropManager: React.FC<PickDropManagerProps> = ({
  bookings,
  drivers,
  vehicles,
  pricingRules,
  recurringSchedules = [],
  customers,
  pets,
  currentUser,
  onAddBooking,
  onUpdateStatus,
  onUpdateBooking,
  onDeleteBooking,
  onSaveDriver,
  onDeleteDriver,
  onSaveVehicle,
  onDeleteVehicle,
  onSavePricingRule,
  onDeletePricingRule,
  onSaveRecurringSchedule,
  onDeleteRecurringSchedule,
  onGenerateRecurringBookings,
  onGenerateInvoiceForBooking
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'trips' | 'scheduler' | 'recurring' | 'drivers' | 'vehicles' | 'pricing' | 'reports'>('trips');
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('ALL');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');
  const [billingFilter, setBillingFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Scheduler filter
  const [schedulerView, setSchedulerView] = useState<'today' | 'tomorrow' | 'week' | 'custom'>('today');
  const [customSchedulerDate, setCustomSchedulerDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modals
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<PickDropBooking | null>(null);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [activeEstimate, setActiveEstimate] = useState<PickDropEstimate | null>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<PickDropDriver | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<PickDropVehicle | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<PickDropPricingRule | null>(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<PickDropRecurringSchedule | null>(null);

  // Status Action Modal State
  const [statusActionType, setStatusActionType] = useState<PickDropStatus | null>(null);
  const [statusActionNote, setStatusActionNote] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverRel, setReceiverRel] = useState('');

  // New Booking Form State (Phase 3 Premium Fields)
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formPetId, setFormPetId] = useState('');
  const [formServiceType, setFormServiceType] = useState<PickDropServiceType>('One Way Pickup');
  const [formPickupAddress, setFormPickupAddress] = useState('');
  const [formPickupLandmark, setFormPickupLandmark] = useState('');
  const [formPickupDate, setFormPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPickupTime, setFormPickupTime] = useState('10:00 AM');
  const [formPickupMaps, setFormPickupMaps] = useState('');
  const [formDropAddress, setFormDropAddress] = useState('');
  const [formDropLandmark, setFormDropLandmark] = useState('');
  const [formDropDate, setFormDropDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDropTime, setFormDropTime] = useState('05:00 PM');
  const [formDropMaps, setFormDropMaps] = useState('');
  const [formEmergencyContact, setFormEmergencyContact] = useState('');
  const [formBookingSource, setFormBookingSource] = useState<BookingSource>('Phone');
  const [formPriority, setFormPriority] = useState<BookingPriority>('Normal');
  const [formPreferredVehicleType, setFormPreferredVehicleType] = useState('Van');
  const [formDriverId, setFormDriverId] = useState('');
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formDistanceKm, setFormDistanceKm] = useState<number>(0);
  const [formWaitingMins, setFormWaitingMins] = useState<number>(0);
  const [formAdditionalPets, setFormAdditionalPets] = useState<number>(0);
  const [formAdditionalStops, setFormAdditionalStops] = useState<number>(0);
  const [formIsNight, setFormIsNight] = useState<boolean>(false);
  const [formIsHoliday, setFormIsHoliday] = useState<boolean>(false);
  const [formIsEmergency, setFormIsEmergency] = useState<boolean>(false);
  const [formCustomerNotes, setFormCustomerNotes] = useState('');
  const [formStaffNotes, setFormStaffNotes] = useState('');

  // Recurring Form State
  const [recCustomerId, setRecCustomerId] = useState('');
  const [recPetId, setRecPetId] = useState('');
  const [recServiceType, setRecServiceType] = useState<PickDropServiceType>('Home → HOP → Home');
  const [recPickupAddress, setRecPickupAddress] = useState('');
  const [recDropAddress, setRecDropAddress] = useState('');
  const [recPickupTime, setRecPickupTime] = useState('09:30 AM');
  const [recDropTime, setRecDropTime] = useState('06:30 PM');
  const [recPattern, setRecPattern] = useState<RecurringTransitPattern>('DAILY');
  const [recDaysOfWeek, setRecDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recStartDate, setRecStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [recEndDate, setRecEndDate] = useState('');
  const [recDriverId, setRecDriverId] = useState('');
  const [recVehicleId, setRecVehicleId] = useState('');
  const [recEstimatedBase, setRecEstimatedBase] = useState<number>(450);
  const [recNotes, setRecNotes] = useState('');

  // Driver Master Form State
  const [drvName, setDrvName] = useState('');
  const [drvMobile, setDrvMobile] = useState('');
  const [drvAltMobile, setDrvAltMobile] = useState('');
  const [drvLic, setDrvLic] = useState('');
  const [drvLicExp, setDrvLicExp] = useState('');
  const [drvEmerg, setDrvEmerg] = useState('');
  const [drvActive, setDrvActive] = useState(true);
  const [drvNotes, setDrvNotes] = useState('');

  // Vehicle Master Form State
  const [vehNumber, setVehNumber] = useState('');
  const [vehType, setVehType] = useState('Van');
  const [vehCapacity, setVehCapacity] = useState(2);
  const [vehAc, setVehAc] = useState(true);
  const [vehPetFriendly, setVehPetFriendly] = useState(true);
  const [vehActive, setVehActive] = useState(true);
  const [vehInsExpiry, setVehInsExpiry] = useState('');
  const [vehPucExpiry, setVehPucExpiry] = useState('');
  const [vehNotes, setVehNotes] = useState('');

  // Pricing Rule Form State
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<PricingRuleType>('FIXED');
  const [ruleRate, setRuleRate] = useState<number>(250);
  const [ruleActive, setRuleActive] = useState(true);
  const [ruleEffectiveFrom, setRuleEffectiveFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [ruleNotes, setRuleNotes] = useState('');

  // Customer change auto-fill
  const handleCustomerChange = (custId: string) => {
    setFormCustomerId(custId);
    const selectedCust = customers.find(c => c.id === custId);
    if (selectedCust) {
      setFormPickupAddress(selectedCust.address || '');
      setFormDropAddress(selectedCust.address || '');
      setFormEmergencyContact(selectedCust.phone || '');
      const custPets = pets.filter(p => p.customerId === custId);
      if (custPets.length > 0) {
        setFormPetId(custPets[0].id);
      } else {
        setFormPetId('');
      }
    }
  };

  const handleRecCustomerChange = (custId: string) => {
    setRecCustomerId(custId);
    const selectedCust = customers.find(c => c.id === custId);
    if (selectedCust) {
      setRecPickupAddress(selectedCust.address || '');
      setRecDropAddress(selectedCust.address || '');
      const custPets = pets.filter(p => p.customerId === custId);
      if (custPets.length > 0) {
        setRecPetId(custPets[0].id);
      } else {
        setRecPetId('');
      }
    }
  };

  // Price Calculation Preview
  const priceBreakdown = useMemo(() => {
    return calculatePickDropPrice(
      formServiceType,
      formDistanceKm,
      formWaitingMins,
      formAdditionalPets,
      formIsNight,
      formIsEmergency || formPriority === 'Emergency',
      pricingRules,
      formIsHoliday,
      formAdditionalStops
    );
  }, [
    formServiceType, formDistanceKm, formWaitingMins, formAdditionalPets,
    formIsNight, formIsEmergency, formPriority, formIsHoliday, formAdditionalStops, pricingRules
  ]);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery = 
          b.bookingId.toLowerCase().includes(q) ||
          b.customerName.toLowerCase().includes(q) ||
          b.customerPhone.toLowerCase().includes(q) ||
          b.petName.toLowerCase().includes(q) ||
          (b.petSpecies && b.petSpecies.toLowerCase().includes(q)) ||
          (b.driverName && b.driverName.toLowerCase().includes(q)) ||
          (b.vehicleNumber && b.vehicleNumber.toLowerCase().includes(q)) ||
          b.pickupAddress.toLowerCase().includes(q) ||
          b.dropAddress.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Status
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;

      // Priority
      if (priorityFilter !== 'ALL' && b.priority !== priorityFilter) return false;

      // Service Type
      if (serviceTypeFilter !== 'ALL' && b.serviceType !== serviceTypeFilter) return false;

      // Driver
      if (driverFilter !== 'ALL' && b.driverId !== driverFilter) return false;

      // Vehicle
      if (vehicleFilter !== 'ALL' && b.vehicleId !== vehicleFilter) return false;

      // Billing Status
      if (billingFilter === 'INVOICED' && !b.invoiceId) return false;
      if (billingFilter === 'UNINVOICED' && b.invoiceId) return false;

      // Date Filter
      if (dateFilter === 'TODAY' && b.pickupDate !== todayStr) return false;
      if (dateFilter === 'TOMORROW' && b.pickupDate !== tomorrowStr) return false;
      if (dateFilter === 'UPCOMING' && b.pickupDate < todayStr) return false;

      return true;
    });
  }, [bookings, searchQuery, statusFilter, priorityFilter, serviceTypeFilter, driverFilter, vehicleFilter, billingFilter, dateFilter, todayStr, tomorrowStr]);

  // Scheduler Filtered Bookings
  const schedulerBookings = useMemo(() => {
    if (schedulerView === 'today') {
      return bookings.filter(b => b.pickupDate === todayStr);
    } else if (schedulerView === 'tomorrow') {
      return bookings.filter(b => b.pickupDate === tomorrowStr);
    } else if (schedulerView === 'week') {
      const today = new Date();
      const endOfWeek = new Date();
      endOfWeek.setDate(today.getDate() + 7);
      const endStr = endOfWeek.toISOString().split('T')[0];
      return bookings.filter(b => b.pickupDate >= todayStr && b.pickupDate <= endStr);
    } else {
      return bookings.filter(b => b.pickupDate === customSchedulerDate);
    }
  }, [bookings, schedulerView, todayStr, tomorrowStr, customSchedulerDate]);

  // Comprehensive Metrics
  const metrics = useMemo(() => {
    const todayTrips = bookings.filter(b => b.pickupDate === todayStr);
    const requested = todayTrips.filter(b => b.status === 'REQUESTED').length;
    const confirmed = todayTrips.filter(b => b.status === 'CONFIRMED').length;
    const assigned = todayTrips.filter(b => b.status === 'DRIVER_ASSIGNED').length;
    const onWay = todayTrips.filter(b => b.status === 'ON_THE_WAY').length;
    const pickedUp = todayTrips.filter(b => b.status === 'PET_PICKED_UP').length;
    const inTransit = todayTrips.filter(b => b.status === 'IN_TRANSIT').length;
    const delivered = todayTrips.filter(b => b.status === 'DELIVERED').length;
    const completed = todayTrips.filter(b => b.status === 'COMPLETED').length;
    const cancelled = todayTrips.filter(b => b.status === 'CANCELLED').length;
    const failed = todayTrips.filter(b => b.status === 'PICKUP_FAILED' || b.status === 'DROP_FAILED').length;

    const todayBilling = todayTrips.filter(b => b.status === 'COMPLETED').reduce((acc, b) => acc + b.subtotal, 0);
    const totalCompletedBilling = bookings.filter(b => b.status === 'COMPLETED').reduce((acc, b) => acc + b.subtotal, 0);
    const invoicedBilling = bookings.filter(b => b.status === 'COMPLETED' && b.invoiceId).reduce((acc, b) => acc + b.subtotal, 0);
    const pendingInvoicing = bookings.filter(b => b.status === 'COMPLETED' && !b.invoiceId).reduce((acc, b) => acc + b.subtotal, 0);

    const activeTrips = bookings.filter(b => ['DRIVER_ASSIGNED', 'ON_THE_WAY', 'PET_PICKED_UP', 'IN_TRANSIT'].includes(b.status)).length;
    const unassignedTrips = bookings.filter(b => ['REQUESTED', 'CONFIRMED'].includes(b.status)).length;
    const delayedTrips = bookings.filter(b => b.delayStatus === 'DELAYED' || b.delayStatus === 'MAJOR_DELAY').length;

    return {
      todayTotal: todayTrips.length,
      requested,
      confirmed,
      assigned,
      onWay,
      pickedUp,
      inTransit,
      delivered,
      completed,
      cancelled,
      failed,
      todayBilling,
      totalCompletedBilling,
      invoicedBilling,
      pendingInvoicing,
      activeTrips,
      unassignedTrips,
      delayedTrips
    };
  }, [bookings, todayStr]);

  // Status Badge Helper
  const getStatusBadge = (status: PickDropStatus) => {
    switch (status) {
      case 'REQUESTED':
        return <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">REQUESTED</span>;
      case 'CONFIRMED':
        return <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">CONFIRMED</span>;
      case 'DRIVER_ASSIGNED':
        return <span className="bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">ASSIGNED</span>;
      case 'ON_THE_WAY':
        return <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">ON THE WAY</span>;
      case 'PET_PICKED_UP':
        return <span className="bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">PICKED UP</span>;
      case 'IN_TRANSIT':
        return <span className="bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse">IN TRANSIT</span>;
      case 'DELIVERED':
        return <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">DELIVERED</span>;
      case 'COMPLETED':
        return <span className="bg-green-100 dark:bg-green-950/80 text-green-800 dark:text-green-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">COMPLETED</span>;
      case 'CANCELLED':
        return <span className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">CANCELLED</span>;
      case 'PICKUP_FAILED':
      case 'DROP_FAILED':
        return <span className="bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">FAILED</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">{status}</span>;
    }
  };

  // ETA Delay Indicator
  const getDelayIndicator = (booking: PickDropBooking) => {
    if (booking.status === 'COMPLETED') {
      return <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">🔵 Completed</span>;
    }
    if (booking.delayStatus === 'MAJOR_DELAY') {
      return <span className="text-[9px] text-red-600 font-bold flex items-center gap-0.5 animate-bounce">🔴 Major Delay ({booking.delayMinutes}m)</span>;
    }
    if (booking.delayStatus === 'DELAYED') {
      return <span className="text-[9px] text-amber-600 font-bold flex items-center gap-0.5">🟡 Delayed ({booking.delayMinutes}m)</span>;
    }
    return <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">🟢 On Time</span>;
  };

  // Priority Badge Helper
  const getPriorityBadge = (priority?: BookingPriority) => {
    if (priority === 'Emergency') {
      return <span className="bg-red-100 text-red-700 font-black text-[9px] px-1.5 py-0.5 rounded border border-red-300">EMERGENCY</span>;
    }
    if (priority === 'High') {
      return <span className="bg-amber-100 text-amber-800 font-bold text-[9px] px-1.5 py-0.5 rounded">HIGH</span>;
    }
    return null;
  };

  // Submit New Booking
  const handleCreateBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !hasPermission(currentUser, 'pick_drop_create')) {
      alert('Access Denied: You do not have permission to create Pick & Drop bookings.');
      return;
    }

    const selectedCust = customers.find(c => c.id === formCustomerId);
    const selectedPet = pets.find(p => p.id === formPetId);
    const selectedDriver = drivers.find(d => d.driverId === formDriverId);
    const selectedVehicle = vehicles.find(v => v.vehicleId === formVehicleId);

    if (!selectedCust || !selectedPet) {
      alert('Please select a valid customer and pet.');
      return;
    }

    // Check driver conflict
    if (formDriverId) {
      const conflictCheck = checkDriverConflict(formDriverId, formPickupDate, formPickupTime, bookings);
      if (conflictCheck.hasConflict) {
        const override = window.confirm(`Warning: ${conflictCheck.message}\n\nDo you want to proceed with assignment anyway?`);
        if (!override) return;
      }
    }

    const nextId = generateNextBookingId(bookings);

    const newBooking: PickDropBooking = {
      id: `pnd-local-${Date.now()}`,
      bookingId: nextId,
      customerId: selectedCust.id,
      customerName: selectedCust.name,
      customerPhone: selectedCust.phone,
      petId: selectedPet.id,
      petName: selectedPet.name,
      petSpecies: selectedPet.species || 'Dog',
      petBreed: selectedPet.breed || '',
      petWeight: selectedPet.weight ? `${selectedPet.weight} kg` : '',
      emergencyContact: formEmergencyContact || selectedCust.phone,
      bookingSource: formBookingSource,
      priority: formPriority,
      preferredVehicleType: formPreferredVehicleType,
      preferredDriverId: formDriverId || undefined,
      serviceType: formServiceType,
      pickupAddress: formPickupAddress,
      pickupLandmark: formPickupLandmark,
      pickupDate: formPickupDate,
      preferredPickupTime: formPickupTime,
      pickupMapsLink: formPickupMaps,
      dropAddress: formDropAddress,
      dropLandmark: formDropLandmark,
      dropDate: formDropDate,
      preferredDropTime: formDropTime,
      dropMapsLink: formDropMaps,
      driverId: selectedDriver?.driverId,
      driverName: selectedDriver?.name,
      vehicleId: selectedVehicle?.vehicleId,
      vehicleNumber: selectedVehicle?.vehicleNumber,
      status: selectedDriver ? 'DRIVER_ASSIGNED' : 'REQUESTED',
      statusChangedBy: currentUser.name || currentUser.username,
      statusChangedAt: new Date().toISOString(),
      estimatedPickupTime: formPickupTime,
      estimatedDeliveryTime: formDropTime,
      delayMinutes: 0,
      delayStatus: 'ON_TIME',
      distanceKm: formDistanceKm,
      additionalPetsCount: formAdditionalPets,
      additionalStopsCount: formAdditionalStops,
      waitingMinutes: formWaitingMins,
      isNight: formIsNight,
      isHoliday: formIsHoliday,
      isEmergency: formIsEmergency || formPriority === 'Emergency',
      baseCharge: priceBreakdown.baseCharge,
      additionalCharges: priceBreakdown.additionalCharges,
      waitingCharges: priceBreakdown.waitingCharges,
      subtotal: priceBreakdown.subtotal,
      customerNotes: formCustomerNotes,
      internalStaffNotes: formStaffNotes,
      createdBy: currentUser.name || currentUser.username,
      createdAt: new Date().toISOString()
    };

    await onAddBooking(newBooking);

    // Lightweight text-only confirmation notification logging
    await logPickDropCommunication({
      communicationType: 'BOOKING_CONFIRMED',
      bookingId: nextId,
      customerId: selectedCust.id,
      customerName: selectedCust.name,
      customerPhone: selectedCust.phone,
      sentBy: currentUser.name || currentUser.username,
      status: 'SENT',
      notes: `Booking confirmation registered via ${formBookingSource}`
    });

    setShowNewBookingModal(false);
  };

  // Submit Recurring Schedule
  const handleSaveRecurringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !hasPermission(currentUser, 'pick_drop_recurring_edit')) {
      alert('Access Denied: You do not have permission to manage recurring transit.');
      return;
    }

    const selectedCust = customers.find(c => c.id === recCustomerId);
    const selectedPet = pets.find(p => p.id === recPetId);
    const selectedDriver = drivers.find(d => d.driverId === recDriverId);
    const selectedVehicle = vehicles.find(v => v.vehicleId === recVehicleId);

    if (!selectedCust || !selectedPet) {
      alert('Please select a valid customer and pet.');
      return;
    }

    const recSchedule: PickDropRecurringSchedule = {
      id: editingRecurring?.id || `rec-local-${Date.now()}`,
      scheduleId: editingRecurring?.scheduleId || `REC-PND-${Date.now().toString().slice(-4)}`,
      customerId: selectedCust.id,
      customerName: selectedCust.name,
      customerPhone: selectedCust.phone,
      petId: selectedPet.id,
      petName: selectedPet.name,
      serviceType: recServiceType,
      pickupAddress: recPickupAddress,
      dropAddress: recDropAddress,
      preferredPickupTime: recPickupTime,
      preferredDropTime: recDropTime,
      pattern: recPattern,
      daysOfWeek: recDaysOfWeek,
      startDate: recStartDate,
      endDate: recEndDate || undefined,
      driverId: selectedDriver?.driverId,
      driverName: selectedDriver?.name,
      vehicleId: selectedVehicle?.vehicleId,
      vehicleNumber: selectedVehicle?.vehicleNumber,
      estimatedBaseCharge: recEstimatedBase,
      isActive: true,
      notes: recNotes,
      createdAt: editingRecurring?.createdAt || new Date().toISOString()
    };

    if (onSaveRecurringSchedule) {
      await onSaveRecurringSchedule(recSchedule);
    }
    setShowRecurringModal(false);
    setEditingRecurring(null);
  };

  // Execute Status Transition
  const handleExecuteStatusTransition = async () => {
    if (!selectedBooking || !statusActionType || !currentUser) return;

    if (!hasPermission(currentUser, 'pick_drop_status_update')) {
      alert('Access Denied: You do not have permission to update trip status.');
      return;
    }

    const extraPayload: Partial<PickDropBooking> = {
      statusChangedBy: currentUser.name || currentUser.username,
      statusChangedAt: new Date().toISOString(),
      operationalNote: statusActionNote || undefined
    };

    if (statusActionType === 'DRIVER_ASSIGNED') {
      if (!hasPermission(currentUser, 'pick_drop_assign')) {
        alert('Access Denied: You do not have permission to assign drivers or vehicles.');
        return;
      }

      // Overlap detection
      const conflict = checkDriverConflict(selectedDriverId, selectedBooking.pickupDate, selectedBooking.preferredPickupTime, bookings, selectedBooking.bookingId);
      if (conflict.hasConflict) {
        const proceed = window.confirm(`Assignment Warning:\n${conflict.message}\n\nDo you want to proceed anyway?`);
        if (!proceed) return;
      }

      const drv = drivers.find(d => d.driverId === selectedDriverId);
      const veh = vehicles.find(v => v.vehicleId === selectedVehicleId);
      if (drv) {
        extraPayload.driverId = drv.driverId;
        extraPayload.driverName = drv.name;
      }
      if (veh) {
        extraPayload.vehicleId = veh.vehicleId;
        extraPayload.vehicleNumber = veh.vehicleNumber;
      }

      // Notification log
      await logPickDropCommunication({
        communicationType: 'DRIVER_ASSIGNED',
        bookingId: selectedBooking.bookingId,
        customerId: selectedBooking.customerId,
        customerName: selectedBooking.customerName,
        customerPhone: selectedBooking.customerPhone,
        sentBy: currentUser.name || currentUser.username,
        status: 'SENT',
        notes: `Driver ${drv?.name} allocated`
      });
    }

    if (statusActionType === 'PET_PICKED_UP') {
      const actualPickupTime = new Date().toISOString();
      extraPayload.actualPickupTime = actualPickupTime;
      extraPayload.pickupConfirmedBy = currentUser.name || currentUser.username;
      extraPayload.pickupNote = statusActionNote || 'Pet picked up safely';

      // Calculate ETA delay
      const delayCheck = calculateDelayStatus(selectedBooking.preferredPickupTime, actualPickupTime);
      extraPayload.delayMinutes = delayCheck.delayMinutes;
      extraPayload.delayStatus = delayCheck.delayStatus;

      // Notification log
      await logPickDropCommunication({
        communicationType: 'PICKUP_NOTIFIED',
        bookingId: selectedBooking.bookingId,
        customerId: selectedBooking.customerId,
        customerName: selectedBooking.customerName,
        customerPhone: selectedBooking.customerPhone,
        sentBy: currentUser.name || currentUser.username,
        status: 'SENT',
        notes: 'Pet successfully picked up'
      });
    }

    if (statusActionType === 'DELIVERED') {
      const actualDeliveryTime = new Date().toISOString();
      extraPayload.actualDeliveryTime = actualDeliveryTime;
      extraPayload.deliveredTo = receiverName || selectedBooking.customerName;
      extraPayload.receiverName = receiverName || selectedBooking.customerName;
      extraPayload.receiverRelationship = receiverRel || 'Self';
      extraPayload.deliveryNote = statusActionNote || 'Pet delivered safely';
      extraPayload.deliveredBy = currentUser.name || currentUser.username;

      // Notification log
      await logPickDropCommunication({
        communicationType: 'DELIVERY_NOTIFIED',
        bookingId: selectedBooking.bookingId,
        customerId: selectedBooking.customerId,
        customerName: selectedBooking.customerName,
        customerPhone: selectedBooking.customerPhone,
        sentBy: currentUser.name || currentUser.username,
        status: 'SENT',
        notes: `Pet safely delivered to ${receiverName || selectedBooking.customerName}`
      });
    }

    if (statusActionType === 'CANCELLED') {
      extraPayload.cancellationReason = cancellationReason || statusActionNote || 'Cancelled by customer';
    }

    if (statusActionType === 'PICKUP_FAILED' || statusActionType === 'DROP_FAILED') {
      extraPayload.failureReason = statusActionNote || 'Customer or recipient unavailable';
    }

    if (delayReason) {
      extraPayload.delayReason = delayReason;
    }

    await onUpdateStatus(selectedBooking.bookingId, statusActionType, statusActionNote, extraPayload);

    setSelectedBooking(prev => prev ? {
      ...prev,
      ...extraPayload,
      status: statusActionType
    } : null);

    setStatusActionType(null);
    setStatusActionNote('');
    setDelayReason('');
    setCancellationReason('');
  };

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="p-2 bg-red-100 dark:bg-red-950/80 text-[#D62828] rounded-xl">
              <Car className="w-6 h-6" />
            </span>
            Pick & Drop Transportation Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Safe pet taxi, route scheduler, driver conflict checks & GST invoice generation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission(currentUser, 'pick_drop_create') && (
            <button
              onClick={() => {
                if (customers.length > 0) handleCustomerChange(customers[0].id);
                setShowNewBookingModal(true);
              }}
              className="px-4 py-2 bg-[#D62828] hover:bg-[#b52020] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Pick & Drop</span>
            </button>
          )}

          {hasPermission(currentUser, 'pick_drop_reports_export') && (
            <button
              onClick={() => exportPickDropTripsCSV(filteredBookings)}
              className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Quick Export Trips CSV"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Today's Total Trips</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{metrics.todayTotal}</span>
          <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
            <span>Req: {metrics.requested}</span>
            <span>Conf: {metrics.confirmed}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[10px] text-indigo-500 font-bold uppercase block">Active In Transit</span>
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{metrics.activeTrips}</span>
          <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
            <span>On Way: {metrics.onWay}</span>
            <span>Picked: {metrics.pickedUp}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[10px] text-emerald-500 font-bold uppercase block">Today Completed</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{metrics.completed}</span>
          <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
            <span>Delivered: {metrics.delivered}</span>
            <span>Fail: {metrics.failed}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[10px] text-amber-500 font-bold uppercase block">Unassigned Trips</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400">{metrics.unassignedTrips}</span>
          <span className="text-[10px] text-slate-500 mt-1 block">Awaiting driver allocation</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">Today's Billing</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatINR(metrics.todayBilling)}</span>
          <span className="text-[10px] text-slate-500 mt-1 block">Completed today</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase block">Total Transit Revenue</span>
          <span className="text-xl font-black text-purple-600 dark:text-purple-400">{formatINR(metrics.totalCompletedBilling)}</span>
          <span className="text-[10px] text-slate-500 mt-1 block">Pending inv: {formatINR(metrics.pendingInvoicing)}</span>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-zinc-800 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('trips')}
          className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'trips'
              ? 'border-[#D62828] text-[#D62828]'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Trips & Bookings ({bookings.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('scheduler')}
          className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'scheduler'
              ? 'border-[#D62828] text-[#D62828]'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Scheduler</span>
        </button>

        {hasPermission(currentUser, 'pick_drop_recurring_view') && (
          <button
            onClick={() => setActiveSubTab('recurring')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'recurring'
                ? 'border-[#D62828] text-[#D62828]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>Recurring Transit ({recurringSchedules.length})</span>
          </button>
        )}

        {(hasPermission(currentUser, 'pick_drop_assign') || hasPermission(currentUser, 'pick_drop_edit')) && (
          <button
            onClick={() => setActiveSubTab('drivers')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'drivers'
                ? 'border-[#D62828] text-[#D62828]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Drivers Master ({drivers.length})</span>
          </button>
        )}

        {(hasPermission(currentUser, 'pick_drop_assign') || hasPermission(currentUser, 'pick_drop_edit')) && (
          <button
            onClick={() => setActiveSubTab('vehicles')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'vehicles'
                ? 'border-[#D62828] text-[#D62828]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Vehicles Master ({vehicles.length})</span>
          </button>
        )}

        {hasPermission(currentUser, 'pick_drop_pricing_view') && (
          <button
            onClick={() => setActiveSubTab('pricing')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'pricing'
                ? 'border-[#D62828] text-[#D62828]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <IndianRupee className="w-4 h-4" />
            <span>Pricing Rules Engine ({pricingRules.length})</span>
          </button>
        )}

        {hasPermission(currentUser, 'pick_drop_reports_view') && (
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'reports'
                ? 'border-[#D62828] text-[#D62828]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Reports & Exports</span>
          </button>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 1: TRIPS & BOOKINGS */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'trips' && (
        <div className="space-y-4">
          {/* Advanced Multi-Filter Toolbar */}
          <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-3">
            <div className="flex flex-wrap gap-2.5 items-center justify-between">
              <div className="flex-1 min-w-[240px] relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search booking ID, customer, pet, phone, driver..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#D62828]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl font-bold"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="REQUESTED">Requested</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="DRIVER_ASSIGNED">Driver Assigned</option>
                  <option value="ON_THE_WAY">On The Way</option>
                  <option value="PET_PICKED_UP">Pet Picked Up</option>
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="PICKUP_FAILED">Pickup Failed</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl font-bold"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High Priority</option>
                  <option value="Emergency">Emergency Priority</option>
                </select>

                {/* Service Type Filter */}
                <select
                  value={serviceTypeFilter}
                  onChange={e => setServiceTypeFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl font-bold"
                >
                  <option value="ALL">All Service Types</option>
                  {SERVICE_TYPES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>

                {/* Driver Filter */}
                <select
                  value={driverFilter}
                  onChange={e => setDriverFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl font-bold"
                >
                  <option value="ALL">All Drivers</option>
                  {drivers.map(d => (
                    <option key={d.driverId} value={d.driverId}>{d.name}</option>
                  ))}
                </select>

                {/* Date Filter */}
                <select
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl font-bold"
                >
                  <option value="ALL">All Dates</option>
                  <option value="TODAY">Today's Schedule</option>
                  <option value="TOMORROW">Tomorrow</option>
                  <option value="UPCOMING">Upcoming</option>
                </select>

                {/* Billing Status Filter */}
                <select
                  value={billingFilter}
                  onChange={e => setBillingFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl font-bold"
                >
                  <option value="ALL">All Billing</option>
                  <option value="INVOICED">Invoiced</option>
                  <option value="UNINVOICED">Uninvoiced</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bookings Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredBookings.map(b => (
              <div 
                key={b.bookingId} 
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-2xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white">{b.bookingId}</span>
                        {b.recurringScheduleId && (
                          <span className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold px-1.5 py-0.2 rounded">
                            RECURRING
                          </span>
                        )}
                        {getPriorityBadge(b.priority)}
                      </div>
                      <span className="text-[10px] text-slate-400 block">{b.serviceType}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(b.status)}
                      {getDelayIndicator(b)}
                    </div>
                  </div>

                  <div className="pt-2 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5 text-[#D62828]" />
                        {b.customerName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">{b.customerPhone}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-zinc-400 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span>🐾</span>
                        <strong className="text-slate-700 dark:text-zinc-200">{b.petName}</strong>
                        {b.petBreed ? ` (${b.petBreed})` : ''}
                      </div>
                      <span className="text-[10px] text-slate-400">Via: {b.bookingSource || 'Phone'}</span>
                    </div>
                  </div>

                  {/* Pickup & Drop Summary */}
                  <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-zinc-400 pt-2">
                    <div className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold text-[10px] uppercase w-12 shrink-0">Pickup:</span>
                      <span className="line-clamp-1 flex-1">{b.pickupAddress}</span>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">{b.preferredPickupTime}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-red-600 font-bold text-[10px] uppercase w-12 shrink-0">Drop:</span>
                      <span className="line-clamp-1 flex-1">{b.dropAddress}</span>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">{b.preferredDropTime}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800 text-[10px]">
                      <span>Driver: <strong className="text-slate-700 dark:text-zinc-300">{b.driverName || 'Unassigned'}</strong></span>
                      <span>Vehicle: <strong className="text-slate-700 dark:text-zinc-300">{b.vehicleNumber || 'Unassigned'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedBooking(b)}
                    className="flex-1 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View & Manage</span>
                  </button>

                  <button
                    onClick={() => {
                      const breakdown = calculatePickDropPrice(
                        b.serviceType,
                        b.distanceKm || 0,
                        b.waitingMinutes || 0,
                        b.additionalPetsCount || 0,
                        b.isNight || false,
                        b.isEmergency || false,
                        pricingRules,
                        b.isHoliday || false,
                        b.additionalStopsCount || 0
                      );
                      const estimate = generatePickDropEstimate(b, breakdown);
                      setActiveEstimate(estimate);
                      setShowEstimateModal(true);
                    }}
                    className="px-2 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Generate Estimate Quotation"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Estimate</span>
                  </button>

                  {b.status === 'COMPLETED' && !b.invoiceId && hasPermission(currentUser, 'invoices_create') && (
                    <button
                      onClick={() => onGenerateInvoiceForBooking(b)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Convert to GST Invoice"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Invoice</span>
                    </button>
                  )}

                  {b.invoiceNumber && (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      #{b.invoiceNumber}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {filteredBookings.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600">
                <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold">No Pick & Drop bookings match your filter criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 2: INTERACTIVE SCHEDULER */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'scheduler' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSchedulerView('today')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  schedulerView === 'today' ? 'bg-[#D62828] text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                }`}
              >
                Today ({todayStr})
              </button>
              <button
                onClick={() => setSchedulerView('tomorrow')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  schedulerView === 'tomorrow' ? 'bg-[#D62828] text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                }`}
              >
                Tomorrow
              </button>
              <button
                onClick={() => setSchedulerView('week')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  schedulerView === 'week' ? 'bg-[#D62828] text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                }`}
              >
                Next 7 Days
              </button>
              <button
                onClick={() => setSchedulerView('custom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  schedulerView === 'custom' ? 'bg-[#D62828] text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                }`}
              >
                Custom Date
              </button>
            </div>

            {schedulerView === 'custom' && (
              <input
                type="date"
                value={customSchedulerDate}
                onChange={e => setCustomSchedulerDate(e.target.value)}
                className="p-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold"
              />
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 font-bold text-xs flex justify-between">
              <span>Scheduled Transit Manifest ({schedulerBookings.length} Trips)</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-zinc-800">
              {schedulerBookings.map(b => (
                <div key={b.bookingId} className="p-3.5 hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-16 shrink-0 font-mono font-bold text-slate-700 dark:text-zinc-300">
                      {b.preferredPickupTime}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{b.customerName}</span>
                        <span className="text-slate-400">🐾 {b.petName}</span>
                        <span className="text-[10px] font-mono text-slate-400">({b.bookingId})</span>
                        {getPriorityBadge(b.priority)}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="truncate max-w-[200px]">📍 {b.pickupAddress}</span>
                        <span>➔</span>
                        <span className="truncate max-w-[200px]">🏁 {b.dropAddress}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-[11px]">
                      <div className="font-bold text-slate-700 dark:text-zinc-300">
                        {b.driverName ? `👨‍✈️ ${b.driverName}` : '⚠️ Unassigned Driver'}
                      </div>
                      <div className="text-slate-400">
                        {b.vehicleNumber || 'No Vehicle'}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(b.status)}
                      {getDelayIndicator(b)}
                    </div>

                    <button
                      onClick={() => setSelectedBooking(b)}
                      className="p-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {schedulerBookings.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs font-bold">
                  No trips scheduled for the selected date timeframe.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 3: RECURRING TRANSIT */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'recurring' && hasPermission(currentUser, 'pick_drop_recurring_view') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Recurring Pet Transit Subscriptions</h2>
              <p className="text-xs text-slate-500">Auto-generate daily or weekly pet commute bookings for the next 7 days.</p>
            </div>

            {hasPermission(currentUser, 'pick_drop_recurring_edit') && (
              <button
                onClick={() => {
                  setEditingRecurring(null);
                  if (customers.length > 0) handleRecCustomerChange(customers[0].id);
                  setShowRecurringModal(true);
                }}
                className="px-3 py-1.5 bg-[#D62828] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Recurring Transit</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {recurringSchedules.map(r => (
              <div key={r.scheduleId} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-black text-xs">{r.scheduleId}</span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{r.customerName}</h3>
                    <span className="text-xs text-slate-500">🐾 {r.petName} ({r.serviceType})</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {r.pattern}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-zinc-400">
                  <div>Pickup: <strong>{r.preferredPickupTime}</strong></div>
                  <div>Drop: <strong>{r.preferredDropTime}</strong></div>
                  <div>Assigned Driver: <strong>{r.driverName || 'Unassigned'}</strong></div>
                  <div>Base Estimate: <strong>{formatINR(r.estimatedBaseCharge)}</strong></div>
                </div>

                {hasPermission(currentUser, 'pick_drop_recurring_edit') && (
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex gap-2">
                    <button
                      onClick={async () => {
                        const generated = generateUpcomingBookingsForRecurring(r, bookings, 7, currentUser || undefined);
                        if (generated.length === 0) {
                          alert('All bookings for the next 7 days are already generated.');
                          return;
                        }
                        for (const b of generated) {
                          await onAddBooking(b);
                        }
                        alert(`Generated ${generated.length} upcoming trips for next 7 days!`);
                      }}
                      className="flex-1 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Generate Next 7 Days</span>
                    </button>

                    {onDeleteRecurringSchedule && (
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this recurring subscription?')) {
                            onDeleteRecurringSchedule(r.scheduleId);
                          }
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {recurringSchedules.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs font-bold">
                No active recurring Pick & Drop transit schedules registered.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 4: DRIVERS MASTER & PERFORMANCE */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'drivers' && (hasPermission(currentUser, 'pick_drop_assign') || hasPermission(currentUser, 'pick_drop_edit')) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Authorized Transit Drivers & Performance</h2>
              <p className="text-xs text-slate-500">Trained pet handlers, real-time trip workloads, on-time rates and performance scores.</p>
            </div>

            {hasPermission(currentUser, 'pick_drop_edit') && (
              <button
                onClick={() => {
                  setEditingDriver(null);
                  setDrvName('');
                  setDrvMobile('');
                  setDrvAltMobile('');
                  setDrvLic('');
                  setDrvLicExp('');
                  setDrvEmerg('');
                  setDrvActive(true);
                  setDrvNotes('');
                  setShowDriverModal(true);
                }}
                className="px-3 py-1.5 bg-[#D62828] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Driver</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map(d => {
              const perf = calculateDriverPerformance(d.driverId, bookings);

              return (
                <div key={d.driverId} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-slate-400 font-bold">{d.driverId}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {d.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">{d.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {d.mobile}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        perf.rating === 'Excellent' ? 'bg-emerald-100 text-emerald-800' :
                        perf.rating === 'Good' ? 'bg-blue-100 text-blue-800' :
                        perf.rating === 'Average' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        ★ {perf.rating}
                      </span>
                    </div>
                  </div>

                  {/* Performance Metric Chips */}
                  <div className="grid grid-cols-4 gap-1.5 bg-slate-50 dark:bg-zinc-800/60 p-2 rounded-xl text-center text-[10px]">
                    <div>
                      <span className="text-slate-400 block">Total Trips</span>
                      <strong className="text-slate-900 dark:text-white">{perf.totalTrips}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Completed</span>
                      <strong className="text-emerald-600">{perf.completedTrips}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">On-Time</span>
                      <strong className="text-blue-600">{perf.onTimeTrips}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Active</span>
                      <strong className={perf.activeTrips > 0 ? 'text-indigo-600 font-black' : 'text-slate-400'}>
                        {perf.activeTrips}
                      </strong>
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-zinc-800">
                    <span>Revenue Generated:</span>
                    <strong className="text-emerald-600">{formatINR(perf.totalRevenue)}</strong>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    {hasPermission(currentUser, 'pick_drop_edit') && (
                      <button
                        onClick={() => {
                          setEditingDriver(d);
                          setDrvName(d.name);
                          setDrvMobile(d.mobile);
                          setDrvAltMobile(d.alternateMobile || '');
                          setDrvLic(d.licenseNumber || '');
                          setDrvLicExp(d.licenseExpiry || '');
                          setDrvEmerg(d.emergencyContact || '');
                          setDrvActive(d.isActive);
                          setDrvNotes(d.notes || '');
                          setShowDriverModal(true);
                        }}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Driver</span>
                      </button>
                    )}

                    {onDeleteDriver && hasPermission(currentUser, 'pick_drop_delete') && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete driver ${d.name} (${d.driverId})?`)) {
                            onDeleteDriver(d.driverId);
                          }
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg cursor-pointer"
                        title="Delete Driver (Accountant Only)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {drivers.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
                <UserIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">No Drivers Registered</p>
                <p className="text-xs text-slate-400 mt-1">Use the "+ Add Driver" button to register authorized pet transportation drivers.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 5: VEHICLES MASTER & COMPLIANCE */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'vehicles' && (hasPermission(currentUser, 'pick_drop_assign') || hasPermission(currentUser, 'pick_drop_edit')) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Registered Fleet Vehicles & Compliance</h2>
              <p className="text-xs text-slate-500">Monitor vehicle capacity, climate control, safety cages, and Insurance/PUC validity.</p>
            </div>

            {hasPermission(currentUser, 'pick_drop_edit') && (
              <button
                onClick={() => {
                  setEditingVehicle(null);
                  setVehNumber('');
                  setVehType('Van');
                  setVehCapacity(2);
                  setVehAc(true);
                  setVehPetFriendly(true);
                  setVehActive(true);
                  setVehInsExpiry('');
                  setVehPucExpiry('');
                  setVehNotes('');
                  setShowVehicleModal(true);
                }}
                className="px-3 py-1.5 bg-[#D62828] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Vehicle</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map(v => {
              const perf = calculateVehiclePerformance(v, bookings);

              return (
                <div key={v.vehicleId} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">{v.vehicleNumber}</h3>
                      <span className="text-[11px] text-slate-500">{v.vehicleType}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {v.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {v.isAc && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">❄️ AC Equipped</span>}
                    {v.isPetFriendly && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">🐾 Safety Cages</span>}
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">Capacity: {v.capacity} Pets</span>
                  </div>

                  {/* Document Expiry Warnings */}
                  <div className="space-y-1 text-[11px] bg-slate-50 dark:bg-zinc-800/60 p-2 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Insurance Expiry:</span>
                      <span className="flex items-center gap-1 font-mono font-bold">
                        {perf.insuranceStatus === 'EXPIRED' && <span className="text-red-600">🔴 Expired</span>}
                        {perf.insuranceStatus === 'EXPIRING_SOON' && <span className="text-amber-600">🟡 Expiring Soon</span>}
                        {perf.insuranceStatus === 'VALID' && <span className="text-emerald-600">🟢 Valid</span>}
                        <span>({v.insuranceExpiry || 'N/A'})</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">PUC Expiry:</span>
                      <span className="flex items-center gap-1 font-mono font-bold">
                        {perf.pucStatus === 'EXPIRED' && <span className="text-red-600">🔴 Expired</span>}
                        {perf.pucStatus === 'EXPIRING_SOON' && <span className="text-amber-600">🟡 Expiring Soon</span>}
                        {perf.pucStatus === 'VALID' && <span className="text-emerald-600">🟢 Valid</span>}
                        <span>({v.pucExpiry || 'N/A'})</span>
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-zinc-700">
                      <span className="text-slate-500">Completed Trips:</span>
                      <strong className="text-emerald-600">{perf.completedTrips} (Rev: {formatINR(perf.totalRevenue)})</strong>
                    </div>
                  </div>

                  {v.notes && <p className="text-[11px] text-slate-500 italic">{v.notes}</p>}

                  {/* Actions Footer */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    {hasPermission(currentUser, 'pick_drop_edit') && (
                      <button
                        onClick={() => {
                          setEditingVehicle(v);
                          setVehNumber(v.vehicleNumber);
                          setVehType(v.vehicleType);
                          setVehCapacity(v.capacity);
                          setVehAc(v.isAc);
                          setVehPetFriendly(v.isPetFriendly);
                          setVehActive(v.isActive);
                          setVehInsExpiry(v.insuranceExpiry || '');
                          setVehPucExpiry(v.pucExpiry || '');
                          setVehNotes(v.notes || '');
                          setShowVehicleModal(true);
                        }}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Vehicle</span>
                      </button>
                    )}

                    {onDeleteVehicle && hasPermission(currentUser, 'pick_drop_delete') && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete vehicle ${v.vehicleNumber} (${v.vehicleId})?`)) {
                            onDeleteVehicle(v.vehicleId);
                          }
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg cursor-pointer"
                        title="Delete Vehicle (Accountant Only)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {vehicles.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
                <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">No Vehicles Registered</p>
                <p className="text-xs text-slate-400 mt-1">Use the "+ Add Vehicle" button to register fleet vehicles.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 6: PRICING RULES ENGINE */}
      {/* ---------------------------------------------------- */}
      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 6: PRICING RULES ENGINE */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'pricing' && hasPermission(currentUser, 'pick_drop_pricing_view') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-[#D62828]" />
                Dynamic Pricing Rules Matrix
              </h2>
              <p className="text-xs text-slate-500">
                Configure base transit charges, per-km rates, waiting surcharges and multi-pet fees for ride quotations.
              </p>
            </div>

            {hasPermission(currentUser, 'pick_drop_pricing_edit') && (
              <button
                onClick={() => {
                  setEditingRule(null);
                  setRuleName('');
                  setRuleType('FIXED');
                  setRuleRate(250);
                  setRuleActive(true);
                  setRuleEffectiveFrom(new Date().toISOString().split('T')[0]);
                  setRuleNotes('');
                  setShowRuleModal(true);
                }}
                className="px-3 py-1.5 bg-[#D62828] hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer shadow-sm transition-transform active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Pricing Rule</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {pricingRules.map(r => (
              <div key={r.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{r.ruleName}</h3>
                      <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold uppercase bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded">{r.ruleType}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                      {r.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <div className="text-xl font-black text-[#D62828]">
                    {formatINR(r.rate)}
                    {r.ruleType === 'PER_KM' && <span className="text-xs font-normal text-slate-400"> / km</span>}
                    {r.ruleType === 'WAITING' && <span className="text-xs font-normal text-slate-400"> / 30m</span>}
                    {r.ruleType === 'PER_PET' && <span className="text-xs font-normal text-slate-400"> / extra pet</span>}
                  </div>

                  {r.effectiveFrom && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      Effective: {r.effectiveFrom}
                    </div>
                  )}

                  {r.notes && <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-zinc-800/40 p-2 rounded-lg">{r.notes}</p>}
                </div>

                {/* Pricing Rule Actions */}
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  {/* Edit Pricing Rule (Admin & Accountant) */}
                  {hasPermission(currentUser, 'pick_drop_pricing_edit') && (
                    <button
                      onClick={() => {
                        setEditingRule(r);
                        setRuleName(r.ruleName);
                        setRuleType(r.ruleType);
                        setRuleRate(r.rate);
                        setRuleActive(r.isActive);
                        setRuleEffectiveFrom(r.effectiveFrom || new Date().toISOString().split('T')[0]);
                        setRuleNotes(r.notes || '');
                        setShowRuleModal(true);
                      }}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Edit Pricing Rule"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}

                  {/* Toggle Active / Inactive (Admin & Accountant) */}
                  {hasPermission(currentUser, 'pick_drop_pricing_edit') && (
                    <button
                      onClick={async () => {
                        const updated: PickDropPricingRule = {
                          ...r,
                          isActive: !r.isActive
                        };
                        await onSavePricingRule(updated);
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                        r.isActive 
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' 
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                      title={r.isActive ? 'Deactivate Rule' : 'Activate Rule'}
                    >
                      <span>{r.isActive ? 'Deactivate' : 'Activate'}</span>
                    </button>
                  )}

                  {/* Delete Pricing Rule (Accountant ONLY) */}
                  {onDeletePricingRule && hasPermission(currentUser, 'pick_drop_delete') && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to permanently delete pricing rule "${r.ruleName}"?`)) {
                          onDeletePricingRule(r.id);
                        }
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg cursor-pointer"
                      title="Delete Rule (Accountant Only)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {pricingRules.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
                <IndianRupee className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">No Pricing Rules Configured</p>
                <p className="text-xs text-slate-400 mt-1">
                  {hasPermission(currentUser, 'pick_drop_pricing_edit') 
                    ? 'Use the "+ Add Pricing Rule" button above to establish transportation rates.' 
                    : 'Contact Administrator or Accountant to configure transportation pricing rules.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 7: REPORTS & EXPORTS */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'reports' && hasPermission(currentUser, 'pick_drop_reports_view') && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-3">
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-[#D62828]" />
              One-Click Transit CSV Exports
            </h2>
            <p className="text-xs text-slate-500">
              Instantly export structured data directly in your browser without cloud storage overhead.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <button
                onClick={() => exportPickDropTripsCSV(bookings)}
                className="p-3 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer"
              >
                <span>📥 Complete Trips Log</span>
                <span className="text-[10px] text-slate-400">({bookings.length})</span>
              </button>

              <button
                onClick={() => exportPickDropDriversCSV(drivers, bookings)}
                className="p-3 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer"
              >
                <span>📥 Drivers Performance</span>
                <span className="text-[10px] text-slate-400">({drivers.length})</span>
              </button>

              <button
                onClick={() => exportPickDropVehiclesCSV(vehicles, bookings)}
                className="p-3 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer"
              >
                <span>📥 Vehicle Utilization</span>
                <span className="text-[10px] text-slate-400">({vehicles.length})</span>
              </button>

              <button
                onClick={() => exportPickDropRevenueCSV(bookings)}
                className="p-3 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer"
              >
                <span>📥 Transit Revenue Matrix</span>
                <span className="text-[10px] text-emerald-600 font-bold">{formatINR(metrics.totalCompletedBilling)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: NEW BOOKING (WITH PREMIUM PHASE 3 FIELDS) */}
      {/* ---------------------------------------------------- */}
      {showNewBookingModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <Car className="w-5 h-5 text-[#D62828]" />
                Register Pick & Drop Booking
              </h3>
              <button 
                onClick={() => setShowNewBookingModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBookingSubmit} className="space-y-4 text-xs">
              {/* Customer & Pet Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-zinc-400 mb-1">Customer *</label>
                  <select
                    value={formCustomerId}
                    onChange={e => handleCustomerChange(e.target.value)}
                    required
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  >
                    <option value="">Select Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-zinc-400 mb-1">Pet *</label>
                  <select
                    value={formPetId}
                    onChange={e => setFormPetId(e.target.value)}
                    required
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  >
                    <option value="">Select Pet</option>
                    {pets.filter(p => p.customerId === formCustomerId).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Service Type & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-zinc-400 mb-1">Service Type *</label>
                  <select
                    value={formServiceType}
                    onChange={e => setFormServiceType(e.target.value as PickDropServiceType)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-bold"
                  >
                    {SERVICE_TYPES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-zinc-400 mb-1">Booking Source</label>
                  <select
                    value={formBookingSource}
                    onChange={e => setFormBookingSource(e.target.value as BookingSource)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-bold"
                  >
                    {BOOKING_SOURCES.map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-zinc-400 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as BookingPriority)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-bold"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High Priority</option>
                    <option value="Emergency">Emergency Priority</option>
                  </select>
                </div>
              </div>

              {/* Pickup Address & Schedule */}
              <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl space-y-2">
                <span className="font-bold text-[#D62828] uppercase text-[10px] block">Pickup Details</span>
                <div>
                  <input
                    type="text"
                    placeholder="Pickup Address *"
                    value={formPickupAddress}
                    onChange={e => setFormPickupAddress(e.target.value)}
                    required
                    className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={formPickupDate}
                    onChange={e => setFormPickupDate(e.target.value)}
                    required
                    className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                  />
                  <input
                    type="text"
                    placeholder="Pickup Time (e.g. 10:00 AM)"
                    value={formPickupTime}
                    onChange={e => setFormPickupTime(e.target.value)}
                    required
                    className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              {/* Drop Address & Schedule */}
              <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl space-y-2">
                <span className="font-bold text-red-600 uppercase text-[10px] block">Drop Details</span>
                <div>
                  <input
                    type="text"
                    placeholder="Drop Address *"
                    value={formDropAddress}
                    onChange={e => setFormDropAddress(e.target.value)}
                    required
                    className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={formDropDate}
                    onChange={e => setFormDropDate(e.target.value)}
                    required
                    className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                  />
                  <input
                    type="text"
                    placeholder="Drop Time (e.g. 05:00 PM)"
                    value={formDropTime}
                    onChange={e => setFormDropTime(e.target.value)}
                    required
                    className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              {/* Driver & Vehicle Allocation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-zinc-400 mb-1">Assign Driver (Optional)</label>
                  <select
                    value={formDriverId}
                    onChange={e => setFormDriverId(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  >
                    <option value="">Unassigned</option>
                    {drivers.map(d => (
                      <option key={d.driverId} value={d.driverId}>{d.name} ({d.driverId})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-zinc-400 mb-1">Assign Vehicle (Optional)</label>
                  <select
                    value={formVehicleId}
                    onChange={e => setFormVehicleId(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  >
                    <option value="">Unassigned</option>
                    {vehicles.map(v => (
                      <option key={v.vehicleId} value={v.vehicleId}>{v.vehicleNumber} ({v.vehicleType})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Advanced Dynamic Pricing Parameters */}
              <div className="bg-slate-100 dark:bg-zinc-800 p-3 rounded-xl space-y-2">
                <span className="font-bold uppercase text-[10px] text-slate-500 block">Dynamic Pricing Parameters</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Distance (KM)</label>
                    <input
                      type="number"
                      min="0"
                      value={formDistanceKm}
                      onChange={e => setFormDistanceKm(Number(e.target.value))}
                      className="w-full p-1 rounded bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Waiting (Mins)</label>
                    <input
                      type="number"
                      min="0"
                      step="15"
                      value={formWaitingMins}
                      onChange={e => setFormWaitingMins(Number(e.target.value))}
                      className="w-full p-1 rounded bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Extra Pets</label>
                    <input
                      type="number"
                      min="0"
                      value={formAdditionalPets}
                      onChange={e => setFormAdditionalPets(Number(e.target.value))}
                      className="w-full p-1 rounded bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Extra Stops</label>
                    <input
                      type="number"
                      min="0"
                      value={formAdditionalStops}
                      onChange={e => setFormAdditionalStops(Number(e.target.value))}
                      className="w-full p-1 rounded bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsNight}
                      onChange={e => setFormIsNight(e.target.checked)}
                    />
                    <span className="text-[11px] font-bold">Night Surcharge</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsHoliday}
                      onChange={e => setFormIsHoliday(e.target.checked)}
                    />
                    <span className="text-[11px] font-bold">Holiday Surcharge</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsEmergency || formPriority === 'Emergency'}
                      onChange={e => setFormIsEmergency(e.target.checked)}
                    />
                    <span className="text-[11px] font-bold text-red-600">Emergency Priority</span>
                  </label>
                </div>

                {/* Live Dynamic Price Breakdown Preview */}
                <div className="pt-2 border-t border-slate-200 dark:border-zinc-700 text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                    <span>Base Fare:</span>
                    <span>{formatINR(priceBreakdown.baseCharge)}</span>
                  </div>
                  {priceBreakdown.distanceCharge > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                      <span>Distance Surcharge ({formDistanceKm} km):</span>
                      <span>{formatINR(priceBreakdown.distanceCharge)}</span>
                    </div>
                  )}
                  {priceBreakdown.waitingCharge > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                      <span>Waiting Charges ({formWaitingMins} mins):</span>
                      <span>{formatINR(priceBreakdown.waitingCharge)}</span>
                    </div>
                  )}
                  {priceBreakdown.additionalPetsCharge > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                      <span>Extra Pet Surcharge:</span>
                      <span>{formatINR(priceBreakdown.additionalPetsCharge)}</span>
                    </div>
                  )}
                  {priceBreakdown.nightCharge > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                      <span>Night Service Surcharge:</span>
                      <span>{formatINR(priceBreakdown.nightCharge)}</span>
                    </div>
                  )}
                  {priceBreakdown.holidayCharge > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                      <span>Holiday Surcharge:</span>
                      <span>{formatINR(priceBreakdown.holidayCharge)}</span>
                    </div>
                  )}
                  {priceBreakdown.emergencyCharge > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                      <span>Emergency Priority Surcharge:</span>
                      <span>{formatINR(priceBreakdown.emergencyCharge)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-200 dark:border-zinc-700">
                    <span>Subtotal:</span>
                    <span>{formatINR(priceBreakdown.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GST (18%):</span>
                    <span>{formatINR(priceBreakdown.gstAmount)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-[#D62828] pt-1">
                    <span>Grand Total:</span>
                    <span>{formatINR(priceBreakdown.grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBookingModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D62828] text-white rounded-xl font-bold cursor-pointer"
                >
                  Confirm & Save Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ESTIMATE QUOTATION VIEW */}
      {/* ---------------------------------------------------- */}
      {showEstimateModal && activeEstimate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Pick & Drop Transit Estimate
                </h3>
                <span className="font-mono text-[10px] text-slate-400">{activeEstimate.estimateId}</span>
              </div>
              <button 
                onClick={() => setShowEstimateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl space-y-1">
                <p><strong>Customer:</strong> {activeEstimate.customerName} ({activeEstimate.customerPhone})</p>
                <p><strong>Pet:</strong> {activeEstimate.petName}</p>
                <p><strong>Service:</strong> {activeEstimate.serviceType}</p>
                <p><strong>Pickup:</strong> {activeEstimate.pickupAddress} on {activeEstimate.pickupDate} ({activeEstimate.preferredPickupTime})</p>
                <p><strong>Drop:</strong> {activeEstimate.dropAddress}</p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl space-y-1 text-slate-800 dark:text-zinc-200">
                <div className="flex justify-between">
                  <span>Base Charge:</span>
                  <span>{formatINR(activeEstimate.baseCharge)}</span>
                </div>
                {activeEstimate.additionalCharges > 0 && (
                  <div className="flex justify-between">
                    <span>Additional / Distance Surcharges:</span>
                    <span>{formatINR(activeEstimate.additionalCharges)}</span>
                  </div>
                )}
                {activeEstimate.waitingCharges > 0 && (
                  <div className="flex justify-between">
                    <span>Waiting Charges:</span>
                    <span>{formatINR(activeEstimate.waitingCharges)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t border-purple-200 dark:border-purple-800">
                  <span>Subtotal:</span>
                  <span>{formatINR(activeEstimate.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Estimated GST (18%):</span>
                  <span>{formatINR(activeEstimate.gstAmount)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-[#D62828] pt-1">
                  <span>Estimated Total:</span>
                  <span>{formatINR(activeEstimate.grandTotal)}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic">
                * Note: This is an estimated quotation valid until {activeEstimate.validUntil}. Final billing will be generated upon trip completion via official GST Invoice.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowEstimateModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 rounded-xl font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: NEW RECURRING SUBSCRIPTION */}
      {/* ---------------------------------------------------- */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <Repeat className="w-5 h-5 text-purple-600" />
                New Recurring Transit Subscription
              </h3>
              <button 
                onClick={() => setShowRecurringModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecurringSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Customer *</label>
                  <select
                    value={recCustomerId}
                    onChange={e => handleRecCustomerChange(e.target.value)}
                    required
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  >
                    <option value="">Select Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Pet *</label>
                  <select
                    value={recPetId}
                    onChange={e => setRecPetId(e.target.value)}
                    required
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  >
                    <option value="">Select Pet</option>
                    {pets.filter(p => p.customerId === recCustomerId).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Commute Pattern</label>
                <select
                  value={recPattern}
                  onChange={e => setRecPattern(e.target.value as RecurringTransitPattern)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-bold"
                >
                  <option value="DAILY">Daily (Monday to Sunday)</option>
                  <option value="WEEKLY">Weekly (Same Day)</option>
                  <option value="ALTERNATE_DAYS">Alternate Days</option>
                  <option value="CUSTOM_DAYS">Custom Weekdays</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Pickup Time</label>
                  <input
                    type="text"
                    value={recPickupTime}
                    onChange={e => setRecPickupTime(e.target.value)}
                    className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Drop Time</label>
                  <input
                    type="text"
                    value={recDropTime}
                    onChange={e => setRecDropTime(e.target.value)}
                    className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={recStartDate}
                    onChange={e => setRecStartDate(e.target.value)}
                    required
                    className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={recEndDate}
                    onChange={e => setRecEndDate(e.target.value)}
                    className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecurringModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Recurring Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: VIEW & MANAGE TRIP DETAILS + TIMELINE */}
      {/* ---------------------------------------------------- */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black">{selectedBooking.bookingId}</h3>
                  {getStatusBadge(selectedBooking.status)}
                  {getDelayIndicator(selectedBooking)}
                </div>
                <p className="text-xs text-slate-500">{selectedBooking.serviceType} • Booked via {selectedBooking.bookingSource || 'Phone'}</p>
              </div>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Lifecycle Controls Bar */}
            <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-xl space-y-2 border border-slate-200 dark:border-zinc-700">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Trip Operations & Status Progression:
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                {selectedBooking.status === 'REQUESTED' && (
                  <button
                    onClick={() => {
                      setStatusActionType('CONFIRMED');
                      setStatusActionNote('Booking confirmed with customer');
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Confirm Booking
                  </button>
                )}

                {['REQUESTED', 'CONFIRMED'].includes(selectedBooking.status) && hasPermission(currentUser, 'pick_drop_assign') && (
                  <button
                    onClick={() => {
                      setStatusActionType('DRIVER_ASSIGNED');
                      setSelectedDriverId(drivers[0]?.driverId || '');
                      setSelectedVehicleId(vehicles[0]?.vehicleId || '');
                    }}
                    className="px-3 py-1.5 bg-purple-600 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Assign Driver & Vehicle
                  </button>
                )}

                {selectedBooking.status === 'DRIVER_ASSIGNED' && (
                  <button
                    onClick={() => {
                      setStatusActionType('ON_THE_WAY');
                      setStatusActionNote('Driver dispatched to pickup location');
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Mark On The Way
                  </button>
                )}

                {selectedBooking.status === 'ON_THE_WAY' && (
                  <button
                    onClick={() => {
                      setStatusActionType('PET_PICKED_UP');
                      setStatusActionNote('Pet received safely from customer');
                    }}
                    className="px-3 py-1.5 bg-teal-600 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Confirm Pet Pickup
                  </button>
                )}

                {selectedBooking.status === 'PET_PICKED_UP' && (
                  <button
                    onClick={() => {
                      setStatusActionType('IN_TRANSIT');
                      setStatusActionNote('Transit vehicle in motion');
                    }}
                    className="px-3 py-1.5 bg-cyan-600 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Mark In Transit
                  </button>
                )}

                {selectedBooking.status === 'IN_TRANSIT' && (
                  <button
                    onClick={() => {
                      setStatusActionType('DELIVERED');
                      setStatusActionNote('Pet handed over safely at destination');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Mark Delivered
                  </button>
                )}

                {selectedBooking.status === 'DELIVERED' && (
                  <button
                    onClick={() => {
                      setStatusActionType('COMPLETED');
                      setStatusActionNote('Trip completed and closed');
                    }}
                    className="px-3 py-1.5 bg-green-600 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Complete Trip
                  </button>
                )}

                {!['COMPLETED', 'CANCELLED', 'PICKUP_FAILED', 'DROP_FAILED'].includes(selectedBooking.status) && (
                  <>
                    <button
                      onClick={() => {
                        setStatusActionType('CANCELLED');
                        setStatusActionNote('Trip cancelled by customer request');
                      }}
                      className="px-2.5 py-1.5 bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setStatusActionType('PICKUP_FAILED');
                        setStatusActionNote('Customer unavailable at pickup location');
                      }}
                      className="px-2.5 py-1.5 bg-red-100 text-red-700 font-bold rounded-lg cursor-pointer"
                    >
                      Fail
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* In-Modal Status Confirmation Action Box */}
            {statusActionType && (
              <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 space-y-3">
                <span className="font-bold text-amber-900 dark:text-amber-200 text-xs block">
                  Confirm Status Change to: {statusActionType}
                </span>

                {statusActionType === 'DRIVER_ASSIGNED' && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-slate-600 dark:text-zinc-400 font-bold mb-1">Select Driver</label>
                      <select
                        value={selectedDriverId}
                        onChange={e => setSelectedDriverId(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg"
                      >
                        {drivers.map(d => (
                          <option key={d.driverId} value={d.driverId}>{d.name} ({d.driverId})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-zinc-400 font-bold mb-1">Select Vehicle</label>
                      <select
                        value={selectedVehicleId}
                        onChange={e => setSelectedVehicleId(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg"
                      >
                        {vehicles.map(v => (
                          <option key={v.vehicleId} value={v.vehicleId}>{v.vehicleNumber} ({v.vehicleType})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {statusActionType === 'DELIVERED' && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-slate-600 dark:text-zinc-400 font-bold mb-1">Delivered To (Name)</label>
                      <input
                        type="text"
                        placeholder="Receiver Name"
                        value={receiverName}
                        onChange={e => setReceiverName(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-zinc-400 font-bold mb-1">Relationship</label>
                      <input
                        type="text"
                        placeholder="e.g. Self, Spouse, Guard"
                        value={receiverRel}
                        onChange={e => setReceiverRel(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-600 dark:text-zinc-400 font-bold text-xs mb-1">Action Notes / Observations</label>
                  <input
                    type="text"
                    placeholder="Enter notes..."
                    value={statusActionNote}
                    onChange={e => setStatusActionNote(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setStatusActionType(null)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteStatusTransition}
                    className="px-3 py-1.5 bg-[#D62828] text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Confirm & Update Status
                  </button>
                </div>
              </div>
            )}

            {/* Trip Details Matrix */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl">
                <span className="font-bold text-slate-400 uppercase text-[10px] block">Customer & Pet</span>
                <p><strong>Customer:</strong> {selectedBooking.customerName} ({selectedBooking.customerPhone})</p>
                <p><strong>Emergency Contact:</strong> {selectedBooking.emergencyContact || 'N/A'}</p>
                <p><strong>Pet:</strong> {selectedBooking.petName} ({selectedBooking.petSpecies || 'Dog'})</p>
                <p><strong>Pickup Date:</strong> {selectedBooking.pickupDate} at {selectedBooking.preferredPickupTime}</p>
                <p><strong>Pickup Addr:</strong> {selectedBooking.pickupAddress}</p>
              </div>

              <div className="space-y-1 bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl">
                <span className="font-bold text-slate-400 uppercase text-[10px] block">Transit & Financials</span>
                <p><strong>Driver:</strong> {selectedBooking.driverName || 'Unassigned'}</p>
                <p><strong>Vehicle:</strong> {selectedBooking.vehicleNumber || 'Unassigned'}</p>
                <p><strong>Base Fare:</strong> {formatINR(selectedBooking.baseCharge)}</p>
                <p><strong>Total Fare:</strong> <strong className="text-[#D62828]">{formatINR(selectedBooking.subtotal)}</strong></p>
                {selectedBooking.invoiceNumber ? (
                  <div className="pt-1">
                    <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 inline-block">
                      GST Invoice: #{selectedBooking.invoiceNumber}
                    </span>
                    <p className="text-[9px] text-slate-400 mt-0.5 italic">Finalized invoice modifications restricted to Accountant.</p>
                  </div>
                ) : (
                  selectedBooking.status === 'COMPLETED' && hasPermission(currentUser, 'invoices_create') && (
                    <div className="pt-1">
                      <button
                        onClick={() => {
                          onGenerateInvoiceForBooking(selectedBooking);
                          setSelectedBooking(null);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Generate Final GST Invoice</span>
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD / EDIT DRIVER */}
      {/* ---------------------------------------------------- */}
      {showDriverModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-[#D62828]" />
                {editingDriver ? `Edit Driver: ${editingDriver.name}` : 'Register Authorized Driver'}
              </h3>
              <button 
                onClick={() => setShowDriverModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!drvName.trim() || !drvMobile.trim()) {
                  alert('Driver Name and Mobile Number are required.');
                  return;
                }
                const driverData: PickDropDriver = {
                  id: editingDriver?.id || `drv-local-${Date.now()}`,
                  driverId: editingDriver?.driverId || `DRV-${Date.now().toString().slice(-4)}`,
                  name: drvName.trim(),
                  mobile: drvMobile.trim(),
                  alternateMobile: drvAltMobile.trim() || undefined,
                  licenseNumber: drvLic.trim() || undefined,
                  licenseExpiry: drvLicExp.trim() || undefined,
                  emergencyContact: drvEmerg.trim() || undefined,
                  isActive: drvActive,
                  notes: drvNotes.trim() || undefined,
                  createdAt: editingDriver?.createdAt || new Date().toISOString()
                };

                await onSaveDriver(driverData);
                setShowDriverModal(false);
                setEditingDriver(null);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Driver Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Pawar"
                    value={drvName}
                    onChange={e => setDrvName(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Primary Mobile *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={drvMobile}
                    onChange={e => setDrvMobile(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    placeholder="Optional"
                    value={drvAltMobile}
                    onChange={e => setDrvAltMobile(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. 9819001122 (Wife)"
                    value={drvEmerg}
                    onChange={e => setDrvEmerg(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Driving License Number</label>
                  <input
                    type="text"
                    placeholder="e.g. MH02-20210087654"
                    value={drvLic}
                    onChange={e => setDrvLic(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">License Expiry Date</label>
                  <input
                    type="date"
                    value={drvLicExp}
                    onChange={e => setDrvLicExp(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Notes / Certifications</label>
                <textarea
                  rows={2}
                  placeholder="Specialization, pet handling experience, etc."
                  value={drvNotes}
                  onChange={e => setDrvNotes(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={drvActive}
                    onChange={e => setDrvActive(e.target.checked)}
                    className="rounded text-[#D62828]"
                  />
                  <span>Active Driver (Eligible for assignment)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowDriverModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D62828] text-white rounded-xl font-bold cursor-pointer"
                >
                  {editingDriver ? 'Update Driver' : 'Save Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD / EDIT VEHICLE */}
      {/* ---------------------------------------------------- */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#D62828]" />
                {editingVehicle ? `Edit Vehicle: ${editingVehicle.vehicleNumber}` : 'Register Fleet Vehicle'}
              </h3>
              <button 
                onClick={() => setShowVehicleModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!vehNumber.trim()) {
                  alert('Vehicle Registration Number is required.');
                  return;
                }
                const vehicleData: PickDropVehicle = {
                  id: editingVehicle?.id || `veh-local-${Date.now()}`,
                  vehicleId: editingVehicle?.vehicleId || `VEH-${Date.now().toString().slice(-4)}`,
                  vehicleNumber: vehNumber.trim().toUpperCase(),
                  vehicleType: vehType,
                  capacity: Number(vehCapacity) || 1,
                  isAc: vehAc,
                  isPetFriendly: vehPetFriendly,
                  isActive: vehActive,
                  insuranceExpiry: vehInsExpiry.trim() || undefined,
                  pucExpiry: vehPucExpiry.trim() || undefined,
                  notes: vehNotes.trim() || undefined,
                  createdAt: editingVehicle?.createdAt || new Date().toISOString()
                };

                await onSaveVehicle(vehicleData);
                setShowVehicleModal(false);
                setEditingVehicle(null);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Vehicle Plate Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH-02-DW-4589"
                    value={vehNumber}
                    onChange={e => setVehNumber(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Vehicle Model / Type</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eeco AC Van / WagonR"
                    value={vehType}
                    onChange={e => setVehType(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-1">Capacity (Pets)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={vehCapacity}
                    onChange={e => setVehCapacity(Number(e.target.value))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Insurance Expiry</label>
                  <input
                    type="date"
                    value={vehInsExpiry}
                    onChange={e => setVehInsExpiry(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">PUC Expiry</label>
                  <input
                    type="date"
                    value={vehPucExpiry}
                    onChange={e => setVehPucExpiry(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vehAc}
                    onChange={e => setVehAc(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>❄️ AC Equipped</span>
                </label>
                <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vehPetFriendly}
                    onChange={e => setVehPetFriendly(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>🐾 Safety Cages</span>
                </label>
                <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vehActive}
                    onChange={e => setVehActive(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Active Fleet</span>
                </label>
              </div>

              <div>
                <label className="block font-bold mb-1">Vehicle Notes / Features</label>
                <textarea
                  rows={2}
                  placeholder="Interior specs, safety equipment, sanitization schedule..."
                  value={vehNotes}
                  onChange={e => setVehNotes(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D62828] text-white rounded-xl font-bold cursor-pointer"
                >
                  {editingVehicle ? 'Update Vehicle' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD / EDIT PRICING RULE */}
      {/* ---------------------------------------------------- */}
      {showRuleModal && hasPermission(currentUser, 'pick_drop_pricing_edit') && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-[#D62828]" />
                {editingRule ? `Edit Pricing Rule: ${editingRule.ruleName}` : 'Create New Pricing Rule'}
              </h3>
              <button 
                onClick={() => setShowRuleModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!ruleName.trim()) {
                  alert('Rule Name is required.');
                  return;
                }
                if (ruleRate <= 0) {
                  alert('Rate must be greater than 0.');
                  return;
                }
                const ruleData: PickDropPricingRule = {
                  id: editingRule?.id || `rule-local-${Date.now()}`,
                  ruleName: ruleName.trim(),
                  ruleType: ruleType,
                  rate: Number(ruleRate) || 0,
                  isActive: ruleActive,
                  effectiveFrom: ruleEffectiveFrom || new Date().toISOString().split('T')[0],
                  notes: ruleNotes.trim() || undefined
                };

                await onSavePricingRule(ruleData);
                setShowRuleModal(false);
                setEditingRule(null);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Distance Charge / Weekend Night Rate"
                  value={ruleName}
                  onChange={e => setRuleName(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Pricing Model / Type *</label>
                  <select
                    value={ruleType}
                    onChange={e => setRuleType(e.target.value as PricingRuleType)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-bold"
                  >
                    <option value="FIXED">FIXED (Base Charge)</option>
                    <option value="ROUND_TRIP">ROUND_TRIP (Two-way Discounted)</option>
                    <option value="PER_KM">PER_KM (Distance Rate)</option>
                    <option value="WAITING">WAITING (Per 30 Mins Waiting)</option>
                    <option value="PER_PET">PER_PET (Additional Pet Charge)</option>
                    <option value="NIGHT">NIGHT (Late Night Surcharge)</option>
                    <option value="HOLIDAY">HOLIDAY (Holiday Surcharge)</option>
                    <option value="EMERGENCY">EMERGENCY (Priority Dispatch)</option>
                    <option value="ADDITIONAL_STOP">ADDITIONAL_STOP (Per Extra Stop)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Rate (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={ruleRate}
                    onChange={e => setRuleRate(Number(e.target.value))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono font-bold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={ruleEffectiveFrom}
                    onChange={e => setRuleEffectiveFrom(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ruleActive}
                      onChange={e => setRuleActive(e.target.checked)}
                      className="rounded text-emerald-600 w-4 h-4"
                    />
                    <span>Active Status</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Description / Billing Notes</label>
                <textarea
                  rows={2}
                  placeholder="Terms, conditions, applicability, or surcharge rationale..."
                  value={ruleNotes}
                  onChange={e => setRuleNotes(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D62828] text-white rounded-xl font-bold cursor-pointer"
                >
                  {editingRule ? 'Update Pricing Rule' : 'Save Pricing Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
