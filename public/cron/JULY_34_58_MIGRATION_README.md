# July Invoices (000034 to 000058) Migration Utility
**Project**: The House of Pawz – Billing Pro  
**Script**: `cron/migrate_supabase_july_34_58.php`

---

## 1. Purpose
This standalone, production-safe PHP CLI migration utility imports **ONLY** the 25 July invoices (`HOP/26-27/000034` through `HOP/26-27/000058`) and their associated customer profiles, pet profiles, line items, and payment receipts from the Supabase production database into the MySQL production database (`jainnaga_the_house_of_pawz`).

---

## 2. Migration Scope — Strictly Enforced

| Entity | Scope | Rule |
|---|---|---|
| **Invoices** | `HOP/26-27/000034` to `HOP/26-27/000058` (25 invoices) | Strict 1:1 migration with source values |
| **Historical Invoices** | `HOP/26-27/000001` to `HOP/26-27/000033` | **100% Protected** (untouched & zero modifications) |
| **Future / Existing** | Any invoices outside 34–58 | **Zero modifications** |
| **Invoice Items** | All line items linked to the 25 target invoices | Exact item price, qty, tax, total preserved |
| **Payments** | All payment ledger records for the 25 target invoices | Exact payment amounts, dates, modes preserved |
| **Customers** | Referenced customer records | Inserted if new; existing profiles preserved |
| **Pets** | Referenced pet records | Inserted if new; existing profiles preserved |

---

## 3. Source & Target Environments

- **Source**: Supabase REST API (`dxvnemdmgdckdfzilnkr`)
- **Target**: MySQL Database (`jainnaga_the_house_of_pawz`) on cPanel hosting (`public_html/the-house-of-pawz`)

---

## 4. Required `.env` Variables
The migration utility securely reads credentials from the existing `.env` file in the project root:

```env
# Supabase Production API
SUPABASE_URL=https://<your-supabase-project-id>.supabase.co
SUPABASE_SECRET_KEY=<your-supabase-service-role-secret-key>

# MySQL Production Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=jainnaga_the_house_of_pawz
MYSQL_USER=jainnaga_the_house_of_pawz
MYSQL_PASSWORD=<your-mysql-password>
```

> **Note**: Secrets and passwords are never hard-coded and never printed to logs or standard output.

---

## 5. Dry-Run Mode (Preflight Validation)
Before executing the live migration, always run in `--dry-run` mode to validate the source data and confirm that target MySQL has zero conflicts:

```bash
php /home/jainnaga/public_html/the-house-of-pawz/cron/migrate_supabase_july_34_58.php --dry-run
```

### What Dry-Run Performs:
1. Connects to Supabase REST API via cURL.
2. Fetches and validates that exactly 25 invoices (`HOP/26-27/000034` to `HOP/26-27/000058`) exist on Supabase.
3. Fetches related customers, pets, line items, and payment receipts.
4. Connects to MySQL and checks that NONE of the 25 target invoices already exist.
5. Verifies historical invoices (000001–000033) in MySQL.
6. Prints a complete audit summary.
7. **Exits without writing, modifying, or committing any records to MySQL.**

---

## 6. Real Migration Execution

To execute the atomic migration into MySQL:

```bash
php /home/jainnaga/public_html/the-house-of-pawz/cron/migrate_supabase_july_34_58.php
```

### Migration Execution Steps:
1. **Target Conflict Check**: Aborts immediately if any invoice in the 000034–000058 range already exists in MySQL.
2. **Atomic Transaction**: Begins a PDO transaction (`START TRANSACTION`).
3. **Ordered Insertion**:
   - `customers` (parents)
   - `pets` (parents)
   - `invoices` (header records)
   - `invoice_items` (child line items)
   - `payments` (child payment receipts)
4. **Transaction Commit**: Commits only when all 25 invoices and related records are successfully written.
5. **Post-Commit Verification**: Runs audit queries to verify that all 25 invoices, item counts, payment counts, and grand total sums match the Supabase source to the exact decimal.

---

## 7. Atomic Rollback & Safety Guarantee
- If ANY error, network timeout, constraint violation, or data mismatch occurs during the insert process:
  - The script triggers an immediate `ROLLBACK`.
  - Zero partial July records remain in MySQL.
  - The failure reason is logged with timestamp.

---

## 8. Concurrency & Lock Protection
- The migration utility uses a lock file:
  `logs/july_34_58_migration.lock`
- If a migration is already in progress, any subsequent trigger immediately aborts to prevent duplicate execution.
- The lock file is automatically released upon completion or controlled shutdown.

---

## 9. How to Run via cPanel Cron Job

Since cPanel hosting does not have Node.js in the cron environment, this PHP CLI utility is designed specifically for cPanel Cron.

### Step 1: Add Cron Job in cPanel
1. Log in to your **cPanel**.
2. Search for **Cron Jobs** (under *Advanced*).
3. Set the schedule to **Once per minute** (e.g. `* * * * *` for immediate one-time execution):
4. Enter the Command:
   ```bash
   /usr/local/bin/php /home/jainnaga/public_html/the-house-of-pawz/cron/migrate_supabase_july_34_58.php >> /home/jainnaga/the-house-of-pawz/logs/cron_output.log 2>&1
   ```
5. Click **Add New Cron Job**.

### Step 2: Check Logs
Once the cron runs (after 1 minute), check the log file:
- File Manager: `public_html/the-house-of-pawz/logs/migration_july_34_58.log`

### Step 3: Disable / Delete the Cron Job
Once you see the `ALL VERIFICATION CHECKS PASSED PERFECTLY!` message in the log:
1. Go back to **cPanel > Cron Jobs**.
2. Locate the migration cron job.
3. Click **Delete** to ensure it does not run again.

---

## 10. Security & Web Access Blocking
- The script verifies `PHP_SAPI === 'cli'` at the very top. Any web or HTTP request is blocked with `403 Forbidden`.
- `.htaccess` rules in the root and `dist/` folders block web access to the `cron/` and `logs/` directories.
