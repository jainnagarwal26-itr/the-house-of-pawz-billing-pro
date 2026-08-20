import React, { useState } from 'react';
import { 
  LayoutDashboard, Receipt, Users, Dog, CreditCard, 
  FileSpreadsheet, HardDrive, UserCog, History, Settings, 
  Repeat, PlusCircle, Lock, ShieldCheck, UserCheck, ChevronRight,
  ChevronLeft, PanelLeftClose, PanelLeftOpen, HelpCircle, Download,
  Menu, X, Sparkles, Shield, Camera, Image as ImageIcon, Zap, Car, LogOut
} from 'lucide-react';
import { UserRole, User } from '../types';
import { hasPermission } from '../lib/permissions';

export type ActiveTab = 
  | 'dashboard' 
  | 'invoices' 
  | 'services'
  | 'recurring'
  | 'customers' 
  | 'pets' 
  | 'pick_drop'
  | 'communication'
  | 'smart_import'
  | 'payments' 
  | 'gst_reports' 
  | 'excel' 
  | 'users' 
  | 'audit' 
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  user?: User | null;
  onNewInvoice: () => void;
  pendingPaymentCount: number;
  activeBoardingCount: number;
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
  onOpenMobileDrawer?: () => void;
  onLogout?: () => void;
}

export function isTabAllowedForUser(tab: ActiveTab, user?: User | null, userRole?: UserRole): boolean {
  const role = userRole || user?.role || 'BILLING_STAFF';
  
  if (user) {
    const tabPermissionMap: Record<ActiveTab, string> = {
      dashboard: 'dashboard_view',
      invoices: 'invoices_view',
      services: 'service_catalog_view',
      recurring: 'boarding_view',
      customers: 'customers_view',
      pets: 'pets_view',
      pick_drop: 'pick_drop_view',
      communication: 'communication_center_view',
      smart_import: 'import_engine_view',
      payments: 'payments_view',
      gst_reports: 'gst_reports_view',
      excel: 'excel_db_view',
      users: 'user_management_view',
      audit: 'audit_logs_view',
      settings: 'settings_view'
    };
    const key = tabPermissionMap[tab];
    if (key) return hasPermission(user, key);
  }

  if (role === 'ACCOUNTANT' || role === 'SUPER_ADMIN') return true;
  if (role === 'ADMIN') {
    return ['dashboard', 'customers', 'pets', 'pick_drop', 'communication', 'payments'].includes(tab);
  }
  if (role === 'BILLING_STAFF') {
    return ['invoices', 'customers', 'pets', 'pick_drop'].includes(tab);
  }

  return ['invoices', 'pets', 'pick_drop'].includes(tab);
}

