import React, { useState, useEffect } from 'react';
import { 
  User, UserRole, Customer, Pet, Invoice, Payment, 
  RecurringSubscription, AuditLog, CompanySettings, CatalogItem 
} from './types';
import { 
  DEFAULT_COMPANY_SETTINGS, SYSTEM_USERS, 
  STORAGE_KEYS, loadStoredData, saveStoredData, createAuditLog, factoryResetDatabase 
} from './lib/storage';
import { 
  INITIAL_CUSTOMERS, INITIAL_PETS, INITIAL_INVOICES, INITIAL_PAYMENTS 
} from './lib/initialClientData';
import { exportFullDatabaseToExcel } from './lib/excelHelper';

import { TopBar } from './components/TopBar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { InvoiceManagement } from './components/InvoiceManagement';
import { InvoiceModal } from './components/InvoiceModal';
import { RecurringBilling } from './components/RecurringBilling';
import { CustomerMaster } from './components/CustomerMaster';
import { PetMaster } from './components/PetMaster';
import { MediaGallery } from './components/MediaGallery';
import { SmartImportEngine } from './components/SmartImportEngine';
import { PaymentManagement } from './components/PaymentManagement';
import { GSTReports } from './components/GSTReports';
import { ExcelManager } from './components/ExcelManager';
import { UserManagement } from './components/UserManagement';
import { AuditLogs } from './components/AuditLogs';
import { SettingsModal } from './components/SettingsModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { NotificationPanel } from './components/NotificationPanel';
import { Footer } from './components/Footer';

