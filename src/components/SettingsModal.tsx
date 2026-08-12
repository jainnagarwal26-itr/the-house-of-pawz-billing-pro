import React, { useState, useEffect } from 'react';
import { Settings, Save, Building, QrCode, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import { CompanySettings, User } from '../types';
import { hasPermission } from '../lib/permissions';

interface SettingsProps {
  settings: CompanySettings;
  currentUser?: User | null;
  onUpdateSettings: (settings: CompanySettings) => void;
  onFactoryReset?: () => void;
}

export const SettingsModal: React.FC<SettingsProps> = ({ settings, currentUser, onUpdateSettings, onFactoryReset }) => {
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [address, setAddress] = useState(settings.address);
  const [cityStateZip, setCityStateZip] = useState(settings.cityStateZip);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [gstin, setGstin] = useState(settings.gstin);
  const [accountName, setAccountName] = useState(settings.accountName || 'The House of Pawz');
  const [bankName, setBankName] = useState(settings.bankName);
  const [accountNo, setAccountNo] = useState(settings.accountNo);
  const [ifscCode, setIfscCode] = useState(settings.ifscCode);
  const [branch, setBranch] = useState(settings.branch || 'Four Bungalow, Andheri (W).');
  const [upiId, setUpiId] = useState(settings.upiId);
  const [logoPath, setLogoPath] = useState(settings.logoPath || 'https://dxvnemdmgdckdfzilnkr.supabase.co/storage/v1/object/public/company-assets/Logo.jpg');
  const [signaturePath, setSignaturePath] = useState(settings.signaturePath || 'https://dxvnemdmgdckdfzilnkr.supabase.co/storage/v1/object/public/signatures/Signature.jpg');
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName || 'The House of Pawz');
      setTagline(settings.tagline || 'Luxury Pet Boarding, Daycare, Training & Spa');
      setAddress(settings.address || 'Bungalow No. 164, Aram Nagar 1, Versova, Andheri West');
      setCityStateZip(settings.cityStateZip || 'Mumbai, Maharashtra - 400061');
      setPhone(settings.phone || '');
      setEmail(settings.email || '');
      setGstin(settings.gstin || '');
      setAccountName(settings.accountName || 'The House of Pawz');
      setBankName(settings.bankName || '');
      setAccountNo(settings.accountNo || '');
      setIfscCode(settings.ifscCode || '');
      setBranch(settings.branch || 'Four Bungalow, Andheri (W).');
      setUpiId(settings.upiId || '');
      setLogoPath(settings.logoPath || 'https://dxvnemdmgdckdfzilnkr.supabase.co/storage/v1/object/public/company-assets/Logo.jpg');
      setSignaturePath(settings.signaturePath || 'https://dxvnemdmgdckdfzilnkr.supabase.co/storage/v1/object/public/signatures/Signature.jpg');
      setInvoicePrefix(settings.invoicePrefix || 'HOP/26-27/');
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CompanySettings = {
      ...settings,
      companyName,
      tagline,
      address,
      cityStateZip,
      phone,
      email,
      gstin,
      accountName,
      bankName,
      accountNo,
      ifscCode,
      branch,
      upiId,
      logoPath,
      signaturePath,
      invoicePrefix
    };
    onUpdateSettings(updated);
    setToastMsg('Company and Billing Settings saved successfully!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto overflow-y-auto h-[calc(100vh-3.5rem)]">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#D62828]" />
          The House of Pawz – Software & GST Configuration
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Company Profile, Invoice Prefix, GSTIN, Bank Accounts & UPI QR Gateway Configuration
        </p>
      </div>

      {toastMsg && (
        <div className="p-3 bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-6 text-xs">
        {/* Company Identity */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-[#D62828] border-b pb-1">
            1. Company & Brand Identity
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Company Name</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Brand Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Street Address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">City, State & Pincode</label>
              <input
                type="text"
                value={cityStateZip}
                onChange={e => setCityStateZip(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Phone Numbers</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Official Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">GSTIN Number *</label>
              <input
                type="text"
                required
                value={gstin}
                onChange={e => setGstin(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono font-bold uppercase"
              />
            </div>
          </div>
        </div>

        {/* Bank & Payment Gateway */}
        <div className="space-y-3 pt-2">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-[#D62828] border-b pb-1">
            2. Bank Account & UPI Payment Gateway
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">A/C Holder Name</label>
              <input
                type="text"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Account Number</label>
              <input
                type="text"
                value={accountNo}
                onChange={e => setAccountNo(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">IFSC Code</label>
              <input
                type="text"
                value={ifscCode}
                onChange={e => setIfscCode(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono uppercase font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Branch Name & City</label>
              <input
                type="text"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">UPI ID (Printed on Invoice QR)</label>
              <input
                type="text"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono font-bold text-red-600"
              />
            </div>
          </div>
        </div>

        {/* Branding Assets (Logo & Signature) */}
        <div className="space-y-3 pt-2">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-[#D62828] border-b pb-1">
            3. Branding Assets (Logo & Digital Signature)
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Company Logo Path / URL</label>
              <input
                type="text"
                value={logoPath}
                onChange={e => setLogoPath(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Authorized Signature Path / URL</label>
              <input
                type="text"
                value={signaturePath}
                onChange={e => setSignaturePath(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Invoice Series */}
        <div className="space-y-3 pt-2">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-[#D62828] border-b pb-1">
            3. GST Invoice Format
          </h3>

          <div>
            <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Invoice Number Prefix Series</label>
            <input
              type="text"
              value={invoicePrefix}
              onChange={e => setInvoicePrefix(e.target.value)}
              className="w-full p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono font-bold"
            />
            <p className="text-[10px] text-slate-400 mt-1">Example output: HOP/26-27/000001</p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-3 pt-2">
          <h3 className="font-extrabold text-red-600 dark:text-red-400 text-xs uppercase tracking-wider border-b border-red-200 dark:border-red-900 pb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            4. Danger Zone – Factory Reset Database
          </h3>

          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl space-y-3">
            <div>
              <h4 className="font-bold text-red-900 dark:text-red-300 text-xs">Reset All Local Application Data</h4>
              <p className="text-[11px] text-red-700 dark:text-red-400 mt-0.5">
                Permanently clears all LocalStorage, SessionStorage, browser caches, and IndexedDB data. This resets the application back to a clean production database state.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (confirm('CRITICAL WARNING: This will permanently delete ALL customers, pets, invoices, payments, and audit logs stored locally. Are you absolutely sure you want to execute a Factory Reset?')) {
                  if (onFactoryReset) {
                    onFactoryReset();
                  } else {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }
                }
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center space-x-2 shadow-md shadow-red-900/40"
            >
              <Trash2 className="w-4 h-4" />
              <span>Execute Factory Reset & Purge Cache</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-zinc-800">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#D62828] hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-red-900/40"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
