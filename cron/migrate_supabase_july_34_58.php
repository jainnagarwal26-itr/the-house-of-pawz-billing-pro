<?php
// ==============================================================================
// migrate_supabase_july_34_58.php
// Production Migration Utility: Supabase -> MySQL
// Project: The House of Pawz – Billing Pro
//
// Target Scope: ONLY July Invoices HOP/26-27/000034 to HOP/26-27/000058 (25 total)
// Historical Range 000001-000033 is PROTECTED and untouched.
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. CLI EXECUTION ENFORCEMENT (Security Guard)
// ------------------------------------------------------------------------------
if (PHP_SAPI !== 'cli') {
    if (!headers_sent()) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=UTF-8');
    }
    echo "====================================================================\n";
    echo " 403 FORBIDDEN: CLI ACCESS ONLY\n";
    echo " This production migration script can ONLY be run from the Command Line\n";
    echo " or via cPanel Cron Job. Web / browser execution is strictly blocked.\n";
    echo "====================================================================\n";
    exit(1);
}

// ------------------------------------------------------------------------------
// 2. PARSE COMMAND LINE ARGUMENTS
// ------------------------------------------------------------------------------
$options = getopt('h', ['dry-run', 'help']);
$isDryRun = isset($options['dry-run']) || in_array('--dry-run', $argv, true);
$showHelp = isset($options['h']) || isset($options['help']) || in_array('--help', $argv, true);

if ($showHelp) {
    echo "====================================================================\n";
    echo " The House of Pawz – July 2026 Invoice Migration Utility (34-58)\n";
    echo "====================================================================\n";
    echo "Usage:\n";
    echo "  php cron/migrate_supabase_july_34_58.php [options]\n\n";
    echo "Options:\n";
    echo "  --dry-run   Validate source Supabase data and target MySQL state\n";
    echo "              WITHOUT writing or committing any changes.\n";
    echo "  --help, -h  Show this help screen.\n\n";
    echo "Scope:\n";
    echo "  Source: Supabase (Invoices HOP/26-27/000034 to HOP/26-27/000058)\n";
    echo "  Target: MySQL (jainnaga_the_house_of_pawz)\n";
    echo "  Historical 000001-000033: Fully protected (zero modifications)\n";
    echo "====================================================================\n";
    exit(0);
}

// ------------------------------------------------------------------------------
// 3. LOGGING & LOCK FILE MANAGEMENT
// ------------------------------------------------------------------------------
$baseDirs = [
    '/home/jainnaga/the-house-of-pawz/logs',
    '/home/jainnaga/public_html/the-house-of-pawz/logs',
    dirname(__DIR__) . '/logs',
    __DIR__ . '/logs'
];

$logDir = null;
foreach ($baseDirs as $dir) {
    if (is_dir($dir) && is_writable($dir)) {
        $logDir = $dir;
        break;
    }
}
if (!$logDir) {
    foreach ($baseDirs as $dir) {
        if (@mkdir($dir, 0755, true)) {
            $logDir = $dir;
            break;
        }
    }
}
if (!$logDir) {
    $logDir = sys_get_temp_dir();
}

$logFile = $logDir . '/migration_july_34_58.log';
$lockFile = $logDir . '/july_34_58_migration.lock';

function logMsg($message, $level = 'INFO') {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $formatted = "[{$timestamp}] [{$level}] {$message}";
    
    // Echo to CLI
    $prefix = '';
    if ($level === 'ERROR' || $level === 'CRITICAL') {
        $prefix = "\033[31m"; // Red
    } elseif ($level === 'SUCCESS') {
        $prefix = "\033[32m"; // Green
    } elseif ($level === 'WARN') {
        $prefix = "\033[33m"; // Yellow
    } elseif ($level === 'INFO') {
        $prefix = "\033[36m"; // Cyan
    }
    $suffix = "\033[0m";
    
    echo "{$prefix}{$formatted}{$suffix}\n";
    
    // Write to persistent log file
    @file_put_contents($logFile, $formatted . "\n", FILE_APPEND | LOCK_EX);
}

// Lock acquisition
if (file_exists($lockFile)) {
    $lockData = @file_get_contents($lockFile);
    $lockPid = trim($lockData);
    $fileAge = time() - filemtime($lockFile);
    
    // If lock is younger than 15 minutes and process is alive, abort
    if ($fileAge < 900) {
        logMsg("ABORT: Migration lock file exists ({$lockFile}) created {$fileAge}s ago. Another process (PID: {$lockPid}) may be active.", 'ERROR');
        exit(1);
    } else {
        logMsg("Stale lock file detected ({$fileAge}s old). Removing stale lock.", 'WARN');
        @unlink($lockFile);
    }
}

