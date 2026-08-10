# 📋 THOP Google Sheets Backend — Setup Guide
**Phase 12A: Production Database Foundation**  
**Project:** The House of Pawz – Billing Pro

---

## ⚠️ BEFORE YOU START

This guide creates the **Google Sheets + Apps Script backend foundation only**.  
It does NOT:
- ❌ Connect the React frontend
- ❌ Import the 32 historical invoices
- ❌ Modify existing localStorage or application data

---

## STEP 1: Create the Google Spreadsheet

1. Go to **[sheets.google.com](https://sheets.google.com)**
2. Click **+ Blank spreadsheet**
3. Rename it exactly: `THOP_PRODUCTION_DATABASE`
4. **Copy the Spreadsheet ID** from the browser URL bar:
   ```
   https://docs.google.com/spreadsheets/d/1u2tWurjX7PoS8-vf_qHSrG8bmmYErs01ya3FbDRvYKo/  ← COPY THIS PART →  /edit
   ```
5. Keep this tab open.

---

## STEP 2: Open the Apps Script Editor

1. In your Google Sheet, go to: **Extensions → Apps Script**
2. A new Apps Script project opens.
3. Rename the project to: `THOP_Backend_API`

---

## STEP 3: Create Script Files

In the Apps Script editor, **delete all content** from the default `Code.gs`.

Then create these files using the **+ (Add a file)** button in the left sidebar.  
**Exact file order matters for load priority:**

| Order | File Name | Source File |
| :---: | :--- | :--- |
| 1 | `Config.gs` | `google-apps-script/Config.gs` |
| 2 | `Utils.gs` | `google-apps-script/Utils.gs` |
| 3 | `Locking.gs` | `google-apps-script/Locking.gs` |
| 4 | `AuditLogs.gs` | `google-apps-script/AuditLogs.gs` |
| 5 | `Auth.gs` | `google-apps-script/Auth.gs` |
| 6 | `Permissions.gs` | `google-apps-script/Permissions.gs` |
| 7 | `Users.gs` | `google-apps-script/Users.gs` |
| 8 | `Customers.gs` | `google-apps-script/Customers.gs` |
| 9 | `Pets.gs` | `google-apps-script/Pets.gs` |
| 10 | `Invoices.gs` | `google-apps-script/Invoices.gs` |
| 11 | `InvoiceItems.gs` | `google-apps-script/InvoiceItems.gs` |
| 12 | `Payments.gs` | `google-apps-script/Payments.gs` |
| 13 | `Subscriptions.gs` | `google-apps-script/Subscriptions.gs` |
| 14 | `Communications.gs` | `google-apps-script/Communications.gs` |
| 15 | `Dashboard.gs` | `google-apps-script/Dashboard.gs` |
| 16 | `GSTReports.gs` | `google-apps-script/GSTReports.gs` |
| 17 | `Backup.gs` | `google-apps-script/Backup.gs` |
| 18 | `Router.gs` | `google-apps-script/Router.gs` |

Copy the contents of each file from the `google-apps-script/` folder in the project.

---

## STEP 4: Set Your Spreadsheet ID

Open `Config.gs` in the Apps Script editor.  
Find this line:

```javascript
SPREADSHEET_ID: 'PASTE_YOUR_SPREADSHEET_ID_HERE',
```

Replace it with your actual Spreadsheet ID:

```javascript
SPREADSHEET_ID: '1u2tWurjX7PoS8-vf_qHSrG8bmmYErs01ya3FbDRvYKo', // ← your actual ID
```

Save (Ctrl + S).

---

## STEP 5: Run the Database Setup Function

1. In the Apps Script editor, select function: **`setupDatabaseSheets`** from the dropdown
2. Click **▶ Run**
3. Grant permissions when prompted (click **Review permissions → Advanced → Allow**)
4. Check the **Execution log** — you should see:
   ```
   SETUP: Creating THOP_PRODUCTION_DATABASE structure...
     [CREATED] Company_Settings
     [CREATED] Users
     [CREATED] User_Permissions
     [CREATED] Customers
     [CREATED] Pets
     [CREATED] Catalog_Items
     [CREATED] Invoices
     [CREATED] Invoice_Items
     [CREATED] Payments
     [CREATED] Subscriptions
     [CREATED] Communication_Logs
     [CREATED] Audit_Logs
     [REMOVED] Default Sheet1
   ```

5. Go back to your Google Sheet — you should now see **12 tabs** with dark-navy header rows.

---

## STEP 6: Run the Database Health Check

1. In the Apps Script editor, select function: **`runDatabaseHealthCheck`**
2. Click **▶ Run**
3. Expected output in execution log:
   ```
   ====================================================
     DATABASE HEALTH CHECK — THOP_PRODUCTION_DATABASE
   ====================================================

     [PASS] Company_Settings     | Columns: 22 | Rows: 0
     [PASS] Users                | Columns: 15 | Rows: 0
     [PASS] User_Permissions     | Columns: 6  | Rows: 0
     [PASS] Customers            | Columns: 12 | Rows: 0
     [PASS] Pets                 | Columns: 19 | Rows: 0
     [PASS] Catalog_Items        | Columns: 13 | Rows: 0
     [PASS] Invoices             | Columns: 34 | Rows: 0
     [PASS] Invoice_Items        | Columns: 19 | Rows: 0
     [PASS] Payments             | Columns: 13 | Rows: 0
     [PASS] Subscriptions        | Columns: 14 | Rows: 0
     [PASS] Communication_Logs   | Columns: 11 | Rows: 0
     [PASS] Audit_Logs           | Columns: 8  | Rows: 0

     Overall Status: ✅ PASS — All 12 sheets verified.
   ====================================================
   ```

---

## STEP 7: Deploy as Web App (API)

1. In Apps Script editor, click **Deploy → New deployment**
2. Click ⚙️ gear icon → **Web app**
3. Configure:
   - **Description:** `THOP API v1.0`
   - **Execute as:** `Me (your Google Account)`
   - **Who has access:** `Anyone` *(API tokens handle authorization)*
4. Click **Deploy**
5. **Copy the Web App URL** — it will look like:
   ```
   https://script.google.com/macros/s/XXXXXXXXX/exec
   ```
6. Save this URL — it will be the `API_ENDPOINT` in the React frontend (Phase 12C).

---

## STEP 8: Test the API with a Ping

Open your browser and navigate to:
```
https://script.google.com/macros/s/1u2tWurjX7PoS8-vf_qHSrG8bmmYErs01ya3FbDRvYKo/exec?action=ping
```

Expected JSON response:
```json
{
  "success": true,
  "data": {
    "status": "THOP API Online",
    "version": "1.0.0"
  },
  "message": "OK"
}
```

If you see this response, **the backend is live and working!**

---

## STEP 9: Spreadsheet Security

1. Open your Google Spreadsheet
2. Click **Share** (top-right)
3. Set access to **Restricted** (only specific people)
4. Add only yourself and trusted admins
5. **Do NOT share the spreadsheet link** with staff — they access it through the app API only

---

## STEP 10: Confirm Existing Application is Unchanged

Open the React application at **http://localhost:3000/**

Verify:
- ✅ Application loads normally
- ✅ Login works (Chirag Jain, Poonam Bharti, Staff)
- ✅ All 32 invoices are intact in GST Invoices tab
- ✅ localStorage data is untouched
- ✅ No demo data added

---

## 📊 Phase 12A Summary: What Was Created

### Google Spreadsheet
- **Name:** `THOP_PRODUCTION_DATABASE`
- **Sheets:** 12 (Company_Settings, Users, User_Permissions, Customers, Pets, Catalog_Items, Invoices, Invoice_Items, Payments, Subscriptions, Communication_Logs, Audit_Logs)

### Apps Script Files (18 files)
- `Config.gs` — Configuration constants
- `Utils.gs` — Shared helper functions
- `Locking.gs` — LockService concurrency
- `AuditLogs.gs` — Security audit trail
- `Auth.gs` — JWT auth + password hashing
- `Permissions.gs` — Server-side RBAC
- `Users.gs` — User CRUD API
- `Customers.gs` — Customer CRUD API
- `Pets.gs` — Pet CRUD API
- `Invoices.gs` — Invoice creation + LockService
- `InvoiceItems.gs` — Line items API
- `Payments.gs` — Payment recording API
- `Subscriptions.gs` — Subscriptions API
- `Communications.gs` — Comm log API
- `Dashboard.gs` — KPI summary API
- `GSTReports.gs` — GSTR-1 B2B/B2C API
- `Backup.gs` — Health check + setup
- `Router.gs` — doGet/doPost API router

### Security
- ✅ Passwords stored as SHA-256 hash (never plain text)
- ✅ Passwords never returned in API responses
- ✅ Passwords never written to Audit_Logs
- ✅ JWT-style HMAC session tokens
- ✅ Server-side RBAC permission enforcement
- ✅ LockService for invoice numbering and payments
- ✅ Spreadsheet set to private access

---

## 🚫 PHASE 12A STOP — DO NOT PROCEED FURTHER

After completing the steps above, **STOP**.

**Next phase (requires separate authorization):**

**PART 12B — 32 ORIGINAL PRODUCTION INVOICES VALIDATION & GOOGLE SHEETS MIGRATION**

No production data should be migrated without explicit admin approval.
