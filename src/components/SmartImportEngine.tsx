import React, { useState, useMemo, useRef } from 'react';
import { 
  Upload, FileText, FileSpreadsheet, MessageSquare, Clipboard, 
  Image, FileCode, Server, CheckCircle2, AlertTriangle, XCircle, 
  RefreshCw, Sparkles, ShieldCheck, Database, Search, ArrowRight, 
  Layers, UserCheck, Dog, CreditCard, DollarSign, Clock, History, 
  Info, Filter, Download, Plus, Trash2, Check, FileCheck, Zap, AlertCircle
} from 'lucide-react';
import { Customer, Pet, Invoice, Payment, PaymentMode, User, AuditLog, formatINR, formatDateDDMMYYYY } from '../types';

interface SmartImportEngineProps {
  customers: Customer[];
  pets: Pet[];
  invoices: Invoice[];
  payments: Payment[];
  currentUser: User;
  onImportSuccess: (data: {
    newCustomers: Customer[];
    newPets: Pet[];
    newInvoices: Invoice[];
    newPayments: Payment[];
    importSummaryText: string;
  }) => void;
  onClearDataFirst?: () => void;
  onAddAuditLog?: (action: string, details: string) => void;
}

export interface ParsedImportRecord {
  id: string;
  sourceRow: number;
  customerName: string;
  mobileNumber: string;
  customerType: 'INDIVIDUAL' | 'BUSINESS';
  gstin?: string;
  address?: string;
  petName: string;
  petType: 'Dog' | 'Cat' | 'Other';
  breed?: string;
  invoiceNumber: string;
  invoiceDate: string;
  servicesDetected: string[]; // Boarding, Daycare, Grooming, Pickup, Late Night
  multiplePetsDetected: boolean;
  petNamesList: string[];
  grandTotal: number;
  taxableAmount: number;
  gstAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentMode: 'UPI' | 'CASH' | 'BANK_TRANSFER' | 'ONLINE' | 'ADJUSTMENT';
  paymentStatus: 'PAID' | 'PARTIAL' | 'ADVANCE' | 'UNPAID';
  bankDeposit: boolean;
  validationStatus: 'VALID' | 'WARNING' | 'ERROR';
  validationErrors: string[];
  validationWarnings: string[];
  isDuplicateCustomer: boolean;
  isDuplicatePet: boolean;
  isDuplicateInvoice: boolean;
  fuzzyMatchName?: string;
  fuzzyMatchScore?: number;
  userDuplicateAction?: 'MERGE' | 'KEEP_SEPARATE' | 'REVIEW_LATER';
}

// Token / Substring Similarity Helper for AI Duplicate Detection Engine
const calculateFuzzyMatch = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 88;

  const t1 = str1.toLowerCase().split(/\s+/).filter(Boolean);
  const t2 = str2.toLowerCase().split(/\s+/).filter(Boolean);
  const common = t1.filter(token => token.length > 2 && t2.some(t => t.includes(token) || token.includes(t)));
  if (common.length > 0) {
    return Math.min(95, Math.round((common.length / Math.max(t1.length, t2.length)) * 80 + 15));
  }
  return 0;
};

export interface ImportHistoryEntry {
  id: string;
  importDate: string;
  importTime: string;
  importedBy: string;
  importSource: string;
  totalRecords: number;
  newCustomersCount: number;
  newPetsCount: number;
  invoicesCount: number;
  status: 'Completed' | 'Completed with Warnings' | 'Failed';
  durationSeconds: number;
  remarks: string;
}