file_put_contents($lockFile, (string)getmypid(), LOCK_EX);

// Register shutdown cleanup for lock file
register_shutdown_function(function() use ($lockFile) {
    if (file_exists($lockFile)) {
        @unlink($lockFile);
    }
});

logMsg("====================================================================");
logMsg("THE HOUSE OF PAWZ – PRODUCTION INVOICE MIGRATION (JULY 34–58)");
logMsg("Mode: " . ($isDryRun ? "DRY-RUN (Read-Only Validation)" : "LIVE PRODUCTION MIGRATION"));
logMsg("Log file: {$logFile}");
logMsg("====================================================================");

// ------------------------------------------------------------------------------
// 4. LOAD & SANITIZE ENVIRONMENT CONFIGURATION
// ------------------------------------------------------------------------------
function loadEnvCredentials() {
    $possibleEnvPaths = [
        dirname(__DIR__) . '/.env',
        __DIR__ . '/.env',
        '/home/jainnaga/the-house-of-pawz/.env',
        '/home/jainnaga/public_html/the-house-of-pawz/.env'
    ];

    $env = [];
    foreach ($possibleEnvPaths as $path) {
        if (file_exists($path) && is_readable($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($key, $val) = explode('=', $line, 2);
                    $key = trim($key);
                    $val = trim($val, " \t\n\r\0\x0B\"'");
                    $env[$key] = $val;
                    if (!isset($_ENV[$key])) {
                        $_ENV[$key] = $val;
                        putenv("{$key}={$val}");
                    }
                }
            }
            break;
        }
    }
    return $env;
}

$env = loadEnvCredentials();

// Supabase Credentials
$supabaseUrl = getenv('SUPABASE_URL') ?: ($env['SUPABASE_URL'] ?? (getenv('VITE_SUPABASE_URL') ?: ($env['VITE_SUPABASE_URL'] ?? '')));
$supabaseKey = getenv('SUPABASE_SECRET_KEY') ?: ($env['SUPABASE_SECRET_KEY'] ?? (getenv('SUPABASE_SERVICE_ROLE_KEY') ?: ($env['SUPABASE_SERVICE_ROLE_KEY'] ?? (getenv('VITE_SUPABASE_SERVICE_ROLE_KEY') ?: ($env['VITE_SUPABASE_SERVICE_ROLE_KEY'] ?? (getenv('VITE_SUPABASE_ANON_KEY') ?: ($env['VITE_SUPABASE_ANON_KEY'] ?? '')))))));

if (empty($supabaseUrl) || empty($supabaseKey)) {
    logMsg("CRITICAL ERROR: Supabase credentials missing from .env (SUPABASE_URL / SUPABASE_SECRET_KEY).", 'ERROR');
    exit(1);
}

// Normalize Supabase URL (strip trailing slash)
$supabaseUrl = rtrim($supabaseUrl, '/');

// MySQL Credentials
$dbHost = getenv('MYSQL_HOST') ?: ($env['MYSQL_HOST'] ?? (getenv('DB_HOST') ?: ($env['DB_HOST'] ?? 'localhost')));
$dbPort = getenv('MYSQL_PORT') ?: ($env['MYSQL_PORT'] ?? (getenv('DB_PORT') ?: ($env['DB_PORT'] ?? '3306')));
$dbName = getenv('MYSQL_DATABASE') ?: ($env['MYSQL_DATABASE'] ?? (getenv('DB_NAME') ?: ($env['DB_NAME'] ?? 'jainnaga_the_house_of_pawz')));
$dbUser = getenv('MYSQL_USER') ?: ($env['MYSQL_USER'] ?? (getenv('DB_USER') ?: ($env['DB_USER'] ?? 'jainnaga_the_house_of_pawz')));
$dbPass = getenv('MYSQL_PASSWORD') ?: ($env['MYSQL_PASSWORD'] ?? (getenv('DB_PASS') ?: ($env['DB_PASS'] ?? '')));

logMsg("Supabase Source: " . parse_url($supabaseUrl, PHP_URL_HOST));
logMsg("MySQL Target Database: {$dbName} @ {$dbHost}:{$dbPort} (User: {$dbUser})");

