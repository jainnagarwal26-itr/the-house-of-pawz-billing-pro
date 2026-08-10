// ============================================================
// sheetsApi.ts — LEGACY Google Sheets API Integration
// Project: The House of Pawz – Billing Pro
//
// @LEGACY — THIS FILE IS NOT IMPORTED BY ANY ACTIVE PRODUCTION MODULE.
//
// The application has been fully migrated from Google Sheets to Supabase.
// Supabase (https://dxvnemdmgdckdfzilnkr.supabase.co) is the ONLY
// authoritative production data source.
//
// This file is preserved for historical reference only.
// DO NOT re-import this file into any active production component.
// DO NOT reconnect the Google Apps Script endpoint.
//
// google.script.run   → NOT USED
// SpreadsheetApp      → NOT USED
// APPS_SCRIPT_URL     → DISCONNECTED
// ============================================================

import { Invoice, InvoiceItem, Customer, Pet, Payment, User, CompanySettings, RecurringSubscription, AuditLog } from '../types';

// Deployed Google Apps Script Web App Endpoint URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxTWuObBn8fKSnf_WGNCM-UduOms6et4jZnxZHjJqdhzv9uNoO7JSCDxdzaIz6nW2fP/exec';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type SyncStatus = 'connected' | 'syncing' | 'offline';

/**
 * Generate a unique Idempotency Key for write operations.
 * Format: REQ-{timestamp}-{randomString}
 */
export function generateIdempotencyKey(): string {
  return `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

/**
 * Perform a GET request to the Google Apps Script Web App API.
 */
async function apiGet<T = any>(action: string, params: Record<string, string> = {}): Promise<ApiResponse<T>> {
  try {
    const urlParams = new URLSearchParams({ action, ...params });
    const response = await fetch(`${APPS_SCRIPT_URL}?${urlParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP_${response.status}`,
        message: `HTTP Server Error: ${response.statusText}`
      };
    }

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: error.message || 'Unable to connect to Google Sheets API.'
    };
  }
}

/**
 * Perform a POST request to the Google Apps Script Web App API.
 */
async function apiPost<T = any>(action: string, payload: any, token?: string): Promise<ApiResponse<T>> {
  try {
    const bodyData = {
      action,
      token: token || '',
      payload: {
        ...payload,
        idempotencyKey: payload.idempotencyKey || generateIdempotencyKey()
      }
    };

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // Text/plain prevents CORS preflight issue with Apps Script
      },
      body: JSON.stringify(bodyData)
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP_${response.status}`,
        message: `HTTP Server Error: ${response.statusText}`
      };
    }

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: error.message || 'Unable to save to production database.'
    };
  }
}

// ─────────────────────────────────────────────────────────────
// DATA NORMALIZERS (Convert Google Sheets TitleCase -> React camelCase)
// ─────────────────────────────────────────────────────────────

function normalizeInvoiceItem(raw: any): InvoiceItem {
  return {
    id: raw.id || raw.LineItemID || `item-${Date.now()}`,
    catalogItemId: raw.catalogItemId || raw.CatalogItemID || '',
    type: raw.type || raw.ItemType || 'SERVICE',
    name: raw.name || raw.ItemName || '',
    hsnSac: raw.hsnSac || raw.HSNSAC || '999799',
    price: Number(raw.price ?? raw.Price ?? 0),
    qty: Number(raw.qty ?? raw.Quantity ?? 1),
    discount: Number(raw.discount ?? raw.DiscountPercent ?? 0),
    discountAmount: Number(raw.discountAmount ?? raw.DiscountAmount ?? 0),
    taxableValue: Number(raw.taxableValue ?? raw.TaxableValue ?? 0),
    gstRate: Number(raw.gstRate ?? raw.GSTRate ?? 18),
    cgstRate: Number(raw.cgstRate ?? 9),
    cgstAmount: Number(raw.cgstAmount ?? raw.CGSTAmount ?? 0),
    sgstRate: Number(raw.sgstRate ?? 9),
    sgstAmount: Number(raw.sgstAmount ?? raw.SGSTAmount ?? 0),
    igstRate: Number(raw.igstRate ?? 0),
    igstAmount: Number(raw.igstAmount ?? raw.IGSTAmount ?? 0),
    total: Number(raw.total ?? raw.ItemTotal ?? 0)
  };
}

