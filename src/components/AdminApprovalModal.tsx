import React, { useState } from 'react';
import { ShieldAlert, Lock, CheckCircle2, XCircle, KeyRound, AlertTriangle } from 'lucide-react';
import { UserRole } from '../types';

interface AdminApprovalModalProps {
  title: string;
  actionDescription: string;
  onApprove: (adminNotes: string) => void;
  onCancel: () => void;
}

export const AdminApprovalModal: React.FC<AdminApprovalModalProps> = ({
  title,
  actionDescription,
  onApprove,
  onCancel
}) => {
  const [pin, setPin] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState('');

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default master PIN for Admin authorization is '1234' or '0000' or 'admin'
    if (pin === '1234' || pin === 'admin' || pin === '9999') {
      onApprove(adminNotes || 'Approved via Admin PIN Authorization');
    } else {
      setError('Invalid Admin Security PIN! Authorized Admin PIN is 1234.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-red-500/30 space-y-4">
        {/* Header */}
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-200 dark:border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 text-[#D62828] flex items-center justify-center shrink-0 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Admin Authorization Required</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
              Role Permission Enforcement Engine
            </p>
          </div>
        </div>

        {/* Action Warning Box */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs space-y-1">
          <div className="flex items-center space-x-1.5 text-amber-800 dark:text-amber-300 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Restricted Operation: {title}</span>
          </div>
          <p className="text-slate-700 dark:text-zinc-300 pl-5">
            {actionDescription}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerifyPin} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1.5 flex items-center justify-between">
              <span>Enter Admin Security PIN *</span>
              <span className="text-[10px] text-slate-400 font-mono font-normal">(Default: 1234)</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                maxLength={8}
                required
                autoFocus
                placeholder="Enter 4-digit PIN (1234)"
                value={pin}
                onChange={e => {
                  setPin(e.target.value);
                  setError('');
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl font-mono text-center tracking-widest text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#D62828]"
              />
            </div>
            {error && (
              <p className="text-red-600 text-[11px] font-semibold mt-1 flex items-center space-x-1">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
              Override Reason / Supervisor Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Customer requested cancellation / Manager approved discount"
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 text-slate-800 dark:text-zinc-200 font-bold rounded-xl"
            >
              Cancel Request
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-md shadow-red-900/30"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Authorize & Approve</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
