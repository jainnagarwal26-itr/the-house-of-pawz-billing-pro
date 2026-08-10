// ============================================================
// Backup.gs — Database Health Check & Backup Utilities
// Project: The House of Pawz – Billing Pro
// ============================================================

/**
 * EXPECTED_SCHEMA: Defines the required header columns for each sheet.
 * Used by runDatabaseHealthCheck() to verify structure.
 */
var EXPECTED_SCHEMA = {
  Company_Settings: ['SettingID','CompanyName','Tagline','Address','CityStateZip','Phone','Email','GSTIN','StateCode','AccountName','BankName','AccountNo','IFSC','Branch','UPI_ID','LogoPath','SignaturePath','InvoicePrefix','FinancialYear','DefaultGstRate','TermsJSON','UpdatedAt'],
  Users: ['UserID','FullName','Username','PasswordHash','Role','Email','Phone','Designation','AvatarURL','LastLogin','IsActive','PinCode','RecoveryKey','CreatedAt','UpdatedAt'],
  User_Permissions: ['OverrideID','UserID','PermissionKey','PermissionValue','UpdatedBy','UpdatedAt'],
  Customers: ['CustomerID','FullName','Phone','Email','Address','GSTIN','StateCode','EmergencyContact','OutstandingBalance','AdvanceBalance','CreatedAt','UpdatedAt'],
  Pets: ['PetID','CustomerID','CustomerName','PetName','Species','Breed','Age','Gender','VaccinationStatus','MedicalNotes','FeedingPreferences','MicrochipID','Barcode','IsBoardingNow','CheckInDate','CheckOutDate','RoomNo','CreatedAt','UpdatedAt'],
  Catalog_Items: ['CatalogItemID','ItemType','ItemName','Category','HSNSAC','Price','GSTRate','Unit','Barcode','StockQty','IsActive','CreatedAt','UpdatedAt'],
  Invoices: ['InternalInvoiceID','InvoiceNumber','FinancialYear','InvoiceDate','DueDate','CustomerID','CustomerName','CustomerPhone','CustomerEmail','CustomerGSTIN','PetID','PetName','PlaceOfSupply','IsInterState','SubTotal','TotalDiscount','TaxableAmount','CGSTTotal','SGSTTotal','IGSTTotal','TotalGST','RoundOff','GrandTotal','PaidAmount','BalanceDue','PaymentStatus','PaymentMode','Notes','CreatedByRole','CreatedByName','IsCancelled','CancelledReason','CreatedAt','UpdatedAt'],
  Invoice_Items: ['LineItemID','InternalInvoiceID','InvoiceNumber','CatalogItemID','ItemType','ItemName','HSNSAC','Price','Quantity','DiscountPercent','DiscountAmount','TaxableValue','GSTRate','CGSTAmount','SGSTAmount','IGSTAmount','ItemTotal','CreatedAt','UpdatedAt'],
  Payments: ['PaymentID','InternalInvoiceID','InvoiceNumber','CustomerID','CustomerName','Amount','PaymentDate','PaymentMode','TransactionRef','Notes','ReceivedBy','CreatedAt','UpdatedAt'],
  Subscriptions: ['SubscriptionID','CustomerID','CustomerName','PetID','PetName','ServiceName','Amount','Frequency','StartDate','NextBillingDate','Status','LastInvoiceID','CreatedAt','UpdatedAt'],
  Communication_Logs: ['CommLogID','Timestamp','Date','CustomerID','CustomerName','DocumentType','DocumentRef','Channel','UserName','Status','Notes'],
  Audit_Logs: ['LogID','Timestamp','UserID','UserName','UserRole','ActionCode','Details','IPAddress']
};

/**
 * Run a full database health check against all 12 required sheets.
 * Returns a human-readable PASS/FAIL report.
 * Can be run directly from the Apps Script editor without authentication.
 */
