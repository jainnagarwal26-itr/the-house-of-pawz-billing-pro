# THE HOUSE OF PAWZ – BILLING PRO
## Enterprise Excel Backend Database Blueprint & Runtime Engine Specification

This blueprint documents the production-grade workbook architecture, master schema definitions, and the Database Access Layer (DAL) runtime engine design for **The House of Pawz – Billing Pro** (using `THOP_BILLING_DATABASE.xlsx` as the primary relational database storage).

---

## Part 11A – Workbook Blueprint & Database Foundation

### 1. Workbook Core Specifications
* **Workbook Name:** `THOP_BILLING_DATABASE.xlsx`
* **Workbook Version:** `Version 1.0`
* **Database Type:** Relational Excel Database (behaved as a structured relational database with keys)
* **Purpose:** Primary Backend Database
* **Storage:** Local / Offline-First / Cloud-ready (fully aligned with PostgreSQL/Supabase schema patterns)

### 2. Grouped Worksheet Architecture (42 Sheets)
To maintain performance and structure, sheets are categorized into 10 logical namespaces:

| Group | Sheet Name (Technical ID) | Business Purpose / Entities Stored |
|---|---|---|
| **1. Master Data** | `MstCompany`, `MstUsers`, `MstCustomers`, `MstPets`, `MstServices`, `MstPackages`, `MstRooms`, `MstPaymentModes`, `MstGSTRates`, `MstBanks`, `MstUPIAccounts`, `MstLookupValues`, `MstBusinessRules`, `MstNotificationTemplates`, `MstDocumentTypes`, `MstPhotoCategories`, `MstExpenseCategories`, `MstPetBreeds`, `MstCities`, `MstStates` | Company profile, user accounts, clients, pet profiles, inventory, tax rules, reference data |
| **2. Transaction Data** | `TxnBoarding`, `TxnDaycare`, `TxnInvoices`, `TxnInvoiceItems`, `TxnPayments`, `TxnReceipts`, `TxnCreditNotes`, `TxnRefunds`, `TxnAdjustments` | Core operations check-ins, billings, individual line items, cashflows, financial adjustments |
| **3. Accounting** | `AccCustomerLedger`, `AccCashBook`, `AccBankBook`, `AccJournal`, `AccOutstandingLedger`, `AccAdvanceLedger` | Bookkeeping ledger entries, cash on hand logs, bank account reconciliations, advance balances |
| **4. GST** | `GstRegister`, `GstHsnSacRegister`, `GstMonthlySummary`, `GstQuarterlySummary`, `GstAnnualSummary` | HSN/SAC records, transactional CGST/SGST/IGST breakdown, GSTR-1 preparation summaries |
| **5. Reports** | `RptSalesRegister`, `RptReceiptRegister`, `RptOutstandingReport`, `RptRevenueReport`, `RptCustomerStatement`, `RptPetBoardingReport` | Pre-computed reporting sheets, aging summaries, customer-wise consolidated billing cards |
| **6. Dashboard** | `DshData`, `DshChartsData`, `DshMonthlyStats`, `DshKpis` | Aggregated data points for low-latency homepage chart rendering |
| **7. Settings** | `SetCompany`, `SetInvoice`, `SetFinancialYear`, `SetQr`, `SetWhatsApp`, `SetEmail`, `SetTheme`, `SetBackup` | Dynamic system operational constraints, prefixes, message triggers, automation keys |
| **8. System** | `SysActivityLog`, `SysAuditLog`, `SysImportLog`, `SysNotificationLog`, `SysErrorLog`, `SysVersionHistory` | Tracking operations, changes, raw system error dumps, data history |
| **9. Import** | `ImpStaging`, `ImpValidation`, `ImpHistory` | Sandboxed import staging space, fuzzy match cache, structural migration audits |
| **10. Backup** | `BkpHistory`, `BstRestoreHistory` | Snapshots log, backup files list with hashes and restore checkpoints |

### 3. Structural Integrity Rules
1. **Primary Keys (PK):** Every record in every sheet MUST have a unique alphanumeric primary key (e.g., `CUST-1001`, `PET-2001`, `INV-3001`). No blank spaces or duplicates are permitted.
2. **Foreign Keys (FK):** Relationships across sheets are linked strictly via ID columns (e.g., `TxnBoarding.PetID` points to `MstPets.PetID`). Direct name lookups are prohibited to prevent failures during renames.
3. **Audit Trails:** All rows must end with the following standard structural audit columns:
   * `CreatedDate` (DateTime)
   * `ModifiedDate` (DateTime)
   * `CreatedBy` (Text - User ID)
   * `ModifiedBy` (Text - User ID)
   * `Status` (Text - e.g., 'ACTIVE', 'INACTIVE', 'ARCHIVED')
   * `Remarks` (Long Text)

---

## Part 11B – Master Tables Design (Schemas of all 20 Master Sheets)

Each table defines the precise columns, data types, validation criteria, and relationships:

### 1. `MstCompany` (Company Profile Master)
* **Purpose:** Stores the single company profile details. (Exactly 1 Row of active configuration)
* **Schema:**
  * `CompanyID` (Text, 20, PK): Static ID, default `COMP-001`
  * `CompanyName` (Text, 100, Required): e.g., 'The House of Pawz'
  * `Tagline` (Text, 150): Brand slogan
  * `GSTIN` (Text, 15, Required): Indian GST format (Regex: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`)
  * `PAN` (Text, 10, Required): Permanent Account Number (Regex: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`)
  * `Address` (Text, 250, Required): Head office physical address
  * `Phone` (Text, 50, Required): Contact numbers
  * `Email` (Text, 100, Required): Business official email
  * `Website` (Text, 100): URL
  * `LogoPath` (Text, 250): Local or Cloud storage image path
  * `DigitalSignaturePath` (Text, 250): Signed token path for invoice auto-attachment
  * `DefaultCurrency` (Text, 3): Default `INR` (₹)
  * `InvoicePrefix` (Text, 20, Required): prefix for invoices (e.g., `HOP/26-27/`)
  * `FinancialYear` (Text, 10, Required): Current FY `2026-27`
  * `QrPath` (Text, 250): Bank dynamic UPI QR graphic resource path
  * `BankDetails` (Text, 200): Plaintext backup bank info
  * `TermsAndConditions` (Long Text): Invoicing SLA terms
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 2. `MstUsers` (User/Staff Master)
* **Purpose:** System users, security credentials, and role-based permissions.
* **Schema:**
  * `UserID` (Text, 20, PK): Unique staff code, e.g., `USR-001`
  * `EmployeeCode` (Text, 20, Unique): Alphanumeric code
  * `UserName` (Text, 100, Required): Staff full name
  * `Designation` (Text, 50): e.g., 'Head Accountant', 'Senior Caretaker'
  * `LoginUsername` (Text, 30, Required, Unique): Normalized lowercase string
  * `PasswordHash` (Text, 256, Required): SHA-256 secure hash
  * `Role` (Text, 20, Required): Role validator list (`ADMIN`, `BILLING_USER`, `VIEWER`)
  * `PhotoPath` (Text, 250): Avatar file path
  * `Mobile` (Text, 15, Required): 10-digit number
  * `Email` (Text, 100): Email address
  * `Permissions` (Text, 500): JSON string representing UI toggles
  * `LastLogin` (DateTime): Record of last access timestamp
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 3. `MstCustomers` (Customer Profile Master)
* **Purpose:** Stores client details, billing rules, and metadata.
* **Schema:**
  * `CustomerID` (Text, 20, PK): Client identification ID, e.g., `CUST-1001`
  * `CustomerCode` (Text, 20, Unique): Search key
  * `CustomerName` (Text, 100, Required): Full client name
  * `Mobile` (Text, 15, Required): Normalized primary phone (no spaces, e.g., `9820012345`)
  * `WhatsApp` (Text, 15): Target number for invoice broadcasts
  * `Email` (Text, 100): Communication email
  * `Address` (Text, 250, Required): Billing physical address
  * `CityID` (Text, 20, FK -> `MstCities.CityID`): City linkage
  * `StateID` (Text, 20, FK -> `MstStates.StateID`): POS calculation key
  * `Pincode` (Text, 6, Required): 6-digit postal code
  * `GSTIN` (Text, 15): Client GST number if B2B
  * `PAN` (Text, 10): Client PAN if transaction exceeding limits
  * `CustomerType` (Text, 15, Required): Choice of `REGULAR`, `VIP`, `CORPORATE`
  * `PreferredCommunication` (Text, 10): Choice of `WHATSAPP`, `EMAIL`, `SMS`
  * `Birthday` (Date): Client DOB for marketing campaigns
  * `Anniversary` (Date): Anniversary date
  * `ReferralSource` (Text, 50): How they heard about House of Pawz
  * `LoyaltyPoints` (Number, Default `0`): Running balance of loyalty tokens
  * `IsBlacklisted` (Boolean, Default `FALSE`): Prevents active bookings
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 4. `MstPets` (Pet Registry Master)
* **Purpose:** Stores pet details connected to customers.
* **Schema:**
  * `PetID` (Text, 20, PK): Unique pet code, e.g., `PET-2001`
  * `CustomerID` (Text, 20, FK -> `MstCustomers.CustomerID`, Required): Owner reference
  * `PetName` (Text, 50, Required): Pet name
  * `Species` (Text, 20, Required): Linked validation (`DOG`, `CAT`, `BIRD`, `OTHER`)
  * `BreedID` (Text, 20, FK -> `MstPetBreeds.BreedID`): Detailed breed name
  * `Gender` (Text, 10): Linked lookup validation (`MALE`, `FEMALE`, `NEUTERED`, `SPAYED`)
  * `DOB` (Date): Estimated or actual date of birth
  * `Age` (Number, Decimal): Derived or recorded age
  * `Weight` (Number, Decimal): Pet weight in kg
  * `Colour` (Text, 30): Description of coat
  * `MicrochipNumber` (Text, 50): Global identification RFID chip
  * `VaccinationStatus` (Text, 15, Required): Linked validation (`FULLY_VACCINATED`, `PARTIAL`, `EXPIRED`)
  * `VaccinationExpiry` (Date): Expiry date for safety checks
  * `Veterinarian` (Text, 100): Doctor contact name
  * `VetMobile` (Text, 15): Emergency veterinarian contact number
  * `Behaviour` (Text, 100): e.g., 'Aggressive towards large dogs'
  * `FriendlyLevel` (Number, 1-5): Behavioral index rating
  * `FoodPreference` (Text, 150): Dietary notes (brand, frequency)
  * `MedicineNotes` (Text, 200): Ongoing medicines
  * `SpecialInstructions` (Long Text): Kennel handling instructions
  * `PhotoPath` (Text, 250): Pet photo resource path
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 5. `MstServices` (Operational Catalog Services Master)
* **Purpose:** Catalog of individual services offered.
* **Schema:**
  * `ServiceID` (Text, 20, PK): Service identifier, e.g., `SRV-4001`
  * `ServiceName` (Text, 100, Required): Service title (e.g., 'Canine Spa Bath')
  * `HSNSAC` (Text, 8, Required): Tax HSN or Service Accounting Code (SAC), defaults to `9986`
  * `DefaultRate` (Currency, Required): Standard cost in INR
  * `GSTRate` (Percentage, Required): Standard tax bracket (e.g., `0.18`)
  * `IsActive` (Boolean, Default `TRUE`): If hidden in active selection
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 6. `MstPackages` (Promo Bundle Packages Master)
* **Purpose:** Stores pre-configured multi-day or combined packages.
* **Schema:**
  * `PackageID` (Text, 20, PK): Package code, e.g., `PKG-5001`
  * `PackageName` (Text, 100, Required): Bundle title
  * `DurationDays` (Number, Required): Validity in days
  * `DefaultRate` (Currency, Required): Net rate in INR
  * `GSTRate` (Percentage, Required): Tax bracket, defaults to `0.18`
  * `Description` (Text, 250): What services are wrapped inside
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 7. `MstRooms` (Kennels & Room Inventory Master)
* **Purpose:** Grid of physical room resources for boarding tracking.
* **Schema:**
  * `RoomID` (Text, 20, PK): Unique room key, e.g., `RM-6001`
  * `RoomNumber` (Text, 20, Required, Unique): Physical door number, e.g., `A-04`
  * `RoomType` (Text, 30, Required): Lookup linked (`STANDARD_SUITE`, `DELUXE_CABIN`, `ROYAL_PENTHOUSE`)
  * `Capacity` (Number, Required): Max pets simultaneously accommodated (defaults to `1`)
  * `RoomStatus` (Text, 15, Required): Choice of (`VACANT`, `OCCUPIED`, `MAINTENANCE`, `SANITIZING`)
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 8. `MstPaymentModes` (Financial Modes Master)
* **Purpose:** Approved financial transaction formats.
* **Schema:**
  * `ModeID` (Text, 20, PK): e.g., `PAY-MODE-01`
  * `ModeName` (Text, 30, Required, Unique): `CASH`, `UPI_DYNAMIC`, `UPI_STATIC`, `CARD_SWIPE`, `BANK_TRANSFER`, `CHEQUE`
  * `IsElectronic` (Boolean): Cash vs Digital flag
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 9. `MstGSTRates` (GST Tax Brackets Master)
* **Purpose:** System tax brackets reference.
* **Schema:**
  * `GstRateID` (Text, 20, PK): e.g., `GST-RATE-01`
  * `RatePercentage` (Percentage, Required, Unique): e.g., `0.18`, `0.12`, `0.05`, `0.00`
  * `CGSTPercentage` (Percentage, Required): Half of standard rate (e.g. `0.09`)
  * `SGSTPercentage` (Percentage, Required): Half of standard rate (e.g. `0.09`)
  * `IGSTPercentage` (Percentage, Required): Equal to standard rate (e.g. `0.18`)
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 10. `MstBanks` (Bank Ledgers Master)
* **Purpose:** Firm commercial accounts for deposits reconciliation.
* **Schema:**
  * `BankID` (Text, 20, PK): Bank identifier key
  * `BankName` (Text, 100, Required): e.g., 'HDFC Bank Ltd'
  * `Branch` (Text, 100): Branch location
  * `AccountNumber` (Text, 30, Required): Bank Account digits
  * `IFSCCode` (Text, 11, Required): Branch IFSC Routing identifier
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 11. `MstUPIAccounts` (UPI Config Master)
* **Purpose:** Dynamic QR rendering nodes.
* **Schema:**
  * `UpiAccountID` (Text, 20, PK): Account reference
  * `BankID` (Text, 20, FK -> `MstBanks.BankID`): Parent bank relationship
  * `UpiID` (Text, 50, Required): e.g., `houseofpawz@hdfcbank`
  * `QrMerchantName` (Text, 50): String encoded in UPI string payload
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 12. `MstLookupValues` (System Dictionaries Master)
* **Purpose:** Centralized dropdown options dictionary (eliminates hardcoding).
* **Schema:**
  * `LookupID` (Text, 30, PK): Lookup reference
  * `LookupCategory` (Text, 50, Required): Categories like `PET_SPECIES`, `INVOICE_STATUS`, `VACC_STATUS`
  * `LookupKey` (Text, 50, Required): Internal key string
  * `LookupValue` (Text, 100, Required): User-friendly display label (e.g., 'Fully Vaccinated')
  * `SortOrder` (Number): Custom sort placement index
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 13. `MstBusinessRules` (Business Engine Parameters)
* **Purpose:** Billing rates coefficients, fine rules, and check-out hour rules.
* **Schema:**
  * `RuleID` (Text, 30, PK): Business parameter key, e.g., `BR-RULE-CHECKOUT-HOUR`
  * `RuleValue` (Text, 100, Required): Config value (e.g., `12:00` for standard check-out)
  * `Description` (Text, 250): Logical explanation
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 14. `MstNotificationTemplates` (Message Templates Master)
* **Purpose:** SMS and WhatsApp outreach text models.
* **Schema:**
  * `TemplateID` (Text, 30, PK): Template identifier
  * `Channel` (Text, 10): Communication type (`WHATSAPP`, `EMAIL`)
  * `TemplateName` (Text, 100, Required): e.g., 'INVOICE_GEN_COMM'
  * `TemplateSubject` (Text, 200): Subject line (for Email only)
  * `TemplateBody` (Long Text, Required): Dynamic template (e.g., `Dear {CustomerName}, Invoice {InvoiceNo} is generated...`)
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 15. `MstDocumentTypes` (KYC & Documents Master)
* **Purpose:** Categories for owner and pet document storage.
* **Schema:**
  * `DocTypeID` (Text, 20, PK): Document type code
  * `DocTypeName` (Text, 50, Required): e.g., 'Owner Aadhaar Card', 'Pet Vaccination Booklet'
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 16. `MstPhotoCategories` (Media Categories Master)
* **Purpose:** Catalog types for daily pet reports.
* **Schema:**
  * `PhotoCategoryID` (Text, 20, PK): Category key
  * `CategoryLabel` (Text, 50, Required): e.g., `CHECK_IN`, `MEAL_TIME`, `MEDICINE`, `PLAY_TIME`, `CHECK_OUT`
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 17. `MstExpenseCategories` (Expense Categories Master)
* **Purpose:** Bookkeeping expense catalog classification (Future Ready).
* **Schema:**
  * `ExpenseCategoryID` (Text, 20, PK): Expense head code
  * `CategoryName` (Text, 50, Required): e.g., 'Pet Consumables', 'Staff Salary', 'Clinic Supplies'
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 18. `MstPetBreeds` (Pet Breed Directory Master)
* **Purpose:** Stores comprehensive list of pet breeds.
* **Schema:**
  * `BreedID` (Text, 20, PK): Breed key
  * `Species` (Text, 10): Linked `DOG` or `CAT`
  * `BreedName` (Text, 50, Required): e.g., 'Golden Retriever', 'Persian Cat'
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 19. `MstCities` (Geographical Cities Master)
* **Purpose:** System Cities dropdown values.
* **Schema:**
  * `CityID` (Text, 20, PK): City code
  * `CityName` (Text, 50, Required): e.g., 'Mumbai', 'Pune'
  * `StateID` (Text, 20, FK -> `MstStates.StateID`): Parent State ID
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

