import React, { useState } from 'react';
import { 
  Search, Sun, Moon, ShieldCheck, UserCheck, Bell, 
  QrCode, HardDrive, Lock, Calendar, Sparkles, CheckCircle2,
  Menu, LogOut, User as UserIcon
} from 'lucide-react';
import { User, UserRole } from '../types';

interface TopBarProps {
  currentUser: User;
  onSwitchRole: (role: UserRole) => void;
  onLogout: () => void;
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
  onLogout,
  darkMode,
  onToggleDarkMode,
  onOpenGlobalSearch,
  onOpenBarcodeScanner,
  onOpenExcelBackup,
  onOpenNotificationCenter,
  onOpenMobileDrawer,
  unreadAlertsCount
}) => {
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

      {/* Right: Quick Action Controls, Logged In User Pill, Logout */}
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

        {/* Excel Backup Button (Admin & Staff) */}
        {(currentUser.role === 'ADMIN' || currentUser.role === 'BILLING_STAFF') && (
          <button
            onClick={onOpenExcelBackup}
            className="hidden sm:block p-2 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors relative"
            title="Excel Workbook Database Manager"
          >
            <HardDrive className="w-4 h-4" />
          </button>
        )}

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

        {/* Logged in User Indicator Pill (Required by Spec) */}
        <div className="flex items-center space-x-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[110px]">
              {currentUser.name || currentUser.username}
            </span>
            <span className="text-slate-400">•</span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono ${
              currentUser.role === 'ADMIN' ? 'bg-red-100 text-[#D62828] dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900' :
              currentUser.role === 'BILLING_STAFF' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900' :
              'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
            }`}>
              {currentUser.role}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="p-1.5 sm:px-3 sm:py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/80 text-[#D62828] dark:text-red-300 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 border border-red-200 dark:border-red-900 shrink-0"
          title="Logout of current active session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

