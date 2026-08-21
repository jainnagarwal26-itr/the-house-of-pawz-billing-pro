import React, { useState } from 'react';
import { 
  Package, Plus, Edit2, Trash2, CheckCircle2, XCircle, 
  Search, IndianRupee, Sparkles, Filter, Shield, AlertCircle
} from 'lucide-react';
import { 
  ServiceCatalogItem, 
  ServicePackageMaster, 
  MonthlyServicePackage, 
  LongTermContract,
  LongTermContractItem,
  UserRole, 
  User, 
  ServiceMasterCategory,
  PackageMasterCategory,
  ServiceApplicableSpecies,
  formatINR
} from '../types';
import { CATALOG_ITEMS } from '../lib/storage';
import { hasPermission } from '../lib/permissions';

interface ServiceCatalogManagerProps {
  services: ServiceCatalogItem[];
  packages: ServicePackageMaster[];
  longTermPackages?: LongTermContract[];
  monthlyPackages: MonthlyServicePackage[];
  currentUser?: User | null;
  userRole: UserRole;
  onSaveService: (service: ServiceCatalogItem) => Promise<void>;
  onDeleteService: (serviceId: string) => Promise<void>;
  onSavePackage: (pkg: ServicePackageMaster) => Promise<void>;
  onDeletePackage: (packageId: string) => Promise<void>;
  onSaveLongTermPackage?: (pkg: LongTermContract) => Promise<void>;
  onDeleteLongTermPackage?: (pkgId: string) => Promise<void>;
  onSaveMonthlyPackage: (sub: MonthlyServicePackage) => Promise<void>;
  onDeleteMonthlyPackage: (subId: string) => Promise<void>;
  onGenerateMonthlyInvoice: (sub: MonthlyServicePackage) => Promise<void>;
}