### 20. `MstStates` (GST Supply States Master)
* **Purpose:** State names and GST Codes index for accurate Interstate tax calculation.
* **Schema:**
  * `StateID` (Text, 20, PK): e.g., `ST-MH`
  * `StateCode` (Text, 2, Required, Unique): GST State code digits (e.g., `27` for Maharashtra, `07` for Delhi)
  * `StateName` (Text, 50, Required): e.g., 'Maharashtra'
  * **Audit Fields:** `CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`

---

## Part 11B.5 – Database Access Layer (DAL) & Runtime Engine

### 1. Unified Relational Engine Architecture
Rather than directly handling static Excel sheets, the application utilizes a structured **Database Access Layer (DAL)**. The rest of the application ONLY calls the DAL interfaces to read and write records.

```
+-------------------------------------------------------------+
|                     PRESENTATION LAYER                      |
|      (CustomerMaster, InvoiceModal, PaymentManagement)      |
+------------------------------+------------------------------+
                               | (Calls Typed Services)
                               v
+-------------------------------------------------------------+
|                    BUSINESS LOGIC LAYER                     |
|           (Validations, GST Calculator, Formats)            |
+------------------------------+------------------------------+
                               | (CRUD Methods)
                               v
+-------------------------------------------------------------+
|                 DATABASE ACCESS LAYER (DAL)                 |
|   (Storage Engine Adapter - LocalStorage / Excel Sync)      |
+------------------------------+------------------------------+
                               | (File read/write & serialization)
                               v
+-------------------------------------------------------------+
|                     EXCEL RUNTIME ENGINE                    |
|    - Workbook Validator       - Autosaver (60s)             |
|    - Transaction Rollback     - Lock Manager                |
|    - Schema Version Manager   - Backup Manager              |
+-------------------------------------------------------------+
                               | (Direct File Serialization)
                               v
               [ THOP_BILLING_DATABASE.xlsx ]
```

### 2. Runtime Engine Lifecycle Protocols

#### Protocol A: Startup Routine (10 Steps)
When the application starts, it runs a synchronous integrity boot sequence:
1. **Locate Environment Paths:** Checks the workspace target folders for directories (`Database/`, `Backup/`, `Invoices/`, `Reports/`, `Logs/`). If missing, creates them.
2. **Locate Primary Workbook:** Checks if `Database/THOP_BILLING_DATABASE.xlsx` is physically present.
3. **Verify File Lock Status:** Inspects if the file is locked by another instance or open in Excel.
4. **Load Workbook Header Metadata:** Inspects version tags on the hidden `SysVersionHistory` sheet.
5. **Verify Version Schema Compatibility:** If the application version is higher than the database version, it invokes the automatic database schema upgrade algorithm.
6. **Sheet Checklist Scan:** Verifies that all 42 sheets exist in the loaded workbook. If any sheet is missing, the **Auto-Repair Engine** recreates it instantly using the template definition.
7. **Verify Structural Columns:** Loops through all sheets to ensure required columns (e.g., Audit logs, Keys) exist in their exact slots.
8. **Rebuild In-Memory Lookup Cache:** Loads the entire `MstLookupValues` sheet into an ephemeral memory dictionary to eliminate future I/O latency for dropdown renders.
9. **Synchronize Auto Numbers:** Reads current max IDs from transactional sheets to calibrate seed counters for primary key generators.
10. **Boot Complete Event:** Launches the Dashboard interface with low-latency cached indicators.

#### Protocol B: First-Run Automatic DB Provisioning
If the database file is not detected during startup, the engine:
1. Generates the standard directory structures in the file workspace.
2. Constructs a new workbook in memory using the SheetJS library.
3. appends all 42 pre-formatted worksheets with correct column structures.
4. Populates default company parameters inside `SetCompany`, standard Indian states inside `MstStates`, and lookup categories in `MstLookupValues`.
5. Creates the default primary Administrator account (`username: admin`, default password, role `ADMIN`).
6. Saves the generated file as `Database/THOP_BILLING_DATABASE.xlsx` with clean logs.

#### Protocol C: ACID Transaction & Rollback Engine
1. **Begin Transaction:** When saving complex operational workflows (e.g., recording an Invoice which simultaneously requires updating `TxnInvoices`, `TxnInvoiceItems`, `MstCustomers.OutstandingBalance`, `SysActivityLog`), the engine takes an in-memory snapshot of the database states.
2. **Atomic Execution:** The database writes are executed in order.
3. **Rollback Handler:** If any step fails (e.g., duplicate invoice number, corrupt state code, validation errors), the engine aborts the operations, discards modified structures, rolls back changes to the initial memory snapshot, and raises an `EngineTransactionException` without saving anything.
4. **Commit:** Only when all writes succeed, the in-memory master state is locked and immediately serialized to disk, updating audit lines.

#### Protocol D: Auto-Save, Auto-Backup, and Multi-Client Protection
* **Instant Serialization:** Any mutation to `MstCustomers`, `MstPets`, `TxnInvoices`, `TxnPayments`, or `SetCompany` immediately triggers a synchronous write to save the state.
* **Passive Auto-Save:** A background timer runs every 60 seconds. If any ephemeral log or unsaved preference change exists, it performs an asynchronous background save.
* **Backup on Event:** Before major operations (schema upgrade, restoring older database states, bulk CSV data import, structure auto-repair), the system automatically creates a date-stamped backup file in `Backup/THOP_DB_BACKUP_YYYYMMDD_HHMMSS.xlsx`.
* **Lock Manager:** Since multiple systems might read the workbook, the engine creates a small control lockfile (`Database/~THOP_LOCK`) when opening with write access, logging the hostname, username, and time opened. If another client tries to write, it displays a **"Database In Use"** modal offering three options:
  * **Retry:** Poll lock file again.
  * **Read-Only Mode:** Disable all form submission fields.
  * **Exit:** Shut down application context gracefully.

---

## Technical Mapping Table: Excel to Relational Databases

To ensure zero-downtime database upgrades in the future, all structural concepts in the Excel sheets align directly with modern relational databases (PostgreSQL, Supabase):

| Excel Concept | SQL / Relational Concept | Implementation details in `THOP_BILLING_DATABASE.xlsx` |
|---|---|---|
| **Worksheet (.xlsx Sheet)** | Database Table | e.g. `MstCustomers` behaves exactly like a table named `mst_customers`. |
| **Row** | Database Record / Row | A single horizontal entry with a unique ID. |
| **Column** | Table Field / Attribute | Strict data types (Date, Decimal, Text) enforced at the DAL level. |
| **Cell** | Field Value | Individual attribute value. |
| **Primary Key ID** | `PRIMARY KEY` Constraint | Checked by DAL during insertion to ensure no two rows have the same ID. |
| **Foreign Key ID** | `FOREIGN KEY` Reference | ID-based linkage, validated during transaction processing by the DAL. |
| **VLOOKUP / XLOOKUP** | SQL `JOIN` Operation | Performed by the UI or DAL by combining rows from separate sheets. |

---

## Operational Guide: How Existing App Features Work

The application contains specialized frontend modules designed to interface with this relational storage:

### 1. Advanced Enterprise Smart Import Engine
Located in the Import section, this handles bulk file migrations:
* **Fuzzy Match Engine:** When a file is loaded, it compares new customer names to existing records using custom token-based matching. It flags partial matches (e.g., "Rajesh" and "Rajesh Malhotra" as an 88% match) and allows the operator to select a resolution strategy: **Merge**, **Keep Separate**, or **Review Later**.
* **Real-time Metrics & Quality Score:** Computes a data quality score out of 100% based on completeness (missing fields), accuracy (correct 10-digit phone numbers and 15-digit GSTINs), and duplicate rates.
* **Sandbox Mode:** Acts as a safe dry run. The operator can preview the exact impact of an import, check warning and error counts, and only commit to the live database after confirming everything looks clean.
* **Migration Reporting:** Generates a downloadable CSV or printable PDF migration report detailing records processed, merged, and total duration.

### 2. Live Excel Manager & Backups Center
Located in the Settings/Database tab, this module controls the physical Excel file:
* **Export Master:** Triggers the direct generation of the complete 42-sheet relational workbook `THOP_BILLING_DATABASE.xlsx` using the current `localStorage` state, making it immediately available for Excel audits.
* **Import Database:** Allows the user to select any previous version of `THOP_BILLING_DATABASE.xlsx`, validates its columns and sheet schemas, and restores the system state.
* **Database Reset & Seeding:** Restores all master registries to pristine default states and registers default billing rules.

---

## Part 11C – Transaction Tables Design (Schemas of all 12 Transaction Sheets)

The transaction tables handle every core operational activity of **The House of Pawz – Billing Pro**. They represent dynamic, multi-record state entities acting as a high-integrity transactional ledger.

### Standard Transaction Design Patterns
* **No Inline Calculations:** Derived totals and formula representations are handled dynamically by the Business Logic Layer or the DAL during execution, saving frozen scalar values to preserve history and prevent formula corruption in Excel.
* **Audit Columns:** Every sheet ends with the standard six Audit Fields (`CreatedDate`, `ModifiedDate`, `CreatedBy`, `ModifiedBy`, `Status`, `Remarks`).

---

