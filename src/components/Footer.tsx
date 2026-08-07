import React, { useState, useEffect } from 'react';
import { HardDrive, ShieldCheck, UserCheck, Clock, CheckCircle2, Wifi, Printer } from 'lucide-react';
import { User } from '../types';

interface FooterProps {
  currentUser: User;
  onOpenExcelManager: () => void;
}

export const Footer: React.FC<FooterProps> = ({ currentUser, onOpenExcelManager }) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <footer className="no-print h-7 bg-slate-900 border-t border-slate-800 text-slate-400 text-[11px] px-3 flex items-center justify-between shrink-0 select-none font-mono z-30">
      {/* Left: App Version & Database Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 font-sans font-semibold text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>The House of Pawz Billing Pro v2.4</span>
        </div>

        <button 
          onClick={onOpenExcelManager}
          className="hidden sm:flex items-center space-x-1 text-slate-400 hover:text-amber-400 transition-colors"
          title="Click to open Excel Workbook Relational Database Manager"
        >
          <HardDrive className="w-3 h-3 text-amber-500" />
          <span>DB: <strong className="text-slate-300 font-normal">THOP_BILLING_DATABASE.xlsx</strong></span>
        </button>

        <div className="hidden md:flex items-center space-x-1 text-slate-400">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Auto-Backup: <span className="text-emerald-400">Active</span></span>
        </div>
      </div>

      {/* Center: System Status Indicators */}
      <div className="hidden lg:flex items-center space-x-5 text-slate-400 text-[10px]">
        <div className="flex items-center space-x-1">
          <Wifi className="w-3 h-3 text-emerald-400" />
          <span>Local Engine: Ready</span>
        </div>
        <div className="flex items-center space-x-1">
          <Printer className="w-3 h-3 text-slate-400" />
          <span>Thermal/GST Printer: Online</span>
        </div>
      </div>

      {/* Right: Current User & Clock */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5">
          {isAdmin ? (
            <ShieldCheck className="w-3 h-3 text-red-400" />
          ) : (
            <UserCheck className="w-3 h-3 text-blue-400" />
          )}
          <span className="text-slate-300 font-sans font-medium">{currentUser.name}</span>
          <span className={`px-1 rounded text-[9px] font-bold font-sans ${
            isAdmin ? 'bg-red-900/80 text-red-300' : 'bg-blue-900/80 text-blue-300'
          }`}>
            {currentUser.role}
          </span>
        </div>

        <div className="hidden sm:flex items-center space-x-1 text-slate-300 font-mono text-[10px]">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{timeStr}</span>
        </div>

        <div className="text-slate-500 hidden xl:block font-sans text-[10px]">
          © 2026 THOP
        </div>
      </div>
    </footer>
  );
};