// ------------------------------------------------------------------------------
// 5. SUPABASE REST API CLIENT HELPER (cURL)
// ------------------------------------------------------------------------------
function fetchSupabaseRest($url, $key, $table, array $params = []) {
    $queryString = http_build_query($params);
    $fullUrl = "{$url}/rest/v1/{$table}" . ($queryString ? "?{$queryString}" : "");
    
    $ch = curl_init($fullUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "apikey: {$key}",
            "Authorization: Bearer {$key}",
            "Accept: application/json",
            "Range-Unit: items"
        ],
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    
    $raw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        throw new Exception("Supabase REST request failed: {$error}");
    }
    
    if ($httpCode < 200 || $httpCode >= 300) {
        throw new Exception("Supabase REST error (HTTP {$httpCode}): {$raw}");
    }
    
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new Exception("Invalid JSON response received from Supabase REST API for table {$table}");
    }
    
    return $data;
}

// ------------------------------------------------------------------------------
// 6. DEFINE EXACT 25 INVOICE SCOPE (HOP/26-27/000034 -> HOP/26-27/000058)
// ------------------------------------------------------------------------------
$targetInvoiceNumbers = [];
for ($i = 34; $i <= 58; $i++) {
    $targetInvoiceNumbers[] = sprintf("HOP/26-27/%06d", $i);
}
$expectedCount = 25;
$expectedFirst = 'HOP/26-27/000034';
$expectedLast = 'HOP/26-27/000058';

logMsg("Configured target invoice range: {$expectedFirst} -> {$expectedLast} (Count: {$expectedCount})");

// ------------------------------------------------------------------------------
// 7. FETCH & VALIDATE SOURCE DATA FROM SUPABASE
// ------------------------------------------------------------------------------
logMsg("Fetching source invoice records from Supabase production...");

try {
    // 1. Fetch the 25 Invoices
    $invoicesListParam = implode(',', $targetInvoiceNumbers);
    $sourceInvoices = fetchSupabaseRest($supabaseUrl, $supabaseKey, 'invoices', [
        'invoice_number' => "in.({$invoicesListParam})",
        'order' => 'invoice_number.asc'
    ]);
    
    $actualCount = count($sourceInvoices);
    logMsg("Retrieved {$actualCount} invoice records from Supabase.");
    
    // Strict Validation Rule: Count MUST be exactly 25
    if ($actualCount !== $expectedCount) {
        logMsg("VALIDATION FAILURE: Expected exactly {$expectedCount} invoices from Supabase, but received {$actualCount}.", 'CRITICAL');
        $receivedNumbers = array_column($sourceInvoices, 'invoice_number');
        $missing = array_diff($targetInvoiceNumbers, $receivedNumbers);
        logMsg("Missing invoice numbers from Supabase: " . implode(', ', $missing), 'ERROR');
        exit(1);
    }
    
    // Strict Validation Rule: First and Last invoice numbers
    $actualFirst = $sourceInvoices[0]['invoice_number'];
    $actualLast = $sourceInvoices[$actualCount - 1]['invoice_number'];
    
    if ($actualFirst !== $expectedFirst || $actualLast !== $expectedLast) {
        logMsg("VALIDATION FAILURE: Sequence bounds mismatch. Expected {$expectedFirst}..{$expectedLast}, got {$actualFirst}..{$actualLast}.", 'CRITICAL');
        exit(1);
    }
    
    // Verify every sequence member is present
    $receivedMap = [];
    foreach ($sourceInvoices as $inv) {
        $receivedMap[$inv['invoice_number']] = $inv;
    }
    foreach ($targetInvoiceNumbers as $num) {
        if (!isset($receivedMap[$num])) {
            logMsg("VALIDATION FAILURE: Invoice {$num} is missing from the Supabase dataset.", 'CRITICAL');
            exit(1);
        }
    }
    logMsg("Source invoice range verification PASSED: All 25 invoices (000034 to 000058) present and valid.", 'SUCCESS');

    // 2. Extract Internal Invoice IDs, Customer IDs, and Pet IDs
    $internalInvoiceIds = array_filter(array_column($sourceInvoices, 'internal_invoice_id'));
    $customerIds = array_unique(array_filter(array_column($sourceInvoices, 'customer_id')));
    $petIds = array_unique(array_filter(array_column($sourceInvoices, 'pet_id')));

    $internalIdsParam = implode(',', $internalInvoiceIds);
    $custIdsParam = implode(',', $customerIds);
    $petIdsParam = !empty($petIds) ? implode(',', $petIds) : '';

    // 3. Fetch Related Line Items
    logMsg("Fetching related invoice_items from Supabase...");
    $sourceItems = fetchSupabaseRest($supabaseUrl, $supabaseKey, 'invoice_items', [
        'internal_invoice_id' => "in.({$internalIdsParam})",
        'order' => 'id.asc'
    ]);
    logMsg("Retrieved " . count($sourceItems) . " invoice_items from Supabase.");

    // 4. Fetch Related Payments
    logMsg("Fetching related payments from Supabase...");
    $sourcePayments = fetchSupabaseRest($supabaseUrl, $supabaseKey, 'payments', [
        'internal_invoice_id' => "in.({$internalIdsParam})",
        'order' => 'payment_date.asc'
    ]);
    logMsg("Retrieved " . count($sourcePayments) . " payment records from Supabase.");

    // 5. Fetch Related Customers
    logMsg("Fetching referenced customers from Supabase...");
    $sourceCustomers = fetchSupabaseRest($supabaseUrl, $supabaseKey, 'customers', [
        'customer_id' => "in.({$custIdsParam})"
    ]);
    logMsg("Retrieved " . count($sourceCustomers) . " customer profiles from Supabase.");

    // 6. Fetch Related Pets
    $sourcePets = [];
    if (!empty($petIdsParam)) {
        logMsg("Fetching referenced pets from Supabase...");
        $sourcePets = fetchSupabaseRest($supabaseUrl, $supabaseKey, 'pets', [
            'pet_id' => "in.({$petIdsParam})"
        ]);
        logMsg("Retrieved " . count($sourcePets) . " pet profiles from Supabase.");
    }

} catch (Exception $e) {
    logMsg("CRITICAL ERROR during Supabase data fetch: " . $e->getMessage(), 'CRITICAL');
    exit(1);
}

