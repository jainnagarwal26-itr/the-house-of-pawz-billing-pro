import React, { useState, useEffect } from 'react';
import { 
  User, UserRole, Customer, Pet, Invoice, Payment, 
  RecurringSubscription, AuditLog, CompanySettings, CatalogItem, CommunicationRecord 
} from './types';
import { 
  DEFAULT_COMPANY_SETTINGS, SYSTEM_USERS, 
  STORAGE_KEYS, loadStoredData, saveStoredData, factoryResetDatabase, cleanupObsoleteCache 
} from './lib/storage';
import { exportFullDatabaseToExcel } from './lib/excelHelper';

import { TopBar, DatabaseSyncStatus } from './components/TopBar';
import { Sidebar, ActiveTab, isTabAllowedForUser } from './components/Sidebar';
import { hasPermission } from './lib/permissions';
import { Dashboard } from './components/Dashboard';
import { InvoiceManagement } from './components/InvoiceManagement';
import { InvoiceModal } from './components/InvoiceModal';
import { RecurringBilling } from './components/RecurringBilling';
import { CustomerMaster } from './components/CustomerMaster';
import { PetMaster } from './components/PetMaster';
import { CommunicationCentre } from './components/CommunicationCentre';
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
import { LoginModal } from './components/LoginModal';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { Footer } from './components/Footer';

// Supabase Production Services
import { fetchActiveSessionUser, logoutSupabase } from './lib/authService';
import { fetchCustomersFromSupabase, createCustomerInSupabase, updateCustomerInSupabase, deleteCustomerFromSupabase } from './lib/customerService';
import { fetchPetsFromSupabase, createPetInSupabase, updatePetInSupabase, deletePetFromSupabase } from './lib/petService';
import { fetchInvoicesFromSupabase, createInvoiceInSupabase, cancelInvoiceInSupabase, deleteInvoiceFromSupabase, fetchNextInvoiceNumberFromDB } from './lib/invoiceService';
import { executeLiveProductionImport } from './lib/migrationService';
import { fetchPaymentsFromSupabase, recordPaymentInSupabase } from './lib/paymentService';
import { fetchCompanySettingsFromSupabase, updateCompanySettingsInSupabase } from './lib/settingsService';
import { fetchUsersFromSupabase, updateUserPermissionInSupabase, updateUserRoleInSupabase } from './lib/userService';
import { fetchAuditLogsFromSupabase, logAuditEventToSupabase } from './lib/auditService';

