// ============================================================
// PickDropManager.tsx — Pick & Drop Transportation Hub
// Project: The House of Pawz – Billing Pro
// ============================================================

import React, { useState, useMemo } from 'react';
import { 
  Car, Calendar, Clock, MapPin, User as UserIcon, Phone, 
  Search, Filter, Plus, CheckCircle, AlertTriangle, XCircle, 
  ArrowRight, CheckCircle2, ShieldCheck, Tag, ExternalLink,
  ChevronRight, RefreshCw, FileText, IndianRupee, Truck,
  Navigation, Eye, Edit3, Trash2, Check, AlertCircle, Info
} from 'lucide-react';
import { 
  PickDropBooking, 
  PickDropStatus, 
  PickDropServiceType, 
  PickDropDriver, 
  PickDropVehicle, 
  PickDropPricingRule, 
  Customer, 
  Pet, 
  User, 
  formatINR, 
  formatDateDDMMYYYY 
} from '../types';
import { hasPermission } from '../lib/permissions';
import { 
  calculatePickDropPrice, 
  generateNextBookingId 
} from '../lib/pickDropService';

interface PickDropManagerProps {
  bookings: PickDropBooking[];
  drivers: PickDropDriver[];
  vehicles: PickDropVehicle[];
  pricingRules: PickDropPricingRule[];
  customers: Customer[];
  pets: Pet[];
  currentUser: User | null;
  onAddBooking: (booking: PickDropBooking) => Promise<void>;
  onUpdateStatus: (bookingId: string, newStatus: PickDropStatus, note: string | undefined, extraPayload?: Partial<PickDropBooking>) => Promise<void>;
  onUpdateBooking: (booking: PickDropBooking) => Promise<void>;
  onDeleteBooking: (bookingId: string) => Promise<void>;
  onSaveDriver: (driver: PickDropDriver) => Promise<void>;
  onSaveVehicle: (vehicle: PickDropVehicle) => Promise<void>;
  onSavePricingRule: (rule: PickDropPricingRule) => Promise<void>;
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

export const PickDropManager: React.FC<PickDropManagerProps> = ({
  bookings,
  drivers,
  vehicles,
  pricingRules,
  customers,
  pets,
  currentUser,
  onAddBooking,
  onUpdateStatus,
  onUpdateBooking,
  onDeleteBooking,
  onSaveDriver,
  onSaveVehicle,
  onSavePricingRule,
  onGenerateInvoiceForBooking
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'trips' | 'drivers' | 'vehicles' | 'pricing'>('trips');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('ALL');

  // Modals
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<PickDropBooking | null>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<PickDropDriver | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<PickDropVehicle | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<PickDropPricingRule | null>(null);

  // Status Action Modal State
  const [statusActionType, setStatusActionType] = useState<PickDropStatus | null>(null);
  const [statusActionNote, setStatusActionNote] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverRel, setReceiverRel] = useState('');

  // New Booking Form State
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formPetId, setFormPetId] = useState('');
  const [formServiceType, setFormServiceType] = useState<PickDropServiceType>('One Way Pickup');
  const [formPickupAddress, setFormPickupAddress] = useState('');
  const [formPickupLandmark, setFormPickupLandmark] = useState('');
  const [formPickupDate, setFormPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPickupTime, setFormPickupTime] = useState('10:00 AM');
  const [formPickupWindow, setFormPickupWindow] = useState('10:00 AM - 11:00 AM');
  const [formPickupContact, setFormPickupContact] = useState('');
  const [formPickupMapsLink, setFormPickupMapsLink] = useState('');
  const [formDropAddress, setFormDropAddress] = useState('The House of Pawz, Pet Care Center');
  const [formDropLandmark, setFormDropLandmark] = useState('');
  const [formDropDate, setFormDropDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDropTime, setFormDropTime] = useState('11:30 AM');
  const [formDropContact, setFormDropContact] = useState('');
  const [formDropMapsLink, setFormDropMapsLink] = useState('');
  const [formDriverId, setFormDriverId] = useState('');
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formCustomerNotes, setFormCustomerNotes] = useState('');
  const [formPetHandlingNotes, setFormPetHandlingNotes] = useState('');
  const [formStaffNotes, setFormStaffNotes] = useState('');

  // Pricing calculator inputs in form
  const [formDistanceKm, setFormDistanceKm] = useState(0);
  const [formWaitingMins, setFormWaitingMins] = useState(0);
  const [formAdditionalPets, setFormAdditionalPets] = useState(0);
  const [formIsNight, setFormIsNight] = useState(false);
  const [formIsEmergency, setFormIsEmergency] = useState(false);

  // Driver Form
  const [drvName, setDrvName] = useState('');
  const [drvMobile, setDrvMobile] = useState('');
  const [drvAltMobile, setDrvAltMobile] = useState('');
  const [drvLicense, setDrvLicense] = useState('');
  const [drvExpiry, setDrvExpiry] = useState('');
  const [drvEmergency, setDrvEmergency] = useState('');
  const [drvActive, setDrvActive] = useState(true);
  const [drvNotes, setDrvNotes] = useState('');

  // Vehicle Form
  const [vehNumber, setVehNumber] = useState('');
  const [vehType, setVehType] = useState('Van');
  const [vehCapacity, setVehCapacity] = useState(2);
  const [vehAc, setVehAc] = useState(true);
  const [vehPetFriendly, setVehPetFriendly] = useState(true);
  const [vehActive, setVehActive] = useState(true);
  const [vehInsExpiry, setVehInsExpiry] = useState('');
  const [vehPucExpiry, setVehPucExpiry] = useState('');
  const [vehNotes, setVehNotes] = useState('');

  // Pricing Rule Form
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<'FIXED' | 'PER_KM' | 'PER_PET' | 'WAITING' | 'NIGHT' | 'EMERGENCY' | 'ADDITIONAL' | 'ROUND_TRIP'>('FIXED');
  const [ruleRate, setRuleRate] = useState(0);
  const [ruleActive, setRuleActive] = useState(true);
  const [ruleNotes, setRuleNotes] = useState('');

  // ----------------------------------------------------
  // Live Pricing Calculation
  // ----------------------------------------------------
  const calculatedPricing = useMemo(() => {
    return calculatePickDropPrice(
      formServiceType,
      formDistanceKm,
      formWaitingMins,
      formAdditionalPets,
      formIsNight,
      formIsEmergency,
      pricingRules
    );
  }, [formServiceType, formDistanceKm, formWaitingMins, formAdditionalPets, formIsNight, formIsEmergency, pricingRules]);

  // Handle Customer Selection
  const handleCustomerChange = (custId: string) => {
    setFormCustomerId(custId);
    const selectedCust = customers.find(c => c.id === custId);
    if (selectedCust) {
      setFormPickupAddress(selectedCust.address || '');
      setFormPickupContact(`${selectedCust.name} (${selectedCust.phone})`);
      const linkedPets = pets.filter(p => p.customerId === custId);
      if (linkedPets.length > 0) {
        setFormPetId(linkedPets[0].id);
        setFormPetHandlingNotes(linkedPets[0].medicalNotes || linkedPets[0].feedingPreferences || '');
      } else {
        setFormPetId('');
        setFormPetHandlingNotes('');
      }
    }
  };

  // Handle Pet Selection
  const handlePetChange = (petId: string) => {
    setFormPetId(petId);
    const selectedPet = pets.find(p => p.id === petId);
    if (selectedPet) {
      setFormPetHandlingNotes(selectedPet.medicalNotes || selectedPet.feedingPreferences || '');
    }
  };

  // ----------------------------------------------------
  // KPI Metrics Calculation
  // ----------------------------------------------------
  const todayStr = new Date().toISOString().split('T')[0];

  const metrics = useMemo(() => {
    const todayTrips = bookings.filter(b => b.pickupDate === todayStr || b.dropDate === todayStr);
    const scheduled = bookings.filter(b => ['REQUESTED', 'CONFIRMED', 'DRIVER_ASSIGNED'].includes(b.status));
    const inProgress = bookings.filter(b => ['ON_THE_WAY', 'PET_PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(b.status));
    const completed = bookings.filter(b => b.status === 'COMPLETED');
    const cancelled = bookings.filter(b => b.status === 'CANCELLED');
    const failed = bookings.filter(b => ['PICKUP_FAILED', 'DROP_FAILED'].includes(b.status));
    const todayRevenue = todayTrips.filter(b => b.status === 'COMPLETED').reduce((acc, b) => acc + (b.subtotal || 0), 0);
    const totalRevenue = completed.reduce((acc, b) => acc + (b.subtotal || 0), 0);

    return {
      todayCount: todayTrips.length,
      scheduledCount: scheduled.length,
      inProgressCount: inProgress.length,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      failedCount: failed.length,
      todayRevenue,
      totalRevenue
    };
  }, [bookings, todayStr]);

  // ----------------------------------------------------
  // Filtered Bookings List
  // ----------------------------------------------------
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || 
        b.bookingId.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.includes(q) ||
        b.petName.toLowerCase().includes(q) ||
        (b.driverName && b.driverName.toLowerCase().includes(q)) ||
        (b.vehicleNumber && b.vehicleNumber.toLowerCase().includes(q));

      // Status
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;

      // Service Type
      const matchService = serviceTypeFilter === 'ALL' || b.serviceType === serviceTypeFilter;

      // Date
      let matchDate = true;
      if (dateFilter === 'TODAY') {
        matchDate = b.pickupDate === todayStr || b.dropDate === todayStr;
      } else if (dateFilter === 'UPCOMING') {
        matchDate = b.pickupDate >= todayStr;
      }

      return matchSearch && matchStatus && matchService && matchDate;
    });
  }, [bookings, searchQuery, statusFilter, serviceTypeFilter, dateFilter, todayStr]);

  // ----------------------------------------------------
  // Status Badge Formatter
  // ----------------------------------------------------
  const getStatusBadge = (status: PickDropStatus) => {
    switch (status) {
      case 'REQUESTED':
        return <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full text-[10px] border border-amber-300 dark:border-amber-800">REQUESTED</span>;
      case 'CONFIRMED':
        return <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full text-[10px] border border-blue-300 dark:border-blue-800">CONFIRMED</span>;
      case 'DRIVER_ASSIGNED':
        return <span className="bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full text-[10px] border border-purple-300 dark:border-purple-800">DRIVER ASSIGNED</span>;
      case 'ON_THE_WAY':
        return <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full text-[10px] border border-indigo-300 dark:border-indigo-800 animate-pulse">ON THE WAY</span>;
      case 'PET_PICKED_UP':
        return <span className="bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-bold px-2 py-0.5 rounded-full text-[10px] border border-teal-300 dark:border-teal-800">PET PICKED UP</span>;
      case 'IN_TRANSIT':
        return <span className="bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 font-bold px-2 py-0.5 rounded-full text-[10px] border border-cyan-300 dark:border-cyan-800 animate-pulse">IN TRANSIT</span>;
      case 'DELIVERED':
        return <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full text-[10px] border border-emerald-300 dark:border-emerald-800">DELIVERED</span>;
      case 'COMPLETED':
        return <span className="bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full text-[10px]">COMPLETED</span>;
      case 'CANCELLED':
        return <span className="bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold px-2 py-0.5 rounded-full text-[10px]">CANCELLED</span>;
      case 'PICKUP_FAILED':
      case 'DROP_FAILED':
        return <span className="bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 font-bold px-2 py-0.5 rounded-full text-[10px] border border-red-300 dark:border-red-800">FAILED</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  // ----------------------------------------------------
  // Submit Booking Form
  // ----------------------------------------------------
  const handleCreateBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !hasPermission(currentUser, 'pick_drop_create')) {
      alert('Access Denied: You do not have permission to book Pick & Drop trips.');
      return;
    }

    const selectedCust = customers.find(c => c.id === formCustomerId);
    const selectedPet = pets.find(p => p.id === formPetId);
    const selectedDriver = drivers.find(d => d.driverId === formDriverId);
    const selectedVehicle = vehicles.find(v => v.vehicleId === formVehicleId);

    if (!selectedCust) {
      alert('Please select a valid customer.');
      return;
    }

    const newBookingId = generateNextBookingId(bookings);

    const newBooking: PickDropBooking = {
      id: `booking-${Date.now()}`,
      bookingId: newBookingId,
      customerId: selectedCust.id,
      customerName: selectedCust.name,
      customerPhone: selectedCust.phone,
      petId: selectedPet?.id || `PET-UNLINKED`,
      petName: selectedPet?.name || 'Pet Passenger',
      petSpecies: selectedPet?.species,
      petBreed: selectedPet?.breed,
      petHandlingNotes: formPetHandlingNotes,
      serviceType: formServiceType,
      pickupAddress: formPickupAddress,
      pickupLandmark: formPickupLandmark,
      pickupDate: formPickupDate,
      preferredPickupTime: formPickupTime,
      pickupTimeWindow: formPickupWindow,
      pickupContactPerson: formPickupContact,
      pickupMapsLink: formPickupMapsLink,
      dropAddress: formDropAddress,
      dropLandmark: formDropLandmark,
      dropDate: formDropDate,
      preferredDropTime: formDropTime,
      dropContactPerson: formDropContact,
      dropMapsLink: formDropMapsLink,
      driverId: selectedDriver?.driverId,
      driverName: selectedDriver?.name,
      vehicleId: selectedVehicle?.vehicleId,
      vehicleNumber: selectedVehicle?.vehicleNumber,
      status: selectedDriver ? 'DRIVER_ASSIGNED' : 'REQUESTED',
      baseCharge: calculatedPricing.baseCharge,
      additionalCharges: calculatedPricing.additionalCharges,
      waitingCharges: calculatedPricing.waitingCharges,
      subtotal: calculatedPricing.subtotal,
      customerNotes: formCustomerNotes,
      internalStaffNotes: formStaffNotes,
      createdBy: currentUser.name || currentUser.username,
      createdAt: new Date().toISOString()
    };

    await onAddBooking(newBooking);
    setShowNewBookingModal(false);
  };

  // ----------------------------------------------------
  // Execute Status Transition
  // ----------------------------------------------------
  const handleExecuteStatusTransition = async () => {
    if (!selectedBooking || !statusActionType || !currentUser) return;

    if (!hasPermission(currentUser, 'pick_drop_status_update')) {
      alert('Access Denied: You do not have permission to update trip status.');
      return;
    }

    const extraPayload: Partial<PickDropBooking> = {};

    if (statusActionType === 'DRIVER_ASSIGNED') {
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
    }

    if (statusActionType === 'PET_PICKED_UP') {
      extraPayload.actualPickupTime = new Date().toISOString();
      extraPayload.pickupConfirmedBy = currentUser.name || currentUser.username;
      extraPayload.pickupNote = statusActionNote || 'Pet picked up safely';
    }

    if (statusActionType === 'DELIVERED') {
      extraPayload.actualDeliveryTime = new Date().toISOString();
      extraPayload.deliveredTo = receiverName || selectedBooking.customerName;
      extraPayload.receiverName = receiverName || selectedBooking.customerName;
      extraPayload.receiverRelationship = receiverRel || 'Self';
      extraPayload.deliveryNote = statusActionNote || 'Pet delivered safely';
      extraPayload.deliveredBy = currentUser.name || currentUser.username;
    }

    await onUpdateStatus(selectedBooking.bookingId, statusActionType, statusActionNote, extraPayload);

    // Refresh selected booking state
    setSelectedBooking(prev => prev ? {
      ...prev,
      ...extraPayload,
      status: statusActionType
    } : null);

    setStatusActionType(null);
    setStatusActionNote('');
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
            Safe, air-conditioned pet taxi & door-to-door transit management with live status tracking.
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
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Today's Trips</span>
          <span className="text-lg font-black text-slate-900 dark:text-white">{metrics.todayCount}</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[10px] text-blue-500 font-bold uppercase block">Scheduled</span>
          <span className="text-lg font-black text-blue-600 dark:text-blue-400">{metrics.scheduledCount}</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[10px] text-purple-500 font-bold uppercase block">In Progress</span>
          <span className="text-lg font-black text-purple-600 dark:text-purple-400">{metrics.inProgressCount}</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[10px] text-emerald-500 font-bold uppercase block">Completed</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{metrics.completedCount}</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Cancelled</span>
          <span className="text-lg font-black text-slate-500">{metrics.cancelledCount}</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[10px] text-red-500 font-bold uppercase block">Failed</span>
          <span className="text-lg font-black text-red-600">{metrics.failedCount}</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs col-span-2">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">Completed Revenue</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatINR(metrics.totalRevenue)}</span>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-zinc-800 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('trips')}
          className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'trips'
              ? 'border-[#D62828] text-[#D62828]'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Trips & Schedules ({bookings.length})</span>
        </button>

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
      </div>

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 1: TRIPS & SCHEDULES */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'trips' && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-wrap gap-2.5 items-center justify-between">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by customer, mobile, pet, booking ID, driver..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-medium"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center text-xs">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="p-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs"
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
                <option value="FAILED">Failed</option>
              </select>

              <select
                value={serviceTypeFilter}
                onChange={e => setServiceTypeFilter(e.target.value)}
                className="p-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs"
              >
                <option value="ALL">All Service Types</option>
                {SERVICE_TYPES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>

              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="p-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs"
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today's Trips</option>
                <option value="UPCOMING">Upcoming Trips</option>
              </select>
            </div>
          </div>

          {/* Trips Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBookings.map(b => (
              <div 
                key={b.bookingId} 
                className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs hover:border-[#D62828]/40 transition-all flex flex-col justify-between space-y-3"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-800 dark:text-zinc-200">
                        {b.bookingId}
                      </span>
                      {getStatusBadge(b.status)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      Service: <strong className="text-slate-700 dark:text-zinc-300">{b.serviceType}</strong>
                    </span>
                  </div>

                  <span className="text-xs font-black text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
                    {formatINR(b.subtotal)}
                  </span>
                </div>

                {/* Customer & Pet Details */}
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-2.5 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-[#D62828]" />
                      {b.customerName}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">{b.customerPhone}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                    <span>🐾</span>
                    <strong className="text-slate-700 dark:text-zinc-200">{b.petName}</strong>
                    {b.petBreed ? ` (${b.petBreed})` : ''}
                  </div>
                </div>

                {/* Pickup & Drop Summary */}
                <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-zinc-400">
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

                {/* Actions Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedBooking(b)}
                    className="flex-1 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View & Manage</span>
                  </button>

                  {b.status === 'COMPLETED' && !b.invoiceId && (
                    <button
                      onClick={() => onGenerateInvoiceForBooking(b)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Convert to GST Invoice"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Invoice</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filteredBookings.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600">
                <Car className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-bold text-sm">No Pick & Drop bookings found</p>
                <p className="text-xs">Try adjusting filters or create a new booking.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 2: DRIVERS MASTER */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Active Driver Personnel</h2>
            {hasPermission(currentUser, 'pick_drop_edit') && (
              <button
                onClick={() => {
                  setEditingDriver(null);
                  setDrvName('');
                  setDrvMobile('');
                  setDrvAltMobile('');
                  setDrvLicense('');
                  setDrvExpiry('');
                  setDrvEmergency('');
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
            {drivers.map(d => (
              <div key={d.driverId} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{d.name}</h3>
                    <span className="font-mono text-[10px] text-slate-400">ID: {d.driverId}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {d.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-600 dark:text-zinc-300">
                  <p>📞 Phone: <strong>{d.mobile}</strong></p>
                  {d.licenseNumber && <p>🪪 License: <span className="font-mono">{d.licenseNumber}</span></p>}
                  {d.emergencyContact && <p>🚨 Emergency: {d.emergencyContact}</p>}
                  {d.notes && <p className="text-[11px] italic text-slate-400">{d.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 3: VEHICLES MASTER */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'vehicles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Registered Transportation Fleet</h2>
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
            {vehicles.map(v => (
              <div key={v.vehicleId} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2">
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
                  {v.isPetFriendly && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">🐾 Pet Friendly Safety Cages</span>}
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">Capacity: {v.capacity} Pets</span>
                </div>

                {v.notes && <p className="text-[11px] text-slate-500 italic">{v.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 4: PRICING RULES ENGINE */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'pricing' && hasPermission(currentUser, 'pick_drop_pricing_view') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Dynamic Pricing Engine</h2>
              <p className="text-xs text-slate-500">Configurable rate chart used for calculating base and distance surcharges.</p>
            </div>
            {hasPermission(currentUser, 'pick_drop_pricing_edit') && (
              <button
                onClick={() => {
                  setEditingRule(null);
                  setRuleName('');
                  setRuleType('FIXED');
                  setRuleRate(0);
                  setRuleActive(true);
                  setRuleNotes('');
                  setShowRuleModal(true);
                }}
                className="px-3 py-1.5 bg-[#D62828] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Pricing Rule</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {pricingRules.map(r => (
              <div key={r.id || r.ruleName} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">{r.ruleType}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {r.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white mt-1">{r.ruleName}</h3>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">{formatINR(r.rate)}</span>
                  {hasPermission(currentUser, 'pick_drop_pricing_edit') && (
                    <button
                      onClick={() => {
                        setEditingRule(r);
                        setRuleName(r.ruleName);
                        setRuleType(r.ruleType);
                        setRuleRate(r.rate);
                        setRuleActive(r.isActive);
                        setRuleNotes(r.notes || '');
                        setShowRuleModal(true);
                      }}
                      className="p-1 text-slate-400 hover:text-[#D62828] cursor-pointer"
                      title="Edit Rule"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: NEW PICK & DROP BOOKING */}
      {/* ---------------------------------------------------- */}
      {showNewBookingModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <Car className="w-5 h-5 text-[#D62828]" />
                New Pick & Drop Reservation
              </h3>
              <button 
                onClick={() => setShowNewBookingModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBookingSubmit} className="space-y-4 text-xs">
              {/* Customer & Pet Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                <div>
                  <label className="font-bold block mb-1">Select Customer *</label>
                  <select
                    required
                    value={formCustomerId}
                    onChange={e => handleCustomerChange(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Select Pet Passenger *</label>
                  <select
                    required
                    value={formPetId}
                    onChange={e => handlePetChange(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                  >
                    <option value="">-- Choose Pet --</option>
                    {pets
                      .filter(p => !formCustomerId || p.customerId === formCustomerId)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.breed || p.species})</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Service Type */}
              <div>
                <label className="font-bold block mb-1">Service Type *</label>
                <select
                  value={formServiceType}
                  onChange={e => setFormServiceType(e.target.value as PickDropServiceType)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-bold text-slate-800 dark:text-zinc-100"
                >
                  {SERVICE_TYPES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Pickup Details */}
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                <span className="font-black text-emerald-800 dark:text-emerald-400 block text-[11px] uppercase">
                  📍 Pickup Information
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold block">Pickup Address *</label>
                    <input
                      type="text"
                      required
                      value={formPickupAddress}
                      onChange={e => setFormPickupAddress(e.target.value)}
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold block">Pickup Date *</label>
                    <input
                      type="date"
                      required
                      value={formPickupDate}
                      onChange={e => setFormPickupDate(e.target.value)}
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold block">Preferred Time *</label>
                    <input
                      type="text"
                      required
                      value={formPickupTime}
                      onChange={e => setFormPickupTime(e.target.value)}
                      placeholder="e.g. 10:00 AM"
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold block">Google Maps Link (Optional Text URL)</label>
                    <input
                      type="url"
                      value={formPickupMapsLink}
                      onChange={e => setFormPickupMapsLink(e.target.value)}
                      placeholder="https://maps.app.goo.gl/..."
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Drop Details */}
              <div className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/50 space-y-2">
                <span className="font-black text-red-800 dark:text-red-400 block text-[11px] uppercase">
                  🏁 Drop Information
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold block">Drop Address *</label>
                    <input
                      type="text"
                      required
                      value={formDropAddress}
                      onChange={e => setFormDropAddress(e.target.value)}
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold block">Drop Date *</label>
                    <input
                      type="date"
                      required
                      value={formDropDate}
                      onChange={e => setFormDropDate(e.target.value)}
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold block">Preferred Time *</label>
                    <input
                      type="text"
                      required
                      value={formDropTime}
                      onChange={e => setFormDropTime(e.target.value)}
                      placeholder="e.g. 11:30 AM"
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold block">Google Maps Link (Optional Text URL)</label>
                    <input
                      type="url"
                      value={formDropMapsLink}
                      onChange={e => setFormDropMapsLink(e.target.value)}
                      placeholder="https://maps.app.goo.gl/..."
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Rate Calculator */}
              <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-xl space-y-2 border border-slate-200 dark:border-zinc-700">
                <span className="font-bold block text-slate-800 dark:text-zinc-200">
                  Fare Calculation Breakdown:
                </span>
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
                  <div className="flex items-center gap-1.5 pt-4">
                    <input
                      type="checkbox"
                      id="isNight"
                      checked={formIsNight}
                      onChange={e => setFormIsNight(e.target.checked)}
                    />
                    <label htmlFor="isNight" className="text-[11px] font-bold">Night Surcharge</label>
                  </div>
                  <div className="flex items-center gap-1.5 pt-4">
                    <input
                      type="checkbox"
                      id="isEmerg"
                      checked={formIsEmergency}
                      onChange={e => setFormIsEmergency(e.target.checked)}
                    />
                    <label htmlFor="isEmerg" className="text-[11px] font-bold">Emergency</label>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-zinc-700 flex items-center justify-between text-xs">
                  <span>Base: <strong>{formatINR(calculatedPricing.baseCharge)}</strong></span>
                  <span>Extra: <strong>{formatINR(calculatedPricing.additionalCharges)}</strong></span>
                  <span>Waiting: <strong>{formatINR(calculatedPricing.waitingCharges)}</strong></span>
                  <span className="font-extrabold text-sm text-[#D62828]">Total: {formatINR(calculatedPricing.subtotal)}</span>
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
      {/* MODAL: VIEW & MANAGE TRIP DETAILS + TIMELINE */}
      {/* ---------------------------------------------------- */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black">{selectedBooking.bookingId}</h3>
                  {getStatusBadge(selectedBooking.status)}
                </div>
                <p className="text-xs text-slate-500">{selectedBooking.serviceType}</p>
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

                {['REQUESTED', 'CONFIRMED'].includes(selectedBooking.status) && (
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
                      setStatusActionNote('Pet in transit to destination');
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
                      setReceiverName(selectedBooking.customerName);
                      setReceiverRel('Self');
                      setStatusActionNote('Pet delivered safely at destination');
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
                      setStatusActionNote('Trip successfully completed');
                    }}
                    className="px-3 py-1.5 bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Complete Trip
                  </button>
                )}

                {!['COMPLETED', 'CANCELLED'].includes(selectedBooking.status) && (
                  <>
                    <button
                      onClick={() => {
                        setStatusActionType('PICKUP_FAILED');
                        setStatusActionNote('Customer not reachable at pickup');
                      }}
                      className="px-2.5 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 font-bold rounded-lg cursor-pointer text-[11px]"
                    >
                      Pickup Failed
                    </button>
                    <button
                      onClick={() => {
                        setStatusActionType('CANCELLED');
                        setStatusActionNote('Cancelled by customer');
                      }}
                      className="px-2.5 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold rounded-lg cursor-pointer text-[11px]"
                    >
                      Cancel Trip
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Status Transition Execution Panel */}
            {statusActionType && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 space-y-2 text-xs">
                <span className="font-black text-amber-800 dark:text-amber-300 block">
                  Confirm Status Change to: {statusActionType}
                </span>

                {statusActionType === 'DRIVER_ASSIGNED' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold block text-[10px]">Select Driver:</label>
                      <select
                        value={selectedDriverId}
                        onChange={e => setSelectedDriverId(e.target.value)}
                        className="w-full p-1.5 bg-white dark:bg-zinc-900 border rounded"
                      >
                        {drivers.filter(d => d.isActive).map(d => (
                          <option key={d.driverId} value={d.driverId}>{d.name} ({d.mobile})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold block text-[10px]">Select Vehicle:</label>
                      <select
                        value={selectedVehicleId}
                        onChange={e => setSelectedVehicleId(e.target.value)}
                        className="w-full p-1.5 bg-white dark:bg-zinc-900 border rounded"
                      >
                        {vehicles.filter(v => v.isActive).map(v => (
                          <option key={v.vehicleId} value={v.vehicleId}>{v.vehicleNumber} ({v.vehicleType})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {statusActionType === 'DELIVERED' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold block text-[10px]">Receiver Name:</label>
                      <input
                        type="text"
                        value={receiverName}
                        onChange={e => setReceiverName(e.target.value)}
                        className="w-full p-1.5 bg-white dark:bg-zinc-900 border rounded"
                      />
                    </div>
                    <div>
                      <label className="font-bold block text-[10px]">Relationship:</label>
                      <input
                        type="text"
                        value={receiverRel}
                        onChange={e => setReceiverRel(e.target.value)}
                        placeholder="e.g. Pet Parent / House Help"
                        className="w-full p-1.5 bg-white dark:bg-zinc-900 border rounded"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="font-bold block text-[10px]">Operational Note:</label>
                  <input
                    type="text"
                    value={statusActionNote}
                    onChange={e => setStatusActionNote(e.target.value)}
                    className="w-full p-1.5 bg-white dark:bg-zinc-900 border rounded"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setStatusActionType(null)}
                    className="px-3 py-1 bg-slate-200 text-slate-700 rounded font-bold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleExecuteStatusTransition}
                    className="px-3 py-1 bg-emerald-600 text-white rounded font-bold cursor-pointer"
                  >
                    Confirm & Update
                  </button>
                </div>
              </div>
            )}

            {/* Passenger & Routing Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-zinc-800 p-3 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer & Pet</span>
                <p>👤 <strong>{selectedBooking.customerName}</strong> ({selectedBooking.customerPhone})</p>
                <p>🐾 <strong>{selectedBooking.petName}</strong> {selectedBooking.petBreed && `(${selectedBooking.petBreed})`}</p>
                {selectedBooking.pickupContactPerson && <p className="text-[11px] text-slate-500">Contact: {selectedBooking.pickupContactPerson}</p>}
              </div>

              <div className="bg-slate-50 dark:bg-zinc-800 p-3 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned Transport</span>
                <p>🚗 Driver: <strong>{selectedBooking.driverName || 'None'}</strong></p>
                <p>🚐 Vehicle: <strong>{selectedBooking.vehicleNumber || 'None'}</strong></p>
                <p className="font-extrabold text-[#D62828]">Fare: {formatINR(selectedBooking.subtotal)}</p>
              </div>
            </div>

            {/* Pickup & Drop Addresses */}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block">Pickup Location</span>
                <p>{selectedBooking.pickupAddress}</p>
                {selectedBooking.pickupMapsLink && (
                  <a 
                    href={selectedBooking.pickupMapsLink} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="w-3 h-3" /> View Google Maps Link
                  </a>
                )}
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl">
                <span className="text-[10px] font-bold text-red-600 uppercase block">Drop Location</span>
                <p>{selectedBooking.dropAddress}</p>
                {selectedBooking.dropMapsLink && (
                  <a 
                    href={selectedBooking.dropMapsLink} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="w-3 h-3" /> View Google Maps Link
                  </a>
                )}
              </div>
            </div>

            {/* Text-First Audit Timeline */}
            <div className="border-t border-slate-200 dark:border-zinc-800 pt-3 space-y-2">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                Trip Timeline Log:
              </span>
              <div className="space-y-1.5 bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl max-h-40 overflow-y-auto text-[11px]">
                <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                  <span className="font-bold">✨ Booking Created</span>
                  <span className="font-mono text-[10px] text-slate-400">{formatDateDDMMYYYY(selectedBooking.createdAt)}</span>
                </div>
                {selectedBooking.pickupConfirmedBy && (
                  <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
                    <span>🐾 Pet Picked Up by {selectedBooking.pickupConfirmedBy}</span>
                    <span className="font-mono text-[10px]">{selectedBooking.pickupNote}</span>
                  </div>
                )}
                {selectedBooking.deliveredBy && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>🏁 Delivered to {selectedBooking.deliveredTo}</span>
                    <span className="font-mono text-[10px]">{selectedBooking.deliveryNote}</span>
                  </div>
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold">{editingDriver ? 'Edit Driver' : 'Add New Driver'}</h3>
            <form onSubmit={async e => {
              e.preventDefault();
              await onSaveDriver({
                id: editingDriver?.id || `drv-${Date.now()}`,
                driverId: editingDriver?.driverId || `DRV-${String(drivers.length + 1).padStart(3, '0')}`,
                name: drvName,
                mobile: drvMobile,
                alternateMobile: drvAltMobile,
                licenseNumber: drvLicense,
                licenseExpiry: drvExpiry,
                emergencyContact: drvEmergency,
                isActive: drvActive,
                notes: drvNotes
              });
              setShowDriverModal(false);
            }} className="space-y-2 text-xs">
              <div>
                <label className="font-bold block mb-1">Driver Name *</label>
                <input required type="text" value={drvName} onChange={e => setDrvName(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Mobile *</label>
                  <input required type="text" value={drvMobile} onChange={e => setDrvMobile(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Alternate Phone</label>
                  <input type="text" value={drvAltMobile} onChange={e => setDrvAltMobile(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">License Number</label>
                  <input type="text" value={drvLicense} onChange={e => setDrvLicense(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg font-mono" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Emergency Contact</label>
                  <input type="text" value={drvEmergency} onChange={e => setDrvEmergency(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="drvActive" checked={drvActive} onChange={e => setDrvActive(e.target.checked)} />
                <label htmlFor="drvActive" className="font-bold">Active Driver</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowDriverModal(false)} className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg">Cancel</button>
                <button type="submit" className="px-3 py-1.5 bg-[#D62828] text-white rounded-lg font-bold">Save Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD / EDIT VEHICLE */}
      {/* ---------------------------------------------------- */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold">{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
            <form onSubmit={async e => {
              e.preventDefault();
              await onSaveVehicle({
                id: editingVehicle?.id || `veh-${Date.now()}`,
                vehicleId: editingVehicle?.vehicleId || `VEH-${String(vehicles.length + 1).padStart(3, '0')}`,
                vehicleNumber: vehNumber,
                vehicleType: vehType,
                capacity: vehCapacity,
                isAc: vehAc,
                isPetFriendly: vehPetFriendly,
                isActive: vehActive,
                insuranceExpiry: vehInsExpiry,
                pucExpiry: vehPucExpiry,
                notes: vehNotes
              });
              setShowVehicleModal(false);
            }} className="space-y-2 text-xs">
              <div>
                <label className="font-bold block mb-1">Vehicle Number *</label>
                <input required type="text" placeholder="e.g. MH-02-DW-1234" value={vehNumber} onChange={e => setVehNumber(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Vehicle Type</label>
                  <input type="text" value={vehType} onChange={e => setVehType(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Pet Capacity</label>
                  <input type="number" min="1" max="10" value={vehCapacity} onChange={e => setVehCapacity(Number(e.target.value))} className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg" />
                </div>
              </div>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 font-bold">
                  <input type="checkbox" checked={vehAc} onChange={e => setVehAc(e.target.checked)} /> AC
                </label>
                <label className="flex items-center gap-1.5 font-bold">
                  <input type="checkbox" checked={vehPetFriendly} onChange={e => setVehPetFriendly(e.target.checked)} /> Pet Friendly Cages
                </label>
                <label className="flex items-center gap-1.5 font-bold">
                  <input type="checkbox" checked={vehActive} onChange={e => setVehActive(e.target.checked)} /> Active
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowVehicleModal(false)} className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg">Cancel</button>
                <button type="submit" className="px-3 py-1.5 bg-[#D62828] text-white rounded-lg font-bold">Save Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD / EDIT PRICING RULE */}
      {/* ---------------------------------------------------- */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold">{editingRule ? 'Edit Pricing Rule' : 'Add Pricing Rule'}</h3>
            <form onSubmit={async e => {
              e.preventDefault();
              await onSavePricingRule({
                id: editingRule?.id || `rule-${Date.now()}`,
                ruleName,
                ruleType,
                rate: Number(ruleRate),
                isActive: ruleActive,
                notes: ruleNotes
              });
              setShowRuleModal(false);
            }} className="space-y-2 text-xs">
              <div>
                <label className="font-bold block mb-1">Rule Name *</label>
                <input required type="text" value={ruleName} onChange={e => setRuleName(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Rule Type *</label>
                  <select value={ruleType} onChange={e => setRuleType(e.target.value as any)} className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg">
                    <option value="FIXED">FIXED</option>
                    <option value="ROUND_TRIP">ROUND_TRIP</option>
                    <option value="PER_KM">PER_KM</option>
                    <option value="WAITING">WAITING</option>
                    <option value="PER_PET">PER_PET</option>
                    <option value="NIGHT">NIGHT</option>
                    <option value="EMERGENCY">EMERGENCY</option>
                    <option value="ADDITIONAL">ADDITIONAL</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Rate (₹) *</label>
                  <input required type="number" min="0" step="10" value={ruleRate} onChange={e => setRuleRate(Number(e.target.value))} className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg font-mono font-bold" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="ruleActive" checked={ruleActive} onChange={e => setRuleActive(e.target.checked)} />
                <label htmlFor="ruleActive" className="font-bold">Active Rule</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowRuleModal(false)} className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg">Cancel</button>
                <button type="submit" className="px-3 py-1.5 bg-[#D62828] text-white rounded-lg font-bold">Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