export default function App() {
  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => 
    loadStoredData(STORAGE_KEYS.DARK_MODE, false)
  );

  // Active User State
  const [users, setUsers] = useState<User[]>(() => {
    const data = loadStoredData(STORAGE_KEYS.USERS, SYSTEM_USERS);
    return data.map(u => {
      let name = u.name;
      let email = u.email;
      let changed = false;
      if (name.includes('Amit Bansal')) {
        name = name.replace('Amit Bansal', 'Chirag Jain');
        changed = true;
      }
      if (name.includes('Chirag Jian')) {
        name = name.replace('Chirag Jian', 'Chirag Jain');
        changed = true;
      }
      if (email.includes('amit.ca')) {
        email = email.replace('amit.ca', 'chirag.ca');
        changed = true;
      }
      if (email.includes('jian.ca')) {
        email = email.replace('jian.ca', 'jain.ca');
        changed = true;
      }
      return changed ? { ...u, name, email } : u;
    });
  });
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const u = loadStoredData(STORAGE_KEYS.ACTIVE_USER, SYSTEM_USERS[0]);
    let name = u.name;
    let email = u.email;
    let changed = false;
    if (name.includes('Amit Bansal')) {
      name = name.replace('Amit Bansal', 'Chirag Jain');
      changed = true;
    }
    if (name.includes('Chirag Jian')) {
      name = name.replace('Chirag Jian', 'Chirag Jain');
      changed = true;
    }
    if (email.includes('amit.ca')) {
      email = email.replace('amit.ca', 'chirag.ca');
      changed = true;
    }
    if (email.includes('jian.ca')) {
      email = email.replace('jian.ca', 'jain.ca');
      changed = true;
    }
    return changed ? { ...u, name, email } : u;
  });

  // Settings State
  const [settings, setSettings] = useState<CompanySettings>(() => {
    const data = loadStoredData(STORAGE_KEYS.SETTINGS, DEFAULT_COMPANY_SETTINGS);
    const updated = {
      ...DEFAULT_COMPANY_SETTINGS,
      ...data
    };
    // Auto-update bank details if still using old HDFC default
    if (updated.bankName === 'HDFC Bank Ltd.' || updated.accountNo === '50200088991234') {
      updated.accountName = 'The House of Pawz';
      updated.bankName = 'INDUSIND BANK';
      updated.accountNo = '201003400051';
      updated.ifscCode = 'INDB0001074';
      updated.branch = 'Four Bungalow, Andheri (W).';
    }
    if (!updated.logoPath) updated.logoPath = '/Logo.jpg';
    if (!updated.signaturePath) updated.signaturePath = '/Signature.jpg';
    if (!updated.accountName) updated.accountName = 'The House of Pawz';
    return updated;
  });

  // Core Data Collections (Initialized with Actual Client Invoices 01-32)
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const data = loadStoredData<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const source = (data && data.length > 0) ? data : INITIAL_CUSTOMERS;
    return source.map(c => {
      const initMatch = INITIAL_CUSTOMERS.find(ic => ic.name === c.name || ic.id === c.id);
      const adv = (c.advanceBalance !== undefined && c.advanceBalance !== null && c.advanceBalance > 0) 
        ? c.advanceBalance 
        : (initMatch?.advanceBalance || 0);
      return { ...c, advanceBalance: adv };
    });
  });
  const [pets, setPets] = useState<Pet[]>(() => {
    const data = loadStoredData<Pet[]>(STORAGE_KEYS.PETS, []);
    return data && data.length > 0 ? data : INITIAL_PETS;
  });
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const data = loadStoredData<Invoice[]>(STORAGE_KEYS.INVOICES, []);
    const source = (data && data.length >= 30) ? data : INITIAL_INVOICES;
    return source.map(inv => {
      let changed = false;
      let name = inv.createdByName;
      if (name && name.includes('Amit Bansal')) {
        name = name.replace('Amit Bansal', 'Chirag Jain');
        changed = true;
      }
      if (name && name.includes('Chirag Jian')) {
        name = name.replace('Chirag Jian', 'Chirag Jain');
        changed = true;
      }
      return changed ? { ...inv, createdByName: name } : inv;
    });
  });
  const [payments, setPayments] = useState<Payment[]>(() => {
    const data = loadStoredData<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    const source = (data && data.length >= 30) ? data : INITIAL_PAYMENTS;
    return source.map(pay => {
      let changed = false;
      let rec = pay.receivedBy;
      if (rec && rec.includes('Amit Bansal')) {
        rec = rec.replace('Amit Bansal', 'Chirag Jain');
        changed = true;
      }
      if (rec && rec.includes('Chirag Jian')) {
        rec = rec.replace('Chirag Jian', 'Chirag Jain');
        changed = true;
      }
      return changed ? { ...pay, receivedBy: rec } : pay;
    });
  });
  const [recurringList, setRecurringList] = useState<RecurringSubscription[]>(() =>
    loadStoredData(STORAGE_KEYS.RECURRING, [])
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const data = loadStoredData<AuditLog[]>(STORAGE_KEYS.AUDIT, []);
    return data.map(log => {
      let changed = false;
      let name = log.userName;
      if (name && name.includes('Amit Bansal')) {
        name = name.replace('Amit Bansal', 'Chirag Jain');
        changed = true;
      }
      if (name && name.includes('Chirag Jian')) {
        name = name.replace('Chirag Jian', 'Chirag Jain');
        changed = true;
      }
      return changed ? { ...log, userName: name } : log;
    });
  });

  // UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  // Apply dark mode class to html and body elements
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    saveStoredData(STORAGE_KEYS.DARK_MODE, darkMode);
  }, [darkMode]);

  // Persist State Changes to LocalStorage
  useEffect(() => saveStoredData(STORAGE_KEYS.SETTINGS, settings), [settings]);
  useEffect(() => saveStoredData(STORAGE_KEYS.CUSTOMERS, customers), [customers]);
  useEffect(() => saveStoredData(STORAGE_KEYS.PETS, pets), [pets]);
  useEffect(() => saveStoredData(STORAGE_KEYS.INVOICES, invoices), [invoices]);
  useEffect(() => saveStoredData(STORAGE_KEYS.PAYMENTS, payments), [payments]);
  useEffect(() => saveStoredData(STORAGE_KEYS.RECURRING, recurringList), [recurringList]);
  useEffect(() => saveStoredData(STORAGE_KEYS.USERS, users), [users]);
  useEffect(() => saveStoredData(STORAGE_KEYS.ACTIVE_USER, currentUser), [currentUser]);

  // Global Keyboard Shortcuts (F2 for Search, Alt+N for New Invoice)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setShowGlobalSearch(true);
      } else if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditingInvoice(null);
        setShowInvoiceModal(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  // Action Handler: Role Switcher
  const handleSwitchRole = (newRole: UserRole) => {
    const updatedUser = { ...currentUser, role: newRole };
    setCurrentUser(updatedUser);
    createAuditLog(
      'ROLE_SWITCHED', 
      `Switched active role to ${newRole === 'ADMIN' ? 'Admin (CA/Owner)' : 'Billing Staff User'}`, 
      updatedUser
    );
    setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
  };

  // Action Handler: Save GST Invoice
  const handleSaveInvoice = (savedInv: Invoice) => {
    const exists = invoices.some(i => i.id === savedInv.id);
    let updatedInvoices: Invoice[];

    if (exists) {
      updatedInvoices = invoices.map(i => i.id === savedInv.id ? savedInv : i);
      createAuditLog('INVOICE_EDITED', `Updated Tax Invoice ${savedInv.invoiceNumber}`, currentUser);
    } else {
      updatedInvoices = [savedInv, ...invoices];
      createAuditLog('INVOICE_CREATED', `Created Tax Invoice ${savedInv.invoiceNumber} for ${savedInv.customerName} (₹ ${savedInv.grandTotal.toFixed(2)})`, currentUser);
    }

    setInvoices(updatedInvoices);

    // Update customer outstanding balance
    const updatedCustomers = customers.map(c => {
      if (c.id === savedInv.customerId) {
        return {
          ...c,
          outstandingBalance: c.outstandingBalance + savedInv.balanceDue
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);

    // If payment was collected at invoice creation, record payment log
    if (savedInv.paidAmount > 0) {
      const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const payLog: Payment = {
        id: `PAY-${Date.now().toString().slice(-4)}`,
        invoiceId: savedInv.id,
        invoiceNumber: savedInv.invoiceNumber,
        customerId: savedInv.customerId,
        customerName: savedInv.customerName,
        amount: savedInv.paidAmount,
        paymentDate: todayStr,
        paymentMode: savedInv.paymentMode,
        transactionRef: 'Collected at Invoice Generation',
        receivedBy: currentUser.name
      };
      setPayments([payLog, ...payments]);
    }

    setShowInvoiceModal(false);
    setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
  };

  // Action Handler: Cancel Invoice
  const handleCancelInvoice = (invoiceId: string) => {
    const target = invoices.find(i => i.id === invoiceId);
    if (!target) return;

    const updatedInvoices = invoices.map(i => {
      if (i.id === invoiceId) {
        return {
          ...i,
          isCancelled: true,
          paymentStatus: 'CANCELLED' as const,
          balanceDue: 0
        };
      }
      return i;
    });

    setInvoices(updatedInvoices);
    createAuditLog('INVOICE_CANCELLED', `Cancelled Tax Invoice ${target.invoiceNumber}`, currentUser);
    setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
  };

  // Action Handler: Delete Invoice
  const handleDeleteInvoice = (invoiceId: string) => {
    const target = invoices.find(i => i.id === invoiceId);
    if (!target) return;
    setInvoices(prev => prev.filter(i => i.id !== invoiceId));
    createAuditLog('INVOICE_CANCELLED' as any, `Deleted Tax Invoice ${target.invoiceNumber}`, currentUser);
    setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
  };

  // Action Handler: Record Payment against invoice
  const handleRecordPayment = (newPay: Payment) => {
    setPayments([newPay, ...payments]);

    // Update invoice balance
    const updatedInvoices = invoices.map(inv => {
      if (inv.id === newPay.invoiceId) {
        const newPaid = inv.paidAmount + newPay.amount;
        const newBal = Math.max(0, inv.grandTotal - newPaid);
        return {
          ...inv,
          paidAmount: newPaid,
          balanceDue: newBal,
          paymentStatus: (newBal === 0 ? 'PAID' : 'PARTIAL') as any
        };
      }
      return inv;
    });
    setInvoices(updatedInvoices);

    createAuditLog('PAYMENT_RECORDED', `Recorded payment ₹ ${newPay.amount} for Invoice ${newPay.invoiceNumber} via ${newPay.paymentMode}`, currentUser);
    setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
  };

  // Action Handler: Delete Payment
  const handleDeletePayment = (paymentId: string) => {
    const target = payments.find(p => p.id === paymentId);
    if (!target) return;
    setPayments(prev => prev.filter(p => p.id !== paymentId));
    createAuditLog('PAYMENT_RECORDED' as any, `Deleted Payment Record ${target.id} (₹${target.amount})`, currentUser);
    setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
  };

  // Action Handler: Add / Edit / Delete Customer
  const handleAddCustomer = (c: Customer) => {
    setCustomers([c, ...customers]);
    createAuditLog('CUSTOMER_ADDED', `Added Customer ${c.name} (${c.phone})`, currentUser);
    setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
  };

  const handleEditCustomer = (c: Customer) => {
    setCustomers(customers.map(existing => existing.id === c.id ? c : existing));
    createAuditLog('CUSTOMER_EDITED', `Updated Customer ${c.name}`, currentUser);
    setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
  };

  const handleDeleteCustomer = (customerId: string) => {
    const target = customers.find(c => c.id === customerId);
    if (!target) return;
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    createAuditLog('CUSTOMER_EDITED' as any, `Deleted Customer ${target.name}`, currentUser);
    setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
  };

  // Action Handler: Add / Edit / Delete Pet Profile & Boarding Status
  const handleAddPet = (p: Pet) => {
    setPets([p, ...pets]);
    createAuditLog('PET_ADDED', `Added Pet Profile ${p.name} (${p.breed})`, currentUser);
    setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
  };

  const handleEditPet = (p: Pet) => {
    setPets(pets.map(existing => existing.id === p.id ? p : existing));
    createAuditLog('PET_EDITED' as any, `Updated Pet Profile ${p.name}`, currentUser);
    setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
  };

  const handleDeletePet = (petId: string) => {
    const target = pets.find(p => p.id === petId);
    if (!target) return;
    setPets(prev => prev.filter(p => p.id !== petId));
    createAuditLog('PET_EDITED' as any, `Deleted Pet Profile ${target.name}`, currentUser);
    setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
  };

  const handleToggleBoarding = (petId: string, isCheckIn: boolean, roomNo?: string) => {
    const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const updatedPets = pets.map(p => {
      if (p.id === petId) {
        return {
          ...p,
          isBoardingNow: isCheckIn,
          checkInDate: isCheckIn ? todayStr : p.checkInDate,
          checkOutDate: !isCheckIn ? todayStr : p.checkOutDate,
          roomNo: isCheckIn ? roomNo || p.roomNo : p.roomNo
        };
      }
      return p;
    });

    setPets(updatedPets);
    const targetPet = pets.find(p => p.id === petId);
    createAuditLog(
      isCheckIn ? 'PET_CHECKIN' : 'PET_CHECKOUT',
      `${isCheckIn ? 'Checked-In' : 'Checked-Out'} pet "${targetPet?.name}" for boarding (${roomNo || 'Suite'})`,
      currentUser
    );
    setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
  };

  // Action Handler: Recurring billing auto-generation
  const handleAddRecurring = (sub: RecurringSubscription) => {
    setRecurringList([sub, ...recurringList]);
  };

  const handleGenerateInvoiceForRecurring = (sub: RecurringSubscription) => {
    const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const cust = customers.find(c => c.id === sub.customerId);

    const autoInv: Invoice = {
      id: `INV-${Date.now().toString().slice(-6)}`,
      invoiceNumber: `${settings.invoicePrefix}${Date.now().toString().slice(-6)}`,
      invoiceDate: todayStr,
      dueDate: todayStr,
      customerId: sub.customerId,
      customerName: sub.customerName,
      customerPhone: cust?.phone || '+91 98000 00000',
      customerEmail: cust?.email || '',
      customerAddress: cust?.address || 'Mumbai, MH',
      customerGSTIN: cust?.gstin || '',
      petId: sub.petId,
      petName: sub.petName,
      placeOfSupply: settings.stateCode,
      isInterState: false,
      items: [
        {
          id: 'ITEM-AUTO',
          type: 'SERVICE',
          name: sub.serviceName,
          hsnSac: '999799',
          price: sub.amount,
          qty: 1,
          discount: 0,
          discountAmount: 0,
          taxableValue: sub.amount,
          gstRate: 18,
          cgstRate: 9,
          cgstAmount: sub.amount * 0.09,
          sgstRate: 9,
          sgstAmount: sub.amount * 0.09,
          igstRate: 0,
          igstAmount: 0,
          total: sub.amount * 1.18
        }
      ],
      subTotal: sub.amount,
      totalDiscount: 0,
      taxableAmount: sub.amount,
      cgstTotal: sub.amount * 0.09,
      sgstTotal: sub.amount * 0.09,
      igstTotal: 0,
      totalGst: sub.amount * 0.18,
      roundOff: 0,
      grandTotal: Math.round(sub.amount * 1.18),
      paidAmount: 0,
      balanceDue: Math.round(sub.amount * 1.18),
      paymentStatus: 'UNPAID',
      paymentMode: 'UPI',
      notes: `Auto-generated recurring subscription invoice (${sub.frequency}).`,
      createdByRole: currentUser.role,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString()
    };

    handleSaveInvoice(autoInv);
    setActiveTab('invoices');
  };

  // Excel Full Export
  const handleExportFullExcel = () => {
    exportFullDatabaseToExcel({
      customers,
      pets,
      invoices,
      payments,
      users,
      settings,
      auditLogs,
      recurring: recurringList
    });
    createAuditLog('EXCEL_EXPORT', 'Exported complete 9-sheet Excel database workbook (.XLSX)', currentUser);
    setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
  };

  return (
    <div className="h-screen h-[100dvh] w-full bg-[#F8F9FA] dark:bg-[#121212] text-slate-900 dark:text-zinc-100 font-sans flex flex-col overflow-hidden">
      {/* Desktop & Mobile Top Window Navigation */}
      <TopBar
        currentUser={currentUser}
        onSwitchRole={handleSwitchRole}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenGlobalSearch={() => setShowGlobalSearch(true)}
        onOpenBarcodeScanner={() => setShowBarcodeScanner(true)}
        onOpenExcelBackup={handleExportFullExcel}
        onOpenNotificationCenter={() => setShowNotifications(true)}
        onOpenMobileDrawer={() => setShowMobileDrawer(true)}
        unreadAlertsCount={invoices.filter(i => !i.isCancelled && i.balanceDue > 0).length}
      />

      {/* Main Body Layout with Sidebar */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          userRole={currentUser.role}
          onNewInvoice={() => {
            setEditingInvoice(null);
            setShowInvoiceModal(true);
          }}
          pendingPaymentCount={invoices.filter(i => !i.isCancelled && i.balanceDue > 0).length}
          activeBoardingCount={pets.filter(p => p.isBoardingNow).length}
          isMobileDrawerOpen={showMobileDrawer}
          onCloseMobileDrawer={() => setShowMobileDrawer(false)}
          onOpenMobileDrawer={() => setShowMobileDrawer(true)}
        />

        {/* Dynamic Main Workspace Container */}
        <main className="flex-1 min-h-0 h-full w-full bg-[#F8F9FA] dark:bg-[#151515] overflow-y-auto overscroll-contain touch-pan-y pb-28 sm:pb-24 md:pb-8">
          {activeTab === 'dashboard' && (
            <Dashboard
              invoices={invoices}
              pets={pets}
              customers={customers}
              payments={payments}
              auditLogs={auditLogs}
              userRole={currentUser.role}
              onNewInvoice={() => {
                setEditingInvoice(null);
                setShowInvoiceModal(true);
              }}
              onNavigateTab={setActiveTab}
              onOpenBarcodeScanner={() => setShowBarcodeScanner(true)}
              onExportExcel={handleExportFullExcel}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoiceManagement
              invoices={invoices}
              customers={customers}
              pets={pets}
              settings={settings}
              userRole={currentUser.role}
              userName={currentUser.name}
              onOpenCreateModal={() => {
                setEditingInvoice(null);
                setShowInvoiceModal(true);
              }}
              onOpenEditModal={inv => {
                setEditingInvoice(inv);
                setShowInvoiceModal(true);
              }}
              onCancelInvoice={handleCancelInvoice}
              onDeleteInvoice={handleDeleteInvoice}
              onExportExcel={handleExportFullExcel}
            />
          )}

          {activeTab === 'recurring' && (
            <RecurringBilling
              recurringList={recurringList}
              customers={customers}
              pets={pets}
              userRole={currentUser.role}
              onGenerateInvoiceForRecurring={handleGenerateInvoiceForRecurring}
              onAddRecurring={handleAddRecurring}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerMaster
              customers={customers}
              pets={pets}
              onAddCustomer={handleAddCustomer}
              onEditCustomer={handleEditCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {activeTab === 'pets' && (
            <PetMaster
              pets={pets}
              customers={customers}
              onAddPet={handleAddPet}
              onEditPet={handleEditPet}
              onDeletePet={handleDeletePet}
              onToggleBoarding={handleToggleBoarding}
            />
          )}

          {activeTab === 'media' && (
            <MediaGallery
              pets={pets}
              customers={customers}
              invoices={invoices}
              payments={payments}
              onOpenNewInvoice={() => {
                setEditingInvoice(null);
                setShowInvoiceModal(true);
              }}
            />
          )}

          {activeTab === 'smart_import' && (
            <SmartImportEngine
              customers={customers}
              pets={pets}
              invoices={invoices}
              payments={payments}
              currentUser={currentUser}
              onImportSuccess={({ newCustomers, newPets, newInvoices, newPayments }) => {
                if (newCustomers.length > 0) {
                  setCustomers(prev => [...newCustomers, ...prev]);
                }
                if (newPets.length > 0) {
                  setPets(prev => [...newPets, ...prev]);
                }
                if (newInvoices.length > 0) {
                  setInvoices(prev => [...newInvoices, ...prev]);
                }
                if (newPayments.length > 0) {
                  setPayments(prev => [...newPayments, ...prev]);
                }
              }}
              onClearDataFirst={() => {
                setCustomers([]);
                setPets([]);
                setInvoices([]);
                setPayments([]);
              }}
              onAddAuditLog={(action, details) => {
                createAuditLog(action, details, currentUser);
              }}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentManagement
              payments={payments}
              invoices={invoices}
              customers={customers}
              userRole={currentUser.role}
              userName={currentUser.name}
              onRecordPayment={handleRecordPayment}
              onDeletePayment={handleDeletePayment}
            />
          )}

          {activeTab === 'gst_reports' && (
            <GSTReports
              invoices={invoices}
              payments={payments}
              customers={customers}
              pets={pets}
              settings={settings}
              isAdmin={currentUser.role === 'ADMIN'}
            />
          )}

          {activeTab === 'excel' && (
            <ExcelManager
              customers={customers}
              pets={pets}
              invoices={invoices}
              payments={payments}
              users={users}
              settings={settings}
              auditLogs={auditLogs}
              recurring={recurringList}
              onAddAuditLog={(action, details) => {
                createAuditLog(action, details, currentUser);
                setAuditLogs(loadStoredData(STORAGE_KEYS.AUDIT, []));
              }}
            />
          )}

          {activeTab === 'users' && (
            <UserManagement
              users={users}
              activeUser={currentUser}
              onSwitchUserRole={handleSwitchRole}
              onAddUser={u => setUsers([...users, u])}
            />
          )}

          {activeTab === 'audit' && (
            <AuditLogs auditLogs={auditLogs} />
          )}

          {activeTab === 'settings' && (
            <SettingsModal
              settings={settings}
              onUpdateSettings={setSettings}
              onFactoryReset={factoryResetDatabase}
            />
          )}
        </main>
      </div>

      {/* Footer Status Bar */}
      <Footer 
        currentUser={currentUser}
        onOpenExcelManager={() => setActiveTab('excel')}
      />

      {/* Modals Container */}
      {showInvoiceModal && (
        <InvoiceModal
          invoice={editingInvoice}
          customers={customers}
          pets={pets}
          settings={settings}
          userRole={currentUser.role}
          userName={currentUser.name}
          onSaveInvoice={handleSaveInvoice}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {showBarcodeScanner && (
        <BarcodeScannerModal
          onClose={() => setShowBarcodeScanner(false)}
          onSelectProductBarcode={catItem => {
            setShowInvoiceModal(true);
          }}
        />
      )}

      {showGlobalSearch && (
        <GlobalSearchModal
          invoices={invoices}
          customers={customers}
          pets={pets}
          onClose={() => setShowGlobalSearch(false)}
          onSelectInvoice={inv => {
            setActiveTab('invoices');
          }}
          onSelectCustomer={() => setActiveTab('customers')}
          onSelectPet={() => setActiveTab('pets')}
        />
      )}

      {showNotifications && (
        <NotificationPanel
          invoices={invoices}
          payments={payments}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
}