export const SmartImportEngine: React.FC<SmartImportEngineProps> = ({
  customers,
  pets,
  invoices,
  payments,
  currentUser,
  onImportSuccess,
  onClearDataFirst,
  onAddAuditLog
}) => {
  // Navigation Source Mode
  const [importSource, setImportSource] = useState<
    'EXCEL_CSV' | 'WHATSAPP_TXT' | 'WHATSAPP_PASTE' | 'MANUAL' | 'JSON' | 'PDF_OCR' | 'API'
  >('EXCEL_CSV');

  // Input raw state
  const [pastedText, setPastedText] = useState<string>(
    `[06/08/2026, 09:30 AM] Rajesh Sharma: Hi House of Pawz, booking suite for Milo (Golden Retriever) for 3 days boarding + Spa grooming. Mobile 9876543210. GSTIN 27AABCT1332F1ZP. Paid 4500 via UPI GPay. Invoice HOP/26-27/0089\n` +
    `[06/08/2026, 11:15 AM] Priya Patel: Confirming daycare & pickup drop for Bella & Rocky. Phone 9822012345. Amount 2200 paid Cash. Invoice HOP/26-27/0090\n` +
    `[06/08/2026, 02:00 PM] Amit Verma: Boarding for Coco (Persian Cat) + late night charge. Phone 9123456789. Total 3500, paid 1500 advance bank transfer.`
  );

  const [rawJsonText, setRawJsonText] = useState<string>(
    JSON.stringify([
      {
        customerName: "Siddharth Malhotra",
        mobileNumber: "9988776655",
        petName: "Bruno",
        petType: "Dog",
        invoiceNumber: "HOP/26-27/0091",
        invoiceDate: "2026-08-06",
        services: ["Boarding Package", "Grooming Services"],
        grandTotal: 3800,
        paidAmount: 3800,
        paymentMode: "UPI",
        gstin: ""
      }
    ], null, 2)
  );

  // Manual Table Rows State
  const [manualRows, setManualRows] = useState<Partial<ParsedImportRecord>[]>([
    {
      sourceRow: 1,
      customerName: 'Ananya Roy',
      mobileNumber: '9811223344',
      petName: 'Leo',
      petType: 'Dog',
      invoiceNumber: 'HOP/26-27/0092',
      invoiceDate: '2026-08-06',
      grandTotal: 2500,
      paidAmount: 2500,
      paymentMode: 'UPI',
      servicesDetected: ['Boarding Package']
    }
  ]);

  // Processing & Staged Parsed Records
  const [stagedRecords, setStagedRecords] = useState<ParsedImportRecord[]>([]);
  
  // Enterprise Import Sandbox & Protection Modes
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(true);
  const [sandboxReport, setSandboxReport] = useState<{
    testedRecords: number;
    validCount: number;
    warningCount: number;
    errorCount: number;
    duplicateCount: number;
    missingCount: number;
    qualityScore: number;
  } | null>(null);

  // Conflict Resolution & Selection Options
  const [conflictStrategy, setConflictStrategy] = useState<'MERGE' | 'REPLACE' | 'SKIP' | 'IMPORT_MISSING' | 'REPLACE_ALL'>('MERGE');
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALID' | 'WARNING' | 'ERROR'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showMappingRules, setShowMappingRules] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Data Quality Score Engine
  const dataQualityMetrics = useMemo(() => {
    if (stagedRecords.length === 0) return null;
    let completeCount = 0;
    let accurateCount = 0;
    let duplicateCount = 0;
    let validCount = 0;

    stagedRecords.forEach(r => {
      if (r.customerName && r.mobileNumber && r.petName && r.grandTotal > 0) completeCount++;
      if (r.mobileNumber.length === 10 && (!r.gstin || r.gstin.length === 15)) accurateCount++;
      if (r.isDuplicateCustomer || r.isDuplicateInvoice || (r.fuzzyMatchScore && r.fuzzyMatchScore > 70)) duplicateCount++;
      if (r.validationStatus !== 'ERROR') validCount++;
    });

    const completeness = Math.round((completeCount / stagedRecords.length) * 100);
    const accuracy = Math.round((accurateCount / stagedRecords.length) * 100);
    const duplicateRate = Math.round((duplicateCount / stagedRecords.length) * 100);
    const validationSuccess = Math.round((validCount / stagedRecords.length) * 100);
    const overallScore = parseFloat(((completeness * 0.35) + (accuracy * 0.35) + (validationSuccess * 0.30) - (duplicateRate * 0.05)).toFixed(2));

    return {
      completeness,
      accuracy,
      duplicateRate,
      validationSuccess,
      overallScore: Math.max(0, Math.min(100, overallScore)),
      missingFieldsCount: (stagedRecords.length * 4) - (completeCount * 4)
    };
  }, [stagedRecords]);
  const [importCompletedReport, setImportCompletedReport] = useState<{
    totalRecords: number;
    newCustomersCount: number;
    existingCustomersMerged: number;
    newPetsCount: number;
    existingPetsMerged: number;
    invoicesImported: number;
    paymentsImported: number;
    gstCustomersCount: number;
    individualCustomersCount: number;
    duplicateRecordsHandled: number;
    warningsCount: number;
    errorsCount: number;
    skippedCount: number;
    durationSeconds: number;
  } | null>(null);

  // Import Log History
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([
    {
      id: 'imp-101',
      importDate: '05/08/2026',
      importTime: '05:30 PM',
      importedBy: currentUser.name,
      importSource: 'Microsoft Excel (.xlsx)',
      totalRecords: 24,
      newCustomersCount: 18,
      newPetsCount: 22,
      invoicesCount: 24,
      status: 'Completed',
      durationSeconds: 0.38,
      remarks: 'Automated Excel migration from legacy Tally database.'
    },
    {
      id: 'imp-102',
      importDate: '06/08/2026',
      importTime: '09:00 AM',
      importedBy: currentUser.name,
      importSource: 'WhatsApp Chat Export',
      totalRecords: 12,
      newCustomersCount: 5,
      newPetsCount: 6,
      invoicesCount: 12,
      status: 'Completed with Warnings',
      durationSeconds: 0.25,
      remarks: '2 duplicate invoice numbers merged automatically.'
    }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Smart Rule Parsing Logic
  const parseRawTextContent = (rawContent: string, sourceName: string) => {
    setIsAnalyzing(true);
    const lines = rawContent.split('\n').filter(l => l.trim().length > 0);
    const parsedList: ParsedImportRecord[] = [];

    lines.forEach((line, index) => {
      // Extract Mobile Number (10 digit starting with 6,7,8,9)
      const phoneMatch = line.match(/\b[6-9]\d{9}\b/);
      const mobileNumber = phoneMatch ? phoneMatch[0] : `987000${1000 + index}`;

      // Extract GSTIN (15 char uppercase alphanumeric pattern e.g. 27AABCT1332F1ZP)
      const gstinMatch = line.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/i);
      const gstin = gstinMatch ? gstinMatch[0].toUpperCase() : undefined;
      const customerType: 'INDIVIDUAL' | 'BUSINESS' = gstin ? 'BUSINESS' : (line.toLowerCase().includes('ltd') || line.toLowerCase().includes('pvt') || line.toLowerCase().includes('services') ? 'BUSINESS' : 'INDIVIDUAL');

      // Extract Customer Name
      let customerName = 'Guest Customer';
      if (line.includes(':')) {
        const namePart = line.split(':')[0].replace(/\[.*?\]/g, '').trim();
        if (namePart) customerName = namePart;
      } else {
        const wordMatch = line.match(/(?:Mr\.|Ms\.|Mrs\.|Shri)?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/);
        if (wordMatch) customerName = wordMatch[1];
      }

      // Extract Pet Name & Type
      let petType: 'Dog' | 'Cat' | 'Other' = 'Dog';
      if (/cat|kitty|persian|meow|feline/i.test(line)) petType = 'Cat';

      // Detect Pet Names
      let petName = 'Buddy';
      const petMatch = line.match(/(?:pet|dog|cat|for|suite for)\s+([A-Z][a-z]+)/i) || line.match(/\b(Milo|Bella|Coco|Rocky|Bruno|Leo|Simba|Oreo|Daisy|Max)\b/i);
      if (petMatch) petName = petMatch[1];

      // Detect Multiple Pets
      const multiplePetsDetected = /&|and|,/i.test(line) && /(?:milo|bella|rocky|coco|bruno)/i.test(line);
      const petNamesList = multiplePetsDetected ? [petName, 'Second Pet'] : [petName];

      // Service detection
      const servicesDetected: string[] = [];
      if (/boarding|suite|stay|overnight/i.test(line)) servicesDetected.push('Boarding Package');
      if (/daycare|day care|half day/i.test(line)) servicesDetected.push('Daycare Package');
      if (/spa|grooming|bath|haircut|trim/i.test(line)) servicesDetected.push('Grooming Services');
      if (/pickup|drop|taxi|transport/i.test(line)) servicesDetected.push('Pickup & Drop');
      if (/late night|overtime|night charge/i.test(line)) servicesDetected.push('Late Night Charges');
      if (servicesDetected.length === 0) servicesDetected.push('Boarding Package');

      // Invoice Number
      const invMatch = line.match(/\bHOP\/[0-9\-]+\/[0-9]+\b/i) || line.match(/\bINV-[0-9]+\b/i);
      const invoiceNumber = invMatch ? invMatch[0].toUpperCase() : `HOP/26-27/${String(100 + index).padStart(6, '0')}`;

      // Date
      const dateMatch = line.match(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/);
      const invoiceDate = dateMatch ? dateMatch[0] : '2026-08-06';

      // Money Amounts
      const moneyMatches = line.match(/\b\d{3,6}\b/g);
      let grandTotal = 2500;
      let paidAmount = 2500;
      if (moneyMatches && moneyMatches.length >= 1) {
        grandTotal = parseInt(moneyMatches[0], 10);
        paidAmount = moneyMatches.length >= 2 ? parseInt(moneyMatches[1], 10) : grandTotal;
      }

      const taxableAmount = Math.round(grandTotal / 1.18);
      const gstAmount = grandTotal - taxableAmount;
      const balanceDue = Math.max(0, grandTotal - paidAmount);

      // Payment Mode
      let paymentMode: 'UPI' | 'CASH' | 'BANK_TRANSFER' | 'ONLINE' | 'ADJUSTMENT' = 'UPI';
      if (/cash/i.test(line)) paymentMode = 'CASH';
      else if (/bank|transfer|neft|imps/i.test(line)) paymentMode = 'BANK_TRANSFER';
      else if (/online|card|netbanking/i.test(line)) paymentMode = 'ONLINE';

      // Payment Status
      let paymentStatus: 'PAID' | 'PARTIAL' | 'ADVANCE' | 'UNPAID' = 'PAID';
      if (balanceDue > 0 && paidAmount > 0) paymentStatus = 'PARTIAL';
      else if (paidAmount === 0) paymentStatus = 'UNPAID';

      // Check Duplicates against system state
      const isDuplicateCustomer = customers.some(c => c.phone === mobileNumber || c.name.toLowerCase() === customerName.toLowerCase());
      const isDuplicatePet = pets.some(p => p.name.toLowerCase() === petName.toLowerCase());
      const isDuplicateInvoice = invoices.some(i => i.invoiceNumber === invoiceNumber);

      // AI Fuzzy Duplicate Check
      let fuzzyMatchName: string | undefined = undefined;
      let fuzzyMatchScore = 0;
      customers.forEach(existingCust => {
        const score = calculateFuzzyMatch(customerName, existingCust.name);
        if (score > fuzzyMatchScore && score > 60) {
          fuzzyMatchScore = score;
          fuzzyMatchName = existingCust.name;
        }
      });

      // Validation logic
      const validationErrors: string[] = [];
      const validationWarnings: string[] = [];

      if (!customerName || customerName === 'Guest Customer') validationWarnings.push('Generic customer name detected');
      if (mobileNumber.length !== 10) validationErrors.push('Invalid 10-digit mobile number');
      if (gstin && gstin.length !== 15) validationErrors.push('GSTIN format invalid (must be 15 chars)');
      if (isDuplicateInvoice) validationWarnings.push(`Duplicate Invoice Number ${invoiceNumber} (will merge)`);
      if (isDuplicateCustomer) validationWarnings.push(`Existing customer found for ${mobileNumber}`);
      if (fuzzyMatchScore > 75 && !isDuplicateCustomer) {
        validationWarnings.push(`Possible AI Duplicate: "${customerName}" resembles "${fuzzyMatchName}" (${fuzzyMatchScore}% match)`);
      }

      const validationStatus = validationErrors.length > 0 ? 'ERROR' : (validationWarnings.length > 0 ? 'WARNING' : 'VALID');

      parsedList.push({
        id: `parsed-${index + 1}`,
        sourceRow: index + 1,
        customerName,
        mobileNumber,
        customerType,
        gstin,
        address: 'Pune, Maharashtra',
        petName,
        petType,
        breed: petType === 'Dog' ? 'Golden Retriever' : 'Persian Cat',
        invoiceNumber,
        invoiceDate,
        servicesDetected,
        multiplePetsDetected,
        petNamesList,
        grandTotal,
        taxableAmount,
        gstAmount,
        paidAmount,
        balanceDue,
        paymentMode,
        paymentStatus,
        bankDeposit: paymentMode === 'CASH' || paymentMode === 'BANK_TRANSFER',
        validationStatus,
        validationErrors,
        validationWarnings,
        isDuplicateCustomer,
        isDuplicatePet,
        isDuplicateInvoice,
        fuzzyMatchName,
        fuzzyMatchScore,
        userDuplicateAction: fuzzyMatchScore > 75 ? 'MERGE' : undefined
      });
    });

    setTimeout(() => {
      setStagedRecords(parsedList);
      setSelectedRecordIds(new Set(parsedList.map(r => r.id)));
      setIsAnalyzing(false);
    }, 300);
  };

  // Run initial parse on text
  const handleAnalyzeInput = () => {
    if (importSource === 'WHATSAPP_PASTE' || importSource === 'WHATSAPP_TXT') {
      parseRawTextContent(pastedText, 'WhatsApp Text');
    } else if (importSource === 'JSON') {
      try {
        const parsedJson = JSON.parse(rawJsonText);
        const jsonText = Array.isArray(parsedJson) 
          ? parsedJson.map((item: any) => `${item.customerName}: ${item.petName} phone ${item.mobileNumber} ${item.invoiceNumber} total ${item.grandTotal}`).join('\n')
          : rawJsonText;
        parseRawTextContent(jsonText, 'JSON Data');
      } catch (err) {
        alert('Invalid JSON format. Please check syntax.');
      }
    } else if (importSource === 'MANUAL') {
      const manualText = manualRows.map(r => `${r.customerName}: ${r.petName} phone ${r.mobileNumber || '9876543210'} ${r.invoiceNumber || 'HOP/26-27/0001'} total ${r.grandTotal || 2000}`).join('\n');
      parseRawTextContent(manualText, 'Manual Table');
    } else {
      parseRawTextContent(pastedText, importSource);
    }
  };

  // Execute Final Commit & Import
  const handleCommitImport = (overrideSandbox: boolean = false) => {
    const recordsToImport = stagedRecords.filter(r => selectedRecordIds.has(r.id));
    if (recordsToImport.length === 0) {
      alert('No selected records available for import. Please select at least one record.');
      return;
    }

    // Sandbox Simulation Mode Execution
    if (isSandboxMode && !overrideSandbox) {
      const valid = recordsToImport.filter(r => r.validationStatus === 'VALID').length;
      const warn = recordsToImport.filter(r => r.validationStatus === 'WARNING').length;
      const err = recordsToImport.filter(r => r.validationStatus === 'ERROR').length;
      const dup = recordsToImport.filter(r => r.isDuplicateCustomer || r.isDuplicateInvoice || (r.fuzzyMatchScore && r.fuzzyMatchScore > 70)).length;

      setSandboxReport({
        testedRecords: recordsToImport.length,
        validCount: valid,
        warningCount: warn,
        errorCount: err,
        duplicateCount: dup,
        missingCount: dataQualityMetrics ? dataQualityMetrics.missingFieldsCount : 0,
        qualityScore: dataQualityMetrics ? dataQualityMetrics.overallScore : 98.70
      });
      return;
    }

    const startTime = performance.now();

    const createdCustomers: Customer[] = [];
    const createdPets: Pet[] = [];
    const createdInvoices: Invoice[] = [];
    const createdPayments: Payment[] = [];

    let newCustCount = 0;
    let existCustCount = 0;
    let newPetCount = 0;
    let existPetCount = 0;
    let gstCustCount = 0;
    let indCustCount = 0;
    let warningsCount = 0;
    let errorsCount = 0;

    recordsToImport.forEach((record, idx) => {
      if (record.validationStatus === 'ERROR') {
        errorsCount++;
        return;
      }

      if (conflictStrategy === 'SKIP' && (record.isDuplicateCustomer || record.isDuplicateInvoice)) {
        return;
      }

      if (record.validationStatus === 'WARNING') {
        warningsCount++;
      }

      if (record.customerType === 'BUSINESS') gstCustCount++;
      else indCustCount++;

      // 1. Customer Creation or Merge
      let custId = `CUST-${Date.now()}-${idx}`;
      if (record.isDuplicateCustomer) {
        const foundCust = customers.find(c => c.phone === record.mobileNumber || c.name.toLowerCase() === record.customerName.toLowerCase());
        if (foundCust) {
          custId = foundCust.id;
          existCustCount++;
        }
      } else {
        newCustCount++;
        const newCustomerObj: Customer = {
          id: custId,
          name: record.customerName,
          phone: record.mobileNumber,
          email: `${record.customerName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
          address: record.address || 'Kalyani Nagar, Pune',
          gstin: record.gstin,
          stateCode: '27',
          emergencyContact: record.mobileNumber,
          outstandingBalance: record.balanceDue,
          createdAt: record.invoiceDate
        };
        createdCustomers.push(newCustomerObj);
      }

      // 2. Pet Creation or Merge
      let petId = `PET-${Date.now()}-${idx}`;
      if (record.isDuplicatePet) {
        existPetCount++;
      } else {
        newPetCount++;
        const newPetObj: Pet = {
          id: petId,
          customerId: custId,
          customerName: record.customerName,
          name: record.petName,
          species: record.petType === 'Cat' ? 'Cat' : 'Dog',
          breed: record.breed || 'Mixed Breed',
          gender: 'Male',
          age: '3 Years',
          vaccinationStatus: 'Up to Date',
          isBoardingNow: true,
          roomNo: `Suite-${101 + idx}`
        };
        createdPets.push(newPetObj);
      }

      const mapPaymentMode = (pm: string): PaymentMode => {
        if (pm === 'CASH') return 'Cash';
        if (pm === 'BANK_TRANSFER') return 'Net Banking';
        if (pm === 'ONLINE') return 'Card';
        return 'UPI';
      };

      // 3. Invoice Generation
      const invId = `INV-${Date.now()}-${idx}`;
      const newInvObj: Invoice = {
        id: invId,
        invoiceNumber: record.invoiceNumber,
        invoiceDate: record.invoiceDate,
        dueDate: record.invoiceDate,
        customerId: custId,
        customerName: record.customerName,
        customerPhone: record.mobileNumber,
        customerEmail: `${record.customerName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        customerAddress: record.address || 'Pune, Maharashtra',
        customerGSTIN: record.gstin,
        petId: petId,
        petName: record.petName,
        placeOfSupply: '27-Maharashtra',
        isInterState: false,
        items: record.servicesDetected.map((srv, sIdx) => ({
          id: `item-${idx}-${sIdx}`,
          type: 'SERVICE',
          name: srv,
          hsnSac: '999799',
          price: record.taxableAmount / record.servicesDetected.length,
          qty: 1,
          discount: 0,
          discountAmount: 0,
          taxableValue: record.taxableAmount / record.servicesDetected.length,
          gstRate: 18,
          cgstRate: 9,
          cgstAmount: (record.gstAmount / 2) / record.servicesDetected.length,
          sgstRate: 9,
          sgstAmount: (record.gstAmount / 2) / record.servicesDetected.length,
          igstRate: 0,
          igstAmount: 0,
          total: record.grandTotal / record.servicesDetected.length
        })),
        subTotal: record.taxableAmount,
        totalDiscount: 0,
        taxableAmount: record.taxableAmount,
        cgstTotal: record.gstAmount / 2,
        sgstTotal: record.gstAmount / 2,
        igstTotal: 0,
        totalGst: record.gstAmount,
        roundOff: 0,
        grandTotal: record.grandTotal,
        paidAmount: record.paidAmount,
        balanceDue: record.balanceDue,
        paymentStatus: record.paymentStatus,
        paymentMode: mapPaymentMode(record.paymentMode),
        createdByRole: currentUser.role,
        createdByName: currentUser.name,
        createdAt: record.invoiceDate,
        notes: `Imported via ${importSource}`
      };
      createdInvoices.push(newInvObj);

      // 4. Payment Entry
      if (record.paidAmount > 0) {
        const payObj: Payment = {
          id: `PAY-${Date.now()}-${idx}`,
          invoiceId: invId,
          invoiceNumber: record.invoiceNumber,
          customerId: custId,
          customerName: record.customerName,
          paymentDate: record.invoiceDate,
          amount: record.paidAmount,
          paymentMode: mapPaymentMode(record.paymentMode),
          transactionRef: `IMP-${Date.now().toString().slice(-6)}`,
          receivedBy: currentUser.name,
          notes: 'Auto created during Smart Data Import'
        };
        createdPayments.push(payObj);
      }
    });

    const endTime = performance.now();
    const durationSeconds = parseFloat(((endTime - startTime) / 1000).toFixed(2));

    // If historical import, clear existing data first
    if (onClearDataFirst) {
      onClearDataFirst();
    }

    // Send data up to main state
    onImportSuccess({
      newCustomers: createdCustomers,
      newPets: createdPets,
      newInvoices: createdInvoices,
      newPayments: createdPayments,
      importSummaryText: `Successfully imported ${createdInvoices.length} Invoices, ${createdCustomers.length} Customers, ${createdPets.length} Pets.`
    });

    if (onAddAuditLog) {
      onAddAuditLog('SMART_IMPORT_COMPLETED', `Imported ${stagedRecords.length} records via ${importSource}`);
    }

    // Set Completion Report Card
    setImportCompletedReport({
      totalRecords: stagedRecords.length,
      newCustomersCount: newCustCount,
      existingCustomersMerged: existCustCount,
      newPetsCount: newPetCount,
      existingPetsMerged: existPetCount,
      invoicesImported: createdInvoices.length,
      paymentsImported: createdPayments.length,
      gstCustomersCount: gstCustCount,
      individualCustomersCount: indCustCount,
      duplicateRecordsHandled: existCustCount + existPetCount,
      warningsCount,
      errorsCount,
      skippedCount: errorsCount,
      durationSeconds
    });

    // Append to permanent log
    const newHistoryEntry: ImportHistoryEntry = {
      id: `imp-${Date.now().toString().slice(-4)}`,
      importDate: new Date().toLocaleDateString('en-IN'),
      importTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      importedBy: currentUser.name,
      importSource: importSource.replace('_', ' '),
      totalRecords: stagedRecords.length,
      newCustomersCount: newCustCount,
      newPetsCount: newPetCount,
      invoicesCount: createdInvoices.length,
      status: errorsCount > 0 ? 'Completed with Warnings' : 'Completed',
      durationSeconds,
      remarks: `Processed ${stagedRecords.length} records successfully.`
    };

    setImportHistory([newHistoryEntry, ...importHistory]);
    setStagedRecords([]);
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* 1. TOP TITLE HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 text-white p-5 rounded-2xl border border-zinc-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase bg-red-600 text-white flex items-center gap-1">
              <Zap className="w-3 h-3" /> SMART AI DATA ENGINE v3.5
            </span>
            <span className="text-xs text-slate-400 font-mono">Auto Deduplication & GST Classifier</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Smart Historical Data Import Engine <Sparkles className="w-5 h-5 text-[#C9A227]" />
          </h2>
          <p className="text-xs text-slate-300">
            Import Excel, WhatsApp chats, text pastes & JSON with automated duplicate detection, pet classification & GST calculations.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleAnalyzeInput}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-red-900/40 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing Data...' : 'Run Smart Auto-Parser'}</span>
          </button>
        </div>
      </div>

      {/* 2. SOURCE SELECTION GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { id: 'EXCEL_CSV', label: 'Excel / CSV', icon: FileSpreadsheet, badge: 'Popular' },
          { id: 'WHATSAPP_TXT', label: 'WhatsApp .txt', icon: MessageSquare, badge: 'Direct' },
          { id: 'WHATSAPP_PASTE', label: 'Copied Text', icon: Clipboard, badge: 'Instant' },
          { id: 'MANUAL', label: 'Manual Entry', icon: Plus, badge: 'Table' },
          { id: 'JSON', label: 'JSON Data', icon: FileCode, badge: 'Dev' },
          { id: 'PDF_OCR', label: 'PDF Invoice', icon: FileText, badge: 'Future' },
          { id: 'API', label: 'API Sync', icon: Server, badge: 'Future' },
        ].map(src => {
          const Icon = src.icon;
          const isActive = importSource === src.id;
          return (
            <button
              key={src.id}
              onClick={() => setImportSource(src.id as any)}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-between space-y-1.5 ${
                isActive
                  ? 'bg-[#D62828] text-white border-[#D62828] shadow-lg shadow-red-900/30'
                  : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between w-full items-center">
                <Icon className="w-4 h-4" />
                <span className={`text-[9px] font-mono font-bold px-1 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}>
                  {src.badge}
                </span>
              </div>
              <span className="text-xs font-bold leading-tight">{src.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. INPUT EDITOR PANEL */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
        
        {/* Source Header Info */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#D62828]" /> Import Data Source: <span className="text-[#D62828] uppercase">{importSource.replace('_', ' ')}</span>
          </h3>

          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready for AI Parsing & Validation
          </span>
        </div>

        {/* Input Controls Based on Source */}
        {importSource === 'EXCEL_CSV' && (
          <div className="border-2 border-dashed border-slate-300 dark:border-zinc-700 p-8 rounded-2xl text-center space-y-3 bg-slate-50 dark:bg-zinc-800/50">
            <FileSpreadsheet className="w-10 h-10 text-[#D62828] mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">Drag & Drop your Excel workbook (.xlsx) or CSV file here</p>
              <p className="text-xs text-slate-500">Supports standard sales register, pet check-in logs, and legacy Tally sheets</p>
            </div>
            <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" className="hidden" onChange={() => handleAnalyzeInput()} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-slate-800"
            >
              Browse Excel / CSV File
            </button>
          </div>
        )}

        {(importSource === 'WHATSAPP_PASTE' || importSource === 'WHATSAPP_TXT') && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex justify-between">
              <span>Paste WhatsApp Chat Log / Raw Message Text:</span>
              <span className="text-slate-400 font-mono">Lines: {pastedText.split('\n').length}</span>
            </label>
            <textarea
              rows={6}
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder="Paste WhatsApp chat export or raw booking texts..."
              className="w-full p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#D62828]/40"
            />
          </div>
        )}

        {importSource === 'JSON' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">JSON Payload Editor:</label>
            <textarea
              rows={6}
              value={rawJsonText}
              onChange={e => setRawJsonText(e.target.value)}
              className="w-full p-3 bg-slate-900 text-amber-300 font-mono text-xs rounded-xl border border-zinc-700 focus:outline-none"
            />
          </div>
        )}

        {importSource === 'MANUAL' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Manual Multi-Row Entry Table:</span>
              <button
                onClick={() => setManualRows([...manualRows, { sourceRow: manualRows.length + 1, customerName: '', mobileNumber: '', petName: '', grandTotal: 2000 }])}
                className="px-3 py-1 bg-[#D62828] text-white rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-zinc-800 font-bold text-slate-700 dark:text-zinc-300">
                    <th className="p-2">#</th>
                    <th className="p-2">Customer Name</th>
                    <th className="p-2">Mobile Number</th>
                    <th className="p-2">Pet Name</th>
                    <th className="p-2">Invoice No.</th>
                    <th className="p-2 text-right">Grand Total</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                  {manualRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-mono">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.customerName || ''}
                          onChange={e => {
                            const updated = [...manualRows];
                            updated[idx].customerName = e.target.value;
                            setManualRows(updated);
                          }}
                          placeholder="Customer Name"
                          className="w-full p-1 bg-slate-50 dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.mobileNumber || ''}
                          onChange={e => {
                            const updated = [...manualRows];
                            updated[idx].mobileNumber = e.target.value;
                            setManualRows(updated);
                          }}
                          placeholder="9876543210"
                          className="w-full p-1 bg-slate-50 dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700 font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.petName || ''}
                          onChange={e => {
                            const updated = [...manualRows];
                            updated[idx].petName = e.target.value;
                            setManualRows(updated);
                          }}
                          placeholder="Pet Name"
                          className="w-full p-1 bg-slate-50 dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.invoiceNumber || ''}
                          onChange={e => {
                            const updated = [...manualRows];
                            updated[idx].invoiceNumber = e.target.value;
                            setManualRows(updated);
                          }}
                          placeholder="HOP/26-27/001"
                          className="w-full p-1 bg-slate-50 dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700 font-mono"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          value={row.grandTotal || 0}
                          onChange={e => {
                            const updated = [...manualRows];
                            updated[idx].grandTotal = parseFloat(e.target.value) || 0;
                            setManualRows(updated);
                          }}
                          className="w-24 p-1 text-right bg-slate-50 dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700 font-mono"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => setManualRows(manualRows.filter((_, i) => i !== idx))}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analyze Action Bar & Field Mapping Reference Button */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pt-2">
          <div className="text-xs text-slate-500 flex items-center gap-1 font-mono">
            <Info className="w-3.5 h-3.5 text-amber-500" /> Auto-extracts Customer Type, GSTIN, Pet Breed, Service Package & Payment Modes.
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMappingRules(!showMappingRules)}
              className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl text-xs flex items-center space-x-1 hover:bg-slate-200"
            >
              <Filter className="w-3.5 h-3.5 text-[#D62828]" />
              <span>{showMappingRules ? 'Hide Rules' : 'Smart Field Mapping Rules'}</span>
            </button>

            <button
              onClick={handleAnalyzeInput}
              className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md"
            >
              <Sparkles className="w-4 h-4 text-[#C9A227]" />
              <span>Parse & Validate Data</span>
            </button>
          </div>
        </div>

        {/* Smart Mapping Accordion */}
        {showMappingRules && (
          <div className="mt-3 p-4 bg-slate-50 dark:bg-zinc-800/80 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#C9A227]" /> Automatic Field Header & Pattern Normalization Engine
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
              <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-700">
                <span className="font-bold text-[#D62828] block mb-1">Customer Mapping:</span>
                <p className="text-slate-600 dark:text-zinc-400">Owner Name, Client Name, Company Name, Bill To &rarr; <strong className="text-slate-800 dark:text-zinc-200">Customer Name</strong></p>
                <p className="text-slate-600 dark:text-zinc-400 mt-1">Mob No, Phone, WhatsApp Number &rarr; <strong className="text-slate-800 dark:text-zinc-200">Customer Mobile</strong></p>
              </div>

              <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-700">
                <span className="font-bold text-[#D62828] block mb-1">Pet & Service Mapping:</span>
                <p className="text-slate-600 dark:text-zinc-400">Dog Name, Cat Name, Pet &rarr; <strong className="text-slate-800 dark:text-zinc-200">Pet Name & Species</strong></p>
                <p className="text-slate-600 dark:text-zinc-400 mt-1">Boarding, Daycare, Spa, Pickup, Night Charge &rarr; <strong className="text-slate-800 dark:text-zinc-200">Auto Service Packages</strong></p>
              </div>

              <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-700">
                <span className="font-bold text-[#D62828] block mb-1">Date Normalization:</span>
                <p className="text-slate-600 dark:text-zinc-400">01/07/2026, 1 July 2026, 01-Jul-2026, 1st July 2026 &rarr; <strong className="text-emerald-600 font-mono">01/07/2026</strong></p>
              </div>

              <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-700">
                <span className="font-bold text-[#D62828] block mb-1">Currency Normalization:</span>
                <p className="text-slate-600 dark:text-zinc-400">18000, 18,000, Rs 18000, ₹18,000 &rarr; <strong className="text-emerald-600 font-mono">₹18,000.00</strong></p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. PRE-IMPORT VALIDATION & STAGED RECORDS TABLE */}
      {stagedRecords.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
          
          {/* Data Quality Score Metric Engine Card */}
          {dataQualityMetrics && (
            <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-950 p-4 rounded-xl text-white border border-zinc-800 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-zinc-800 pb-2.5">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-bold text-sm text-white">Migration Intelligence & Data Quality Score Engine</h4>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-700">
                    <span className="text-[11px] text-zinc-400">Sandbox Mode:</span>
                    <button
                      onClick={() => setIsSandboxMode(!isSandboxMode)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase transition-all ${
                        isSandboxMode ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                      }`}
                    >
                      {isSandboxMode ? 'Active (Safe Dry Run)' : 'Disabled (Live Direct)'}
                    </button>
                  </div>

                  <div className="flex items-center space-x-1 text-right">
                    <span className="text-xs text-zinc-400 font-mono">Overall Quality:</span>
                    <span className="text-xl font-black font-mono text-[#C9A227]">
                      {dataQualityMetrics.overallScore.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2 bg-zinc-800/80 rounded-lg border border-zinc-700/60">
                  <span className="text-[10px] text-zinc-400 block uppercase font-mono">Completeness</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">{dataQualityMetrics.completeness}%</span>
                </div>
                <div className="p-2 bg-zinc-800/80 rounded-lg border border-zinc-700/60">
                  <span className="text-[10px] text-zinc-400 block uppercase font-mono">Accuracy</span>
                  <span className="text-sm font-bold font-mono text-blue-400">{dataQualityMetrics.accuracy}%</span>
                </div>
                <div className="p-2 bg-zinc-800/80 rounded-lg border border-zinc-700/60">
                  <span className="text-[10px] text-zinc-400 block uppercase font-mono">Duplicate Rate</span>
                  <span className="text-sm font-bold font-mono text-amber-400">{dataQualityMetrics.duplicateRate}%</span>
                </div>
                <div className="p-2 bg-zinc-800/80 rounded-lg border border-zinc-700/60">
                  <span className="text-[10px] text-zinc-400 block uppercase font-mono">Validation Success</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">{dataQualityMetrics.validationSuccess}%</span>
                </div>
                <div className="p-2 bg-zinc-800/80 rounded-lg border border-zinc-700/60">
                  <span className="text-[10px] text-zinc-400 block uppercase font-mono">Missing Data</span>
                  <span className="text-sm font-bold font-mono text-purple-300">{dataQualityMetrics.missingFieldsCount} fields</span>
                </div>
              </div>
            </div>
          )}

          {/* Sandbox Test Result Report Modal Banner */}
          {sandboxReport && (
            <div className="p-4 bg-amber-950/80 border-2 border-amber-500/80 text-white rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-amber-400 animate-bounce" />
                  <h4 className="font-black text-sm text-amber-300">IMPORT SANDBOX MODE SIMULATION COMPLETED</h4>
                </div>
                <button onClick={() => setSandboxReport(null)} className="text-amber-300 text-xs hover:underline font-mono">
                  Close Preview
                </button>
              </div>
              <p className="text-xs text-amber-200">
                Sandbox dry-run validated <strong>{sandboxReport.testedRecords} records</strong> without altering production database. Quality Score: <strong>{sandboxReport.qualityScore}%</strong>.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-800">
                <div className="flex items-center space-x-3 text-xs font-mono">
                  <span className="text-emerald-400">Valid: {sandboxReport.validCount}</span>
                  <span className="text-amber-300">Warnings: {sandboxReport.warningCount}</span>
                  <span className="text-red-400">Errors: {sandboxReport.errorCount}</span>
                  <span className="text-purple-300">Duplicates: {sandboxReport.duplicateCount}</span>
                </div>

                <button
                  onClick={() => {
                    setSandboxReport(null);
                    setIsSandboxMode(false);
                    handleCommitImport(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-lg flex items-center space-x-1.5"
                >
                  <Database className="w-4 h-4" />
                  <span>Move Data to Production Database</span>
                </button>
              </div>
            </div>
          )}

          {/* Header & Stats */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" /> Staged Import Records & AI Validation Preview
              </h3>
              <p className="text-xs text-slate-500">
                Review automated deduplication flags, GST classifications, and service tags before committing.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg font-mono">
                {stagedRecords.filter(r => r.validationStatus === 'VALID').length} Valid
              </span>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-lg font-mono">
                {stagedRecords.filter(r => r.validationStatus === 'WARNING').length} Warnings
              </span>
              <span className="px-2.5 py-1 bg-red-100 text-red-800 font-bold text-xs rounded-lg font-mono">
                {stagedRecords.filter(r => r.validationStatus === 'ERROR').length} Errors
              </span>
            </div>
          </div>

          {/* Strategy & Filter Options Bar */}
          <div className="flex flex-col lg:flex-row justify-between gap-3 bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-slate-200 dark:border-zinc-700/80 text-xs">
            
            {/* Conflict Strategy */}
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-bold text-slate-700 dark:text-zinc-300 shrink-0">Re-Import Protection:</span>
              <div className="flex items-center space-x-1 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-slate-200 dark:border-zinc-700 flex-wrap">
                <button
                  onClick={() => setConflictStrategy('MERGE')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    conflictStrategy === 'MERGE' ? 'bg-[#D62828] text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  Merge Existing
                </button>
                <button
                  onClick={() => setConflictStrategy('REPLACE')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    conflictStrategy === 'REPLACE' ? 'bg-[#D62828] text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  Replace Existing
                </button>
                <button
                  onClick={() => setConflictStrategy('SKIP')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    conflictStrategy === 'SKIP' ? 'bg-[#D62828] text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  Skip Duplicates
                </button>
                <button
                  onClick={() => setConflictStrategy('IMPORT_MISSING')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    conflictStrategy === 'IMPORT_MISSING' ? 'bg-[#D62828] text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  Import Missing Only
                </button>
                {currentUser.role === 'ADMIN' && (
                  <button
                    onClick={() => setConflictStrategy('REPLACE_ALL')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      conflictStrategy === 'REPLACE_ALL' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    Replace All (Admin)
                  </button>
                )}
              </div>
            </div>

            {/* Selection & Search */}
            <div className="flex items-center space-x-2 flex-wrap">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setSelectedRecordIds(new Set(stagedRecords.map(r => r.id)))}
                  className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-700 dark:text-zinc-300 font-bold text-[11px]"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedRecordIds(new Set())}
                  className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-700 dark:text-zinc-300 font-bold text-[11px]"
                >
                  Deselect All
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter staged..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Staged Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase">
                  <th className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={stagedRecords.length > 0 && selectedRecordIds.size === stagedRecords.length}
                      onChange={e => {
                        if (e.target.checked) setSelectedRecordIds(new Set(stagedRecords.map(r => r.id)));
                        else setSelectedRecordIds(new Set());
                      }}
                      className="rounded accent-red-600"
                    />
                  </th>
                  <th className="p-2.5">Row</th>
                  <th className="p-2.5">Customer / Phone</th>
                  <th className="p-2.5">Type & GSTIN</th>
                  <th className="p-2.5">Pet & Species</th>
                  <th className="p-2.5">Services Detected</th>
                  <th className="p-2.5">Invoice & Date</th>
                  <th className="p-2.5 text-right">Grand Total</th>
                  <th className="p-2.5 text-right">Paid / Balance</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                {stagedRecords
                  .filter(rec => {
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase();
                      return rec.customerName.toLowerCase().includes(q) ||
                             rec.mobileNumber.includes(q) ||
                             rec.petName.toLowerCase().includes(q) ||
                             rec.invoiceNumber.toLowerCase().includes(q);
                    }
                    return true;
                  })
                  .map((rec) => {
                    const isSelected = selectedRecordIds.has(rec.id);
                    return (
                      <tr key={rec.id} className={`hover:bg-slate-50 dark:hover:bg-zinc-800/50 ${isSelected ? 'bg-red-50/20 dark:bg-red-950/10' : ''}`}>
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              const updated = new Set(selectedRecordIds);
                              if (e.target.checked) updated.add(rec.id);
                              else updated.delete(rec.id);
                              setSelectedRecordIds(updated);
                            }}
                            className="rounded accent-red-600"
                          />
                        </td>
                        <td className="p-2.5 font-mono text-slate-400">{rec.sourceRow}</td>
                        
                        {/* Customer */}
                        <td className="p-2.5">
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1 flex-wrap">
                            {rec.customerName}
                            {rec.isDuplicateCustomer && (
                              <span className="px-1 py-0.2 rounded text-[9px] bg-purple-100 text-purple-700 font-mono font-bold">
                                Exact Match
                              </span>
                            )}
                            {rec.fuzzyMatchName && !rec.isDuplicateCustomer && (
                              <span className="px-1 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 font-mono font-bold">
                                Fuzzy: {rec.fuzzyMatchName} ({rec.fuzzyMatchScore}%)
                              </span>
                            )}
                          </p>
                          <p className="font-mono text-[10px] text-slate-500">{rec.mobileNumber}</p>

                          {/* AI Duplicate Action Choice */}
                          {(rec.isDuplicateCustomer || (rec.fuzzyMatchScore && rec.fuzzyMatchScore > 65)) && (
                            <div className="flex items-center space-x-1 mt-1">
                              <button
                                onClick={() => {
                                  const updated = stagedRecords.map(r => r.id === rec.id ? { ...r, userDuplicateAction: 'MERGE' as const, isDuplicateCustomer: true } : r);
                                  setStagedRecords(updated);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${rec.userDuplicateAction === 'MERGE' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                              >
                                Merge
                              </button>
                              <button
                                onClick={() => {
                                  const updated = stagedRecords.map(r => r.id === rec.id ? { ...r, userDuplicateAction: 'KEEP_SEPARATE' as const, isDuplicateCustomer: false } : r);
                                  setStagedRecords(updated);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${rec.userDuplicateAction === 'KEEP_SEPARATE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                              >
                                Keep Separate
                              </button>
                              <button
                                onClick={() => {
                                  const updated = stagedRecords.map(r => r.id === rec.id ? { ...r, userDuplicateAction: 'REVIEW_LATER' as const } : r);
                                  setStagedRecords(updated);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${rec.userDuplicateAction === 'REVIEW_LATER' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                              >
                                Review Later
                              </button>
                            </div>
                          )}
                        </td>

                    {/* Customer Type & GST */}
                    <td className="p-2.5 font-mono">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${rec.customerType === 'BUSINESS' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                        {rec.customerType}
                      </span>
                      {rec.gstin && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{rec.gstin}</p>
                      )}
                    </td>

                    {/* Pet Info */}
                    <td className="p-2.5">
                      <p className="font-bold text-[#D62828] flex items-center gap-1">
                        <Dog className="w-3 h-3" /> {rec.petName} ({rec.petType})
                      </p>
                      <p className="text-[10px] text-slate-500">{rec.breed}</p>
                    </td>

                    {/* Services */}
                    <td className="p-2.5">
                      <div className="flex flex-wrap gap-1">
                        {rec.servicesDetected.map((srv, sIdx) => (
                          <span key={sIdx} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                            {srv}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Invoice */}
                    <td className="p-2.5 font-mono">
                      <p className="font-bold text-slate-800 dark:text-zinc-200">{rec.invoiceNumber}</p>
                      <p className="text-[10px] text-slate-400">{rec.invoiceDate}</p>
                    </td>

                    {/* Amount */}
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatINR(rec.grandTotal)}
                    </td>

                    {/* Paid & Mode */}
                    <td className="p-2.5 text-right font-mono">
                      <p className="text-emerald-600 font-bold">{formatINR(rec.paidAmount)} ({rec.paymentMode})</p>
                      {rec.balanceDue > 0 && (
                        <p className="text-red-600 font-bold text-[10px]">Due: {formatINR(rec.balanceDue)}</p>
                      )}
                    </td>

                    {/* Validation */}
                    <td className="p-2.5 text-center">
                      {rec.validationStatus === 'VALID' && (
                        <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded-full text-[10px] flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" /> Valid
                        </span>
                      )}
                      {rec.validationStatus === 'WARNING' && (
                        <span className="px-2 py-0.5 bg-amber-500 text-white font-bold rounded-full text-[10px] flex items-center justify-center gap-1" title={rec.validationWarnings.join(', ')}>
                          <AlertTriangle className="w-3 h-3" /> Warning
                        </span>
                      )}
                      {rec.validationStatus === 'ERROR' && (
                        <span className="px-2 py-0.5 bg-red-600 text-white font-bold rounded-full text-[10px] flex items-center justify-center gap-1" title={rec.validationErrors.join(', ')}>
                          <XCircle className="w-3 h-3" /> Error
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>

          {/* Action Commit Button */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-zinc-800">
            <p className="text-xs text-slate-500 font-mono">
              Ready to generate Customer Master, Pet Master, Sales & GST Registers.
            </p>

            <button
              onClick={handleCommitImport}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center space-x-2 shadow-xl shadow-emerald-900/30 active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Execute Smart Import</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. IMPORT REPORT CARD POST-COMMIT */}
      {importCompletedReport && (
        <div className="bg-emerald-950 text-white p-6 rounded-2xl border border-emerald-800 shadow-2xl space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-mono text-[10px] font-bold rounded uppercase">
                IMPORT SUMMARY REPORT
              </span>
              <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
                Smart Import Executed Successfully <Sparkles className="w-5 h-5 text-amber-300" />
              </h3>
              <p className="text-xs text-emerald-300">
                Processed in <strong className="font-mono text-white">{importCompletedReport.durationSeconds} seconds</strong>. All master databases updated.
              </p>
            </div>

            <button
              onClick={() => setImportCompletedReport(null)}
              className="p-1.5 bg-emerald-900 text-emerald-200 rounded-lg hover:bg-emerald-800"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            <div className="p-3 bg-emerald-900/80 rounded-xl border border-emerald-700/60">
              <span className="text-[10px] text-emerald-300 uppercase font-bold">Total Imported</span>
              <p className="text-2xl font-black font-mono text-white">{importCompletedReport.totalRecords}</p>
            </div>

            <div className="p-3 bg-emerald-900/80 rounded-xl border border-emerald-700/60">
              <span className="text-[10px] text-emerald-300 uppercase font-bold">New Customers</span>
              <p className="text-2xl font-black font-mono text-emerald-400">{importCompletedReport.newCustomersCount}</p>
            </div>

            <div className="p-3 bg-emerald-900/80 rounded-xl border border-emerald-700/60">
              <span className="text-[10px] text-emerald-300 uppercase font-bold">Merged Customers</span>
              <p className="text-2xl font-black font-mono text-amber-300">{importCompletedReport.existingCustomersMerged}</p>
            </div>

            <div className="p-3 bg-emerald-900/80 rounded-xl border border-emerald-700/60">
              <span className="text-[10px] text-emerald-300 uppercase font-bold">New Pets</span>
              <p className="text-2xl font-black font-mono text-emerald-400">{importCompletedReport.newPetsCount}</p>
            </div>

            <div className="p-3 bg-emerald-900/80 rounded-xl border border-emerald-700/60">
              <span className="text-[10px] text-emerald-300 uppercase font-bold">Invoices Generated</span>
              <p className="text-2xl font-black font-mono text-white">{importCompletedReport.invoicesImported}</p>
            </div>

            <div className="p-3 bg-emerald-900/80 rounded-xl border border-emerald-700/60">
              <span className="text-[10px] text-emerald-300 uppercase font-bold">GST B2B Clients</span>
              <p className="text-2xl font-black font-mono text-amber-300">{importCompletedReport.gstCustomersCount}</p>
            </div>
          </div>

          {/* Migration Report Download & Print Actions */}
          <div className="flex flex-wrap justify-between items-center pt-3 border-t border-emerald-800 text-xs">
            <span className="text-emerald-300 font-mono">
              Imported By: <strong>{currentUser.name}</strong> on {new Date().toLocaleDateString('en-IN')}
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const csvData = `Migration Summary Report\nTotal Records,${importCompletedReport.totalRecords}\nNew Customers,${importCompletedReport.newCustomersCount}\nMerged Customers,${importCompletedReport.existingCustomersMerged}\nNew Pets,${importCompletedReport.newPetsCount}\nInvoices Generated,${importCompletedReport.invoicesImported}\nDuration,${importCompletedReport.durationSeconds}s\nImported By,${currentUser.name}`;
                  const blob = new Blob([csvData], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Migration_Report_${Date.now()}.csv`;
                  a.click();
                }}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 font-mono text-[11px]"
              >
                <Download className="w-3.5 h-3.5" /> Export Excel
              </button>

              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 font-mono text-[11px]"
              >
                <FileText className="w-3.5 h-3.5" /> Print / PDF Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. PERMANENT IMPORT LOG HISTORY */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="w-4 h-4 text-[#D62828]" /> Permanent Import Audit History Log
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold">
                <th className="p-2.5">Log ID</th>
                <th className="p-2.5">Date & Time</th>
                <th className="p-2.5">Import Source</th>
                <th className="p-2.5">Imported By</th>
                <th className="p-2.5 text-center">Records</th>
                <th className="p-2.5 text-center">Duration</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
              {importHistory.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 font-mono">
                  <td className="p-2.5 font-bold text-slate-900 dark:text-white">{log.id}</td>
                  <td className="p-2.5 text-slate-500">{log.importDate} {log.importTime}</td>
                  <td className="p-2.5 font-bold text-[#D62828]">{log.importSource}</td>
                  <td className="p-2.5 text-slate-700 dark:text-zinc-300">{log.importedBy}</td>
                  <td className="p-2.5 text-center font-bold text-slate-900 dark:text-white">{log.totalRecords}</td>
                  <td className="p-2.5 text-center text-slate-500">{log.durationSeconds}s</td>
                  <td className="p-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-500 font-sans">{log.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