function normalizeInvoice(raw: any): Invoice {
  return {
    id: raw.id || raw.InternalInvoiceID || raw.InvoiceNumber || '',
    invoiceNumber: raw.invoiceNumber || raw.InvoiceNumber || '',
    invoiceDate: raw.invoiceDate || raw.InvoiceDate || '',
    dueDate: raw.dueDate || raw.DueDate || raw.InvoiceDate || '',
    customerId: raw.customerId || raw.CustomerID || '',
    customerName: raw.customerName || raw.CustomerName || '',
    customerPhone: raw.customerPhone || raw.CustomerPhone || '',
    customerEmail: raw.customerEmail || raw.CustomerEmail || '',
    customerAddress: raw.customerAddress || raw.CustomerAddress || '',
    customerGSTIN: raw.customerGSTIN || raw.CustomerGSTIN || '',
    petId: raw.petId || raw.PetID || '',
    petName: raw.petName || raw.PetName || '',
    placeOfSupply: raw.placeOfSupply || raw.PlaceOfSupply || '27-Maharashtra',
    isInterState: raw.isInterState !== undefined ? Boolean(raw.isInterState) : Boolean(raw.IsInterState),
    items: Array.isArray(raw.items) ? raw.items.map(normalizeInvoiceItem) : [],
    subTotal: Number(raw.subTotal ?? raw.SubTotal ?? 0),
    totalDiscount: Number(raw.totalDiscount ?? raw.TotalDiscount ?? 0),
    taxableAmount: Number(raw.taxableAmount ?? raw.TaxableAmount ?? 0),
    cgstTotal: Number(raw.cgstTotal ?? raw.CGSTTotal ?? 0),
    sgstTotal: Number(raw.sgstTotal ?? raw.SGSTTotal ?? 0),
    igstTotal: Number(raw.igstTotal ?? raw.IGSTTotal ?? 0),
    totalGst: Number(raw.totalGst ?? raw.TotalGST ?? 0),
    roundOff: Number(raw.roundOff ?? raw.RoundOff ?? 0),
    grandTotal: Number(raw.grandTotal ?? raw.GrandTotal ?? 0),
    paidAmount: Number(raw.paidAmount ?? raw.PaidAmount ?? 0),
    balanceDue: Number(raw.balanceDue ?? raw.BalanceDue ?? 0),
    paymentStatus: (raw.paymentStatus || raw.PaymentStatus || 'PAID') as any,
    paymentMode: (raw.paymentMode || raw.PaymentMode || 'UPI') as any,
    notes: raw.notes || raw.Notes || '',
    createdByRole: raw.createdByRole || raw.CreatedByRole || 'ADMIN',
    createdByName: raw.createdByName || raw.CreatedByName || 'Chirag Jain, CA',
    createdAt: raw.createdAt || raw.CreatedAt || '',
    isCancelled: raw.isCancelled !== undefined ? Boolean(raw.isCancelled) : Boolean(raw.IsCancelled),
    cancelledReason: raw.cancelledReason || raw.CancelledReason || ''
  };
}

function normalizeCustomer(raw: any): Customer {
  return {
    id: raw.id || raw.CustomerID || '',
    name: raw.name || raw.FullName || '',
    phone: raw.phone || raw.Phone || '',
    email: raw.email || raw.Email || '',
    address: raw.address || raw.Address || '',
    gstin: raw.gstin || raw.GSTIN || '',
    stateCode: raw.stateCode || raw.StateCode || '27-Maharashtra',
    emergencyContact: raw.emergencyContact || raw.EmergencyContact || raw.phone || raw.Phone || '',
    outstandingBalance: Number(raw.outstandingBalance ?? raw.OutstandingBalance ?? 0),
    advanceBalance: Number(raw.advanceBalance ?? raw.AdvanceBalance ?? 0),
    createdAt: raw.createdAt || raw.CreatedAt || ''
  };
}

function normalizePet(raw: any): Pet {
  return {
    id: raw.id || raw.PetID || '',
    customerId: raw.customerId || raw.CustomerID || '',
    customerName: raw.customerName || raw.CustomerName || '',
    name: raw.name || raw.PetName || '',
    species: raw.species || raw.Species || 'Dog',
    breed: raw.breed || raw.Breed || 'Standard',
    age: raw.age || raw.Age || '2 Years',
    gender: raw.gender || raw.Gender || 'Male',
    vaccinationStatus: raw.vaccinationStatus || raw.VaccinationStatus || 'Up to Date',
    medicalNotes: raw.medicalNotes || raw.MedicalNotes || '',
    feedingPreferences: raw.feedingPreferences || raw.FeedingPreferences || '',
    microchipId: raw.microchipId || raw.MicrochipID || '',
    barcode: raw.barcode || raw.Barcode || '',
    isBoardingNow: Boolean(raw.isBoardingNow ?? raw.IsBoardingNow ?? false),
    checkInDate: raw.checkInDate || raw.CheckInDate || '',
    checkOutDate: raw.checkOutDate || raw.CheckOutDate || '',
    roomNo: raw.roomNo || raw.RoomNo || 'Standard Care'
  };
}