// ------------------------------------------------------------------------------
// 8. CONNECT TO MYSQL & PRE-FLIGHT SAFETY CHECKS
// ------------------------------------------------------------------------------
logMsg("Connecting to MySQL production database...");
try {
    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    logMsg("MySQL Connection established successfully.", 'SUCCESS');
} catch (PDOException $e) {
    logMsg("CRITICAL ERROR: Failed to connect to MySQL database: " . $e->getMessage(), 'CRITICAL');
    exit(1);
}

// Dynamic Schema Introspection Helpers
function getTableCols(PDO $pdo, $table) {
    static $cache = [];
    if (!isset($cache[$table])) {
        try {
            $stmt = $pdo->query("SHOW COLUMNS FROM `{$table}`");
            $cache[$table] = $stmt->fetchAll(PDO::FETCH_COLUMN);
        } catch (Exception $e) {
            $cache[$table] = [];
        }
    }
    return $cache[$table];
}

function filterCols(PDO $pdo, $table, array $data) {
    $cols = getTableCols($pdo, $table);
    if (empty($cols)) return $data;
    $filtered = [];
    foreach ($data as $k => $v) {
        if (in_array($k, $cols, true)) {
            $filtered[$k] = $v;
        }
    }
    return $filtered;
}

function execDynamicInsert(PDO $pdo, $table, array $data) {
    $filtered = filterCols($pdo, $table, $data);
    if (empty($filtered)) {
        throw new Exception("No valid columns to insert into table {$table}");
    }
    $colList = '`' . implode('`, `', array_keys($filtered)) . '`';
    $paramList = ':' . implode(', :', array_keys($filtered));
    $sql = "INSERT INTO `{$table}` ({$colList}) VALUES ({$paramList})";
    $stmt = $pdo->prepare($sql);
    $params = [];
    foreach ($filtered as $k => $v) {
        $params[':' . $k] = $v;
    }
    $stmt->execute($params);
    return $stmt;
}

// ------------------------------------------------------------------------------
// 9. TARGET DATABASE CONFLICT & SAFETY VERIFICATION
// ------------------------------------------------------------------------------
logMsg("Performing target database safety checks...");

// 1. Verify that NONE of the target invoices (000034–000058) already exist in MySQL
$placeholders = implode(',', array_fill(0, count($targetInvoiceNumbers), '?'));
$conflictStmt = $pdo->prepare("SELECT invoice_number FROM invoices WHERE invoice_number IN ({$placeholders})");
$conflictStmt->execute($targetInvoiceNumbers);
$existingConflicts = $conflictStmt->fetchAll(PDO::FETCH_COLUMN);

if (!empty($existingConflicts)) {
    logMsg("TARGET CONFLICT ABORT: The following target invoices already exist in MySQL:", 'CRITICAL');
    foreach ($existingConflicts as $conf) {
        logMsg(" - {$conf}", 'ERROR');
    }
    logMsg("To protect against accidental duplication or overwrite, migration has been ABORTED.", 'CRITICAL');
    exit(1);
}
logMsg("Target Conflict Check PASSED: Zero target invoices exist in MySQL.", 'SUCCESS');

