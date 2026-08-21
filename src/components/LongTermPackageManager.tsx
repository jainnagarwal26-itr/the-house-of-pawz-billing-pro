import React, { useState } from 'react';
import { 
  Building2, Plus, Edit2, Trash2, CheckCircle2, XCircle, 
  Search, IndianRupee, Sparkles, Filter, Shield, AlertCircle,
  Calendar, FileText, Clock, ArrowRight, UserCheck, Eye, Download,
  Car, Layers, AlertTriangle
} from 'lucide-react';
import { 
  LongTermContract, 
  LongTermContractItem, 
  LongTermServiceUsage, 
  LongTermBillingPeriod,
  Customer, 
  Pet, 
  UserRole, 
  User, 
  CustomerType,
  ContractPeriodType,
  ContractStatus,
  ComponentPricingMethod,
  ServiceCatalogItem,
  ServicePackageMaster,
  formatINR
} from '../types';
import { hasPermission } from '../lib/permissions';

interface LongTermPackageManagerProps {
  contracts: LongTermContract[];
  usages: LongTermServiceUsage[];
  billingPeriods: LongTermBillingPeriod[];
  customers: Customer[];
  pets: Pet[];
  services: ServiceCatalogItem[];
  packages: ServicePackageMaster[];
  currentUser?: User | null;
  userRole: UserRole;
  onSaveContract: (contract: LongTermContract) => Promise<void>;
  onDeleteContract: (contractId: string) => Promise<void>;
  onLogUsage: (usage: LongTermServiceUsage, component: LongTermContractItem) => Promise<void>;
  onGenerateContractInvoice: (preview: {
    contract: LongTermContract;
    periodName: string;
    startDate: string;
    endDate: string;
    serviceDescription: string;
    subTotal: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    grandTotal: number;
    lineItems: any[];
  }) => Promise<void>;
}

