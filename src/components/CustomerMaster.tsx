import React, { useState } from 'react';
import { 
  Users, Search, Plus, Phone, Mail, MapPin, 
  IndianRupee, Edit, Trash2, CheckCircle2 
} from 'lucide-react';
import { Customer, Pet, formatINR } from '../types';

interface CustomerMasterProps {
  customers: Customer[];
  pets: Pet[];
  onAddCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer?: (customerId: string) => void;
}

export const CustomerMaster: React.FC<CustomerMasterProps> = ({
  customers,
  pets,
  onAddCustomer,
  onEditCustomer,
  onDeleteCustomer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Modal Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('27-Maharashtra');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [advanceBalance, setAdvanceBalance] = useState<number>(0);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setGstin('');
    setStateCode('27-Maharashtra');
    setEmergencyContact('');
    setAdvanceBalance(0);
    setShowModal(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email);
    setAddress(c.address);
    setGstin(c.gstin || '');
    setStateCode(c.stateCode);
    setEmergencyContact(c.emergencyContact);
    setAdvanceBalance(c.advanceBalance || 0);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const custData: Customer = {
      id: editingCustomer?.id || `CUST-${Date.now().toString().slice(-4)}`,
      name,
      phone,
      email,
      address,
      gstin,
      stateCode,
      emergencyContact,
      outstandingBalance: editingCustomer?.outstandingBalance || 0,
      advanceBalance: Number(advanceBalance) || 0,
      createdAt: editingCustomer?.createdAt || new Date().toISOString().slice(0, 10)
    };

    if (editingCustomer) {
      onEditCustomer(custData);
    } else {
      onAddCustomer(custData);
    }
    setShowModal(false);
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D62828]" />
            Customer Master Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Pet Parent Contacts, GSTIN B2B Identifiers & Balance History
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-[#D62828] hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-red-900/40"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Customer</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, phone or address..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-medium"
          />
        </div>
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => {
          const linkedPets = pets.filter(p => p.customerId === c.id);
          return (
            <div 
              key={c.id} 
              className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#D62828]/40 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {c.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">ID: {c.id}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1.5 text-slate-400 hover:text-[#D62828] hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                      title="Edit Customer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {onDeleteCustomer && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete customer "${c.name}"? This action cannot be undone.`)) {
                            onDeleteCustomer(c.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg"
                        title="Delete Customer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-zinc-300">
                  <p className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.phone}</span>
                  </p>
                  {c.email && (
                    <p className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </p>
                  )}
                  <p className="flex items-start space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{c.address}</span>
                  </p>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                    Registered Pets ({linkedPets.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {linkedPets.map(p => (
                      <span key={p.id} className="text-[10px] bg-red-50 dark:bg-red-950 text-[#D62828] font-bold px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900">
                        🐾 {p.name} ({p.breed})
                      </span>
                    ))}
                    {linkedPets.length === 0 && (
                      <span className="text-[10px] text-slate-400 italic">No pet profiles linked</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">GSTIN:</span>
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-zinc-200">
                    {c.gstin || 'Unregistered Retail'}
                  </span>
                </div>

                <div className="text-right flex items-center space-x-3">
                  {c.advanceBalance && c.advanceBalance > 0 ? (
                    <div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">Advance Credit:</span>
                      <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                        {formatINR(c.advanceBalance)}
                      </span>
                    </div>
                  ) : null}
                  <div>
                    <span className="text-[10px] text-slate-400 block">Outstanding:</span>
                    <span className={`font-mono text-xs font-extrabold ${c.outstandingBalance > 0 ? 'text-red-600' : 'text-slate-600 dark:text-zinc-400'}`}>
                      {formatINR(c.outstandingBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold">
              {editingCustomer ? 'Edit Customer Profile' : 'Add New Customer Profile'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">GSTIN (B2B Tax No)</label>
                  <input
                    type="text"
                    placeholder="27XXXXX1234X1Z"
                    value={gstin}
                    onChange={e => setGstin(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Full Postal Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Emergency Contact Info</label>
                <input
                  type="text"
                  placeholder="Spouse/Family/Driver contact"
                  value={emergencyContact}
                  onChange={e => setEmergencyContact(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                />
              </div>

              <div>
                <label className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">Advance Credit Deposit Balance (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={advanceBalance}
                  onChange={e => setAdvanceBalance(Number(e.target.value))}
                  className="w-full p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 font-mono font-bold text-emerald-700 dark:text-emerald-300"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Pre-paid balance held with business for future invoices</p>
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