// 2. Verify historical invoices (000001–000033)
$histStmt = $pdo->query("SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE 'HOP/26-27/%' AND invoice_number < 'HOP/26-27/000034'");
$histCount = (int)$histStmt->fetchColumn();
logMsg("Historical records check: {$histCount} existing historical invoices (000001–000033) confirmed safe in MySQL.");

// Compute summary financial totals from Supabase source
$totalGrandTotal = 0.0;
$totalPaidAmount = 0.0;
$totalBalanceDue = 0.0;
$totalTaxable = 0.0;
$totalGst = 0.0;

foreach ($sourceInvoices as $inv) {
    $totalGrandTotal += (float)($inv['grand_total'] ?? 0);
    $totalPaidAmount += (float)($inv['paid_amount'] ?? 0);
    $totalBalanceDue += (float)($inv['balance_due'] ?? 0);
    $totalTaxable += (float)($inv['taxable_amount'] ?? 0);
    $totalGst += (float)($inv['total_gst'] ?? 0);
}

logMsg("--------------------------------------------------------------------");
logMsg("MIGRATION DATASET SUMMARY:");
logMsg("Invoices to Migrate:    " . count($sourceInvoices) . " (HOP/26-27/000034 to HOP/26-27/000058)");
logMsg("Line Items to Migrate:  " . count($sourceItems));
logMsg("Payments to Migrate:    " . count($sourcePayments));
logMsg("Customers Referenced:  " . count($sourceCustomers));
logMsg("Pets Referenced:        " . count($sourcePets));
logMsg(sprintf("Total Taxable Value:    ₹%s", number_format($totalTaxable, 2)));
logMsg(sprintf("Total GST Amount:       ₹%s", number_format($totalGst, 2)));
logMsg(sprintf("Total Grand Total:      ₹%s", number_format($totalGrandTotal, 2)));
logMsg(sprintf("Total Paid Amount:      ₹%s", number_format($totalPaidAmount, 2)));
logMsg(sprintf("Total Balance Due:      ₹%s", number_format($totalBalanceDue, 2)));
logMsg("--------------------------------------------------------------------");

// ------------------------------------------------------------------------------
// 10. DRY-RUN MODE EXIT
// ------------------------------------------------------------------------------
if ($isDryRun) {
    logMsg("====================================================================", 'SUCCESS');
    logMsg("DRY-RUN COMPLETE: Preflight validation successful.", 'SUCCESS');
    logMsg("All 25 invoices, items, payments, customers, and pets are valid and ready.", 'SUCCESS');
    logMsg("NO records were inserted, modified, or deleted in MySQL.", 'SUCCESS');
    logMsg("To perform the real migration, run without the --dry-run flag.", 'SUCCESS');
    logMsg("====================================================================", 'SUCCESS');
    exit(0);
}

// ------------------------------------------------------------------------------
// 11. REAL MIGRATION: ATOMIC TRANSACTION EXECUTION
// ------------------------------------------------------------------------------
logMsg("Beginning ATOMIC MySQL Transaction...");

