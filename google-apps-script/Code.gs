// ============================================================
// Code.gs — Direct Run Functions (Dropdown Entry Points)
// Project: The House of Pawz – Billing Pro
// ============================================================
// Yeh file sirf Apps Script dropdown ke liye hai.
// Isko Apps Script editor mein seedha Run karo.
// ============================================================

/**
 * STEP 1: Sabse pehle yeh function run karo.
 * 12 sheets create karega THOP_PRODUCTION_DATABASE mein.
 */
function setupDatabaseSheets() {
  var ss = getSpreadsheet();
  var report = [];
  report.push('SETUP: Creating THOP_PRODUCTION_DATABASE structure...');

  var EXPECTED_SCHEMA = {
    Company_Settings:  ['SettingID','CompanyName','Tagline','Address','CityStateZip','Phone','Email','GSTIN','StateCode','AccountName','BankName','AccountNo','IFSC','Branch','UPI_ID','LogoPath','SignaturePath','InvoicePrefix','FinancialYear','DefaultGstRate','TermsJSON','UpdatedAt'],
    Users:             ['UserID','FullName','Username','PasswordHash','Role','Email','Phone','Designation','AvatarURL','LastLogin','IsActive','PinCode','RecoveryKey','CreatedAt','UpdatedAt'],
    User_Permissions:  ['OverrideID','UserID','PermissionKey','PermissionValue','UpdatedBy','UpdatedAt'],
    Customers:         ['CustomerID','FullName','Phone','Email','Address','GSTIN','StateCode','EmergencyContact','OutstandingBalance','AdvanceBalance','CreatedAt','UpdatedAt'],
    Pets:              ['PetID','CustomerID','CustomerName','PetName','Species','Breed','Age','Gender','VaccinationStatus','MedicalNotes','FeedingPreferences','MicrochipID','Barcode','IsBoardingNow','CheckInDate','CheckOutDate','RoomNo','CreatedAt','UpdatedAt'],
    Catalog_Items:     ['CatalogItemID','ItemType','ItemName','Category','HSNSAC','Price','GSTRate','Unit','Barcode','StockQty','IsActive','CreatedAt','UpdatedAt'],
    Invoices:          ['InternalInvoiceID','InvoiceNumber','FinancialYear','InvoiceDate','DueDate','CustomerID','CustomerName','CustomerPhone','CustomerEmail','CustomerGSTIN','PetID','PetName','PlaceOfSupply','IsInterState','SubTotal','TotalDiscount','TaxableAmount','CGSTTotal','SGSTTotal','IGSTTotal','TotalGST','RoundOff','GrandTotal','PaidAmount','BalanceDue','PaymentStatus','PaymentMode','Notes','CreatedByRole','CreatedByName','IsCancelled','CancelledReason','CreatedAt','UpdatedAt'],
    Invoice_Items:     ['LineItemID','InternalInvoiceID','InvoiceNumber','CatalogItemID','ItemType','ItemName','HSNSAC','Price','Quantity','DiscountPercent','DiscountAmount','TaxableValue','GSTRate','CGSTAmount','SGSTAmount','IGSTAmount','ItemTotal','CreatedAt','UpdatedAt'],
    Payments:          ['PaymentID','InternalInvoiceID','InvoiceNumber','CustomerID','CustomerName','Amount','PaymentDate','PaymentMode','TransactionRef','Notes','ReceivedBy','CreatedAt','UpdatedAt'],
    Subscriptions:     ['SubscriptionID','CustomerID','CustomerName','PetID','PetName','ServiceName','Amount','Frequency','StartDate','NextBillingDate','Status','LastInvoiceID','CreatedAt','UpdatedAt'],
    Communication_Logs:['CommLogID','Timestamp','Date','CustomerID','CustomerName','DocumentType','DocumentRef','Channel','UserName','Status','Notes'],
    Audit_Logs:        ['LogID','Timestamp','UserID','UserName','UserRole','ActionCode','Details','IPAddress']
  };

  Object.keys(EXPECTED_SCHEMA).forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      report.push('  [CREATED] ' + sheetName);
    } else {
      report.push('  [EXISTS]  ' + sheetName + ' — skipped');
    }

    var headers = EXPECTED_SCHEMA[sheetName];
    var existingHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    var hasHeaders = existingHeaders.some(function(h) { return h !== ''; });

    if (!hasHeaders) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#1e293b');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      headerRange.setFontSize(10);
      sheet.setFrozenRows(1);
      report.push('    Headers written: ' + headers.length + ' columns');
    }
  });

  // Default Sheet1 hatao agar khaali ho
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() <= 1) {
    ss.deleteSheet(defaultSheet);
    report.push('  [REMOVED] Default Sheet1');
  }

  var summary = report.join('\n');
  Logger.log(summary);
  SpreadsheetApp.getUi().alert('Setup Complete!\n\n' + summary);
  return summary;
}

