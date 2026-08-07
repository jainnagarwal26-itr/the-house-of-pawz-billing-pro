import React, { useState } from 'react';
import { 
  Repeat, Plus, Play, Pause, CheckCircle2, 
  Calendar, Dog, Receipt, ShieldAlert 
} from 'lucide-react';
import { RecurringSubscription, Customer, Pet, formatINR, UserRole } from '../types';

interface RecurringBillingProps {
  recurringList: RecurringSubscription[];
  customers: Customer[];
  pets: Pet[];
  userRole: UserRole;
  onGenerateInvoiceForRecurring: (sub: RecurringSubscription) => void;
  onAddRecurring: (sub: RecurringSubscription) => void;
}

export const RecurringBilling: React.FC<RecurringBillingProps> = ({
  recurringList,
  customers,
  pets,
  userRole,
  onGenerateInvoiceForRecurring,
  onAddRecurring
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustId, setSelectedCustId] = useState(customers[0]?.id || '');
  const [serviceName, setServiceName] = useState('Weekly Social Daycare Pass');
  const [amount, setAmount] = useState(1600);
  const [frequency, setFrequency] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [startDate, setStartDate] = useState('2026-08-01');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === selectedCustId);
    const linkedPet = pets.find(p => p.customerId === selectedCustId);

    const newSub: RecurringSubscription = {
      id: `REC-${Date.now().toString().slice(-4)}`,
      customerId: selectedCustId,
      customerName: cust?.name || 'Client',
      petId: linkedPet?.id || '',
      petName: linkedPet?.name || 'Pet',
      serviceName,
      amount,
      frequency,
      startDate,
      nextBillingDate: '2026-08-15',
      status: 'Active'
    };

    onAddRecurring(newSub);
    setShowAddModal(false);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Repeat className="w-5 h-5 text-[#D62828]" />
            Automated Recurring Billing Schedules
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Auto-issue invoices for long-term pet daycare passes, monthly boarding, or weekly training packages.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#D62828] hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-red-900/40"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Recurring Plan</span>
        </button>
      </div>

      {/* Subscription Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recurringList.map(sub => (
          <div key={sub.id} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-2 py-0.5 rounded">
                  {sub.frequency} Billing
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {sub.status}
                </span>
              </div>

              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                {sub.serviceName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Client: <strong>{sub.customerName}</strong> (🐾 {sub.petName})
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Recurring Rate:</span>
                <span className="text-base font-bold font-mono text-[#D62828]">
                  {formatINR(sub.amount)}
                </span>
              </div>

              <button
                onClick={() => onGenerateInvoiceForRecurring(sub)}
                className="px-3 py-1.5 bg-slate-900 dark:bg-zinc-800 hover:bg-[#D62828] text-white font-bold rounded-lg text-xs flex items-center space-x-1 transition-colors"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Issue Invoice Now</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Subscription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Set Up Recurring Billing Package
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Select Customer:</label>
                <select
                  value={selectedCustId}
                  onChange={e => setSelectedCustId(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Package Name:</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Amount (₹):</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Frequency:</label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-semibold"
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D62828] text-white font-bold rounded-lg shadow-md"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