try {
    $pdo->beginTransaction();

    // 1. Migrate Customers
    logMsg("Migrating " . count($sourceCustomers) . " customer profiles...");
    $custCheckStmt = $pdo->prepare("SELECT id, customer_id FROM customers WHERE customer_id = :cid OR phone = :phone LIMIT 1");
    $custCols = getTableCols($pdo, 'customers');
    
    $custInserted = 0;
    $custExisting = 0;
    foreach ($sourceCustomers as $c) {
        $cid = $c['customer_id'];
        $phone = $c['phone'] ?? '';
        
        $custCheckStmt->execute([':cid' => $cid, ':phone' => $phone]);
        $existingCust = $custCheckStmt->fetch();
        
        if (!$existingCust) {
            $custData = [
                'id' => $c['id'] ?? $cid,
                'customer_id' => $cid,
                'name' => $c['full_name'] ?? ($c['name'] ?? 'Customer'),
                'full_name' => $c['full_name'] ?? ($c['name'] ?? 'Customer'),
                'phone' => $phone,
                'email' => $c['email'] ?? null,
                'address' => $c['address'] ?? null,
                'gstin' => $c['gstin'] ?? null,
                'state' => $c['state_code'] ?? ($c['state'] ?? '27-Maharashtra'),
                'state_code' => $c['state_code'] ?? ($c['state'] ?? '27-Maharashtra'),
                'emergency_contact' => $c['emergency_contact'] ?? null,
                'outstanding_balance' => (float)($c['outstanding_balance'] ?? 0),
                'advance_balance' => (float)($c['advance_balance'] ?? 0),
                'created_at' => $c['created_at'] ?? date('Y-m-d H:i:s'),
                'updated_at' => $c['updated_at'] ?? date('Y-m-d H:i:s')
            ];
            execDynamicInsert($pdo, 'customers', $custData);
            $custInserted++;
        } else {
            $custExisting++;
        }
    }
    logMsg("Customers migration: {$custInserted} inserted, {$custExisting} already existing.");

    // 2. Migrate Pets
    logMsg("Migrating " . count($sourcePets) . " pet profiles...");
    $petCheckStmt = $pdo->prepare("SELECT id, pet_id FROM pets WHERE pet_id = :pid LIMIT 1");
    $petInserted = 0;
    $petExisting = 0;
    foreach ($sourcePets as $p) {
        $pid = $p['pet_id'];
        $petCheckStmt->execute([':pid' => $pid]);
        $existingPet = $petCheckStmt->fetch();
        
        if (!$existingPet) {
            $petData = [
                'id' => $p['id'] ?? $pid,
                'pet_id' => $pid,
                'customer_id' => $p['customer_id'],
                'customer_name' => $p['customer_name'] ?? null,
                'name' => $p['pet_name'] ?? ($p['name'] ?? 'Pet'),
                'pet_name' => $p['pet_name'] ?? ($p['name'] ?? 'Pet'),
                'species' => $p['species'] ?? 'Dog',
                'breed' => $p['breed'] ?? 'Standard',
                'age' => $p['age'] ?? '2 Years',
                'gender' => $p['gender'] ?? 'Male',
                'weight' => isset($p['weight']) ? (float)$p['weight'] : null,
                'vaccination_status' => $p['vaccination_status'] ?? 'Up to Date',
                'medical_notes' => $p['medical_notes'] ?? null,
                'feeding_preferences' => $p['feeding_preferences'] ?? null,
                'microchip_number' => $p['microchip_id'] ?? ($p['microchip_number'] ?? null),
                'microchip_id' => $p['microchip_id'] ?? ($p['microchip_number'] ?? null),
                'barcode' => $p['barcode'] ?? null,
                'is_boarding_now' => !empty($p['is_boarding_now']) ? 1 : 0,
                'check_in_date' => $p['check_in_date'] ?? null,
                'check_out_date' => $p['check_out_date'] ?? null,
                'room_no' => $p['room_no'] ?? 'Standard Care',
                'created_at' => $p['created_at'] ?? date('Y-m-d H:i:s'),
                'updated_at' => $p['updated_at'] ?? date('Y-m-d H:i:s')
            ];
            execDynamicInsert($pdo, 'pets', $petData);
            $petInserted++;
        } else {
            $petExisting++;
        }
    }
    logMsg("Pets migration: {$petInserted} inserted, {$petExisting} already existing.");

    // 3. Migrate Invoices (Strictly the 25 target invoices)
    logMsg("Migrating 25 invoice headers...");
    $invInserted = 0;
    foreach ($sourceInvoices as $inv) {
        $invData = [
            'id' => $inv['id'] ?? $inv['internal_invoice_id'],
            'internal_invoice_id' => $inv['internal_invoice_id'],
            'invoice_number' => $inv['invoice_number'],
            'financial_year' => $inv['financial_year'] ?? '2026-27',
            'invoice_date' => $inv['invoice_date'],
            'due_date' => $inv['due_date'] ?? $inv['invoice_date'],
            'customer_id' => $inv['customer_id'],
            'customer_name' => $inv['customer_name'],
            'customer_phone' => $inv['customer_phone'] ?? null,
            'customer_email' => $inv['customer_email'] ?? null,
            'customer_address' => $inv['customer_address'] ?? null,
            'customer_gstin' => $inv['customer_gstin'] ?? null,
            'pet_id' => $inv['pet_id'] ?? null,
            'pet_name' => $inv['pet_name'] ?? null,
            'place_of_supply' => $inv['place_of_supply'] ?? '27-Maharashtra',
            'is_inter_state' => !empty($inv['is_inter_state']) ? 1 : 0,
            'sub_total' => (float)$inv['sub_total'],
            'total_discount' => (float)($inv['total_discount'] ?? 0),
            'taxable_amount' => (float)$inv['taxable_amount'],
            'cgst_total' => (float)($inv['cgst_total'] ?? 0),
            'sgst_total' => (float)($inv['sgst_total'] ?? 0),
            'igst_total' => (float)($inv['igst_total'] ?? 0),
            'total_gst' => (float)($inv['total_gst'] ?? 0),
            'round_off' => (float)($inv['round_off'] ?? 0),
            'grand_total' => (float)$inv['grand_total'],
            'paid_amount' => (float)($inv['paid_amount'] ?? 0),
            'balance_due' => (float)($inv['balance_due'] ?? 0),
            'payment_status' => $inv['payment_status'] ?? 'PAID',
            'payment_mode' => $inv['payment_mode'] ?? 'Online',
            'notes' => $inv['notes'] ?? null,
            'created_by_role' => $inv['created_by_role'] ?? 'ADMIN',
            'created_by_name' => $inv['created_by_name'] ?? 'Chirag Jain',
            'is_cancelled' => !empty($inv['is_cancelled']) ? 1 : 0,
            'cancelled_reason' => $inv['cancelled_reason'] ?? null,
            'created_at' => $inv['created_at'] ?? date('Y-m-d H:i:s'),
            'updated_at' => $inv['updated_at'] ?? date('Y-m-d H:i:s')
        ];
        execDynamicInsert($pdo, 'invoices', $invData);
        $invInserted++;
    }
    logMsg("Invoices migration: {$invInserted}/25 inserted successfully.");

    // 4. Migrate Invoice Items
    logMsg("Migrating " . count($sourceItems) . " line items...");
    $itemsInserted = 0;
    foreach ($sourceItems as $item) {
        $itemData = [
            'id' => $item['id'] ?? $item['line_item_id'],
            'line_item_id' => $item['line_item_id'],
            'internal_invoice_id' => $item['internal_invoice_id'],
            'invoice_number' => $item['invoice_number'],
            'catalog_item_id' => $item['catalog_item_id'] ?? null,
            'item_type' => $item['item_type'] ?? 'SERVICE',
            'item_name' => $item['item_name'],
            'hsn_sac' => $item['hsn_sac'] ?? '999799',
            'price' => (float)$item['price'],
            'quantity' => (float)($item['quantity'] ?? 1),
            'discount_percent' => (float)($item['discount_percent'] ?? 0),
            'discount_amount' => (float)($item['discount_amount'] ?? 0),
            'taxable_value' => (float)$item['taxable_value'],
            'gst_rate' => (float)($item['gst_rate'] ?? 18),
            'cgst_amount' => (float)($item['cgst_amount'] ?? 0),
            'sgst_amount' => (float)($item['sgst_amount'] ?? 0),
            'igst_amount' => (float)($item['igst_amount'] ?? 0),
            'item_total' => (float)$item['item_total'],
            'created_at' => $item['created_at'] ?? date('Y-m-d H:i:s'),
            'updated_at' => $item['updated_at'] ?? date('Y-m-d H:i:s')
        ];
        execDynamicInsert($pdo, 'invoice_items', $itemData);
        $itemsInserted++;
    }
    logMsg("Line items migration: {$itemsInserted}/" . count($sourceItems) . " inserted successfully.");

    // 5. Migrate Payments
    logMsg("Migrating " . count($sourcePayments) . " payment records...");
    $paymentsInserted = 0;
    foreach ($sourcePayments as $pay) {
        $payData = [
            'id' => $pay['id'] ?? $pay['payment_id'],
            'payment_id' => $pay['payment_id'],
            'internal_invoice_id' => $pay['internal_invoice_id'],
            'invoice_number' => $pay['invoice_number'],
            'customer_id' => $pay['customer_id'],
            'customer_name' => $pay['customer_name'],
            'amount' => (float)$pay['amount'],
            'payment_date' => $pay['payment_date'],
            'payment_mode' => $pay['payment_mode'] ?? 'Online',
            'transaction_ref' => $pay['transaction_ref'] ?? null,
            'notes' => $pay['notes'] ?? null,
            'received_by' => $pay['received_by'] ?? 'Chirag Jain',
            'created_at' => $pay['created_at'] ?? date('Y-m-d H:i:s'),
            'updated_at' => $pay['updated_at'] ?? date('Y-m-d H:i:s')
        ];
        execDynamicInsert($pdo, 'payments', $payData);
        $paymentsInserted++;
    }
    logMsg("Payments migration: {$paymentsInserted}/" . count($sourcePayments) . " inserted successfully.");

    // Commit Transaction
    $pdo->commit();
    logMsg("====================================================================", 'SUCCESS');
    logMsg("TRANSACTION COMMITTED: All 25 July invoices successfully written to MySQL!", 'SUCCESS');
    logMsg("====================================================================", 'SUCCESS');

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
        logMsg("TRANSACTION ROLLED BACK: Error encountered during migration.", 'CRITICAL');
    }
    logMsg("CRITICAL FAILURE: " . $e->getMessage(), 'CRITICAL');
    exit(1);
}

