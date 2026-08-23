// ============================================================
// VaccinationManager.tsx — Pet Vaccination & Smart Alert System
// Project: The House of Pawz – Billing Pro
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  Syringe, Search, Filter, Plus, Calendar, AlertTriangle,
  CheckCircle2, Clock, XCircle, MessageSquare, Mail, Edit3,
  Trash2, Dog, Users, Eye, X, ChevronRight, AlertCircle, ShieldCheck
} from 'lucide-react';
import {
  VaccinationRecord, VaccinationStatus, Customer, Pet, User,
  CompanySettings
} from '../types';
import { hasPermission } from '../lib/permissions';
import {
  COMMON_DOG_VACCINES, COMMON_CAT_VACCINES,
  calculateVaccinationStatus, formatLongDate,
  generateVaccinationWhatsAppUrl, generateVaccinationEmailUrl
} from '../lib/vaccinationService';

interface VaccinationManagerProps {
  vaccinations: VaccinationRecord[];
  customers: Customer[];
  pets: Pet[];
  currentUser: User | null;
  settings: CompanySettings;
  onSaveVaccination: (record: Omit<VaccinationRecord, 'id' | 'vaccinationId'> & { id?: string; vaccinationId?: string }) => Promise<{ success: boolean; data?: VaccinationRecord; error?: string }>;
  onDeleteVaccination: (id: string) => Promise<{ success: boolean; error?: string }>;
  onAddNewPetClick: () => void;
  onSelectPetForVaccination?: (petId: string) => void;
}

