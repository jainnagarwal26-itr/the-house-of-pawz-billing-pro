import React, { useState, useEffect } from 'react';
import { 
  Receipt, Search, PlusCircle, Printer, Share2, 
  Trash2, XCircle, Eye, Lock, Filter, ShieldAlert, FileSpreadsheet, KeyRound, Download,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Invoice, Customer, Pet, CompanySettings, UserRole, formatINR, PaymentStatus, User } from '../types';
import { hasPermission } from '../lib/permissions';
import { InvoicePrintPreview } from './InvoicePrintPreview';
import { BatchInvoicePrintPreview } from './BatchInvoicePrintPreview';
import { AdminApprovalModal } from './AdminApprovalModal';

interface InvoiceManagementProps {
  invoices: Invoice[];
  customers: Customer[];
  pets: Pet[];
  settings: CompanySettings;
  userRole: UserRole;
  userName: string;
  currentUser?: User | null;
  onOpenCreateModal: () => void;
  onOpenEditModal: (invoice: Invoice) => void;
  onCancelInvoice: (invoiceId: string) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
  onExportExcel: () => void;
}

export const InvoiceManagement: React.FC<InvoiceManagementProps> = ({
  invoices,
  customers,
  pets,
  settings,
  userRole,
  userName,
  currentUser,
  onOpenCreateModal,
  onOpenEditModal,
  onCancelInvoice,
  onDeleteInvoice,
  onExportExcel
}) => {
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');

  // Multi-select Batch Invoices State
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [showBatchPrintPreview, setShowBatchPrintPreview] = useState(false);

  // Pagination State (Default: 10 per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Auto-reset to Page 1 on search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Preview Modal
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState<Invoice | null>(null);
  const [isAutoDownloadPDF, setIsAutoDownloadPDF] = useState(false);

  // Admin Approval Request State
  const [approvalRequest, setApprovalRequest] = useState<{
    type: 'EDIT' | 'CANCEL' | 'SHARE';
    invoice: Invoice;
  } | null>(null);

  const handleTriggerAction = (type: 'EDIT' | 'CANCEL' | 'SHARE', inv: Invoice) => {
    // WhatsApp sharing is accessible directly for ALL roles (Admin, User, Staff)
    if (type === 'SHARE') {
      const message = encodeURIComponent(
        `Hello ${inv.customerName},\nHere is your Tax Invoice ${inv.invoiceNumber} from The House of Pawz.\nGrand Total: ₹${inv.grandTotal.toFixed(2)}\nPaid: ₹${inv.paidAmount.toFixed(2)}\nBalance: ₹${inv.balanceDue.toFixed(2)}\nThank you for trusting us with ${inv.petName || 'your pet'}!`
      );
      window.open(`https://wa.me/91${inv.customerPhone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
      return;
    }

    if (isAdmin) {
      if (type === 'EDIT') onOpenEditModal(inv);
      if (type === 'CANCEL') {
        if (window.confirm(`Are you sure you want to cancel Invoice ${inv.invoiceNumber}?`)) {
          onCancelInvoice(inv.id);
        }
      }
    } else {
      // Non-admin billing staff -> trigger Admin PIN Approval Modal for edit/cancel
      setApprovalRequest({ type, invoice: inv });
    }
  };

  const handleAdminApproved = (adminNotes: string) => {
    if (!approvalRequest) return;
    const { type, invoice } = approvalRequest;
    setApprovalRequest(null);

    if (type === 'EDIT') {
      onOpenEditModal(invoice);
    } else if (type === 'CANCEL') {
      onCancelInvoice(invoice.id);
    } else if (type === 'SHARE') {
      const message = encodeURIComponent(
        `Hello ${invoice.customerName},\nHere is your Tax Invoice ${invoice.invoiceNumber} from The House of Pawz.\nGrand Total: ₹${invoice.grandTotal.toFixed(2)}\nPaid: ₹${invoice.paidAmount.toFixed(2)}\nBalance: ₹${invoice.balanceDue.toFixed(2)}\nThank you for trusting us with ${invoice.petName || 'your pet'}!`
      );
      window.open(`https://wa.me/91${invoice.customerPhone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
    }
  };

  // Filtered list
  const filteredInvoices = invoices
    .filter(inv => {
      const matchesSearch = 
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerPhone.includes(searchQuery) ||
        (inv.petName && inv.petName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || inv.paymentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Sort by numeric invoice suffix (descending: newest first)
      const numA = parseInt(a.invoiceNumber.split('/').pop() || '0', 10);
      const numB = parseInt(b.invoiceNumber.split('/').pop() || '0', 10);
      return numB - numA;
    });


  // Calculate dynamic pagination
  const totalInvoices = filteredInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalInvoices / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalInvoices);
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Multi-select helpers
  const isAllSelected = paginatedInvoices.length > 0 && paginatedInvoices.every(inv => selectedInvoiceIds.includes(inv.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const paginatedSet = new Set(paginatedInvoices.map(i => i.id));
      setSelectedInvoiceIds(prev => prev.filter(id => !paginatedSet.has(id)));
    } else {
      const paginatedSet = new Set(paginatedInvoices.map(i => i.id));
      setSelectedInvoiceIds(prev => Array.from(new Set([...prev, ...paginatedSet])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedInvoiceIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#D62828]" />
            GST Tax Invoice Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Series: <strong>HOP/26-27/</strong> • Indian GST 18% Compliant • Real-time Payment Status
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isAdmin && (
            <button
              onClick={onExportExcel}
              className="px-3.5 py-2 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 font-semibold rounded-xl text-xs flex items-center space-x-1.5 border border-emerald-700 shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Invoices Excel</span>
            </button>
          )}

          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 bg-[#D62828] hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-red-900/40 transition-transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create GST Invoice</span>
          </button>
        </div>
      </div>

      {/* Floating Batch Selection Banner */}
      {selectedInvoiceIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl border border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="bg-[#D62828] text-white text-xs font-extrabold px-2.5 py-1 rounded-lg font-mono">
              {selectedInvoiceIds.length} Selected
            </span>
            <span className="text-xs text-slate-300 font-semibold">
              Select multiple invoices to download or print together in a single batch PDF.
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setShowBatchPrintPreview(true)}
              className="px-4 py-2 bg-[#D62828] hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download Batch PDF ({selectedInvoiceIds.length})</span>
            </button>

            <button
              onClick={() => setSelectedInvoiceIds([])}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Invoice No, Client Name, Phone or Pet..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-medium focus:ring-2 focus:ring-[#D62828]"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-semibold">Status:</span>
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
            {(['ALL', 'PAID', 'PARTIAL', 'UNPAID', 'CANCELLED'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  statusFilter === st
                    ? 'bg-[#D62828] text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
            <thead>
              <tr className="bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 text-[10px] uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-zinc-800">
                <th className="py-3 px-3 w-[4%] text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-[#D62828] focus:ring-[#D62828] cursor-pointer"
                    title="Select All Invoices on Page"
                  />
                </th>
                <th className="py-3 px-3 w-[18%]">Invoice Details</th>
                <th className="py-3 px-3 w-[16%]">Customer & Pet</th>
                <th className="py-3 px-3 text-right w-[11%]">Taxable (₹)</th>
                <th className="py-3 px-3 text-right w-[10%]">GST (18%)</th>
                <th className="py-3 px-3 text-right w-[14%]">Grand Total</th>
                <th className="py-3 px-3 text-right w-[11%]">Balance Due</th>
                <th className="py-3 px-3 text-center w-[8%]">Status</th>
                <th className="py-3 px-3 text-center w-[12%] min-w-[130px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
              {paginatedInvoices.map(inv => (
                <tr 
                  key={inv.id}
                  className={`hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                    inv.isCancelled ? 'opacity-50 bg-red-50/20 dark:bg-red-950/10' : ''
                  } ${selectedInvoiceIds.includes(inv.id) ? 'bg-red-50/30 dark:bg-red-950/20' : ''}`}
                >
                  {/* Select Checkbox */}
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedInvoiceIds.includes(inv.id)}
                      onChange={() => handleToggleSelectRow(inv.id)}
                      className="rounded border-slate-300 text-[#D62828] focus:ring-[#D62828] cursor-pointer"
                    />
                  </td>
                  {/* Invoice Number & Date */}
                  <td className="p-3">
                    <span className="font-mono font-bold text-slate-900 dark:text-white block">
                      {inv.invoiceNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Date: {inv.invoiceDate}
                    </span>
                    <span className="block text-[9px] text-slate-500 italic mt-0.5">
                      By: {inv.createdByName}
                    </span>
                  </td>

                  {/* Customer & Pet */}
                  <td className="p-3">
                    <span className="font-bold text-slate-800 dark:text-zinc-200 block">
                      {inv.customerName}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      📞 {inv.customerPhone}
                    </span>
                    {inv.petName && (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-[#D62828] bg-red-50 dark:bg-red-950/60 px-1.5 py-0.2 rounded">
                        🐾 {inv.petName}
                      </span>
                    )}
                  </td>

                  {/* Taxable Value */}
                  <td className="p-3 text-right font-mono text-slate-700 dark:text-zinc-300">
                    ₹{inv.taxableAmount.toFixed(2)}
                  </td>

                  {/* GST */}
                  <td className="p-3 text-right font-mono text-slate-500">
                    ₹{inv.totalGst.toFixed(2)}
                  </td>

                  {/* Grand Total */}
                  <td className="p-3 text-right font-mono font-extrabold text-slate-900 dark:text-white text-sm">
                    {formatINR(inv.grandTotal)}
                  </td>

                  {/* Balance Due */}
                  <td className="p-3 text-right font-mono font-bold text-red-600 dark:text-red-400">
                    {inv.balanceDue > 0 ? formatINR(inv.balanceDue) : '₹ 0.00'}
                  </td>

                  {/* Status Badge */}
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold font-mono ${
                      inv.paymentStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : inv.paymentStatus === 'CANCELLED'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : inv.paymentStatus === 'PARTIAL'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400'
                    }`}>
                      {inv.paymentStatus}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {/* View Preview */}
                      {hasPermission(currentUser, 'invoices_view') && (
                        <button
                          onClick={() => {
                            setIsAutoDownloadPDF(false);
                            setSelectedInvoiceForPreview(inv);
                          }}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          title="View Invoice Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      {/* Download PDF */}
                      {hasPermission(currentUser, 'invoices_download_pdf') && (
                        <button
                          onClick={() => {
                            setSelectedInvoiceForPreview(inv);
                            setIsAutoDownloadPDF(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                          title="Download Tax Invoice as PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}

                      {/* WhatsApp Share */}
                      {hasPermission(currentUser, 'invoices_whatsapp') && (
                        <button
                          onClick={() => handleTriggerAction('SHARE', inv)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors"
                          title={isAdmin ? 'Share via WhatsApp' : 'Requires Admin PIN Approval for Staff'}
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Edit Invoice */}
                      {hasPermission(currentUser, 'invoices_edit') && (
                        <button
                          onClick={() => handleTriggerAction('EDIT', inv)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                          title={isAdmin ? 'Edit Invoice' : 'Requires Admin PIN Approval for Staff'}
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      )}

                      {/* Cancel Invoice */}
                      {!inv.isCancelled && hasPermission(currentUser, 'invoices_cancel') && (
                        <button
                          onClick={() => handleTriggerAction('CANCEL', inv)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors"
                          title={isAdmin ? 'Cancel Invoice' : 'Requires Admin PIN Approval for Staff'}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete Invoice */}
                      {onDeleteInvoice && hasPermission(currentUser, 'invoices_delete') && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to permanently delete invoice ${inv.invoiceNumber}? This action cannot be undone.`)) {
                              onDeleteInvoice(inv.id);
                            }
                          }}
                          className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors"
                          title="Permanently Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 italic text-xs">
                    No matching tax invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Responsive Pagination Controls Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-zinc-800/60 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Status Display Text */}
          <div className="text-slate-600 dark:text-zinc-300 font-medium">
            Showing <strong className="text-slate-900 dark:text-white font-mono">{totalInvoices === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of <strong className="text-slate-900 dark:text-white font-mono">{totalInvoices}</strong> invoices
          </div>

          {/* Desktop & Mobile Responsive Pagination Controls */}
          <div className="flex items-center space-x-1.5">
            {/* Previous Button */}
            <button
              disabled={validPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 font-bold bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {/* Desktop Page Numbers */}
            <div className="hidden sm:flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pNum => (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-8 h-8 rounded-xl font-mono text-xs font-bold transition-all ${
                    validPage === pNum
                      ? 'bg-[#D62828] text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {pNum}
                </button>
              ))}
            </div>

            {/* Mobile Compact Page Counter */}
            <div className="sm:hidden text-xs font-mono font-bold px-2 text-slate-600 dark:text-zinc-300">
              Page {validPage} of {totalPages}
            </div>

            {/* Next Button */}
            <button
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 font-bold bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors shadow-2xs"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Admin Approval Modal for Non-Admin Staff */}
      {approvalRequest && (
        <AdminApprovalModal
          title={`Invoice ${approvalRequest.type === 'EDIT' ? 'Modification' : approvalRequest.type === 'CANCEL' ? 'Cancellation' : 'WhatsApp Sharing'}`}
          actionDescription={`Action requested by Billing Staff for Invoice ${approvalRequest.invoice.invoiceNumber} (${approvalRequest.invoice.customerName}). Please enter Admin Security PIN to authorize.`}
          onApprove={handleAdminApproved}
          onCancel={() => setApprovalRequest(null)}
        />
      )}

      {/* Invoice Print Preview Modal */}
      {selectedInvoiceForPreview && (
        <InvoicePrintPreview
          invoice={selectedInvoiceForPreview}
          settings={settings}
          userRole={userRole}
          autoDownloadPDF={isAutoDownloadPDF}
          onClose={() => {
            setSelectedInvoiceForPreview(null);
            setIsAutoDownloadPDF(false);
          }}
          onShareWhatsApp={() => handleTriggerAction('SHARE', selectedInvoiceForPreview)}
        />
      )}

      {/* Batch Multi-Invoice Print Preview Modal */}
      {showBatchPrintPreview && (
        <BatchInvoicePrintPreview
          invoices={filteredInvoices.filter(inv => selectedInvoiceIds.includes(inv.id))}
          settings={settings}
          onClose={() => setShowBatchPrintPreview(false)}
        />
      )}
    </div>
  );
};
