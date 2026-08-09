import React, { useState } from 'react';
import { 
  ShieldCheck, UserCheck, KeyRound, Eye, EyeOff, 
  Lock, AlertCircle, HelpCircle, Building2, CheckCircle2, Sparkles
} from 'lucide-react';
import { User, UserRole } from '../types';

interface LoginModalProps {
  users: User[];
  onLoginSuccess: (user: User, remember: boolean) => void;
  onOpenForgotPassword: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  users,
  onLoginSuccess,
  onOpenForgotPassword
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [loginId, setLoginId] = useState('Chirag Jain');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Role Selector Switcher Handler
  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage('');
    setPassword(''); // Never auto-fill password for security
    if (role === 'ADMIN') {
      setLoginId('Chirag Jain');
    } else if (role === 'USER') {
      setLoginId('Poonam Bharti');
    } else if (role === 'BILLING_STAFF') {
      setLoginId('Staff');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    setTimeout(() => {
      const cleanId = loginId.trim();
      const cleanPass = password.trim();

      // Find user matching credentials
      let targetUser = users.find(u => {
        const usernameMatch = u.username.toLowerCase() === cleanId.toLowerCase() ||
                              u.name.toLowerCase() === cleanId.toLowerCase();
        const roleMatch = u.role === selectedRole ||
                          (selectedRole === 'ADMIN' && u.role === 'SUPER_ADMIN') ||
                          (selectedRole === 'USER' && (u.role === 'RECEPTION' || u.role === 'MANAGER')) ||
                          (selectedRole === 'BILLING_STAFF' && u.role === 'BILLING_USER');
        const passMatch = u.password === cleanPass;
        return usernameMatch && roleMatch && passMatch;
      });

      // Direct fallback matching for initial production accounts
      if (!targetUser) {
        if (selectedRole === 'ADMIN' && cleanId.toLowerCase() === 'chirag jain' && cleanPass === 'Chirag@2026') {
          targetUser = {
            id: 'USR-ADMIN-001',
            name: 'Chirag Jain',
            username: 'Chirag Jain',
            password: 'Chirag@2026',
            role: 'ADMIN',
            email: 'chirag.jain@thehouseofpawz.com',
            phone: '+91 98197 02638',
            designation: 'Admin / CA',
            lastLogin: new Date().toLocaleString('en-IN'),
            isActive: true
          };
        } else if (selectedRole === 'USER' && cleanId.toLowerCase() === 'poonam bharti' && cleanPass === 'Poonam@123') {
          targetUser = {
            id: 'USR-USER-002',
            name: 'Poonam Bharti',
            username: 'Poonam Bharti',
            password: 'Poonam@123',
            role: 'USER',
            email: 'poonam.bharti@thehouseofpawz.com',
            phone: '+91 98200 12345',
            designation: 'Billing Operator',
            lastLogin: new Date().toLocaleString('en-IN'),
            isActive: true
          };
        } else if (selectedRole === 'BILLING_STAFF' && cleanId.toLowerCase() === 'staff' && cleanPass === 'Staff@2026') {
          targetUser = {
            id: 'USR-STAFF-003',
            name: 'Billing Staff',
            username: 'Staff',
            password: 'Staff@2026',
            role: 'BILLING_STAFF',
            email: 'staff.billing@thehouseofpawz.com',
            phone: '+91 98765 43210',
            designation: 'Billing / CA Staff',
            lastLogin: new Date().toLocaleString('en-IN'),
            isActive: true
          };
        }
      }

      if (targetUser) {
        // Inherit latest custom permissions from state/storage
        const latestStoredUser = users.find(u => u.id === targetUser!.id || u.username.toLowerCase() === targetUser!.username.toLowerCase());
        if (latestStoredUser && latestStoredUser.permissions) {
          targetUser.permissions = latestStoredUser.permissions;
        }

        if (!targetUser.isActive) {
          setErrorMessage('This user account is currently deactivated. Please contact your System Administrator.');
          setIsSubmitting(false);
          return;
        }

        const updatedUser: User = {
          ...targetUser,
          lastLogin: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
        };

        onLoginSuccess(updatedUser, rememberMe);
      } else {
        setErrorMessage('Invalid Login ID or Password for the selected role. Please check your credentials.');
      }
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden space-y-0 my-auto">
        
        {/* Top Header Branding Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-[#D62828] to-slate-900 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />
          
          <div className="w-16 h-16 bg-white p-1 rounded-2xl mx-auto flex items-center justify-center shadow-lg ring-4 ring-white/20 mb-3 overflow-hidden">
            <img 
              src="/Logo.jpg" 
              alt="The House of Pawz" 
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <h2 className="text-xl font-extrabold tracking-tight">THE HOUSE OF PAWZ</h2>
          <p className="text-xs text-amber-200 font-semibold tracking-wider uppercase mt-0.5">
            BILLING PRO • PRODUCTION ERP ACCESS
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Step 1: Select Role Tabs */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
              Select Your Access Role:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* ADMIN TAB */}
              <button
                type="button"
                onClick={() => handleRoleSelect('ADMIN')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                  selectedRole === 'ADMIN'
                    ? 'bg-red-50 dark:bg-red-950/80 border-[#D62828] text-[#D62828] font-bold shadow-xs ring-2 ring-red-500/20'
                    : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                <span className="text-[11px] leading-none font-bold">ADMIN</span>
                <span className="text-[9px] text-slate-400 font-normal">Admin / CA</span>
              </button>

              {/* USER TAB */}
              <button
                type="button"
                onClick={() => handleRoleSelect('USER')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                  selectedRole === 'USER'
                    ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-600 text-blue-600 font-bold shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-5 h-5" />
                <span className="text-[11px] leading-none font-bold">USER</span>
                <span className="text-[9px] text-slate-400 font-normal">Operator</span>
              </button>

              {/* BILLING STAFF TAB */}
              <button
                type="button"
                onClick={() => handleRoleSelect('BILLING_STAFF')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                  selectedRole === 'BILLING_STAFF'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-600 text-emerald-600 font-bold shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="text-[11px] leading-none font-bold">STAFF</span>
                <span className="text-[9px] text-slate-400 font-normal">Billing Staff</span>
              </button>
            </div>
          </div>

          {/* Validation Error Alert */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-zinc-300 font-bold mb-1">
                Login ID *
              </label>
              <input
                type="text"
                required
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                placeholder="Enter your Login ID"
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#D62828]/40"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-700 dark:text-zinc-300 font-bold">
                  Password *
                </label>
                <button
                  type="button"
                  onClick={onOpenForgotPassword}
                  className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-10 pl-3 pr-10 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#D62828]/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Session Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-slate-600 dark:text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#D62828] focus:ring-[#D62828]"
                />
                <span>Remember session on this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-gradient-to-r from-[#D62828] to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl shadow-lg shadow-red-900/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>LOGIN TO BILLING PRO</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Production Account ID Hints */}
          <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400 space-y-1">
            <span className="font-bold uppercase block text-[10px] text-slate-400">Production User IDs:</span>
            <p>• <strong>ADMIN ID:</strong> Chirag Jain</p>
            <p>• <strong>USER ID:</strong> Poonam Bharti</p>
            <p>• <strong>STAFF ID:</strong> Staff</p>
          </div>

        </div>
      </div>
    </div>
  );
};
