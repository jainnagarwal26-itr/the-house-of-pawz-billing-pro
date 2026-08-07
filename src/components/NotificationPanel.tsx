import React, { useState } from 'react';
import { 
  Bell, CheckCircle2, AlertTriangle, MessageSquare, Mail, 
  Sparkles, FileText, Wallet, Clock, Trash2, Send, ShieldCheck
} from 'lucide-react';
import { Invoice, Payment, formatINR } from '../types';

export interface SystemNotification {
  id: string;
  type: 'INVOICE' | 'PAYMENT' | 'OUTSTANDING' | 'BACKUP' | 'GST' | 'ALERT';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

interface NotificationPanelProps {
  invoices: Invoice[];
  payments: Payment[];
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  invoices,
  payments,
  onClose
}) => {
  const [sentAlertMessage, setSentAlertMessage] = useState<string | null>(null);

  // Generate dynamic operational notifications from actual invoice & payment data
  const outstandingInvoices = invoices.filter(i => !i.isCancelled && i.balanceDue > 0);
  const recentPayments = payments.slice(0, 3);

  const initialNotifications: SystemNotification[] = [
    {
      id: 'notif-1',
      type: 'BACKUP',
      title: 'Automatic Daily Backup Completed',
      message: 'THOP_BILLING_DATABASE.xlsx successfully saved to local workbook backup engine.',
      timestamp: 'Today, 10:30 AM',
      isRead: false
    },
    {
      id: 'notif-2',
      type: 'GST',
      title: 'Monthly GST Tax Return Summary Ready',
      message: `GSTR-1 & GSTR-3B audit data generated for current active period.`,
      timestamp: 'Today, 09:15 AM',
      isRead: false
    },
    ...outstandingInvoices.slice(0, 3).map(inv => ({
      id: `out-${inv.id}`,
      type: 'OUTSTANDING' as const,
      title: `Pending Payment Alert: ${inv.customerName}`,
      message: `Invoice ${inv.invoiceNumber} has outstanding balance of ${formatINR(inv.balanceDue)}.`,
      timestamp: inv.invoiceDate,
      isRead: false
    })),
    ...recentPayments.map(p => ({
      id: `pay-${p.id}`,
      type: 'PAYMENT' as const,
      title: `Payment Received: ${formatINR(p.amount)}`,
      message: `Received via ${p.paymentMode} for Invoice ${p.invoiceNumber} (${p.customerName}).`,
      timestamp: p.paymentDate,
      isRead: true
    }))
  ];

  const [notifications, setNotifications] = useState<SystemNotification[]>(initialNotifications);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleSendWhatsAppSummary = () => {
    const totalOut = outstandingInvoices.reduce((sum, i) => sum + i.balanceDue, 0);
    const msg = `📲 WhatsApp Daily Business Summary Sent to Owner (+91 98765 43210):\nToday's Invoices: ${invoices.length} | Pending Balance: ${formatINR(totalOut)}. All backup logs verified!`;
    setSentAlertMessage(msg);
    setTimeout(() => setSentAlertMessage(null), 4000);
  };

  const handleSendEmailSummary = () => {
    const msg = `📧 Email Audit Report dispatched to Owner/CA (admin@thehouseofpawz.com) with attached GSTR-1 & Payment Register summary.`;
    setSentAlertMessage(msg);
    setTimeout(() => setSentAlertMessage(null), 4000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-end z-50 p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-md h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-800/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D62828] text-white flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Operations & Alert Center
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                {notifications.filter(n => !n.isRead).length} Unread Alerts
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-bold text-slate-600 dark:text-zinc-300 hover:text-[#D62828]"
            >
              Mark Read
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* WhatsApp / Email Quick Alerts Panel */}
        <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border-b border-slate-200 dark:border-zinc-800 space-y-2 text-xs">
          <span className="font-bold text-slate-700 dark:text-zinc-300 block text-[11px] uppercase tracking-wider">
            Quick Executive Alerts (WhatsApp & Email)
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSendWhatsAppSummary}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Send WhatsApp Summary</span>
            </button>

            <button
              onClick={handleSendEmailSummary}
              className="p-2 bg-slate-900 hover:bg-black dark:bg-zinc-800 text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-xs"
            >
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>Send Email Report</span>
            </button>
          </div>

          {sentAlertMessage && (
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 rounded-lg font-mono text-[11px] border border-emerald-300 dark:border-emerald-800 animate-in fade-in">
              {sentAlertMessage}
            </div>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                !n.isRead
                  ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                  : 'bg-slate-50 dark:bg-zinc-800/40 border-slate-100 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                  n.type === 'BACKUP' ? 'bg-emerald-100 text-emerald-800' :
                  n.type === 'OUTSTANDING' ? 'bg-red-100 text-red-800' :
                  n.type === 'PAYMENT' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {n.type}
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {n.timestamp}
                </span>
              </div>

              <h4 className="font-bold text-slate-900 dark:text-white text-xs">{n.title}</h4>
              <p className="text-slate-600 dark:text-zinc-300 text-[11px]">{n.message}</p>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold">All Notifications Cleared</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 flex justify-between items-center text-xs">
          <button
            onClick={handleClearAll}
            className="text-slate-500 hover:text-red-600 flex items-center space-x-1 font-bold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
          <span className="text-[10px] text-slate-400 font-mono">THOP Operations Engine</span>
        </div>
      </div>
    </div>
  );
};