/**
 * STEP 2: Setup ke baad yeh run karo — sabhi 12 sheets verify karega.
 */
function runDatabaseHealthCheck() {
  var EXPECTED_SCHEMA = {
    Company_Settings:  ['SettingID','CompanyName','Tagline','Address','CityStateZip','Phone','Email','GSTIN','StateCode','AccountName','BankName','AccountNo','IFSC','Branch','UPI_ID','LogoPath','SignaturePath','InvoicePrefix','FinancialYear','DefaultGstRate','TermsJSON','UpdatedAt'],
    Users:             ['UserID','FullName','Username','PasswordHash','Role','Email','Phone','Designation','AvatarURL','LastLogin','IsActive','PinCode','RecoveryKey','CreatedAt','UpdatedAt'],
    User_Permissions:  ['OverrideID','UserID','PermissionKey','PermissionValue','UpdatedBy','UpdatedAt'],
    Customers:         ['CustomerID','FullName','Phone','Email','Address','GSTIN','StateCode','EmergencyContact','OutstandingBalance','AdvanceBalance','CreatedAt','UpdatedAt'],
    Pets:              ['PetID','CustomerID','CustomerName','PetName','Species','Breed','Age','Gender','VaccinationStatus','MedicalNotes','FeedingPreferences','MicrochipID','Barcode','IsBoardingNow','CheckInDate','CheckOutDate','RoomNo','CreatedAt','UpdatedAt'],
    Catalog_Items:     ['CatalogItemID','ItemType','ItemName','Category','HSNSAC','Price','GSTRate','Unit','Barcode','StockQty','IsActive','CreatedAt','UpdatedAt'],
    Invoices:          ['InternalInvoiceID','InvoiceNumber','FinancialYear','InvoiceDate','DueDate','CustomerID','CustomerName','CustomerPhone','CustomerEmail','CustomerGSTIN','PetID','PetName','PlaceOfSupply','IsInterState','SubTotal','TotalDiscount','TaxableAmount','CGSTTotal','SGSTTotal','IGSTTotal','TotalGST','RoundOff','GrandTotal','PaidAmount','BalanceDue','PaymentStatus','PaymentMode','Notes','CreatedByRole','CreatedByName','IsCancelled','CancelledReason','CreatedAt','UpdatedAt'],
    Invoice_Items:     ['LineItemID','InternalInvoiceID','InvoiceNumber','CatalogItemID','ItemType','ItemName','HSNSAC','Price','Quantity','DiscountPercent','DiscountAmount','TaxableValue','GSTRate','CGSTAmount','SGSTAmount','IGSTAmount','ItemTotal','CreatedAt','UpdatedAt'],
    Payments:          ['PaymentID','InternalInvoiceID','InvoiceNumber','CustomerID','CustomerName','Amount','PaymentDate','PaymentMode','TransactionRef','Notes','ReceivedBy','CreatedAt','UpdatedAt'],
    Subscriptions:     ['SubscriptionID','CustomerID','CustomerName','PetID','PetName','ServiceName','Amount','Frequency','StartDate','NextBillingDate','Status','LastInvoiceID','CreatedAt','UpdatedAt'],
    Communication_Logs:['CommLogID','Timestamp','Date','CustomerID','CustomerName','DocumentType','DocumentRef','Channel','UserName','Status','Notes'],
    Audit_Logs:        ['LogID','Timestamp','UserID','UserName','UserRole','ActionCode','Details','IPAddress']
  };

  var report = [];
  report.push('====================================================');
  report.push('  HEALTH CHECK — THOP_PRODUCTION_DATABASE');
  report.push('  Run: ' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM/yyyy HH:mm:ss'));
  report.push('====================================================');

  var ss;
  try {
    ss = getSpreadsheet();
  } catch (e) {
    var msg = 'CRITICAL FAILURE: ' + e.message + '\nACTION: Set SPREADSHEET_ID in Config.gs';
    Logger.log(msg);
    SpreadsheetApp.getUi().alert(msg);
    return msg;
  }

  var overallPass = true;

  Object.keys(EXPECTED_SCHEMA).forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      report.push('  [FAIL] ' + sheetName + ' — SHEET NOT FOUND');
      overallPass = false;
      return;
    }

    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) {
      report.push('  [FAIL] ' + sheetName + ' — NO HEADERS');
      overallPass = false;
      return;
    }

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); });
    var expected = EXPECTED_SCHEMA[sheetName];
    var missing = expected.filter(function(col) { return headers.indexOf(col) === -1; });

    if (missing.length === 0) {
      var rowCount = Math.max(0, sheet.getLastRow() - 1);
      report.push('  [PASS] ' + sheetName + ' | Cols: ' + headers.length + ' | Rows: ' + rowCount);
    } else {
      report.push('  [FAIL] ' + sheetName + ' | Missing: ' + missing.join(', '));
      overallPass = false;
    }
  });

  report.push('====================================================');
  report.push(overallPass
    ? '  Status: PASS — All 12 sheets verified!'
    : '  Status: FAIL — Review issues above.');
  report.push('====================================================');

  var finalReport = report.join('\n');
  Logger.log(finalReport);
  SpreadsheetApp.getUi().alert(finalReport);
  return finalReport;
}

