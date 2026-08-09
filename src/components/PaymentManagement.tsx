import React, { useState } from 'react';
import { 
  CreditCard, Plus, Search, CheckCircle2, 
  IndianRupee, Printer, FileText, Trash2 
} from 'lucide-react';
import { Payment, Invoice, Customer, PaymentMode, formatINR, UserRole, User } from '../types';
import { hasPermission } from '../lib/permissions';

interface PaymentManagementProps {
  payments: Payment[];
  invoices: Invoice[];
  customers: Customer[];
  userRole: UserRole;
  userName: string;
  currentUser?: User | null;
  onRecordPayment: (payment: Payment) => void;
  onDeletePayment?: (paymentId: string) => void;
}

export const PaymentManagement: React.FC<PaymentManagementProps> = ({
  payments,
  invoices,
  customers,
  userRole,
  userName,
  currentUser,
  onRecordPayment,
  onDeletePayment
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const pendingInvoices = invoices.filter(i => !i.isCancelled && i.balanceDue > 0);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(pendingInvoices[0]?.id || '');
  const [amount, setAmount] = useState(pendingInvoices[0]?.balanceDue || 0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('Payment collected at front desk');

  const openModal = () => {
    if (pendingInvoices.length > 0) {
      const inv = pendingInvoices[0];
      setSelectedInvoiceId(inv.id);
      setAmount(inv.balanceDue);
    }
    setShowModal(true);
  };

  const handleInvoiceSelect = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      setAmount(inv.balanceDue);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inv = invoices.find(i => i.id === selectedInvoiceId);
    if (!inv) return;

    const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const newPayment: Payment = {
      id: `PAY-${Date.now().toString().slice(-4)}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId,
      customerName: inv.customerName,
      amount,
      paymentDate: todayStr,
      paymentMode,
      transactionRef,
      notes,
      receivedBy: userName
    };

    onRecordPayment(newPayment);
    setShowModal(false);
  };

  const filtered = payments.filter(p =>
    p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.transactionRef && p.transactionRef.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#D62828]" />
            Payment Collections & Dues Settlement
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            UPI QR, POS Cards, Cash & Bank Cheque Receipts
          </p>
        </div>

        {hasPermission(currentUser, 'payments_record') && (
          <button
            onClick={openModal}
            className="px-4 py-2 bg-[#D62828] hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-red-900/40"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Payment</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search payment by invoice number, customer or transaction ref..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-medium"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 text-[10px] uppercase font-bold border-b border-slate-200 dark:border-zinc-800">
              <th className="p-3">Payment ID</th>
              <th className="p-3">Invoice & Client</th>
              <th className="p-3 font-mono text-right">Amount (₹)</th>
              <th className="p-3">Mode & Ref</th>
              <th className="p-3">Date</th>
              <th className="p-3">Collected By</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                  {p.id}
                </td>
                <td className="p-3">
                  <span className="font-mono font-bold text-[#D62828] block">{p.invoiceNumber}</span>
                  <span className="text-slate-700 dark:text-zinc-300 font-medium">{p.customerName}</span>
                </td>
                <td className="p-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatINR(p.amount)}
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                    {p.paymentMode}
                  </span>
                  {p.transactionRef && (
                    <span className="block text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                      Ref: {p.transactionRef}
                    </span>
                  )}
                </td>
                <td className="p-3 font-mono text-slate-500">{p.paymentDate}</td>
                <td className="p-3 text-slate-600 dark:text-zinc-400 font-medium">{p.receivedBy}</td>
                <td className="p-3 text-center">
                  {onDeletePayment && hasPermission(currentUser, 'payments_delete') && (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete payment record ${p.id} for ₹${p.amount}?`)) {
                          onDeletePayment(p.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                      title="Delete Payment Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold">Record Customer Payment</h3>

            {pendingInvoices.length === 0 ? (
              <p className="text-xs text-slate-500">No invoices currently have an outstanding balance.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Select Outstanding Invoice *</label>
                  <select
                    value={selectedInvoiceId}
                    onChange={e => handleInvoiceSelect(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-semibold"
                  >
                    {pendingInvoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.customerName} (Due: ₹{inv.balanceDue})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Amount Collected (₹) *</label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={e => setAmount(Number(e.target.value))}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-bold"
                    >
                      <option value="UPI">UPI / QR Code</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card POS</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Transaction Ref / UTR / Cheque No</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI/123456789 or POS Ref"
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono"
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
                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow-md"
                  >
                    Save Payment Receipt
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
