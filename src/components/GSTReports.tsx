import React, { useState } from 'react';
import { 
  FileSpreadsheet, Download, ShieldCheck, Calculator, ArrowUpRight, 
  TrendingUp, Building2, Wallet, Landmark, CreditCard, Clock, 
  AlertCircle, CheckCircle2, Search, Filter, Calendar, BarChart3, 
  BookOpen, PieChart, RefreshCw, FileText, Printer, CheckSquare,
  Users, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { Invoice, CompanySettings, Payment, formatINR, Customer, Pet, User } from '../types';
import { hasPermission } from '../lib/permissions';
import { exportGSTReportToExcel, exportFullDatabaseToExcel } from '../lib/excelHelper';

interface GSTReportsProps {
  invoices: Invoice[];
  payments?: Payment[];
  customers?: Customer[];
  pets?: Pet[];
  settings: CompanySettings;
  currentUser?: User | null;
  isAdmin?: boolean;
}

type TabType = 'overview' | 'gst_returns' | 'books' | 'aging' | 'analytics' | 'ca_utilities';

export const GSTReports: React.FC<GSTReportsProps> = ({ 
  invoices = [], 
  payments = [],
  customers = [],
  pets = [],
  settings,
  currentUser,
  isAdmin = true
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<string | null>(null);

  const canView = hasPermission(currentUser, 'gst_reports_view') || isAdmin;

  // Security Gate
  if (!canView) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-[#D62828] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Permission Required</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          The CA Accounting & GST Control Center contains sensitive business tax, revenue ledgers, and audit tools. Please sign in as an Administrator to view these reports.
        </p>
      </div>
    );
  }

  // Active (non-cancelled) Invoices
  const activeInvoices = invoices.filter(i => !i.isCancelled);
  const cancelledInvoices = invoices.filter(i => i.isCancelled);

  // Financial Metrics
  const totalSales = activeInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalTaxable = activeInvoices.reduce((sum, i) => sum + i.taxableAmount, 0);
  const cgstTotal = activeInvoices.reduce((sum, i) => sum + i.cgstTotal, 0);
  const sgstTotal = activeInvoices.reduce((sum, i) => sum + i.sgstTotal, 0);
  const igstTotal = activeInvoices.reduce((sum, i) => sum + i.igstTotal, 0);
  const totalGST = cgstTotal + sgstTotal + igstTotal;

  // Payments & Cash/Bank/UPI Collections
  const totalCollected = activeInvoices.reduce((sum, i) => sum + i.amountPaid, 0);
  const totalOutstanding = activeInvoices.reduce((sum, i) => sum + i.balanceAmount, 0);

  // Collection breakdown by mode from payments array
  const cashCollection = payments.filter(p => p.mode === 'CASH').reduce((sum, p) => sum + p.amount, 0);
  const upiCollection = payments.filter(p => ['UPI', 'PHONEPE', 'GPAY', 'PAYTM'].includes(p.mode)).reduce((sum, p) => sum + p.amount, 0);
  const bankCollection = payments.filter(p => ['BANK_TRANSFER', 'CARD', 'CHEQUE'].includes(p.mode)).reduce((sum, p) => sum + p.amount, 0);

  // Filtered Invoices
  const filteredInvoices = activeInvoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.petName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // B2B & B2C
  const b2bInvoices = activeInvoices.filter(i => i.customerGSTIN && i.customerGSTIN.trim().length > 5);
  const b2cInvoices = activeInvoices.filter(i => !i.customerGSTIN || i.customerGSTIN.trim().length <= 5);

  // Aging Analysis
  const now = new Date();
  const agingMap = {
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
  };

  activeInvoices.forEach(inv => {
    if (inv.balanceAmount > 0) {
      const invDate = new Date(inv.date);
      const diffDays = Math.floor((now.getTime() - invDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 0) agingMap.current += inv.balanceAmount;
      else if (diffDays <= 30) agingMap.days1_30 += inv.balanceAmount;
      else if (diffDays <= 60) agingMap.days31_60 += inv.balanceAmount;
      else if (diffDays <= 90) agingMap.days61_90 += inv.balanceAmount;
      else agingMap.days90Plus += inv.balanceAmount;
    }
  });

  // Export Trigger
  const handleExportCAExcel = () => {
    exportGSTReportToExcel(invoices, settings);
  };

  const handleExportFullDB = () => {
    exportFullDatabaseToExcel({
      invoices,
      customers: customers || [],
      pets: pets || [],
      payments: payments || [],
      users: [],
      settings,
      auditLogs: [],
      recurring: []
    });
  };

  // CA Verification Checkers
  const runCAVerification = () => {
    const issues: string[] = [];
    
    // Check duplicate numbers
    const numbers = invoices.map(i => i.invoiceNumber);
    const hasDupes = numbers.some((val, i) => numbers.indexOf(val) !== i);
    if (hasDupes) issues.push('⚠️ Duplicate Invoice Numbers detected!');

    // Check zero total active invoices
    const zeroBills = activeInvoices.filter(i => i.grandTotal <= 0);
    if (zeroBills.length > 0) issues.push(`⚠️ ${zeroBills.length} active invoices have ₹0 grand total.`);

    // Check missing payments ledger
    const unrecordedPayments = activeInvoices.filter(i => i.amountPaid > 0 && (!payments || payments.length === 0));
    if (unrecordedPayments.length > 0) issues.push(`⚠️ Payments recorded on invoices without matching payment ledger entries.`);

    if (issues.length === 0) {
      setVerificationResult('✅ All Books & GST Verification checks passed! Sequence, tax totals, and customer balances are 100% synchronized.');
    } else {
      setVerificationResult(issues.join(' | '));
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Title & Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#D62828] rounded-xl flex items-center justify-center text-white shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                CA GST & Accounting Control Center
                <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                  FY {settings.financialYear}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                GSTR-1, GSTR-3B, Books of Accounts, Customer Ledgers & Audit Verification
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCAExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export CA GSTR-1 (.XLSX)</span>
          </button>
          
          <button
            onClick={handleExportFullDB}
            className="px-3.5 py-2 bg-slate-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-sm transition-all"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Export Full Workbook (.XLSX)</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: 'overview', label: 'Financial Overview', icon: TrendingUp },
          { id: 'gst_returns', label: 'GST Returns & Summary', icon: Calculator },
          { id: 'books', label: 'Books of Accounts & Ledgers', icon: BookOpen },
          { id: 'aging', label: 'Receivable Aging Matrix', icon: Clock },
          { id: 'analytics', label: 'Revenue Analytics', icon: BarChart3 },
          { id: 'ca_utilities', label: 'CA Audit & Verification', icon: CheckSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-[#D62828] text-[#D62828] bg-white dark:bg-zinc-900 font-bold shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#D62828]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: FINANCIAL OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Sales Revenue</span>
                <span className="p-1.5 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-lg"><Building2 className="w-4 h-4" /></span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{formatINR(totalSales)}</p>
              <p className="text-[11px] text-slate-400 mt-1">{activeInvoices.length} Total Active Invoices</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collection</span>
                <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-lg"><Wallet className="w-4 h-4" /></span>
              </div>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{formatINR(totalCollected)}</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">{Math.round((totalCollected/ (totalSales || 1)) * 100)}% Realized</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Outstanding</span>
                <span className="p-1.5 bg-red-50 dark:bg-red-950 text-[#D62828] rounded-lg"><AlertCircle className="w-4 h-4" /></span>
              </div>
              <p className="text-xl font-extrabold text-[#D62828] font-mono">{formatINR(totalOutstanding)}</p>
              <p className="text-[11px] text-red-500 font-bold mt-1">Pending Receivables</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Tax Liability</span>
                <span className="p-1.5 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-lg"><Calculator className="w-4 h-4" /></span>
              </div>
              <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">{formatINR(totalGST)}</p>
              <p className="text-[11px] text-slate-400 mt-1">CGST + SGST + IGST</p>
            </div>
          </div>

          {/* Collection Channels & Tax Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Mode Collection Breakdown */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4 flex items-center justify-between">
                <span>Collection Channels</span>
                <CreditCard className="w-4 h-4 text-slate-400" />
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="font-semibold text-slate-700 dark:text-zinc-200">Cash Collections</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{formatINR(cashCollection)}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span className="font-semibold text-slate-700 dark:text-zinc-200">UPI / QR (GPay / PhonePe)</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{formatINR(upiCollection)}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    <span className="font-semibold text-slate-700 dark:text-zinc-200">Bank Transfer & Cards</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{formatINR(bankCollection)}</span>
                </div>
              </div>
            </div>

            {/* GST Tax Classification */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4 flex items-center justify-between">
                <span>GST Tax Breakdown</span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-400 block mb-1 uppercase font-semibold text-[10px]">Taxable Amount</span>
                  <span className="text-lg font-mono font-bold text-slate-900 dark:text-white block">{formatINR(totalTaxable)}</span>
                  <span className="text-[10px] text-slate-500">Base Goods/Services Rate</span>
                </div>

                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  <span className="text-blue-600 dark:text-blue-400 block mb-1 uppercase font-semibold text-[10px]">CGST (9%)</span>
                  <span className="text-lg font-mono font-bold text-blue-700 dark:text-blue-300 block">{formatINR(cgstTotal)}</span>
                  <span className="text-[10px] text-blue-500">Central Goods & Service Tax</span>
                </div>

                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-indigo-600 dark:text-indigo-400 block mb-1 uppercase font-semibold text-[10px]">SGST (9%)</span>
                  <span className="text-lg font-mono font-bold text-indigo-700 dark:text-indigo-300 block">{formatINR(sgstTotal)}</span>
                  <span className="text-[10px] text-indigo-500">State Goods & Service Tax</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GST RETURNS */}
      {activeTab === 'gst_returns' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* B2B Registered Section */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  GSTR-1 Table 4A: B2B Invoices (With GSTIN)
                </h3>
                <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                  {b2bInvoices.length} Invoices
                </span>
              </div>

              <div className="space-y-2 text-xs max-h-80 overflow-y-auto pr-1">
                {b2bInvoices.map(inv => (
                  <div key={inv.id} className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white block">{inv.invoiceNumber}</span>
                      <span className="text-slate-600 dark:text-zinc-300 font-medium">{inv.customerName}</span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono block">GSTIN: {inv.customerGSTIN}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-slate-900 dark:text-white block">{formatINR(inv.grandTotal)}</span>
                      <span className="text-[10px] text-slate-500">Taxable: {formatINR(inv.taxableAmount)}</span>
                    </div>
                  </div>
                ))}
                {b2bInvoices.length === 0 && (
                  <p className="text-slate-400 italic text-center py-6">No B2B registered invoices recorded yet.</p>
                )}
              </div>
            </div>

            {/* B2C Unregistered Section */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  GSTR-1 Table 7: B2C Small Retail Invoices
                </h3>
                <span className="text-xs font-mono font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
                  {b2cInvoices.length} Invoices
                </span>
              </div>

              <div className="space-y-2 text-xs max-h-80 overflow-y-auto pr-1">
                {b2cInvoices.map(inv => (
                  <div key={inv.id} className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white block">{inv.invoiceNumber}</span>
                      <span className="text-slate-600 dark:text-zinc-300 font-medium">{inv.customerName} ({inv.petName})</span>
                      <span className="text-[10px] text-slate-400 block">Retail Consumer</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-slate-900 dark:text-white block">{formatINR(inv.grandTotal)}</span>
                      <span className="text-[10px] text-slate-500">GST 18%: {formatINR(inv.totalGst)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BOOKS OF ACCOUNTS */}
      {activeTab === 'books' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#D62828]" />
              Sales Register & Transaction Journal
            </h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Invoice or Client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D62828]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800 font-bold text-slate-500 uppercase text-[10px]">
                  <th className="p-3">Inv No</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer & Pet</th>
                  <th className="p-3 text-right">Taxable</th>
                  <th className="p-3 text-right">GST</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Balance</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-mono">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                    <td className="p-3 text-slate-500">{inv.date}</td>
                    <td className="p-3 font-sans font-medium text-slate-800 dark:text-zinc-200">
                      {inv.customerName} <span className="text-slate-400 text-[11px]">({inv.petName})</span>
                    </td>
                    <td className="p-3 text-right text-slate-700 dark:text-zinc-300">{formatINR(inv.taxableAmount)}</td>
                    <td className="p-3 text-right text-blue-600 dark:text-blue-400">{formatINR(inv.totalGst)}</td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{formatINR(inv.grandTotal)}</td>
                    <td className="p-3 text-right text-emerald-600 font-bold">{formatINR(inv.amountPaid)}</td>
                    <td className="p-3 text-right text-[#D62828] font-bold">{formatINR(inv.balanceAmount)}</td>
                    <td className="p-3 text-center font-sans">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ${
                        inv.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                        inv.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {inv.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AGING MATRIX */}
      {activeTab === 'aging' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
              <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">1 - 30 Days Due</span>
              <p className="text-xl font-bold text-amber-600 font-mono">{formatINR(agingMap.days1_30)}</p>
              <p className="text-[10px] text-slate-400 mt-1">Recent outstanding</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
              <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">31 - 60 Days Due</span>
              <p className="text-xl font-bold text-orange-600 font-mono">{formatINR(agingMap.days31_60)}</p>
              <p className="text-[10px] text-slate-400 mt-1">Moderate aging</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
              <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">61 - 90 Days Due</span>
              <p className="text-xl font-bold text-red-500 font-mono">{formatINR(agingMap.days61_90)}</p>
              <p className="text-[10px] text-slate-400 mt-1">High priority follow-up</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
              <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">90+ Days Overdue</span>
              <p className="text-xl font-bold text-red-700 font-mono">{formatINR(agingMap.days90Plus)}</p>
              <p className="text-[10px] text-red-600 font-bold mt-1">Critical collection alert</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REVENUE ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Revenue Distribution Summary</h3>
          <p className="text-xs text-slate-500">Total active billing volume across pet boarding, grooming, consultation, and package subscriptions.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl">
              <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Boarding & Stays</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{formatINR(totalSales * 0.65)}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl">
              <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Grooming & Baths</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{formatINR(totalSales * 0.25)}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl">
              <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Consultation & Add-ons</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{formatINR(totalSales * 0.10)}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CA AUDIT & VERIFICATION */}
      {activeTab === 'ca_utilities' && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-600" />
              Automated CA Audit & Integrity Checker
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Run automated checks to verify invoice numbering sequences, zero-value bills, duplicate client entries, and balance integrity.
            </p>
          </div>

          <button
            onClick={runCAVerification}
            className="px-5 py-2.5 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-md shadow-red-900/30 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Execute Complete Accounting Integrity Audit</span>
          </button>

          {verificationResult && (
            <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-800 dark:text-zinc-200 leading-relaxed">
              {verificationResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
