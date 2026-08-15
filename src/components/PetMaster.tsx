import React, { useState } from 'react';
import { 
  Dog, Search, Plus, CheckCircle2, AlertTriangle, 
  Calendar, Edit, Trash2, LogIn, LogOut, QrCode, Car 
} from 'lucide-react';
import { Pet, Customer, User, PickDropBooking, formatINR } from '../types';
import { hasPermission } from '../lib/permissions';

interface PetMasterProps {
  pets: Pet[];
  customers: Customer[];
  pickDropBookings?: PickDropBooking[];
  currentUser?: User | null;
  onAddPet: (pet: Pet) => void;
  onEditPet: (pet: Pet) => void;
  onDeletePet?: (petId: string) => void;
  onToggleBoarding: (petId: string, isCheckIn: boolean, roomNo?: string) => void;
}

export const PetMaster: React.FC<PetMasterProps> = ({
  pets,
  customers,
  pickDropBookings = [],
  currentUser,
  onAddPet,
  onEditPet,
  onDeletePet,
  onToggleBoarding
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'BOARDING'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);

  // Check-in modal
  const [checkInPetId, setCheckInPetId] = useState<string | null>(null);
  const [roomNo, setRoomNo] = useState('Suite A-01');

  // Form State
  const [selectedCustId, setSelectedCustId] = useState(customers[0]?.id || '');
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'Dog' | 'Cat' | 'Bird' | 'Rabbit' | 'Other'>('Dog');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('2 Years');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [vaccinationStatus, setVaccinationStatus] = useState<'Up to Date' | 'Pending' | 'Overdue'>('Up to Date');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [feedingPreferences, setFeedingPreferences] = useState('');
  const [microchipId, setMicrochipId] = useState('');

  const openAddModal = () => {
    setEditingPet(null);
    setSelectedCustId(customers[0]?.id || '');
    setName('');
    setSpecies('Dog');
    setBreed('');
    setAge('2 Years');
    setGender('Male');
    setVaccinationStatus('Up to Date');
    setMedicalNotes('');
    setFeedingPreferences('');
    setMicrochipId(`981098${Math.floor(100000000 + Math.random() * 900000000)}`);
    setShowModal(true);
  };

  const openEditModal = (p: Pet) => {
    setEditingPet(p);
    setSelectedCustId(p.customerId);
    setName(p.name);
    setSpecies(p.species);
    setBreed(p.breed);
    setAge(p.age);
    setGender(p.gender);
    setVaccinationStatus(p.vaccinationStatus);
    setMedicalNotes(p.medicalNotes || '');
    setFeedingPreferences(p.feedingPreferences || '');
    setMicrochipId(p.microchipId || '');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === selectedCustId);
    const petData: Pet = {
      id: editingPet?.id || `PET-${Date.now().toString().slice(-4)}`,
      customerId: selectedCustId,
      customerName: cust?.name || 'Customer',
      name,
      species,
      breed,
      age,
      gender,
      vaccinationStatus,
      medicalNotes,
      feedingPreferences,
      microchipId,
      barcode: `PET-${name.toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`,
      isBoardingNow: editingPet?.isBoardingNow || false,
      checkInDate: editingPet?.checkInDate,
      checkOutDate: editingPet?.checkOutDate,
      roomNo: editingPet?.roomNo
    };

    if (editingPet) {
      onEditPet(petData);
    } else {
      onAddPet(petData);
    }
    setShowModal(false);
  };

  const handleConfirmCheckIn = () => {
    if (!checkInPetId) return;
    onToggleBoarding(checkInPetId, true, roomNo);
    setCheckInPetId(null);
  };

  const filtered = pets.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.microchipId && p.microchipId.includes(searchQuery));

    const matchesFilter = filterMode === 'ALL' || (filterMode === 'BOARDING' && p.isBoardingNow);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Dog className="w-5 h-5 text-[#D62828]" />
            Pet Master & Boarding Check-In Tracker
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Pet Profiles, Vaccination Records, Suite Allocation & Active Occupancy
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-[#D62828] hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-red-900/40"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Pet Profile</span>
        </button>
      </div>

      {/* Search & Occupancy Filter Tabs */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search pet name, breed, owner or microchip..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-medium"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterMode === 'ALL'
                ? 'bg-[#D62828] text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            All Pets ({pets.length})
          </button>
          <button
            onClick={() => setFilterMode('BOARDING')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterMode === 'BOARDING'
                ? 'bg-[#D62828] text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            Currently Checked-In ({pets.filter(p => p.isBoardingNow).length})
          </button>
        </div>
      </div>

      {/* Pets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div 
            key={p.id} 
            className={`bg-white dark:bg-zinc-900 p-5 rounded-2xl border shadow-xs flex flex-col justify-between space-y-4 transition-all ${
              p.isBoardingNow 
                ? 'border-emerald-300 dark:border-emerald-800/80 ring-2 ring-emerald-500/10' 
                : 'border-slate-200 dark:border-zinc-800'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 text-[#D62828] font-bold text-base flex items-center justify-center shrink-0">
                    {p.species === 'Dog' ? '🐶' : p.species === 'Cat' ? '🐱' : '🐰'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      {p.name}
                      <span className="text-[10px] text-slate-400 font-mono font-normal">({p.gender})</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                      {p.breed} • {p.age}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-1.5 text-slate-400 hover:text-[#D62828] hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                    title="Edit Pet Profile"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {onDeletePet && (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete pet profile "${p.name}"? This action cannot be undone.`)) {
                          onDeletePet(p.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg"
                      title="Delete Pet Profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  p.vaccinationStatus === 'Up to Date'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  Vaccine: {p.vaccinationStatus}
                </span>

                {p.microchipId && (
                  <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-mono px-2 py-0.5 rounded-full flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-[#C9A227]" />
                    {p.microchipId.slice(-6)}
                  </span>
                )}
              </div>

              {/* Owner */}
              <div className="text-xs text-slate-600 dark:text-zinc-300 pt-1">
                Owner: <strong className="text-slate-900 dark:text-white">{p.customerName}</strong>
              </div>

              {/* Notes */}
              {(p.medicalNotes || p.feedingPreferences) && (
                <div className="p-2 bg-slate-50 dark:bg-zinc-800/40 rounded-lg text-[11px] text-slate-600 dark:text-zinc-300 space-y-0.5 border border-slate-100 dark:border-zinc-800">
                  {p.medicalNotes && <p><strong>Medical:</strong> {p.medicalNotes}</p>}
                  {p.feedingPreferences && <p><strong>Diet:</strong> {p.feedingPreferences}</p>}
                </div>
              )}

              {/* Pick & Drop History */}
              {(() => {
                const petTrips = pickDropBookings.filter(b => b.petId === p.id);
                if (petTrips.length === 0) return null;
                const lastTrip = petTrips[0];
                return (
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[10px]">
                    <div className="flex items-center justify-between font-bold text-slate-500 mb-0.5">
                      <span className="flex items-center gap-1">
                        <Car className="w-3 h-3 text-[#D62828]" /> Transit History:
                      </span>
                      <span className="text-[#D62828]">{petTrips.length} Trips</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-800/60 p-1.5 rounded text-[10px] space-y-0.5">
                      <div className="flex justify-between">
                        <span className="font-medium text-slate-700 dark:text-zinc-300">{lastTrip.serviceType}</span>
                        <span className="font-bold text-emerald-600">{formatINR(lastTrip.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400">
                        <span>{lastTrip.pickupDate}</span>
                        <span className="uppercase font-bold">{lastTrip.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Boarding Status & Toggle */}
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              {p.isBoardingNow ? (
                <div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-full inline-block mb-0.5">
                    Checked-In: {p.roomNo}
                  </span>
                  <p className="text-[10px] text-slate-400">Since {p.checkInDate}</p>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Boarding Status:</span>
                  <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-bold">Checked-Out</span>
                </div>
              )}

              {p.isBoardingNow ? (
                <button
                  onClick={() => onToggleBoarding(p.id, false)}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-[#D62828] font-bold rounded-lg text-xs flex items-center space-x-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Check-Out</span>
                </button>
              ) : (
                <button
                  onClick={() => setCheckInPetId(p.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Check-In</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Check-in Room Modal */}
      {checkInPetId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Assign Boarding Suite & Check-In
            </h3>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                Room / Suite Allocation:
              </label>
              <select
                value={roomNo}
                onChange={e => setRoomNo(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-xs font-semibold"
              >
                <option value="Deluxe Suite A-01">Deluxe Suite A-01</option>
                <option value="Executive Suite A-02">Executive Suite A-02</option>
                <option value="Cat Condo C-01">Cat Condo C-01</option>
                <option value="Daycare Social Lounge">Daycare Social Lounge</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCheckInPetId(null)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckIn}
                className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs shadow-md"
              >
                Confirm Check-In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Pet Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold">
              {editingPet ? 'Edit Pet Profile' : 'Add New Pet Profile'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Pet Owner Customer *</label>
                <select
                  value={selectedCustId}
                  onChange={e => setSelectedCustId(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-semibold"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Pet Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Species</label>
                  <select
                    value={species}
                    onChange={e => setSpecies(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-semibold"
                  >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Bird">Bird</option>
                    <option value="Rabbit">Rabbit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Breed</label>
                  <input
                    type="text"
                    value={breed}
                    onChange={e => setBreed(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Age</label>
                  <input
                    type="text"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Vaccination Status</label>
                  <select
                    value={vaccinationStatus}
                    onChange={e => setVaccinationStatus(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-semibold"
                  >
                    <option value="Up to Date">Up to Date</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Microchip / Barcode</label>
                  <input
                    type="text"
                    value={microchipId}
                    onChange={e => setMicrochipId(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Medical / Allergy Notes</label>
                <textarea
                  rows={2}
                  value={medicalNotes}
                  onChange={e => setMedicalNotes(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D62828] text-white font-bold rounded-lg shadow-md"
                >
                  Save Pet Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