// Backwards compatibility alias
export const isTabAllowedForRole = (tab: ActiveTab, role: UserRole) => isTabAllowedForUser(tab, undefined, role);

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  user,
  onNewInvoice,
  pendingPaymentCount,
  activeBoardingCount,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
  onOpenMobileDrawer,
  onLogout
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  const rawNavItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      adminOnly: false
    },
    {
      id: 'invoices' as ActiveTab,
      label: 'GST Invoices',
      icon: Receipt,
      adminOnly: false,
      badge: pendingPaymentCount > 0 ? `${pendingPaymentCount}` : null,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
    },
    {
      id: 'services' as ActiveTab,
      label: 'Services & Packages',
      icon: Sparkles,
      adminOnly: false,
      badge: 'NEW',
      badgeColor: 'bg-emerald-600 text-white font-mono'
    },
    {
      id: 'recurring' as ActiveTab,
      label: 'Recurring Billing',
      icon: Repeat,
      adminOnly: false
    },
    {
      id: 'customers' as ActiveTab,
      label: 'Customer Master',
      icon: Users,
      adminOnly: false
    },
    {
      id: 'pets' as ActiveTab,
      label: 'Pet Boarding & Care',
      icon: Dog,
      adminOnly: false,
      badge: activeBoardingCount > 0 ? `${activeBoardingCount}` : null,
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
    },
    {
      id: 'pick_drop' as ActiveTab,
      label: 'Pick & Drop',
      icon: Car,
      adminOnly: false,
      badge: 'VAN',
      badgeColor: 'bg-red-600 text-white font-mono'
    },
    {
      id: 'communication' as ActiveTab,
      label: 'Communication Centre',
      icon: Sparkles,
      adminOnly: false,
      badge: 'HUB',
      badgeColor: 'bg-blue-600 text-white font-mono'
    },
    {
      id: 'smart_import' as ActiveTab,
      label: 'Smart Import Engine',
      icon: Zap,
      adminOnly: false,
      badge: 'AI',
      badgeColor: 'bg-amber-500 text-white font-mono font-bold'
    },
    {
      id: 'payments' as ActiveTab,
      label: 'Payments Log',
      icon: CreditCard,
      adminOnly: false
    },
    {
      id: 'gst_reports' as ActiveTab,
      label: 'GST Reports (CA)',
      icon: FileSpreadsheet,
      adminOnly: true
    },
    {
      id: 'excel' as ActiveTab,
      label: 'Excel Database',
      icon: HardDrive,
      adminOnly: true
    },
    {
      id: 'users' as ActiveTab,
      label: 'User Management',
      icon: UserCog,
      adminOnly: true
    },
    {
      id: 'audit' as ActiveTab,
      label: 'Audit Logs',
      icon: History,
      adminOnly: false
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Software Settings',
      icon: Settings,
      adminOnly: true
    }
  ];

  const navItems = rawNavItems.filter(item => isTabAllowedForUser(item.id, user, userRole));

  const handleTabClick = (tab: ActiveTab) => {
    onSelectTab(tab);
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  return (
    <>
      {/* DESKTOP SIDEBAR (hidden on mobile) */}
      <aside className={`no-print hidden md:flex ${collapsed ? 'w-16' : 'w-60'} bg-slate-900 text-slate-300 flex-col justify-between shrink-0 h-full select-none border-r border-slate-800 transition-all duration-300 relative`}>
        {/* Top Action & Navigation */}
        <div className="p-3 space-y-3 overflow-y-auto">
          {/* Company Brand Logo Header */}
          <div className="pb-2 border-b border-slate-800/80">
            {collapsed ? (
              <div className="flex justify-center" title="The House of Pawz">
                <div className="w-9 h-9 rounded-xl bg-white p-0.5 border border-slate-700 overflow-hidden shadow-sm flex items-center justify-center">
                  <img src="/Logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-lg" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5 px-0.5">
                <div className="w-9 h-9 rounded-xl bg-white p-0.5 border border-slate-700 overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                  <img src="/Logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-lg" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs font-black text-white tracking-tight uppercase truncate">
                    House of Pawz
                  </h2>
                  <p className="text-[9px] text-red-400 font-bold font-mono truncate">
                    Billing Pro Enterprise
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Toggle Collapse Button Header */}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} pb-1 border-b border-slate-800/80`}>
            {!collapsed && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Navigation
              </span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4 text-amber-400" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick + Create Invoice Button */}
          <button
            onClick={onNewInvoice}
            title="Create New GST Invoice"
            className={`w-full py-2.5 ${collapsed ? 'px-0 justify-center' : 'px-3 justify-center space-x-2'} bg-gradient-to-r from-[#D62828] to-red-700 hover:from-red-600 hover:to-red-800 text-white font-semibold rounded-xl text-xs flex items-center shadow-md shadow-red-900/40 active:scale-[0.98] transition-all group`}
          >
            <PlusCircle className="w-4 h-4 text-white group-hover:rotate-90 transition-transform duration-300 shrink-0" />
            {!collapsed && <span>+ Create GST Invoice</span>}
          </button>

          {/* Navigation List */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isAllowed = isTabAllowedForUser(item.id, user, userRole);
              const isDisabled = !isAllowed;

              return (
                <button
                  key={item.id}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleTabClick(item.id)}
                  title={collapsed ? `${item.label}${isDisabled ? ' (Admin Only)' : ''}` : undefined}
                  className={`w-full text-left ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2 justify-between'} rounded-lg text-xs font-medium flex items-center transition-all group ${
                    isActive
                      ? 'bg-[#D62828] text-white shadow-sm font-semibold'
                      : isDisabled
                      ? 'text-slate-600 cursor-not-allowed hover:bg-slate-800/40'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-2.5'} min-w-0`}>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : isDisabled ? 'text-slate-600' : 'text-slate-400 group-hover:text-amber-400'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!collapsed && (
                    <div className="flex items-center space-x-1">
                      {item.badge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                      {isDisabled && (
                        <Lock className="w-3 h-3 text-slate-600 shrink-0" title="Admin access required" />
                      )}
                      {!isDisabled && isActive && (
                        <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Role Info Banner */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          {collapsed ? (
            <div className="flex justify-center" title={isAdmin ? 'Admin Mode' : 'Staff Mode'}>
              <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold ${
                isAdmin ? 'bg-red-900/60 text-red-400 border border-red-800/80' : 'bg-blue-900/60 text-blue-400 border border-blue-800/80'
              }`}>
                {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 font-bold ${
                isAdmin ? 'bg-red-900/60 text-red-400 border border-red-800/80' : 'bg-blue-900/60 text-blue-400 border border-blue-800/80'
              }`}>
                {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-200 truncate">
                  {isAdmin ? 'Admin Rights Active' : 'Staff Billing Mode'}
                </p>
                <p className="text-[9px] text-slate-400 truncate">
                  {isAdmin ? 'Complete CA & Owner Control' : 'Invoice creation & saving only'}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR (Fixed at bottom on phones) */}
      <div className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-lg px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => handleTabClick('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'dashboard' ? 'text-[#D62828]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => handleTabClick('invoices')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all relative ${
            activeTab === 'invoices' ? 'text-[#D62828]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span>Invoices</span>
          {pendingPaymentCount > 0 && (
            <span className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>

        {/* Center Primary Action Button (+ New Invoice) */}
        <button
          onClick={onNewInvoice}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#D62828] to-red-500 text-white flex items-center justify-center shadow-lg shadow-red-900/60 -mt-5 border-2 border-slate-950 active:scale-90 transition-transform"
          title="Create New Invoice"
        >
          <PlusCircle className="w-6 h-6 text-white" />
        </button>

        <button
          onClick={() => handleTabClick('pets')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all relative ${
            activeTab === 'pets' ? 'text-[#D62828]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Dog className="w-5 h-5 mb-0.5" />
          <span>Pets</span>
          {activeBoardingCount > 0 && (
            <span className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => {
            if (onOpenMobileDrawer) onOpenMobileDrawer();
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all ${
            isMobileDrawerOpen ? 'text-[#D62828]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </div>

      {/* MOBILE SLIDE-OVER NAVIGATION DRAWER */}
      {isMobileDrawerOpen && (
        <div className="no-print md:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-start animate-in fade-in duration-200">
          <div className="w-4/5 max-w-xs bg-slate-900 text-white h-full flex flex-col justify-between p-4 shadow-2xl border-r border-slate-800 animate-in slide-in-from-left duration-200">
            <div className="space-y-4 overflow-y-auto">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-[#D62828] text-white flex items-center justify-center font-bold font-mono text-xs">
                    HOP
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">The House of Pawz</h3>
                    <p className="text-[10px] text-red-400 font-mono font-bold">Billing Pro Enterprise</p>
                  </div>
                </div>

                <button
                  onClick={onCloseMobileDrawer}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Create Invoice Button */}
              <button
                onClick={() => {
                  onNewInvoice();
                  if (onCloseMobileDrawer) onCloseMobileDrawer();
                }}
                className="w-full py-2.5 px-3 bg-[#D62828] hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md shadow-red-900/50"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Create GST Invoice</span>
              </button>

              {/* Navigation List */}
              <nav className="space-y-1">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isAllowed = isTabAllowedForUser(item.id, user, userRole);
                  const isDisabled = !isAllowed;

                  return (
                    <button
                      key={item.id}
                      disabled={isDisabled}
                      onClick={() => !isDisabled && handleTabClick(item.id)}
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-[#D62828] text-white shadow-sm'
                          : isDisabled
                          ? 'text-slate-600 cursor-not-allowed'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isDisabled ? 'text-slate-600' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        {item.badge && (
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                        {isDisabled && <Lock className="w-3 h-3 text-slate-600" />}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Footer Role Banner & Logout */}
            <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center space-x-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="font-bold text-slate-200 text-[11px]">{isAdmin ? 'Admin Mode' : 'Staff Billing Mode'}</p>
                  <p className="text-[9px] text-slate-400 font-mono">Role: {userRole}</p>
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={() => {
                    if (onCloseMobileDrawer) onCloseMobileDrawer();
                    onLogout();
                  }}
                  className="w-full py-2.5 px-3 bg-red-950/60 hover:bg-red-900/80 text-red-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 border border-red-900/80 cursor-pointer shadow-sm active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout Current Session</span>
                </button>
              )}

              <p className="text-[9px] text-center font-mono text-slate-500">
                House of Pawz Billing v2.6 • Offline Ready
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

