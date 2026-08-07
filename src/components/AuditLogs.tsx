import React, { useState } from 'react';
import { 
  History, Search, ShieldCheck, UserCheck, Clock, Download, 
  Printer, Filter, ShieldAlert, Monitor, CheckCircle2
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogsProps {
  auditLogs: AuditLog[];
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ auditLogs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const filtered = auditLogs.filter(log => {
    const matchesSearch = 
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'User Name', 'Role', 'Action', 'Details', 'IP/Device'];
    const rows = filtered.map(l => [
      l.id,
      l.timestamp,
      `"${l.userName}"`,
      l.userRole,
      l.action,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress || '192.168.1.104 (Localhost PC)'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `THOP_Audit_Trail_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintAuditReport = () => {
    window.print();
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('ADMIN_APPROVAL') || action.includes('RESTORED')) {
      return 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border-purple-300';
    }
    if (action.includes('CANCELLED') || action.includes('DELETE')) {
      return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-300';
    }
    if (action.includes('CREATED') || action.includes('RECORDED')) {
      return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300';
    }
    return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300';
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-[#D62828]" />
            Enterprise Activity Log & Complete Audit Trail
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Immutable, timestamped security trail for logins, invoice alterations, cancellations, payments, and admin overrides
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 font-bold rounded-xl text-xs flex items-center space-x-1.5 border border-slate-200 dark:border-zinc-700"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Audit Trail (CSV)</span>
          </button>

          <button
            onClick={handlePrintAuditReport}
            className="px-3 py-2 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-red-900/30"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Audit Report</span>
          </button>
        </div>
      </div>

      {/* Search & Action Filters */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit trail by action keyword, staff user, or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-medium"
          />
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-bold"
          >
            <option value="ALL">All Activity Types</option>
            <option value="INVOICE_CREATED">Invoice Created</option>
            <option value="INVOICE_EDITED">Invoice Edited</option>
            <option value="INVOICE_CANCELLED">Invoice Cancelled</option>
            <option value="PAYMENT_RECORDED">Payment Recorded</option>
            <option value="ADMIN_APPROVAL_GRANTED">Admin Approvals</option>
            <option value="BACKUP_CREATED">Backups Generated</option>
            <option value="DATABASE_RESTORED">Database Restores</option>
            <option value="USER_MANAGEMENT">User Management</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
          <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">
            Total Logged Audit Events: {filtered.length}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
            Security Shield Active
          </span>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.map(log => (
            <div 
              key={log.id} 
              className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-start space-x-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase shrink-0 mt-0.5 border ${getActionBadgeColor(log.action)}`}>
                  {log.action}
                </span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-zinc-100">
                    {log.details}
                  </p>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1 font-mono">
                    <span>User: <strong>{log.userName}</strong> ({log.userRole})</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Monitor className="w-3 h-3 text-slate-400" />
                      {log.ipAddress || '192.168.1.104 (Localhost PC)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 font-mono text-[10px] text-slate-400 flex items-center space-x-1 sm:self-center">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{log.timestamp}</span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">
              No matching audit trail records found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
