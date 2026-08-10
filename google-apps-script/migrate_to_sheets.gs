// ============================================================
// migrate_to_sheets.gs — Phase 12B: Historical Data Migration
// Project: The House of Pawz – Billing Pro
// ============================================================

/**
 * Formula injection aur #ERROR! se bachane ke liye helper.
 * Agar string +, -, =, ya @ se shuru hoti hai, toh single quote (') lagata hai.
 */
function cleanVal(val) {
  if (val === undefined || val === null) return '';
  if (typeof val === 'string') {
    if (/^[=+\-@]/.test(val)) {
      return "'" + val;
    }
  }
  return val;
}

/**
 * UI environment check safety helper.
 * Spreadsheet UI alert show karega agar access ho, warna simple log karega.
 */
function safeAlert(msg) {
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    Logger.log('📢 ALERT: ' + msg);
  }
}

/**
 * 🧹 Test ke dauran database clear karne ka utility function.
 * Headers (Row 1) ko safe rakhega, baaki saara data delete karega.
 */
function clearAllDataSheets() {
  var ss = getSpreadsheet();
  var sheetsToClear = ['Customers', 'Pets', 'Invoices', 'Invoice_Items', 'Payments', 'Subscriptions'];
  var clearedCount = 0;
  
  sheetsToClear.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      clearedCount++;
    }
  });
  
  var msg = '🧹 Database Cleared! ' + clearedCount + ' sheets data cleared (Headers preserved).';
  Logger.log(msg);
  safeAlert(msg);
}

// ─────────────────────────────────────────────────────────────
// STEP 1: Pehle yeh function run karo — PRE-MIGRATION VALIDATION
// ─────────────────────────────────────────────────────────────
function preMigrationValidation() {
  var report = [];
  report.push('PRE-MIGRATION VALIDATION REPORT');
  report.push('================================');

  var ss = getSpreadsheet();

  // Check: Invoices sheet already khaali hai?
  var invoicesSheet = ss.getSheetByName('Invoices');
  var existingRows = invoicesSheet ? Math.max(0, invoicesSheet.getLastRow() - 1) : 0;
  if (existingRows > 0) {
    var msg = 'ABORT: Invoices sheet already has ' + existingRows + ' rows! Run clearAllDataSheets() first to reset.';
    Logger.log(msg);
    safeAlert('⛔ ' + msg);
    return;
  }

  report.push('✅ Invoices sheet is empty — safe to migrate');

  // Check: All 12 sheets exist
  var required = ['Company_Settings','Users','User_Permissions','Customers','Pets','Catalog_Items','Invoices','Invoice_Items','Payments','Subscriptions','Communication_Logs','Audit_Logs'];
  var missing = required.filter(function(name) { return !ss.getSheetByName(name); });
  if (missing.length > 0) {
    var msg2 = 'ABORT: Missing sheets: ' + missing.join(', ') + '\nRun setupDatabaseSheets() first!';
    Logger.log(msg2);
    safeAlert('⛔ ' + msg2);
    return;
  }
  report.push('✅ All 12 sheets exist');
  report.push('');
  report.push('READY FOR MIGRATION.');
  report.push('Next step: Open your React app in browser,');
  report.push('open browser Console (F12), and paste the');
  report.push('migration script from migrationConsoleScript.js');

  var finalReport = report.join('\n');
  Logger.log(finalReport);
  safeAlert(finalReport);
}