export default function App() {
  // Database Connection State
  const [syncStatus, setSyncStatus] = useState<DatabaseSyncStatus>('syncing');

  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => 
    loadStoredData(STORAGE_KEYS.DARK_MODE, false)
  );

  // Authenticated Session State
  const [session, setSession] = useState<User | null>(() => {
    return loadStoredData<User | null>(STORAGE_KEYS.SESSION, null);
  });
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Active Users List State
  const [users, setUsers] = useState<User[]>(SYSTEM_USERS);

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const active = loadStoredData<User | null>(STORAGE_KEYS.SESSION, null);
    if (active) return active;
    return SYSTEM_USERS[0];
  });

  // Keep currentUser in sync with session
  useEffect(() => {
    if (session) {
      setCurrentUser(session);
      saveStoredData(STORAGE_KEYS.SESSION, session);
    }
  }, [session]);

  // Settings State
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);

  // Core Data Collections
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [recurringList, setRecurringList] = useState<RecurringSubscription[]>(() =>
    loadStoredData(STORAGE_KEYS.RECURRING, [])
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [communicationHistory, setCommunicationHistory] = useState<CommunicationRecord[]>(() => 
    loadStoredData('hop_communications_v2', [])
  );

  // ─── SUPABASE INITIAL DATA LOAD ────────────────────────
  const loadProductionDataFromSupabase = async () => {
    setSyncStatus('syncing');
    try {
      // 1. Check Auth Session
      const activeUser = await fetchActiveSessionUser();
      if (activeUser) {
        setSession(activeUser);
        setCurrentUser(activeUser);
      }

      // 2. Load all Production Tables in Parallel
      const [
        dbCustomers,
        dbPets,
        dbInvoices,
        dbPayments,
        dbSettings,
        dbUsers,
        dbAuditLogs
      ] = await Promise.all([
        fetchCustomersFromSupabase(),
        fetchPetsFromSupabase(),
        fetchInvoicesFromSupabase(),
        fetchPaymentsFromSupabase(),
        fetchCompanySettingsFromSupabase(),
        fetchUsersFromSupabase(),
        fetchAuditLogsFromSupabase()
      ]);

      if (dbCustomers.length > 0) setCustomers(dbCustomers);
      if (dbPets.length > 0) setPets(dbPets);
      if (dbInvoices.length > 0) setInvoices(dbInvoices);
      if (dbPayments.length > 0) setPayments(dbPayments);
      if (dbSettings) setSettings(dbSettings);
      if (dbUsers.length > 0) setUsers(dbUsers);
      if (dbAuditLogs.length > 0) setAuditLogs(dbAuditLogs);

      // NOTE: Historical migration (Invoices 000001–000067) is complete.
      // The auto-trigger has been intentionally removed. Do NOT re-add it.

      setSyncStatus('connected');
    } catch (err) {
      console.error('Error connecting to Supabase database:', err);
      setSyncStatus('offline');
    }
  };

  useEffect(() => {
    loadProductionDataFromSupabase();
  }, []);

  // Strict Route / Module Level Security Enforcement
  useEffect(() => {
    if (session && !isTabAllowedForUser(activeTab, session)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, session]);

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

  // Authentication & Session Handlers
  const handleLoginSuccess = (user: User, remember: boolean) => {
    setSession(user);
    setCurrentUser(user);
    if (remember) {
      saveStoredData(STORAGE_KEYS.SESSION, user);
    }
    logAuditEventToSupabase('USER_LOGIN', `Successful login by ${user.name} (${user.role})`);
    loadProductionDataFromSupabase();
  };

  const handleLogout = async () => {
    if (session) {
      logAuditEventToSupabase('USER_LOGOUT', `Logged out of session (${session.name})`);
    }
    await logoutSupabase();
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    setSession(null);
  };

  const handlePasswordResetSuccess = (updatedUser: User) => {
    const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsers(updatedUsers);
    setShowForgotPassword(false);
    logAuditEventToSupabase('PASSWORD_RESET', `Password reset for account ${updatedUser.name} (${updatedUser.username})`);
  };

  // Action Handler: Role Switcher
  const handleSwitchRole = async (newRole: UserRole) => {
    const updatedUser = { ...currentUser, role: newRole };
    setCurrentUser(updatedUser);
    logAuditEventToSupabase(
      'ROLE_SWITCHED', 
      `Switched active role to ${newRole === 'ADMIN' ? 'Admin (CA/Owner)' : 'Billing Staff User'}`
    );
  };

  // Action Handler: Save GST Invoice
  const handleSaveInvoice = async (savedInv: Invoice) => {
    const isEdit = invoices.some(i => i.id === savedInv.id);
    const requiredPermission = isEdit ? 'invoices_edit' : 'invoices_create';
    if (!hasPermission(currentUser, requiredPermission)) {
      throw new Error(`Access Denied: You do not have permission to ${isEdit ? 'edit' : 'create'} invoices.`);
    }

    const res = await createInvoiceInSupabase(savedInv);
    if (res.error) {
      // Throw so InvoiceModal's try/catch catches it and shows validationError
      // (isSubmitting will be unlocked in finally, allowing retry)
      throw new Error(`Error saving invoice to Supabase: ${res.error}`);
    }

    logAuditEventToSupabase('INVOICE_CREATED', `Created Tax Invoice ${savedInv.invoiceNumber} for ${savedInv.customerName} (₹ ${savedInv.grandTotal.toFixed(2)})`);

    // Refresh Invoices, Customers, Payments from Supabase
    const [freshInvs, freshCusts, freshPays] = await Promise.all([
      fetchInvoicesFromSupabase(),
      fetchCustomersFromSupabase(),
      fetchPaymentsFromSupabase()
    ]);
    if (freshInvs.length > 0) setInvoices(freshInvs);
    if (freshCusts.length > 0) setCustomers(freshCusts);
    if (freshPays.length > 0) setPayments(freshPays);

    setShowInvoiceModal(false);
  };

  // Action Handler: Cancel Invoice
  const handleCancelInvoice = async (invoiceId: string) => {
    if (!hasPermission(currentUser, 'invoices_cancel')) {
      alert('Access Denied: You do not have permission to cancel invoices.');
      return;
    }
    const target = invoices.find(i => i.id === invoiceId);
    if (!target) return;

    const res = await cancelInvoiceInSupabase(invoiceId, 'Cancelled from UI');
    if (res.error) {
      alert(`Error cancelling invoice: ${res.error}`);
      return;
    }

    logAuditEventToSupabase('INVOICE_CANCELLED', `Cancelled Tax Invoice ${target.invoiceNumber}`);
    const freshInvs = await fetchInvoicesFromSupabase();
    setInvoices(freshInvs);
  };

  // Action Handler: Delete Invoice
  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!hasPermission(currentUser, 'invoices_delete')) {
      alert('Access Denied: You do not have permission to delete invoices.');
      return;
    }
    const target = invoices.find(i => i.id === invoiceId);
    if (!target) return;

    const res = await deleteInvoiceFromSupabase(invoiceId);
    if (res.error) {
      alert(`Error deleting invoice: ${res.error}`);
      return;
    }

    logAuditEventToSupabase('INVOICE_CANCELLED' as any, `Deleted Tax Invoice ${target.invoiceNumber}`);
    const freshInvs = await fetchInvoicesFromSupabase();
    setInvoices(freshInvs);
  };

  // Action Handler: Record Payment against invoice
  const handleRecordPayment = async (newPay: Payment) => {
    if (!hasPermission(currentUser, 'payments_record')) {
      alert('Access Denied: You do not have permission to record payments.');
      return;
    }

    const res = await recordPaymentInSupabase(newPay);
    if (res.error) {
      alert(`Error recording payment: ${res.error}`);
      return;
    }

    logAuditEventToSupabase('PAYMENT_RECORDED', `Recorded payment ₹ ${newPay.amount} for Invoice ${newPay.invoiceNumber} via ${newPay.paymentMode}`);

    const [freshInvs, freshPays] = await Promise.all([
      fetchInvoicesFromSupabase(),
      fetchPaymentsFromSupabase()
    ]);
    if (freshInvs.length > 0) setInvoices(freshInvs);
    if (freshPays.length > 0) setPayments(freshPays);
  };

  // Action Handler: Delete Payment
  const handleDeletePayment = async (paymentId: string) => {
    if (!hasPermission(currentUser, 'payments_delete')) {
      alert('Access Denied: You do not have permission to delete payment records.');
      return;
    }
    const target = payments.find(p => p.id === paymentId);
    if (!target) return;

    logAuditEventToSupabase('PAYMENT_RECORDED' as any, `Deleted Payment Record ${target.id} (₹${target.amount})`);
    const freshPays = await fetchPaymentsFromSupabase();
    setPayments(freshPays);
  };

  // Action Handler: Add / Edit / Delete Customer
  const handleAddCustomer = async (c: Customer) => {
    if (!hasPermission(currentUser, 'customers_create')) {
      alert('Access Denied: You do not have permission to add new customers.');
      return;
    }
    const res = await createCustomerInSupabase(c);
    if (res.error) {
      alert(`Error adding customer: ${res.error}`);
      return;
    }
    logAuditEventToSupabase('CUSTOMER_ADDED', `Added Customer ${c.name} (${c.phone})`);
    const freshCusts = await fetchCustomersFromSupabase();
    setCustomers(freshCusts);
  };

  const handleEditCustomer = async (c: Customer) => {
    if (!hasPermission(currentUser, 'customers_edit')) {
      alert('Access Denied: You do not have permission to edit customer records.');
      return;
    }
    const res = await updateCustomerInSupabase(c.id, c);
    if (res.error) {
      alert(`Error updating customer: ${res.error}`);
      return;
    }
    logAuditEventToSupabase('CUSTOMER_EDITED', `Updated Customer ${c.name}`);
    const freshCusts = await fetchCustomersFromSupabase();
    setCustomers(freshCusts);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!hasPermission(currentUser, 'customers_delete')) {
      alert('Access Denied: You do not have permission to delete customer records.');
      return;
    }
    const target = customers.find(c => c.id === customerId);
    if (!target) return;

    const res = await deleteCustomerFromSupabase(customerId);
    if (res.error) {
      alert(`Error deleting customer: ${res.error}`);
      return;
    }
    logAuditEventToSupabase('CUSTOMER_EDITED' as any, `Deleted Customer ${target.name}`);
    const freshCusts = await fetchCustomersFromSupabase();
    setCustomers(freshCusts);
  };

  // Action Handler: Add / Edit / Delete Pet Profile & Boarding Status
  const handleAddPet = async (p: Pet) => {
    if (!hasPermission(currentUser, 'pets_create')) {
      alert('Access Denied: You do not have permission to add pet profiles.');
      return;
    }
    const res = await createPetInSupabase(p);
    if (res.error) {
      alert(`Error adding pet: ${res.error}`);
      return;
    }
    logAuditEventToSupabase('PET_ADDED', `Added Pet Profile ${p.name} (${p.breed})`);
    const freshPets = await fetchPetsFromSupabase();
    setPets(freshPets);
  };

  const handleEditPet = async (p: Pet) => {
    if (!hasPermission(currentUser, 'pets_edit')) {
      alert('Access Denied: You do not have permission to edit pet profiles.');
      return;
    }
    const res = await updatePetInSupabase(p.id, p);
    if (res.error) {
      alert(`Error updating pet: ${res.error}`);
      return;
    }
    logAuditEventToSupabase('PET_EDITED' as any, `Updated Pet Profile ${p.name}`);
    const freshPets = await fetchPetsFromSupabase();
    setPets(freshPets);
  };

  const handleDeletePet = async (petId: string) => {
    if (!hasPermission(currentUser, 'pets_delete')) {
      alert('Access Denied: You do not have permission to delete pet profiles.');
      return;
    }
    const target = pets.find(p => p.id === petId);
    if (!target) return;

    const res = await deletePetFromSupabase(petId);
    if (res.error) {
      alert(`Error deleting pet: ${res.error}`);
      return;
    }
    logAuditEventToSupabase('PET_EDITED' as any, `Deleted Pet Profile ${target.name}`);
    const freshPets = await fetchPetsFromSupabase();
    setPets(freshPets);
  };

  const handleToggleBoarding = async (petId: string, isCheckIn: boolean, roomNo?: string) => {
    const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const targetPet = pets.find(p => p.id === petId);

    const updates = {
      isBoardingNow: isCheckIn,
      checkInDate: isCheckIn ? todayStr : targetPet?.checkInDate,
      checkOutDate: !isCheckIn ? todayStr : targetPet?.checkOutDate,
      roomNo: isCheckIn ? roomNo || targetPet?.roomNo : targetPet?.roomNo
    };

    await updatePetInSupabase(petId, updates);
    logAuditEventToSupabase(
      isCheckIn ? 'PET_CHECKIN' : 'PET_CHECKOUT',
      `${isCheckIn ? 'Checked-In' : 'Checked-Out'} pet "${targetPet?.name}" for boarding (${roomNo || 'Suite'})`
    );
    const freshPets = await fetchPetsFromSupabase();
    setPets(freshPets);
  };

  // Action Handler: Recurring billing auto-generation
  const handleAddRecurring = (sub: RecurringSubscription) => {
    const updated = [sub, ...recurringList];
    setRecurringList(updated);
    saveStoredData(STORAGE_KEYS.RECURRING, updated);
  };

  // IMPORTANT: async — invoice number comes exclusively from the DB RPC, never from Date.now()
  const handleGenerateInvoiceForRecurring = async (sub: RecurringSubscription) => {
    const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const cust = customers.find(c => c.id === sub.customerId);

    // Always obtain invoice number from the Supabase sequence RPC
    const nextInvNumber = await fetchNextInvoiceNumberFromDB('26-27');

    const autoInv: Invoice = {
      id: `INV-REC-${Date.now().toString().slice(-8)}`,
      invoiceNumber: nextInvNumber,
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
          id: `ITEM-REC-${Date.now().toString().slice(-8)}`,
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

    await handleSaveInvoice(autoInv);
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
    logAuditEventToSupabase('EXCEL_EXPORT', 'Exported complete 9-sheet Excel database workbook (.XLSX)');
  };

  // Save Settings Handler
  const handleSaveSettings = async (updatedSettings: CompanySettings) => {
    setSettings(updatedSettings);
    await updateCompanySettingsInSupabase(updatedSettings);
    logAuditEventToSupabase('SETTINGS_UPDATED', `Updated company software settings`);
  };

  // If user is not authenticated, show Login Screen / Forgot Password Modal
  if (!session) {
    return (
      <div className="h-screen w-full bg-slate-950">
        <LoginModal
          users={users}
          onLoginSuccess={handleLoginSuccess}
          onOpenForgotPassword={() => setShowForgotPassword(true)}
        />
        {showForgotPassword && (
          <ForgotPasswordModal
            users={users}
            onResetSuccess={handlePasswordResetSuccess}
            onClose={() => setShowForgotPassword(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] w-full bg-[#F8F9FA] dark:bg-[#121212] text-slate-900 dark:text-zinc-100 font-sans flex flex-col overflow-hidden">
      {/* Top Window Navigation Bar */}
      <TopBar
        currentUser={currentUser}
        onSwitchRole={handleSwitchRole}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenGlobalSearch={() => setShowGlobalSearch(true)}
        onOpenBarcodeScanner={() => setShowBarcodeScanner(true)}
        onOpenExcelBackup={handleExportFullExcel}
        onOpenNotificationCenter={() => setShowNotifications(true)}
        onOpenMobileDrawer={() => setShowMobileDrawer(true)}
        unreadAlertsCount={invoices.filter(i => !i.isCancelled && i.balanceDue > 0).length}
        syncStatus={syncStatus}
      />

      {/* Main Body Layout with Sidebar */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          userRole={currentUser.role}
          user={currentUser}
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
              currentUser={currentUser}
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
              currentUser={currentUser}
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
              currentUser={currentUser}
              onAddCustomer={handleAddCustomer}
              onEditCustomer={handleEditCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {activeTab === 'pets' && (
            <PetMaster
              pets={pets}
              customers={customers}
              currentUser={currentUser}
              onAddPet={handleAddPet}
              onEditPet={handleEditPet}
              onDeletePet={handleDeletePet}
              onToggleBoarding={handleToggleBoarding}
            />
          )}

          {activeTab === 'communication' && (
            <CommunicationCentre
              invoices={invoices}
              payments={payments}
              customers={customers}
              pets={pets}
              settings={settings}
              currentUser={currentUser}
              onAddAuditLog={(action, details) => {
                logAuditEventToSupabase(action, details);
              }}
              historyRecords={communicationHistory}
              onAddHistoryRecord={(record) => {
                const updated = [record, ...communicationHistory];
                setCommunicationHistory(updated);
                saveStoredData('hop_communications_v2', updated);
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
                loadProductionDataFromSupabase();
              }}
              onClearDataFirst={() => {
                setCustomers([]);
                setPets([]);
                setInvoices([]);
                setPayments([]);
              }}
              onAddAuditLog={(action, details) => {
                logAuditEventToSupabase(action, details);
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
              currentUser={currentUser}
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
              currentUser={currentUser}
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
              currentUser={currentUser}
              onAddAuditLog={(action, details) => {
                logAuditEventToSupabase(action, details);
              }}
            />
          )}

          {activeTab === 'users' && (
            <UserManagement
              users={users}
              activeUser={currentUser}
              onSwitchUserRole={handleSwitchRole}
              onAddUser={async u => {
                await updateUserRoleInSupabase(u.id, u.role);
                const freshUsers = await fetchUsersFromSupabase();
                setUsers(freshUsers);
              }}
              onUpdateUser={async u => {
                // Save updated user permissions / role to Supabase
                if (u.permissions) {
                  for (const [key, val] of Object.entries(u.permissions)) {
                    await updateUserPermissionInSupabase(u.id, key, val as boolean);
                  }
                }
                await updateUserRoleInSupabase(u.id, u.role);

                const freshUsers = await fetchUsersFromSupabase();
                setUsers(freshUsers);

                if (session && (session.id === u.id || session.username.toLowerCase() === u.username.toLowerCase())) {
                  const updatedActive = freshUsers.find(fu => fu.id === u.id || fu.username.toLowerCase() === u.username.toLowerCase());
                  if (updatedActive) {
                    setSession(updatedActive);
                    setCurrentUser(updatedActive);
                  }
                }

                logAuditEventToSupabase(
                  'ROLE_SWITCHED' as any,
                  `ADMIN ${currentUser.name} updated permissions for ${u.name} (${u.role})`
                );
              }}
            />
          )}

          {activeTab === 'audit' && (
            <AuditLogs auditLogs={auditLogs} currentUser={currentUser} />
          )}

          {activeTab === 'settings' && (
            <SettingsModal
              settings={settings}
              currentUser={currentUser}
              onUpdateSettings={handleSaveSettings}
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
          allInvoices={invoices}
          customers={customers}
          pets={pets}
          settings={settings}
          userRole={currentUser.role}
          userName={currentUser.name}
          onSaveInvoice={handleSaveInvoice}
          onAddCustomer={handleAddCustomer}
          onAddPet={handleAddPet}
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
