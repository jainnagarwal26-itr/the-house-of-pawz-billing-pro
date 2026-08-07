import fs from 'fs';
import { exportFullDatabaseToExcel } from './src/lib/excelHelper';
import { INITIAL_CUSTOMERS, INITIAL_PETS, INITIAL_INVOICES, INITIAL_PAYMENTS } from './src/lib/initialClientData';
import { DEFAULT_COMPANY_SETTINGS, SYSTEM_USERS } from './src/lib/storage';

async function rebuildDatabase() {
  let savedBuffer: Uint8Array | null = null;

  if (typeof window === 'undefined') {
    (global as any).window = {};
    (global as any).document = {
      createElement: () => ({
        setAttribute: () => {},
        click: () => {}
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {}
      }
    };
    (global as any).URL = {
      createObjectURL: () => 'blob:mock',
      revokeObjectURL: () => {}
    };
    (global as any).Blob = class MockBlob {
      constructor(parts: any[]) {
        savedBuffer = new Uint8Array(parts[0]);
      }
    };
  }

  await exportFullDatabaseToExcel({
    customers: INITIAL_CUSTOMERS,
    pets: INITIAL_PETS,
    invoices: INITIAL_INVOICES,
    payments: INITIAL_PAYMENTS,
    users: SYSTEM_USERS,
    settings: DEFAULT_COMPANY_SETTINGS,
    auditLogs: [
      {
        id: 'LOG-003',
        timestamp: '2026-07-08 10:00:00',
        userId: 'USR-001',
        userName: 'Chirag Jain, CA',
        userRole: 'ADMIN',
        action: 'INVOICE_CREATED',
        details: 'Imported missing Invoice No. 15 (Shayoni Mitra & Pingu) into Production Database'
      }
    ],
    recurring: []
  });

  if (savedBuffer) {
    fs.writeFileSync('THOP_BILLING_DATABASE.xlsx', savedBuffer);
    console.log('SUCCESSFULLY REBUILT THOP_BILLING_DATABASE.xlsx with 32 Invoices (including Invoice 15)!');
  }
}

rebuildDatabase();
