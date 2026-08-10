import React, { useState } from 'react';
import { 
  KeyRound, ShieldAlert, ArrowLeft, CheckCircle2, 
  X, Eye, EyeOff, Lock, UserCheck, ShieldCheck 
} from 'lucide-react';
import { User, UserRole } from '../types';

interface ForgotPasswordModalProps {
  users: User[];
  onResetSuccess: (updatedUser: User) => void;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  users,
  onResetSuccess,
  onClose
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [loginId, setLoginId] = useState('');
  const [securityKey, setSecurityKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Step 1: Verify Account
  const handleVerifyAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanId = loginId.trim();
    const user = users.find(u => {
      const usernameMatch = u.username.toLowerCase() === cleanId.toLowerCase() ||
                            u.name.toLowerCase() === cleanId.toLowerCase();
      const roleMatch = u.role === selectedRole;
      return usernameMatch && roleMatch;
    });

    if (user) {
      setMatchedUser(user);
      setStep(2);
    } else {
      setErrorMessage(`No account found matching Login ID "${loginId}" under role ${selectedRole}. Please check your Login ID.`);
    }
  };

  // Step 2: Verify Security Key / Admin PIN
  const handleVerifySecurityKey = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanKey = securityKey.trim();
    // Verify against stored recoveryKey or pinCode only
    // No hardcoded fallback passwords allowed in production
    if (
      (matchedUser?.recoveryKey && cleanKey === matchedUser.recoveryKey) ||
      (matchedUser?.pinCode && cleanKey === matchedUser.pinCode)
    ) {
      setStep(3);
    } else {
      setErrorMessage('Invalid Security Recovery Key or Security PIN. Please contact Admin for assistance.');
    }
  };

  // Step 3: Update Password
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both fields match.');
      return;
    }

    if (matchedUser) {
      const updatedUser: User = {
        ...matchedUser,
        password: newPassword
      };

      setSuccessMessage(`Password for account ${matchedUser.name} (${matchedUser.username}) has been updated successfully!`);
      
      setTimeout(() => {
        onResetSuccess(updatedUser);
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden my-auto space-y-0 text-slate-900 dark:text-white text-xs">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Account Recovery & Reset</h3>
              <p className="text-[10px] text-slate-400 font-mono">Step {step} of 3 • Secure Recovery</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="p-6 space-y-4">
          
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* STEP 1: VERIFY ACCOUNT */}
          {step === 1 && (
            <form onSubmit={handleVerifyAccount} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  1. Select Account Role:
                </label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as UserRole)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-bold"
                >
                  <option value="ADMIN">ADMIN (Chirag Jain)</option>
                  <option value="USER">USER (Poonam Bharti)</option>
                  <option value="BILLING_STAFF">BILLING STAFF (Staff)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  2. Enter Account Login ID *
                </label>
                <input
                  type="text"
                  required
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  placeholder="e.g. Chirag Jain or Poonam Bharti or Staff"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-medium"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 font-bold rounded-xl flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl shadow-md"
                >
                  Verify Account →
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: SECURITY VERIFICATION */}
          {step === 2 && (
            <form onSubmit={handleVerifySecurityKey} className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="font-bold text-blue-900 dark:text-blue-300">Account Identified:</p>
                <p className="text-slate-700 dark:text-zinc-300 font-mono text-[11px] mt-0.5">
                  {matchedUser?.name} • {matchedUser?.role}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Enter Security Recovery Key or Admin Security PIN *
                </label>
                <input
                  type="password"
                  required
                  value={securityKey}
                  onChange={e => setSecurityKey(e.target.value)}
                  placeholder="Enter Security PIN (Default: 1234)"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Default Admin approval security PIN is <strong>1234</strong>.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 font-bold rounded-xl flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl shadow-md"
                >
                  Authorize Reset →
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: RESET & CONFIRM NEW PASSWORD */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full p-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center space-x-1"
                >
                  <Lock className="w-4 h-4" />
                  <span>Update & Save New Password</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
