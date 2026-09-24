THE HOUSE OF PAWZ – AUGUST 2026 INVOICE IMPORT UTILITY (01–86)
================================================================

SCRIPT FILE:
cron/import_august_invoices.php
(Also mirrored in public/cron/import_august_invoices.php)

TARGET SCOPE:
- Target Series: August FY 2026-27 (HOP/26-27/08/000001 to HOP/26-27/08/000086)
- Total Invoices: Exactly 86 Invoices
- Total Line Items: 124 Items
- Total Payments: 94 Payments
- Target Database: MySQL production (jainnaga_the_house_of_pawz)
- Historical Range: Protected and untouched (July 000001-000058, etc.)

VERIFIED FINANCIAL METRICS:
- Total Taxable Value: ₹869,163.00
- Total CGST (9%):      ₹78,224.67
- Total SGST (9%):      ₹78,224.67
- Total GST (18%):     ₹156,449.34
- Total Grand Total: ₹1,025,612.34
- Total Paid Amount: ₹1,009,387.34
- Total Balance Due:    ₹16,225.00

SPECIAL BUSINESS RULES APPLIED:
1. MISSING PAYMENT DATES:
   - For all invoices where payment date was omitted, the payment date was strictly set to the invoice date as instructed.
2. PAYMENT DIFFERENCE / ADJUSTMENTS (MARKED AS UNPAID FOR LATER EDITING):
   - Invoice #23 (Neethu Srivastava): Grand Total ₹4,661 | Payment Difference (paid ₹4,012 + ₹648 = ₹4,660)
   - Invoice #39 (Ananya): Grand Total ₹6,254 | Payment Difference (paid ₹5,605)
   - Invoice #55 (Shaheen Bhatt): Grand Total ₹3,009 | Complex adjustment note (Old balance ₹1,568)
   - Invoice #65 (Kajal Gopal): Grand Total ₹2,301 | Payment Difference & credit note (paid ₹2,202)
   * All 4 invoices are safely initialized with payment_status='UNPAID', paid_amount=0.00, balance_due=Grand Total, and zero payment rows so you can review and edit them directly in the UI.
3. MULTI-PAYMENT INVOICES:
   - Invoice #12 (Chandrama Verma): 4 multi-payments (₹6,166 + ₹1,000 + ₹1,006 + ₹6,166 = ₹14,338)
   - Invoice #15 (Pooja Singh): 2 multi-payments (16th Jul ₹3,658 + 7th Aug ₹2,655 = ₹6,313)
   - Invoice #25 (Valerian Raj Felix): 2 multi-payments (6th Aug ₹5,664 + 15th Aug ₹354 = ₹6,018)
   - Invoice #46 (Rakesh Singh): 2 multi-payments (19th Aug ₹649 + 23rd Aug ₹1,888 = ₹2,537)
   - Invoice #54 (Priya Nayak): 2 multi-payments (8th Aug ₹649 + 25th Aug ₹9,971 = ₹10,620)
   - Invoice #59 (Mark Bennington): 3 multi-payments (4th Aug ₹4,012 + 6th Aug ₹1,298 + 26th Aug ₹3,304 = ₹8,614)
   - Invoice #62 (Subhadra): 3 multi-payments (1st Aug ₹4,012 + 13th Aug ₹2,006 + 26th Aug ₹4,012 = ₹10,030)
   - Invoice #76 (Kanchan): 2 payments (Cash ₹14,292 + Online ₹14,292 = ₹28,584)

================================================================
EXECUTION INSTRUCTIONS (via cPanel Cron or SSH CLI)
================================================================

STEP 1: PREFLIGHT VALIDATION (DRY-RUN)
Run the script with the `--dry-run` flag first. This validates database connectivity, schema columns, customer/pet lookups, and financial totals WITHOUT modifying the MySQL database:

/usr/local/bin/php /home/jainnaga/public_html/the-house-of-pawz/cron/import_august_invoices.php --dry-run

STEP 2: LIVE PRODUCTION EXECUTION
Once the dry-run output is verified, execute the live import without `--dry-run`:

/usr/local/bin/php /home/jainnaga/public_html/the-house-of-pawz/cron/import_august_invoices.php

SAFETY FEATURES:
- Atomic MySQL Transaction: All 86 invoices, line items, payments, and customers are inserted in a single atomic transaction.
- In-Transaction Verification: Before committing, the script verifies row counts and exact decimal sums. If any discrepancy occurs, the transaction automatically rolls back.
- Exact Decimal Handling: No floating-point math is used for monetary calculations.
- Concurrency Lock: A lock file prevents accidental duplicate or simultaneous runs.
- CLI-Only Enforcement: Refuses web/browser requests.

POST-MIGRATION ACTIONS:
1. Check the log file at `logs/import_august_invoices.log`.
2. Login to the web application at https://jainnagarwal.in/the-house-of-pawz/.
3. Review the GST Invoice Dashboard to see all August invoices (HOP/26-27/08/000001 to 000086).
4. Edit the 4 UNPAID difference invoices (#23, #39, #55, #65) using the Edit Invoice feature as needed.
5. Disable or remove the cPanel Cron Job once the import is complete.