export const VaccinationManager: React.FC<VaccinationManagerProps> = ({
  vaccinations,
  customers,
  pets,
  currentUser,
  settings,
  onSaveVaccination,
  onDeleteVaccination,
  onAddNewPetClick
}) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VaccinationStatus>('ALL');
  const [speciesFilter, setSpeciesFilter] = useState<'ALL' | 'Dog' | 'Cat' | 'Other'>('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VaccinationRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [vaccineName, setVaccineName] = useState('');
  const [customVaccineName, setCustomVaccineName] = useState('');
  const [vaccinationDate, setVaccinationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [nextDueDate, setNextDueDate] = useState(() => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');

  // Quick Customer Search in Modal
  const [modalCustomerSearch, setModalCustomerSearch] = useState('');

  // Customer's linked pets
  const customerPets = useMemo(() => {
    if (!selectedCustomerId) return [];
    return pets.filter(p => p.customerId === selectedCustomerId);
  }, [selectedCustomerId, pets]);

  const selectedPet = useMemo(() => {
    return pets.find(p => p.id === selectedPetId);
  }, [selectedPetId, pets]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [selectedCustomerId, customers]);

  // Filtered customer list for modal selector
  const modalFilteredCustomers = useMemo(() => {
    if (!modalCustomerSearch.trim()) return customers;
    const q = modalCustomerSearch.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customers, modalCustomerSearch]);

  // Overall calculations with live status
  const recordsWithStatus = useMemo(() => {
    return vaccinations.map(v => ({
      ...v,
      currentStatus: calculateVaccinationStatus(v.nextDueDate)
    }));
  }, [vaccinations]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = recordsWithStatus.length;
    const valid = recordsWithStatus.filter(r => r.currentStatus === 'VALID').length;
    const upcoming = recordsWithStatus.filter(r => r.currentStatus === 'UPCOMING').length;
    const dueSoon = recordsWithStatus.filter(r => r.currentStatus === 'DUE_SOON').length;
    const expired = recordsWithStatus.filter(r => r.currentStatus === 'EXPIRED').length;
    const uniquePets = new Set(recordsWithStatus.map(r => r.petId)).size;

    return { total, valid, upcoming, dueSoon, expired, uniquePets };
  }, [recordsWithStatus]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return recordsWithStatus.filter(r => {
      // Status Filter
      if (statusFilter !== 'ALL' && r.currentStatus !== statusFilter) return false;

      // Species Filter
      if (speciesFilter !== 'ALL') {
        if (speciesFilter === 'Other' && (r.species === 'Dog' || r.species === 'Cat')) return false;
        if (speciesFilter !== 'Other' && r.species !== speciesFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPet = r.petName.toLowerCase().includes(q);
        const matchesCust = r.customerName.toLowerCase().includes(q);
        const matchesPhone = r.customerPhone?.includes(q);
        const matchesVaccine = r.vaccineName.toLowerCase().includes(q);
        const matchesId = r.vaccinationId.toLowerCase().includes(q);

        if (!matchesPet && !matchesCust && !matchesPhone && !matchesVaccine && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [recordsWithStatus, statusFilter, speciesFilter, searchQuery]);

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setFormError(null);
    setModalCustomerSearch('');

    const firstCust = customers[0];
    if (firstCust) {
      setSelectedCustomerId(firstCust.id);
      const custP = pets.filter(p => p.customerId === firstCust.id);
      setSelectedPetId(custP[0]?.id || '');
    } else {
      setSelectedCustomerId('');
      setSelectedPetId('');
    }

    setVaccineName('Rabies');
    setCustomVaccineName('');
    setVaccinationDate(new Date().toISOString().slice(0, 10));
    
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setNextDueDate(nextYear.toISOString().slice(0, 10));
    
    setNotes('');
    setShowModal(true);
  };

  const handleOpenEditModal = (rec: VaccinationRecord) => {
    setEditingRecord(rec);
    setFormError(null);
    setSelectedCustomerId(rec.customerId);
    setSelectedPetId(rec.petId);

    const isCommonDog = COMMON_DOG_VACCINES.includes(rec.vaccineName);
    const isCommonCat = COMMON_CAT_VACCINES.includes(rec.vaccineName);

    if (isCommonDog || isCommonCat) {
      setVaccineName(rec.vaccineName);
      setCustomVaccineName('');
    } else {
      setVaccineName('CUSTOM');
      setCustomVaccineName(rec.vaccineName);
    }

    setVaccinationDate(rec.vaccinationDate);
    setNextDueDate(rec.nextDueDate);
    setNotes(rec.notes || '');
    setShowModal(true);
  };

  // Form Submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedCustomerId) {
      setFormError('Please select a customer.');
      return;
    }
    if (!selectedPetId) {
      setFormError('Please select a pet.');
      return;
    }

    const finalVaccineName = vaccineName === 'CUSTOM' ? customVaccineName.trim() : vaccineName;
    if (!finalVaccineName) {
      setFormError('Please select or specify the vaccination name.');
      return;
    }

    if (!vaccinationDate || !nextDueDate) {
      setFormError('Please specify both Vaccination Date and Next Due Date.');
      return;
    }

    setIsSubmitting(true);

    const cust = customers.find(c => c.id === selectedCustomerId);
    const pet = pets.find(p => p.id === selectedPetId);

    const payload = {
      id: editingRecord?.id,
      vaccinationId: editingRecord?.vaccinationId,
      petId: selectedPetId,
      customerId: selectedCustomerId,
      petName: pet?.name || editingRecord?.petName || 'Pet',
      customerName: cust?.name || editingRecord?.customerName || 'Customer',
      customerPhone: cust?.phone || editingRecord?.customerPhone || '',
      customerEmail: cust?.email || editingRecord?.customerEmail || '',
      species: pet?.species || editingRecord?.species || 'Dog',
      vaccineName: finalVaccineName,
      vaccinationDate,
      nextDueDate,
      notes: notes.trim()
    };

    const res = await onSaveVaccination(payload);
    setIsSubmitting(false);

    if (res.success) {
      setShowModal(false);
      setEditingRecord(null);
    } else {
      setFormError(res.error || 'Failed to save vaccination record.');
    }
  };

  // Deletion Handler
  const handleDelete = async (id: string, name: string) => {
    if (!hasPermission(currentUser, 'vaccinations_delete')) {
      alert('Permission Denied: Deleting vaccination records is restricted to Administrator and Accountant.');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete the vaccination record for "${name}"?`)) {
      await onDeleteVaccination(id);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: VaccinationStatus) => {
    switch (status) {
      case 'VALID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            VALID
          </span>
        );
      case 'UPCOMING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono">
            <Clock className="w-3 h-3 text-amber-600" />
            UPCOMING (≤30d)
          </span>
        );
      case 'DUE_SOON':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 font-mono animate-pulse">
            <AlertTriangle className="w-3 h-3 text-orange-600" />
            DUE SOON (≤7d)
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-mono">
            <XCircle className="w-3 h-3 text-red-600" />
            EXPIRED / OVERDUE
          </span>
        );
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Syringe className="w-6 h-6 text-[#D62828]" />
            Vaccination Management & Smart Alerts
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Real-time expiry tracking, automated renewal alarms, and one-click manual customer reminders
          </p>
        </div>

        {hasPermission(currentUser, 'vaccinations_create') && (
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 min-h-[44px] bg-[#D62828] hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-red-900/40 cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Vaccination Record</span>
          </button>
        )}
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Total Records
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {metrics.total}
          </p>
          <span className="text-[10px] text-slate-500">Active tracking logs</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
            🟢 Valid
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {metrics.valid}
          </p>
          <span className="text-[10px] text-slate-500">Up to date (&gt;30d)</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">
            🟡 Upcoming / Due Soon
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {metrics.upcoming + metrics.dueSoon}
          </p>
          <span className="text-[10px] text-slate-500">Due within 30 days</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600">
            🔴 Expired
          </span>
          <p className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400 font-mono">
            {metrics.expired}
          </p>
          <span className="text-[10px] text-slate-500">Overdue renewal</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">
            🐾 Pets Covered
          </span>
          <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
            {metrics.uniquePets}
          </p>
          <span className="text-[10px] text-slate-500">Registered animals</span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Pet, Customer, Phone, Vaccine Name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-8 bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#D62828]/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter Buttons */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl overflow-x-auto text-[11px] font-bold">
            {(['ALL', 'VALID', 'UPCOMING', 'DUE_SOON', 'EXPIRED'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  statusFilter === st
                    ? 'bg-[#D62828] text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'All Records' :
                 st === 'VALID' ? 'Valid' :
                 st === 'UPCOMING' ? 'Upcoming' :
                 st === 'DUE_SOON' ? 'Due Soon' : 'Expired'}
              </button>
            ))}
          </div>

          {/* Species Selector */}
          <select
            value={speciesFilter}
            onChange={e => setSpeciesFilter(e.target.value as any)}
            className="h-9 px-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300"
          >
            <option value="ALL">All Species</option>
            <option value="Dog">Dogs</option>
            <option value="Cat">Cats</option>
            <option value="Other">Other Species</option>
          </select>
        </div>
      </div>

      {/* 4. Main Records Content: Mobile Cards + Desktop Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-zinc-600 space-y-3">
            <Syringe className="w-12 h-12 mx-auto opacity-30 text-[#D62828]" />
            <h3 className="text-base font-bold text-slate-700 dark:text-zinc-300">
              No Vaccination Records Found
            </h3>
            <p className="text-xs max-w-md mx-auto text-slate-500 dark:text-zinc-400">
              Start tracking your pets' vaccination schedules to receive timely expiry alerts and protect their health.
            </p>
            {hasPermission(currentUser, 'vaccinations_create') && (
              <button
                onClick={handleOpenAddModal}
                className="mt-2 px-4 py-2 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl text-xs inline-flex items-center space-x-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Vaccination Record</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
              {filteredRecords.map(rec => (
                <div key={rec.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{rec.species === 'Cat' ? '🐱' : '🐶'}</span>
                        <span>{rec.petName}</span>
                        <span className="text-[10px] text-slate-400 font-normal font-mono">({rec.species})</span>
                      </h3>
                      <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        Owner: {rec.customerName}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        📞 {rec.customerPhone || 'No Phone'}
                      </span>
                    </div>

                    <div className="shrink-0 text-right">
                      {renderStatusBadge(rec.currentStatus)}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vaccine:</span>
                      <strong className="text-slate-900 dark:text-white font-bold">{rec.vaccineName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Administered:</span>
                      <span className="font-mono">{formatLongDate(rec.vaccinationDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Next Due:</span>
                      <span className={`font-mono font-bold ${
                        rec.currentStatus === 'EXPIRED' ? 'text-red-600' :
                        rec.currentStatus === 'DUE_SOON' ? 'text-orange-600' :
                        rec.currentStatus === 'UPCOMING' ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {formatLongDate(rec.nextDueDate)}
                      </span>
                    </div>
                    {rec.notes && (
                      <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200 dark:border-zinc-700">
                        Notes: {rec.notes}
                      </p>
                    )}
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <div className="flex items-center gap-1.5">
                      {hasPermission(currentUser, 'vaccinations_remind') && (
                        <>
                          <a
                            href={generateVaccinationWhatsAppUrl(rec, settings)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 min-h-[40px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border border-emerald-200 dark:border-emerald-800"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>

                          <a
                            href={generateVaccinationEmailUrl(rec, settings)}
                            className="px-3 py-2 min-h-[40px] bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border border-blue-200 dark:border-blue-800"
                            title="Send Email Reminder"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Email</span>
                          </a>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {hasPermission(currentUser, 'vaccinations_edit') && (
                        <button
                          onClick={() => handleOpenEditModal(rec)}
                          className="p-2 min-h-[40px] text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl"
                          title="Edit Record"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      {hasPermission(currentUser, 'vaccinations_delete') && (
                        <button
                          onClick={() => handleDelete(rec.id, rec.petName)}
                          className="p-2 min-h-[40px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-xl"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 text-[10px] uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-zinc-800">
                    <th className="py-3.5 px-4 w-[18%]">Pet / Animal</th>
                    <th className="py-3.5 px-4 w-[20%]">Customer / Owner</th>
                    <th className="py-3.5 px-4 w-[18%]">Vaccination</th>
                    <th className="py-3.5 px-4 w-[12%]">Vaccine Date</th>
                    <th className="py-3.5 px-4 w-[12%]">Next Due Date</th>
                    <th className="py-3.5 px-4 w-[10%] text-center">Status</th>
                    <th className="py-3.5 px-4 w-[10%] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                  {filteredRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      {/* Pet */}
                      <td className="p-4">
                        <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{rec.species === 'Cat' ? '🐱' : '🐶'}</span>
                          <span>{rec.petName}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          ID: {rec.petId} ({rec.species})
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="p-4">
                        <span className="font-bold text-slate-800 dark:text-zinc-200 block">
                          {rec.customerName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          📞 {rec.customerPhone || 'No phone'}
                        </span>
                      </td>

                      {/* Vaccine */}
                      <td className="p-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {rec.vaccineName}
                        </span>
                        {rec.notes && (
                          <span className="text-[10px] text-slate-400 italic block truncate max-w-[180px]">
                            {rec.notes}
                          </span>
                        )}
                      </td>

                      {/* Vaccination Date */}
                      <td className="p-4 font-mono text-slate-600 dark:text-zinc-300">
                        {formatLongDate(rec.vaccinationDate)}
                      </td>

                      {/* Next Due Date */}
                      <td className="p-4 font-mono font-bold">
                        <span className={`${
                          rec.currentStatus === 'EXPIRED' ? 'text-red-600 dark:text-red-400' :
                          rec.currentStatus === 'DUE_SOON' ? 'text-orange-600 dark:text-orange-400' :
                          rec.currentStatus === 'UPCOMING' ? 'text-amber-600 dark:text-amber-400' :
                          'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {formatLongDate(rec.nextDueDate)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        {renderStatusBadge(rec.currentStatus)}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {/* WhatsApp Reminder */}
                          {hasPermission(currentUser, 'vaccinations_remind') && (
                            <a
                              href={generateVaccinationWhatsAppUrl(rec, settings)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors"
                              title="Send WhatsApp Reminder"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </a>
                          )}

                          {/* Email Reminder */}
                          {hasPermission(currentUser, 'vaccinations_remind') && (
                            <a
                              href={generateVaccinationEmailUrl(rec, settings)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                              title="Send Email Reminder"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          )}

                          {/* Edit */}
                          {hasPermission(currentUser, 'vaccinations_edit') && (
                            <button
                              onClick={() => handleOpenEditModal(rec)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete */}
                          {hasPermission(currentUser, 'vaccinations_delete') && (
                            <button
                              onClick={() => handleDelete(rec.id, rec.petName)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 5. ADD / EDIT VACCINATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-none sm:rounded-2xl w-full max-w-lg p-4 sm:p-6 shadow-2xl space-y-4 h-[100dvh] sm:h-auto sm:max-h-[92vh] overflow-y-auto flex flex-col justify-between">
            <div>
              {/* Modal Title */}
              <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-zinc-800">
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <Syringe className="w-5 h-5 text-[#D62828]" />
                  <span>{editingRecord ? 'Edit Vaccination Record' : 'Add Vaccination Record'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs pt-3 pb-16 sm:pb-0">
                {/* Step 1: Customer Selection */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Step 1 — Select Customer *
                  </label>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Search customer by name, phone or email..."
                      value={modalCustomerSearch}
                      onChange={e => setModalCustomerSearch(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs"
                    />
                    <select
                      value={selectedCustomerId}
                      onChange={e => {
                        setSelectedCustomerId(e.target.value);
                        const cPets = pets.filter(p => p.customerId === e.target.value);
                        setSelectedPetId(cPets[0]?.id || '');
                      }}
                      required
                      className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl font-bold text-xs"
                    >
                      <option value="">-- Choose Customer --</option>
                      {modalFilteredCustomers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} — 📞 {c.phone} {c.email ? `(${c.email})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Step 2: Pet Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-zinc-300">
                      Step 2 — Select Pet / Animal *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        onAddNewPetClick();
                      }}
                      className="text-xs font-bold text-[#D62828] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add New Pet</span>
                    </button>
                  </div>

                  {customerPets.length === 0 ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                      <span>No pets registered for this customer yet.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          onAddNewPetClick();
                        }}
                        className="font-bold underline cursor-pointer"
                      >
                        + Create Pet
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedPetId}
                      onChange={e => setSelectedPetId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl font-bold text-xs"
                    >
                      <option value="">-- Choose Pet --</option>
                      {customerPets.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.species === 'Cat' ? '🐱' : '🐶'} {p.name} — {p.species} ({p.breed || 'Standard'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Step 3: Vaccine Name & Suggestions */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block">
                    Vaccination Name *
                  </label>
                  
                  {/* Quick Select Buttons based on selected Pet species */}
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {(selectedPet?.species === 'Cat' ? COMMON_CAT_VACCINES : COMMON_DOG_VACCINES).slice(0, 4).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setVaccineName(v);
                          setCustomVaccineName('');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          vaccineName === v
                            ? 'bg-[#D62828] text-white border-[#D62828]'
                            : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                        }`}
                      >
                        {v.split(' ')[0]}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setVaccineName('CUSTOM')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        vaccineName === 'CUSTOM'
                          ? 'bg-[#D62828] text-white border-[#D62828]'
                          : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      Other / Custom
                    </button>
                  </div>

                  {vaccineName === 'CUSTOM' ? (
                    <input
                      type="text"
                      placeholder="Enter custom vaccine name (e.g. Kennel Cough Booster)"
                      value={customVaccineName}
                      onChange={e => setCustomVaccineName(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-bold"
                    />
                  ) : (
                    <select
                      value={vaccineName}
                      onChange={e => {
                        setVaccineName(e.target.value);
                        if (e.target.value !== 'CUSTOM') setCustomVaccineName('');
                      }}
                      className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl font-bold text-xs"
                    >
                      <optgroup label="Common Dog Vaccines">
                        {COMMON_DOG_VACCINES.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Common Cat Vaccines">
                        {COMMON_CAT_VACCINES.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </optgroup>
                      <option value="CUSTOM">-- Custom / Other Vaccine --</option>
                    </select>
                  )}
                </div>

                {/* Step 4: Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                      Vaccination Date (Administered) *
                    </label>
                    <input
                      type="date"
                      required
                      value={vaccinationDate}
                      onChange={e => setVaccinationDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                      Next Due / Expiry Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={nextDueDate}
                      onChange={e => setNextDueDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-[#D62828]"
                    />
                  </div>
                </div>

                {/* Step 5: Optional Notes */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Notes / Administration Details (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Annual booster dose administered smoothly"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs"
                  />
                </div>

                {/* Modal Footer Controls */}
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 min-h-[44px] bg-[#D62828] hover:bg-red-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-red-900/40 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingRecord ? 'Update Record' : 'Save Record'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