// ─────────────────────────────────────────────────────────────
// STEP 2: Bulk Data Import
// ─────────────────────────────────────────────────────────────
function importHistoricalDataFromJSON() {
  var MIGRATION_JSON_PAYLOAD = null; // ← Paste copied JSON here

  if (!MIGRATION_JSON_PAYLOAD) {
    safeAlert(
      '⚠️ MIGRATION_JSON_PAYLOAD is empty!\n\n' +
      'Please paste the JSON payload copied from the browser console.'
    );
    return;
  }

  var data;
  try {
    data = typeof MIGRATION_JSON_PAYLOAD === 'string'
      ? JSON.parse(MIGRATION_JSON_PAYLOAD)
      : MIGRATION_JSON_PAYLOAD;
  } catch(e) {
    safeAlert('⛔ JSON Parse Error: ' + e.message);
    return;
  }

  var ss = getSpreadsheet();
  var report = [];
  report.push('MIGRATION EXECUTION REPORT');
  report.push('==========================');

  // ── 1. Customers ───────────────────────────────────────────
  if (data.customers && data.customers.length > 0) {
    var custSheet = ss.getSheetByName('Customers');
    data.customers.forEach(function(c) {
      custSheet.appendRow([
        cleanVal(c.id), 
        cleanVal(c.name), 
        cleanVal(c.phone), 
        cleanVal(c.email), 
        cleanVal(c.address),
        cleanVal(c.gstin || ''), 
        cleanVal(c.stateCode || ''), 
        cleanVal(c.emergencyContact || ''),
        c.outstandingBalance || 0, 
        c.advanceBalance || 0,
        cleanVal(c.createdAt || ''), 
        cleanVal(c.createdAt || '')
      ]);
    });
    report.push('✅ Customers: ' + data.customers.length + ' records imported');
  }

  // ── 2. Pets ────────────────────────────────────────────────
  if (data.pets && data.pets.length > 0) {
    var petsSheet = ss.getSheetByName('Pets');
    data.pets.forEach(function(p) {
      petsSheet.appendRow([
        cleanVal(p.id), 
        cleanVal(p.customerId), 
        cleanVal(p.customerName), 
        cleanVal(p.name), 
        cleanVal(p.species),
        cleanVal(p.breed || ''), 
        cleanVal(p.age || ''), 
        cleanVal(p.gender || ''),
        cleanVal(p.vaccinationStatus || ''), 
        cleanVal(p.medicalNotes || ''),
        cleanVal(p.feedingPreferences || ''), 
        cleanVal(p.microchipId || ''), 
        cleanVal(p.barcode || ''),
        p.isBoardingNow ? 'true' : 'false',
        cleanVal(p.checkInDate || ''), 
        cleanVal(p.checkOutDate || ''), 
        cleanVal(p.roomNo || ''),
        cleanVal(p.createdAt || ''), 
        cleanVal(p.createdAt || '')
      ]);
    });
    report.push('✅ Pets: ' + data.pets.length + ' records imported');
  }

  // ── 3. Invoices (THE SACRED 32) ────────────────────────────
  if (data.invoices && data.invoices.length > 0) {
    var invSheet = ss.getSheetByName('Invoices');
    var itemsSheet = ss.getSheetByName('Invoice_Items');

    data.invoices.forEach(function(inv, idx) {
      var internalID = 'INV-HOP-' + String(inv.invoiceNumber || '').replace(/\//g, '-').replace(/^HOP-/, '');
      var fy = '2026-27';

      invSheet.appendRow([
        cleanVal(internalID),
        cleanVal(inv.invoiceNumber),
        cleanVal(fy),
        cleanVal(inv.invoiceDate),
        cleanVal(inv.dueDate || ''),
        cleanVal(inv.customerId || ''),
        cleanVal(inv.customerName || ''),
        cleanVal(inv.customerPhone || ''),
        cleanVal(inv.customerEmail || ''),
        cleanVal(inv.customerGSTIN || ''),
        cleanVal(inv.petId || ''),
        cleanVal(inv.petName || ''),
        cleanVal(inv.placeOfSupply || ''),
        inv.isInterState ? 'true' : 'false',
        inv.subTotal || 0,
        inv.totalDiscount || 0,
        inv.taxableAmount || 0,
        inv.cgstTotal || 0,
        inv.sgstTotal || 0,
        inv.igstTotal || 0,
        inv.totalGst || 0,
        inv.roundOff || 0,
        inv.grandTotal || 0,
        inv.paidAmount || 0,
        inv.balanceDue || 0,
        cleanVal(inv.paymentStatus || 'UNPAID'),
        cleanVal(inv.paymentMode || ''),
        cleanVal(inv.notes || ''),
        cleanVal(inv.createdByRole || 'ADMIN'),
        cleanVal(inv.createdByName || 'Chirag Jain'),
        inv.isCancelled ? 'true' : 'false',
        cleanVal(inv.cancelledReason || ''),
        cleanVal(inv.createdAt || ''),
        cleanVal(inv.createdAt || '')
      ]);

      // Invoice Items
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach(function(item, itemIdx) {
          itemsSheet.appendRow([
            'ITEM-' + String(idx + 1).padStart(3, '0') + '-' + String(itemIdx + 1).padStart(2, '0'),
            cleanVal(internalID),
            cleanVal(inv.invoiceNumber),
            cleanVal(item.catalogItemId || ''),
            cleanVal(item.type || 'SERVICE'),
            cleanVal(item.name || ''),
            cleanVal(item.hsnSac || '999799'),
            item.price || 0,
            item.qty || 1,
            item.discount || 0,
            item.discountAmount || 0,
            item.taxableValue || 0,
            item.gstRate || 18,
            item.cgstAmount || 0,
            item.sgstAmount || 0,
            item.igstAmount || 0,
            item.total || 0,
            cleanVal(inv.createdAt || ''),
            cleanVal(inv.createdAt || '')
          ]);
        });
      }
    });
    report.push('✅ Invoices: ' + data.invoices.length + ' records imported (THE SACRED 32)');
  }

  // ── 4. Payments ────────────────────────────────────────────
  if (data.payments && data.payments.length > 0) {
    var paySheet = ss.getSheetByName('Payments');
    data.payments.forEach(function(pay) {
      var internalID = 'INV-HOP-' + String(pay.invoiceNumber || '').replace(/\//g, '-').replace(/^HOP-/, '');
      paySheet.appendRow([
        cleanVal(pay.id),
        cleanVal(internalID),
        cleanVal(pay.invoiceNumber),
        cleanVal(pay.customerId || ''),
        cleanVal(pay.customerName || ''),
        pay.amount || 0,
        cleanVal(pay.paymentDate || ''),
        cleanVal(pay.paymentMode || 'Cash'),
        cleanVal(pay.transactionRef || ''),
        cleanVal(pay.notes || ''),
        cleanVal(pay.receivedBy || 'Chirag Jain'),
        cleanVal(pay.paymentDate || ''),
        cleanVal(pay.paymentDate || '')
      ]);
    });
    report.push('✅ Payments: ' + data.payments.length + ' records imported');
  }

  // ── 5. Recurring Subscriptions ─────────────────────────────
  if (data.recurring && data.recurring.length > 0) {
    var subSheet = ss.getSheetByName('Subscriptions');
    data.recurring.forEach(function(sub) {
      subSheet.appendRow([
        cleanVal(sub.id), 
        cleanVal(sub.customerId), 
        cleanVal(sub.customerName),
        cleanVal(sub.petId), 
        cleanVal(sub.petName), 
        cleanVal(sub.serviceName),
        sub.amount, 
        cleanVal(sub.frequency), 
        cleanVal(sub.startDate),
        cleanVal(sub.nextBillingDate), 
        cleanVal(sub.status), 
        cleanVal(sub.lastGeneratedInvoiceId || ''),
        cleanVal(sub.startDate || ''), 
        cleanVal(sub.startDate || '')
      ]);
    });
    report.push('✅ Subscriptions: ' + data.recurring.length + ' records imported');
  }

  report.push('');
  report.push('==========================');
  report.push('MIGRATION COMPLETE!');
  report.push('Run postMigrationVerification() next.');

  var finalReport = report.join('\n');
  Logger.log(finalReport);
  safeAlert(finalReport);
}

// ─────────────────────────────────────────────────────────────
// STEP 3: Post-Migration Check
// ─────────────────────────────────────────────────────────────
function postMigrationVerification() {
  var ss = getSpreadsheet();
  var report = [];
  report.push('POST-MIGRATION VERIFICATION');
  report.push('===========================');

  var checks = [
    { sheet: 'Invoices', expected: 32, label: 'Invoices (Sacred 32)' },
    { sheet: 'Invoice_Items', expected: 1, label: 'Invoice Line Items' },
    { sheet: 'Customers', expected: 1, label: 'Customers' },
    { sheet: 'Pets', expected: 1, label: 'Pets' },
    { sheet: 'Payments', expected: 0, label: 'Payments' }
  ];

  var allPass = true;

  checks.forEach(function(check) {
    var sheet = ss.getSheetByName(check.sheet);
    if (!sheet) {
      report.push('  [FAIL] ' + check.sheet + ' — SHEET NOT FOUND');
      allPass = false;
      return;
    }
    var rowCount = Math.max(0, sheet.getLastRow() - 1);

    if (check.sheet === 'Invoices') {
      if (rowCount === 32) {
        report.push('  [PASS] ' + check.label + ': ' + rowCount + ' / 32 ✅');
      } else {
        report.push('  [FAIL] ' + check.label + ': ' + rowCount + ' rows (expected 32!) ❌');
        allPass = false;
      }
    } else {
      if (rowCount >= check.expected) {
        report.push('  [PASS] ' + check.label + ': ' + rowCount + ' rows');
      } else {
        report.push('  [WARN] ' + check.label + ': ' + rowCount + ' rows (expected >= ' + check.expected + ')');
      }
    }
  });

  // Verify no duplicate InvoiceNumbers
  var invSheet = ss.getSheetByName('Invoices');
  if (invSheet && invSheet.getLastRow() > 1) {
    var invNums = invSheet.getRange(2, 2, invSheet.getLastRow() - 1, 1).getValues().flat().map(String);
    var uniq = {};
    var dups = [];
    invNums.forEach(function(num) {
      if (num && uniq[num]) dups.push(num);
      uniq[num] = true;
    });
    if (dups.length > 0) {
      report.push('  [FAIL] DUPLICATE InvoiceNumbers found: ' + dups.join(', '));
      allPass = false;
    } else {
      report.push('  [PASS] No duplicate InvoiceNumbers found ✅');
    }
  }

  report.push('');
  report.push('===========================');
  report.push(allPass
    ? '✅ ALL CHECKS PASSED — Phase 12B Complete!'
    : '❌ SOME CHECKS FAILED — Review above.');
  report.push('===========================');

  var finalReport = report.join('\n');
  Logger.log(finalReport);
  safeAlert(finalReport);
}
