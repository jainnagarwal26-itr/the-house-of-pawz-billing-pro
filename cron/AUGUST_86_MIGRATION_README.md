# The House of Pawz – August 2026 Invoice Import Utility (01–86)

## 📌 Overview
This standalone PHP CLI migration script imports **all 86 August 2026 invoices** (`HOP/26-27/08/000001` through `HOP/26-27/08/000086`) into the production MySQL database (`jainnaga_the_house_of_pawz`).

---

## 📊 Dataset & Financial Summary

| Metric | Total |
| :--- | :--- |
| **Total Invoices** | **86** (`HOP/26-27/08/000001` to `000086`) |
| **Total Line Items** | **124 Items** |
| **Total Payments** | **94 Payments** |
| **Total Taxable Amount** | **₹8,69,163.00** |
| **Total CGST (9%)** | **₹78,224.67** |
| **Total SGST (9%)** | **₹78,224.67** |
| **Total GST (18%)** | **₹1,56,449.34** |
| **Total Grand Total** | **₹10,25,612.34** |
| **Total Paid Amount** | **₹10,09,387.34** |
| **Total Balance Due** | **₹16,225.00** |

---

## 🔍 Special Business Rules Applied

1. **Payment Date Fallback**:
   - For all invoices where payment date was not explicitly mentioned, the payment date has been set equal to the **Invoice Date**.
2. **Payment Differences & Special Notes (Marked as `UNPAID`)**:
   - As requested, invoices with payment discrepancies or complex notes are marked as `UNPAID` (`paid_amount = 0.00`, `balance_due = grand_total`, zero payment rows) so you can edit them later:
     - **#23 (Neethu Srivastava)**: Grand Total ₹4,661 | Paid ₹4,012 + ₹648 = ₹4,660 (₹1 diff).
     - **#39 (Ananya)**: Grand Total ₹6,254 | Paid ₹5,605 (diff).
     - **#55 (Shaheen Bhatt)**: Grand Total ₹3,009 | Note with previous balance adjustment (₹1,568).
     - **#65 (Kajal Gopal)**: Grand Total ₹2,301 | Paid ₹2,202 with client advance/credit note.
3. **Multi-Payment Invoices**:
   - Correctly split into multiple payment rows:
     - **#12 (Chandrama Verma)**: 4 payments totaling ₹14,338 (20/06 ₹6,166, 23/06 ₹1,000, 30/06 ₹1,006, 04/08 ₹6,166).
     - **#15 (Pooja Singh)**: 2 payments (16/07 ₹3,658, 07/08 ₹2,655).
     - **#25 (Valerian Felix)**: 2 payments (06/08 ₹5,664, 15/08 ₹354).
     - **#46 (Rakesh Singh)**: 2 payments (19/08 ₹649, 23/08 ₹1,888).
     - **#54 (Priya Nayak)**: 2 payments (08/08 ₹649, 25/08 ₹9,971).
     - **#59 (Mark Bennington)**: 3 payments (04/08 ₹4,012, 06/08 ₹1,298, 26/08 ₹3,304).
     - **#62 (Subhadra)**: 3 payments (01/08 ₹4,012, 13/08 ₹2,006, 26/08 ₹4,012).
     - **#76 (Kanchan)**: 2 payments (Cash ₹14,292, Online ₹14,292).

---

## 🚀 Execution Instructions (cPanel Cron / SSH CLI)

### Step 1: Preflight Validation (`--dry-run`)
Execute the dry-run command via cPanel Cron or SSH CLI:
```bash
/usr/local/bin/php /home/jainnaga/public_html/the-house-of-pawz/cron/import_august_invoices.php --dry-run
```
*Verify that the log output confirms successful preflight check and 86 invoices verified.*

### Step 2: Live Production Import
Run without the `--dry-run` flag to commit the records:
```bash
/usr/local/bin/php /home/jainnaga/public_html/the-house-of-pawz/cron/import_august_invoices.php
```

---

## 🛡️ Safety & Integrity Guarantees
- **CLI Only**: Protected against web/browser access.
- **Zero Float Arithmetic**: All money values use exact decimal strings.
- **Single Atomic Transaction**: Everything commits together or rolls back cleanly if an error occurs.
- **Concurrency Lock**: Prevents duplicate executions.