### 1. `TxnBoarding` (Boarding Stay Records)
* **Sheet Purpose:** Manages pet boarding check-ins, stays, assigned room inventory status, and checkout tracking.
* **Primary Key:** `BoardingID` (PK)
* **Search Indexes:** `BoardingID` (Clustered Index), `CustomerID` (Secondary Index), `PetID` (Secondary Index), `RoomID` (Secondary Index), `CheckInDate` (Chronological Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `BoardingID` | Text | 20 | Yes | None | Prefix: `BRD-` followed by 5+ sequential digits | Primary Key (PK) | Unique check-in stayed identifier. |
| 2 | `CustomerID` | Text | 20 | Yes | None | Must exist in `MstCustomers` | Foreign Key (FK) | Reference link to pet owner client. |
| 3 | `PetID` | Text | 20 | Yes | None | Must exist in `MstPets` | Foreign Key (FK) | Reference link to boarded pet registry. |
| 4 | `RoomID` | Text | 20 | Yes | None | Must exist in `MstRooms` | Foreign Key (FK) | Reference to assigned room resource. |
| 5 | `PackageID` | Text | 20 | No | None | If not empty, must exist in `MstPackages` | Foreign Key (FK) | Bundle pack applied to the stay. |
| 6 | `CheckInDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Date of boarding check-in. |
| 7 | `CheckInTime` | Time | 8 | Yes | None | Format: `HH:MM` (24-hour style) | None | Time of check-in entry. |
| 8 | `ExpectedCheckout` | DateTime | 19 | Yes | None | ISO standard, must be after check-in | None | Promised pickup time. |
| 9 | `ActualCheckout` | DateTime | 19 | No | None | ISO standard, must be >= check-in | None | Actual check-out timestamp. |
| 10 | `AssignedStaff` | Text | 20 | Yes | None | Must exist in `MstUsers` | Foreign Key (FK) | Handled by user key. |
| 11 | `CurrentStatus` | Text | 15 | Yes | `CHECKED_IN` | Must be: `CHECKED_IN`, `COMPLETED`, `CANCELLED` | None | Stay status tracker. |
| 12 | `SpecialCare` | Long Text | - | No | None | Text limit: Max 2000 chars | None | Operational handling flags. |
| 13 | `FoodPlan` | Text | 200 | No | None | Specific brand, qty, and intervals | None | Meal directions for boarding. |
| 14 | `MedicinePlan` | Text | 200 | No | None | Dosages and time limits | None | Active medicines log. |
| 15 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 16 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 17 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Operator who initialized the record. |
| 18 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Operator who last updated the record. |
| 19 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Database status flag. |
| 20 | `Remarks` | Long Text | - | No | None | General annotations | None | Admin review comments. |

---

### 2. `TxnDaycare` (Daycare Check-In Records)
* **Sheet Purpose:** Manages short-stay daycare check-ins, tracks precise timings, and monitors late pick-up penalties.
* **Primary Key:** `DaycareID` (PK)
* **Search Indexes:** `DaycareID` (Clustered Index), `CustomerID` (Secondary Index), `PetID` (Secondary Index), `ArrivalDate` (Chronological Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `DaycareID` | Text | 20 | Yes | None | Prefix: `DYC-` followed by 5+ sequential digits | Primary Key (PK) | Unique daycare transaction key. |
| 2 | `CustomerID` | Text | 20 | Yes | None | Must exist in `MstCustomers` | Foreign Key (FK) | Client reference. |
| 3 | `PetID` | Text | 20 | Yes | None | Must exist in `MstPets` | Foreign Key (FK) | Pet reference. |
| 4 | `PackageID` | Text | 20 | No | None | If not empty, must exist in `MstPackages` | Foreign Key (FK) | Custom package reference. |
| 5 | `ArrivalDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Day of check-in. |
| 6 | `ArrivalTime` | Time | 8 | Yes | None | Format: `HH:MM` (24-hour style) | None | Daycare clock-in. |
| 7 | `DepartureDate` | Date | 10 | No | None | ISO Standard Format: `YYYY-MM-DD` | None | Day of departure. |
| 8 | `DepartureTime` | Time | 8 | No | None | Format: `HH:MM` (24-hour style) | None | Daycare clock-out. |
| 9 | `IsLatePickup` | Boolean | - | Yes | `FALSE` | Value must be `TRUE` or `FALSE` | None | Flag for overtime penalty. |
| 10 | `LateHours` | Decimal | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Late hours counted after target hour. |
| 11 | `LateCharges` | Currency | - | Yes | `0.00` | Real values; must be >= `0.00` | None | Penalty amount applied. |
| 12 | `StandardCharges`| Currency | - | Yes | `0.00` | Real values; must be >= `0.00` | None | Standard daycare rate. |
| 13 | `TotalCharges` | Currency | - | Yes | `0.00` | Must equal standard + late | None | Total billing charges computed. |
| 14 | `AssignedStaff` | Text | 20 | Yes | None | Must exist in `MstUsers` | Foreign Key (FK) | Caretaker handling the pet. |
| 15 | `CurrentStatus` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `DEPARTED`, `CANCELLED` | None | Live state tracking. |
| 16 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 17 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 18 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Operator ID. |
| 19 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Operator ID. |
| 20 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Database status flag. |
| 21 | `Remarks` | Long Text | - | No | None | General notes | None | Admin notes. |

---

### 3. `TxnInvoices` (Invoice Header Master)
* **Sheet Purpose:** Acts as the sales ledger header. Implements Indian GST taxation controls, client business classifications (B2B/B2C), and accounts receivable balances.
* **Primary Key:** `InvoiceID` (PK)
* **Search Indexes:** `InvoiceID` (Clustered Index), `InvoiceNumber` (Unique Index), `CustomerID` (Secondary Index), `InvoiceDate` (Chronological Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `InvoiceID` | Text | 20 | Yes | None | Prefix: `INV-` followed by 5+ sequential digits | Primary Key (PK) | Unique physical table primary identifier. |
| 2 | `InvoiceNumber` | Text | 50 | Yes | None | Regex: `^HOP\/[0-9]{2}-[0-9]{2}\/[0-9]{4}$` | None | Serialized Invoice No (HOP/FY/Seq). |
| 3 | `InvoiceDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Fiscal billing date. |
| 4 | `CustomerID` | Text | 20 | Yes | None | Must exist in `MstCustomers` | Foreign Key (FK) | Billing party account link. |
| 5 | `PetCount` | Number | - | Yes | `1` | Must be integer >= `0` | None | Total pets billed on this document. |
| 6 | `TaxableAmount` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Aggregate net before GST tax value. |
| 7 | `Discount` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Document-level commercial discount. |
| 8 | `CGST` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Central GST total. |
| 9 | `SGST` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | State GST total. |
| 10 | `IGST` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Integrated GST total. |
| 11 | `RoundOff` | Currency | - | Yes | `0.00` | Value must fall between `-0.99` and `0.99` | None | Adjustment for absolute rounding. |
| 12 | `GrandTotal` | Currency | - | Yes | `0.00` | Taxable - Disc + CGST + SGST + IGST + Round | None | Absolute bill payable amount. |
| 13 | `PaidAmount` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Aggregate payments recorded. |
| 14 | `OutstandingAmount` | Currency | - | Yes | `0.00` | Must equal GrandTotal - PaidAmount | None | Remaining customer accounts receivable. |
| 15 | `PaymentStatus` | Text | 15 | Yes | `UNPAID` | Must be: `UNPAID`, `PARTIAL`, `PAID`, `REFUNDED` | None | Debt closure lifecycle stage. |
| 16 | `InvoiceStatus` | Text | 15 | Yes | `DRAFT` | Must be: `DRAFT`, `FINALIZED`, `CANCELLED` | None | Billing state control. |
| 17 | `BusinessType` | Text | 10 | Yes | `B2C` | Must be: `B2B`, `B2C` | None | Commercial categorization indicator. |
| 18 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 19 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 20 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Biller Operator ID. |
| 21 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Biller Operator ID. |
| 22 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Database status flag. |
| 23 | `Remarks` | Long Text | - | No | None | Billing notations | None | Internal comments. |

---

### 4. `TxnInvoiceItems` (Invoice Detail Records)
* **Sheet Purpose:** Stores itemized rows for invoice headers, breaking down distinct rates, quantities, and line-level tax ratios.
* **Primary Key:** `ItemID` (PK)
* **Search Indexes:** `ItemID` (Clustered Index), `InvoiceID` (Secondary Index), `ServiceID` (Reference Index), `PackageID` (Reference Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `ItemID` | Text | 20 | Yes | None | Prefix: `INI-` followed by 5+ sequential digits | Primary Key (PK) | Itemized line identification key. |
| 2 | `InvoiceID` | Text | 20 | Yes | None | Must exist in `TxnInvoices` | Foreign Key (FK) | Parent invoice document reference. |
| 3 | `ServiceID` | Text | 20 | No | None | If populated, must exist in `MstServices` | Foreign Key (FK) | Linked catalog service. |
| 4 | `PackageID` | Text | 20 | No | None | If populated, must exist in `MstPackages` | Foreign Key (FK) | Linked bundle package. |
| 5 | `Description` | Text | 200 | Yes | None | Clear product/service text description | None | Description of the charge line. |
| 6 | `Quantity` | Decimal | - | Yes | `1.00` | Scale: 2 decimals; must be > `0.00` | None | Billed billing frequency units. |
| 7 | `Rate` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Individual unit cost. |
| 8 | `Discount` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Itemized discount reduction. |
| 9 | `Taxable` | Currency | - | Yes | `0.00` | Calculated: `(Quantity * Rate) - Discount` | None | Net line value before tax calculations. |
| 10 | `GstPercentage` | Percentage | - | Yes | `0.18` | Allowed values: `0.00`, `0.05`, `0.12`, `0.18` | None | GST rate percentage code. |
| 11 | `CGST` | Currency | - | Yes | `0.00` | CGST calculated component amount | None | Central tax value. |
| 12 | `SGST` | Currency | - | Yes | `0.00` | SGST calculated component amount | None | State tax value. |
| 13 | `IGST` | Currency | - | Yes | `0.00` | IGST calculated component amount | None | Interstate tax value. |
| 14 | `LineTotal` | Currency | - | Yes | `0.00` | Calculated: `Taxable + CGST + SGST + IGST` | None | Net line amount due. |
| 15 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 16 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 17 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Creating user. |
| 18 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Modifying user. |
| 19 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Database status flag. |
| 20 | `Remarks` | Long Text | - | No | None | Item parameters | None | Line-level internal annotations. |

---

### 5. `TxnPayments` (Payment Ledger Ledger)
* **Sheet Purpose:** Registers all payment actions, links UPI/Cash modes, tracks bank deposits, and records operator validations.
* **Primary Key:** `PaymentID` (PK)
* **Search Indexes:** `PaymentID` (Clustered Index), `InvoiceID` (Secondary Index), `PaymentDate` (Chronological Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `PaymentID` | Text | 20 | Yes | None | Prefix: `PAY-` followed by 5+ sequential digits | Primary Key (PK) | Transaction index identifier. |
| 2 | `InvoiceID` | Text | 20 | Yes | None | Must exist in `TxnInvoices` | Foreign Key (FK) | Parent invoice identifier. |
| 3 | `ReceiptID` | Text | 20 | No | None | If populated, must exist in `TxnReceipts` | Foreign Key (FK) | Reference to issued receipt voucher. |
| 4 | `PaymentDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Date payment received. |
| 5 | `Amount` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be > `0.00` | None | Absolute physical cashflow value. |
| 6 | `Mode` | Text | 30 | Yes | None | Must match `MstPaymentModes.ModeName` | None | Billed payment option name. |
| 7 | `TransactionNumber` | Text | 50 | No | None | Unique payment platform string | None | Card swipe reference / check digit. |
| 8 | `UTR` | Text | 50 | No | None | Bank standard alphanumeric reference | None | Indian banking standard UTR code. |
| 9 | `BankID` | Text | 20 | No | None | If populated, must exist in `MstBanks` | Foreign Key (FK) | Destination bank account. |
| 10 | `UPIID` | Text | 20 | No | None | If populated, must exist in `MstUPIAccounts` | Foreign Key (FK) | UPI configuration target node. |
| 11 | `Reference` | Text | 150 | No | None | Trace comments | None | External comments. |
| 12 | `CollectedBy` | Text | 20 | Yes | None | Must exist in `MstUsers` | Foreign Key (FK) | Cashier user. |
| 13 | `VerifiedBy` | Text | 20 | No | None | If populated, must exist in `MstUsers` | Foreign Key (FK) | Reconciling auditor. |
| 14 | `DepositStatus` | Text | 20 | Yes | `PENDING` | Must be: `PENDING`, `DEPOSITED`, `RECONCILED`, `BOUNCED` | None | Bank reconciliation status. |
| 15 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 16 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 17 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Entry operator. |
| 18 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Entry operator. |
| 19 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Database status flag. |
| 20 | `Remarks` | Long Text | - | No | None | Audit descriptions | None | Bank reconciliation exceptions. |

---

### 6. `TxnReceipts` (Voucher Audit Records)
* **Sheet Purpose:** Indexes system-generated payment receipt records, checking PDF generation links and messaging states.
* **Primary Key:** `ReceiptID` (PK)
* **Search Indexes:** `ReceiptID` (Clustered Index), `ReceiptNumber` (Unique Index), `PaymentID` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `ReceiptID` | Text | 20 | Yes | None | Prefix: `REC-` followed by 5+ sequential digits | Primary Key (PK) | Voucher index number. |
| 2 | `ReceiptNumber` | Text | 50 | Yes | None | Regex: `^REC\/[0-9]{2}-[0-9]{2}\/[0-9]{4}$` | None | Document Number (REC/FY/Seq). |
| 3 | `InvoiceID` | Text | 20 | Yes | None | Must exist in `TxnInvoices` | Foreign Key (FK) | Base sales invoice target. |
| 4 | `ReceiptDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Date voucher generated. |
| 5 | `PaymentID` | Text | 20 | Yes | None | Must exist in `TxnPayments` | Foreign Key (FK) | Cashflow payment link. |
| 6 | `Amount` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be > `0.00` | None | Printed voucher amount. |
| 7 | `GeneratedPdfPath`| Text | 250 | No | None | Absolute system path to generated PDF | None | Disk PDF location link. |
| 8 | `WhatsAppSent` | Boolean | - | Yes | `FALSE` | Value must be `TRUE` or `FALSE` | None | Notification confirmation flags. |
| 9 | `EmailSent` | Boolean | - | Yes | `FALSE` | Value must be `TRUE` or `FALSE` | None | Email outreach confirmation flags. |
| 10 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 11 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 12 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Issued employee. |
| 13 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Issued employee. |
| 14 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Database status flag. |
| 15 | `Remarks` | Long Text | - | No | None | Document parameters | None | Delivery log remarks. |

---

### 7. `TxnCreditNotes` (Credit Notes Register)
* **Sheet Purpose:** Details corporate discount refunds, booking downward revisions, and tax adjustments applied to locked finalized invoices.
* **Primary Key:** `CreditNoteID` (PK)
* **Search Indexes:** `CreditNoteID` (Clustered Index), `CreditNoteNumber` (Unique Index), `InvoiceID` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `CreditNoteID` | Text | 20 | Yes | None | Prefix: `CRN-` followed by 5+ sequential digits | Primary Key (PK) | Return document primary ID. |
| 2 | `CreditNoteNumber`| Text | 50 | Yes | None | Regex: `^CRN\/[0-9]{2}-[0-9]{2}\/[0-9]{4}$` | None | Document Number (CRN/FY/Seq). |
| 3 | `InvoiceID` | Text | 20 | Yes | None | Must exist in `TxnInvoices` | Foreign Key (FK) | Original invoice document. |
| 4 | `Reason` | Text | 250 | Yes | None | Meaningful plain text description | None | Why credit note was generated. |
| 5 | `Amount` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be > `0.00` | None | Credit note value including GST. |
| 6 | `AdjustedInvoiceID`| Text | 20 | No | None | If populated, must exist in `TxnInvoices` | Foreign Key (FK) | Target invoice credit is applied to. |
| 7 | `CreditNoteDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Date of credit note issue. |
| 8 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 9 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 10 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Approving user. |
| 11 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Approving user. |
| 12 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Database status flag. |
| 13 | `Remarks` | Long Text | - | No | None | General annotations | None | Audit notes. |

---

### 8. `TxnRefunds` (Refund Payout Ledger)
* **Sheet Purpose:** Registers direct currency refunds issued back to clients due to invoice cancellation or excess cash collections.
* **Primary Key:** `RefundID` (PK)
* **Search Indexes:** `RefundID` (Clustered Index), `RefundNumber` (Unique Index), `InvoiceID` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `RefundID` | Text | 20 | Yes | None | Prefix: `REF-` followed by 5+ sequential digits | Primary Key (PK) | Refund primary identifier. |
| 2 | `RefundNumber` | Text | 50 | Yes | None | Regex: `^REF\/[0-9]{2}-[0-9]{2}\/[0-9]{4}$` | None | Document Number (REF/FY/Seq). |
| 3 | `InvoiceID` | Text | 20 | Yes | None | Must exist in `TxnInvoices` | Foreign Key (FK) | Connected invoice voucher. |
| 4 | `RefundDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Date refund processed. |
| 5 | `Amount` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be > `0.00` | None | Refunded amount payout. |
| 6 | `Reason` | Text | 250 | Yes | None | Plain text detail description | None | Why refund was initiated. |
| 7 | `ApprovalStatus` | Text | 20 | Yes | `PENDING` | Must be: `PENDING`, `APPROVED`, `REJECTED` | None | Status of internal audit control. |
| 8 | `ApprovedBy` | Text | 20 | No | None | If populated, must exist in `MstUsers` | Foreign Key (FK) | Manager User ID. |
| 9 | `PaymentMode` | Text | 30 | Yes | None | Must match `MstPaymentModes.ModeName` | None | Code payout channel used. |
| 10 | `PayoutUTR` | Text | 50 | No | None | Bank reference reference key | None | Outbound transaction UTR check. |
| 11 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 12 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 13 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Disbursing clerk. |
| 14 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Disbursing clerk. |
| 15 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Database status flag. |
| 16 | `Remarks` | Long Text | - | No | None | Bank notes | None | Payout failure or bounce details. |

---

### 9. `TxnAdjustments` (Manual Balance Corrections)
* **Sheet Purpose:** Logs manual corporate ledger balance modifications, enabling debits and credits outside standard sales loops (e.g. waiving balances or bad debts).
* **Primary Key:** `AdjustmentID` (PK)
* **Search Indexes:** `AdjustmentID` (Clustered Index), `CustomerID` (Secondary Index), `InvoiceID` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `AdjustmentID` | Text | 20 | Yes | None | Prefix: `ADJ-` followed by 5+ sequential digits | Primary Key (PK) | Unique adjustment row index. |
| 2 | `InvoiceID` | Text | 20 | No | None | If populated, must exist in `TxnInvoices` | Foreign Key (FK) | Targeted invoice balance sheet correction. |
| 3 | `CustomerID` | Text | 20 | Yes | None | Must exist in `MstCustomers` | Foreign Key (FK) | Customer ledger adjustment link. |
| 4 | `AdjustmentDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Booking adjustment date. |
| 5 | `Reason` | Text | 250 | Yes | None | Clear justification for adjustment | None | Business rationale details. |
| 6 | `Debit` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Amount debited (increasing receivable). |
| 7 | `Credit` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Amount credited (decreasing receivable). |
| 8 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 9 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 10 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Auditor Operator ID. |
| 11 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Auditor Operator ID. |
| 12 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Database status flag. |
| 13 | `Remarks` | Long Text | - | No | None | Audit annotations | None | Admin internal review logs. |

---

### 10. `TxnPetDailyLog` (Pet Care Activity Registers)
* **Sheet Purpose:** Tracks pet clinical progress, feed records, exercise, walks, medical logs, temperature, and weight metrics during active boarding stays.
* **Primary Key:** `LogID` (PK)
* **Search Indexes:** `LogID` (Clustered Index), `BoardingID` (Secondary Index), `PetID` (Secondary Index), `LogDate` (Chronological Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `LogID` | Text | 20 | Yes | None | Prefix: `LOG-` followed by 5+ sequential digits | Primary Key (PK) | Unique log primary ID. |
| 2 | `BoardingID` | Text | 20 | Yes | None | Must exist in `TxnBoarding` | Foreign Key (FK) | Active stay reference. |
| 3 | `PetID` | Text | 20 | Yes | None | Must exist in `MstPets` | Foreign Key (FK) | Pet identity reference. |
| 4 | `LogDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Day of stay check. |
| 5 | `MorningFood` | Text | 100 | No | None | Portions and brand notations | None | Morning feeding description. |
| 6 | `Lunch` | Text | 100 | No | None | Portions and brand notations | None | Afternoon feeding description. |
| 7 | `Dinner` | Text | 100 | No | None | Portions and brand notations | None | Evening feeding description. |
| 8 | `Medicine` | Text | 150 | No | None | Dosages, timings administered | None | Clinical drugs recorded. |
| 9 | `WalkCount` | Number | - | Yes | `0` | Integer value; must be >= `0` | None | Active outdoor play count. |
| 10 | `PlayTimeMinutes`| Number | - | Yes | `0` | Integer value; must be >= `0` | None | Play zone tracking clock. |
| 11 | `BathDone` | Boolean | - | Yes | `FALSE` | Value must be `TRUE` or `FALSE` | None | Grooming status check. |
| 12 | `WeightKg` | Decimal | - | No | None | Scale: 2 decimals; must be > `0.00` | None | Bodyweight tracking metric. |
| 13 | `TemperatureF` | Decimal | - | No | None | Scale: 1 decimal; e.g. `101.5` | None | Health diagnostic check. |
| 14 | `SpecialNotes` | Long Text | - | No | None | Warning metrics (e.g. low appetite) | None | Warning signs or care instructions. |
| 15 | `StaffInCharge` | Text | 20 | Yes | None | Must exist in `MstUsers` | Foreign Key (FK) | Assigned caretaker identifier. |
| 16 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 17 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 18 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Logger Operator ID. |
| 19 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Logger Operator ID. |
| 20 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Database status flag. |
| 21 | `Remarks` | Long Text | - | No | None | Health summary notes | None | Vet visit flags or clinical review. |

---

### 11. `TxnPhotoLibrary` (Media Asset Index)
* **Sheet Purpose:** Manages file paths, sizes, categories, and hashes of daily pet activity snapshots and documents.
* **Primary Key:** `PhotoID` (PK)
* **Search Indexes:** `PhotoID` (Clustered Index), `PetID` (Secondary Index), `BoardingID` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `PhotoID` | Text | 20 | Yes | None | Prefix: `PHO-` followed by 5+ sequential digits | Primary Key (PK) | Unique photo asset ID. |
| 2 | `BoardingID` | Text | 20 | No | None | If populated, must exist in `TxnBoarding` | Foreign Key (FK) | Stay log connection. |
| 3 | `PetID` | Text | 20 | Yes | None | Must exist in `MstPets` | Foreign Key (FK) | Pet linkage. |
| 4 | `Category` | Text | 30 | Yes | None | Must exist in `MstPhotoCategories` | Foreign Key (FK) | Category code categorization. |
| 5 | `PhotoPath` | Text | 250 | Yes | None | Valid storage asset file URI path | None | File path location on disk. |
| 6 | `ThumbnailPath` | Text | 250 | No | None | Valid thumbnail file URI path | None | File path for visual previews. |
| 7 | `CaptureDate` | DateTime | 19 | Yes | None | ISO Standard format | None | Image creation date on device. |
| 8 | `CapturedBy` | Text | 20 | Yes | None | Must exist in `MstUsers` | Foreign Key (FK) | Snapping caretaker user. |
| 9 | `FileSizeKb` | Number | - | Yes | None | Integer value; must be > `0` | None | File capacity metrics. |
| 10 | `FileHash` | Text | 64 | Yes | None | 64-char valid SHA-256 hash string | None | SHA-256 check for duplicate images. |
| 11 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 12 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 13 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 14 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 15 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Database status flag. |
| 16 | `Remarks` | Long Text | - | No | None | Storage metadata | None | Media errors or sync tags. |

---

### 12. `TxnDocumentLibrary` (KYC & Documents Index)
* **Sheet Purpose:** Indexes physical document attachments, client ID proofs, check lists, medical summaries, and signed paper waivers.
* **Primary Key:** `DocumentID` (PK)
* **Search Indexes:** `DocumentID` (Clustered Index), `CustomerID` (Secondary Index), `PetID` (Secondary Index), `InvoiceID` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `DocumentID` | Text | 20 | Yes | None | Prefix: `DOC-` followed by 5+ sequential digits | Primary Key (PK) | Unified document index code. |
| 2 | `CustomerID` | Text | 20 | No | None | If populated, must exist in `MstCustomers` | Foreign Key (FK) | Connected owner KYC key. |
| 3 | `PetID` | Text | 20 | No | None | If populated, must exist in `MstPets` | Foreign Key (FK) | Connected pet clinical sheet. |
| 4 | `InvoiceID` | Text | 20 | No | None | If populated, must exist in `TxnInvoices` | Foreign Key (FK) | Connected billing document. |
| 5 | `DocumentType` | Text | 30 | Yes | None | Must exist in `MstDocumentTypes` | Foreign Key (FK) | Classification directory tag. |
| 6 | `DocumentPath` | Text | 250 | Yes | None | Valid storage asset file URI path | None | Document location on disk. |
| 7 | `UploadDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Server upload timestamp. |
| 8 | `UploadedBy` | Text | 20 | Yes | None | Must exist in `MstUsers` | Foreign Key (FK) | Scanning operator. |
| 9 | `FileSizeKb` | Number | - | Yes | None | Integer value; must be > `0` | None | File size parameter. |
| 10 | `FileHash` | Text | 64 | Yes | None | 64-char valid SHA-256 hash string | None | SHA-256 check for security auditing. |
| 11 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 12 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 13 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 14 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 15 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Database status flag. |
| 16 | `Remarks` | Long Text | - | No | None | Administrative details | None | Audit notes. |

---

## Part 11C.5 – Dynamic Core Billing & Ledger Engines (Workflow Logic)

To ensure consistency, the DAL guarantees that updates flow to auxiliary bookkeeping ledger sheets synchronously upon any save event.

### 1. Unified Payment Engine Flow
```
        [ Client Payment Received ]
                     │
                     ▼
             DAL Payment Save
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    Write Record        Calculate Running Balances
(To TxnPayments Row)   (Reduce Invoice Outstanding)
         │                       │
         │                       ▼
         │             Check: Outstanding == 0?
         │             IF YES: Set InvoiceStatus = 'PAID' & generate TxnReceipts
         │
         ▼
 ┌────────────────────────────────────────────────────────────────┐
 │                 SYNCHRONOUS LEDGER UPDATES                     │
 ├────────────────────────────────────────────────────────────────┤
 │  - AccCustomerLedger   : Post Credit adjustment row            │
 │  - AccCashBook         : IF Mode == 'CASH', record debit entry  │
 │  - AccBankBook         : IF Mode != 'CASH', post bank ledger    │
 │  - AccOutstandingLedger: Recalculate customer aggregate balance│
 └────────────────────────────────────────────────────────────────┘
```

### 2. Live GST Interstate Tax Calculation Engine
Whenever an item is recorded in `TxnInvoiceItems`, the tax calculation dynamically matches rules relative to the POS (Place of Supply) comparison between the firm and client:
* **Check Firm State Location:** Derived from `MstCompany` (e.g., `StateID` points to `ST-MH` - Maharashtra).
* **Check Customer State Location:** Derived from `MstCustomers` (e.g., `StateID` of the customer profile).
* **Tax Calculation Decision Tree:**
  * **Intra-State Sale:** If `Customer.StateID == Company.StateID`:
    * `CGST` = `Taxable * (GstPercentage / 2)`
    * `SGST` = `Taxable * (GstPercentage / 2)`
    * `IGST` = `0.00`
    * Record separate rows in `GstRegister` split by Central and State columns.
  * **Inter-State Sale:** If `Customer.StateID != Company.StateID`:
    * `CGST` = `0.00`
    * `SGST` = `0.00`
    * `IGST` = `Taxable * GstPercentage`
    * Record single row in `GstRegister` marked under Inter-State Integrated tax columns.
* **Accounting Sync:** Write GST data instantly to both `GstRegister` and compile aggregations in `GstMonthlySummary`.

## Part 11D – Accounting, GST, Reports & Dashboard Engine

This section details the design, schemas, relationships, indexes, and posting workflows of the **Accounting, GST, Reports, and Dashboard** worksheets. These sheets form the core bookkeeping, tax-compliance, and analytical intelligence of **The House of Pawz – Billing Pro**.

---

### GROUP 3 – ACCOUNTING TABLES

The accounting sheets capture double-entry ledger records, track immediate liquidity, manage advances, and enforce strict fiscal reconciliation.

---

#### 1. `AccCustomerLedger` (Customer Ledger)
* **Purpose:** Acts as a master accounts receivable sub-ledger. Records debits (Invoices, Debit Adjustments) and credits (Payments, Credit Adjustments, Refunds) to track a real-time running balance per customer.
* **Primary Key:** `LedgerEntryID` (PK)
* **Search Indexes:** `LedgerEntryID` (Clustered Index), `CustomerID` (Secondary Index), `LedgerDate` (Chronological Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `LedgerEntryID` | Text | 20 | Yes | None | Prefix: `LED-` followed by 5+ sequential digits | Primary Key (PK) | Unique ledger entry identifier. |
| 2 | `CustomerID` | Text | 20 | Yes | None | Must exist in `MstCustomers` | Foreign Key (FK) | Reference link to client profile. |
| 3 | `LedgerDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Date the bookkeeping entry took place. |
| 4 | `VoucherReference` | Text | 50 | Yes | None | Prefix must match: `INV-`, `PAY-`, `REC-`, `CRN-`, `REF-`, or `ADJ-` | None | Underlying source voucher ID. |
| 5 | `InvoiceReference` | Text | 50 | No | None | Must exist in `TxnInvoices` | Foreign Key (FK) | Direct link to invoice if applicable. |
| 6 | `PaymentReference` | Text | 50 | No | None | Must exist in `TxnPayments` | Foreign Key (FK) | Direct link to payment if applicable. |
| 7 | `Debit` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Increases client liability. |
| 8 | `Credit` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Decreases client liability. |
| 9 | `RunningBalance` | Currency | - | Yes | `0.00` | Calculated: `PreviousBalance + Debit - Credit` | None | Dynamic cumulative total outstanding due. |
| 10 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 11 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 12 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Initiating operator. |
| 13 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Modifying operator. |
| 14 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 15 | `Remarks` | Long Text | - | No | None | Journal explanations or comments | None | Bookkeeping notes. |

---

#### 2. `AccCashBook` (Cash Book)
* **Purpose:** Records physical cash inflows and outflows. Provides direct verification of cash on hand.
* **Primary Key:** `CashTxnID` (PK)
* **Search Indexes:** `CashTxnID` (Clustered Index), `TxnDate` (Chronological Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `CashTxnID` | Text | 20 | Yes | None | Prefix: `CSH-` followed by 5+ sequential digits | Primary Key (PK) | Cash register primary key. |
| 2 | `TxnDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Transaction date. |
| 3 | `VoucherRef` | Text | 50 | Yes | None | Prefix must match: `INV-`, `PAY-`, `REC-`, `REF-`, or `ADJ-` | None | Reference voucher. |
| 4 | `Debit` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Cash receipts (Inflow). |
| 5 | `Credit` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Cash payments (Outflow). |
| 6 | `RunningBalance` | Currency | - | Yes | `0.00` | Calculated: `PreviousBalance + Debit - Credit` | None | Physical cash on hand. |
| 7 | `Cashier` | Text | 20 | Yes | None | Must exist in `MstUsers` | Foreign Key (FK) | Biller in charge. |
| 8 | `Narration` | Text | 250 | Yes | None | Concise double-entry commentary | None | Bookkeeping memo. |
| 9 | `DepositStatus` | Text | 20 | Yes | `HELD` | Must be: `HELD`, `DEPOSITED_TO_BANK` | None | Bank transit identifier. |
| 10 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 11 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 12 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Creating operator. |
| 13 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Modifying operator. |
| 14 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 15 | `Remarks` | Long Text | - | No | None | Discrepancy annotations | None | Audit notes. |

---

#### 3. `AccBankBook` (Bank Book)
* **Purpose:** Monitors physical and electronic bank accounts, reconciling UPI, cards, bank transfers, and cheques.
* **Primary Key:** `BankTxnID` (PK)
* **Search Indexes:** `BankTxnID` (Clustered Index), `BankID` (Secondary Index), `TxnDate` (Chronological Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `BankTxnID` | Text | 20 | Yes | None | Prefix: `BNK-` followed by 5+ sequential digits | Primary Key (PK) | Bank ledger primary key. |
| 2 | `BankID` | Text | 20 | Yes | None | Must exist in `MstBanks` | Foreign Key (FK) | Target commercial account. |
| 3 | `TxnDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Date on bank receipt. |
| 4 | `VoucherRef` | Text | 50 | Yes | None | Prefix must match: `PAY-`, `REC-`, `REF-`, or `CRN-` | None | Financial transaction voucher. |
| 5 | `Deposit` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Funds debited/deposited. |
| 6 | `Withdrawal` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Funds credited/withdrawn. |
| 7 | `RunningBalance` | Currency | - | Yes | `0.00` | Calculated: `PreviousBalance + Deposit - Withdrawal` | None | Balance on commercial ledger. |
| 8 | `UTR` | Text | 50 | No | None | Alphanumeric unique bank transaction ID | None | UPI / Bank UTR trace. |
| 9 | `ChequeNo` | Text | 10 | No | None | 6-digit cheque number | None | Cheque reference if applicable. |
| 10 | `Reference` | Text | 150 | No | None | Internal transaction metadata | None | Trace notation. |
| 11 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 12 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 13 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Creating operator. |
| 14 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Modifying operator. |
| 15 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 16 | `Remarks` | Long Text | - | No | None | Clearing comments | None | Audit notes. |

---

#### 4. `AccJournal` (Journal Book)
* **Purpose:** Handles adjustment vouchers, bad debt write-offs, cross-ledger transfers, and general ledger postings.
* **Primary Key:** `JournalID` (PK)
* **Search Indexes:** `JournalID` (Clustered Index), `JournalDate` (Chronological Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `JournalID` | Text | 20 | Yes | None | Prefix: `JNL-` followed by 5+ sequential digits | Primary Key (PK) | Journal primary key. |
| 2 | `JournalDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Entry post date. |
| 3 | `DebitAccount` | Text | 100 | Yes | None | Must exist in Chart of Accounts | None | Target account debited. |
| 4 | `CreditAccount` | Text | 100 | Yes | None | Must exist in Chart of Accounts | None | Target account credited. |
| 5 | `DebitAmount` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must equal CreditAmount | None | Amount debited. |
| 6 | `CreditAmount` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must equal DebitAmount | None | Amount credited. |
| 7 | `Narration` | Text | 250 | Yes | None | Legal bookkeeping justification | None | Detailed entry note. |
| 8 | `ApprovedBy` | Text | 20 | Yes | None | Must exist in `MstUsers` with ADMIN role | Foreign Key (FK) | Auditing authority ID. |
| 9 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 10 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 11 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Creating operator. |
| 12 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Modifying operator. |
| 13 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 14 | `Remarks` | Long Text | - | No | None | Auditor audit notes | None | Internal notes. |

---

#### 5. `AccOutstandingLedger` (Outstanding Ledger)
* **Purpose:** Monitors individual invoice receivables, calculating due dates, elapsed age, and grouping them into bucket intervals (aging analysis).
* **Primary Key:** `OutstandingID` (PK)
* **Search Indexes:** `OutstandingID` (Clustered Index), `InvoiceID` (Unique Index), `CustomerID` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `OutstandingID` | Text | 20 | Yes | None | Prefix: `OUT-` followed by 5+ sequential digits | Primary Key (PK) | Outstanding entry identifier. |
| 2 | `InvoiceID` | Text | 20 | Yes | None | Must exist in `TxnInvoices` | Foreign Key (FK) | Linked invoice reference. |
| 3 | `CustomerID` | Text | 20 | Yes | None | Must exist in `MstCustomers` | Foreign Key (FK) | Linked client account. |
| 4 | `DueDate` | Date | 10 | Yes | None | Calculated based on credit terms | None | Target payment date. |
| 5 | `OutstandingAmount`| Currency| - | Yes | `0.00` | Calculated: `InvoiceGrandTotal - Payments` | None | Remaining amount receivable. |
| 6 | `AgeDays` | Number | - | Yes | `0` | Calculated: `CurrentDate - InvoiceDate` | None | Days elapsed since billing. |
| 7 | `Bucket_0_30` | Currency | - | Yes | `0.00` | Billed amount outstanding 0-30 days | None | Real-time aging cell. |
| 8 | `Bucket_31_60` | Currency | - | Yes | `0.00` | Billed amount outstanding 31-60 days | None | Real-time aging cell. |
| 9 | `Bucket_61_90` | Currency | - | Yes | `0.00` | Billed amount outstanding 61-90 days | None | Real-time aging cell. |
| 10 | `Bucket_91_Plus` | Currency | - | Yes | `0.00` | Billed amount outstanding 90+ days | None | Real-time aging cell. |
| 11 | `CollectionStatus`| Text | 20 | Yes | `NORMAL` | Must be: `NORMAL`, `REMINDED`, `OVERDUE`, `BAD_DEBT` | None | Overdue warning status. |
| 12 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 13 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 14 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Creating operator. |
| 15 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Modifying operator. |
| 16 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 17 | `Remarks` | Long Text | - | No | None | Recovery activity logs | None | Collection notes. |

---

#### 6. `AccAdvanceLedger` (Advance Ledger)
* **Purpose:** Handles unadjusted prepaid deposits from clients, matching them against subsequent invoice creations.
* **Primary Key:** `AdvanceID` (PK)
* **Search Indexes:** `AdvanceID` (Clustered Index), `CustomerID` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `AdvanceID` | Text | 20 | Yes | None | Prefix: `ADV-` followed by 5+ sequential digits | Primary Key (PK) | Advance receipt identifier. |
| 2 | `CustomerID` | Text | 20 | Yes | None | Must exist in `MstCustomers` | Foreign Key (FK) | Linked client account. |
| 3 | `AdvanceDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Receipt date of advance. |
| 4 | `PaymentID` | Text | 20 | Yes | None | Must exist in `TxnPayments` | Foreign Key (FK) | Source payment receipt. |
| 5 | `AdvanceReceived` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be > `0.00` | None | Initial prepaid amount. |
| 6 | `AdvanceUtilized` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be <= Received | None | Total adjusted on invoices. |
| 7 | `BalanceAdvance` | Currency | - | Yes | `0.00` | Calculated: `AdvanceReceived - Utilized - Refunded`| None | Current unused float. |
| 8 | `RefundedAdvance` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be <= Received | None | Excess amount repaid to client. |
| 9 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 10 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 11 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Creating operator. |
| 12 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | Modifying operator. |
| 13 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 14 | `Remarks` | Long Text | - | No | None | Special adjustments notes | None | Admin notes. |

---

### GROUP 4 – GST TABLES

The GST engine tables catalog every tax component, split intra-state (CGST/SGST) and inter-state (IGST) bookings, and maintain historical summaries for simple GSTR filing.

---

#### 1. `GstRegister` (GST Ledger Register)
* **Purpose:** Transactional register documenting tax events. Automatically records invoice details split by item line taxation parameters.
* **Primary Key:** `GstRegisterID` (PK)
* **Search Indexes:** `GstRegisterID` (Clustered Index), `InvoiceID` (Secondary Index), `GSTIN` (Index for B2B tracing)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `GstRegisterID` | Text | 20 | Yes | None | Prefix: `GST-` followed by 5+ sequential digits | Primary Key (PK) | GST register row identifier. |
| 2 | `InvoiceID` | Text | 20 | Yes | None | Must exist in `TxnInvoices` | Foreign Key (FK) | Linked source invoice. |
| 3 | `InvoiceDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Date of tax event. |
| 4 | `GSTIN` | Text | 15 | No | None | Must match Indian B2B format regex | None | Customer B2B tax ID if active. |
| 5 | `CustomerName` | Text | 100 | Yes | None | Matches corresponding client row | None | Client billing name copy. |
| 6 | `StateID` | Text | 20 | Yes | None | Must exist in `MstStates` | Foreign Key (FK) | Place of Supply (POS) state link. |
| 7 | `StateCode` | Text | 2 | Yes | None | Enforces state numerical prefix codes | None | POS identification digits. |
| 8 | `TaxableAmount` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Amount before taxes. |
| 9 | `CGST` | Currency | - | Yes | `0.00` | Calculated CGST amount | None | Central GST value. |
| 10 | `SGST` | Currency | - | Yes | `0.00` | Calculated SGST amount | None | State GST value. |
| 11 | `IGST` | Currency | - | Yes | `0.00` | Calculated IGST amount | None | Interstate Integrated tax. |
| 12 | `InvoiceValue` | Currency | - | Yes | `0.00` | Total bill valuation copy | None | Gross invoice sum copy. |
| 13 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 14 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 15 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 16 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 17 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 18 | `Remarks` | Long Text | - | No | None | POS exceptions details | None | Audit notes. |

---

#### 2. `GstHsnSacRegister` (HSN/SAC Register)
* **Purpose:** Summarizes tax liability categorized by HSN/SAC code to support GSTR-1 preparation.
* **Primary Key:** `HsnRegisterID` (PK)
* **Search Indexes:** `HsnRegisterID` (Clustered Index), `HsnSacCode` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `HsnRegisterID` | Text | 20 | Yes | None | Prefix: `HSN-` followed by 5+ sequential digits | Primary Key (PK) | HSN index row code. |
| 2 | `HsnSacCode` | Text | 8 | Yes | None | Standard GST HSN (goods) / SAC (services) | None | Tax code reference. |
| 3 | `Description` | Text | 150 | Yes | None | Matches generic GST portal lists | None | Description of category. |
| 4 | `TaxableValue` | Currency | - | Yes | `0.00` | Accumulated taxable net revenue | None | Total taxable sum under code. |
| 5 | `CGST` | Currency | - | Yes | `0.00` | Accumulated Central GST values | None | Central tax aggregated sum. |
| 6 | `SGST` | Currency | - | Yes | `0.00` | Accumulated State GST values | None | State tax aggregated sum. |
| 7 | `IGST` | Currency | - | Yes | `0.00` | Accumulated Integrated GST values | None | Integrated tax aggregated sum. |
| 8 | `TotalGst` | Currency | - | Yes | `0.00` | Calculated: `CGST + SGST + IGST` | None | Gross tax liabilities. |
| 9 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 10 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 11 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 12 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 13 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 14 | `Remarks` | Long Text | - | No | None | Code category annotations | None | Audit notes. |

---

#### 3. `GstMonthlySummary` (Monthly GST Summary)
* **Purpose:** Summarizes tax liabilities by month, separating B2B and B2C channels, and subtracting credit note revisions.
* **Primary Key:** `MonthlyGstID` (PK)
* **Search Indexes:** `MonthlyGstID` (Clustered Index), `CalendarMonth` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `MonthlyGstID` | Text | 20 | Yes | None | Prefix: `GSM-` followed by 5+ sequential digits | Primary Key (PK) | Monthly index primary key. |
| 2 | `CalendarMonth` | Text | 7 | Yes | None | Format: `YYYY-MM` (e.g. `2026-08`) | None | Targeted calendar month. |
| 3 | `B2BSales` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Gross taxable B2B sales. |
| 4 | `B2CSales` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Gross taxable B2C sales. |
| 5 | `CreditNotesAdjusted`| Currency| - | Yes | `0.00` | Sum of credit note values | None | Total CN deductions. |
| 6 | `RefundsAdjusted` | Currency | - | Yes | `0.00` | Sum of refund values | None | Total refund deductions. |
| 7 | `TaxableTurnover` | Currency | - | Yes | `0.00` | Calculated: `B2B + B2C - CN - Refund` | None | Net taxable turnover. |
| 8 | `CGSTAmount` | Currency | - | Yes | `0.00` | Gross central tax booked | None | Month-end central tax liability. |
| 9 | `SGSTAmount` | Currency | - | Yes | `0.00` | Gross state tax booked | None | Month-end state tax liability. |
| 10 | `IGSTAmount` | Currency | - | Yes | `0.00` | Gross integrated tax booked | None | Month-end integrated tax liability. |
| 11 | `TotalGstCollected`| Currency | - | Yes | `0.00` | Calculated: `CGST + SGST + IGST` | None | Gross collection total. |
| 12 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 13 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 14 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 15 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 16 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 17 | `Remarks` | Long Text | - | No | None | Adjustments reconciliation comments | None | Bookkeeping annotations. |

---

#### 4. `GstQuarterlySummary` (Quarterly GST Summary)
* **Purpose:** Compiles tax liabilities by quarter (Q1-Q4) to identify seasonal shifts, year-over-year variances, and tax trends.
* **Primary Key:** `QuarterlyGstID` (PK)
* **Search Indexes:** `QuarterlyGstID` (Clustered Index), `FinancialQuarter` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `QuarterlyGstID` | Text | 20 | Yes | None | Prefix: `GSQ-` followed by 5+ sequential digits | Primary Key (PK) | Quarterly index primary key. |
| 2 | `FinancialQuarter`| Text | 7 | Yes | None | Format: `FY-QX` (e.g. `26-27-Q2`) | None | Targeted fiscal quarter. |
| 3 | `QuarterSales` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Total revenue for the quarter. |
| 4 | `QuarterTaxable` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Taxable net turnover. |
| 5 | `QuarterCGST` | Currency | - | Yes | `0.00` | Accumulated Central GST values | None | Central tax. |
| 6 | `QuarterSGST` | Currency | - | Yes | `0.00` | Accumulated State GST values | None | State tax. |
| 7 | `QuarterIGST` | Currency | - | Yes | `0.00` | Accumulated Integrated GST values | None | Integrated tax. |
| 8 | `QuarterGstTotal` | Currency | - | Yes | `0.00` | Calculated: `CGST + SGST + IGST` | None | Gross tax liability. |
| 9 | `GrowthVariance` | Percentage| - | Yes | `0.00` | Scale: 2 decimals | None | Growth compared to previous quarter. |
| 10 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 11 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 12 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 13 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 14 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 15 | `Remarks` | Long Text | - | No | None | Quarter reconciliation notes | None | Internal comments. |

---

#### 5. `GstAnnualSummary` (Annual GST Summary)
* **Purpose:** Year-end tax ledger compiling monthly performance, verifying tax brackets, and preparing data for annual filing.
* **Primary Key:** `AnnualGstID` (PK)
* **Search Indexes:** `AnnualGstID` (Clustered Index), `FinancialYear` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `AnnualGstID` | Text | 20 | Yes | None | Prefix: `GSA-` followed by 5+ sequential digits | Primary Key (PK) | Annual index primary key. |
| 2 | `FinancialYear` | Text | 10 | Yes | None | Format: `YYYY-YY` (e.g. `2026-27`) | None | Billed fiscal year. |
| 3 | `AnnualSales` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Gross billing revenue. |
| 4 | `AnnualTaxable` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Taxable net turnover. |
| 5 | `AnnualCGST` | Currency | - | Yes | `0.00` | Accumulated Central GST values | None | Central tax. |
| 6 | `AnnualSGST` | Currency | - | Yes | `0.00` | Accumulated State GST values | None | State tax. |
| 7 | `AnnualIGST` | Currency | - | Yes | `0.00` | Accumulated Integrated GST values | None | Integrated tax. |
| 8 | `AnnualGstTotal` | Currency | - | Yes | `0.00` | Calculated: `CGST + SGST + IGST` | None | Gross tax liability. |
| 9 | `AuditCheckPassed`| Boolean | - | Yes | `TRUE` | Value must be `TRUE` or `FALSE` | None | Verification flag. |
| 10 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 11 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 12 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 13 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 14 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 15 | `Remarks` | Long Text | - | No | None | Annual tax audit comments | None | Audit annotations. |

---

### GROUP 5 – REPORT TABLES

Reporting tables support analytical views, allowing the system to aggregate, filter, and organize records by date ranges, customers, rooms, or tax codes.

---

#### 1. `RptSalesRegister` (Sales Register)
* **Purpose:** Consolidates sales data by invoice, date, customer, tax bracket, and payment status.
* **Primary Key:** `SalesReportID` (PK)
* **Search Indexes:** `SalesReportID` (Clustered Index), `InvoiceID` (Unique Index), `InvoiceDate` (Chronological Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `SalesReportID` | Text | 20 | Yes | None | Prefix: `RSL-` followed by 5+ sequential digits | Primary Key (PK) | Sales report primary identifier. |
| 2 | `InvoiceID` | Text | 20 | Yes | None | Must exist in `TxnInvoices` | Foreign Key (FK) | Linked source invoice. |
| 3 | `InvoiceNumber` | Text | 50 | Yes | None | Copy of the serialized invoice number | None | Normalized document locator. |
| 4 | `InvoiceDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Billing date. |
| 5 | `CustomerID` | Text | 20 | Yes | None | Must exist in `MstCustomers` | Foreign Key (FK) | Linked customer. |
| 6 | `CustomerName` | Text | 100 | Yes | None | Copy of the client full name | None | Client name for search filters. |
| 7 | `TaxableAmount` | Currency | - | Yes | `0.00` | Net taxable amount | None | Revenue before taxes. |
| 8 | `TotalTax` | Currency | - | Yes | `0.00` | Calculated: `CGST + SGST + IGST` | None | Billed GST total. |
| 9 | `InvoiceTotal` | Currency | - | Yes | `0.00` | Total bill valuation | None | Grand total copy. |
| 10 | `AmountPaid` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Paid amount copy. |
| 11 | `Outstanding` | Currency | - | Yes | `0.00` | Calculated: `InvoiceTotal - AmountPaid` | None | Outstanding amount copy. |
| 12 | `PaymentStatus` | Text | 15 | Yes | None | Copy of the payment status | None | Payment lifecycle stage. |
| 13 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 14 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 15 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 16 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 17 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 18 | `Remarks` | Long Text | - | No | None | Special notes | None | Internal comments. |

---

#### 2. `RptReceiptRegister` (Receipt Register)
* **Purpose:** Consolidates cash and bank receipts to support payment reconciliation.
* **Primary Key:** `ReceiptReportID` (PK)
* **Search Indexes:** `ReceiptReportID` (Clustered Index), `ReceiptID` (Unique Index), `ReceiptDate` (Chronological Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `ReceiptReportID`| Text | 20 | Yes | None | Prefix: `RRP-` followed by 5+ sequential digits | Primary Key (PK) | Receipt report primary identifier. |
| 2 | `ReceiptID` | Text | 20 | Yes | None | Must exist in `TxnReceipts` | Foreign Key (FK) | Linked source receipt voucher. |
| 3 | `ReceiptNumber` | Text | 50 | Yes | None | Copy of receipt number | None | Document locator. |
| 4 | `ReceiptDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Receipt date. |
| 5 | `PaymentID` | Text | 20 | Yes | None | Must exist in `TxnPayments` | Foreign Key (FK) | Cashflow payment reference. |
| 6 | `PaymentMode` | Text | 30 | Yes | None | Copy of the payment mode | None | Option used (e.g., Cash, UPI). |
| 7 | `CashAmount` | Currency | - | Yes | `0.00` | Collected cash amount | None | Cash amount split. |
| 8 | `UpiAmount` | Currency | - | Yes | `0.00` | Collected UPI amount | None | UPI amount split. |
| 9 | `BankTransfer` | Currency | - | Yes | `0.00` | Collected electronic transfer amount | None | Electronic transfer split. |
| 10 | `CardAmount` | Currency | - | Yes | `0.00` | Collected POS card swipe amount | None | Card swipe split. |
| 11 | `ChequeAmount` | Currency | - | Yes | `0.00` | Collected physical cheque amount | None | Cheque split. |
| 12 | `TotalAmount` | Currency | - | Yes | `0.00` | Calculated: Sum of mode amounts | None | Gross receipt total. |
| 13 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 14 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 15 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 16 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 17 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 18 | `Remarks` | Long Text | - | No | None | Special notes | None | Internal comments. |

---

#### 3. `RptOutstandingReport` (Outstanding Report)
* **Purpose:** Monitors customer receivables to support aging analysis and collection tracking.
* **Primary Key:** `OutstandingRptID` (PK)
* **Search Indexes:** `OutstandingRptID` (Clustered Index), `CustomerID` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `OutstandingRptID`| Text | 20 | Yes | None | Prefix: `ROS-` followed by 5+ sequential digits | Primary Key (PK) | Outstanding report primary identifier. |
| 2 | `CustomerID` | Text | 20 | Yes | None | Must exist in `MstCustomers` | Foreign Key (FK) | Reference link to client. |
| 3 | `CustomerName` | Text | 100 | Yes | None | Copy of customer name | None | Client name for search filters. |
| 4 | `Mobile` | Text | 15 | Yes | None | Normalized primary phone copy | None | Contact number. |
| 5 | `TotalInvoiced` | Currency | - | Yes | `0.00` | Sum of customer invoices | None | Gross sales amount. |
| 6 | `TotalPaid` | Currency | - | Yes | `0.00` | Sum of customer payments | None | Total payments recorded. |
| 7 | `NetOutstanding` | Currency | - | Yes | `0.00` | Calculated: `TotalInvoiced - TotalPaid` | None | Net balance receivable. |
| 8 | `Age_0_30_Days` | Currency | - | Yes | `0.00` | Outstanding sum 0-30 days | None | Real-time aging bucket. |
| 9 | `Age_31_60_Days` | Currency | - | Yes | `0.00` | Outstanding sum 31-60 days | None | Real-time aging bucket. |
| 10 | `Age_61_90_Days` | Currency | - | Yes | `0.00` | Outstanding sum 61-90 days | None | Real-time aging bucket. |
| 11 | `Age_91_Plus` | Currency | - | Yes | `0.00` | Outstanding sum 90+ days | None | Real-time aging bucket. |
| 12 | `LastPaymentDate` | Date | 10 | No | None | Date of most recent payment | None | Last payment trace. |
| 13 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 14 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 15 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 16 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 17 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 18 | `Remarks` | Long Text | - | No | None | Collection status notes | None | Follow-up logs. |

---

#### 4. `RptRevenueReport` (Revenue Report)
* **Purpose:** Analyzes revenue distribution by service type, boarding stay, daycare check-in, and package selection.
* **Primary Key:** `RevenueReportID` (PK)
* **Search Indexes:** `RevenueReportID` (Clustered Index), `RevenuePeriod` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `RevenueReportID`| Text | 20 | Yes | None | Prefix: `RRV-` followed by 5+ sequential digits | Primary Key (PK) | Revenue report primary identifier. |
| 2 | `RevenuePeriod` | Text | 10 | Yes | None | Format: `YYYY-MM` or `YYYY-QX` or `YYYY` | None | Calendar period (month, quarter, year). |
| 3 | `BoardingRevenue` | Currency | - | Yes | `0.00` | Total revenue from boarding stays | None | Billed boarding revenue. |
| 4 | `DaycareRevenue` | Currency | - | Yes | `0.00` | Total revenue from daycare check-ins | None | Billed daycare revenue. |
| 5 | `PackageRevenue` | Currency | - | Yes | `0.00` | Total revenue from packages | None | Billed package revenue. |
| 6 | `ServiceRevenue` | Currency | - | Yes | `0.00` | Total revenue from individual services | None | Billed catalog service revenue. |
| 7 | `Miscellaneous` | Currency | - | Yes | `0.00` | Other revenue adjustments | None | Miscellaneous billings. |
| 8 | `GrossRevenue` | Currency | - | Yes | `0.00` | Calculated: Sum of category revenues | None | Total period revenue. |
| 9 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 10 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 11 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 12 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 13 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 14 | `Remarks` | Long Text | - | No | None | Explanatory notes | None | Internal comments. |

---

#### 5. `RptCustomerStatement` (Customer Statement)
* **Purpose:** Generates a chronological ledger statement for individual customers.
* **Primary Key:** `StatementID` (PK)
* **Search Indexes:** `StatementID` (Clustered Index), `CustomerID` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `StatementID` | Text | 20 | Yes | None | Prefix: `RCS-` followed by 5+ sequential digits | Primary Key (PK) | Statement entry primary key. |
| 2 | `CustomerID` | Text | 20 | Yes | None | Must exist in `MstCustomers` | Foreign Key (FK) | Reference link to client. |
| 3 | `StatementDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Date of statement post. |
| 4 | `Description` | Text | 200 | Yes | None | Plaintext detail (e.g. Invoice, Payment) | None | Transaction label. |
| 5 | `ReferenceVoucher`| Text | 50 | Yes | None | Alphanumeric source identifier | None | Document key. |
| 6 | `DebitAmount` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Debit amount. |
| 7 | `CreditAmount` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Credit amount. |
| 8 | `RunningBalance` | Currency | - | Yes | `0.00` | Cumulative total outstanding due | None | Running balance. |
| 9 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 10 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 11 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 12 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 13 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 14 | `Remarks` | Long Text | - | No | None | Special notes | None | Internal comments. |

---

#### 6. `RptPetBoardingReport` (Pet Boarding Report)
* **Purpose:** Monitors kennel and suite resource allocations, occupancy levels, and length-of-stay metrics.
* **Primary Key:** `BoardingReportID` (PK)
* **Search Indexes:** `BoardingReportID` (Clustered Index), `RoomID` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `BoardingReportID`| Text | 20 | Yes | None | Prefix: `RBR-` followed by 5+ sequential digits | Primary Key (PK) | Boarding report primary identifier. |
| 2 | `RoomID` | Text | 20 | Yes | None | Must exist in `MstRooms` | Foreign Key (FK) | Room reference. |
| 3 | `RoomNumber` | Text | 20 | Yes | None | Copy of the door number | None | Room locator label. |
| 4 | `TotalDaysBilled` | Number | - | Yes | `0` | Sum of stay days billed in period | None | Capacity metrics. |
| 5 | `TotalDaysOccupied`| Number | - | Yes | `0` | Actual active boarding stay days | None | Capacity metrics. |
| 6 | `UtilizationRatio`| Percentage| - | Yes | `0.00` | Calculated: `DaysOccupied / AvailableDays` | None | Capacity metrics. |
| 7 | `AverageStayDays` | Decimal | - | Yes | `0.00` | Calculated: `DaysOccupied / StayRecords` | None | Average stay duration. |
| 8 | `RevenueEarned` | Currency | - | Yes | `0.00` | Cumulative boarding fees earned | None | Revenue. |
| 9 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 10 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 11 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 12 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 13 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 14 | `Remarks` | Long Text | - | No | None | Special notes | None | Internal comments. |

---

### GROUP 6 – DASHBOARD TABLES

Dashboard sheets store compiled metric cards, aggregated data points, and performance indicators to provide fast homepage loading without re-querying raw transaction sheets.

---

#### 1. `DshData` (Dashboard Data)
* **Purpose:** Stores the single active dashboard snapshot. (Exactly 1 Row of active configuration)
* **Primary Key:** `DashboardID` (PK)
* **Search Indexes:** `DashboardID` (Clustered Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `DashboardID` | Text | 20 | Yes | `DSH-001` | Static ID value | Primary Key (PK) | Single snapshot identifier. |
| 2 | `AsOfDateTime` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last dashboard cache build. |
| 3 | `ActiveBoarders` | Number | - | Yes | `0` | Active pets in suites | None | Real-time counts. |
| 4 | `ActiveDaycare` | Number | - | Yes | `0` | Active daycare check-ins | None | Real-time counts. |
| 5 | `AvailableRooms` | Number | - | Yes | `0` | Vacant suites | None | Real-time counts. |
| 6 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 7 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 8 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 9 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 10 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 11 | `Remarks` | Long Text | - | No | None | Snapshot logs | None | Performance comments. |

---

#### 2. `DshChartsData` (Dashboard Charts Data)
* **Purpose:** Stores compiled data points for weekly and monthly trend charts.
* **Primary Key:** `ChartDataID` (PK)
* **Search Indexes:** `ChartDataID` (Clustered Index), `TrendDate` (Chronological Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `ChartDataID` | Text | 20 | Yes | None | Prefix: `DCH-` followed by 5+ sequential digits | Primary Key (PK) | Chart row identifier. |
| 2 | `TrendDate` | Date | 10 | Yes | None | ISO Standard Format: `YYYY-MM-DD` | None | Target day. |
| 3 | `SalesVolume` | Currency | - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Daily invoice revenue. |
| 4 | `CollectionVolume`| Currency| - | Yes | `0.00` | Scale: 2 decimals; must be >= `0.00` | None | Daily payments collected. |
| 5 | `CheckInVolume` | Number | - | Yes | `0` | Daily pet check-ins count | None | Care volume counts. |
| 6 | `CheckOutVolume` | Number | - | Yes | `0` | Daily pet check-outs count | None | Care volume counts. |
| 7 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 8 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 9 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 10 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 11 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 12 | `Remarks` | Long Text | - | No | None | Special data markers | None | Chart annotations. |

---

#### 3. `DshMonthlyStats` (Dashboard Monthly Stats)
* **Purpose:** Summarizes business metrics by month to track growth trends.
* **Primary Key:** `MonthlyStatID` (PK)
* **Search Indexes:** `MonthlyStatID` (Clustered Index), `CalendarMonth` (Secondary Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `MonthlyStatID` | Text | 20 | Yes | None | Prefix: `DST-` followed by 5+ sequential digits | Primary Key (PK) | Monthly stat row identifier. |
| 2 | `CalendarMonth` | Text | 7 | Yes | None | Format: `YYYY-MM` (e.g. `2026-08`) | None | Targeted calendar month. |
| 3 | `TotalSales` | Currency | - | Yes | `0.00` | Gross invoices billed | None | Monthly revenue. |
| 4 | `TotalPayments` | Currency | - | Yes | `0.00` | Gross payments collected | None | Monthly collections. |
| 5 | `TotalOutstanding`| Currency| - | Yes | `0.00` | Total unpaid receivables | None | Month-end accounts receivable. |
| 6 | `TotalCustomers` | Number | - | Yes | `0` | Unique active clients in month | None | Customer database counts. |
| 7 | `TotalPets` | Number | - | Yes | `0` | Unique active pets in month | None | Pet database counts. |
| 8 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 9 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 10 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 11 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 12 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 13 | `Remarks` | Long Text | - | No | None | Period performance markers | None | Monthly notes. |

---

#### 4. `DshKPIs` (Dashboard KPIs)
* **Purpose:** Stores key performance indicators (KPIs) to power dashboard widget cards. (Exactly 1 Row of active configuration)
* **Primary Key:** `KpiID` (PK)
* **Search Indexes:** `KpiID` (Clustered Index)
* **Column Schema:**

| Ordinal | Column Name | Data Type | Length | Required | Default Value | Validation Rules | Primary / Foreign Key | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | `KpiID` | Text | 20 | Yes | `KPI-001` | Static ID value | Primary Key (PK) | Single row locator. |
| 2 | `AsOfDateTime` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last cached build. |
| 3 | `TodayRevenue` | Currency | - | Yes | `0.00` | Total payments collected today | None | Daily collection KPI. |
| 4 | `MonthRevenue` | Currency | - | Yes | `0.00` | Total payments collected this month | None | Monthly collection KPI. |
| 5 | `TotalOutstanding`| Currency| - | Yes | `0.00` | Sum of all outstanding invoices | None | Net accounts receivable. |
| 6 | `CashBalance` | Currency | - | Yes | `0.00` | Total cash on hand | None | Cash box float. |
| 7 | `BankBalance` | Currency | - | Yes | `0.00` | Total funds in banks | None | Bank account total. |
| 8 | `TodayCheckIns` | Number | - | Yes | `0` | Boarding check-ins today | None | Traffic. |
| 9 | `TodayCheckOuts` | Number | - | Yes | `0` | Boarding check-outs today | None | Traffic. |
| 10 | `BoardingCount` | Number | - | Yes | `0` | Total active boarders | None | Care load count. |
| 11 | `DaycareCount` | Number | - | Yes | `0` | Total active daycare pets | None | Care load count. |
| 12 | `RepeatCustomers` | Number | - | Yes | `0` | Count of repeat clients | None | Customer database metrics. |
| 13 | `NewCustomers` | Number | - | Yes | `0` | Count of first-time clients | None | Customer database metrics. |
| 14 | `ActivePets` | Number | - | Yes | `0` | Count of registered active pets | None | Pet database metrics. |
| 15 | `MonthlyGst` | Currency | - | Yes | `0.00` | Total tax booked this month | None | GSTR liabilities. |
| 16 | `CreatedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Record creation timestamp. |
| 17 | `ModifiedDate` | DateTime | 19 | Yes | System Time | Valid ISO DateTime | None | Last mutation timestamp. |
| 18 | `CreatedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 19 | `ModifiedBy` | Text | 20 | Yes | None | UserID from `MstUsers` | Foreign Key (FK) | System logger. |
| 20 | `Status` | Text | 15 | Yes | `ACTIVE` | Must be: `ACTIVE`, `INACTIVE`, `ARCHIVED` | None | Record lifecycle state. |
| 21 | `Remarks` | Long Text | - | No | None | Target thresholds notes | None | KPI threshold notes. |

---

### AUTOMATIC POSTING RULES

To enforce transactional integrity, mutations on transaction sheets trigger synchronous postings across downstream ledger, GST, reporting, and dashboard sheets.

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 OPERATIONAL MUTATION                    │
                  └────────────────────────────┬────────────────────────────┘
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
       [ Invoice Save ]                 [ Payment Save ]                [ Refund Payout ]
               │                               │                               │
 ┌─────────────┴─────────────┐   ┌─────────────┴─────────────┐   ┌─────────────┴─────────────┐
 ▼                           ▼   ▼                           ▼   ▼                           ▼
- AccCustomerLedger: Debit   - AccCustomerLedger: Credit   - AccCustomerLedger: Debit
- GstRegister: Log Tax       - AccCashBook: (IF Cash Debit)- AccCashBook: (IF Cash Credit)
- RptSalesRegister: Log      - AccBankBook: (IF Bank Debit)- AccBankBook: (IF Bank Credit)
- AccOutstandingLedger: Log  - RptReceiptRegister: Log     - DshKPIs: Dec Cash/Bank
- DshKPIs: Inc Outstanding  - AccOutstandingLedger: Dec   - DshData: Dec Liquidity
                             - DshKPIs: Dec Outstanding
```

#### Rule 1: Invoice Save Workflow
Whenever an invoice (`TxnInvoices` / `TxnInvoiceItems`) is saved:
1. **Customer Ledger Posting:** Append a debit row in `AccCustomerLedger`, increasing the client's liability by `GrandTotal`.
2. **GST Register Posting:** Loop through the invoice lines and append a row in `GstRegister` split by Central (CGST) and State (SGST) columns (intra-state) or Integrated (IGST) columns (inter-state) depending on the Place of Supply (POS).
3. **Sales Register Posting:** Append or update a row in `RptSalesRegister` documenting invoice details, customer name, taxable value, GST totals, and outstanding balances.
4. **Outstanding Ledger Posting:** Append a row in `AccOutstandingLedger` mapping the invoice ID, customer ID, calculating the due date, and initializing the aging day counter (`AgeDays = 0`).
5. **Dashboard KPIs Posting:** Update `DshKPIs.TotalOutstanding` by adding the invoice `GrandTotal` and trigger an asynchronous rebuild of `DshData` charts.

#### Rule 2: Payment Save Workflow
Whenever a payment (`TxnPayments`) is saved:
1. **Customer Ledger Posting:** Append a credit row in `AccCustomerLedger`, reducing the client's liability by the payment `Amount`.
2. **Cash & Bank Book Posting:**
   * **If `Mode == 'CASH'`:** Append a debit row in `AccCashBook`, increasing physical cash on hand by `Amount`.
   * **If `Mode != 'CASH'`:** Append a deposit row in `AccBankBook` under the target `BankID`, increasing electronic bank balance by `Amount`.
3. **Receipt Register Posting:** Append a row in `RptReceiptRegister` classifying receipt splits by payment modes (Cash, UPI, Card, Transfer, Cheque).
4. **Outstanding Ledger Adjustment:** Reduce `AccOutstandingLedger.OutstandingAmount` by the paid `Amount`. If outstanding reaches `0.00`, close the record and update `TxnInvoices.PaymentStatus = 'PAID'`.
5. **Dashboard KPIs Posting:** Add payment `Amount` to `DshKPIs.TodayRevenue` and `DshKPIs.MonthRevenue`, reduce `DshKPIs.TotalOutstanding` by the corresponding amount, and update cash/bank balances.

#### Rule 3: Refund Payout Workflow
Whenever a refund payout (`TxnRefunds`) is saved:
1. **Customer Ledger Posting:** Append a debit row in `AccCustomerLedger`, increasing the client's running balance to reflect the returned payment.
2. **Cash & Bank Book Posting:**
   * **If `PaymentMode == 'CASH'`:** Append a credit row in `AccCashBook`, reducing cash on hand by the refund `Amount`.
   * **If `PaymentMode != 'CASH'`:** Append a withdrawal row in `AccBankBook` under the source bank, reducing bank balance by the refund `Amount`.
3. **Dashboard KPIs Posting:** Deduct `Amount` from `DshKPIs.TodayRevenue` and `DshKPIs.MonthRevenue`, and reduce cash/bank balance metrics.

#### Rule 4: Credit Note Save Workflow
Whenever a credit note (`TxnCreditNotes`) is saved:
1. **Customer Ledger Posting:** Append a credit row in `AccCustomerLedger`, reducing the client's liability by `Amount`.
2. **GST Register Posting:** Append a reverse/negative row in `GstRegister` documenting tax deductions, CGST/SGST/IGST splits, and the adjusted invoice ID.
3. **Sales Register Posting:** Update `RptSalesRegister.Outstanding` and reduce total invoice values by the credited amount.
4. **Outstanding Ledger Posting:** Reduce `AccOutstandingLedger.OutstandingAmount` on the parent invoice by the credit note `Amount`.

---

### AUTO RECALCULATION ENGINE

The auto recalculation engine maintains consistency across secondary analytical tables when primary records are updated, deleted, or imported.

```
                      ┌─────────────────────────────────┐
                      │    MUTATION EVENT ENTRANCE      │
                      └────────────────┬────────────────┘
                                       │ (Detects Changes)
                                       v
                      ┌─────────────────────────────────┐
                      │   DIRTY BIT FLAGGING CONTROL    │
                      │    - Dirty Indicator = TRUE     │
                      └────────────────┬────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
 [ Rebuild Ledgers ]           [ Rebuild GST summaries ]     [ Rebuild Reports ]
 - Clear AccOutstanding        - Recalculate GstMonthly      - Compile RptSalesRegister
 - Age AccOutstandingLedger    - Recalculate GstQuarterly    - Compile RptReceiptRegister
 - Re-align RunningBalance     - Recalculate GstAnnual       - Re-compile RptOutstanding
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       │ (Execution Complete)
                                       v
                      ┌─────────────────────────────────┐
                      │      DASHBOARD SYNCHRONIZER     │
                      │   - Refresh DshData & DshKPIs   │
                      │   - Clear Dirty Indicator       │
                      └─────────────────────────────────┘
```

#### Recalculation Protocols
1. **Dirty Flagging:** Any edit or delete operation on transaction sheets flags affected accounts as "dirty."
2. **Ledger Balance Recalculation:**
   * Sort all `AccCustomerLedger` rows for dirty accounts chronologically by `LedgerDate` and `CreatedDate`.
   * Re-evaluate the `RunningBalance` column sequentially from the starting opening balance to guarantee accuracy.
3. **Aging Bucket Recalculation:**
   * Recalculate `AgeDays = CurrentDate - InvoiceDate` for all unpaid records in `AccOutstandingLedger`.
   * Reallocate outstanding balances across aging buckets (`0_30`, `31_60`, `61_90`, `91_Plus`) based on the updated `AgeDays`.
4. **GST Aggregate Recalculation:**
   * Recalculate `GstMonthlySummary`, `GstQuarterlySummary`, and `GstAnnualSummary` values by aggregating active rows in `GstRegister` and `GstHsnSacRegister`.
5. **Dashboard Cache Refresh:**
   * Query `AccCashBook` and `AccBankBook` balances to update `DshKPIs.CashBalance` and `DshKPIs.BankBalance`.
   * Count active suites in `TxnBoarding` and active daycare entries in `TxnDaycare` to refresh live gauges on `DshData`.
   * Clear the dirty flag upon successful serialization.

---

## Part 11E – Formula Blueprint & Sheet Wiring Engine

This section details the complete Formula Engine, Sheet Wiring Architecture, Lookup System, Auto Calculation Logic, Data Validation Framework, Posting Engine, and Relational Formula Blueprint for `THOP_BILLING_DATABASE.xlsx`. 

This system guarantees that the workbook acts like an enterprise relational database while remaining 100% compatible with native Microsoft Excel 365, Excel for the Web, and legacy desktop versions.

---

### 1. FORMULA PHILOSOPHY & CALCULATION LIFECYCLE

An enterprise spreadsheet database must avoid the common pitfalls of slow performance, circular references, and corrupted historical data. `THOP_BILLING_DATABASE.xlsx` implements a strict bifurcated data model:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THOP CALCULATIVE MODEL                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
┌─────────────────────────────────┐                 ┌────────────────────┐
│      TRANSACTION SHEETS         │                 │ ANALYTICAL SHEETS  │
│      - Static values            │                 │ - Dynamic formulas │
│      - App-generated post       │                 │ - Real-time lookup │
│      - Hardcoded once saved     │                 │ - Auto-aggregates  │
└─────────────────────────────────┘                 └────────────────────┘
```

#### Core Axioms:
1. **Transaction Hardening:** Historical transactional records (e.g., `TxnInvoices`, `TxnPayments`, `TxnRefunds`) **MUST NOT** contain volatile cell formulas. Once a transaction is successfully processed and saved by the application, all data rows are written as hard values. This prevents retro-active value mutation if master tables are modified in the future.
2. **Formula Placement Rule:** Formulas are strictly reserved for:
   * **Dashboard Sheets** (`DshData`, `DshKPIs`)
   * **Report Sheets** (`RptSalesRegister`, `RptReceiptRegister`, `RptOutstandingReport`, `RptRevenueReport`)
   * **Summary Sheets** (`GstMonthlySummary`, `GstQuarterlySummary`, `GstAnnualSummary`)
   * **Validation Cells / Sheets** (`WorkbookIntegrityChecker`)
3. **No Volatile Functions:** Functions that recalculate on every worksheet change (such as `INDIRECT`, `OFFSET`, `TODAY`, `NOW`) are strictly banned from active tables. Instead, modern dynamic range expressions, named ranges, and standard deterministic indexes (`XLOOKUP`, `INDEX`, `MATCH`) are used to optimize speed.

---

### 2. ENTERPRISE SHEET WIRING ARCHITECTURE

To prevent circular dependency errors, data must flow in a single, unidirectional path. Circular references are physically blocked by our structural architecture.

#### Unidirectional Dependency Flow:
```
  [ Master Sheets ] 
  (MstCustomers, MstPets, MstServices, MstPackages, MstRooms, MstGSTRates, MstBanks, MstStates)
         │
         ▼
  [ Transaction Sheets ] 
  (TxnInvoices, TxnInvoiceItems, TxnPayments, TxnRefunds, TxnCreditNotes)
         │
         ▼
  [ Ledger & GST Registers ] 
  (AccCustomerLedger, AccCashBook, AccBankBook, AccOutstandingLedger, AccAdvanceLedger, GstRegister)
         │
         ▼
  [ Report Registers ] 
  (RptSalesRegister, RptReceiptRegister, RptOutstandingReport, RptRevenueReport, RptCustomerStatement)
         │
         ▼
  [ Dashboard Engine ] 
  (DshData, DshKPIs, DshChartsData, DshMonthlyStats)
```

#### Detailed Dependency Links:
* `MstCustomers` keys feed into `MstPets` (Owner Link), `TxnInvoices` (Billing Target), `TxnPayments` (Receipt Source), and `AccCustomerLedger` (Sub-ledger Key).
* `MstPets` keys feed into `TxnBoarding` and `TxnDaycare` (Active Guest Profile).
* `MstRooms` keys feed into `TxnBoarding` (Suite Allocation).
* `TxnInvoices` keys feed directly into `TxnInvoiceItems` (Parent-Child relation) and `GstRegister` (Tax base).
* `TxnPayments` links to `TxnInvoices` (Balance settlement invoice reference).
* `AccCustomerLedger` pulls directly from `TxnInvoices` (Debits) and `TxnPayments` (Credits) to calculate the unified Accounts Receivable balances.

---

### 3. LOOKUP ARCHITECTURE (DROPDOWN SCHEMAS)

All dropdown controls within the user interface sheet or transaction data forms query exclusively from Master Tables. **Hardcoding dropdown strings (e.g., "Cash", "UPI") directly inside Data Validation ranges is strictly forbidden.**

#### Named Range Definitions for Dropdowns:

| Named Range Name | Source Table & Column | Validation Error Message | Description |
|---|---|---|---|
| `rng_MstCustomers` | `tbl_MstCustomers[CustomerID]` | "Invalid Customer Selected. Choose from list." | List of active customer unique IDs. |
| `rng_MstPets` | `tbl_MstPets[PetID]` | "Invalid Pet ID. Choose from active registered list." | List of active registered pets. |
| `rng_MstServices` | `tbl_MstServices[ServiceID]` | "Invalid Service ID. Select from standard catalog." | Valid billing service codes. |
| `rng_MstPackages` | `tbl_MstPackages[PackageID]` | "Invalid Package. Choose from active bundles." | Dynamic service packages list. |
| `rng_MstRooms` | `tbl_MstRooms[RoomID]` | "Invalid Suite ID. Select from kennel layout." | Available physical boarding chambers. |
| `rng_MstGSTRates` | `tbl_MstGSTRates[TaxRate]` | "Invalid Tax Rate. Select from standard slabs." | Legal GST tax slabs (0%, 5%, 12%, 18%, 28%). |
| `rng_MstPaymentModes`| `tbl_MstPaymentModes[ModeCode]`| "Invalid Payment Mode. Choose supported tender." | Standard modes (CASH, UPI, CARD, BANK_TRANSFER, CHEQUE).|
| `rng_MstBanks` | `tbl_MstBanks[BankID]` | "Invalid Bank. Select from active liquid accounts." | List of company operational bank accounts. |
| `rng_MstStates` | `tbl_MstStates[StateID]` | "Invalid State Code. POS must be a standard state." | All 36 Indian States & UT codes (e.g., '07-DL'). |

---

### 4. AUTO LOOKUP ENGINE

When a target entity (`CustomerID` or `PetID`) is selected on an active input card or transaction form, the system automatically retrieves full profile attributes. This engine is built using fast `XLOOKUP` formulas coupled with comprehensive error trapping.

#### Formula Specifications:

* **Customer Details Lookup (On selection of `TargetCustomerID` in cell `C4`):**
  * **Customer Name:**
    ```excel
    =IFERROR(XLOOKUP(C4, tbl_MstCustomers[CustomerID], tbl_MstCustomers[CustomerName]), "MISSING_CUSTOMER")
    ```
  * **Billing Address:**
    ```excel
    =IFERROR(XLOOKUP(C4, tbl_MstCustomers[CustomerID], tbl_MstCustomers[Address]), "No Registered Address")
    ```
  * **GSTIN:**
    ```excel
    =IFERROR(XLOOKUP(C4, tbl_MstCustomers[CustomerID], tbl_MstCustomers[GSTIN]), "UNREGISTERED_B2C")
    ```
  * **Place of Supply State Code:**
    ```excel
    =IFERROR(XLOOKUP(C4, tbl_MstCustomers[CustomerID], tbl_MstCustomers[StateCode]), "07")
    ```
  * **Primary Contact Phone:**
    ```excel
    =IFERROR(XLOOKUP(C4, tbl_MstCustomers[CustomerID], tbl_MstCustomers[Mobile]), "")
    ```
  * **Customer Type Classification:**
    ```excel
    =IFERROR(XLOOKUP(C4, tbl_MstCustomers[CustomerID], tbl_MstCustomers[CustomerType]), "RETAIL")
    ```
  * **Real-time Account Outstanding:**
    ```excel
    =IFERROR(SUMIFS(tbl_AccCustomerLedger[Debit], tbl_AccCustomerLedger[CustomerID], C4) - SUMIFS(tbl_AccCustomerLedger[Credit], tbl_AccCustomerLedger[CustomerID], C4), 0.00)
    ```

* **Pet Details Lookup (On selection of `TargetPetID` in cell `C10`):**
  * **Species Classification:**
    ```excel
    =IFERROR(XLOOKUP(C10, tbl_MstPets[PetID], tbl_MstPets[Species]), "UNKNOWN")
    ```
  * **Breed Detail:**
    ```excel
    =IFERROR(XLOOKUP(C10, tbl_MstPets[PetID], tbl_MstPets[Breed]), "")
    ```
  * **Vaccination Compliance Check:**
    ```excel
    =IF(IFERROR(XLOOKUP(C10, tbl_MstPets[PetID], tbl_MstPets[VaccinationStatus]), "EXPIRED")="UP_TO_DATE", "PASSED", "WARNING_EXPIRED")
    ```
  * **Special Medical Instructions:**
    ```excel
    =IFERROR(XLOOKUP(C10, tbl_MstPets[PetID], tbl_MstPets[MedicalNotes]), "None")
    ```
  * **Dietary Preferences:**
    ```excel
    =IFERROR(XLOOKUP(C10, tbl_MstPets[PetID], tbl_MstPets[FoodPreference]), "Standard")
    ```

---

### 5. INVOICE FORMULA ENGINE & INDIAN FORMATTING

The billing engine handles calculations at the line-item and aggregate level, adhering to standard Indian tax rules and specific currency formats.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INVOICE AGGREGATION CELL                        │
├────────────────────────────────────────────────────────────────────────┤
│  Line-Item Total  = [ Qty * Rate ] - Discount                          │
│  Intra-state Tax  = POS == CompanyState => CGST (9%) & SGST (9%)       │
│  Inter-state Tax  = POS != CompanyState => IGST (18%)                  │
│  Round-off Diff   = MROUND(GrossTotal, 1.00) - GrossTotal              │
│  Grand Total      = TaxableValue + CGST + SGST + IGST + RoundOff       │
└────────────────────────────────────────────────────────────────────────┘
```

#### Calculated Fields & Standard Formulas:

* **Item Line Taxable Value (Row `12`):**
  * Formula:
    ```excel
    =LET(qty, tbl_TxnInvoiceItems[Quantity][@Row], rate, tbl_TxnInvoiceItems[UnitPrice][@Row], disc, tbl_TxnInvoiceItems[DiscountAmount][@Row], IFERROR((qty * rate) - disc, 0.00))
    ```
* **Line-Item Tax Division Logic (CGST/SGST vs. IGST):**
  * **Company Base State:** Standardized as Named Constant `cfg_CompanyState` (value `"07-DL"`).
  * **Transaction POS:** Located in cell `H4`.
  * **CGST Rate Lookup & Calculation:**
    ```excel
    =LET(taxRate, XLOOKUP(tbl_TxnInvoiceItems[ServiceID][@Row], tbl_MstServices[ServiceID], tbl_MstServices[TaxRate]), IF(H4=cfg_CompanyState, ROUND((tbl_TxnInvoiceItems[TaxableValue][@Row] * (taxRate / 2)), 2), 0.00))
    ```
  * **SGST Rate Lookup & Calculation:**
    ```excel
    =LET(taxRate, XLOOKUP(tbl_TxnInvoiceItems[ServiceID][@Row], tbl_MstServices[ServiceID], tbl_MstServices[TaxRate]), IF(H4=cfg_CompanyState, ROUND((tbl_TxnInvoiceItems[TaxableValue][@Row] * (taxRate / 2)), 2), 0.00))
    ```
  * **IGST Rate Lookup & Calculation:**
    ```excel
    =LET(taxRate, XLOOKUP(tbl_TxnInvoiceItems[ServiceID][@Row], tbl_MstServices[ServiceID], tbl_MstServices[TaxRate]), IF(H4<>cfg_CompanyState, ROUND((tbl_TxnInvoiceItems[TaxableValue][@Row] * taxRate), 2), 0.00))
    ```

* **Invoice Master Summary Block:**
  * **Total Taxable value (`SumTaxable` cell `J38`):**
    ```excel
    =SUM(tbl_TxnInvoiceItems[TaxableValue])
    ```
  * **Total CGST (`SumCGST` cell `J39`):**
    ```excel
    =SUM(tbl_TxnInvoiceItems[CGST])
    ```
  * **Total SGST (`SumSGST` cell `J40`):**
    ```excel
    =SUM(tbl_TxnInvoiceItems[SGST])
    ```
  * **Total IGST (`SumIGST` cell `J41`):**
    ```excel
    =SUM(tbl_TxnInvoiceItems[IGST])
    ```
  * **Net Subtotal (`SubTotal` cell `J42`):**
    ```excel
    =J38 + J39 + J40 + J41
    ```
  * **Precision Round Off Adjustment (`RoundOff` cell `J43`):**
    ```excel
    =ROUND(J42, 0) - J42
    ```
  * **Invoice Grand Total (`GrandTotal` cell `J44`):**
    ```excel
    =J42 + J43
    ```

* **Dynamic Payment Status Indicator (`PaymentStatus` cell `J45`):**
  * Formula:
    ```excel
    =LET(paid, SUMIFS(tbl_TxnPayments[AmountPaid], tbl_TxnPayments[InvoiceID], TargetInvoiceID), IF(paid>=J44, "PAID", IF(paid>0, "PARTIAL", "UNPAID")))
    ```

* **Indian Currency Formatting:**
  * To enforce formatting like `₹ 12,50,000.00` across summary nodes, use Excel Custom Number Formatting:
    ```
    [$₹-4009] #,##,##0.00;($₹-4009) #,##,##0.00;"-"
    ```

* **Indian English Amount in Words Converter (Cell `B46`):**
  * Replaces complex macro integrations with a pure, standard dynamic array `LAMBDA` formula named `SPELL_INDIAN_RUPEES`.
  * Definition of Named Lambda `SPELL_INDIAN_RUPEES(val)`:
    ```excel
    =LAMBDA(val, LET(
      Rup, INT(val),
      Pse, ROUND((val - Rup)*100, 0),
      Words1, {"", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"},
      Words10, {"", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"},
      SpellUnder100, LAMBDA(n, IF(n<20, INDEX(Words1, n+1), LET(t, INT(n/10), u, MOD(n, 10), INDEX(Words10, t+1) & IF(u>0, " " & INDEX(Words1, u+1), "")))),
      SpellUnder1000, LAMBDA(n, LET(h, INT(n/100), r, MOD(n, 100), IF(h>0, INDEX(Words1, h+1) & " Hundred" & IF(r>0, " and " & SpellUnder100(r), ""), SpellUnder100(r)))),
      SpellLakhs, LAMBDA(n, LET(lk, INT(n/100000), r, MOD(n, 100000), IF(lk>0, SpellUnder100(lk) & " Lakh" & IF(r>0, " " & SpellUnder1000(r), ""), SpellUnder1000(r)))),
      SpellCrores, LAMBDA(n, LET(cr, INT(n/10000000), r, MOD(n, 10000000), IF(cr>0, SpellUnder100(cr) & " Crore" & IF(r>0, " " & SpellLakhs(r), ""), SpellLakhs(r)))),
      SpellThousands, LAMBDA(n, LET(th, INT(n/1000), r, MOD(n, 1000), IF(th>0, SpellUnder100(th) & " Thousand" & IF(r>0, " " & SpellUnder1000(r), ""), SpellUnder1000(r)))),
      ProcessRupees, LET(
        cr, INT(Rup/10000000),
        rem1, MOD(Rup, 10000000),
        lk, INT(rem1/100000),
        rem2, MOD(rem1, 100000),
        th, INT(rem2/1000),
        rem3, MOD(rem2, 1000),
        TextCrores, IF(cr>0, SpellUnder100(cr) & " Crore ", ""),
        TextLakhs, IF(lk>0, SpellUnder100(lk) & " Lakh ", ""),
        TextThousands, IF(th>0, SpellUnder100(th) & " Thousand ", ""),
        TextHundreds, IF(rem3>0, SpellUnder1000(rem3), ""),
        Trim(TextCrores & TextLakhs & TextThousands & TextHundreds)
      ),
      ProcessPaise, IF(Pse>0, " and " & SpellUnder100(Pse) & " Paise", ""),
      IF(Rup=0, "Zero Rupees Only", "Rupees " & ProcessRupees & ProcessPaise & " Only")
    ))
    ```
  * In Cell `B46`, simply call:
    ```excel
    =IFERROR(SPELL_INDIAN_RUPEES(J44), "Invalid Number")
    ```

---

### 6. PARTIAL PAYMENT & OUTSTANDING ENGINE

To support partial bill payments while maintaining structural data integrity, the billing engine links one invoice to an unlimited number of payment installments.

```
[ Invoice J44: ₹21,240 ] ──┬──► Installment 1 (tbl_TxnPayments):  ₹7,000
                           ├──► Installment 2 (tbl_TxnPayments):  ₹3,000
                           ├──► Installment 3 (tbl_TxnPayments):  ₹5,000
                           │
                           └──► Remaining Balance (J47 Formula):  ₹6,240
```

#### Calculations:

* **Billed Invoice Grand Total (`BilledTotal`):** Hard value inside `tbl_TxnInvoices`.
* **Total Collected Installments Formula:**
  ```excel
  =IFERROR(SUMIFS(tbl_TxnPayments[AmountPaid], tbl_TxnPayments[InvoiceID], tbl_TxnInvoices[InvoiceID][@Row]), 0.00)
  ```
* **Adjustments & Credit Notes Deduction Formula:**
  ```excel
  =IFERROR(SUMIFS(tbl_TxnCreditNotes[Amount], tbl_TxnCreditNotes[InvoiceID], tbl_TxnInvoices[InvoiceID][@Row]), 0.00)
  ```
* **Net Remaining Outstanding Balance Formula:**
  ```excel
  =LET(billed, tbl_TxnInvoices[GrandTotal][@Row], payments, SUMIFS(tbl_TxnPayments[AmountPaid], tbl_TxnPayments[InvoiceID], tbl_TxnInvoices[InvoiceID][@Row]), CN, SUMIFS(tbl_TxnCreditNotes[Amount], tbl_TxnCreditNotes[InvoiceID], tbl_TxnInvoices[InvoiceID][@Row]), IFERROR(billed - payments - CN, 0.00))
  ```

---

### 7. OUTSTANDING AGING BUCKET SCHEMAS

The system aggregates unpaid invoice liabilities into chronological age classifications.

#### Formulas for `AccOutstandingLedger`:

* **Days Elapsed (`AgeDays`):**
  ```excel
  =LET(invDate, tbl_AccOutstandingLedger[InvoiceDate][@Row], IFERROR(TODAY() - invDate, 0))
  ```
* **Aging Bucket 0-30 Days:**
  ```excel
  =IF(AND(AgeDays>=0, AgeDays<=30), tbl_AccOutstandingLedger[OutstandingAmount][@Row], 0.00)
  ```
* **Aging Bucket 31-60 Days:**
  ```excel
  =IF(AND(AgeDays>=31, AgeDays<=60), tbl_AccOutstandingLedger[OutstandingAmount][@Row], 0.00)
  ```
* **Aging Bucket 61-90 Days:**
  ```excel
  =IF(AND(AgeDays>=61, AgeDays<=90), tbl_AccOutstandingLedger[OutstandingAmount][@Row], 0.00)
  ```
* **Aging Bucket 91-120 Days:**
  ```excel
  =IF(AND(AgeDays>=91, AgeDays<=120), tbl_AccOutstandingLedger[OutstandingAmount][@Row], 0.00)
  ```
* **Aging Bucket 120+ Days:**
  ```excel
  =IF(AgeDays>120, tbl_AccOutstandingLedger[OutstandingAmount][@Row], 0.00)
  ```
* **Collection Status Level Indicator:**
  ```excel
  =IFS(tbl_AccOutstandingLedger[OutstandingAmount][@Row]<=0.00, "CLOSED", AgeDays<=30, "NORMAL_CURRENT", AgeDays<=60, "REMIND_LEVEL1", AgeDays<=90, "REMIND_LEVEL2", TRUE, "CRITICAL_OVERDUE")
  ```

---

### 8. GST AUTO-CALCULATION ENGINE

The GST calculation engine automatically handles B2B vs. B2C categorization, applies appropriate tax rates, and compiles tax periods into Monthly, Quarterly, and Annual summaries.

#### Rules & Formula Mappings:

* **Interstate POS Checking Flag:**
  ```excel
  =IF(XLOOKUP(tbl_TxnInvoices[CustomerID][@Row], tbl_MstCustomers[CustomerID], tbl_MstCustomers[StateCode])<>cfg_CompanyState, "INTER_STATE", "INTRA_STATE")
  ```
* **B2B Tax Status Check:**
  ```excel
  =LET(gstin, XLOOKUP(tbl_TxnInvoices[CustomerID][@Row], tbl_MstCustomers[CustomerID], tbl_MstCustomers[GSTIN]), IF(OR(ISBLANK(gstin), gstin=""), "B2C", "B2B"))
  ```

#### Tax Summary Aggregators (`GstMonthlySummary`):

* **Monthly Taxable Turnover Calculation (e.g., for Month `"2026-08"` in Cell `C10`):**
  ```excel
  =IFERROR(SUMIFS(tbl_GstRegister[TaxableAmount], tbl_GstRegister[InvoiceDate], ">="&DATE(2026,8,1), tbl_GstRegister[InvoiceDate], "<="&DATE(2026,8,31)), 0.00)
  ```
* **Monthly B2B Taxable Sales:**
  ```excel
  =IFERROR(SUMIFS(tbl_GstRegister[TaxableAmount], tbl_GstRegister[InvoiceDate], ">="&DATE(2026,8,1), tbl_GstRegister[InvoiceDate], "<="&DATE(2026,8,31), tbl_GstRegister[GSTIN], "<>"), 0.00)
  ```
* **Monthly B2C Taxable Sales:**
  ```excel
  =IFERROR(SUMIFS(tbl_GstRegister[TaxableAmount], tbl_GstRegister[InvoiceDate], ">="&DATE(2026,8,1), tbl_GstRegister[InvoiceDate], "<="&DATE(2026,8,31), tbl_GstRegister[GSTIN], ""), 0.00)
  ```
* **Monthly CGST Total Collected:**
  ```excel
  =IFERROR(SUMIFS(tbl_GstRegister[CGST], tbl_GstRegister[InvoiceDate], ">="&DATE(2026,8,1), tbl_GstRegister[InvoiceDate], "<="&DATE(2026,8,31)), 0.00)
  ```
* **Monthly SGST Total Collected:**
  ```excel
  =IFERROR(SUMIFS(tbl_GstRegister[SGST], tbl_GstRegister[InvoiceDate], ">="&DATE(2026,8,1), tbl_GstRegister[InvoiceDate], "<="&DATE(2026,8,31)), 0.00)
  ```
* **Monthly IGST Total Collected:**
  ```excel
  =IFERROR(SUMIFS(tbl_GstRegister[IGST], tbl_GstRegister[InvoiceDate], ">="&DATE(2026,8,1), tbl_GstRegister[InvoiceDate], "<="&DATE(2026,8,31)), 0.00)
  ```

---

### 9. REVENUE ENGINE (ANALYTICAL AGGREGATION)

The revenue engine generates operational metrics across different business activities (boarding, daycare, packages, services) and dates.

* **Daily Revenue (Target Day cell `E2`):**
  ```excel
  =IFERROR(SUMIFS(tbl_TxnPayments[AmountPaid], tbl_TxnPayments[PaymentDate], E2), 0.00)
  ```
* **Monthly Boarding Segment Revenue (Target Month `"2026-08"`):**
  ```excel
  =IFERROR(SUMIFS(tbl_TxnInvoiceItems[TaxableValue], tbl_TxnInvoiceItems[ServiceCategory], "BOARDING", tbl_TxnInvoiceItems[BillingDate], ">="&DATE(2026,8,1), tbl_TxnInvoiceItems[BillingDate], "<="&DATE(2026,8,31)), 0.00)
  ```
* **Monthly Daycare Segment Revenue (Target Month `"2026-08"`):**
  ```excel
  =IFERROR(SUMIFS(tbl_TxnInvoiceItems[TaxableValue], tbl_TxnInvoiceItems[ServiceCategory], "DAYCARE", tbl_TxnInvoiceItems[BillingDate], ">="&DATE(2026,8,1), tbl_TxnInvoiceItems[BillingDate], "<="&DATE(2026,8,31)), 0.00)
  ```
* **Outstanding Percentage Index:**
  ```excel
  =LET(totBill, SUM(tbl_TxnInvoices[GrandTotal]), totOutstanding, SUM(tbl_AccOutstandingLedger[OutstandingAmount]), IFERROR(totOutstanding / totBill, 0.00))
  ```

---

### 10. ERROR PROTECTION FRAMEWORK

Every operational calculation is wrapped within a defensive nesting block to prevent broken formulas from propagating through secondary sheets.

#### Error Handling Conversions:

| Problem Condition | Vulnerable Native Formula | Enterprise Shell Wrapping | User-Facing Safe Output |
|---|---|---|---|
| Divide by Zero (No sales in period) | `=Sales/InvoicesCount` | `=IFERROR(Sales/InvoicesCount, 0.00)` | `0.00` |
| Key Match Failure (Deleted Service Code) | `=VLOOKUP(Code, tbl_Services, 3, FALSE)`| `=IF(ISNA(XLOOKUP(Code, tbl_MstServices[ID], tbl_MstServices[Price])), "INACTIVE_SERVICE", XLOOKUP(Code, tbl_MstServices[ID], tbl_MstServices[Price]))` | `"INACTIVE_SERVICE"` |
| Blank Lookup Value (Empty customer cell) | `=XLOOKUP(C4, tbl_MstCustomers[ID], ...)`| `=IF(ISBLANK(C4), "", XLOOKUP(C4, tbl_MstCustomers[ID], ...))` | `""` (Blank Space) |
| Missing Reference (Reference column deleted) | `=SUM(tbl_Invoices[Total])` | `=IF(ISERR(SUM(tbl_Invoices[Total])), "STRUCTURE_REPAIR_REQUIRED", SUM(tbl_Invoices[Total]))` | `"STRUCTURE_REPAIR_REQUIRED"` |

---

### 11. DATA VALIDATION & DUPLICATE PROTECTION ENGINE

Cell validation formulas block the insertion of illegal data strings or duplicated reference keys.

* **Indian GSTIN Match Verification Formula:**
  * Regex validation equivalent for Excel Data Validation:
    ```excel
    =AND(LEN(GstCell)=15, ISNUMBER(VALUE(LEFT(GstCell, 2))), MID(GstCell, 3, 10)<>"", ISNUMBER(VALUE(RIGHT(GstCell, 1))))
    ```
* **Indian Permanent Account Number (PAN) Format Code:**
  ```excel
  =AND(LEN(PanCell)=10, ISERR(VALUE(LEFT(PanCell, 5))), ISNUMBER(VALUE(MID(PanCell, 6, 4))), ISERR(VALUE(RIGHT(PanCell, 1))))
  ```
* **Indian Mobile Contact Format (10 Digits starting with 6-9):**
  ```excel
  =AND(LEN(MobCell)=10, ISNUMBER(VALUE(MobCell)), VALUE(LEFT(MobCell, 1))>=6, VALUE(LEFT(MobCell, 1))<=9)
  ```
* **Indian Postal Pincode Validation (6 Digits):**
  ```excel
  =AND(LEN(PinCell)=6, ISNUMBER(VALUE(PinCell)))
  ```

#### Smart Duplicate Prevention Formulas (Custom Data Validation Rules):

* **Duplicate Invoice Number Lock:**
  ```excel
  =COUNTIF(tbl_TxnInvoices[InvoiceNumber], InvoiceNoCell)<=1
  ```
* **Duplicate Payment UTR / UPI Transaction Lock:**
  ```excel
  =OR(ISBLANK(UtrCell), COUNTIF(tbl_TxnPayments[UTR], UtrCell)<=1)
  ```

---

### 12. ENTERPRISE CALCULATIVE UTILITIES

This module introduces a self-healing diagnostic and performance framework, helping administrators identify broken calculations, audit changes, and track performance inside Excel.

#### Dynamic Named Range & Table Registry:

| Dynamic Named Range Name | Refers To (Excel Formula Expression) | Purpose |
|---|---|---|
| `dnr_ActiveInvoices` | `OFFSET(tbl_TxnInvoices[InvoiceID], 0, 0, COUNTA(tbl_TxnInvoices[InvoiceID]))` | Dynamic reference to all processed invoices. |
| `dnr_DailyCashBook` | `OFFSET(tbl_AccCashBook[CashTxnID], 0, 0, COUNTA(tbl_AccCashBook[CashTxnID]))` | Real-time cash journal entries count. |
| `dnr_UnpaidAging` | `FILTER(tbl_AccOutstandingLedger[InvoiceID], tbl_AccOutstandingLedger[OutstandingAmount]>0)`| Active dynamic range of all overdue invoice IDs.|

---

#### Calculation Mode & Integrity Controllers:

Excel's standard calculation behavior is managed via the sheet schema to balance operational performance with data safety.

* **Calculation Mode Controller:**
  * Defines the worksheet operational mode: `AUTOMATIC`, `SEMI_AUTOMATIC`, or `MANUAL`.
  * For sheets with more than 100,000 transaction rows, the system automatically runs the `SEMI_AUTOMATIC` calculation mode (calculating data tables manually, but keeping all worksheet aggregate formulas automatic) to prevent input latency.

* **Workbook Integrity Checker Formula:**
  * This dynamic self-healing cell audit checks for reference drift, circular path anomalies, and calculation mismatches.
  ```excel
  =LET(
    IsLedgerBalanced, ROUND(SUM(tbl_AccCustomerLedger[Debit]) - SUM(tbl_AccCustomerLedger[Credit]) - SUM(tbl_AccOutstandingLedger[OutstandingAmount]) - SUM(tbl_AccAdvanceLedger[BalanceAdvance]), 2)=0.00,
    ArePaymentsMatchingInvoices, SUM(tbl_TxnPayments[AmountPaid]) <= SUM(tbl_TxnInvoices[GrandTotal]),
    IsGstReconciled, ROUND(SUM(tbl_GstRegister[CGST]) + SUM(tbl_GstRegister[SGST]) + SUM(tbl_GstRegister[IGST]) - SUM(tbl_GstMonthlySummary[TotalGstCollected]), 2)=0.00,
    IFS(
      AND(IsLedgerBalanced, ArePaymentsMatchingInvoices, IsGstReconciled), "HEALTHY_SECURED",
      NOT(IsLedgerBalanced), "LEDGER_BALANCE_MISMATCH_DETECTED",
      NOT(ArePaymentsMatchingInvoices), "PAYMENT_SURPLUS_VOUCHER_ERROR",
      TRUE, "GST_AGGREGATE_DRIFT_WARNING"
    )
  )
  ```

---

### 13. FORMULA DICTIONARY SHEET (`FormulaDictionary`)

This sheet contains detailed metadata for the entire spreadsheet calculation logic, ensuring clear documentation, performance monitoring, and versioning.

| Formula Name | Purpose | Input Sheets | Output Sheets | Key Dependencies | Error Handling Strategy | Performance Cost | Vers. |
|---|---|---|---|---|---|---|---|
| `SPELL_INDIAN_RUPEES`| Converts billing decimals into Indian English currency strings. | Target cell | Invoice Form | J44 | `IFERROR` wrapping; handles up to 99 Crores. | Low | 1.2 |
| `CALC_CGST_SGST` | Splits taxes for intra-state Pos entries. | `MstCustomers` | `GstRegister` | `cfg_CompanyState`| Resolves to 0.00 if state POS is out of state. | Low | 1.1 |
| `REVENUE_AGE_BUCKET`| Allocates receivables into aging categories. | `Outstanding` | `RptOutstanding`| `TODAY()` date | Evaluates to CLOSED if value <= 0.00. | Medium | 1.0 |
| `SNAPSHOT_KPI_SYNC` | Compiles master KPIs for dashboard widgets. | All reports | `DshKPIs` | All registers | Traps division by zero (`#DIV/0!`) via `IFERROR`. | Medium | 1.3 |

---

### 14. FUTURE SQL COMPATIBILITY NOTES

To support a seamless future migration to relational SQL engines (such as PostgreSQL, SQLite, or Supabase), Excel's formula engine is aligned with relational database concepts.

* **Excel Tables map to SQL Tables:**
  * For example, `tbl_TxnInvoices` maps directly to table `txn_invoices`.
  * `tbl_TxnInvoiceItems` maps directly to table `txn_invoice_items`.
* **Dropdown Validation Maps to Foreign Key Constraints:**
  * Excel's list validation on `rng_MstCustomers` maps to a SQL foreign key:
    ```sql
    ALTER TABLE txn_invoices ADD CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id) REFERENCES mst_customers(customer_id);
    ```
* **Auto Lookups map to SQL Joins:**
  * The `XLOOKUP` lookup formula inside `tbl_TxnInvoices` corresponds to a standard left join view:
    ```sql
    CREATE VIEW view_invoice_details AS 
    SELECT i.invoice_id, i.invoice_date, c.customer_name, c.address, c.gstin 
    FROM txn_invoices i 
    LEFT JOIN mst_customers c ON i.customer_id = c.customer_id;
    ```
* **GST Aggregators map to Group By Queries:**
  * Monthly GST summary formulas map directly to Group By queries:
    ```sql
    CREATE VIEW view_gst_monthly_summary AS 
    SELECT 
      TO_CHAR(invoice_date, 'YYYY-MM') AS calendar_month,
      SUM(CASE WHEN gstin IS NOT NULL AND gstin <> '' THEN taxable_amount ELSE 0.00 END) AS b2b_sales,
      SUM(CASE WHEN gstin IS NULL OR gstin = '' THEN taxable_amount ELSE 0.00 END) AS b2c_sales,
      SUM(cgst) AS cgst_amount,
      SUM(sgst) AS sgst_amount,
      SUM(igst) AS igst_amount
    FROM gst_register 
    GROUP BY TO_CHAR(invoice_date, 'YYYY-MM');
    ```

This architectural alignment ensures that **The House of Pawz – Billing Pro** maintains high-performance local spreadsheets while providing a clear path to a future cloud-hosted SQL backend.

---

### ENTERPRISE SYSTEM STABILITY & FORMULA REPAIR MATRIX

This matrix details diagnostic steps and standard auto-repair procedures for workbook administrators.

| Error Code | Potential Root Cause | Self-Healing Formula Recovery Rule |
|---|---|---|
| `#REF!` | A referenced master column or table was deleted. | Audit columns using `FormulaDictionary` schemas, restore structural boundaries, and apply named ranges. |
| `#N/A` | Key is missing from the master sheet database. | Prompt user with "Entity ID Not Found" and link to the Mst sheet creation interface. |
| `#DIV/0!` | No transactions recorded in the target period. | Wrap target aggregation cell with `IFERROR(Formula, 0.00)`. |
| `#VALUE!` | Mixed data types inside calculation columns. | Force numeric values using the value extraction wrapper: `VALUE(TRIM(Cell))`. |

---

*Part 11E design documentation is fully generated. Ready for downstream integration.*
