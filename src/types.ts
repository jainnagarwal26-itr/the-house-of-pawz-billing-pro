export type UserRole = 'ADMIN' | 'USER' | 'BILLING_STAFF' | 'SUPER_ADMIN' | 'MANAGER' | 'RECEPTION' | 'BILLING_USER' | 'ACCOUNTANT';

export interface PermissionChangeRecord {
  id: string;
  timestamp: string;
  key: string;
  label: string;
  oldState: string;
  newState: string;
  changedBy: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  email: string;
  phone: string;
  designation?: string;
  avatar?: string;
  lastLogin: string;
  isActive: boolean;
  pinCode?: string; // Default '1234' for Admin approvals
  recoveryKey?: string;
  permissions?: Record<string, boolean>;
  permissionHistory?: PermissionChangeRecord[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
  stateCode: string; // e.g. "27" or "27-Maharashtra"
  emergencyContact: string;
  outstandingBalance: number;
  advanceBalance?: number; // Client advance deposit balance
  createdAt: string;
}

export interface Pet {
  id: string;
  customerId: string;
  customerName: string;
  name: string;
  species: 'Dog' | 'Cat' | 'Bird' | 'Rabbit' | 'Other';
  breed: string;
  age: string;
  gender: 'Male' | 'Female';
  vaccinationStatus: 'Up to Date' | 'Pending' | 'Overdue';
  medicalNotes?: string;
  feedingPreferences?: string;
  microchipId?: string;
  barcode?: string;
  isBoardingNow: boolean;
  checkInDate?: string;
  checkOutDate?: string;
  roomNo?: string;
}

export type ItemType = 'SERVICE' | 'PRODUCT';

export interface CatalogItem {
  id: string;
  type: ItemType;
  name: string;
  category: 'Boarding' | 'Daycare' | 'Grooming' | 'Training' | 'Food' | 'Accessories' | 'Medical/Spa';
  hsnSac: string;
  price: number;
  gstRate: number; // 18 by default
  unit: string;
  barcode?: string;
  stockQty?: number;
}

export interface InvoiceItem {
  id: string;
  catalogItemId?: string;
  type: ItemType;
  name: string;
  hsnSac: string;
  price: number;
  qty: number;
  discount: number; // Percentage or flat
  discountAmount: number;
  taxableValue: number;
  gstRate: number; // 18%
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  total: number;
}

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'CANCELLED';
export type PaymentMode = 'UPI' | 'Cash' | 'Card' | 'Net Banking' | 'Cheque';

export interface Invoice {
  id: string;
  invoiceNumber: string; // HOP/26-27/000001
  invoiceDate: string; // DD/MM/YYYY
  dueDate: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerGSTIN?: string;
  petId?: string;
  petName?: string;
  placeOfSupply: string; // State Code + Name
  isInterState: boolean;
  items: InvoiceItem[];
  subTotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalGst: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  notes?: string;
  createdByRole: UserRole;
  createdByName: string;
  createdAt: string;
  isCancelled?: boolean;
  cancelledReason?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: string; // DD/MM/YYYY
  paymentMode: PaymentMode;
  transactionRef?: string;
  notes?: string;
  receivedBy: string;
}

export interface RecurringSubscription {
  id: string;
  customerId: string;
  customerName: string;
  petId: string;
  petName: string;
  serviceName: string;
  amount: number;
  frequency: 'Weekly' | 'Monthly';
  startDate: string;
  nextBillingDate: string;
  status: 'Active' | 'Paused' | 'Cancelled';
  lastGeneratedInvoiceId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO or formatted
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 
    | 'INVOICE_CREATED' 
    | 'INVOICE_EDITED' 
    | 'INVOICE_CANCELLED' 
    | 'INVOICE_WHATSAPP_OPENED'
    | 'INVOICE_EMAIL_OPENED'
    | 'INVOICE_PDF_DOWNLOADED'
    | 'RECEIPT_WHATSAPP_OPENED'
    | 'RECEIPT_EMAIL_OPENED'
    | 'STATEMENT_WHATSAPP_OPENED'
    | 'STATEMENT_EMAIL_OPENED'
    | 'PAYMENT_RECORDED' 
    | 'CUSTOMER_ADDED' 
    | 'CUSTOMER_EDITED'
    | 'PET_ADDED'
    | 'PET_CHECKIN' 
    | 'PET_CHECKOUT' 
    | 'ROLE_SWITCHED' 
    | 'EXCEL_EXPORT' 
    | 'EXCEL_IMPORT' 
    | 'SETTINGS_UPDATED'
    | 'USER_MANAGEMENT'
    | 'ADMIN_APPROVAL_GRANTED'
    | 'BACKUP_CREATED'
    | 'DATABASE_RESTORED'
    | 'HEALTH_REPAIR_EXECUTED';
  details: string;
  ipAddress?: string;
}

export interface CompanySettings {
  companyName: string;
  tagline: string;
  address: string;
  cityStateZip: string;
  phone: string;
  email: string;
  gstin: string;
  stateCode: string;
  accountName?: string;
  bankName: string;
  accountNo: string;
  ifscCode: string;
  branch: string;
  upiId: string;
  logoPath?: string;
  signaturePath?: string;
  invoicePrefix: string;
  financialYear: string; // 2026-27
  defaultGstRate: number; // 18
  terms: string[];
}

/**
 * Format Indian Currency in standard Indian Numbering System
 * Examples:
 * 999 -> ₹ 999.00
 * 12500 -> ₹ 12,500.00
 * 125000 -> ₹ 1,25,000.00
 * 1250000 -> ₹ 12,50,000.00
 */
export function formatINR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹ 0.00';
  }
  const isNegative = amount < 0;
  const absVal = Math.abs(amount).toFixed(2);
  const [integerPart, decimalPart] = absVal.split('.');
  
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return `${isNegative ? '-' : ''}₹ ${formattedInteger}.${decimalPart}`;
}

export function formatDateDDMMYYYY(dateString?: string): string {
  const date = dateString ? new Date(dateString) : new Date();
  if (isNaN(date.getTime())) return dateString || '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export interface CommunicationRecord {
  id: string;
  timestamp: string;
  date: string;
  customerId: string;
  customerName: string;
  documentType: 'Invoice' | 'Receipt' | 'Statement';
  documentRef: string;
  channel: 'WhatsApp' | 'Email' | 'PDF';
  userName: string;
  status: 'Opened' | 'Downloaded' | 'Composer Opened';
  notes?: string;
}
