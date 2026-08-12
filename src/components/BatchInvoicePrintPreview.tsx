import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, X } from 'lucide-react';
import { Invoice, CompanySettings, formatINR } from '../types';

interface BatchInvoicePrintPreviewProps {
  invoices: Invoice[];
  settings: CompanySettings;
  onClose: () => void;
}

export const BatchInvoicePrintPreview: React.FC<BatchInvoicePrintPreviewProps> = ({
  invoices,
  settings,
  onClose
}) => {
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

  const handlePrint = async () => {
    const origTitle = document.title;
    document.title = `THOP_Batch_Invoices_${invoices.length}_Selected`;

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

  const renderSingleInvoiceContent = (invoice: Invoice, isScreenPreview = false) => (
    <div className={isScreenPreview ? 'p-6 sm:p-10 border-b-4 border-slate-900 mb-8 bg-white' : 'invoice-print-page'}>
      {/* Header & Company Details */}
      <div>
        <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900 gap-4">
          <div>
            <div className="flex items-center space-x-3">
              {settings.logoPath ? (
                <img
                  src={settings.logoPath}
                  alt={settings.companyName}
                  className="h-14 sm:h-16 w-auto max-w-[150px] object-contain shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-[#D62828] text-white flex items-center justify-center font-extrabold text-lg font-mono shrink-0 shadow-sm">
                  HOP
                </div>
              )}
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase leading-none">
                  {settings.companyName}
                </h1>
                <p className="text-[10px] text-red-700 font-bold mt-0.5">{settings.tagline}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mt-2 leading-tight">
              {settings.address}, {settings.cityStateZip}<br />
              Phone: {settings.phone} | Email: {settings.email}<br />
              Website: <span className="text-blue-700 font-semibold">https://www.wisdomcentre.co.in/</span><br />
              <strong>GSTIN: {settings.gstin}</strong> | State Code: {settings.stateCode}
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded">
              TAX INVOICE
            </span>
            <table className="mt-2 text-[10px] text-left border-collapse ml-auto">
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
        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 my-3 text-[10px]">
          <div>
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-0.5">
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
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-0.5">
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
            <div className="mt-1 pt-1 border-t border-slate-200 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Payment Mode:</span>
              <span className="font-bold text-slate-900">{invoice.paymentMode}</span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-300 rounded-lg overflow-hidden my-3">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-300 text-[9px]">
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
              {invoice.items.map((item, itemIdx) => (
                <tr key={item.id || itemIdx} className="border-b border-slate-200">
                  <td className="p-1.5 border-r border-slate-200 text-center font-mono">{itemIdx + 1}</td>
                  <td className="p-1.5 border-r border-slate-200 font-medium">
                    {item.name}
                    {item.discount > 0 && (
                      <span className="block text-[8px] text-emerald-600">
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
      </div>

      {/* Footer Section (Totals, Bank, Terms, Signature) */}
      <div>
        <div className="grid grid-cols-2 gap-3 my-2 text-[10px]">
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <p className="font-bold text-slate-800 uppercase tracking-wider text-[9px]">
              Bank & UPI Payment Gateway
            </p>
            <div className="text-slate-700 leading-tight space-y-0.5 text-[9.5px]">
              <p><strong>A/C Name:</strong> {settings.accountName || settings.companyName}</p>
              <p><strong>Bank:</strong> {settings.bankName}</p>
              <p><strong>Account No:</strong> {settings.accountNo}</p>
              <p><strong>IFSC Code:</strong> {settings.ifscCode}</p>
              <p><strong>Branch:</strong> {settings.branch}</p>
              <p className="text-red-700 font-bold mt-1">UPI ID: {settings.upiId}</p>
            </div>
          </div>

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
                <td className="py-0.5 text-emerald-700 font-semibold">Paid Amount:</td>
                <td className="py-0.5 text-right font-mono font-bold text-emerald-700">{formatINR(invoice.paidAmount)}</td>
              </tr>
              {invoice.balanceDue > 0 && (
                <tr className="text-red-700 font-bold bg-red-50">
                  <td className="p-0.5">Balance Due:</td>
                  <td className="p-0.5 text-right font-mono">{formatINR(invoice.balanceDue)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Terms & Authorization */}
        <div className="grid grid-cols-2 gap-3 border-t border-slate-300 pt-2 text-[9px] text-slate-600 mt-2">
          <div>
            <p className="font-bold text-slate-800 uppercase mb-0.5">Terms & Conditions:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              {settings.terms.map((term, i) => (
                <li key={i}>{term}</li>
              ))}
            </ol>
          </div>

          <div className="text-right flex flex-col justify-between items-end min-h-[70px]">
            <p className="font-bold text-slate-900 uppercase">For {settings.companyName}</p>
            <div className="flex flex-col items-end">
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
    </div>
  );

  return (
    <>
      {/* 1. Screen Modal Container (for User UI Preview) */}
      <div className="invoice-print-modal-backdrop fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
        <div className="invoice-print-modal-content bg-white text-slate-900 rounded-xl sm:rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[96vh] sm:max-h-[92vh]">
          {/* Modal Header Controls */}
          <div className="no-print bg-slate-900 text-white p-3 sm:p-4 flex items-center justify-between border-b border-slate-800 shrink-0 gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 border border-slate-700 shadow-xs"
              >
                <ArrowLeft className="w-4 h-4 text-red-400" />
                <span>Back to App</span>
              </button>

              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm">Batch Invoice Preview</span>
                <span className="text-xs bg-red-600 font-mono px-2 py-0.5 rounded text-white font-bold">
                  {invoices.length} Invoices Selected
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-[#D62828] hover:bg-red-700 text-white font-extrabold rounded-lg text-xs flex items-center space-x-2 shadow-lg transition-transform active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save as PDF ({invoices.length} Pages)</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Screen View */}
          <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100">
            {invoices.map(invoice => renderSingleInvoiceContent(invoice, true))}
          </div>
        </div>
      </div>

      {/* 2. Standalone React Portal to #global-print-portal at document.body level (For Chrome Print / Save-as-PDF Engine) */}
      {portalContainer && createPortal(
        <>
          {invoices.map(invoice => renderSingleInvoiceContent(invoice, false))}
        </>,
        portalContainer
      )}
    </>
  );
};