function normalizePayment(raw: any): Payment {
  return {
    id: raw.id || raw.PaymentID || '',
    invoiceId: raw.invoiceId || raw.InternalInvoiceID || '',
    invoiceNumber: raw.invoiceNumber || raw.InvoiceNumber || '',
    customerId: raw.customerId || raw.CustomerID || '',
    customerName: raw.customerName || raw.CustomerName || '',
    amount: Number(raw.amount ?? raw.Amount ?? 0),
    paymentDate: raw.paymentDate || raw.PaymentDate || '',
    paymentMode: raw.paymentMode || raw.PaymentMode || 'UPI',
    transactionRef: raw.transactionRef || raw.TransactionRef || '',
    notes: raw.notes || raw.Notes || '',
    receivedBy: raw.receivedBy || raw.ReceivedBy || 'Chirag Jain, CA'
  };
}

// ─────────────────────────────────────────────────────────────
// EXPORTED API METHODS
// ─────────────────────────────────────────────────────────────

export const sheetsApi = {
  /**
   * Health Check Ping — lightweight connectivity check.
   */
  async ping(): Promise<boolean> {
    const res = await apiGet<{ status: string }>('ping');
    return res.success && !!res.data?.status;
  },

  /**
   * Fetch all production data from Google Sheets in parallel.
   */
  async fetchInitialData(token?: string): Promise<{
    invoices?: Invoice[];
    customers?: Customer[];
    pets?: Pet[];
    payments?: Payment[];
    users?: User[];
    dashboard?: any;
  } | null> {
    try {
      const [invRes, custRes, petRes, payRes] = await Promise.all([
        apiGet('getInvoices', token ? { token } : {}),
        apiGet('getCustomers', token ? { token } : {}),
        apiGet('getPets', token ? { token } : {}),
        apiGet('getPayments', token ? { token } : {})
      ]);

      if (!invRes.success && !custRes.success) {
        return null;
      }

      const rawInvoices = invRes.success ? (invRes.data?.invoices || []) : [];
      const rawCustomers = custRes.success ? (custRes.data?.customers || []) : [];
      const rawPets = petRes.success ? (petRes.data?.pets || []) : [];
      const rawPayments = payRes.success ? (payRes.data?.payments || []) : [];

      return {
        invoices: rawInvoices.length > 0 ? rawInvoices.map(normalizeInvoice) : undefined,
        customers: rawCustomers.length > 0 ? rawCustomers.map(normalizeCustomer) : undefined,
        pets: rawPets.length > 0 ? rawPets.map(normalizePet) : undefined,
        payments: rawPayments.length > 0 ? rawPayments.map(normalizePayment) : undefined
      };
    } catch (err) {
      return null;
    }
  },

  /**
   * Save or update customer in Google Sheets.
   */
  async saveCustomer(customer: Customer, token?: string): Promise<ApiResponse<{ customerID: string }>> {
    return apiPost<{ customerID: string }>('saveCustomer', {
      CustomerID: customer.id.startsWith('CUST-') ? customer.id : '',
      FullName: customer.name,
      Phone: customer.phone,
      Email: customer.email,
      Address: customer.address,
      GSTIN: customer.gstin,
      StateCode: customer.stateCode || '27-Maharashtra',
      EmergencyContact: customer.emergencyContact || customer.phone,
      OutstandingBalance: customer.outstandingBalance || 0,
      AdvanceBalance: customer.advanceBalance || 0
    }, token);
  },

  /**
   * Save or update pet in Google Sheets.
   */
  async savePet(pet: Pet, token?: string): Promise<ApiResponse<{ petID: string }>> {
    return apiPost<{ petID: string }>('savePet', {
      PetID: pet.id.startsWith('PET-') ? pet.id : '',
      CustomerID: pet.customerId,
      CustomerName: pet.customerName,
      PetName: pet.name,
      Name: pet.name,
      Species: pet.species,
      Breed: pet.breed,
      Age: pet.age,
      Gender: pet.gender,
      VaccinationStatus: pet.vaccinationStatus || 'Up to Date',
      IsBoardingNow: pet.isBoardingNow || false
    }, token);
  },

  /**
   * Create invoice in Google Sheets (uses LockService for sequence).
   */
  async createInvoice(invoice: Invoice, token?: string): Promise<ApiResponse<{ internalInvoiceID: string; invoiceNumber: string }>> {
    return apiPost<{ internalInvoiceID: string; invoiceNumber: string }>('createInvoice', {
      invoice: {
        CustomerID: invoice.customerId,
        CustomerName: invoice.customerName,
        CustomerPhone: invoice.customerPhone,
        CustomerEmail: invoice.customerEmail,
        CustomerGSTIN: invoice.customerGSTIN,
        PetID: invoice.petId,
        PetName: invoice.petName,
        PlaceOfSupply: invoice.placeOfSupply,
        IsInterState: invoice.isInterState,
        SubTotal: invoice.subTotal,
        TotalDiscount: invoice.totalDiscount,
        TaxableAmount: invoice.taxableAmount,
        CGSTTotal: invoice.cgstTotal,
        SGSTTotal: invoice.sgstTotal,
        IGSTTotal: invoice.igstTotal,
        TotalGST: invoice.totalGst,
        RoundOff: invoice.roundOff,
        GrandTotal: invoice.grandTotal,
        PaidAmount: invoice.paidAmount,
        BalanceDue: invoice.balanceDue,
        PaymentStatus: invoice.paymentStatus,
        PaymentMode: invoice.paymentMode,
        Notes: invoice.notes,
        InvoiceDate: invoice.invoiceDate,
        DueDate: invoice.dueDate
      },
      items: invoice.items.map(item => ({
        CatalogItemID: item.catalogItemId || '',
        ItemType: item.type,
        ItemName: item.name,
        HSNSAC: item.hsnSac,
        Price: item.price,
        Quantity: item.qty,
        DiscountPercent: item.discount,
        DiscountAmount: item.discountAmount,
        TaxableValue: item.taxableValue,
        GSTRate: item.gstRate,
        CGSTAmount: item.cgstAmount,
        SGSTAmount: item.sgstAmount,
        IGSTAmount: item.igstAmount,
        ItemTotal: item.total
      }))
    }, token);
  },

  /**
   * Cancel an invoice.
   */
  async cancelInvoice(internalInvoiceID: string, reason: string, token?: string): Promise<ApiResponse> {
    return apiPost('cancelInvoice', { internalInvoiceID, reason }, token);
  },

  /**
   * Delete an invoice permanently from Google Sheets.
   */
  async deleteInvoice(internalInvoiceID: string, token?: string): Promise<ApiResponse> {
    return apiPost('deleteInvoice', { internalInvoiceID, id: internalInvoiceID }, token);
  },

  /**
   * Delete a customer permanently from Google Sheets.
   */
  async deleteCustomer(customerID: string, token?: string): Promise<ApiResponse> {
    return apiPost('deleteCustomer', { customerID, id: customerID }, token);
  },

  /**
   * Delete a pet permanently from Google Sheets.
   */
  async deletePet(petID: string, token?: string): Promise<ApiResponse> {
    return apiPost('deletePet', { petID, id: petID }, token);
  },

  /**
   * Record payment against an invoice in Google Sheets.
   */
  async recordPayment(payment: Payment, token?: string): Promise<ApiResponse> {
    return apiPost('recordPayment', {
      InternalInvoiceID: payment.invoiceId,
      InvoiceNumber: payment.invoiceNumber,
      CustomerID: payment.customerId,
      CustomerName: payment.customerName,
      Amount: payment.amount,
      PaymentDate: payment.paymentDate,
      PaymentMode: payment.paymentMode,
      TransactionRef: payment.transactionRef,
      Notes: payment.notes
    }, token);
  },

  /**
   * Delete payment record from Google Sheets.
   */
  async deletePayment(paymentID: string, token?: string): Promise<ApiResponse> {
    return apiPost('deletePayment', { paymentID, id: paymentID }, token);
  },

  /**
   * User login against Google Sheets Users sheet.
   */
  async login(username: string, password: string): Promise<ApiResponse<{ token: string; user: User; permissions: Record<string, boolean> }>> {
    return apiPost('login', { username, password });
  }
};
