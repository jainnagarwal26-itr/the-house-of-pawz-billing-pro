import React, { useState } from 'react';
import { 
  Send, Mail, MessageSquare, Download, Eye, Search, Filter, 
  CheckCircle2, AlertTriangle, Smartphone, FileText, UserCheck, 
  Clock, Shield, RefreshCw, X, FileCheck, CreditCard, Users, Receipt
} from 'lucide-react';
import { 
  Invoice, Payment, Customer, Pet, CompanySettings, 
  User, CommunicationRecord, formatINR 
} from '../types';
import { hasPermission } from '../lib/permissions';
import { InvoicePrintPreview } from './InvoicePrintPreview';

interface CommunicationCentreProps {
  invoices: Invoice[];
  payments: Payment[];
  customers: Customer[];
  pets: Pet[];
  settings: CompanySettings;
  currentUser: User;
  onAddAuditLog: (action: any, details: string) => void;
  historyRecords: CommunicationRecord[];
  onAddHistoryRecord: (record: CommunicationRecord) => void;
}

export const CommunicationCentre: React.FC<CommunicationCentreProps> = ({
  invoices,
  payments,
  customers,
  pets,
  settings,
  currentUser,
  onAddAuditLog,
  historyRecords,
  onAddHistoryRecord
}) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts' | 'statements' | 'history'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // PDF Preview & Download Modal State
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState<Invoice | null>(null);
  const [isAutoDownloadPDF, setIsAutoDownloadPDF] = useState(false);

  // Validation Alert Modal State
  const [validationAlert, setValidationAlert] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to normalize Indian Mobile Numbers
  const normalizeMobileNumber = (rawPhone: string): { isValid: boolean; normalized: string } => {
    if (!rawPhone) return { isValid: false, normalized: '' };
    // Remove non-digit characters
    const digitsOnly = rawPhone.replace(/\D/g, '');
    
    if (digitsOnly.length === 10) {
      return { isValid: true, normalized: `91${digitsOnly}` };
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      return { isValid: true, normalized: digitsOnly };
    } else if (digitsOnly.length > 10) {
      // Take last 10 digits
      const last10 = digitsOnly.slice(-10);
      return { isValid: true, normalized: `91${last10}` };
    }
    
    return { isValid: false, normalized: '' };
  };

  // Helper to validate Email
  const isValidEmail = (emailStr: string): boolean => {
    if (!emailStr || !emailStr.includes('@') || !emailStr.includes('.')) return false;
    return emailStr.trim().length > 5;
  };

  // ==========================================
  // WHATSAPP INVOICE WORKFLOW
  // ==========================================
  const handleSendInvoiceWhatsApp = (inv: Invoice) => {
    if (!hasPermission(currentUser, 'invoices_whatsapp')) {
      showToast('Permission Denied: You do not have permission to send WhatsApp invoices.');
      return;
    }

    const phoneCheck = normalizeMobileNumber(inv.customerPhone);
    if (!phoneCheck.isValid) {
      setValidationAlert({
        title: 'Invalid Mobile Number',
        message: `Customer mobile number "${inv.customerPhone || 'Missing'}" is invalid. Please update customer profile before sending via WhatsApp.`
      });
      return;
    }

    const messageText = `Hello ${inv.customerName},

Thank you for choosing The House of Pawz.

Please find your tax invoice details below:

Invoice No: ${inv.invoiceNumber}
Invoice Date: ${inv.invoiceDate}
Invoice Amount: ${formatINR(inv.grandTotal)}
Paid Amount: ${formatINR(inv.paidAmount)}
Balance Due: ${formatINR(inv.balanceDue)}
Status: ${inv.paymentStatus}

Your invoice PDF is available for download/share.

Regards,
${settings.companyName || 'The House of Pawz'}
${settings.tagline || 'Luxury Pet Boarding, Daycare, Training & Spa'}

https://www.wisdomcentre.co.in/`;

    const encodedText = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/${phoneCheck.normalized}?text=${encodedText}`;

    // Auto-trigger PDF download for convenience as per prompt requirement
    setSelectedInvoiceForPreview(inv);
    setIsAutoDownloadPDF(true);

    // Open WhatsApp Web/App
    window.open(waUrl, '_blank');

    // Create Audit Log
    onAddAuditLog(
      'INVOICE_WHATSAPP_OPENED',
      `Sent WhatsApp invoice ${inv.invoiceNumber} to ${inv.customerName} (${phoneCheck.normalized})`
    );

    // Add History Entry
    onAddHistoryRecord({
      id: `COMM-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' }),
      date: new Date().toLocaleDateString('en-IN'),
      customerId: inv.customerId,
      customerName: inv.customerName,
      documentType: 'Invoice',
      documentRef: `Invoice ${inv.invoiceNumber}`,
      channel: 'WhatsApp',
      userName: currentUser.name,
      status: 'Opened',
      notes: `Sent to +${phoneCheck.normalized}`
    });

    showToast(`WhatsApp Web opened for ${inv.customerName}. Downloaded PDF can be attached manually.`);
  };

  // ==========================================
  // EMAIL INVOICE WORKFLOW
  // ==========================================
  const handleSendInvoiceEmail = (inv: Invoice) => {
    if (!hasPermission(currentUser, 'invoices_email')) {
      showToast('Permission Denied: You do not have permission to send Email invoices.');
      return;
    }

    if (!isValidEmail(inv.customerEmail)) {
      setValidationAlert({
        title: 'Customer Email Missing',
        message: `Customer email address is not available or invalid ("${inv.customerEmail || 'Empty'}"). Please update the customer's email address before sending the invoice.`
      });
      return;
    }

    const subject = `Invoice ${inv.invoiceNumber} – ${settings.companyName || 'The House of Pawz'}`;
    const body = `Dear ${inv.customerName},

Thank you for choosing ${settings.companyName || 'The House of Pawz'}.

Please find your invoice details below:

Invoice Number: ${inv.invoiceNumber}
Invoice Date: ${inv.invoiceDate}
Invoice Amount: ${formatINR(inv.grandTotal)}
Paid Amount: ${formatINR(inv.paidAmount)}
Balance Due: ${formatINR(inv.balanceDue)}
Payment Status: ${inv.paymentStatus}

Please find the invoice PDF attached/shared separately.

Regards,
${settings.companyName || 'The House of Pawz'}

https://www.wisdomcentre.co.in/`;

    const mailtoUrl = `mailto:${inv.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(mailtoUrl, '_blank');

    onAddAuditLog(
      'INVOICE_EMAIL_OPENED',
      `Opened Email composer for invoice ${inv.invoiceNumber} to ${inv.customerEmail}`
    );

    onAddHistoryRecord({
      id: `COMM-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' }),
      date: new Date().toLocaleDateString('en-IN'),
      customerId: inv.customerId,
      customerName: inv.customerName,
      documentType: 'Invoice',
      documentRef: `Invoice ${inv.invoiceNumber}`,
      channel: 'Email',
      userName: currentUser.name,
      status: 'Composer Opened',
      notes: `Mailto composer opened for ${inv.customerEmail}`
    });

    showToast(`Email Composer Opened for ${inv.customerEmail}`);
  };

  // ==========================================
  // WHATSAPP PAYMENT RECEIPT WORKFLOW
  // ==========================================
  const handleSendReceiptWhatsApp = (payment: Payment) => {
    if (!hasPermission(currentUser, 'receipt_share')) {
      showToast('Permission Denied: You do not have permission to share payment receipts.');
      return;
    }

    const customer = customers.find(c => c.id === payment.customerId || c.name === payment.customerName);
    const rawPhone = customer?.phone || '';
    const phoneCheck = normalizeMobileNumber(rawPhone);

    if (!phoneCheck.isValid) {
      setValidationAlert({
        title: 'Invalid Mobile Number',
        message: `Customer mobile number "${rawPhone || 'Missing'}" is invalid. Please update customer profile before sending payment receipt.`
      });
      return;
    }

    const targetInvoice = invoices.find(i => i.id === payment.invoiceId || i.invoiceNumber === payment.invoiceNumber);

    const messageText = `Hello ${payment.customerName},

Payment Receipt Confirmation from ${settings.companyName || 'The House of Pawz'}.

Receipt Reference: ${payment.id}
Payment Date: ${payment.paymentDate}
Amount Received: ${formatINR(payment.amount)}
Payment Mode: ${payment.paymentMode}
Against Invoice: ${payment.invoiceNumber}
Remaining Balance: ${targetInvoice ? formatINR(targetInvoice.balanceDue) : '₹ 0.00'}

Thank you for your payment!

Regards,
${settings.companyName || 'The House of Pawz'}
https://www.wisdomcentre.co.in/`;

    const waUrl = `https://wa.me/${phoneCheck.normalized}?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');

    onAddAuditLog(
      'RECEIPT_WHATSAPP_OPENED',
      `Sent WhatsApp payment receipt ${payment.id} (${payment.invoiceNumber}) to ${payment.customerName}`
    );

    onAddHistoryRecord({
      id: `COMM-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' }),
      date: new Date().toLocaleDateString('en-IN'),
      customerId: payment.customerId,
      customerName: payment.customerName,
      documentType: 'Receipt',
      documentRef: `Receipt ${payment.id} (${payment.invoiceNumber})`,
      channel: 'WhatsApp',
      userName: currentUser.name,
      status: 'Opened',
      notes: `Amount: ${formatINR(payment.amount)}`
    });

    showToast(`WhatsApp receipt message opened for ${payment.customerName}`);
  };

  // ==========================================
  // EMAIL PAYMENT RECEIPT WORKFLOW
  // ==========================================
  const handleSendReceiptEmail = (payment: Payment) => {
    if (!hasPermission(currentUser, 'receipt_share')) {
      showToast('Permission Denied: You do not have permission to share payment receipts.');
      return;
    }

    const customer = customers.find(c => c.id === payment.customerId || c.name === payment.customerName);
    const email = customer?.email || '';

    if (!isValidEmail(email)) {
      setValidationAlert({
        title: 'Customer Email Missing',
        message: `Customer email address is missing or invalid ("${email || 'Empty'}"). Please update customer profile before emailing receipt.`
      });
      return;
    }

    const targetInvoice = invoices.find(i => i.id === payment.invoiceId || i.invoiceNumber === payment.invoiceNumber);

    const subject = `Payment Receipt ${payment.id} – ${settings.companyName || 'The House of Pawz'}`;
    const body = `Dear ${payment.customerName},

We have successfully received your payment.

Receipt ID: ${payment.id}
Payment Date: ${payment.paymentDate}
Amount Received: ${formatINR(payment.amount)}
Payment Mode: ${payment.paymentMode}
Invoice Number: ${payment.invoiceNumber}
Remaining Invoice Balance: ${targetInvoice ? formatINR(targetInvoice.balanceDue) : '₹ 0.00'}

Thank you for choosing ${settings.companyName || 'The House of Pawz'}.

Regards,
${settings.companyName || 'The House of Pawz'}
https://www.wisdomcentre.co.in/`;

    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');

    onAddAuditLog(
      'RECEIPT_EMAIL_OPENED',
      `Opened Email composer for payment receipt ${payment.id} to ${email}`
    );

    onAddHistoryRecord({
      id: `COMM-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' }),
      date: new Date().toLocaleDateString('en-IN'),
      customerId: payment.customerId,
      customerName: payment.customerName,
      documentType: 'Receipt',
      documentRef: `Receipt ${payment.id} (${payment.invoiceNumber})`,
      channel: 'Email',
      userName: currentUser.name,
      status: 'Composer Opened',
      notes: `Sent to ${email}`
    });

    showToast(`Email Composer Opened for ${email}`);
  };

  // ==========================================
  // WHATSAPP CUSTOMER STATEMENT WORKFLOW
  // ==========================================
  const handleSendStatementWhatsApp = (customer: Customer) => {
    if (!hasPermission(currentUser, 'statement_share')) {
      showToast('Permission Denied: You do not have permission to share customer statements.');
      return;
    }

    const phoneCheck = normalizeMobileNumber(customer.phone);
    if (!phoneCheck.isValid) {
      setValidationAlert({
        title: 'Invalid Mobile Number',
        message: `Customer mobile number "${customer.phone || 'Missing'}" is invalid. Please update profile before sending account statement.`
      });
      return;
    }

    const custInvoices = invoices.filter(i => i.customerId === customer.id || i.customerName.toLowerCase() === customer.name.toLowerCase());
    const totalBilled = custInvoices.reduce((sum, i) => sum + (i.isCancelled ? 0 : i.grandTotal), 0);
    const totalPaid = custInvoices.reduce((sum, i) => sum + (i.isCancelled ? 0 : i.paidAmount), 0);

    const messageText = `Hello ${customer.name},

Here is your Account Statement Summary from ${settings.companyName || 'The House of Pawz'}:

Total Invoices: ${custInvoices.length}
Total Billed Amount: ${formatINR(totalBilled)}
Total Payments Received: ${formatINR(totalPaid)}
Net Outstanding Balance: ${formatINR(customer.outstandingBalance || (totalBilled - totalPaid))}
Advance Deposit Credit: ${formatINR(customer.advanceBalance || 0)}

For detailed ledger copy, please contact our billing desk.

Regards,
${settings.companyName || 'The House of Pawz'}
https://www.wisdomcentre.co.in/`;

    const waUrl = `https://wa.me/${phoneCheck.normalized}?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');

    onAddAuditLog(
      'STATEMENT_WHATSAPP_OPENED',
      `Sent WhatsApp account statement summary to ${customer.name} (${phoneCheck.normalized})`
    );

    onAddHistoryRecord({
      id: `COMM-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' }),
      date: new Date().toLocaleDateString('en-IN'),
      customerId: customer.id,
      customerName: customer.name,
      documentType: 'Statement',
      documentRef: `Statement (${customer.name})`,
      channel: 'WhatsApp',
      userName: currentUser.name,
      status: 'Opened',
      notes: `Balance: ${formatINR(customer.outstandingBalance)}`
    });

    showToast(`WhatsApp statement summary opened for ${customer.name}`);
  };

  // ==========================================
  // EMAIL CUSTOMER STATEMENT WORKFLOW
  // ==========================================
  const handleSendStatementEmail = (customer: Customer) => {
    if (!hasPermission(currentUser, 'statement_share')) {
      showToast('Permission Denied: You do not have permission to share customer statements.');
      return;
    }

    if (!isValidEmail(customer.email)) {
      setValidationAlert({
        title: 'Customer Email Missing',
        message: `Customer email address is missing or invalid ("${customer.email || 'Empty'}"). Please update profile before sending account statement.`
      });
      return;
    }

    const custInvoices = invoices.filter(i => i.customerId === customer.id || i.customerName.toLowerCase() === customer.name.toLowerCase());
    const totalBilled = custInvoices.reduce((sum, i) => sum + (i.isCancelled ? 0 : i.grandTotal), 0);
    const totalPaid = custInvoices.reduce((sum, i) => sum + (i.isCancelled ? 0 : i.paidAmount), 0);

    const subject = `Account Statement – ${customer.name} – ${settings.companyName || 'The House of Pawz'}`;
    const body = `Dear ${customer.name},

Please find your account summary with ${settings.companyName || 'The House of Pawz'} below:

Total Billed Amount: ${formatINR(totalBilled)}
Total Payments Received: ${formatINR(totalPaid)}
Net Outstanding Balance: ${formatINR(customer.outstandingBalance || (totalBilled - totalPaid))}
Advance Deposit Balance: ${formatINR(customer.advanceBalance || 0)}

Thank you for your business.

Regards,
${settings.companyName || 'The House of Pawz'}
https://www.wisdomcentre.co.in/`;

    window.open(`mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');

    onAddAuditLog(
      'STATEMENT_EMAIL_OPENED',
      `Opened Email composer for customer statement to ${customer.email}`
    );

    onAddHistoryRecord({
      id: `COMM-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' }),
      date: new Date().toLocaleDateString('en-IN'),
      customerId: customer.id,
      customerName: customer.name,
      documentType: 'Statement',
      documentRef: `Statement (${customer.name})`,
      channel: 'Email',
      userName: currentUser.name,
      status: 'Composer Opened',
      notes: `Sent to ${customer.email}`
    });

    showToast(`Email Composer Opened for ${customer.email}`);
  };

  // Filtered lists
  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customerPhone.includes(searchQuery) ||
    inv.customerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPayments = payments.filter(p =>
    p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHistory = historyRecords.filter(h =>
    h.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.documentRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            📩 Communication Centre
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Invoice PDF Dispatch • Send via WhatsApp • Email Billing • Payment Receipts • Client Statements
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-900 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
            WhatsApp Direct 91
          </span>
          <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono font-bold text-xs rounded-xl border border-amber-200 dark:border-amber-900 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-amber-500" />
            Email Composer
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Global Search */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Sub-Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-zinc-800 p-1.5 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'invoices'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Invoice Communication</span>
          </button>

          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'receipts'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payment Receipts</span>
          </button>

          <button
            onClick={() => setActiveTab('statements')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'statements'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer Statements</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Communication History</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Customer, Phone, Email, Invoice or Reference..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-medium focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* TAB 1: INVOICE COMMUNICATION */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-blue-600" />
              Direct Invoice PDF, WhatsApp & Email Action Center ({filteredInvoices.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 text-[10px] uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-zinc-800">
                  <th className="py-3 px-3.5 w-[16%]">Invoice Details</th>
                  <th className="py-3 px-3.5 w-[24%]">Customer & Contact</th>
                  <th className="py-3 px-3 text-right w-[12%]">Grand Total</th>
                  <th className="py-3 px-3 text-right w-[12%]">Balance Due</th>
                  <th className="py-3 px-3 text-center w-[12%]">Status</th>
                  <th className="py-3 px-3 text-center w-[24%]">Communication Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3">
                      <span className="font-mono font-bold text-slate-900 dark:text-white block">{inv.invoiceNumber}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Date: {inv.invoiceDate}</span>
                    </td>

                    <td className="p-3">
                      <span className="font-bold text-slate-800 dark:text-zinc-200 block">{inv.customerName}</span>
                      <span className="text-[10px] text-slate-500 block">📞 {inv.customerPhone || 'No Phone'}</span>
                      <span className="text-[10px] text-slate-500 block truncate">📧 {inv.customerEmail || 'No Email'}</span>
                    </td>

                    <td className="p-3 text-right font-mono font-extrabold text-slate-900 dark:text-white text-sm">
                      {formatINR(inv.grandTotal)}
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-red-600 dark:text-red-400">
                      {inv.balanceDue > 0 ? formatINR(inv.balanceDue) : '₹ 0.00'}
                    </td>

                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold font-mono ${
                        inv.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : inv.paymentStatus === 'CANCELLED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : inv.paymentStatus === 'PARTIAL'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {inv.paymentStatus}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {/* View PDF */}
                        <button
                          onClick={() => {
                            setIsAutoDownloadPDF(false);
                            setSelectedInvoiceForPreview(inv);
                          }}
                          className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 rounded-lg text-[11px] font-semibold hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center space-x-1 transition-colors"
                          title="View Tax Invoice PDF Preview"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden lg:inline">View</span>
                        </button>

                        {/* Download PDF */}
                        <button
                          onClick={() => {
                            setSelectedInvoiceForPreview(inv);
                            setIsAutoDownloadPDF(true);
                            onAddAuditLog(
                              'INVOICE_PDF_DOWNLOADED',
                              `Downloaded PDF for invoice ${inv.invoiceNumber} (${inv.customerName})`
                            );
                          }}
                          className="px-2 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg text-[11px] font-semibold hover:bg-blue-100 flex items-center space-x-1 transition-colors"
                          title="Download Tax Invoice PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                          <span className="hidden lg:inline">PDF</span>
                        </button>

                        {/* WhatsApp */}
                        <button
                          onClick={() => handleSendInvoiceWhatsApp(inv)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors shadow-2xs"
                          title="Send Invoice Details & Link via WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>

                        {/* Email */}
                        <button
                          onClick={() => handleSendInvoiceEmail(inv)}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors shadow-2xs"
                          title="Send Invoice via Email Composer"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic text-xs">
                      No matching tax invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENT RECEIPTS */}
      {activeTab === 'receipts' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Payment Receipt Sharing ({filteredPayments.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 text-[10px] uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-zinc-800">
                  <th className="py-3 px-3.5 w-[16%]">Receipt ID</th>
                  <th className="py-3 px-3.5 w-[14%]">Date</th>
                  <th className="py-3 px-3.5 w-[22%]">Customer Name</th>
                  <th className="py-3 px-3.5 w-[16%]">Invoice Number</th>
                  <th className="py-3 px-3 text-right w-[14%]">Amount Received</th>
                  <th className="py-3 px-3 text-center w-[18%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                {filteredPayments.map(pay => (
                  <tr key={pay.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{pay.id}</td>
                    <td className="p-3 text-slate-500 font-mono">{pay.paymentDate}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-zinc-200">{pay.customerName}</td>
                    <td className="p-3 font-mono text-slate-700 dark:text-zinc-300">{pay.invoiceNumber}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatINR(pay.amount)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleSendReceiptWhatsApp(pay)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp Receipt</span>
                        </button>
                        <button
                          onClick={() => handleSendReceiptEmail(pay)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email Receipt</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic text-xs">
                      No payment receipt entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER STATEMENTS */}
      {activeTab === 'statements' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-600" />
              Customer Ledger Statement Sharing ({filteredCustomers.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 text-[10px] uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-zinc-800">
                  <th className="py-3 px-3.5 w-[22%]">Customer Name</th>
                  <th className="py-3 px-3.5 w-[20%]">Contact Details</th>
                  <th className="py-3 px-3 text-right w-[16%]">Outstanding Balance</th>
                  <th className="py-3 px-3 text-right w-[16%]">Advance Deposit</th>
                  <th className="py-3 px-3 text-center w-[26%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                {filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3">
                      <span className="font-bold text-slate-800 dark:text-zinc-200 block">{cust.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">ID: {cust.id}</span>
                    </td>

                    <td className="p-3">
                      <span className="text-[11px] text-slate-700 dark:text-zinc-300 block">📞 {cust.phone || 'N/A'}</span>
                      <span className="text-[10px] text-slate-500 block truncate">📧 {cust.email || 'N/A'}</span>
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-red-600 dark:text-red-400">
                      {formatINR(cust.outstandingBalance)}
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(cust.advanceBalance || 0)}
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleSendStatementWhatsApp(cust)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp Statement</span>
                        </button>
                        <button
                          onClick={() => handleSendStatementEmail(cust)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email Statement</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic text-xs">
                      No customer directory entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: COMMUNICATION HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-600" />
              Communication Activity Log ({filteredHistory.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 text-[10px] uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-zinc-800">
                  <th className="py-3 px-3.5 w-[16%]">Timestamp</th>
                  <th className="py-3 px-3.5 w-[20%]">Customer</th>
                  <th className="py-3 px-3.5 w-[22%]">Document Reference</th>
                  <th className="py-3 px-3 text-center w-[12%]">Channel</th>
                  <th className="py-3 px-3.5 w-[15%]">Dispatched By</th>
                  <th className="py-3 px-3 text-center w-[15%]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                {filteredHistory.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3 text-slate-500 font-mono text-[11px]">{rec.timestamp}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-zinc-200">{rec.customerName}</td>
                    <td className="p-3 font-mono text-slate-700 dark:text-zinc-300">{rec.documentRef}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        rec.channel === 'WhatsApp'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : rec.channel === 'Email'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {rec.channel}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-700 dark:text-zinc-300">{rec.userName}</td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {rec.status}
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic text-xs">
                      No communication dispatch history logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Validation Alert Modal */}
      {validationAlert && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-[#D62828] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{validationAlert.title}</h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">{validationAlert.message}</p>
            </div>
            <button
              onClick={() => setValidationAlert(null)}
              className="w-full py-2.5 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
            >
              Understand & Close
            </button>
          </div>
        </div>
      )}

      {/* Invoice Print Preview Modal */}
      {selectedInvoiceForPreview && (
        <InvoicePrintPreview
          invoice={selectedInvoiceForPreview}
          settings={settings}
          userRole={currentUser.role}
          currentUser={currentUser}
          autoDownloadPDF={isAutoDownloadPDF}
          onClose={() => {
            setSelectedInvoiceForPreview(null);
            setIsAutoDownloadPDF(false);
          }}
          onShareWhatsApp={() => handleSendInvoiceWhatsApp(selectedInvoiceForPreview)}
        />
      )}
    </div>
  );
};
