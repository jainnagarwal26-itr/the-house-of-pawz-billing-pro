// ============================================================
// migrationConsoleScript.js
// Phase 12B — Extract localStorage data for Google Sheets migration
// ============================================================
// HOW TO USE:
//   1. Browser mein http://localhost:3000 open karo (React app)
//   2. Login karo (Chirag Jain)
//   3. F12 → Console tab
//   4. Neeche ka POORA script copy karo aur Console mein paste karo
//   5. Enter dabao
//   6. Output JSON copy karo
//   7. migrate_to_sheets.gs mein MIGRATION_JSON_PAYLOAD mein paste karo
// ============================================================

(function extractTHOPData() {
  console.log('🚀 THOP Phase 12B — Data Extraction Started...');

  // LocalStorage Keys (from storage.ts)
  var KEYS = {
    INVOICES:   'hop_invoices_v2',
    CUSTOMERS:  'hop_customers_v2',
    PETS:       'hop_pets_v2',
    PAYMENTS:   'hop_payments_v2',
    RECURRING:  'hop_recurring_v2',
    SETTINGS:   'hop_settings_v2',
    USERS:      'hop_users_v2',
    AUDIT:      'hop_audit_v2'
  };

  function safeLoad(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch(e) {
      console.error('ERROR loading key: ' + key, e);
      return null;
    }
  }

  var invoices  = safeLoad(KEYS.INVOICES)  || [];
  var customers = safeLoad(KEYS.CUSTOMERS) || [];
  var pets      = safeLoad(KEYS.PETS)      || [];
  var payments  = safeLoad(KEYS.PAYMENTS)  || [];
  var recurring = safeLoad(KEYS.RECURRING) || [];
  var settings  = safeLoad(KEYS.SETTINGS);
  var users     = safeLoad(KEYS.USERS)     || [];

  // ── VALIDATION ──────────────────────────────────────────────
  console.log('');
  console.log('📊 DATA SUMMARY:');
  console.log('  Invoices:   ' + invoices.length + (invoices.length === 32 ? ' ✅ (Expected 32)' : ' ⚠️ (Expected 32!)'));
  console.log('  Customers:  ' + customers.length);
  console.log('  Pets:       ' + pets.length);
  console.log('  Payments:   ' + payments.length);
  console.log('  Recurring:  ' + recurring.length);
  console.log('  Users:      ' + users.length);

  if (invoices.length === 0) {
    console.error('❌ ABORT: No invoices found in localStorage!');
    console.error('   Make sure you are logged into the React app at http://localhost:3000');
    return;
  }

  // ── INVOICE VALIDATION ──────────────────────────────────────
  console.log('');
  console.log('🔍 INVOICE LIST (verify these are all 32 real invoices):');
  invoices.forEach(function(inv, i) {
    console.log(
      '  [' + String(i+1).padStart(2,'0') + '] ' +
      inv.invoiceNumber + ' | ' +
      inv.invoiceDate + ' | ' +
      inv.customerName + ' | ₹' +
      (inv.grandTotal || 0).toFixed(2) + ' | ' +
      inv.paymentStatus +
      (inv.isCancelled ? ' [CANCELLED]' : '')
    );
  });

  // ── FINANCIAL SUMMARY ───────────────────────────────────────
  var totalRevenue = invoices
    .filter(function(i) { return !i.isCancelled; })
    .reduce(function(sum, i) { return sum + (i.grandTotal || 0); }, 0);
  var totalGST = invoices
    .filter(function(i) { return !i.isCancelled; })
    .reduce(function(sum, i) { return sum + (i.totalGst || 0); }, 0);

  console.log('');
  console.log('💰 FINANCIAL TOTALS:');
  console.log('  Total Revenue (incl GST): ₹' + totalRevenue.toFixed(2));
  console.log('  Total GST Collected:      ₹' + totalGST.toFixed(2));

  // ── BUILD MIGRATION PAYLOAD ─────────────────────────────────
  var payload = {
    extractedAt:    new Date().toISOString(),
    extractedFrom:  'localStorage (React App)',
    invoiceCount:   invoices.length,
    customerCount:  customers.length,
    petCount:       pets.length,
    paymentCount:   payments.length,
    invoices:       invoices,
    customers:      customers,
    pets:           pets,
    payments:       payments,
    recurring:      recurring
  };

  // ── OUTPUT ──────────────────────────────────────────────────
  var jsonString = JSON.stringify(payload, null, 2);

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ EXTRACTION COMPLETE! Copy the JSON below:');
  console.log('='.repeat(60));
  console.log(jsonString);
  console.log('='.repeat(60));
  console.log('');
  console.log('📋 NEXT STEPS:');
  console.log('  1. Upar ka JSON text select karo (Ctrl+A select)');
  console.log('  2. Copy karo (Ctrl+C)');
  console.log('  3. Apps Script mein migrate_to_sheets.gs open karo');
  console.log('  4. MIGRATION_JSON_PAYLOAD = null; ki jagah paste karo');
  console.log('     Example:');
  console.log('     var MIGRATION_JSON_PAYLOAD = { ... your JSON here ... };');
  console.log('  5. importHistoricalDataFromJSON() function run karo');

  return payload;
})();
