import React, { useState } from 'react';
import { 
  Search, Sun, Moon, ShieldCheck, UserCheck, Bell, 
  QrCode, HardDrive, Lock, Calendar, Sparkles, CheckCircle2,
  Menu
} from 'lucide-react';
import { User, UserRole } from '../types';

interface TopBarProps {
  currentUser: User;
  onSwitchRole: (role: UserRole) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenGlobalSearch: () => void;
  onOpenBarcodeScanner: () => void;
  onOpenExcelBackup: () => void;
  onOpenNotificationCenter: () => void;
  onOpenMobileDrawer?: () => void;
  unreadAlertsCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  onSwitchRole,
  darkMode,
  onToggleDarkMode,
  onOpenGlobalSearch,
  onOpenBarcodeScanner,
  onOpenExcelBackup,
  onOpenNotificationCenter,
  onOpenMobileDrawer,
  unreadAlertsCount
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  return (
    <header className="no-print h-14 bg-white/95 dark:bg-[#1a1a1a]/95 border-b border-slate-200 dark:border-zinc-800 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: App Identity & FY Badge */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        {/* Mobile Drawer Trigger Menu Button */}
        <button
          onClick={onOpenMobileDrawer}
          className="md:hidden p-1.5 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg shrink-0"
          title="Open Menu"
        >
          <Menu className="w-5 h-5 text-[#D62828]" />
        </button>

        {/* Desktop window control dots decoration */}
        <div className="hidden lg:flex items-center space-x-1.5 mr-1">
          <div className="w-3 h-3 rounded-full bg-red-500 hover:opacity-80 transition-opacity cursor-pointer" title="Close App Preview" />
          <div className="w-3 h-3 rounded-full bg-amber-400 hover:opacity-80 transition-opacity cursor-pointer" title="Minimize Window" />
          <div className="w-3 h-3 rounded-full bg-emerald-500 hover:opacity-80 transition-opacity cursor-pointer" title="Maximize Window" />
        </div>

        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#D62828] text-white flex items-center justify-center font-bold font-mono text-xs sm:text-sm shrink-0 shadow-sm ring-2 ring-[#C9A227]/30">
            HOP
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 truncate">
              House of Pawz <span className="hidden sm:inline-block text-[10px] bg-red-100 dark:bg-red-950/80 text-[#D62828] font-bold px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900">Billing Pro</span>
            </h1>
            <p className="hidden sm:block text-[10px] text-slate-500 dark:text-zinc-400 font-medium truncate">
              Pet Care & Boarding GST Software
            </p>
          </div>
        </div>

        {/* Financial Year Indicator */}
        <div className="hidden xl:flex items-center space-x-1 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800/60 font-medium">
          <Calendar className="w-3.5 h-3.5 text-[#C9A227]" />
          <span>FY: <strong>2026-27</strong></span>
        </div>
      </div>

      {/* Middle: Quick Search Bar (Desktop / Tablet) */}
      <div className="hidden sm:block flex-1 max-w-md mx-2 sm:mx-4">
        <button
          onClick={onOpenGlobalSearch}
          className="w-full h-9 bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200/80 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-xs rounded-lg px-3 flex items-center justify-between border border-slate-200 dark:border-zinc-700 transition-colors shadow-inner"
        >
          <div className="flex items-center space-x-2 truncate">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">Search Invoices, Customers, Pets...</span>
          </div>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-700 shadow-2xs">
            F2
          </kbd>
        </button>
      </div>

      {/* Right: Quick Action Controls, Role Switcher, Theme */}
      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
        {/* Search Trigger Icon on Mobile */}
        <button
          onClick={onOpenGlobalSearch}
          className="sm:hidden p-2 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          title="Search Database"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Barcode Scanner Button */}
        <button
          onClick={onOpenBarcodeScanner}
          className="p-2 text-slate-600 dark:text-zinc-300 hover:text-[#D62828] dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors relative"
          title="Scan Product/Pet Barcode"
        >
          <QrCode className="w-4 h-4" />
        </button>

        {/* Excel Backup Button */}
        <button
          onClick={onOpenExcelBackup}
          className="hidden sm:block p-2 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors relative"
          title="Excel Workbook Database Manager"
        >
          <HardDrive className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={onOpenNotificationCenter}
            className="p-2 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors relative"
            title="Notifications & System Activity"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D62828] ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
            )}
          </button>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          title="Toggle Light / Dark Mode"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-zinc-700 mx-1" />

        {/* Role Switcher Pill (Desktop) */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className={`flex items-center space-x-2 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              currentUser.role === 'ADMIN'
                ? 'bg-red-50 dark:bg-red-950/60 text-[#D62828] dark:text-red-300 border-red-200 dark:border-red-800/80'
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80'
            }`}
          >
            {currentUser.role === 'ADMIN' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-[#D62828] dark:text-red-400" />
            ) : (
              <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            )}
            <div className="text-left">
              <span className="block leading-none text-[11px]">
                {currentUser.role === 'ADMIN' ? 'Admin (Owner/CA)' : 'Billing Staff'}
              </span>
              <span className="text-[9px] font-normal text-slate-500 dark:text-zinc-400">
                Click to switch role
              </span>
            </div>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl p-2 z-50 text-xs">
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800 mb-1">
                Select Active Role
              </div>

              {/* Admin Option */}
              <button
                onClick={() => {
                  onSwitchRole('ADMIN');
                  setShowRoleMenu(false);
                }}
                className={`w-full p-2 rounded-lg text-left flex items-start space-x-2.5 transition-colors mb-1 ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-red-50 dark:bg-red-950/50 text-[#D62828] font-semibold border border-red-200 dark:border-red-900'
                    : 'hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-[#D62828] shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Admin / Owner / CA</span>
                    <span className="text-[9px] bg-red-100 text-red-800 px-1 rounded font-mono">Full Access</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal mt-0.5">
                    Full rights: Edit/Delete/Cancel invoices, Share, Export GST, Backup Excel, Manage Users.
                  </p>
                </div>
              </button>

              {/* Billing User Option */}
              <button
                onClick={() => {
                  onSwitchRole('BILLING_USER');
                  setShowRoleMenu(false);
                }}
                className={`w-full p-2 rounded-lg text-left flex items-start space-x-2.5 transition-colors ${
                  currentUser.role === 'BILLING_USER'
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 font-semibold border border-blue-200 dark:border-blue-900'
                    : 'hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <UserCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Billing Staff User</span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-mono flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Restricted
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal mt-0.5">
                    Can create & save invoices only. CANNOT edit, delete, cancel, share, export or access settings.
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

