import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, QrCode, Search, Calculator, 
  CheckCircle2, AlertCircle, ShieldAlert, Sparkles, Loader2
} from 'lucide-react';
import { 
  Invoice, InvoiceItem, Customer, Pet, CatalogItem, 
  CompanySettings, UserRole, formatINR, PaymentStatus, PaymentMode, User,
  ServiceCatalogItem, ServicePackageMaster, PickDropBooking, LongTermContract
} from '../types';
import { CATALOG_ITEMS } from '../lib/storage';
import { hasPermission } from '../lib/permissions';
import { fetchNextInvoiceNumberFromDB } from '../lib/invoiceService';

interface InvoiceModalProps {
  invoice?: Invoice | null;
  allInvoices?: Invoice[];
  customers: Customer[];
  pets: Pet[];
  services?: ServiceCatalogItem[];
  packages?: ServicePackageMaster[];
  longTermPackages?: LongTermContract[];
  pickDropBookings?: PickDropBooking[];
  settings: CompanySettings;
  userRole?: UserRole;
  userName?: string;
  currentUser?: User | null;
  onSaveInvoice: (invoice: Invoice) => void;
  onAddCustomer?: (customer: Customer) => void;
  onAddPet?: (pet: Pet) => void;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoice,
  allInvoices = [],
  customers,
  pets,
  services = [],
  packages = [],
  longTermPackages = [],
  pickDropBookings = [],
  settings,
  userRole = 'USER',
  userName = 'Billing Staff',
  currentUser,
  onSaveInvoice,
  onAddCustomer,
  onAddPet,
  onClose
}) => {
  const isEditing = !!invoice;
  const isAdmin = userRole === 'ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ACCOUNTANT';
  const canEditInvoiceNumber = hasPermission(currentUser, 'invoices_change_number');

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    invoice?.customerId || (customers[0]?.id || '')
  );
  const [customerName, setCustomerName] = useState<string>(invoice?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(invoice?.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(invoice?.customerEmail || '');
  const [customerAddress, setCustomerAddress] = useState<string>(invoice?.customerAddress || '');
  const [customerGSTIN, setCustomerGSTIN] = useState<string>(invoice?.customerGSTIN || '');

  // Quick Customer Create State
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustGSTIN, setNewCustGSTIN] = useState('');

  // Quick Pet Create State
  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newPetSpecies, setNewPetSpecies] = useState<'Dog' | 'Cat' | 'Other'>('Dog');
  const [newPetBreed, setNewPetBreed] = useState('');
  const [newPetAge, setNewPetAge] = useState('');
  const [newPetGender, setNewPetGender] = useState<'Male' | 'Female'>('Male');

  // Multi-Pet Selection State
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>(
    invoice?.petId ? [invoice.petId] : []
  );

  // Quick Create Customer Handler
  const handleQuickCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert('Please enter Customer Name and Phone Number.');
      return;
    }
    const newCust: Customer = {
      id: `CUST-${Date.now().toString().slice(-4)}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      email: newCustEmail.trim() || `${newCustName.trim().toLowerCase().replace(/\s+/g, '.')}@example.com`,
      address: newCustAddress.trim() || 'Mumbai, Maharashtra',
      gstin: newCustGSTIN.trim() || undefined,
      stateCode: settings.stateCode || '27-Maharashtra',
      emergencyContact: newCustPhone.trim(),
      outstandingBalance: 0,
      advanceBalance: 0,
      customerType: 'INDIVIDUAL',
      createdAt: new Date().toLocaleDateString('en-IN')
    };

    if (onAddCustomer) {
      onAddCustomer(newCust);
    }
    setSelectedCustomerId(newCust.id);
    setCustomerName(newCust.name);
    setCustomerPhone(newCust.phone);
    setCustomerEmail(newCust.email || '');
    setCustomerAddress(newCust.address);
    setCustomerGSTIN(newCust.gstin || '');

    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewCustAddress('');
    setNewCustGSTIN('');
    setShowAddCustModal(false);
  };

  // Quick Create Pet Handler
  const handleQuickCreatePet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPetName.trim()) {
      alert('Please enter Pet Name.');
      return;
    }
    const currentCust = customers.find(c => c.id === selectedCustomerId);
    const newPet: Pet = {
      id: `PET-${Date.now().toString().slice(-4)}`,
      customerId: selectedCustomerId,
      customerName: currentCust?.name || customerName,
      name: newPetName.trim(),
      species: newPetSpecies,
      breed: newPetBreed.trim() || 'Standard',
      age: newPetAge.trim() || '2 Years',
      gender: newPetGender,
      vaccinationStatus: 'Up to Date',
      isBoardingNow: false
    };

    if (onAddPet) {
      onAddPet(newPet);
    }
    setSelectedPetId(newPet.id);
    setPetName(newPet.name);
    setSelectedPetIds(prev => Array.from(new Set([...prev, newPet.id])));

    setNewPetName('');
    setShowAddPetModal(false);
  };

  // Selected Pet State
  const [selectedPetId, setSelectedPetId] = useState<string>(invoice?.petId || '');
  const [petName, setPetName] = useState<string>(invoice?.petName || '');

  // Invoice Meta
  // NEW INVOICE: number starts empty ('') then is immediately populated
  // via the Supabase RPC in the useEffect below.
  // EDIT INVOICE: use the existing invoiceNumber from the invoice prop.
  // NEVER use Date.now() or Math.random() for invoice numbering.
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    invoice?.invoiceNumber || ''
  );
  const [invoiceNumberLoading, setInvoiceNumberLoading] = useState<boolean>(!invoice);
  const [validationError, setValidationError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // On mount: fetch the next invoice number from Supabase RPC (new invoices only)
  useEffect(() => {
    if (!invoice) {
      // Fetch from DB — fail-closed
      fetchNextInvoiceNumberFromDB('26-27')
        .then(num => {
          setInvoiceNumber(num);
          setInvoiceNumberLoading(false);
        })
        .catch(err => {
          setInvoiceNumberLoading(false);
          setValidationError(
            'Could not fetch a secure invoice number from the database. Please close and reopen this form, or contact Admin.'
          );
          console.error('[InvoiceModal] RPC fetchNextInvoiceNumberFromDB failed:', err);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const [invoiceDate, setInvoiceDate] = useState<string>(invoice?.invoiceDate || todayStr);
  const [dueDate, setDueDate] = useState<string>(invoice?.dueDate || todayStr);
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(invoice?.placeOfSupply || settings.stateCode);
  const [isInterState, setIsInterState] = useState<boolean>(invoice?.isInterState || false);

  // Line Items
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items || [
    {
      id: 'ITEM-1',
      type: 'SERVICE',
      name: '',
      hsnSac: '999799',
      price: 0,
      qty: 1,
      discount: 0,
      discountAmount: 0,
      taxableValue: 0,
      gstRate: 18,
      cgstRate: 9,
      cgstAmount: 0,
      sgstRate: 9,
      sgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      total: 0
    }
  ]);

  // Payment Status
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(invoice?.paymentStatus || 'PAID');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(invoice?.paymentMode || 'UPI');
  const [paidAmountInput, setPaidAmountInput] = useState<number>(invoice?.paidAmount || 0);
  const [notes, setNotes] = useState<string>(invoice?.notes || 'Services provided at The House of Pawz.');

  // Quick Catalog Picker State
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // Auto handle Customer selection update
  useEffect(() => {
    const found = customers.find(c => c.id === selectedCustomerId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      setCustomerEmail(found.email);
      setCustomerAddress(found.address);
      setCustomerGSTIN(found.gstin || '');

      // Auto update linked pet
      const linkedPets = pets.filter(p => p.customerId === found.id);
      if (linkedPets.length > 0) {
        setSelectedPetId(linkedPets[0].id);
        setPetName(linkedPets[0].name);
      } else {
        setSelectedPetId('');
        setPetName('');
      }
    }
  }, [selectedCustomerId, customers, pets]);

  // Recalculate item taxes
  const calculateItem = (
    price: number, 
    qty: number, 
    discountPct: number, 
    gstRate: number, 
    interState: boolean
  ) => {
    const gross = price * qty;
    const discountAmount = (gross * discountPct) / 100;
    const taxableValue = Math.max(0, gross - discountAmount);

    let cgstRate = 0, sgstRate = 0, igstRate = 0;
    let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

    if (interState) {
      igstRate = gstRate;
      igstAmount = (taxableValue * igstRate) / 100;
    } else {
      cgstRate = gstRate / 2;
      sgstRate = gstRate / 2;
      cgstAmount = (taxableValue * cgstRate) / 100;
      sgstAmount = (taxableValue * sgstRate) / 100;
    }

    const total = taxableValue + cgstAmount + sgstAmount + igstAmount;

    return {
      discountAmount,
      taxableValue,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      total
    };
  };

  // Item field change handler
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const curr = { ...updated[index], [field]: value };

    // If price, qty, discount, or gstRate changed, recalculate
    if (['price', 'qty', 'discount', 'gstRate'].includes(field as string)) {
      const calc = calculateItem(
        Number(curr.price) || 0,
        Number(curr.qty) || 1,
        Number(curr.discount) || 0,
        Number(curr.gstRate) || 18,
        isInterState
      );
      Object.assign(curr, calc);
    }

    updated[index] = curr;
    setItems(updated);
  };

  // Add Item from Catalog
  const addCatalogItem = (catItem: CatalogItem) => {
    const calc = calculateItem(catItem.price, 1, 0, catItem.gstRate, isInterState);
    const newItem: InvoiceItem = {
      id: `ITEM-${Date.now().toString().slice(-4)}`,
      catalogItemId: catItem.id,
      type: catItem.type,
      name: catItem.name,
      hsnSac: catItem.hsnSac,
      price: catItem.price,
      qty: 1,
      discount: 0,
      discountAmount: calc.discountAmount,
      taxableValue: calc.taxableValue,
      gstRate: catItem.gstRate,
      cgstRate: calc.cgstRate,
      cgstAmount: calc.cgstAmount,
      sgstRate: calc.sgstRate,
      sgstAmount: calc.sgstAmount,
      igstRate: calc.igstRate,
      igstAmount: calc.igstAmount,
      total: calc.total
    };

    setItems([...items, newItem]);
  };

  // Remove Item
  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Invoice Total Calculations
  const subTotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const taxableAmount = items.reduce((sum, item) => sum + item.taxableValue, 0);
  const cgstTotal = items.reduce((sum, item) => sum + item.cgstAmount, 0);
  const sgstTotal = items.reduce((sum, item) => sum + item.sgstAmount, 0);
  const igstTotal = items.reduce((sum, item) => sum + item.igstAmount, 0);
  const totalGst = cgstTotal + sgstTotal + igstTotal;

  const rawGrandTotal = taxableAmount + totalGst;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));

  // Handle Payment Status change & auto update paidAmount
  useEffect(() => {
    if (paymentStatus === 'PAID') {
      setPaidAmountInput(grandTotal);
    } else if (paymentStatus === 'UNPAID') {
      setPaidAmountInput(0);
    }
  }, [paymentStatus, grandTotal]);

  const balanceDue = Math.max(0, grandTotal - paidAmountInput);

  // Form Submission — async with double-submit protection
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Double-submit guard
    if (isSubmitting) return;

    setValidationError('');

    const cleanNum = invoiceNumber.trim();

    // Reject if invoice number is not yet loaded (RPC still in progress)
    if (!cleanNum || invoiceNumberLoading) {
      setValidationError('Invoice number is still being fetched from the database. Please wait a moment and try again.');
      return;
    }

    // Reject if number looks invalid (basic format guard)
    if (!isEditing && !cleanNum.startsWith('HOP/')) {
      setValidationError('Invoice number format is invalid. Please close and reopen this form.');
      return;
    }

    // Safety Rule #3: Duplicate Invoice Number Uniqueness Validation
    if (allInvoices && allInvoices.length > 0) {
      const duplicate = allInvoices.find(inv =>
        inv.invoiceNumber.trim().toLowerCase() === cleanNum.toLowerCase() && inv.id !== invoice?.id
      );
      if (duplicate) {
        setValidationError('Invoice number already exists. Please enter a unique invoice number.');
        return;
      }
    }

    // Confirmation if changing existing invoice number
    if (invoice && invoice.invoiceNumber !== cleanNum) {
      const confirmed = window.confirm(
        `Are you sure you want to change the Invoice Number from "${invoice.invoiceNumber}" to "${cleanNum}"?`
      );
      if (!confirmed) return;
    }

    // Lock — prevent double-submit
    setIsSubmitting(true);
    try {
      const savedInvoice: Invoice = {
        id: invoice?.id || `INV-${Date.now().toString().slice(-10)}`,
        invoiceNumber: cleanNum,
        invoiceDate,
        dueDate,
        customerId: selectedCustomerId,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        customerGSTIN,
        petId: selectedPetId,
        petName,
        placeOfSupply,
        isInterState,
        items,
        subTotal,
        totalDiscount,
        taxableAmount,
        cgstTotal,
        sgstTotal,
        igstTotal,
        totalGst,
        roundOff,
        grandTotal,
        paidAmount: paidAmountInput,
        balanceDue,
        paymentStatus,
        paymentMode,
        notes,
        createdByRole: (currentUser?.role || userRole || 'USER') as UserRole,
        createdByName: userName,
        createdAt: invoice?.createdAt || new Date().toISOString()
      };

      await onSaveInvoice(savedInvoice);
      // onSaveInvoice handles closing the modal on success
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to save invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  const filteredCatalog = CATALOG_ITEMS.filter(c => 
    c.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    c.category.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Top Title Bar */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#D62828] font-mono text-white font-bold flex items-center justify-center text-xs">
              GST
            </div>
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                {isEditing ? 'Edit GST Tax Invoice' : 'Create New GST Tax Invoice'}
                {!isAdmin && (
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded">
                    Staff Billing Mode
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                Invoice No:{' '}
                {invoiceNumberLoading ? (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Fetching from DB…</span>
                  </span>
                ) : (
                  <strong>{invoiceNumber || 'Awaiting DB…'}</strong>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-bold">{validationError}</span>
            </div>
          )}

          {/* Staff Mode Lock Warning if editing */}
          {isEditing && !isAdmin && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                <strong>Role Restriction Notice:</strong> Billing Staff users can create and save new invoices. Editing existing invoices requires Admin privileges.
              </span>
            </div>
          )}

          {/* Section 1: Customer & Pet Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            {/* Customer Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-wider text-[10px]">
                  Select Customer:
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCustModal(true)}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-md flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ New Customer</span>
                </button>
              </div>

              <select
                value={selectedCustomerId}
                onChange={e => {
                  setSelectedCustomerId(e.target.value);
                  const c = customers.find(cust => cust.id === e.target.value);
                  if (c) {
                    setCustomerName(c.name);
                    setCustomerPhone(c.phone);
                    setCustomerAddress(c.address);
                    setCustomerGSTIN(c.gstin || '');
                  }
                }}
                className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-semibold"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) {c.advanceBalance && c.advanceBalance > 0 ? `[Advance: ₹${c.advanceBalance}]` : ''}
                  </option>
                ))}
              </select>

              {(() => {
                const selectedCust = customers.find(c => c.id === selectedCustomerId);
                if (selectedCust?.advanceBalance && selectedCust.advanceBalance > 0) {
                  return (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold">✨ Available Advance Credit: </span>
                        <span className="font-mono font-extrabold">{formatINR(selectedCust.advanceBalance)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMode('UPI');
                          setPaidAmountInput(Math.min(grandTotal, selectedCust.advanceBalance || 0));
                        }}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded shadow-xs"
                      >
                        Apply Credit
                      </button>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Customer Phone"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
                />
                <input
                  type="email"
                  placeholder="Customer Email (Optional)"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="GSTIN (Optional)"
                  value={customerGSTIN}
                  onChange={e => setCustomerGSTIN(e.target.value)}
                  className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-mono uppercase"
                />
                <input
                  type="text"
                  placeholder="Billing Address"
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
                />
              </div>
            </div>

            {/* Pet & Supply Place */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-wider text-[10px]">
                  Pet & Tax Region:
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddPetModal(true)}
                  className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Add Pet</span>
                </button>
              </div>

              {/* Multi-Pet Selection Row */}
              {(() => {
                const customerPets = pets.filter(p => p.customerId === selectedCustomerId);
                if (customerPets.length === 0) {
                  return (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs flex items-center justify-between">
                      <span className="text-amber-800 dark:text-amber-300 font-medium">
                        No pets registered for this customer.
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddPetModal(true)}
                        className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold"
                      >
                        + Add Pet
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-slate-400 font-bold">Select Pet(s):</span>
                      {customerPets.map(p => {
                        const isSelected = selectedPetIds.includes(p.id) || selectedPetId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                const remaining = selectedPetIds.filter(id => id !== p.id);
                                setSelectedPetIds(remaining);
                                if (selectedPetId === p.id) {
                                  setSelectedPetId(remaining[0] || '');
                                  const firstRemaining = customerPets.find(cp => cp.id === remaining[0]);
                                  setPetName(firstRemaining?.name || '');
                                }
                              } else {
                                const next = [...selectedPetIds, p.id];
                                setSelectedPetIds(next);
                                setSelectedPetId(p.id);
                                setPetName(p.name);
                              }
                            }}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 ring-2 ring-red-500'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
                            }`}
                          >
                            <span>🐾 {p.name}</span>
                            <span className="text-[9px] opacity-75 font-mono">({p.species})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Primary Pet Name:</label>
                  <input
                    type="text"
                    placeholder="None / Retail Product"
                    value={petName}
                    onChange={e => setPetName(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Place of Supply:</label>
                  <select
                    value={placeOfSupply}
                    onChange={e => setPlaceOfSupply(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-medium"
                  >
                    <option value="27-Maharashtra">27 - Maharashtra (Intra-State)</option>
                    <option value="07-Delhi">07 - Delhi (Inter-State IGST)</option>
                    <option value="29-Karnataka">29 - Karnataka (Inter-State IGST)</option>
                    <option value="33-Tamil Nadu">33 - Tamil Nadu (Inter-State IGST)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="interstateCheck"
                  checked={isInterState}
                  onChange={e => setIsInterState(e.target.checked)}
                  className="rounded text-[#D62828] focus:ring-red-500"
                />
                <label htmlFor="interstateCheck" className="text-xs text-slate-700 dark:text-zinc-300 font-medium">
                  Inter-State Supply (Apply IGST 18% instead of CGST 9% + SGST 9%)
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!canEditInvoiceNumber}
                    value={invoiceNumber}
                    onChange={e => {
                      setInvoiceNumber(e.target.value);
                      setValidationError('');
                    }}
                    placeholder="e.g. HOP/26-27/000001 or 01"
                    className={`w-full p-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                      canEditInvoiceNumber
                        ? 'bg-white dark:bg-zinc-900 border-red-300 dark:border-red-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500'
                        : 'bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-500 cursor-not-allowed'
                    }`}
                    title={canEditInvoiceNumber ? 'Edit Tax Invoice Number' : 'USER role cannot change Invoice Number'}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Invoice Date:</label>
                  <input
                    type="text"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Due Date:</label>
                  <input
                    type="text"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Phase 4 Unified Service, Package & Catalog Picker */}
          <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                Select Care Service, Package, or Custom Entry:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search services / packages..."
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  className="p-1 px-2.5 rounded-md bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs w-48 sm:w-56"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newItem: InvoiceItem = {
                      id: `ITEM-CUSTOM-${Date.now().toString().slice(-4)}`,
                      type: 'SERVICE',
                      name: 'Manual Amount Care Service',
                      hsnSac: '999799',
                      price: 550,
                      qty: 1,
                      discount: 0,
                      discountAmount: 0,
                      taxableValue: 550,
                      gstRate: 18,
                      cgstRate: 9,
                      cgstAmount: 49.5,
                      sgstRate: 9,
                      sgstAmount: 49.5,
                      igstRate: 0,
                      igstAmount: 0,
                      total: 649
                    };
                    setItems([...items, newItem]);
                  }}
                  className="px-2.5 py-1 bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg text-[11px] font-bold shrink-0 hover:bg-slate-800"
                >
                  + Add Custom Line
                </button>
              </div>
            </div>

            {/* Quick Service Badges */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {/* Configured Care Services */}
              {services
                .filter(s => s.isActive && (s.serviceName.toLowerCase().includes(catalogSearch.toLowerCase()) || s.category.toLowerCase().includes(catalogSearch.toLowerCase())))
                .map(srv => (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => {
                      const calc = calculateItem(srv.baseRate, 1, 0, srv.isGstApplicable ? srv.gstRate : 0, isInterState);
                      const newItem: InvoiceItem = {
                        id: `ITEM-SRV-${Date.now().toString().slice(-4)}`,
                        catalogItemId: srv.id,
                        type: 'SERVICE',
                        name: srv.serviceName,
                        hsnSac: srv.hsnSac || '999799',
                        price: srv.baseRate,
                        qty: 1,
                        discount: 0,
                        discountAmount: calc.discountAmount,
                        taxableValue: calc.taxableValue,
                        gstRate: srv.isGstApplicable ? srv.gstRate : 0,
                        cgstRate: calc.cgstRate,
                        cgstAmount: calc.cgstAmount,
                        sgstRate: calc.sgstRate,
                        sgstAmount: calc.sgstAmount,
                        igstRate: calc.igstRate,
                        igstAmount: calc.igstAmount,
                        total: calc.total
                      };
                      setItems([...items, newItem]);
                    }}
                    className="shrink-0 px-2.5 py-1.5 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-zinc-700 rounded-lg text-[11px] text-left transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-slate-800 dark:text-zinc-200 block truncate max-w-[160px]">
                      + {srv.serviceName}
                    </span>
                    <span className="text-[10px] text-[#D62828] font-mono font-semibold">
                      ₹{srv.baseRate} {srv.isGstApplicable ? `(${srv.gstRate}% GST)` : '(0% GST)'}
                    </span>
                  </button>
                ))}

              {/* Configured Packages */}
              {packages
                .filter(p => p.isActive && (p.packageName.toLowerCase().includes(catalogSearch.toLowerCase()) || p.category.toLowerCase().includes(catalogSearch.toLowerCase())))
                .map(pkg => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => {
                      const calc = calculateItem(pkg.packagePrice, 1, 0, pkg.isGstApplicable ? pkg.gstRate : 0, isInterState);
                      const newItem: InvoiceItem = {
                        id: `ITEM-PKG-${Date.now().toString().slice(-4)}`,
                        catalogItemId: pkg.id,
                        type: 'PACKAGE',
                        name: `${pkg.packageName} (${pkg.validityDays} Days Package)`,
                        hsnSac: pkg.hsnSac || '999799',
                        price: pkg.packagePrice,
                        qty: 1,
                        discount: 0,
                        discountAmount: calc.discountAmount,
                        taxableValue: calc.taxableValue,
                        gstRate: pkg.isGstApplicable ? pkg.gstRate : 0,
                        cgstRate: calc.cgstRate,
                        cgstAmount: calc.cgstAmount,
                        sgstRate: calc.sgstRate,
                        sgstAmount: calc.sgstAmount,
                        igstRate: calc.igstRate,
                        igstAmount: calc.igstAmount,
                        total: calc.total
                      };
                      setItems([...items, newItem]);
                    }}
                    className="shrink-0 px-2.5 py-1.5 bg-white dark:bg-zinc-900 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-[11px] text-left transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-amber-900 dark:text-amber-300 block truncate max-w-[160px]">
                      📦 {pkg.packageName}
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-semibold">
                      ₹{pkg.packagePrice} / {pkg.validityDays}d
                    </span>
                  </button>
                ))}

              {/* Long-Term Packages (Phase 4.5 Live Master) */}
              {longTermPackages
                .filter(ltp => ltp.status === 'ACTIVE' && (ltp.contractName.toLowerCase().includes(catalogSearch.toLowerCase()) || (ltp.contractCode && ltp.contractCode.toLowerCase().includes(catalogSearch.toLowerCase()))))
                .map(ltp => (
                  <button
                    key={ltp.id}
                    type="button"
                    onClick={() => {
                      const totalComponentsValue = ltp.totalContractValue || ltp.components?.reduce((sum, c) => sum + (c.fixedAmount || (c.rate * c.allocatedQuantity) || 0), 0) || 0;
                      const calc = calculateItem(totalComponentsValue, 1, 0, ltp.isGstApplicable ? ltp.gstRate : 0, isInterState);
                      const newItem: InvoiceItem = {
                        id: `ITEM-LTP-${Date.now().toString().slice(-4)}`,
                        catalogItemId: ltp.id,
                        type: 'PACKAGE',
                        name: `${ltp.contractName} [${ltp.contractCode}]`,
                        hsnSac: '999799',
                        price: totalComponentsValue,
                        qty: 1,
                        discount: 0,
                        discountAmount: calc.discountAmount,
                        taxableValue: calc.taxableValue,
                        gstRate: ltp.isGstApplicable ? ltp.gstRate : 0,
                        cgstRate: calc.cgstRate,
                        cgstAmount: calc.cgstAmount,
                        sgstRate: calc.sgstRate,
                        sgstAmount: calc.sgstAmount,
                        igstRate: calc.igstRate,
                        igstAmount: calc.igstAmount,
                        total: calc.total
                      };
                      setItems([...items, newItem]);
                    }}
                    className="shrink-0 px-2.5 py-1.5 bg-white dark:bg-zinc-900 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-lg text-[11px] text-left transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-purple-900 dark:text-purple-300 block truncate max-w-[160px]">
                      🏢 {ltp.contractName}
                    </span>
                    <span className="text-[10px] text-purple-700 dark:text-purple-400 font-mono font-semibold">
                      ₹{ltp.totalContractValue} / {ltp.billingFrequency || 'Term'}
                    </span>
                  </button>
                ))}

              {/* Fallback Retail Products from Catalog */}
              {filteredCatalog.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => addCatalogItem(cat)}
                  className="shrink-0 px-2.5 py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-[11px] text-left transition-colors cursor-pointer"
                >
                  <span className="font-bold text-slate-700 dark:text-zinc-300 block truncate max-w-[160px]">
                    + {cat.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ₹{cat.price} / {cat.unit}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Line Items Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] uppercase font-bold">
                  <th className="p-2 w-8 text-center">#</th>
                  <th className="p-2 min-w-[200px]">Item Description</th>
                  <th className="p-2 w-20">HSN/SAC</th>
                  <th className="p-2 w-24 text-right">Price (₹)</th>
                  <th className="p-2 w-16 text-center">Qty</th>
                  <th className="p-2 w-20 text-center">Disc %</th>
                  <th className="p-2 w-24 text-right">Taxable (₹)</th>
                  <th className="p-2 w-24 text-right">GST %</th>
                  <th className="p-2 w-28 text-right">Total (₹)</th>
                  <th className="p-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id || idx} className="border-t border-slate-200 dark:border-zinc-800">
                    <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => handleItemChange(idx, 'name', e.target.value)}
                        className="w-full p-1 rounded bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.hsnSac}
                        onChange={e => handleItemChange(idx, 'hsnSac', e.target.value)}
                        className="w-full p-1 rounded bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-center"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={item.price}
                        onChange={e => handleItemChange(idx, 'price', Number(e.target.value))}
                        className="w-full p-1 rounded bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-right"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={e => handleItemChange(idx, 'qty', Number(e.target.value))}
                        className="w-full p-1 rounded bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-center"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={e => handleItemChange(idx, 'discount', Number(e.target.value))}
                        className="w-full p-1 rounded bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-center"
                      />
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-slate-700 dark:text-zinc-300">
                      ₹{item.taxableValue.toFixed(2)}
                    </td>
                    <td className="p-2 text-right">
                      <select
                        value={item.gstRate}
                        onChange={e => handleItemChange(idx, 'gstRate', Number(e.target.value))}
                        className="p-1 rounded bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono"
                      >
                        <option value={18}>18%</option>
                        <option value={12}>12%</option>
                        <option value={5}>5%</option>
                        <option value={0}>0%</option>
                      </select>
                    </td>
                    <td className="p-2 text-right font-mono font-extrabold text-[#D62828]">
                      ₹{item.total.toFixed(2)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 4: Totals Summary & Payment Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Payment Record Inputs */}
            <div className="space-y-3 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
              <label className="font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider text-[10px]">
                Payment Collection Status:
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500">Status:</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-bold"
                  >
                    <option value="PAID">PAID (Full)</option>
                    <option value="PARTIAL">PARTIAL Payment</option>
                    <option value="UNPAID">UNPAID / Dues</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500">Mode:</label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-bold"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500">Collected Amount (₹):</label>
                  <input
                    type="number"
                    value={paidAmountInput}
                    onChange={e => setPaidAmountInput(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Remaining Balance (₹):</label>
                  <input
                    type="text"
                    disabled
                    value={`₹ ${balanceDue.toFixed(2)}`}
                    className="w-full p-2 rounded-lg bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-xs font-mono font-bold text-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500">Invoice Notes / Special Instructions:</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
                />
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2 font-mono text-xs shadow-inner">
              <div className="flex justify-between text-slate-400">
                <span>Sub Total:</span>
                <span>₹ {subTotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Total Discount:</span>
                  <span>- ₹ {totalDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                <span>Taxable Value:</span>
                <span>₹ {taxableAmount.toFixed(2)}</span>
              </div>

              {!isInterState ? (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>CGST (9%):</span>
                    <span>₹ {cgstTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>SGST (9%):</span>
                    <span>₹ {sgstTotal.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-400">
                  <span>IGST (18%):</span>
                  <span>₹ {igstTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Round Off:</span>
                <span>{roundOff.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-base font-extrabold text-[#D62828] pt-2 border-t-2 border-slate-700">
                <span>Grand Total:</span>
                <span>{formatINR(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || invoiceNumberLoading}
              className={`px-6 py-2.5 font-extrabold rounded-xl text-xs flex items-center space-x-2 shadow-lg transition-all ${
                isSubmitting || invoiceNumberLoading
                  ? 'bg-slate-400 cursor-not-allowed text-white opacity-70'
                  : 'bg-[#D62828] hover:bg-red-700 text-white shadow-red-900/40 active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Invoice…</span>
                </>
              ) : invoiceNumberLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching Invoice No…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Update & Save GST Invoice' : 'Save & Issue GST Invoice'}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* ─── QUICK ADD CUSTOMER INLINE MODAL ───────────────────────── */}
        {showAddCustModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl w-full max-w-md border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-zinc-800">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-rose-600" />
                  <span>Add New Customer</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddCustModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Dilnavaz / Rajesh Sharma"
                    value={newCustName}
                    onChange={e => setNewCustName(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold block mb-1">Mobile Phone *</label>
                    <input
                      type="text"
                      placeholder="e.g. 9819702638"
                      value={newCustPhone}
                      onChange={e => setNewCustPhone(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold block mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. dilnavaz@example.com"
                      value={newCustEmail}
                      onChange={e => setNewCustEmail(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1">Billing Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai, Maharashtra"
                    value={newCustAddress}
                    onChange={e => setNewCustAddress(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AMIPB3225A1ZS"
                    value={newCustGSTIN}
                    onChange={e => setNewCustGSTIN(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddCustModal(false)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleQuickCreateCustomer}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-extrabold"
                >
                  Save & Select Customer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── QUICK ADD PET INLINE MODAL ───────────────────────── */}
        {showAddPetModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl w-full max-w-md border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-zinc-800">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-rose-600" />
                  <span>Add New Pet for {customerName || 'Customer'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddPetModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Pet Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Mojito / Coco / Shadow"
                    value={newPetName}
                    onChange={e => setNewPetName(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold block mb-1">Species</label>
                    <select
                      value={newPetSpecies}
                      onChange={e => setNewPetSpecies(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700"
                    >
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                      <option value="Bird">Bird</option>
                      <option value="Rabbit">Rabbit</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold block mb-1">Breed</label>
                    <input
                      type="text"
                      placeholder="e.g. Golden Retriever / Persian"
                      value={newPetBreed}
                      onChange={e => setNewPetBreed(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold block mb-1">Age</label>
                    <input
                      type="text"
                      placeholder="e.g. 2 Years"
                      value={newPetAge}
                      onChange={e => setNewPetAge(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700"
                    />
                  </div>

                  <div>
                    <label className="font-bold block mb-1">Gender</label>
                    <select
                      value={newPetGender}
                      onChange={e => setNewPetGender(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 dark:bg-zinc-800 border rounded-lg border-slate-300 dark:border-zinc-700"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddPetModal(false)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleQuickCreatePet}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-extrabold"
                >
                  Save & Select Pet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