export const LongTermPackageManager: React.FC<LongTermPackageManagerProps> = ({
  contracts,
  usages,
  billingPeriods,
  customers,
  pets,
  services,
  packages,
  currentUser,
  userRole,
  onSaveContract,
  onDeleteContract,
  onLogUsage,
  onGenerateContractInvoice
}) => {
  const [activeTab, setActiveTab] = useState<'contracts' | 'usage' | 'billing'>('contracts');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | CustomerType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContract, setSelectedContract] = useState<LongTermContract | null>(null);

  // Contract Modal State
  const [showContractModal, setShowContractModal] = useState(false);
  const [editingContract, setEditingContract] = useState<LongTermContract | null>(null);
  const [contractCode, setContractCode] = useState('');
  const [contractName, setContractName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [contractType, setContractType] = useState<ContractPeriodType>('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [billingFrequency, setBillingFrequency] = useState('Monthly');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [creditDays, setCreditDays] = useState(30);
  const [isGstApplicable, setIsGstApplicable] = useState(true);
  const [gstRate, setGstRate] = useState(18);
  const [components, setComponents] = useState<LongTermContractItem[]>([]);
  const [contractNotes, setContractNotes] = useState('');

  // Usage Modal State
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageContractId, setUsageContractId] = useState('');
  const [usageComponentId, setUsageComponentId] = useState('');
  const [usagePetId, setUsagePetId] = useState('');
  const [usageServiceDate, setUsageServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [usageStartDate, setUsageStartDate] = useState('');
  const [usageEndDate, setUsageEndDate] = useState('');
  const [usageQty, setUsageQty] = useState(1);
  const [usageNotes, setUsageNotes] = useState('');

  // Billing Preview Modal State
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingContract, setBillingContract] = useState<LongTermContract | null>(null);
  const [billingPeriodName, setBillingPeriodName] = useState('');
  const [billingStartDate, setBillingStartDate] = useState('');
  const [billingEndDate, setBillingEndDate] = useState('');
  const [billingTimeDesc, setBillingTimeDesc] = useState('till 12:00 PM');
  const [isProcessingInvoice, setIsProcessingInvoice] = useState(false);

  // RBAC Permission checks
  const canCreateContract = currentUser ? hasPermission(currentUser, 'long_term_package_create') : userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'ACCOUNTANT';
  const canEditContract = currentUser ? hasPermission(currentUser, 'long_term_package_edit') : userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'ACCOUNTANT';
  const canDeleteContract = currentUser ? hasPermission(currentUser, 'long_term_package_delete') : userRole === 'ACCOUNTANT' || userRole === 'SUPER_ADMIN';
  const canLogUsage = currentUser ? hasPermission(currentUser, 'long_term_usage_create') : true;
  const canGenerateInvoice = currentUser ? hasPermission(currentUser, 'long_term_billing_create') : userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'ACCOUNTANT';

  // Open Add/Edit Contract Modal
  const handleOpenContractModal = (c?: LongTermContract) => {
    if (c) {
      setEditingContract(c);
      setContractCode(c.contractCode);
      setContractName(c.contractName);
      setSelectedCustomerId(c.customerId);
      setContractType(c.contractType);
      setStartDate(c.startDate);
      setEndDate(c.endDate);
      setBillingFrequency(c.billingFrequency);
      setPaymentTerms(c.paymentTerms);
      setCreditDays(c.creditDays);
      setIsGstApplicable(c.isGstApplicable);
      setGstRate(c.gstRate);
      setComponents(c.components || []);
      setContractNotes(c.notes || '');
    } else {
      setEditingContract(null);
      setContractCode(`LTP-${new Date().getFullYear().toString().slice(-2)}${(new Date().getFullYear() + 1).toString().slice(-2)}-${Date.now().toString().slice(-4)}`);
      setContractName('');
      setSelectedCustomerId(customers[0]?.id || '');
      setContractType('MONTHLY');
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
      setBillingFrequency('Monthly');
      setPaymentTerms('Net 30');
      setCreditDays(30);
      setIsGstApplicable(true);
      setGstRate(18);
      setComponents([
        {
          id: `comp-local-${Date.now()}-1`,
          contractId: '',
          serviceName: 'Canine Night Boarding',
          speciesApplicable: 'Dog',
          pricingMethod: 'FIXED_RATE',
          allocatedQuantity: 30,
          unit: 'Nights',
          rate: 600,
          fixedAmount: 18000,
          isGstApplicable: true,
          gstRate: 18,
          hsnSac: '999799',
          usedQuantity: 0
        }
      ]);
      setContractNotes('');
    }
    setShowContractModal(true);
  };

  // Add Component line inside contract modal
  const handleAddComponentLine = () => {
    setComponents([
      ...components,
      {
        id: `comp-local-${Date.now()}-${components.length + 1}`,
        contractId: '',
        serviceName: 'Pick-Up & Drop Transit Charge',
        speciesApplicable: 'All',
        pricingMethod: 'PERCENTAGE',
        allocatedQuantity: 0,
        unit: '%',
        rate: 20,
        fixedAmount: 0,
        isGstApplicable: true,
        gstRate: 18,
        hsnSac: '996411',
        usedQuantity: 0
      }
    ]);
  };

  // Update component item
  const handleUpdateComponent = (index: number, field: keyof LongTermContractItem, value: any) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: value };

    // Auto calculate fixed amount if fixed rate
    if (field === 'allocatedQuantity' || field === 'rate' || field === 'pricingMethod') {
      const q = Number(updated[index].allocatedQuantity || 0);
      const r = Number(updated[index].rate || 0);
      if (updated[index].pricingMethod === 'FIXED_RATE') {
        updated[index].fixedAmount = q * r;
      }
    }

    setComponents(updated);
  };

  // Remove component item
  const handleRemoveComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  // Save Contract
  const handleSaveContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === selectedCustomerId);

    const totalVal = components.reduce((sum, item) => sum + (Number(item.fixedAmount) || 0), 0);

    const contractObj: LongTermContract = {
      id: editingContract?.id || `ltp-local-${Date.now()}`,
      contractCode,
      contractName,
      customerId: cust?.id || 'PACKAGE_MASTER',
      customerName: cust?.name || 'Package Master Template',
      customerPhone: cust?.phone || '',
      customerEmail: cust?.email || '',
      customerGstin: cust?.gstin || '',
      customerType: cust?.customerType || 'INDIVIDUAL',
      contractType,
      startDate,
      endDate,
      billingFrequency,
      paymentTerms,
      creditDays: Number(creditDays),
      currency: 'INR',
      isGstApplicable,
      gstRate: Number(gstRate),
      totalContractValue: totalVal,
      totalBilledAmount: editingContract?.totalBilledAmount || 0,
      balanceDue: totalVal - (editingContract?.totalBilledAmount || 0),
      status: editingContract?.status || 'ACTIVE',
      notes: contractNotes,
      components
    };

    await onSaveContract(contractObj);
    setShowContractModal(false);
  };

  // Open Service Usage Modal
  const handleOpenUsageModal = (contract?: LongTermContract) => {
    const target = contract || contracts[0];
    if (!target) {
      alert('No active long-term packages available to record service usage.');
      return;
    }
    setUsageContractId(target.id);
    setUsageComponentId(target.components[0]?.id || '');
    setUsagePetId('');
    setUsageServiceDate(new Date().toISOString().slice(0, 10));
    setUsageStartDate('');
    setUsageEndDate('');
    setUsageQty(1);
    setUsageNotes('');
    setShowUsageModal(true);
  };

  // Save Service Usage
  const handleSaveUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetContract = contracts.find(c => c.id === usageContractId);
    if (!targetContract) {
      alert('Contract not found.');
      return;
    }
    const targetComp = targetContract.components.find(c => c.id === usageComponentId);
    if (!targetComp) {
      alert('Package component not found.');
      return;
    }

    // Check non-negative balance guard
    if (targetComp.pricingMethod === 'FIXED_RATE' && targetComp.allocatedQuantity > 0) {
      const remaining = targetComp.allocatedQuantity - targetComp.usedQuantity;
      if (usageQty > remaining) {
        alert(`Package Allocation Exhausted! Remaining allocation is ${remaining} ${targetComp.unit}. Cannot log ${usageQty} ${targetComp.unit}.`);
        return;
      }
    }

    const targetPet = pets.find(p => p.id === usagePetId);
    const baseAmt = targetComp.pricingMethod === 'FIXED_RATE' ? usageQty * targetComp.rate : targetComp.fixedAmount;
    const gstAmt = targetComp.isGstApplicable ? baseAmt * (targetComp.gstRate / 100) : 0;

    const usageObj: LongTermServiceUsage = {
      id: `usage-local-${Date.now()}`,
      contractId: targetContract.id,
      contractCode: targetContract.contractCode,
      contractItemId: targetComp.id,
      customerId: targetContract.customerId,
      customerName: targetContract.customerName,
      petId: targetPet?.id,
      petName: targetPet?.name,
      petSpecies: targetPet?.species || targetComp.speciesApplicable,
      serviceName: targetComp.serviceName,
      serviceDate: usageServiceDate,
      startDate: usageStartDate || undefined,
      endDate: usageEndDate || undefined,
      quantityUsed: Number(usageQty),
      unit: targetComp.unit,
      baseAmount: baseAmt,
      gstAmount: gstAmt,
      totalAmount: baseAmt + gstAmt,
      billingStatus: 'PENDING',
      notes: usageNotes,
      loggedBy: currentUser?.name || currentUser?.username || 'Chirag Jain'
    };

    await onLogUsage(usageObj, targetComp);
    setShowUsageModal(false);
  };

  // Open Billing Preview Modal
  const handleOpenBillingModal = (c: LongTermContract) => {
    setBillingContract(c);
    setBillingPeriodName(`Service Period: ${c.startDate} to ${c.endDate}`);
    setBillingStartDate(c.startDate);
    setBillingEndDate(c.endDate);
    setBillingTimeDesc('till 12:00 PM');
    setShowBillingModal(true);
  };

  // Calculate Billing Preview Breakdown
  const computeBillingPreview = () => {
    if (!billingContract) return null;
    const items = billingContract.components || [];

    // Filter relevant pending usages if applicable
    const contractUsages = usages.filter(u => u.contractId === billingContract.id && u.billingStatus === 'PENDING');
    
    let subTotal = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const lineItems = items.map(comp => {
      let qty = comp.allocatedQuantity;
      let price = comp.rate;
      let taxable = 0;

      if (comp.pricingMethod === 'FIXED_RATE') {
        taxable = qty * price;
      } else if (comp.pricingMethod === 'FLAT_AMOUNT') {
        taxable = comp.fixedAmount;
      } else if (comp.pricingMethod === 'PERCENTAGE') {
        // Compute dynamically from linked Pick & Drop usage
        const transitUsageTotal = contractUsages
          .filter(u => u.serviceName.toLowerCase().includes('pick') || u.serviceName.toLowerCase().includes('transit'))
          .reduce((sum, u) => sum + u.baseAmount, 0);
        taxable = (transitUsageTotal * comp.rate) / 100;
        qty = 1;
        price = taxable;
      }

      const gstRate = comp.isGstApplicable ? comp.gstRate : 0;
      const cgst = taxable * (gstRate / 200);
      const sgst = taxable * (gstRate / 200);
      const total = taxable + cgst + sgst;

      subTotal += taxable;
      totalTaxable += taxable;
      totalCgst += cgst;
      totalSgst += sgst;

      return {
        catalogItemId: comp.serviceId,
        type: 'PACKAGE',
        name: `${comp.serviceName} (${comp.speciesApplicable})`,
        hsnSac: comp.hsnSac,
        price,
        qty,
        discount: 0,
        discountAmount: 0,
        taxableValue: taxable,
        gstRate,
        cgstRate: gstRate / 2,
        cgstAmount: cgst,
        sgstRate: gstRate / 2,
        sgstAmount: sgst,
        igstRate: 0,
        igstAmount: 0,
        total
      };
    });

    const grandTotal = Math.round(totalTaxable + totalCgst + totalSgst + totalIgst);

    return {
      contract: billingContract,
      periodName: billingPeriodName,
      startDate: billingStartDate,
      endDate: billingEndDate,
      serviceDescription: `${billingStartDate} to ${billingEndDate}, ${billingTimeDesc}`,
      subTotal,
      taxableAmount: totalTaxable,
      cgst: totalCgst,
      sgst: totalSgst,
      igst: totalIgst,
      grandTotal,
      lineItems
    };
  };

  // Confirm and Generate Invoice
  const handleConfirmGenerateInvoice = async () => {
    const preview = computeBillingPreview();
    if (!preview) return;

    setIsProcessingInvoice(true);
    try {
      await onGenerateContractInvoice(preview);
      setShowBillingModal(false);
    } catch (err: any) {
      alert(`Invoice generation failed: ${err.message}`);
    } finally {
      setIsProcessingInvoice(false);
    }
  };

  // Filtered Contracts
  const filteredContracts = contracts.filter(c => {
    if (customerTypeFilter !== 'ALL' && c.customerType !== customerTypeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.contractCode.toLowerCase().includes(q) ||
        c.contractName.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#D62828]" />
            Long-Term Packages & Contracts
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Multi-component institutional arrangements, multi-pet usage logging, allocation balances & periodic billing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canLogUsage && contracts.length > 0 && (
            <button
              onClick={() => handleOpenUsageModal()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>+ Log Service Usage</span>
            </button>
          )}

          {canCreateContract && (
            <button
              onClick={() => handleOpenContractModal()}
              className="px-3.5 py-2 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Long-Term Package</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">
            Active Packages
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              {contracts.filter(c => c.status === 'ACTIVE').length}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
              Total {contracts.length}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">
            Total Contract Value
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              {formatINR(contracts.reduce((sum, c) => sum + (c.totalContractValue || 0), 0))}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Committed</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">
            Total Service Usages
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              {usages.length}
            </span>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
              Logged
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">
            Billed Invoices
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              {billingPeriods.length}
            </span>
            <span className="text-[10px] text-purple-600 font-bold bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded">
              Generated
            </span>
          </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('contracts')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === 'contracts'
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            Long-Term Packages ({contracts.length})
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === 'usage'
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            Service Usage Logs ({usages.length})
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === 'billing'
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            Billing History ({billingPeriods.length})
          </button>
        </div>

        {/* Filter by Customer Classification */}
        {activeTab === 'contracts' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search packages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs w-44"
              />
            </div>
            <select
              value={customerTypeFilter}
              onChange={e => setCustomerTypeFilter(e.target.value as any)}
              className="p-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300"
            >
              <option value="ALL">All Classifications</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="B2B">B2B</option>
              <option value="CORPORATE">Corporate</option>
              <option value="INSTITUTIONAL">Institutional</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: CONTRACTS LIST */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredContracts.map(c => (
              <div
                key={c.id}
                className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#D62828] uppercase block">
                        {c.contractCode}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {c.contractName}
                      </h3>
                      <span className="text-xs text-slate-600 dark:text-zinc-400 block mt-0.5">
                        Client: <strong>{c.customerName}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {c.customerType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-zinc-800/60 p-2 rounded-xl">
                    <div>
                      <span className="text-slate-400 block">Validity Period:</span>
                      <span className="font-bold text-slate-700 dark:text-zinc-300">{c.startDate} → {c.endDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Cycle / Terms:</span>
                      <span className="font-bold text-slate-700 dark:text-zinc-300">{c.billingFrequency} ({c.paymentTerms})</span>
                    </div>
                  </div>

                  {/* Components Allocation Breakdown */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Allocated Components:
                    </span>
                    {c.components.map((comp, idx) => {
                      const isExhausted = comp.pricingMethod === 'FIXED_RATE' && comp.allocatedQuantity > 0 && comp.usedQuantity >= comp.allocatedQuantity;
                      const remaining = comp.allocatedQuantity - comp.usedQuantity;
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-zinc-800 pb-1">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-zinc-200">
                              {comp.serviceName} ({comp.speciesApplicable})
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {comp.pricingMethod === 'FIXED_RATE' ? `${comp.allocatedQuantity} ${comp.unit} @ ₹${comp.rate}` : `${comp.rate}% Surcharge`}
                            </span>
                          </div>
                          <div className="text-right">
                            {comp.pricingMethod === 'FIXED_RATE' ? (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                isExhausted
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}>
                                {isExhausted ? 'Allocation Exhausted' : `Rem: ${remaining} ${comp.unit}`}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-purple-600 font-mono">Dynamic %</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Total Value:</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                        {formatINR(c.totalContractValue)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Status:</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => handleOpenBillingModal(c)}
                    className="flex-1 py-1.5 bg-[#D62828] hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
                    title="Generate GST Invoice for Service Period"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Bill Invoice</span>
                  </button>

                  {canEditContract && (
                    <button
                      onClick={() => handleOpenContractModal(c)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold cursor-pointer"
                      title="Edit Contract Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {canDeleteContract && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Permanently delete long-term package "${c.contractName}" (${c.contractCode})?`)) {
                          onDeleteContract(c.id);
                        }
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg cursor-pointer"
                      title="Delete Contract (Accountant Only)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filteredContracts.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">No B2B Contracts Configured</p>
                <p className="text-xs text-slate-400 mt-1">
                  {canCreateContract
                    ? 'Use "+ Create Long-Term Package" to set up institutional or corporate arrangements.'
                    : 'Contact Administrator to establish long-term contract packages.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SERVICE USAGE LOGS */}
      {activeTab === 'usage' && (
        <div className="space-y-3">
          <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] uppercase font-bold">
                  <th className="p-3">Date</th>
                  <th className="p-3">Contract Code</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Pet (Species)</th>
                  <th className="p-3">Service Used</th>
                  <th className="p-3 text-center">Qty / Nights</th>
                  <th className="p-3 text-right">Taxable</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {usages.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                    <td className="p-3 font-mono text-slate-500">{u.serviceDate}</td>
                    <td className="p-3 font-mono font-bold text-[#D62828]">{u.contractCode}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-zinc-200">{u.customerName}</td>
                    <td className="p-3 text-slate-600 dark:text-zinc-400">
                      {u.petName ? `🐾 ${u.petName} (${u.petSpecies || 'Dog'})` : 'Institutional Batch'}
                    </td>
                    <td className="p-3 font-medium text-slate-700 dark:text-zinc-300">{u.serviceName}</td>
                    <td className="p-3 text-center font-mono font-bold">{u.quantityUsed} {u.unit}</td>
                    <td className="p-3 text-right font-mono font-bold">{formatINR(u.baseAmount)}</td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.billingStatus === 'BILLED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {u.billingStatus}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-[10px]">{u.loggedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {usages.length === 0 && (
              <div className="py-12 text-center text-slate-400 dark:text-zinc-600">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">No Service Usage Recorded</p>
                <p className="text-xs text-slate-400 mt-1">Use the "+ Log Service Usage" button to record night boarding and transit trips.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BILLING HISTORY */}
      {activeTab === 'billing' && (
        <div className="space-y-3">
          <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] uppercase font-bold">
                  <th className="p-3">Billing Date</th>
                  <th className="p-3">Contract</th>
                  <th className="p-3">Client Name</th>
                  <th className="p-3">Service Period Description</th>
                  <th className="p-3">Invoice Number</th>
                  <th className="p-3 text-right">Taxable</th>
                  <th className="p-3 text-right">GST</th>
                  <th className="p-3 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {billingPeriods.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                    <td className="p-3 font-mono text-slate-500">{b.billingDate}</td>
                    <td className="p-3 font-mono font-bold text-[#D62828]">{b.contractCode}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-zinc-200">{b.customerName}</td>
                    <td className="p-3 text-slate-700 dark:text-zinc-300">{b.servicePeriodDescription}</td>
                    <td className="p-3 font-mono font-bold text-emerald-600">{b.invoiceNumber || 'Pending'}</td>
                    <td className="p-3 text-right font-mono">{formatINR(b.taxableAmount)}</td>
                    <td className="p-3 text-right font-mono">{formatINR(b.totalGst)}</td>
                    <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                      {formatINR(b.grandTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {billingPeriods.length === 0 && (
              <div className="py-12 text-center text-slate-400 dark:text-zinc-600">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">No Billing Pending</p>
                <p className="text-xs text-slate-400 mt-1">Generated periodic contract invoices will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT LONG-TERM PACKAGE */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#D62828]" />
                {editingContract ? 'Edit Long-Term Package' : 'Create Long-Term Package / Contract'}
              </h3>
              <button onClick={() => setShowContractModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            <form onSubmit={handleSaveContractSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Contract Code *</label>
                  <input
                    type="text"
                    required
                    value={contractCode}
                    onChange={e => setContractCode(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Package / Contract Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 180 Night Dog Boarding & Transit"
                    value={contractName}
                    onChange={e => setContractName(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Customer Assignment <span className="text-slate-400 font-normal text-[10px]">(Optional for Master Template)</span>
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                  >
                    <option value="">-- None (Reusable Package Master Template) --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.customerType || 'INDIVIDUAL'}) - {c.phone}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Period Structure</label>
                  <select
                    value={contractType}
                    onChange={e => setContractType(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half Yearly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="CUSTOM_PERIOD">Custom Period</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                  />
                </div>
              </div>

              {/* Component Allocations */}
              <div className="space-y-2 border-t border-slate-100 dark:border-zinc-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-zinc-200">
                    Service Components & Allocations
                  </span>
                  <button
                    type="button"
                    onClick={handleAddComponentLine}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Component</span>
                  </button>
                </div>

                {components.map((comp, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Service Name</label>
                        <input
                          type="text"
                          required
                          value={comp.serviceName}
                          onChange={e => handleUpdateComponent(idx, 'serviceName', e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Species Applicable</label>
                        <select
                          value={comp.speciesApplicable}
                          onChange={e => handleUpdateComponent(idx, 'speciesApplicable', e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 text-xs"
                        >
                          <option value="Dog">Dog</option>
                          <option value="Cat">Cat</option>
                          <option value="All">All Species</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Pricing Method</label>
                        <select
                          value={comp.pricingMethod}
                          onChange={e => handleUpdateComponent(idx, 'pricingMethod', e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 text-xs"
                        >
                          <option value="FIXED_RATE">Fixed Rate x Qty</option>
                          <option value="FLAT_AMOUNT">Flat Amount</option>
                          <option value="PERCENTAGE">Percentage Surcharge</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Allocated Qty</label>
                        <input
                          type="number"
                          value={comp.allocatedQuantity}
                          onChange={e => handleUpdateComponent(idx, 'allocatedQuantity', Number(e.target.value))}
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Unit (Nights/%)</label>
                        <input
                          type="text"
                          value={comp.unit}
                          onChange={e => handleUpdateComponent(idx, 'unit', e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Rate / % Value</label>
                        <input
                          type="number"
                          value={comp.rate}
                          onChange={e => handleUpdateComponent(idx, 'rate', Number(e.target.value))}
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 text-xs font-mono font-bold"
                        />
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-0.5">Line Total:</span>
                          <span className="font-mono font-black text-slate-900 dark:text-white">
                            {formatINR(comp.fixedAmount)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowContractModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D62828] hover:bg-red-700 text-white rounded-xl font-bold cursor-pointer shadow-md"
                >
                  {editingContract ? 'Update Package' : 'Save Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG SERVICE USAGE */}
      {showUsageModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              Log Pet Service Usage
            </h3>

            <form onSubmit={handleSaveUsageSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Contract Package *</label>
                <select
                  value={usageContractId}
                  onChange={e => {
                    setUsageContractId(e.target.value);
                    const c = contracts.find(con => con.id === e.target.value);
                    if (c && c.components.length > 0) {
                      setUsageComponentId(c.components[0].id);
                    }
                  }}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                >
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.contractCode} - {c.contractName} ({c.customerName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Service Component *</label>
                <select
                  value={usageComponentId}
                  onChange={e => setUsageComponentId(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                >
                  {contracts.find(c => c.id === usageContractId)?.components.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.serviceName} ({comp.speciesApplicable}) - Rem: {comp.allocatedQuantity - comp.usedQuantity} {comp.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Pet (Optional for Institutional)</label>
                <select
                  value={usagePetId}
                  onChange={e => setUsagePetId(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                >
                  <option value="">No Specific Pet (Batch / General Usage)</option>
                  {pets.map(p => (
                    <option key={p.id} value={p.id}>
                      🐾 {p.name} ({p.species}) - Parent: {p.customerName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Usage Date *</label>
                  <input
                    type="date"
                    required
                    value={usageServiceDate}
                    onChange={e => setUsageServiceDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Quantity Used *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={usageQty}
                    onChange={e => setUsageQty(Number(e.target.value))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Notes / Stay Details</label>
                <input
                  type="text"
                  placeholder="e.g. Check-in Night Stay"
                  value={usageNotes}
                  onChange={e => setUsageNotes(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowUsageModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Confirm Usage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BILLING PREVIEW & INVOICE GENERATION */}
      {showBillingModal && billingContract && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D62828]" />
                B2B Billing Preview & GST Invoice Generation
              </h3>
              <button onClick={() => setShowBillingModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            {(() => {
              const preview = computeBillingPreview();
              if (!preview) return null;

              return (
                <div className="space-y-4 text-xs">
                  {/* Client & Period Header */}
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Client / Organization:</span>
                        <strong className="text-slate-800 dark:text-zinc-200">{billingContract.customerName}</strong>
                        <span className="text-slate-500 block font-mono text-[10px]">{billingContract.customerGstin || 'Unregistered B2B'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Contract Code:</span>
                        <strong className="text-[#D62828] font-mono">{billingContract.contractCode}</strong>
                        <span className="text-slate-500 block text-[10px]">{billingContract.contractName}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-zinc-700">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Start Date</label>
                        <input
                          type="date"
                          value={billingStartDate}
                          onChange={e => setBillingStartDate(e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">End Date</label>
                        <input
                          type="date"
                          value={billingEndDate}
                          onChange={e => setBillingEndDate(e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Service Description Suffix</label>
                        <input
                          type="text"
                          value={billingTimeDesc}
                          onChange={e => setBillingTimeDesc(e.target.value)}
                          placeholder="e.g. till 12 noon"
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] uppercase font-bold">
                          <th className="p-2">Component</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Rate</th>
                          <th className="p-2 text-right">Taxable</th>
                          <th className="p-2 text-right">GST</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {preview.lineItems.map((item, i) => (
                          <tr key={i}>
                            <td className="p-2 font-medium">{item.name}</td>
                            <td className="p-2 text-center font-mono">{item.qty}</td>
                            <td className="p-2 text-right font-mono">{formatINR(item.price)}</td>
                            <td className="p-2 text-right font-mono font-bold">{formatINR(item.taxableValue)}</td>
                            <td className="p-2 text-right font-mono">{formatINR(item.cgstAmount + item.sgstAmount)}</td>
                            <td className="p-2 text-right font-mono font-black">{formatINR(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Totals */}
                  <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Taxable Subtotal:</span>
                      <span className="font-mono font-bold">{formatINR(preview.taxableAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CGST (9%):</span>
                      <span className="font-mono">{formatINR(preview.cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">SGST (9%):</span>
                      <span className="font-mono">{formatINR(preview.sgst)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-zinc-700 text-sm">
                      <span className="font-bold text-slate-900 dark:text-white">Grand Total:</span>
                      <span className="font-mono font-black text-[#D62828] text-base">{formatINR(preview.grandTotal)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setShowBillingModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 rounded-xl font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingInvoice}
                      onClick={handleConfirmGenerateInvoice}
                      className="px-5 py-2 bg-[#D62828] hover:bg-red-700 text-white rounded-xl font-bold cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      {isProcessingInvoice ? (
                        <span>Generating Secure Invoice...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirm & Generate GST Invoice</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