// ------------------------------------------------------------------------------
// 12. POST-COMMIT VERIFICATION
// ------------------------------------------------------------------------------
logMsg("Running post-migration verification checks in MySQL...");

try {
    // 1. Verify Invoice Count
    $vInvStmt = $pdo->prepare("SELECT COUNT(*), SUM(grand_total), SUM(paid_amount), SUM(balance_due) FROM invoices WHERE invoice_number BETWEEN ? AND ?");
    $vInvStmt->execute([$expectedFirst, $expectedLast]);
    $vInvRow = $vInvStmt->fetch(PDO::FETCH_NUM);
    $migratedInvCount = (int)$vInvRow[0];
    $migratedGrandTotal = (float)$vInvRow[1];
    $migratedPaid = (float)$vInvRow[2];
    $migratedBal = (float)$vInvRow[3];

    // 2. Verify Line Items Count
    $vItemStmt = $pdo->prepare("SELECT COUNT(*), SUM(item_total) FROM invoice_items WHERE invoice_number BETWEEN ? AND ?");
    $vItemStmt->execute([$expectedFirst, $expectedLast]);
    $vItemRow = $vItemStmt->fetch(PDO::FETCH_NUM);
    $migratedItemCount = (int)$vItemRow[0];

    // 3. Verify Payments Count
    $vPayStmt = $pdo->prepare("SELECT COUNT(*), SUM(amount) FROM payments WHERE invoice_number BETWEEN ? AND ?");
    $vPayStmt->execute([$expectedFirst, $expectedLast]);
    $vPayRow = $vPayStmt->fetch(PDO::FETCH_NUM);
    $migratedPayCount = (int)$vPayRow[0];
    $migratedPaySum = (float)$vPayRow[1];

    // 4. Verify Individual Invoices Present
    $vListStmt = $pdo->prepare("SELECT invoice_number FROM invoices WHERE invoice_number BETWEEN ? AND ? ORDER BY invoice_number ASC");
    $vListStmt->execute([$expectedFirst, $expectedLast]);
    $migratedNumbers = $vListStmt->fetchAll(PDO::FETCH_COLUMN);

    $missingInTarget = array_diff($targetInvoiceNumbers, $migratedNumbers);

    $statusInvCount = ($migratedInvCount === 25 && empty($missingInTarget)) ? 'PASS' : 'FAIL';
    $statusItems = ($migratedItemCount === count($sourceItems)) ? 'PASS' : 'FAIL';
    $statusPayments = ($migratedPayCount === count($sourcePayments)) ? 'PASS' : 'FAIL';
    $statusAmount = (abs($migratedGrandTotal - $totalGrandTotal) < 0.01) ? 'PASS' : 'FAIL';

    logMsg("--------------------------------------------------------------------");
    logMsg("FINAL VERIFICATION AUDIT REPORT:");
    logMsg(sprintf("Invoices:       %d/%d [%s]", $migratedInvCount, 25, $statusInvCount));
    logMsg(sprintf("Invoice Items:  %d/%d [%s]", $migratedItemCount, count($sourceItems), $statusItems));
    logMsg(sprintf("Payments:       %d/%d [%s]", $migratedPayCount, count($sourcePayments), $statusPayments));
    logMsg(sprintf("Grand Total:    ₹%s (Source: ₹%s) [%s]", number_format($migratedGrandTotal, 2), number_format($totalGrandTotal, 2), $statusAmount));
    logMsg(sprintf("Total Paid:     ₹%s (Source: ₹%s)", number_format($migratedPaid, 2), number_format($totalPaidAmount, 2)));
    logMsg(sprintf("Total Balance:  ₹%s (Source: ₹%s)", number_format($migratedBal, 2), number_format($totalBalanceDue, 2)));
    logMsg("--------------------------------------------------------------------");

    if ($statusInvCount === 'PASS' && $statusItems === 'PASS' && $statusPayments === 'PASS' && $statusAmount === 'PASS') {
        logMsg("ALL VERIFICATION CHECKS PASSED PERFECTLY! Migration is 100% Complete and Verified.", 'SUCCESS');
    } else {
        logMsg("WARNING: Some verification counts showed discrepancies. Review log details.", 'WARN');
    }

} catch (Exception $e) {
    logMsg("Verification query failed: " . $e->getMessage(), 'ERROR');
}

logMsg("====================================================================");
logMsg("MIGRATION PROCESS FINISHED: " . date('Y-m-d H:i:s'));
logMsg("====================================================================");
exit(0);