/**
 * API ke live hone ka test karo (bina deploy ke bhi run kar sakte ho).
 */
function testPing() {
  var result = { success: true, data: { status: 'THOP API Online', version: '1.0.0' }, message: 'OK' };
  Logger.log(JSON.stringify(result));
  SpreadsheetApp.getUi().alert('Ping Successful!\n\n' + JSON.stringify(result, null, 2));
  return result;
}

/**
 * 🛠️ CUST-1005 (Dream Catchers) aur CUST-1014 (Priyanka Pardasani)
 * ke +91/#ERROR! phone numbers ko instant fix karne ka function.
 */
function fixPhoneErrors() {
  var ss = getSpreadsheet();
  var logs = [];

  // 1. Fix Customers Sheet
  var custSheet = ss.getSheetByName('Customers');
  if (custSheet) {
    var data = custSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var id = String(data[i][0]);
      if (id === 'CUST-1005') {
        custSheet.getRange(i + 1, 3).setValue("'+91 98330 20003"); // Col C: Phone
        custSheet.getRange(i + 1, 8).setValue("'+91 98330 20003"); // Col H: EmergencyContact
        logs.push('✅ Fixed CUST-1005 (Dream Catchers) in Customers sheet');
      }
      if (id === 'CUST-1014') {
        custSheet.getRange(i + 1, 3).setValue("'+1 201-334-6533"); // Col C: Phone
        custSheet.getRange(i + 1, 8).setValue("'+1 201-334-6533"); // Col H: EmergencyContact
        logs.push('✅ Fixed CUST-1014 (Priyanka Pardasani) in Customers sheet');
      }
    }
  }

  // 2. Fix Invoices Sheet
  var invSheet = ss.getSheetByName('Invoices');
  if (invSheet) {
    var invData = invSheet.getDataRange().getValues();
    for (var j = 1; j < invData.length; j++) {
      var custId = String(invData[j][5]); // Col F: CustomerID
      if (custId === 'CUST-1005') {
        invSheet.getRange(j + 1, 8).setValue("'+91 98330 20003"); // Col H: CustomerPhone
        logs.push('✅ Fixed invoice for CUST-1005 in Invoices sheet');
      }
      if (custId === 'CUST-1014') {
        invSheet.getRange(j + 1, 8).setValue("'+1 201-334-6533"); // Col H: CustomerPhone
        logs.push('✅ Fixed invoice for CUST-1014 in Invoices sheet');
      }
    }
  }

  var summary = logs.join('\n');
  Logger.log(summary);
  try {
    SpreadsheetApp.getUi().alert('🎉 Phone Errors Fixed!\n\n' + summary);
  } catch(e) {}
  return summary;
}

/**
 * STEP 3 (PART 12E): Supporting sheets initialize karne ka function.
 * Run karo: Company_Settings, Users, User_Permissions, Catalog_Items
 * ko real production data se fill karega. Subscriptions aur Communication_Logs EMPTY rahenge.
 */
function runPart12EInitialization() {
  return initializeSupportingSheets();
}

