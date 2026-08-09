import React, { useState } from 'react';
import { 
  Shield, Check, X, RotateCcw, Save, AlertTriangle, 
  Lock, LayoutDashboard, Receipt, Users, Dog, Repeat, 
  CreditCard, FileSpreadsheet, HardDrive, Zap, History, 
  Camera, UserCog, Settings, Clock, Sparkles
} from 'lucide-react';
import { User, PermissionChangeRecord } from '../types';
import { 
  PERMISSION_CATEGORIES, DEFAULT_ROLE_PERMISSIONS, hasPermission, getEffectivePermissionDetails 
} from '../lib/permissions';

interface PermissionEditorModalProps {
  targetUser: User;
  adminUser: User;
  allUsers: User[];
  onSave: (updatedUser: User) => void;
  onClose: () => void;
}

export const PermissionEditorModal: React.FC<PermissionEditorModalProps> = ({
  targetUser,
  adminUser,
  allUsers,
  onSave,
  onClose
}) => {
  // Initialize local permissions map from user's current permissions or role defaults
  const [localPermissions, setLocalPermissions] = useState<Record<string, boolean>>(() => {
    const initialMap: Record<string, boolean> = {};
    PERMISSION_CATEGORIES.forEach(cat => {
      cat.permissions.forEach(perm => {
        initialMap[perm.key] = hasPermission(targetUser, perm.key);
      });
    });
    return initialMap;
  });

  const [activeTabCategory, setActiveTabCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'EDITOR' | 'SUMMARY' | 'HISTORY'>('EDITOR');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Check if this user is the only active ADMIN
  const activeAdmins = allUsers.filter(u => (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') && u.isActive);
  const isOnlyAdmin = activeAdmins.length === 1 && activeAdmins[0].id === targetUser.id;

  const roleDefaults = DEFAULT_ROLE_PERMISSIONS[targetUser.role] || DEFAULT_ROLE_PERMISSIONS.USER;

  const handleToggle = (key: string) => {
    setErrorMessage('');
    
    // Safety Guard: Cannot strip admin permissions from the ONLY active ADMIN account
    if (isOnlyAdmin && (key === 'user_management_permissions' || key === 'user_management_view' || key === 'settings_view')) {
      if (localPermissions[key]) {
        setErrorMessage('Safety Guard Block: You cannot remove critical Admin permissions from the ONLY active Admin account.');
        return;
      }
    }

    setLocalPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleResetToDefaults = () => {
    setErrorMessage('');
    const resetMap: Record<string, boolean> = {};
    PERMISSION_CATEGORIES.forEach(cat => {
      cat.permissions.forEach(perm => {
        resetMap[perm.key] = roleDefaults[perm.key] !== undefined ? roleDefaults[perm.key] : false;
      });
    });
    setLocalPermissions(resetMap);
  };

  const handleSaveSubmit = () => {
    // Safety check: Ensure Admin still has user_management permission if only 1 admin
    if (isOnlyAdmin && (!localPermissions['user_management_permissions'] || !localPermissions['user_management_view'])) {
      setErrorMessage('Safety Guard Block: As the only active Admin, you must retain User Management & Permission rights.');
      return;
    }

    // Generate change history records for accountability
    const nowStr = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' });
    const newHistoryEntries: PermissionChangeRecord[] = [];

    PERMISSION_CATEGORIES.forEach(cat => {
      cat.permissions.forEach(p => {
        const oldEffective = hasPermission(targetUser, p.key);
        const newEffective = localPermissions[p.key];
        if (oldEffective !== newEffective) {
          newHistoryEntries.push({
            id: `PHIST-${Date.now()}-${Math.random().toString().slice(-4)}`,
            timestamp: nowStr,
            key: p.key,
            label: p.label,
            oldState: oldEffective ? 'ALLOWED' : 'DENIED',
            newState: newEffective ? 'ALLOWED' : 'DENIED',
            changedBy: adminUser?.name || 'ADMIN Chirag Jain'
          });
        }
      });
    });

    const updatedHistory = [
      ...newHistoryEntries,
      ...(targetUser.permissionHistory || [])
    ].slice(0, 50); // Keep last 50 history entries

    const updatedUser: User = {
      ...targetUser,
      permissions: localPermissions,
      permissionHistory: updatedHistory
    };

    onSave(updatedUser);
  };

  // Helper icon mapper
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className="w-4 h-4 text-blue-500" />;
      case 'Receipt': return <Receipt className="w-4 h-4 text-emerald-500" />;
      case 'Users': return <Users className="w-4 h-4 text-amber-500" />;
      case 'Dog': return <Dog className="w-4 h-4 text-purple-500" />;
      case 'Repeat': return <Repeat className="w-4 h-4 text-indigo-500" />;
      case 'CreditCard': return <CreditCard className="w-4 h-4 text-teal-500" />;
      case 'FileSpreadsheet': return <FileSpreadsheet className="w-4 h-4 text-[#D62828]" />;
      case 'HardDrive': return <HardDrive className="w-4 h-4 text-[#C9A227]" />;
      case 'Zap': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'History': return <History className="w-4 h-4 text-cyan-500" />;
      case 'Camera': return <Camera className="w-4 h-4 text-[#D62828]" />;
      case 'UserCog': return <UserCog className="w-4 h-4 text-red-500" />;
      case 'Settings': return <Settings className="w-4 h-4 text-slate-500" />;
      default: return <Shield className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D62828] to-red-700 text-white flex items-center justify-center font-bold shadow-md">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base tracking-tight">{targetUser.name}</h3>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  targetUser.role === 'ADMIN' ? 'bg-red-950 text-red-300 border-red-800' :
                  targetUser.role === 'BILLING_STAFF' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                  'bg-blue-950 text-blue-300 border-blue-800'
                }`}>
                  {targetUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Login ID: <strong>{targetUser.username}</strong> • {targetUser.designation || 'Staff Account'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-slate-800 p-1 rounded-xl flex items-center space-x-1 border border-slate-700">
              <button
                onClick={() => setViewMode('EDITOR')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'EDITOR' ? 'bg-[#D62828] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setViewMode('SUMMARY')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'SUMMARY' ? 'bg-[#D62828] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Effective Matrix
              </button>
              <button
                onClick={() => setViewMode('HISTORY')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                  viewMode === 'HISTORY' ? 'bg-[#D62828] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>History</span>
              </button>
            </div>

            <button
              onClick={handleResetToDefaults}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 border border-slate-700"
              title="Reset all permission toggles back to role defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Safety Banner */}
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/80 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* View Mode 1: PERMISSION EDITOR (Toggles by Category) */}
        {viewMode === 'EDITOR' && (
          <>
            {/* Category Filter Tabs */}
            <div className="bg-slate-100 dark:bg-zinc-800/60 p-2 border-b border-slate-200 dark:border-zinc-800 flex items-center space-x-1 overflow-x-auto shrink-0 scrollbar-none">
              <button
                onClick={() => setActiveTabCategory('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTabCategory === 'ALL'
                    ? 'bg-[#D62828] text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-200'
                }`}
              >
                All 14 Categories
              </button>
              {PERMISSION_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTabCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-1.5 ${
                    activeTabCategory === cat.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {getCategoryIcon(cat.iconName)}
                  <span>{cat.title.split('.')[1]?.trim() || cat.title}</span>
                </button>
              ))}
            </div>

            {/* Scrollable Categories List */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-zinc-900/50">
              {PERMISSION_CATEGORIES.filter(cat => activeTabCategory === 'ALL' || activeTabCategory === cat.id).map(cat => (
                <div key={cat.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800">
                        {getCategoryIcon(cat.iconName)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                          {cat.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                          {cat.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400">
                      {cat.permissions.filter(p => localPermissions[p.key]).length} / {cat.permissions.length} Enabled
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {cat.permissions.map(perm => {
                      const isEnabled = !!localPermissions[perm.key];
                      const isRoleDefault = roleDefaults[perm.key] ?? false;
                      const isOverridden = isEnabled !== isRoleDefault;

                      return (
                        <div
                          key={perm.key}
                          onClick={() => handleToggle(perm.key)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between space-x-3 ${
                            isEnabled
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 shadow-2xs'
                              : 'bg-slate-50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-800 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {perm.label}
                              </span>
                              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded ${
                                isEnabled
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                  : 'bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}>
                                {isEnabled ? '✓ Allowed' : '✕ Denied'}
                              </span>
                              {isOverridden && (
                                <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-amber-500 text-slate-950 shadow-2xs">
                                  OVERRIDDEN
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-normal">
                              {perm.description}
                            </p>
                            <span className="text-[9px] text-slate-400 font-mono block">
                              Role Default: {isRoleDefault ? 'Allowed' : 'Denied'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleToggle(perm.key);
                            }}
                            className={`w-10 h-5 rounded-full transition-colors relative shrink-0 mt-0.5 ${
                              isEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-zinc-700'
                            }`}
                          >
                            <span
                              className={`block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                                isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* View Mode 2: EFFECTIVE PERMISSIONS SUMMARY */}
        {viewMode === 'SUMMARY' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50 dark:bg-zinc-900/50">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                <span>Calculated Effective Permissions</span>
                <span className="text-xs font-normal text-slate-400">Calculated as Role Defaults + User Overrides</span>
              </h4>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold uppercase text-[10px]">
                    <th className="p-2.5">Feature / Operation</th>
                    <th className="p-2.5 text-center">Effective State</th>
                    <th className="p-2.5 text-center">Role Default</th>
                    <th className="p-2.5 text-center">Permission Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                  {PERMISSION_CATEGORIES.flatMap(cat => cat.permissions).map(perm => {
                    const detail = getEffectivePermissionDetails(
                      { ...targetUser, permissions: localPermissions }, 
                      perm.key
                    );
                    return (
                      <tr key={perm.key} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                        <td className="p-2.5 text-slate-800 dark:text-zinc-200 font-semibold">{perm.label}</td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            detail.effective ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {detail.effective ? '✓ ALLOWED' : '✕ DENIED'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center text-slate-500 font-mono">
                          {detail.roleDefault ? 'Allowed' : 'Denied'}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            detail.isOverridden ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {detail.isOverridden ? '⚡ USER OVERRIDE' : 'ROLE DEFAULT'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View Mode 3: RECENT PERMISSION CHANGE HISTORY TIMELINE */}
        {viewMode === 'HISTORY' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50 dark:bg-zinc-900/50">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D62828]" />
                <span>Permission Audit & Change History Timeline</span>
              </h4>

              {(!targetUser.permissionHistory || targetUser.permissionHistory.length === 0) ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No previous permission modification logs recorded for this account.
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-zinc-800 pl-6">
                  {targetUser.permissionHistory.map((item, idx) => (
                    <div key={item.id || idx} className="relative bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs space-y-1">
                      <span className="absolute -left-6 top-4 w-2.5 h-2.5 rounded-full bg-[#D62828]" />
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 dark:text-white">{item.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px]">
                        <span className="text-red-500 font-bold">{item.oldState}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-emerald-500 font-bold">{item.newState}</span>
                        <span className="text-slate-400 font-mono">• Changed by: {item.changedBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Bottom Save Action Bar */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-t border-slate-800 shrink-0">
          <div className="text-xs text-slate-400 hidden sm:block">
            Modifications persist immediately to persistent storage and live sessions.
          </div>

          <div className="flex items-center space-x-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
            >
              Cancel
            </button>

            <button
              onClick={handleSaveSubmit}
              className="px-6 py-2 bg-gradient-to-r from-[#D62828] to-red-700 hover:from-red-700 hover:to-red-800 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-900/30 flex items-center space-x-2 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>SAVE CHANGES</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
