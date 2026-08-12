import React from 'react';
import { Printer, Share2, X, QrCode, ArrowLeft, Download } from 'lucide-react';
import { Invoice, CompanySettings, formatINR, UserRole, User } from '../types';
import { hasPermission } from '../lib/permissions';

interface InvoicePrintPreviewProps {
  invoice: Invoice;
  settings: CompanySettings;
  userRole: UserRole;
  currentUser?: User | null;
  onClose: () => void;
  onShareWhatsApp?: () => void;
  autoDownloadPDF?: boolean;
}

export const InvoicePrintPreview: React.FC<InvoicePrintPreviewProps> = ({
  invoice,
  settings,
  userRole,
  currentUser,
  onClose,
  onShareWhatsApp,
  autoDownloadPDF
}) => {
  const isAdmin = userRole === 'ADMIN';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const origTitle = document.title;
    // Sanitize customer name and invoice number for filename (e.g. THOP_Invoice_Dilnavaz_HOP-26-27-000001.pdf)
    const custRaw = invoice.customerName 
      ? invoice.customerName.trim().replace(/\s+/g, '_').replace(/[\/\\:\*\?"<>\|]/g, '') 
      : '';
    const invRaw = (invoice.invoiceNumber || '001').trim().replace(/[\/\\:\*\?"<>\|]/g, '-');
    const filename = custRaw ? `THOP_Invoice_${custRaw}_${invRaw}` : `THOP_Invoice_${invRaw}`;
    
    document.title = filename;
    window.print();
    setTimeout(() => {
      document.title = origTitle;
    }, 1000);
  };

  React.useEffect(() => {
    if (autoDownloadPDF) {
      const timer = setTimeout(() => {
        handleDownloadPDF();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoDownloadPDF]);

  const canShareWhatsApp = hasPermission(currentUser, 'invoices_whatsapp');

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

          {/* Action Buttons in exact recommended order: [Back to App] -> [Print Invoice] -> [Download PDF] -> [Share via WhatsApp] */}
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

        {/* Invoice Document Body (Print Target Area) */}
        <div className="invoice-print-area print-container p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-slate-900 font-sans text-xs select-text">
          {/* Header & Company Details */}
          <div className="flex flex-col sm:flex-row items-start justify-between pb-6 border-b-2 border-slate-900 gap-4">
            <div>
              <div className="flex items-center space-x-3">
                {settings.logoPath ? (
                  <img
                    src={settings.logoPath}
                    alt={settings.companyName}
                    className="h-15 sm:h-16 w-auto max-w-[150px] object-contain shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-[#D62828] text-white flex items-center justify-center font-extrabold text-lg font-mono shrink-0 shadow-sm">
                    HOP
                  </div>
                )}
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
                    {settings.companyName}
                  </h1>
                  <p className="text-[11px] text-red-700 font-bold">{settings.tagline}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-2 leading-snug">
                {settings.address}, {settings.cityStateZip}<br />
                Phone: {settings.phone} | Email: {settings.email}<br />
                Website: <a href="https://www.wisdomcentre.co.in/" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline font-semibold">https://www.wisdomcentre.co.in/</a><br />
                <strong>GSTIN: {settings.gstin}</strong> | State Code: {settings.stateCode}
              </p>
            </div>

            <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
              <span className="inline-block px-3 py-1 bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded">
                TAX INVOICE
              </span>
              <table className="mt-2 text-[11px] text-left border-collapse sm:ml-auto">
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

          {/* Customer & Pet Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Billed To (Customer):
              </p>
              <p className="font-bold text-sm text-slate-900">{invoice.customerName}</p>
              <p className="text-slate-600">{invoice.customerAddress}</p>
              <p className="text-slate-600">Phone: {invoice.customerPhone}</p>
              <p className="text-slate-700 font-medium mt-1">
                GSTIN: <strong>{invoice.customerGSTIN || 'Unregistered / Retail Client'}</strong>
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Pet Boarding & Care Ref:
              </p>
              {invoice.petName ? (
                <div>
                  <p className="font-bold text-slate-900 text-xs">Pet Name: {invoice.petName}</p>
                  <p className="text-slate-600">Services rendered at The House of Pawz</p>
                </div>
              ) : (
                <p className="text-slate-500 italic">General Pet Care / Product Purchase</p>
              )}
              <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Payment Mode:</span>
                <span className="font-bold text-slate-900">{invoice.paymentMode}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg mb-4">
            <table className="w-full min-w-[620px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase tracking-wider font-bold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
                  <th className="p-2 border-r border-slate-300">Item Description</th>
                  <th className="p-2 border-r border-slate-300 text-center">HSN/SAC</th>
                  <th className="p-2 border-r border-slate-300 text-right">Rate</th>
                  <th className="p-2 border-r border-slate-300 text-center">Qty</th>
                  <th className="p-2 border-r border-slate-300 text-right">Taxable (₹)</th>
                  <th className="p-2 border-r border-slate-300 text-right">GST %</th>
                  <th className="p-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={item.id || idx} className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-200 font-medium">
                      {item.name}
                      {item.discount > 0 && (
                        <span className="block text-[9px] text-emerald-600 font-normal">
                          ({item.discount}% Disc Applied)
                        </span>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono">{item.hsnSac}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono">{item.price.toFixed(2)}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono">{item.qty}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono">{item.taxableValue.toFixed(2)}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono">{item.gstRate}%</td>
                    <td className="p-2 text-right font-mono font-bold">{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown & Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Left Column: Bank Details & UPI QR */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Bank & UPI Payment Gateway
              </p>
              <div className="flex items-start space-x-3 text-[10px] text-slate-700">
                <div className="p-1 bg-white border rounded shrink-0 text-center">
                  <QrCode className="w-12 h-12 text-slate-900 mx-auto" />
                  <span className="text-[8px] font-bold text-red-700">SCAN TO PAY</span>
                </div>
                <div className="leading-tight space-y-0.5">
                  <p><strong>A/C Name:</strong> {settings.accountName || settings.companyName}</p>
                  <p><strong>Bank:</strong> {settings.bankName}</p>
                  <p><strong>Account No:</strong> {settings.accountNo}</p>
                  <p><strong>IFSC Code:</strong> {settings.ifscCode}</p>
                  <p><strong>Branch:</strong> {settings.branch}</p>
                  <p className="text-red-700 font-bold mt-1">UPI ID: {settings.upiId}</p>
                </div>
              </div>
            </div>

            {/* Right Column: Financial Summary Table */}
            <table className="w-full text-[11px] border-collapse">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-1 font-semibold text-slate-600">Sub Total:</td>
                  <td className="py-1 text-right font-mono font-bold">{formatINR(invoice.subTotal)}</td>
                </tr>
                {invoice.totalDiscount > 0 && (
                  <tr className="border-b border-slate-200 text-emerald-700">
                    <td className="py-1 font-semibold">Total Discount:</td>
                    <td className="py-1 text-right font-mono font-bold">- {formatINR(invoice.totalDiscount)}</td>
                  </tr>
                )}
                <tr className="border-b border-slate-200">
                  <td className="py-1 font-semibold text-slate-600">Taxable Value:</td>
                  <td className="py-1 text-right font-mono font-bold">{formatINR(invoice.taxableAmount)}</td>
                </tr>
                {!invoice.isInterState ? (
                  <>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 text-slate-600">CGST (9%):</td>
                      <td className="py-1 text-right font-mono">{formatINR(invoice.cgstTotal)}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 text-slate-600">SGST (9%):</td>
                      <td className="py-1 text-right font-mono">{formatINR(invoice.sgstTotal)}</td>
                    </tr>
                  </>
                ) : (
                  <tr className="border-b border-slate-200">
                    <td className="py-1 text-slate-600">IGST (18%):</td>
                    <td className="py-1 text-right font-mono">{formatINR(invoice.igstTotal)}</td>
                  </tr>
                )}
                {invoice.roundOff !== 0 && (
                  <tr className="border-b border-slate-200 text-slate-500">
                    <td className="py-1">Round Off:</td>
                    <td className="py-1 text-right font-mono">{invoice.roundOff.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="border-b-2 border-slate-900 text-sm font-bold bg-slate-100">
                  <td className="p-1.5 text-slate-900">Grand Total:</td>
                  <td className="p-1.5 text-right font-mono text-[#D62828]">{formatINR(invoice.grandTotal)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-emerald-700 font-semibold">Paid Amount:</td>
                  <td className="py-1 text-right font-mono font-bold text-emerald-700">{formatINR(invoice.paidAmount)}</td>
                </tr>
                {invoice.balanceDue > 0 && (
                  <tr className="text-red-700 font-bold bg-red-50">
                    <td className="p-1">Balance Due:</td>
                    <td className="p-1 text-right font-mono">{formatINR(invoice.balanceDue)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Terms & Authorization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-300 pt-4 text-[10px] text-slate-600">
            <div>
              <p className="font-bold text-slate-800 uppercase mb-1">Terms & Conditions:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                {settings.terms.map((term, i) => (
                  <li key={i}>{term}</li>
                ))}
              </ol>
            </div>

            <div className="text-left sm:text-right flex flex-col justify-between items-start sm:items-end min-h-[100px] pt-2 sm:pt-0">
              <p className="font-bold text-slate-900 uppercase">For {settings.companyName}</p>
              <div className="flex flex-col items-center sm:items-end">
                {settings.signaturePath ? (
                  <img
                    src={settings.signaturePath}
                    alt="Authorized Signature"
                    className="h-14 max-w-[180px] object-contain mb-1"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="h-10" />
                )}
                <p className="border-t border-slate-400 pt-1 font-bold text-slate-900 inline-block w-48 text-center text-[10px]">
                  Authorized Signatory
                </p>
              </div>
            </div>
          </div>
        </div>

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
    </div>
  );
};

