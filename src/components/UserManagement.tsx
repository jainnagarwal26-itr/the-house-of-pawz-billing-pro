import React, { useState } from 'react';
import { 
  UserCog, ShieldCheck, UserCheck, Lock, KeyRound,
  CheckCircle2, XCircle, Plus, Shield, RefreshCw, Smartphone, Laptop, Settings
} from 'lucide-react';
import { User, UserRole } from '../types';
import { PermissionEditorModal } from './PermissionEditorModal';
import { hasPermission } from '../lib/permissions';

interface UserManagementProps {
  users: User[];
  activeUser: User;
  onSwitchUserRole: (role: UserRole) => void;
  onAddUser: (user: User) => void;
  onUpdateUser?: (user: User) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  activeUser,
  onSwitchUserRole,
  onAddUser,
  onUpdateUser
}) => {
  const canView = hasPermission(activeUser, 'user_management_view');

  if (!canView) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-[#D62828] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Permission Required</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          User & Access Control Center is restricted to authorized System Administrators.
        </p>
      </div>
    );
  }
  const [showAddModal, setShowAddModal] = useState(false);
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPin, setNewPin] = useState('1234');
  const [resetSuccess, setResetSuccess] = useState('');

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('USER');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      name,
      username,
      role,
      email,
      phone,
      lastLogin: 'Never',
      isActive: true,
      pinCode: '1234'
    };
    onAddUser(newUser);
    setShowAddModal(false);
    setName('');
    setUsername('');
    setEmail('');
    setPhone('');
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetModalUser && onUpdateUser) {
      const updated: User = {
        ...resetModalUser,
        // Password changes must be handled via Supabase Auth, not stored in UI state
        pinCode: newPin || resetModalUser.pinCode || ''
      };
      onUpdateUser(updated);
    }
    setResetSuccess(`Password for ${resetModalUser?.name} successfully updated.`);
    setTimeout(() => {
      setResetSuccess('');
      setResetModalUser(null);
      setNewPassword('');
    }, 1500);
  };

  const permissionsMatrix = [
    { feature: 'Create & Save GST Invoices', admin: true, user: true, staff: true },
    { feature: 'Print & Download Invoice PDFs', admin: true, user: true, staff: true },
    { feature: 'Edit Saved Invoice Data', admin: true, user: true, staff: true },
    { feature: 'Cancel / Delete Invoices', admin: true, user: false, staff: true },
    { feature: 'Change Invoice Sequence Numbers', admin: true, user: false, staff: true },
    { feature: 'Pet Boarding Check-In & Check-Out', admin: true, user: true, staff: true },
    { feature: 'Customer & Pet Master Management', admin: true, user: true, staff: true },
    { feature: 'Record & Manage Customer Payments', admin: true, user: true, staff: true },
    { feature: 'Export CA GST Reports (GSTR-1)', admin: true, user: false, staff: true },
    { feature: 'Excel Database Backup & Export', admin: true, user: false, staff: true },
    { feature: 'Audit Logs & System History', admin: true, user: false, staff: true },
    { feature: 'Company Bank & GST Settings', admin: true, user: false, staff: false },
    { feature: 'User Accounts & Permission Management', admin: true, user: false, staff: false },
  ];

  const getRoleLabel = (r: UserRole) => {
    switch (r) {
      case 'ACCOUNTANT': return 'ACCOUNTANT (Full Control)';
      case 'ADMIN': return 'ADMIN (Limited Admin)';
      case 'BILLING_STAFF': return 'STAFF (Billing Staff)';
      case 'SUPER_ADMIN': return 'Super Admin';
      default: return r;
    }
  };

  const getRoleBadgeColor = (r: UserRole) => {
    switch (r) {
      case 'ACCOUNTANT': return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300';
      case 'ADMIN': return 'bg-red-100 text-[#D62828] border-red-300 dark:bg-red-950 dark:text-red-300';
      case 'USER': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300';
      case 'BILLING_STAFF': return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <UserCog className="w-5 h-5 text-[#D62828]" />
            Enterprise Security & Staff Role Controls
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Role-based Access Control (RBAC) • Super Admin, CA Admin, Store Manager, Reception & Billing Staff
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#D62828] hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-red-900/40"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Staff Account</span>
        </button>
      </div>

      {/* Active User Session Banner */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">Active Operational Session: <span className="text-amber-400">{activeUser.name}</span></p>
            <p className="text-[11px] text-slate-400 font-mono">Role: {getRoleLabel(activeUser.role)} • Machine: Windows Desktop PC (192.168.1.104)</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
            Session Security Active
          </span>
        </div>
      </div>

      {/* User Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map(u => (
          <div key={u.id} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' ? 'bg-red-100 dark:bg-red-950 text-[#D62828]' : 'bg-blue-100 dark:bg-blue-950 text-blue-600'
                }`}>
                  {u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' ? <ShieldCheck className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    {u.name}
                    {u.id === activeUser.id && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">CURRENT</span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">@{u.username} • {u.phone}</p>
                  <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded border ${getRoleBadgeColor(u.role)}`}>
                    {getRoleLabel(u.role)}
                  </span>
                </div>
              </div>

              <span className={`w-2.5 h-2.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} title={u.isActive ? 'Active' : 'Inactive'} />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-400 font-mono">Last Login: {u.lastLogin || 'Today, 09:30 AM'}</span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingPermissionsUser(u)}
                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 text-[#D62828] dark:text-red-300 font-bold rounded-lg text-[11px] flex items-center space-x-1 border border-red-200 dark:border-red-900"
                  title="Configure action-level permissions for this user"
                >
                  <UserCog className="w-3 h-3 text-[#D62828]" />
                  <span>Edit Permissions</span>
                </button>

                <button
                  onClick={() => setResetModalUser(u)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-200 font-bold rounded-lg text-[11px] flex items-center space-x-1"
                >
                  <KeyRound className="w-3 h-3 text-slate-500" />
                  <span>Reset Password</span>
                </button>

                <button
                  onClick={() => onSwitchUserRole(u.role)}
                  className="px-3 py-1 bg-slate-900 dark:bg-zinc-800 hover:bg-[#D62828] text-white font-bold rounded-lg text-xs"
                >
                  Switch Session
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Production Role Access Control Matrix */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs overflow-x-auto">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mb-3 flex items-center justify-between">
          <span>Production Role Access Control Matrix</span>
          <span className="text-xs text-slate-400 font-normal">Standard Role Defaults • Custom overrides editable above</span>
        </h3>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-zinc-800">
              <th className="p-2.5">Feature / Operation</th>
              <th className="p-2.5 text-center text-[#D62828]">ADMIN (Chirag Jain)</th>
              <th className="p-2.5 text-center text-blue-600">USER (Poonam Bharti)</th>
              <th className="p-2.5 text-center text-emerald-600">BILLING STAFF (Staff)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
            {permissionsMatrix.map(pm => (
              <tr key={pm.feature} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                <td className="p-2.5 text-slate-800 dark:text-zinc-200">{pm.feature}</td>
                <td className="p-2.5 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="p-2.5 text-center">{pm.user ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <XCircle className="w-4 h-4 text-red-400 mx-auto" />}</td>
                <td className="p-2.5 text-center">{pm.staff ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <XCircle className="w-4 h-4 text-red-400 mx-auto" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset PIN Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-zinc-800">
            <h3 className="text-base font-bold flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#D62828]" />
              <span>Reset Security PIN for {resetModalUser.name}</span>
            </h3>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">New Admin PIN Code (4 Digits) *</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono text-center text-lg font-bold"
                />
              </div>

              {resetSuccess && (
                <p className="p-2 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-center text-xs">
                  {resetSuccess}
                </p>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D62828] text-white font-bold rounded-lg shadow-md"
                >
                  Save Security PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold">Create New Staff Account</h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Assigned Role *</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-bold"
                  >
                    <option value="SUPER_ADMIN">Super Admin (Owner)</option>
                    <option value="ADMIN">Admin / CA</option>
                    <option value="MANAGER">Store Manager</option>
                    <option value="RECEPTION">Front Desk Reception</option>
                    <option value="BILLING_USER">Billing Staff</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D62828] text-white font-bold rounded-lg shadow-md"
                >
                  Save Staff User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permission Editor Modal */}
      {editingPermissionsUser && (
        <PermissionEditorModal
          targetUser={editingPermissionsUser}
          adminUser={activeUser}
          allUsers={users}
          onSave={updatedUser => {
            if (onUpdateUser) {
              onUpdateUser(updatedUser);
            }
            setEditingPermissionsUser(null);
          }}
          onClose={() => setEditingPermissionsUser(null)}
        />
      )}
    </div>
  );
};