function runDatabaseHealthCheck() {
  var report = [];
  report.push('====================================================');
  report.push('  DATABASE HEALTH CHECK — THOP_PRODUCTION_DATABASE  ');
  report.push('  Run: ' + nowIST());
  report.push('====================================================');
  report.push('');

  var ss;
  try {
    ss = getSpreadsheet();
  } catch (configErr) {
    report.push('CRITICAL FAILURE: ' + configErr.message);
    report.push('ACTION REQUIRED: Set SPREADSHEET_ID in Config.gs');
    var output = report.join('\n');
    Logger.log(output);
    return output;
  }

  var overallPass = true;
  var sheetNames = Object.keys(EXPECTED_SCHEMA);

  sheetNames.forEach(function(sheetName) {
    var sheetPass = true;
    var sheetIssues = [];

    // 1. Check sheet exists
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      report.push('  [FAIL] ' + sheetName + ' — SHEET NOT FOUND');
      overallPass = false;
      return;
    }

    // 2. Check header row exists
    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) {
      report.push('  [FAIL] ' + sheetName + ' — NO HEADERS FOUND');
      overallPass = false;
      return;
    }

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); });
    var expected = EXPECTED_SCHEMA[sheetName];

    // 3. Check each required column
    expected.forEach(function(col) {
      if (headers.indexOf(col) === -1) {
        sheetIssues.push('Missing column: ' + col);
        sheetPass = false;
      }
    });

    // 4. Check for duplicate primary keys
    var pkColumn = expected[0]; // First column is always the primary key
    var pkIndex = headers.indexOf(pkColumn);
    if (pkIndex !== -1 && sheet.getLastRow() > 1) {
      var pkValues = sheet.getRange(2, pkIndex + 1, sheet.getLastRow() - 1, 1).getValues().flat();
      var seen = {};
      pkValues.forEach(function(v) {
        if (v && v !== '') {
          if (seen[v]) sheetIssues.push('Duplicate primary key detected: ' + v);
          seen[v] = true;
        }
      });
      if (sheetIssues.some(function(i) { return i.startsWith('Duplicate'); })) sheetPass = false;
    }

    if (sheetPass) {
      var rowCount = Math.max(0, sheet.getLastRow() - 1);
      report.push('  [PASS] ' + sheetName.padEnd(22) + '| Columns: ' + headers.length + ' | Rows: ' + rowCount);
    } else {
      report.push('  [FAIL] ' + sheetName.padEnd(22) + '| ISSUES:');
      sheetIssues.forEach(function(issue) { report.push('         ↳ ' + issue); });
      overallPass = false;
    }
  });

  report.push('');
  report.push('====================================================');
  report.push('  Overall Status: ' + (overallPass ? '✅ PASS — All 12 sheets verified.' : '❌ FAIL — Review issues above.'));
  report.push('====================================================');

  var finalReport = report.join('\n');
  Logger.log(finalReport);

  // Log audit entry (system-generated)
  logAudit('SYSTEM', 'System', 'SYSTEM', CONFIG.AUDIT_ACTIONS.DB_HEALTH_CHECK,
    'Database health check completed. Status: ' + (overallPass ? 'PASS' : 'FAIL'), '');

  return finalReport;
}

/**
 * Create the 12 required sheets with header rows if they don't already exist.
 * Run this ONCE immediately after creating the blank Google Spreadsheet.
 * This function is idempotent — safe to run multiple times.
 */
function setupDatabaseSheets() {
  var ss = getSpreadsheet();
  var report = [];
  report.push('SETUP: Creating THOP_PRODUCTION_DATABASE structure...');

  Object.keys(EXPECTED_SCHEMA).forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      report.push('  [CREATED] ' + sheetName);
    } else {
      report.push('  [EXISTS]  ' + sheetName + ' — skipped');
    }

    // Write header row if empty
    var headers = EXPECTED_SCHEMA[sheetName];
    var existingHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    var hasHeaders = existingHeaders.some(function(h) { return h !== ''; });

    if (!hasHeaders) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // Style header row
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#1e293b');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      headerRange.setFontSize(10);
      sheet.setFrozenRows(1);

      report.push('    → Headers written: ' + headers.length + ' columns');
    }
  });

  // Remove default "Sheet1" if it still exists and is empty
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() <= 1) {
    ss.deleteSheet(defaultSheet);
    report.push('  [REMOVED] Default Sheet1');
  }

  var summary = report.join('\n');
  Logger.log(summary);
  return summary;
}
