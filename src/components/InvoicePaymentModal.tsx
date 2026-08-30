import React, { useState } from 'react';
import { 
  CreditCard, Plus, Trash2, Edit2, CheckCircle2, 
  AlertCircle, X, Calendar, IndianRupee, Loader2,
  FileText, ShieldAlert, ArrowRight
} from 'lucide-react';
import { Invoice, Payment, PaymentMode, formatINR, User } from '../types';
import { hasPermission } from '../lib/permissions';

interface InvoicePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  payments: Payment[];
  currentUser?: User | null;
  userName: string;
  onRecordPayment: (payment: Omit<Payment, 'id'> & { id?: string }) => Promise<void>;
  onUpdatePayment: (payment: Payment) => Promise<void>;
  onDeletePayment: (paymentId: string) => Promise<void>;
}

const PAYMENT_MODES: PaymentMode[] = [
  'UPI',
  'Cash',
  'Bank Transfer',
  'Net Banking',
  'Online',
  'Card',
  'Cheque'
];

export const InvoicePaymentModal: React.FC<InvoicePaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  payments,
  currentUser,
  userName,
  onRecordPayment,
  onUpdatePayment,
  onDeletePayment
}) => {
  if (!isOpen || !invoice) return null;

  // Payments for this specific invoice
  const invoicePayments = payments.filter(p => p.invoiceId === invoice.id);
  const totalPaid = invoicePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const balanceDue = Math.max(0, invoice.grandTotal - totalPaid);
  const overpaidAmount = totalPaid > invoice.grandTotal ? totalPaid - invoice.grandTotal : 0;

  // New Payment Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [payDate, setPayDate] = useState(() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  });
  const [amount, setAmount] = useState<number>(balanceDue > 0 ? balanceDue : 0);
  const [mode, setMode] = useState<PaymentMode>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Edit Payment State
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDate, setEditDate] = useState('');
  const [editMode, setEditMode] = useState<PaymentMode>('UPI');
  const [editRef, setEditRef] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Permission Checks
  const canRecord = hasPermission(currentUser, 'payments_record');
  const canEdit = hasPermission(currentUser, 'payments_edit');
  const canDelete = hasPermission(currentUser, 'payments_delete');

  const handleStartAdd = () => {
    setAmount(balanceDue > 0 ? balanceDue : 0);
    setErrorMessage('');
    setShowAddForm(true);
  };

  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onRecordPayment({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        amount: Number(amount),
        paymentDate: payDate,
        paymentMode: mode,
        transactionRef: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
        receivedBy: userName
      });

      setShowAddForm(false);
      setTransactionRef('');
      setNotes('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (p: Payment) => {
    setEditingPayment(p);
    setEditAmount(p.amount);
    setEditDate(p.paymentDate);
    setEditMode(p.paymentMode);
    setEditRef(p.transactionRef || '');
    setEditNotes(p.notes || '');
    setErrorMessage('');
  };

  const handleEditPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    if (editAmount <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    setIsEditSubmitting(true);
    setErrorMessage('');
    try {
      await onUpdatePayment({
        ...editingPayment,
        amount: Number(editAmount),
        paymentDate: editDate,
        paymentMode: editMode,
        transactionRef: editRef.trim() || undefined,
        notes: editNotes.trim() || undefined,
        receivedBy: userName
      });

      setEditingPayment(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update payment.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteClick = async (p: Payment) => {
    if (!canDelete) {
      alert('Access Denied: You do not have permission to delete payment records.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete payment entry of ₹${p.amount.toFixed(2)} received on ${p.paymentDate}? This will immediately update the invoice balance.`
    );
    if (!confirmed) return;

    try {
      await onDeletePayment(p.id);
    } catch (err: any) {
      alert(`Error deleting payment: ${err?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] border border-slate-200 dark:border-zinc-800 animate-in fade-in">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#D62828] text-white flex items-center justify-center font-bold text-sm shadow-md">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <span>Payment Collection Ledger</span>
                <span className="font-mono text-xs text-red-400 bg-red-950/60 px-2 py-0.5 rounded-md border border-red-800">
                  {invoice.invoiceNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {invoice.customerName} {invoice.petName ? `• 🐾 ${invoice.petName}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Grand Total</span>
              <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                {formatINR(invoice.grandTotal)}
              </span>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">Total Paid</span>
              <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-300">
                {formatINR(totalPaid)}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${
              balanceDue > 0 
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800' 
                : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700/60'
            }`}>
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Balance Due</span>
              <span className={`text-sm font-black font-mono ${
                balanceDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-zinc-300'
              }`}>
                {formatINR(balanceDue)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700/60 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Status</span>
              <div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                  invoice.paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : invoice.paymentStatus === 'PARTIAL'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                }`}>
                  {invoice.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Overpayment / Rounding Banner */}
          {overpaidAmount > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-900 dark:text-blue-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Full Settlement:</strong> Total collections ({formatINR(totalPaid)}) exceed invoice grand total by <strong>+{formatINR(overpaidAmount)}</strong> (Rounding difference / Advance retained).
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-bold">{errorMessage}</span>
            </div>
          )}

          {/* Payment Entries Ledger */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#D62828]" />
                <span>Recorded Payment Entries ({invoicePayments.length})</span>
              </h3>

              {!showAddForm && !editingPayment && canRecord && (
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="px-3 py-1.5 bg-[#D62828] hover:bg-red-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Payment</span>
                </button>
              )}
            </div>

            {invoicePayments.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-400">
                No payment entries recorded for this invoice yet.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-300 text-[10px] uppercase tracking-wider font-extrabold">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Amount</th>
                      <th className="p-2.5">Mode</th>
                      <th className="p-2.5">Reference / Notes</th>
                      <th className="p-2.5">Received By</th>
                      <th className="p-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-mono text-xs">
                    {invoicePayments.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                          {p.paymentDate}
                        </td>
                        <td className="p-2.5 font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatINR(p.amount)}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded text-[10px] font-bold">
                            {p.paymentMode}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-zinc-400 font-sans">
                          {p.transactionRef ? (
                            <span className="font-mono text-slate-800 dark:text-zinc-200 font-semibold block">
                              Ref: {p.transactionRef}
                            </span>
                          ) : null}
                          {p.notes && <span className="text-[10px] text-slate-500 block">{p.notes}</span>}
                          {!p.transactionRef && !p.notes && <span className="text-slate-400">—</span>}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-zinc-400 font-sans">
                          {p.receivedBy || 'Staff'}
                        </td>
                        <td className="p-2.5 text-center font-sans">
                          <div className="flex items-center justify-center space-x-1">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(p)}
                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded transition-colors"
                                title="Edit this payment"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(p)}
                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 rounded transition-colors"
                                title="Delete this payment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Inline Add Payment Form */}
          {showAddForm && (
            <form onSubmit={handleAddPaymentSubmit} className="p-4 bg-red-50/50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900/60 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b pb-2 border-red-200 dark:border-red-900/60">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#D62828]" />
                  <span>Record New Payment Entry</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-zinc-300">
                    Payment Date (DD/MM/YYYY) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 20/06/2026"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700 font-mono"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-zinc-300">Amount (₹) *</label>
                    {balanceDue > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmount(balanceDue)}
                        className="text-[10px] text-red-600 font-bold hover:underline"
                      >
                        Full (₹{balanceDue.toFixed(2)})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-zinc-300">Payment Mode *</label>
                  <select
                    value={mode}
                    onChange={e => setMode(e.target.value as PaymentMode)}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700 font-bold"
                  >
                    {PAYMENT_MODES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-zinc-300">
                    Reference / Transaction ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref / Bank UTR / Cheque No"
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-zinc-300">
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Received at front desk / Advance balance"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-red-200 dark:border-red-900/60">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-[#D62828] hover:bg-red-700 text-white rounded-lg font-extrabold flex items-center gap-1.5 shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Payment…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Payment Entry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Inline Edit Payment Form */}
          {editingPayment && (
            <form onSubmit={handleEditPaymentSubmit} className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-800 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b pb-2 border-blue-200 dark:border-blue-800">
                <h4 className="font-extrabold text-blue-950 dark:text-blue-200 text-xs flex items-center gap-1.5">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                  <span>Edit Payment ({editingPayment.id})</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-zinc-300">
                    Payment Date (DD/MM/YYYY) *
                  </label>
                  <input
                    type="text"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-zinc-300">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(Number(e.target.value))}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-zinc-300">Payment Mode *</label>
                  <select
                    value={editMode}
                    onChange={e => setEditMode(e.target.value as PaymentMode)}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700 font-bold"
                  >
                    {PAYMENT_MODES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-zinc-300">
                    Reference / Transaction ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={editRef}
                    onChange={e => setEditRef(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-zinc-300">
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  disabled={isEditSubmitting}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-extrabold flex items-center gap-1.5 shadow-md"
                >
                  {isEditSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Update Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-100 dark:bg-zinc-800/80 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Close Ledger
          </button>
        </div>

      </div>
    </div>
  );
};
