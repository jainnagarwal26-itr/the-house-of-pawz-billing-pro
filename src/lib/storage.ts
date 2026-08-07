import { 
  Customer, Pet, CatalogItem, Invoice, Payment, 
  User, CompanySettings, AuditLog, RecurringSubscription, UserRole 
} from '../types';

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'The House of Pawz',
  tagline: 'Luxury Pet Boarding, Daycare, Training & Spa',
  address: 'Plot 42, Pawz Avenue, Green Meadows, Sector 14',
  cityStateZip: 'Mumbai, Maharashtra - 400053',
  phone: '+91 98200 12345 / +91 98200 67890',
  email: 'billing@thehouseofpawz.com',
  gstin: '27AABCT1234H1Z5',
  stateCode: '27-Maharashtra',
  accountName: 'The House of Pawz',
  bankName: 'INDUSIND BANK',
  accountNo: '201003400051',
  ifscCode: 'INDB0001074',
  branch: 'Four Bungalow, Andheri (W).',
  upiId: 'houseofpawz@indus',
  logoPath: '/Logo.jpg',
  signaturePath: '/Signature.jpg',
  invoicePrefix: 'HOP/26-27/',
  financialYear: '2026-27',
  defaultGstRate: 18,
  terms: [
    'Payment is due upon receipt or completion of pet service.',
    'Proof of vaccination is mandatory prior to boarding check-in.',
    'Late payment interest of 12% p.a. applies after 15 days past due.',
    'Subject to Mumbai Jurisdiction.'
  ]
};

export const SYSTEM_USERS: User[] = [
  {
    id: 'USR-001',
    name: 'Chirag Jain, CA',
    username: 'admin',
    role: 'ADMIN',
    email: 'chirag.ca@houseofpawz.com',
    phone: '+91 98111 22233',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    lastLogin: '2026-08-06 10:15 AM',
    isActive: true
  },
  {
    id: 'USR-002',
    name: 'Pooja Verma (Billing Staff)',
    username: 'billing_staff',
    role: 'BILLING_USER',
    email: 'pooja.billing@houseofpawz.com',
    phone: '+91 98765 43210',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces',
    lastLogin: '2026-08-06 09:30 AM',
    isActive: true
  }
];

export const CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'CAT-001',
    type: 'SERVICE',
    name: 'Deluxe Canine Boarding (Per Night)',
    category: 'Boarding',
    hsnSac: '999799',
    price: 1500,
    gstRate: 18,
    unit: 'Night',
    barcode: 'SERVICE-BRD-01'
  },
  {
    id: 'CAT-002',
    type: 'SERVICE',
    name: 'Executive Feline Boarding (Per Night)',
    category: 'Boarding',
    hsnSac: '999799',
    price: 1200,
    gstRate: 18,
    unit: 'Night',
    barcode: 'SERVICE-BRD-02'
  },
  {
    id: 'CAT-003',
    type: 'SERVICE',
    name: 'Full-Day Social Daycare (8 Hours)',
    category: 'Daycare',
    hsnSac: '999799',
    price: 800,
    gstRate: 18,
    unit: 'Day',
    barcode: 'SERVICE-DAY-01'
  },
  {
    id: 'CAT-004',
    type: 'SERVICE',
    name: 'Royal Paw Spa & Grooming Package',
    category: 'Grooming',
    hsnSac: '999799',
    price: 2500,
    gstRate: 18,
    unit: 'Session',
    barcode: 'SERVICE-GRM-01'
  },
  {
    id: 'CAT-005',
    type: 'SERVICE',
    name: 'Obedience & Behavioral Training Session',
    category: 'Training',
    hsnSac: '999799',
    price: 1800,
    gstRate: 18,
    unit: 'Session',
    barcode: 'SERVICE-TRN-01'
  },
  {
    id: 'CAT-006',
    type: 'PRODUCT',
    name: 'Royal Canin Adult Maxi Dog Food (15kg)',
    category: 'Food',
    hsnSac: '2309',
    price: 6800,
    gstRate: 18,
    unit: 'Bag',
    barcode: '8901234560012',
    stockQty: 24
  },
  {
    id: 'CAT-007',
    type: 'PRODUCT',
    name: 'Organic Herbal Flea & Tick Shampoo (500ml)',
    category: 'Medical/Spa',
    hsnSac: '3305',
    price: 950,
    gstRate: 18,
    unit: 'Bottle',
    barcode: '8901234560029',
    stockQty: 45
  },
  {
    id: 'CAT-008',
    type: 'PRODUCT',
    name: 'Heavy-Duty Nylon Harness & Leash Set',
    category: 'Accessories',
    hsnSac: '4201',
    price: 1250,
    gstRate: 18,
    unit: 'Set',
    barcode: '8901234560036',
    stockQty: 18
  },
  {
    id: 'CAT-009',
    type: 'PRODUCT',
    name: 'Interactive Dental Chew Toy Pack',
    category: 'Accessories',
    hsnSac: '9503',
    price: 650,
    gstRate: 18,
    unit: 'Pack',
    barcode: '8901234560043',
    stockQty: 60
  }
];

// LocalStorage Persistence Keys
const STORAGE_KEYS = {
  SETTINGS: 'hop_settings_v2',
  CUSTOMERS: 'hop_customers_v2',
  PETS: 'hop_pets_v2',
  INVOICES: 'hop_invoices_v2',
  PAYMENTS: 'hop_payments_v2',
  USERS: 'hop_users_v2',
  RECURRING: 'hop_recurring_v2',
  AUDIT: 'hop_audit_v2',
  ACTIVE_USER: 'hop_active_user_v2',
  DARK_MODE: 'hop_dark_mode_v2'
};

export function loadStoredData<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const sanitizedItem = item
      .replace(/Chirag Jian/g, 'Chirag Jain')
      .replace(/Amit Bansal/g, 'Chirag Jain')
      .replace(/amit\.ca/g, 'chirag.ca')
      .replace(/jian\.ca/g, 'jain.ca');
    return JSON.parse(sanitizedItem);
  } catch (e) {
    console.error(`Error loading ${key} from storage:`, e);
    return fallback;
  }
}

export function saveStoredData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

export function createAuditLog(
  action: AuditLog['action'], 
  details: string, 
  user: User
): AuditLog {
  const newLog: AuditLog = {
    id: `LOG-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' }),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    details
  };
  
  const currentLogs = loadStoredData<AuditLog[]>(STORAGE_KEYS.AUDIT, []);
  const updatedLogs = [newLog, ...currentLogs];
  saveStoredData(STORAGE_KEYS.AUDIT, updatedLogs);
  return newLog;
}

export async function factoryResetDatabase(): Promise<void> {
  try {
    localStorage.clear();
    sessionStorage.clear();

    if (typeof window !== 'undefined' && 'caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }

    if (typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB.databases) {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    }
  } catch (e) {
    console.error('Error during factory reset:', e);
  } finally {
    window.location.reload();
  }
}

export { STORAGE_KEYS };
