import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Share2, X, QrCode, ArrowLeft, Download } from 'lucide-react';
import { Invoice, CompanySettings, formatINR, UserRole, User, Payment } from '../types';
import { hasPermission } from '../lib/permissions';

interface InvoicePrintPreviewProps {
  invoice: Invoice;
  payments?: Payment[];
  settings: CompanySettings;
  userRole: UserRole;
  currentUser?: User | null;
  onClose: () => void;
  onShareWhatsApp?: () => void;
  autoDownloadPDF?: boolean;
}

export const InvoicePrintPreview: React.FC<InvoicePrintPreviewProps> = ({
  invoice,
  payments = [],
  settings,
  userRole,
  currentUser,
  onClose,
  onShareWhatsApp,
  autoDownloadPDF
}) => {
  const isAdmin = userRole === 'ADMIN';

  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let el = document.getElementById('global-print-portal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-print-portal';
      document.body.appendChild(el);
    }
    setPortalContainer(el);
  }, []);

  // Filter and sort payment entries for this invoice chronologically (payment_date ASC, created_at ASC)
  const invoicePayments = useMemo(() => {
    if (!payments || payments.length === 0) return [];
    
    const matched = payments.filter(p => 
      (p.invoiceId && (p.invoiceId === invoice.id || p.invoiceId === (invoice as any).internalInvoiceId || p.invoiceId === (invoice as any).internal_invoice_id)) ||
      (p.invoiceNumber && p.invoiceNumber === invoice.invoiceNumber)
    );

    return [...matched].sort((a, b) => {
      const parseDate = (dStr?: string) => {
        if (!dStr) return 0;
        if (dStr.includes('/')) {
          const parts = dStr.split('/');
          if (parts.length === 3) {
            return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
          }
        }
        const clean = dStr.replace(/(\d+)(st|nd|rd|th)/i, '$1');
        const parsed = new Date(clean).getTime();
        if (!isNaN(parsed) && parsed > 0) return parsed;
        return new Date(dStr).getTime() || 0;
      };
      const tA = parseDate(a.paymentDate);
      const tB = parseDate(b.paymentDate);
      if (tA !== tB) return tA - tB;
      
      const cA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (cA !== cB) return cA - cB;

      return (a.id || '').localeCompare(b.id || '');
    });
  }, [payments, invoice]);

  const overpaidAmount = invoice.paidAmount > invoice.grandTotal ? invoice.paidAmount - invoice.grandTotal : 0;

  const handlePrint = async () => {
    if (portalContainer) {
      const images = Array.from(portalContainer.querySelectorAll('img')) as HTMLImageElement[];
      await Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(res => {
            img.onload = res;
            img.onerror = res;
          });
        })
      );
    }
    window.print();
  };

  const handleDownloadPDF = async () => {
    const origTitle = document.title;
    const custRaw = invoice.customerName 
      ? invoice.customerName.trim().replace(/\s+/g, '_').replace(/[\/\\:\*\?"<>\|]/g, '') 
      : '';
    const invRaw = (invoice.invoiceNumber || '001').trim().replace(/[\/\\:\*\?"<>\|]/g, '-');
    const filename = custRaw ? `THOP_Invoice_${custRaw}_${invRaw}` : `THOP_Invoice_${invRaw}`;
    
    document.title = filename;
    
    if (portalContainer) {
      const images = Array.from(portalContainer.querySelectorAll('img')) as HTMLImageElement[];
      await Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(res => {
            img.onload = res;
            img.onerror = res;
          });
        })
      );
    }

    window.print();

    setTimeout(() => {
      document.title = origTitle;
    }, 1000);
  };

  useEffect(() => {
    if (autoDownloadPDF) {
      const timer = setTimeout(() => {
        handleDownloadPDF();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoDownloadPDF]);

  const canShareWhatsApp = hasPermission(currentUser, 'invoices_whatsapp');

  // Shared pure document renderer for screen preview and print portal
  const renderInvoiceDocument = (isScreenPreview: boolean) => (
    <div className={isScreenPreview ? 'invoice-print-area print-container p-4 sm:p-6 overflow-y-auto flex-1 bg-white text-slate-900 font-sans text-xs select-text' : 'invoice-print-page'}>
      {/* 1. Header & Company Details */}
      <div className="flex flex-col sm:flex-row items-start justify-between pb-3 border-b-2 border-slate-900 gap-3">
        <div>
          <div className="flex items-center space-x-3">
            {settings.logoPath ? (
              <img
                src={settings.logoPath}
                alt={settings.companyName}
                className="h-12 sm:h-14 w-auto max-w-[130px] object-contain shrink-0"
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[#D62828] text-white flex items-center justify-center font-extrabold text-base font-mono shrink-0 shadow-xs">
                HOP
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase leading-tight">
                {settings.companyName}
              </h1>
              <p className="text-[10px] text-red-700 font-bold">{settings.tagline}</p>
            </div>
          </div>
          <p className="text-[9.5px] text-slate-600 mt-1 leading-snug">
            {settings.address}, {settings.cityStateZip}<br />
            Phone: {settings.phone} | Email: {settings.email}<br />
            Website: <span className="text-blue-700 font-semibold">https://www.wisdomcentre.co.in/</span><br />
            <strong>GSTIN: {settings.gstin}</strong> | State Code: {settings.stateCode}
          </p>
        </div>

        <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 pt-1 sm:pt-0 border-slate-200">
          <span className="inline-block px-2.5 py-0.5 bg-red-700 text-white font-black text-[10px] uppercase tracking-widest rounded">
            TAX INVOICE
          </span>
          <table className="mt-1.5 text-[10px] text-left border-collapse sm:ml-auto">
            <tbody>
              <tr>
                <td className="font-bold pr-2 text-slate-600">Invoice No:</td>
                <td className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td className="font-bold pr-2 text-slate-600">Date:</td>
                <td className="font-mono">{invoice.invoiceDate}</td>
              </tr>
              <tr>
                <td className="font-bold pr-2 text-slate-600">Due Date:</td>
                <td className="font-mono">{invoice.dueDate}</td>
              </tr>
              <tr>
                <td className="font-bold pr-2 text-slate-600">Place of Supply:</td>
                <td className="font-medium">{invoice.placeOfSupply}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Customer & Pet Details (Single Payment Mode Removed from top) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 my-2 text-[10px]">
        <div>
          <p className="font-bold text-slate-400 uppercase tracking-wider text-[8.5px] mb-0.5">
            Billed To (Customer):
          </p>
          <p className="font-bold text-xs text-slate-900">{invoice.customerName}</p>
          <p className="text-slate-600 leading-tight">{invoice.customerAddress}</p>
          <p className="text-slate-600">Phone: {invoice.customerPhone}</p>
          <p className="text-slate-700 font-medium mt-0.5">
            GSTIN: <strong>{invoice.customerGSTIN || 'Unregistered / Retail Client'}</strong>
          </p>
        </div>

        <div>
          <p className="font-bold text-slate-400 uppercase tracking-wider text-[8.5px] mb-0.5">
            Pet Boarding & Care Reference:
          </p>
          {invoice.petName ? (
            <div>
              <p className="font-bold text-slate-900 text-xs">Pet Name: {invoice.petName}</p>
              <p className="text-slate-600 leading-tight">Services rendered at The House of Pawz</p>
            </div>
          ) : (
            <p className="text-slate-500 italic">General Pet Care / Product Purchase</p>
          )}
          {invoice.notes && (
            <p className="text-[9px] text-slate-500 mt-1 italic leading-tight">
              <strong>Notes:</strong> {invoice.notes}
            </p>
          )}
        </div>
      </div>

      {/* 3. Line Items Table */}
      <div className="border border-slate-300 rounded-lg overflow-hidden my-2">
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-300 text-[8.5px]">
              <th className="p-1.5 border-r border-slate-300 text-center w-6">#</th>
              <th className="p-1.5 border-r border-slate-300">Item Description</th>
              <th className="p-1.5 border-r border-slate-300 text-center">HSN/SAC</th>
              <th className="p-1.5 border-r border-slate-300 text-right">Rate (₹)</th>
              <th className="p-1.5 border-r border-slate-300 text-center">Qty</th>
              <th className="p-1.5 border-r border-slate-300 text-right">Taxable (₹)</th>
              <th className="p-1.5 border-r border-slate-300 text-right">GST %</th>
              <th className="p-1.5 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={item.id || idx} className="border-b border-slate-200 last:border-b-0">
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                <td className="p-1.5 border-r border-slate-200 font-medium">
                  <div>{item.name}</div>
                  {item.serviceStartDate && item.serviceEndDate && (
                    <div className="text-[9px] text-slate-600 font-normal leading-tight">
                      <strong>Service Period:</strong> {item.serviceStartDate} to {item.serviceEndDate}
                      {item.duration ? ` (${item.duration} ${item.unit || 'Nights'})` : ''}
                    </div>
                  )}
                  {!item.serviceStartDate && item.serviceDate && (
                    <div className="text-[9px] text-slate-600 font-normal leading-tight">
                      <strong>Service Date:</strong> {item.serviceDate}
                    </div>
                  )}
                  {item.discount > 0 && (
                    <span className="block text-[8.5px] text-emerald-600">
                      ({item.discount}% Disc Applied)
                    </span>
                  )}
                </td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">{item.hsnSac}</td>
                <td className="p-1.5 border-r border-slate-200 text-right font-mono">{item.price.toFixed(2)}</td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">{item.qty}</td>
                <td className="p-1.5 border-r border-slate-200 text-right font-mono">{item.taxableValue.toFixed(2)}</td>
                <td className="p-1.5 border-r border-slate-200 text-right font-mono">{item.gstRate}%</td>
                <td className="p-1.5 text-right font-mono font-bold">{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Payment History Section */}
      <div className="border border-slate-300 rounded-lg overflow-hidden my-2">
        <div className="bg-slate-100 px-2.5 py-1 border-b border-slate-300 flex items-center justify-between">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[9px]">
            💳 PAYMENT HISTORY
          </span>
          <span className="text-[8.5px] font-mono text-slate-500 font-semibold">
            {invoicePayments.length > 0
              ? (invoicePayments.length === 1 ? '1 entry' : `${invoicePayments.length} entries`)
              : (invoice.paidAmount > 0 ? '1 entry' : '0 entries')}
          </span>
        </div>
        
        {invoicePayments.length > 0 ? (
          <table className="w-full text-left border-collapse text-[9.5px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200 text-[8.5px]">
                <th className="py-1 px-2 border-r border-slate-200">Date</th>
                <th className="py-1 px-2 border-r border-slate-200">Payment Mode</th>
                <th className="py-1 px-2 border-r border-slate-200">Reference / Notes</th>
                <th className="py-1 px-2 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {invoicePayments.map((p, pIdx) => (
                <tr key={p.id || pIdx} className="border-b border-slate-100 last:border-b-0">
                  <td className="py-1 px-2 border-r border-slate-100 font-mono font-bold text-slate-900">
                    {p.paymentDate || invoice.invoiceDate}
                  </td>
                  <td className="py-1 px-2 border-r border-slate-100 font-medium text-slate-800">
                    {p.paymentMode || 'UPI'}
                  </td>
                  <td className="py-1 px-2 border-r border-slate-100 text-slate-600">
                    {p.transactionRef ? (
                      <span className="font-mono text-slate-800 font-semibold">{p.transactionRef}</span>
                    ) : p.notes ? (
                      <span>{p.notes}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">
                    {formatINR(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : invoice.paidAmount > 0 ? (
          <table className="w-full text-left border-collapse text-[9.5px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200 text-[8.5px]">
                <th className="py-1 px-2 border-r border-slate-200">Date</th>
                <th className="py-1 px-2 border-r border-slate-200">Payment Mode</th>
                <th className="py-1 px-2 border-r border-slate-200">Reference / Notes</th>
                <th className="py-1 px-2 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1 px-2 border-r border-slate-100 font-mono font-bold text-slate-900">
                  {invoice.invoiceDate}
                </td>
                <td className="py-1 px-2 border-r border-slate-100 font-medium text-slate-800">
                  {invoice.paymentMode || 'UPI'}
                </td>
                <td className="py-1 px-2 border-r border-slate-100 text-slate-600">
                  <span className="text-slate-400">—</span>
                </td>
                <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">
                  {formatINR(invoice.paidAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className="py-1.5 px-3 text-center text-[9px] text-slate-500 italic">
            No payments recorded (Invoice marked as UNPAID).
          </div>
        )}
      </div>

      {/* 5. Bank Gateway & Financial Summary (Flowing naturally without gap) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2 text-[10px]">
        {/* Left Column: Bank Details & UPI QR */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
          <p className="font-bold text-slate-800 text-[9.5px] uppercase tracking-wider">
            Bank & UPI Payment Gateway
          </p>
          <div className="flex items-start space-x-2.5 text-[9.5px] text-slate-700">
            <div className="p-1 bg-white border rounded shrink-0 text-center shadow-2xs">
              <QrCode className="w-10 h-10 text-slate-900 mx-auto" />
              <span className="text-[7.5px] font-bold text-red-700 block mt-0.5">SCAN TO PAY</span>
            </div>
            <div className="leading-tight space-y-0.5">
              <p><strong>A/C Name:</strong> {settings.accountName || settings.companyName}</p>
              <p><strong>Bank:</strong> {settings.bankName}</p>
              <p><strong>Account No:</strong> {settings.accountNo}</p>
              <p><strong>IFSC Code:</strong> {settings.ifscCode}</p>
              <p><strong>Branch:</strong> {settings.branch}</p>
              <p className="text-red-700 font-bold mt-0.5">UPI ID: {settings.upiId}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Summary */}
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-0.5 font-semibold text-slate-600">Sub Total:</td>
              <td className="py-0.5 text-right font-mono font-bold">{formatINR(invoice.subTotal)}</td>
            </tr>
            {invoice.totalDiscount > 0 && (
              <tr className="border-b border-slate-200 text-emerald-700">
                <td className="py-0.5 font-semibold">Total Discount:</td>
                <td className="py-0.5 text-right font-mono font-bold">- {formatINR(invoice.totalDiscount)}</td>
              </tr>
            )}
            <tr className="border-b border-slate-200">
              <td className="py-0.5 font-semibold text-slate-600">Taxable Value:</td>
              <td className="py-0.5 text-right font-mono font-bold">{formatINR(invoice.taxableAmount)}</td>
            </tr>
            {!invoice.isInterState ? (
              <>
                <tr className="border-b border-slate-200">
                  <td className="py-0.5 text-slate-600">CGST (9%):</td>
                  <td className="py-0.5 text-right font-mono">{formatINR(invoice.cgstTotal)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-0.5 text-slate-600">SGST (9%):</td>
                  <td className="py-0.5 text-right font-mono">{formatINR(invoice.sgstTotal)}</td>
                </tr>
              </>
            ) : (
              <tr className="border-b border-slate-200">
                <td className="py-0.5 text-slate-600">IGST (18%):</td>
                <td className="py-0.5 text-right font-mono">{formatINR(invoice.igstTotal)}</td>
              </tr>
            )}
            {invoice.roundOff !== 0 && (
              <tr className="border-b border-slate-200 text-slate-500">
                <td className="py-0.5">Round Off:</td>
                <td className="py-0.5 text-right font-mono">{invoice.roundOff.toFixed(2)}</td>
              </tr>
            )}
            <tr className="border-b-2 border-slate-900 font-bold bg-slate-100 text-xs">
              <td className="p-1 text-slate-900">Grand Total:</td>
              <td className="p-1 text-right font-mono text-[#D62828]">{formatINR(invoice.grandTotal)}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-emerald-700 font-semibold">Total Paid:</td>
              <td className="py-0.5 text-right font-mono font-bold text-emerald-700">{formatINR(invoice.paidAmount)}</td>
            </tr>
            {invoice.balanceDue > 0 ? (
              <tr className="text-red-700 font-bold bg-red-50">
                <td className="p-0.5">Balance Due:</td>
                <td className="p-0.5 text-right font-mono">{formatINR(invoice.balanceDue)}</td>
              </tr>
            ) : overpaidAmount > 0 ? (
              <tr className="text-blue-700 font-semibold bg-blue-50 text-[9px]">
                <td className="p-0.5">Overpaid / Rounding:</td>
                <td className="p-0.5 text-right font-mono font-bold">+{formatINR(overpaidAmount)}</td>
              </tr>
            ) : (
              <tr className="text-emerald-700 font-bold bg-emerald-50 text-[9px]">
                <td className="p-0.5">Balance Due:</td>
                <td className="p-0.5 text-right font-mono">₹ 0.00 (PAID)</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 6. Terms & Authorization */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-300 pt-2 text-[9px] text-slate-600 mt-2">
        <div>
          <p className="font-bold text-slate-800 uppercase mb-0.5">Terms & Conditions:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            {settings.terms.map((term, i) => (
              <li key={i}>{term}</li>
            ))}
          </ol>
        </div>

        <div className="text-left sm:text-right flex flex-col justify-between items-start sm:items-end min-h-[70px] pt-1 sm:pt-0">
          <p className="font-bold text-slate-900 uppercase">For {settings.companyName}</p>
          <div className="flex flex-col items-center sm:items-end">
            {settings.signaturePath ? (
              <img
                src={settings.signaturePath}
                alt="Authorized Signature"
                className="h-10 max-w-[150px] object-contain mb-0.5"
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
              />
            ) : (
              <div className="h-8" />
            )}
            <p className="border-t border-slate-400 pt-0.5 font-bold text-slate-900 inline-block w-40 text-center text-[9px]">
              Authorized Signatory
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="invoice-print-modal-backdrop fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="invoice-print-modal-content bg-white text-slate-900 rounded-xl sm:rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Modal Top Control Header (Hidden when printing) */}
        <div className="no-print bg-slate-900 text-white p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-800 shrink-0 gap-2 sm:gap-4">
          <div className="flex items-center justify-between sm:justify-start space-x-2">
            <button
              onClick={onClose}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 border border-slate-700 shadow-xs"
              title="Return to Application"
            >
              <ArrowLeft className="w-4 h-4 text-red-400" />
              <span>Back to App</span>
            </button>

            <div className="flex items-center space-x-2 overflow-hidden">
              <span className="font-bold text-xs sm:text-sm truncate">Invoice Preview</span>
              <span className="text-[10px] sm:text-xs bg-red-600 font-mono px-2 py-0.5 rounded text-white font-bold shrink-0">
                {invoice.invoiceNumber}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors sm:hidden"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Buttons: [Print Invoice] -> [Download PDF] -> [Share via WhatsApp] */}
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#D62828] hover:bg-red-700 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shrink-0 shadow-xs"
              title="Print Tax Invoice on A4 paper"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shrink-0 shadow-xs"
              title="Download Tax Invoice as PDF"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            {canShareWhatsApp && onShareWhatsApp && (
              <button
                onClick={onShareWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shrink-0 shadow-xs"
                title="Send invoice details to client on WhatsApp"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share via WhatsApp</span>
                <span className="sm:hidden">WhatsApp</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="hidden sm:flex p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Interactive Screen Preview */}
        {renderInvoiceDocument(true)}

        {/* Mobile Sticky Bottom Bar (no-print) */}
        <div className="no-print sm:hidden bg-slate-900 border-t border-slate-800 p-3 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4 text-red-400" />
            <span>Return to Application</span>
          </button>
          <button
            onClick={handlePrint}
            className="py-2 px-3 bg-[#D62828] hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Standalone Portal for Chrome Print / PDF Engine */}
      {portalContainer && createPortal(
        renderInvoiceDocument(false),
        portalContainer
      )}
    </div>
  );
};
