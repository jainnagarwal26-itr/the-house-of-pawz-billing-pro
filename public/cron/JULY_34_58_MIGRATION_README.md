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
| **Invoices** | `HOP/26-27/000034` to `HOP/26-27/000058` (25 invoices) | Strict 1:1 migration with exact DECIMAL values |
| **Historical Invoices** | `HOP/26-27/000001` to `HOP/26-27/000033` | **100% Protected** (verified before, during & after transaction) |
| **Future / Existing** | Any invoices outside 34–58 | **Zero modifications** |
| **Invoice Items** | All line items linked to the 25 target invoices | Exact item price, qty, tax, total preserved as exact DECIMALs |
| **Payments** | All payment ledger records for the 25 target invoices | Exact payment amounts, dates, modes preserved |
| **Customer Mapping** | Explicit Supabase `customer_id` → MySQL mapping | Reuses existing profiles or inserts new ones |
| **Pet Mapping** | Explicit Supabase `pet_id` → MySQL mapping | Reuses existing profiles or inserts new ones |

---

## 3. Source & Target Environments

- **Source**: Supabase REST API (`dxvnemdmgdckdfzilnkr`)
- **Target**: MySQL Database (`jainnaga_the_house_of_pawz`) on cPanel hosting (`public_html/the-house-of-pawz`)

---

## 4. Required `.env` Variables
The migration utility securely reads credentials from the existing `.env` file:

```env
# Supabase Production API (SERVICE-ROLE SECRET ONLY — Anon key is strictly forbidden)
SUPABASE_URL=https://<your-supabase-project-id>.supabase.co
SUPABASE_SECRET_KEY=<your-supabase-service-role-secret-key>

# MySQL Production Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=jainnaga_the_house_of_pawz
MYSQL_USER=jainnaga_the_house_of_pawz
MYSQL_PASSWORD=<your-mysql-password>
```

> **Security Rule**: 
> - Anonymous keys (`VITE_SUPABASE_ANON_KEY`) are rejected and will immediately abort.
> - Secrets and passwords are never hard-coded and never printed to logs or standard output.

---

## 5. Exact DECIMAL Handling (Zero Floats)
- All monetary and financial calculations (`grand_total`, `paid_amount`, `balance_due`, `taxable_amount`, `total_gst`, `item_total`, `price`, `amount`) are processed as exact normalized decimal strings or via BCMath (`toDecimalStr()`, `decimalAddStr()`, `decimalCompareStr()`).
- Floating point casting (`(float)`) and loose epsilon comparisons (`abs($a - $b) < 0.01`) are completely eliminated to prevent monetary rounding errors.

---

## 6. Pre-Commit In-Transaction Verification & Atomic Rollback
- All operations execute inside an atomic PDO transaction (`START TRANSACTION`).
- **Before `COMMIT`**, the script runs in-transaction verification queries:
  1. Verifies exactly 25 invoices exist.
  2. Verifies line item count and payment count match source.
  3. Verifies exact DECIMAL equality between MySQL sums and Supabase source sums.
  4. Verifies historical invoices (000001–000033) are character-for-character unchanged against the preflight snapshot.
- If ANY pre-commit check fails, the transaction is immediately **ROLLED BACK** and zero partial records remain.

---

## 7. Dry-Run Mode (Preflight Validation)
Before executing the live migration, run in `--dry-run` mode:

```bash
php /home/jainnaga/public_html/the-house-of-pawz/cron/migrate_supabase_july_34_58.php --dry-run
```

---

## 8. Real Migration Execution

To execute the atomic migration into MySQL:

```bash
php /home/jainnaga/public_html/the-house-of-pawz/cron/migrate_supabase_july_34_58.php
```

---

## 9. How to Run via cPanel Cron Job

### Step 1: Add Cron Job in cPanel
1. Log in to **cPanel > Cron Jobs**.
2. Set the schedule to **Once per minute** (e.g. `* * * * *` for immediate one-time execution):
3. Enter Command:
   ```bash
   /usr/local/bin/php /home/jainnaga/public_html/the-house-of-pawz/cron/migrate_supabase_july_34_58.php >> /home/jainnaga/the-house-of-pawz/logs/cron_output.log 2>&1
   ```
4. Click **Add New Cron Job**.

### Step 2: Check Logs
Check log: `public_html/the-house-of-pawz/logs/migration_july_34_58.log`.

### Step 3: Disable / Delete the Cron Job
Once you see `ALL VERIFICATION CHECKS PASSED PERFECTLY!`, delete the cron job from cPanel.
