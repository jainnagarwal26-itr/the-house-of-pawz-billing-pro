import React, { useState, useEffect } from 'react';
import { Search, X, Receipt, Users, Dog, ShoppingBag, ChevronRight } from 'lucide-react';
import { Invoice, Customer, Pet, formatINR } from '../types';
import { CATALOG_ITEMS } from '../lib/storage';

interface GlobalSearchModalProps {
  invoices: Invoice[];
  customers: Customer[];
  pets: Pet[];
  onClose: () => void;
  onSelectInvoice: (inv: Invoice) => void;
  onSelectCustomer: (c: Customer) => void;
  onSelectPet: (p: Pet) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  invoices,
  customers,
  pets,
  onClose,
  onSelectInvoice,
  onSelectCustomer,
  onSelectPet
}) => {
  const [query, setQuery] = useState('');

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const matchingInvoices = query ? invoices.filter(i => 
    i.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
    i.customerName.toLowerCase().includes(query.toLowerCase()) ||
    (i.petName && i.petName.toLowerCase().includes(query.toLowerCase()))
  ) : [];

  const matchingCustomers = query ? customers.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.phone.includes(query)
  ) : [];

  const matchingPets = query ? pets.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.breed.toLowerCase().includes(query.toLowerCase())
  ) : [];

  const matchingProducts = query ? CATALOG_ITEMS.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  ) : [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-start justify-center z-50 p-4 pt-16">
      <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center space-x-3">
          <Search className="w-5 h-5 text-[#D62828]" />
          <input
            type="text"
            autoFocus
            placeholder="Type invoice no, client name, phone number, pet breed..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm font-semibold outline-hidden text-slate-900 dark:text-white"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700">
            ESC
          </kbd>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {!query && (
            <p className="text-slate-400 italic text-center py-8">
              Start typing to search instantly across all 9 sheets...
            </p>
          )}

          {/* Invoices */}
          {matchingInvoices.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                GST Tax Invoices ({matchingInvoices.length})
              </span>
              <div className="space-y-1">
                {matchingInvoices.map(inv => (
                  <div
                    key={inv.id}
                    onClick={() => {
                      onSelectInvoice(inv);
                      onClose();
                    }}
                    className="p-2.5 bg-slate-50 dark:bg-zinc-800/80 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Receipt className="w-4 h-4 text-[#D62828]" />
                      <div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</span>
                        <span className="text-slate-500 block">{inv.customerName} (🐾 {inv.petName || 'N/A'})</span>
                      </div>
                    </div>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                      {formatINR(inv.grandTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers */}
          {matchingCustomers.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Customers ({matchingCustomers.length})
              </span>
              <div className="space-y-1">
                {matchingCustomers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c);
                      onClose();
                    }}
                    className="p-2.5 bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                        <span className="text-slate-500 block">{c.phone} • {c.address}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pets */}
          {matchingPets.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Pet Profiles ({matchingPets.length})
              </span>
              <div className="space-y-1">
                {matchingPets.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectPet(p);
                      onClose();
                    }}
                    className="p-2.5 bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Dog className="w-4 h-4 text-purple-600" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{p.name} ({p.breed})</span>
                        <span className="text-slate-500 block">Owner: {p.customerName}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
