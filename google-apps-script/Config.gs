// ============================================================
// Config.gs — THOP Production Database Configuration
// Project: The House of Pawz – Billing Pro
// Version: 1.0.0 | Phase 12A Foundation
// ============================================================
// IMPORTANT: After creating the Google Spreadsheet, paste its
// ID into SPREADSHEET_ID below.
// ============================================================

var CONFIG = {
  // ─── SPREADSHEET ─────────────────────────────────────────
  SPREADSHEET_ID: '1u2tWurjX7PoS8-vf_qHSrG8bmmYErs01ya3FbDRvYKo',
  SPREADSHEET_NAME: 'THOP_PRODUCTION_DATABASE',

  // ─── API ─────────────────────────────────────────────────
  API_VERSION: '1.0.0',
  APP_NAME: 'The House of Pawz – Billing Pro',

  // ─── SECURITY ────────────────────────────────────────────
  // JWT-style HMAC secret for session token signing.
  // Change this to a strong random string before production use.
  SESSION_SECRET: 'THOP-SECRET-CHANGE-BEFORE-PRODUCTION-2026',
  SESSION_EXPIRY_HOURS: 12,

  // ─── SHEET NAMES ─────────────────────────────────────────
  SHEETS: {
    SETTINGS:          'Company_Settings',
    USERS:             'Users',
    PERMISSIONS:       'User_Permissions',
    CUSTOMERS:         'Customers',
    PETS:              'Pets',
    CATALOG:           'Catalog_Items',
    INVOICES:          'Invoices',
    INVOICE_ITEMS:     'Invoice_Items',
    PAYMENTS:          'Payments',
    SUBSCRIPTIONS:     'Subscriptions',
    COMM_LOGS:         'Communication_Logs',
    AUDIT:             'Audit_Logs'
  },

  // ─── ID PREFIXES ─────────────────────────────────────────
  ID_PREFIX: {
    USER:         'USR',
    PERMISSION:   'OVR',
    CUSTOMER:     'CUST',
    PET:          'PET',
    CATALOG:      'CAT',
    INVOICE:      'INV',
    ITEM:         'ITEM',
    PAYMENT:      'PAY',
    SUBSCRIPTION: 'SUB',
    COMM:         'COMM',
    AUDIT:        'LOG'
  },

  // ─── FINANCIAL YEAR ──────────────────────────────────────
  // Indian FY: April 1 → March 31
  FY_MONTH_START: 4, // April

  // ─── ROLES ───────────────────────────────────────────────
  ROLES: {
    ADMIN:         'ADMIN',
    USER:          'USER',
    BILLING_STAFF: 'BILLING_STAFF'
  },

  // ─── PAYMENT STATUSES ────────────────────────────────────
  PAYMENT_STATUS: {
    PAID:      'PAID',
    PARTIAL:   'PARTIAL',
    UNPAID:    'UNPAID',
    CANCELLED: 'CANCELLED'
  },

  // ─── GST ─────────────────────────────────────────────────
  DEFAULT_GST_RATE: 18,
  COMPANY_STATE_CODE: '27', // Maharashtra

  // ─── AUDIT ACTIONS ───────────────────────────────────────
  AUDIT_ACTIONS: {
    LOGIN_SUCCESS:       'LOGIN_SUCCESS',
    LOGIN_FAILED:        'LOGIN_FAILED',
    LOGOUT:              'LOGOUT',
    CUSTOMER_CREATED:    'CUSTOMER_CREATED',
    CUSTOMER_UPDATED:    'CUSTOMER_UPDATED',
    PET_CREATED:         'PET_CREATED',
    PET_UPDATED:         'PET_UPDATED',
    INVOICE_CREATED:     'INVOICE_CREATED',
    INVOICE_UPDATED:     'INVOICE_UPDATED',
    INVOICE_CANCELLED:   'INVOICE_CANCELLED',
    PAYMENT_RECORDED:    'PAYMENT_RECORDED',
    PERMISSION_CHANGED:  'PERMISSION_CHANGED',
    USER_CREATED:        'USER_CREATED',
    USER_UPDATED:        'USER_UPDATED',
    USER_DELETED:        'USER_DELETED',
    SETTINGS_UPDATED:    'SETTINGS_UPDATED',
    DB_HEALTH_CHECK:     'DB_HEALTH_CHECK'
  }
};

/**
 * Get the production Google Spreadsheet.
 * Tries active spreadsheet (bound container) first, then openById.
 */
function getSpreadsheet() {
  var ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}

  if (!ss && CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID !== 'PASTE_YOUR_SPREADSHEET_ID_HERE') {
    try {
      ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    } catch (e) {}
  }

  if (!ss) {
    throw new Error('CONFIGURATION_ERROR: Unable to open spreadsheet. Verify SPREADSHEET_ID in Config.gs.');
  }
  return ss;
}

/**
 * Get a named sheet from the production spreadsheet.
 * Throws a clear error if the sheet does not exist.
 */
function getSheet(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('SHEET_NOT_FOUND: Sheet "' + sheetName + '" does not exist in THOP_PRODUCTION_DATABASE');
  }
  return sheet;
}

/**
 * Determine the Indian Financial Year for a given date.
 * April 1, 2026 → "2026-27"
 * March 31, 2027 → "2026-27"
 * April 1, 2027 → "2027-28"
 *
 * @param {Date} date - Date object to evaluate. Defaults to today.
 * @returns {string} e.g. "2026-27"
 */
function getFinancialYear(date) {
  var d = date || new Date();
  var year = d.getFullYear();
  var month = d.getMonth() + 1; // 1-indexed

  if (month >= CONFIG.FY_MONTH_START) {
    // On or after April → FY starts this calendar year
    return year + '-' + String(year + 1).slice(-2);
  } else {
    // Before April → FY started last calendar year
    return (year - 1) + '-' + String(year).slice(-2);
  }
}
