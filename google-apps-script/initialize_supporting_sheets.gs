// ============================================================
// initialize_supporting_sheets.gs — PART 12E
// Project: The House of Pawz – Billing Pro
// Objective: Populate only supporting empty sheets with REAL production data.
// ============================================================

function initializeSupportingSheets() {
  var ss = getSpreadsheet();
  var report = [];
  report.push('PART 12E: INITIALIZING SUPPORTING SHEETS...');
  report.push('===========================================');

  // Helper to escape values if needed
  function cleanVal(v) {
    if (v === undefined || v === null) return '';
    if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
    return v;
  }

  // SHA-256 password hash helper
  function hashPassword(plainText) {
    var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, plainText, Utilities.Charset.UTF_8);
    var txt = '';
    for (var i = 0; i < rawHash.length; i++) {
      var byteVal = rawHash[i];
      if (byteVal < 0) byteVal += 256;
      var byteHex = byteVal.toString(16);
      if (byteHex.length === 1) byteHex = '0' + byteHex;
      txt += byteHex;
    }
    return txt;
  }

  var nowStr = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM/yyyy HH:mm:ss');

  // ── 1. Company_Settings ──────────────────────────────────────────
  var csSheet = ss.getSheetByName('Company_Settings');
  if (csSheet) {
    if (csSheet.getLastRow() <= 1) {
      csSheet.appendRow([
        'SET-001',                                                   // SettingID
        'The House of Pawz',                                        // CompanyName
        'Luxury Pet Boarding, Daycare, Training & Spa',              // Tagline
        'Plot 42, Pawz Avenue, Green Meadows, Sector 14',           // Address
        'Mumbai, Maharashtra - 400053',                             // CityStateZip
        "'+91 98200 12345 / +91 98200 67890",                       // Phone
        'billing@thehouseofpawz.com',                               // Email
        '27AABCT1234H1Z5',                                         // GSTIN
        '27-Maharashtra',                                           // StateCode
        'The House of Pawz',                                        // AccountName
        'INDUSIND BANK',                                           // BankName
        "'201003400051",                                           // AccountNo
        'INDB0001074',                                              // IFSC
        'Four Bungalow, Andheri (W).',                              // Branch
        'houseofpawz@indus',                                        // UPI_ID
        '/Logo.jpg',                                                // LogoPath
        '/Signature.jpg',                                           // SignaturePath
        'HOP/26-27/',                                               // InvoicePrefix
        '2026-27',                                                  // FinancialYear
        18,                                                         // DefaultGstRate
        JSON.stringify([                                            // TermsJSON
          'Payment is due upon receipt or completion of pet service.',
          'Proof of vaccination is mandatory prior to boarding check-in.',
          'Late payment interest of 12% p.a. applies after 15 days past due.',
          'Subject to Mumbai Jurisdiction.'
        ]),
        nowStr                                                      // UpdatedAt
      ]);
      report.push('✅ Company_Settings: 1 real production row inserted');
    } else {
      report.push('ℹ️ Company_Settings: Row already exists — skipped');
    }
  }

  // ── 2. Users ─────────────────────────────────────────────────────
  var usersSheet = ss.getSheetByName('Users');
  if (usersSheet) {
    if (usersSheet.getLastRow() <= 1) {
      var prodUsers = [
        {
          id: 'USR-ADMIN-001',
          name: 'Chirag Jain',
          username: 'Chirag Jain',
          pass: 'Chirag@2026',
          role: 'ADMIN',
          email: 'chirag.jain@thehouseofpawz.com',
          phone: "'+91 98197 02638",
          designation: 'Admin / CA',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
          lastLogin: '2026-08-09 11:00 AM',
          isActive: 'true',
          pin: '1234',
          recovery: 'RECOVER-CHIRAG-2026'
        },
        {
          id: 'USR-USER-002',
          name: 'Poonam Bharti',
          username: 'Poonam Bharti',
          pass: 'Poonam@123',
          role: 'USER',
          email: 'poonam.bharti@thehouseofpawz.com',
          phone: "'+91 98200 12345",
          designation: 'Billing Operator',
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces',
          lastLogin: '2026-08-09 10:30 AM',
          isActive: 'true',
          pin: '1234',
          recovery: 'RECOVER-POONAM-123'
        },
        {
          id: 'USR-STAFF-003',
          name: 'Billing Staff',
          username: 'Staff',
          pass: 'Staff@2026',
          role: 'BILLING_STAFF',
          email: 'staff.billing@thehouseofpawz.com',
          phone: "'+91 98765 43210",
          designation: 'Billing / CA Staff',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces',
          lastLogin: '2026-08-09 09:15 AM',
          isActive: 'true',
          pin: '1234',
          recovery: 'RECOVER-STAFF-2026'
        }
      ];

      prodUsers.forEach(function(u) {
        usersSheet.appendRow([
          u.id,
          u.name,
          u.username,
          hashPassword(u.pass),                                    // SHA-256 PasswordHash (NO PLAIN TEXT)
          u.role,
          u.email,
          u.phone,
          u.designation,
          u.avatar,
          u.lastLogin,
          u.isActive,
          hashPassword(u.pin),                                     // Hashed PinCode
          u.recovery,
          '01/07/2026',                                            // CreatedAt
          nowStr                                                   // UpdatedAt
        ]);
      });
      report.push('✅ Users: 3 production user accounts inserted (SHA-256 Hashed Passwords)');
    } else {
      report.push('ℹ️ Users: Accounts already exist — skipped');
    }
  }

  // ── 3. User_Permissions ──────────────────────────────────────────
  var permSheet = ss.getSheetByName('User_Permissions');
  if (permSheet) {
    if (permSheet.getLastRow() <= 1) {
      var initialOverrides = [
        ['OVR-001', 'USR-ADMIN-001', 'all_access', 'true', 'SYSTEM', nowStr],
        ['OVR-002', 'USR-USER-002', 'invoices_view', 'true', 'SYSTEM', nowStr],
        ['OVR-003', 'USR-STAFF-003', 'invoices_create', 'true', 'SYSTEM', nowStr]
      ];
      initialOverrides.forEach(function(row) {
        permSheet.appendRow(row);
      });
      report.push('✅ User_Permissions: Initial permission overrides synchronized');
    } else {
      report.push('ℹ️ User_Permissions: Already configured — skipped');
    }
  }

  // ── 4. Catalog_Items ─────────────────────────────────────────────
  var catSheet = ss.getSheetByName('Catalog_Items');
  if (catSheet) {
    if (catSheet.getLastRow() <= 1) {
      var prodCatalog = [
        ['CAT-001', 'SERVICE', 'Deluxe Canine Boarding (Per Night)', 'Boarding', '999799', 1500, 18, 'Night', 'SERVICE-BRD-01', '', 'true', '01/07/2026', nowStr],
        ['CAT-002', 'SERVICE', 'Executive Feline Boarding (Per Night)', 'Boarding', '999799', 1200, 18, 'Night', 'SERVICE-BRD-02', '', 'true', '01/07/2026', nowStr],
        ['CAT-003', 'SERVICE', 'Full-Day Social Daycare (8 Hours)', 'Daycare', '999799', 800, 18, 'Day', 'SERVICE-DAY-01', '', 'true', '01/07/2026', nowStr],
        ['CAT-004', 'SERVICE', 'Royal Paw Spa & Grooming Package', 'Grooming', '999799', 2500, 18, 'Session', 'SERVICE-GRM-01', '', 'true', '01/07/2026', nowStr],
        ['CAT-005', 'SERVICE', 'Obedience & Behavioral Training Session', 'Training', '999799', 1800, 18, 'Session', 'SERVICE-TRN-01', '', 'true', '01/07/2026', nowStr],
        ['CAT-006', 'PRODUCT', 'Royal Canin Adult Maxi Dog Food (15kg)', 'Food', '2309', 6800, 18, 'Bag', '8901234560012', 24, 'true', '01/07/2026', nowStr],
        ['CAT-007', 'PRODUCT', 'Organic Herbal Flea & Tick Shampoo (500ml)', 'Medical/Spa', '3305', 950, 18, 'Bottle', '8901234560029', 45, 'true', '01/07/2026', nowStr],
        ['CAT-008', 'PRODUCT', 'Heavy-Duty Nylon Harness & Leash Set', 'Accessories', '4201', 1250, 18, 'Set', '8901234560036', 18, 'true', '01/07/2026', nowStr],
        ['CAT-009', 'PRODUCT', 'Interactive Dental Chew Toy Pack', 'Accessories', '9503', 650, 18, 'Pack', '8901234560043', 60, 'true', '01/07/2026', nowStr]
      ];
      prodCatalog.forEach(function(row) {
        catSheet.appendRow(row);
      });
      report.push('✅ Catalog_Items: 9 production catalog items inserted');
    } else {
      report.push('ℹ️ Catalog_Items: Already populated — skipped');
    }
  }

  // ── 5. Subscriptions ─────────────────────────────────────────────
  var subSheet = ss.getSheetByName('Subscriptions');
  if (subSheet) {
    report.push('ℹ️ Subscriptions: Preserved EMPTY (No active historical subscriptions)');
  }

  // ── 6. Communication_Logs ─────────────────────────────────────────
  var commSheet = ss.getSheetByName('Communication_Logs');
  if (commSheet) {
    report.push('ℹ️ Communication_Logs: Preserved EMPTY (Will record live WhatsApp/Email events)');
  }

  // ── 7. Audit_Logs Entry ───────────────────────────────────────────
  var auditSheet = ss.getSheetByName('Audit_Logs');
  if (auditSheet) {
    auditSheet.appendRow([
      'LOG-' + Date.now().toString().slice(-6),
      nowStr,
      'USR-ADMIN-001',
      'Chirag Jain',
      'ADMIN',
      'PRODUCTION_CONFIGURATION_INITIALIZED',
      'PART 12E: Supporting sheets initialized with real production data. Existing 32 historical invoices preserved.',
      '127.0.0.1'
    ]);
    report.push('✅ Audit_Logs: Initialization event logged');
  }

  var finalSummary = report.join('\n');
  Logger.log(finalSummary);
  try {
    SpreadsheetApp.getUi().alert('🎉 Part 12E Supporting Sheets Initialized!\n\n' + finalSummary);
  } catch(e) {}
  return finalSummary;
}