export const ServiceCatalogManager: React.FC<ServiceCatalogManagerProps> = ({
  services,
  packages,
  longTermPackages = [],
  monthlyPackages,
  currentUser,
  userRole,
  onSaveService,
  onDeleteService,
  onSavePackage,
  onDeletePackage,
  onSaveLongTermPackage,
  onDeleteLongTermPackage,
  onSaveMonthlyPackage,
  onDeleteMonthlyPackage,
  onGenerateMonthlyInvoice
}) => {
  const [activeTab, setActiveTab] = useState<'services' | 'packages' | 'long_term' | 'monthly'>('services');
  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<'All' | 'Dog' | 'Cat' | 'Other'>('All');

  // Service Modal State
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceCatalogItem | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceCategory, setServiceCategory] = useState<ServiceMasterCategory>('WITHOUT_PACKAGE');
  const [serviceSpecies, setServiceSpecies] = useState<ServiceApplicableSpecies>('All');
  const [serviceRate, setServiceRate] = useState<number>(0);
  const [serviceGstApplicable, setServiceGstApplicable] = useState(true);
  const [serviceGstRate, setServiceGstRate] = useState<number>(18);
  const [serviceHsnSac, setServiceHsnSac] = useState('999799');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceActive, setServiceActive] = useState(true);

  // Package Modal State
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackageMaster | null>(null);
  const [packageName, setPackageName] = useState('');
  const [packageCategory, setPackageCategory] = useState<PackageMasterCategory>('DOG_DAY_CARE');
  const [packageSpecies, setPackageSpecies] = useState<ServiceApplicableSpecies>('Dog');
  const [packagePrice, setPackagePrice] = useState<number>(0);
  const [packageValidityDays, setPackageValidityDays] = useState<number>(30);
  const [packageGstApplicable, setPackageGstApplicable] = useState(true);
  const [packageGstRate, setPackageGstRate] = useState<number>(18);
  const [packageDescription, setPackageDescription] = useState('');
  const [packageActive, setPackageActive] = useState(true);

  // Long-Term Package Master Modal State
  const [showLtpModal, setShowLtpModal] = useState(false);
  const [editingLtp, setEditingLtp] = useState<LongTermContract | null>(null);
  const [ltpCode, setLtpCode] = useState('');
  const [ltpName, setLtpName] = useState('');
  const [ltpCategory, setLtpCategory] = useState('LONG_TERM_BOARDING');
  const [ltpSpecies, setLtpSpecies] = useState<ServiceApplicableSpecies>('All');
  const [ltpValidityDays, setLtpValidityDays] = useState<number>(365);
  const [ltpBillingFrequency, setLtpBillingFrequency] = useState('Monthly');
  const [ltpPaymentTerms, setLtpPaymentTerms] = useState('Net 30');
  const [ltpGstApplicable, setLtpGstApplicable] = useState(true);
  const [ltpGstRate, setLtpGstRate] = useState(18);
  const [ltpDescription, setLtpDescription] = useState('');
  const [ltpActive, setLtpActive] = useState(true);
  const [ltpComponents, setLtpComponents] = useState<LongTermContractItem[]>([]);

  const canEditService = hasPermission(currentUser, 'service_catalog_edit');
  const canDeleteService = hasPermission(currentUser, 'service_catalog_delete');
  const canEditPackage = hasPermission(currentUser, 'package_master_edit');
  const canDeletePackage = hasPermission(currentUser, 'package_master_delete');
  const canEditLongTerm = hasPermission(currentUser, 'long_term_package_create') || hasPermission(currentUser, 'long_term_package_edit');
  const canDeleteLongTerm = hasPermission(currentUser, 'long_term_package_delete');
  const canManageMonthly = hasPermission(currentUser, 'monthly_package_manage');
  const canDeleteMonthly = hasPermission(currentUser, 'monthly_package_delete');

  const handleOpenLtpModal = (pkg?: LongTermContract) => {
    if (pkg) {
      setEditingLtp(pkg);
      setLtpCode(pkg.contractCode);
      setLtpName(pkg.contractName);
      setLtpCategory(pkg.packageCategory || 'LONG_TERM_BOARDING');
      setLtpSpecies(pkg.applicableSpecies || 'All');
      setLtpValidityDays(pkg.validityDays || 365);
      setLtpBillingFrequency(pkg.billingFrequency || 'Monthly');
      setLtpPaymentTerms(pkg.paymentTerms || 'Net 30');
      setLtpGstApplicable(pkg.isGstApplicable !== false);
      setLtpGstRate(pkg.gstRate || 18);
      setLtpDescription(pkg.description || pkg.notes || '');
      setLtpActive(pkg.status === 'ACTIVE');
      setLtpComponents(pkg.components || []);
    } else {
      setEditingLtp(null);
      setLtpCode(`LTP-${new Date().getFullYear().toString().slice(-2)}${(new Date().getFullYear() + 1).toString().slice(-2)}-${Date.now().toString().slice(-4)}`);
      setLtpName('');
      setLtpCategory('LONG_TERM_BOARDING');
      setLtpSpecies('All');
      setLtpValidityDays(365);
      setLtpBillingFrequency('Monthly');
      setLtpPaymentTerms('Net 30');
      setLtpGstApplicable(true);
      setLtpGstRate(18);
      setLtpDescription('');
      setLtpActive(true);
      setLtpComponents([
        {
          id: `comp-ltp-${Date.now()}-1`,
          contractId: '',
          serviceName: 'Night Boarding Component',
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
    }
    setShowLtpModal(true);
  };

  const handleSaveLtpForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ltpName.trim()) {
      alert('Please enter Long-Term Package Name');
      return;
    }
    const totalVal = ltpComponents.reduce((sum, c) => sum + (c.fixedAmount || (c.rate * c.allocatedQuantity) || 0), 0);
    const payload: LongTermContract = {
      id: editingLtp?.id || `LTP-${Date.now().toString().slice(-4)}`,
      contractCode: ltpCode.trim() || `LTP-${Date.now().toString().slice(-4)}`,
      contractName: ltpName.trim(),
      packageCategory: ltpCategory,
      applicableSpecies: ltpSpecies,
      description: ltpDescription.trim(),
      validityDays: ltpValidityDays,
      customerId: 'PACKAGE_MASTER',
      customerName: 'Package Master Template',
      contractType: 'YEARLY',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + ltpValidityDays * 86400000).toISOString().slice(0, 10),
      billingFrequency: ltpBillingFrequency,
      paymentTerms: ltpPaymentTerms,
      creditDays: 30,
      currency: 'INR',
      isGstApplicable: ltpGstApplicable,
      gstRate: ltpGstRate,
      totalContractValue: totalVal,
      totalBilledAmount: 0,
      balanceDue: totalVal,
      status: ltpActive ? 'ACTIVE' : 'CANCELLED',
      notes: ltpDescription.trim(),
      components: ltpComponents
    };
    if (onSaveLongTermPackage) {
      await onSaveLongTermPackage(payload);
    }
    setShowLtpModal(false);
  };

  const handleOpenServiceModal = (item?: ServiceCatalogItem) => {
    if (item) {
      setEditingService(item);
      setServiceName(item.serviceName);
      setServiceCategory(item.category);
      setServiceSpecies(item.speciesApplicable);
      setServiceRate(item.baseRate);
      setServiceGstApplicable(item.isGstApplicable);
      setServiceGstRate(item.gstRate);
      setServiceHsnSac(item.hsnSac || '999799');
      setServiceDescription(item.description || '');
      setServiceActive(item.isActive);
    } else {
      setEditingService(null);
      setServiceName('');
      setServiceCategory('WITHOUT_PACKAGE');
      setServiceSpecies('All');
      setServiceRate(0);
      setServiceGstApplicable(true);
      setServiceGstRate(18);
      setServiceHsnSac('999799');
      setServiceDescription('');
      setServiceActive(true);
    }
    setShowServiceModal(true);
  };

  const handleSaveServiceForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      alert('Please enter Service Name');
      return;
    }
    const payload: ServiceCatalogItem = {
      id: editingService?.id || `SRV-${Date.now().toString().slice(-6)}`,
      serviceName: serviceName.trim(),
      category: serviceCategory,
      speciesApplicable: serviceSpecies,
      baseRate: Number(serviceRate) || 0,
      isGstApplicable: serviceGstApplicable,
      gstRate: serviceGstApplicable ? (Number(serviceGstRate) || 18) : 0,
      hsnSac: serviceHsnSac.trim() || '999799',
      description: serviceDescription.trim(),
      isActive: serviceActive
    };
    await onSaveService(payload);
    setShowServiceModal(false);
  };

  const handleOpenPackageModal = (pkg?: ServicePackageMaster) => {
    if (pkg) {
      setEditingPackage(pkg);
      setPackageName(pkg.packageName);
      setPackageCategory(pkg.category);
      setPackageSpecies(pkg.petSpecies);
      setPackagePrice(pkg.packagePrice);
      setPackageValidityDays(pkg.validityDays);
      setPackageGstApplicable(pkg.isGstApplicable);
      setPackageGstRate(pkg.gstRate);
      setPackageDescription(pkg.description || '');
      setPackageActive(pkg.isActive);
    } else {
      setEditingPackage(null);
      setPackageName('');
      setPackageCategory('DOG_DAY_CARE');
      setPackageSpecies('Dog');
      setPackagePrice(0);
      setPackageValidityDays(30);
      setPackageGstApplicable(true);
      setPackageGstRate(18);
      setPackageDescription('');
      setPackageActive(true);
    }
    setShowPackageModal(true);
  };

  const handleSavePackageForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim()) {
      alert('Please enter Package Name');
      return;
    }
    const payload: ServicePackageMaster = {
      id: editingPackage?.id || `PKG-${Date.now().toString().slice(-6)}`,
      packageName: packageName.trim(),
      category: packageCategory,
      petSpecies: packageSpecies,
      packagePrice: Number(packagePrice) || 0,
      validityDays: Number(packageValidityDays) || 30,
      isGstApplicable: packageGstApplicable,
      gstRate: packageGstApplicable ? (Number(packageGstRate) || 18) : 0,
      hsnSac: '999799',
      description: packageDescription.trim(),
      isActive: packageActive
    };
    await onSavePackage(payload);
    setShowPackageModal(false);
  };

  // Build unified services array combining database-managed services and retail catalog items without duplicates
  const unifiedServices: ServiceCatalogItem[] = [
    ...services,
    ...CATALOG_ITEMS
      .filter(cat => !services.some(s => s.serviceName.toLowerCase() === cat.name.toLowerCase() || s.id === cat.id))
      .map(cat => ({
        id: cat.id,
        serviceName: cat.name,
        category: (cat.type === 'SERVICE' ? (cat.category?.toUpperCase() || 'WITHOUT_PACKAGE') : 'RETAIL_PRODUCT') as any,
        speciesApplicable: (cat.name.toLowerCase().includes('canine') || cat.name.toLowerCase().includes('dog') ? 'Dog' :
                            cat.name.toLowerCase().includes('feline') || cat.name.toLowerCase().includes('cat') ? 'Cat' : 'All') as any,
        description: `${cat.type === 'SERVICE' ? 'Care Service' : 'Retail Product'} • Unit: ${cat.unit}`,
        baseRate: cat.price,
        isGstApplicable: true,
        gstRate: cat.gstRate || 18,
        hsnSac: cat.hsnSac || '999799',
        isActive: true
      }))
  ];

  const filteredServices = unifiedServices.filter(s => {
    if (speciesFilter !== 'All' && s.speciesApplicable !== 'All' && s.speciesApplicable !== speciesFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.serviceName.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredPackages = packages.filter(p => {
    if (speciesFilter !== 'All' && p.petSpecies !== 'All' && p.petSpecies !== speciesFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.packageName.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-[#D62828]" />
            Service Catalog & Package Master
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Configure care services, species tariffs, package tiers, and monthly subscription billings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'services' && canEditService && (
            <button
              onClick={() => handleOpenServiceModal()}
              className="px-3.5 py-2 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Service</span>
            </button>
          )}

          {activeTab === 'packages' && canEditPackage && (
            <button
              onClick={() => handleOpenPackageModal()}
              className="px-3.5 py-2 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Standard Package</span>
            </button>
          )}

          {activeTab === 'long_term' && canEditLongTerm && (
            <button
              onClick={() => handleOpenLtpModal()}
              className="px-3.5 py-2 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Long-Term Package</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('services')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
              activeTab === 'services'
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            Services Catalog ({services.length})
          </button>

          <button
            onClick={() => setActiveTab('packages')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
              activeTab === 'packages'
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            Standard Packages ({packages.length})
          </button>

          <button
            onClick={() => setActiveTab('long_term')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
              activeTab === 'long_term'
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            Long-Term Packages ({longTermPackages.length})
          </button>

          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
              activeTab === 'monthly'
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            Monthly Subscriptions ({monthlyPackages.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium w-44 sm:w-56"
            />
          </div>

          <select
            value={speciesFilter}
            onChange={e => setSpeciesFilter(e.target.value as any)}
            className="p-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold"
          >
            <option value="All">All Species</option>
            <option value="Dog">Dog Only</option>
            <option value="Cat">Cat Only</option>
            <option value="Other">Other Species</option>
          </select>
        </div>
      </div>

      {/* TAB 1: SERVICES CATALOG */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredServices.map(s => (
            <div
              key={s.id}
              className={`bg-white dark:bg-zinc-900 p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                s.isActive
                  ? 'border-slate-200 dark:border-zinc-800 shadow-2xs hover:border-slate-300'
                  : 'border-slate-200 dark:border-zinc-800 opacity-60 bg-slate-50 dark:bg-zinc-900/50'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {s.serviceName}
                    </h3>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                      {s.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                    s.speciesApplicable === 'Dog' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                    s.speciesApplicable === 'Cat' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {s.speciesApplicable}
                  </span>
                </div>

                {s.description && (
                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">
                    {s.description}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Base Rate:</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                      {formatINR(s.baseRate)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">GST Tax:</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">
                      {s.isGstApplicable ? `${s.gstRate}% GST` : 'Zero GST / Exempt'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <span className={`text-[10px] font-bold flex items-center gap-1 ${
                  s.isActive ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {s.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>

                <div className="flex items-center gap-1">
                  {canEditService && (
                    <button
                      onClick={() => handleOpenServiceModal(s)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Edit Service Master"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}

                  {canDeleteService && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Permanently delete service "${s.serviceName}"?`)) {
                          onDeleteService(s.id);
                        }
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg cursor-pointer"
                      title="Delete Service (Accountant Only)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredServices.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">No Services Configured</p>
              <p className="text-xs text-slate-400 mt-1">
                {canEditService
                  ? 'Use the "+ Add Service" button above to add care services.'
                  : 'Contact Administrator or Accountant to configure services.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PACKAGE MASTER */}
      {activeTab === 'packages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredPackages.map(p => (
            <div
              key={p.id}
              className={`bg-white dark:bg-zinc-900 p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                p.isActive
                  ? 'border-slate-200 dark:border-zinc-800 shadow-2xs hover:border-slate-300'
                  : 'border-slate-200 dark:border-zinc-800 opacity-60 bg-slate-50 dark:bg-zinc-900/50'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {p.packageName}
                    </h3>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                      {p.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {p.validityDays} Days
                  </span>
                </div>

                {p.description && (
                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">
                    {p.description}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Package Price:</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                      {formatINR(p.packagePrice)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Tax Rate:</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">
                      {p.isGstApplicable ? `${p.gstRate}% GST` : 'Zero GST'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <span className={`text-[10px] font-bold flex items-center gap-1 ${
                  p.isActive ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {p.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {p.isActive ? 'Active' : 'Inactive'}
                </span>

                <div className="flex items-center gap-1">
                  {canEditPackage && (
                    <button
                      onClick={() => handleOpenPackageModal(p)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Edit Package Master"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}

                  {canDeletePackage && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Permanently delete package "${p.packageName}"?`)) {
                          onDeletePackage(p.id);
                        }
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg cursor-pointer"
                      title="Delete Package (Accountant Only)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredPackages.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">No Standard Packages Configured</p>
              <p className="text-xs text-slate-400 mt-1">
                {canEditPackage
                  ? 'Use the "+ Add Standard Package" button above to configure packages.'
                  : 'Contact Administrator or Accountant to configure packages.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LONG-TERM PACKAGES (Phase 4.5 Package Master) */}
      {activeTab === 'long_term' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {longTermPackages
            .filter(ltp => {
              if (speciesFilter !== 'All' && ltp.applicableSpecies && ltp.applicableSpecies !== 'All' && ltp.applicableSpecies !== speciesFilter) {
                return false;
              }
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return ltp.contractName.toLowerCase().includes(q) || (ltp.contractCode && ltp.contractCode.toLowerCase().includes(q));
              }
              return true;
            })
            .map(ltp => (
              <div
                key={ltp.id}
                className={`bg-white dark:bg-zinc-900 p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  ltp.status === 'ACTIVE'
                    ? 'border-purple-200 dark:border-purple-900/60 shadow-2xs hover:border-purple-300'
                    : 'border-slate-200 dark:border-zinc-800 opacity-60 bg-slate-50 dark:bg-zinc-900/50'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>🏢</span>
                        <span>{ltp.contractName}</span>
                      </h3>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        {ltp.contractCode}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      {ltp.billingFrequency || 'Monthly'}
                    </span>
                  </div>

                  {ltp.description && (
                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">
                      {ltp.description}
                    </p>
                  )}

                  {/* Components Allocation Preview */}
                  {ltp.components && ltp.components.length > 0 && (
                    <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl space-y-1 text-xs">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                        Included Components ({ltp.components.length}):
                      </span>
                      {ltp.components.map(c => (
                        <div key={c.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-700 dark:text-zinc-300 font-medium truncate max-w-[170px]">
                            • {c.serviceName} ({c.allocatedQuantity} {c.unit})
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {formatINR(c.fixedAmount || (c.rate * c.allocatedQuantity) || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Package Value:</span>
                      <span className="text-sm font-black text-purple-700 dark:text-purple-400 font-mono">
                        {formatINR(ltp.totalContractValue || ltp.components?.reduce((sum, c) => sum + (c.fixedAmount || (c.rate * c.allocatedQuantity) || 0), 0) || 0)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">GST Rate:</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">
                        {ltp.isGstApplicable ? `${ltp.gstRate}% GST` : 'Zero GST'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className={`text-[10px] font-bold flex items-center gap-1 ${
                    ltp.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {ltp.status === 'ACTIVE' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {ltp.status}
                  </span>

                  <div className="flex items-center gap-1">
                    {canEditLongTerm && (
                      <button
                        onClick={() => handleOpenLtpModal(ltp)}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/60 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Edit Long-Term Package Master"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}

                    {canDeleteLongTerm && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Permanently delete Long-Term Package "${ltp.contractName}"?`)) {
                            if (onDeleteLongTermPackage) {
                              onDeleteLongTermPackage(ltp.id);
                            }
                          }
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg cursor-pointer"
                        title="Delete Long-Term Package Master"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

          {longTermPackages.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">No Long-Term Packages Configured</p>
              <p className="text-xs text-slate-400 mt-1">
                {canEditLongTerm
                  ? 'Use the "+ Add Long-Term Package" button above to configure packages.'
                  : 'Contact Administrator or Accountant to configure long-term packages.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MONTHLY SUBSCRIPTIONS */}
      {activeTab === 'monthly' && (
        <div className="space-y-3">
          <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] uppercase font-bold">
                  <th className="p-3">Sub Code</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Pet</th>
                  <th className="p-3">Package</th>
                  <th className="p-3">Period</th>
                  <th className="p-3 text-right">Monthly Fee</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {monthlyPackages.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      {m.subscriptionCode}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800 dark:text-zinc-200 block">{m.customerName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{m.customerPhone}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{m.petName}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{m.petSpecies}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{m.packageName}</span>
                    </td>
                    <td className="p-3 text-[11px] font-mono text-slate-600 dark:text-zinc-400">
                      {m.startDate} → {m.endDate}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatINR(m.totalMonthlyAmount)}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                        m.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        m.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                        'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onGenerateMonthlyInvoice(m)}
                          className="px-2.5 py-1 bg-[#D62828] hover:bg-red-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Generate GST Invoice for this Month"
                        >
                          Bill Invoice
                        </button>
                        {canDeleteMonthly && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete subscription ${m.subscriptionCode}?`)) {
                                onDeleteMonthlyPackage(m.id);
                              }
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg cursor-pointer"
                            title="Delete Monthly Subscription"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {monthlyPackages.length === 0 && (
              <div className="py-12 text-center text-slate-400 dark:text-zinc-600">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">No Active Monthly Packages</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SERVICE MODAL */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-[#D62828]" />
                {editingService ? 'Edit Service Master Record' : 'Add New Service Master Record'}
              </h3>
              <button onClick={() => setShowServiceModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveServiceForm} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dog Day Care (Full Day)"
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Category</label>
                  <select
                    value={serviceCategory}
                    onChange={e => setServiceCategory(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  >
                    <option value="WITHOUT_PACKAGE">Without Package / Individual</option>
                    <option value="DOG_SERVICE">Dog Care Service</option>
                    <option value="CAT_SERVICE">Cat Care Service</option>
                    <option value="MANUAL_AMOUNT">Manual Amount Care</option>
                    <option value="PICK_DROP">Pick & Drop Service</option>
                    <option value="OTHER_SERVICE">Other / Custom Service</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Applicable Species</label>
                  <select
                    value={serviceSpecies}
                    onChange={e => setServiceSpecies(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  >
                    <option value="All">All Species (Universal)</option>
                    <option value="Dog">Dog Only</option>
                    <option value="Cat">Cat Only</option>
                    <option value="Other">Other Species</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Base Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={serviceRate}
                    onChange={e => setServiceRate(Number(e.target.value))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">GST Applicable?</label>
                  <select
                    value={serviceGstApplicable ? 'YES' : 'NO'}
                    onChange={e => setServiceGstApplicable(e.target.value === 'YES')}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-bold"
                  >
                    <option value="YES">YES (Taxable)</option>
                    <option value="NO">NO (Zero GST)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">GST Rate (%)</label>
                  <select
                    disabled={!serviceGstApplicable}
                    value={serviceGstRate}
                    onChange={e => setServiceGstRate(Number(e.target.value))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono disabled:opacity-50"
                  >
                    <option value={18}>18%</option>
                    <option value={12}>12%</option>
                    <option value={5}>5%</option>
                    <option value={0}>0%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={serviceDescription}
                  onChange={e => setServiceDescription(e.target.value)}
                  placeholder="Optional service details or terms..."
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="srvActive"
                  checked={serviceActive}
                  onChange={e => setServiceActive(e.target.checked)}
                  className="rounded text-[#D62828]"
                />
                <label htmlFor="srvActive" className="font-bold text-slate-700 dark:text-zinc-300">
                  Active Service (Available for Billing)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D62828] text-white rounded-xl font-bold shadow-md hover:bg-red-700"
                >
                  {editingService ? 'Update Service' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PACKAGE MODAL */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-[#D62828]" />
                {editingPackage ? 'Edit Package Master Record' : 'Add New Package Master Record'}
              </h3>
              <button onClick={() => setShowPackageModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePackageForm} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Package Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Dog Day Care Package"
                  value={packageName}
                  onChange={e => setPackageName(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Package Category</label>
                  <select
                    value={packageCategory}
                    onChange={e => setPackageCategory(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  >
                    <option value="DOG_DAY_CARE">Dog Day Care Package</option>
                    <option value="CAT_DAY_CARE">Cat Day Care Package</option>
                    <option value="DOG_NIGHT_CARE">Dog Night Care Package</option>
                    <option value="CAT_NIGHT_CARE">Cat Night Care Package</option>
                    <option value="BOARDING_PACKAGE">Boarding Care Package</option>
                    <option value="GROOMING_PACKAGE">Grooming Care Package</option>
                    <option value="TRAINING_PACKAGE">Training Package</option>
                    <option value="PICK_DROP_PACKAGE">Pick & Drop Package</option>
                    <option value="CUSTOM_PACKAGE">Custom Bundled Package</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Species</label>
                  <select
                    value={packageSpecies}
                    onChange={e => setPackageSpecies(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                  >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="All">All / Universal</option>
                    <option value="Other">Other Species</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Package Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={packagePrice}
                    onChange={e => setPackagePrice(Number(e.target.value))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={packageValidityDays}
                    onChange={e => setPackageValidityDays(Number(e.target.value))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">GST (%)</label>
                  <select
                    value={packageGstRate}
                    onChange={e => setPackageGstRate(Number(e.target.value))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono"
                  >
                    <option value={18}>18%</option>
                    <option value={12}>12%</option>
                    <option value={5}>5%</option>
                    <option value={0}>0%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Description / Services Included</label>
                <textarea
                  rows={2}
                  value={packageDescription}
                  onChange={e => setPackageDescription(e.target.value)}
                  placeholder="e.g. 30 days full day care with 2 meals included..."
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pkgActive"
                  checked={packageActive}
                  onChange={e => setPackageActive(e.target.checked)}
                  className="rounded text-[#D62828]"
                />
                <label htmlFor="pkgActive" className="font-bold text-slate-700 dark:text-zinc-300">
                  Active Package Tier
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPackageModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D62828] text-white rounded-xl font-bold shadow-md hover:bg-red-700"
                >
                  {editingPackage ? 'Update Package' : 'Save Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LONG-TERM PACKAGE MASTER MODAL (Customer-Agnostic Reusable Master) */}
      {showLtpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-zinc-800 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>🏢</span>
                <span>{editingLtp ? 'Edit Long-Term Package Master' : 'Create Long-Term Package Master'}</span>
              </h2>
              <button
                onClick={() => setShowLtpModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLtpForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Package Code *</label>
                  <input
                    type="text"
                    required
                    value={ltpCode}
                    onChange={e => setLtpCode(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Package Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 180-Night Canine Boarding & Transit Tier"
                    value={ltpName}
                    onChange={e => setLtpName(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Applicable Species</label>
                  <select
                    value={ltpSpecies}
                    onChange={e => setLtpSpecies(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium"
                  >
                    <option value="All">All Species (Dog + Cat)</option>
                    <option value="Dog">Dog Only</option>
                    <option value="Cat">Cat Only</option>
                    <option value="Other">Other Species</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Billing Frequency</label>
                  <select
                    value={ltpBillingFrequency}
                    onChange={e => setLtpBillingFrequency(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Custom Term">Custom Term</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={ltpValidityDays}
                    onChange={e => setLtpValidityDays(Number(e.target.value) || 30)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono"
                  />
                </div>
              </div>

              {/* Components Allocation Section */}
              <div className="space-y-2 border-t border-slate-100 dark:border-zinc-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-zinc-200">
                    Package Components & Tariff Allocations
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newComp: LongTermContractItem = {
                        id: `comp-ltp-${Date.now()}-${ltpComponents.length + 1}`,
                        contractId: '',
                        serviceName: 'Additional Service Component',
                        speciesApplicable: ltpSpecies === 'Cat' ? 'Cat' : 'Dog',
                        pricingMethod: 'FIXED_RATE',
                        allocatedQuantity: 10,
                        unit: 'Nights',
                        rate: 600,
                        fixedAmount: 6000,
                        isGstApplicable: true,
                        gstRate: 18,
                        hsnSac: '999799',
                        usedQuantity: 0
                      };
                      setLtpComponents([...ltpComponents, newComp]);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add Component</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {ltpComponents.map((comp, idx) => (
                    <div key={comp.id} className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-700/60 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Service Name *</label>
                          <input
                            type="text"
                            required
                            value={comp.serviceName}
                            onChange={e => {
                              const updated = [...ltpComponents];
                              updated[idx].serviceName = e.target.value;
                              setLtpComponents(updated);
                            }}
                            className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Species</label>
                          <select
                            value={comp.speciesApplicable}
                            onChange={e => {
                              const updated = [...ltpComponents];
                              updated[idx].speciesApplicable = e.target.value;
                              setLtpComponents(updated);
                            }}
                            className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
                          >
                            <option value="Dog">Dog</option>
                            <option value="Cat">Cat</option>
                            <option value="All">All Species</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Unit</label>
                          <input
                            type="text"
                            value={comp.unit}
                            onChange={e => {
                              const updated = [...ltpComponents];
                              updated[idx].unit = e.target.value;
                              setLtpComponents(updated);
                            }}
                            className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 items-end">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Allocated Qty</label>
                          <input
                            type="number"
                            min={0}
                            value={comp.allocatedQuantity}
                            onChange={e => {
                              const updated = [...ltpComponents];
                              const qty = Number(e.target.value) || 0;
                              updated[idx].allocatedQuantity = qty;
                              updated[idx].fixedAmount = qty * updated[idx].rate;
                              setLtpComponents(updated);
                            }}
                            className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Rate (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={comp.rate}
                            onChange={e => {
                              const updated = [...ltpComponents];
                              const rate = Number(e.target.value) || 0;
                              updated[idx].rate = rate;
                              updated[idx].fixedAmount = updated[idx].allocatedQuantity * rate;
                              setLtpComponents(updated);
                            }}
                            className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Total (₹)</label>
                          <input
                            type="number"
                            disabled
                            value={comp.fixedAmount}
                            className="w-full p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="flex justify-end pb-0.5">
                          {ltpComponents.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setLtpComponents(ltpComponents.filter((_, i) => i !== idx));
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-lg cursor-pointer"
                              title="Remove Component"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Description / Terms</label>
                <textarea
                  rows={2}
                  value={ltpDescription}
                  onChange={e => setLtpDescription(e.target.value)}
                  placeholder="Terms of long-term boarding, inclusions, rollover policies..."
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ltpActiveCheck"
                  checked={ltpActive}
                  onChange={e => setLtpActive(e.target.checked)}
                  className="rounded text-[#D62828]"
                />
                <label htmlFor="ltpActiveCheck" className="font-bold text-slate-700 dark:text-zinc-300">
                  Active Package Master
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowLtpModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D62828] text-white rounded-xl font-bold shadow-md hover:bg-red-700 cursor-pointer"
                >
                  {editingLtp ? 'Update Long-Term Package' : 'Save Long-Term Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
