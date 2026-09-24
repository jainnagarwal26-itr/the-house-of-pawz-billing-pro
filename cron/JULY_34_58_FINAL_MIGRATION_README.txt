THE HOUSE OF PAWZ – JULY INVOICE MIGRATION 34–58
=================================================

FINAL FILE
----------
migrate_supabase_july_34_58_FINAL.php

SOURCE
------
Supabase production

TARGET
------
MySQL: jainnaga_the_house_of_pawz

SCOPE
-----
ONLY:
HOP/26-27/000034 through HOP/26-27/000058
Exactly 25 invoices.

PROTECTED
---------
HOP/26-27/000001 through HOP/26-27/000033

IMPORTANT
---------
Do NOT run the live migration first.
Run the --dry-run through cPanel Cron first.

The script is CLI/cron only and refuses browser execution.

DRY RUN
-------
Use the PHP executable path provided/verified by your cPanel Node/PHP environment.
Example only:

/usr/local/bin/php /home/jainnaga/public_html/the-house-of-pawz/cron/migrate_supabase_july_34_58_FINAL.php --dry-run

Do not assume /usr/local/bin/php if your hosting environment uses another PHP binary.

LIVE RUN
--------
After the dry-run log is reviewed and shows successful validation:

/usr/local/bin/php /home/jainnaga/public_html/the-house-of-pawz/cron/migrate_supabase_july_34_58_FINAL.php

The live run uses a MySQL transaction and rolls back on migration errors.

SAFETY FEATURES
---------------
- No floating-point monetary arithmetic.
- No BCMath dependency.
- Auto-increment columns are never explicitly inserted.
- Supabase internal_invoice_id is mapped to the actual target invoice reference after insertion.
- Child invoice_items and payments use the mapped target invoice reference.
- Customer/pet references are resolved against the actual MySQL schema/FK metadata.
- Source invoice/item/payment relationships are validated before MySQL writes.
- Existing target invoices 000034–000058 cause an immediate abort.
- Historical 000001–000033 are snapshotted and verified unchanged.
- Per-invoice monetary values are checked before commit.
- Per-line-item and per-payment amounts/mappings are checked before commit.
- Final post-commit verification returns a failure exit code if final checks fail.
- Migration lock prevents concurrent execution.
- Credentials are read from the existing .env; no secret is embedded in the PHP file.

LOGS
----
The script writes:
migration_july_34_58.log
and uses a lock file during execution.

AFTER SUCCESS
-------------
Verify invoices 000034–000058 in the application.
Then remove/disable the migration Cron Job so it cannot be run accidentally again.
Keep the migration log for audit purposes.

PHP SYNTAX CHECK
----------------
The final PHP file has been syntax-checked and reports:
No syntax errors detected.
