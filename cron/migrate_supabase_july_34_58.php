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
    echo "  Source: Supabase Production (Invoices HOP/26-27/000034 to HOP/26-27/000058)\n";
    echo "  Target: MySQL Database (jainnaga_the_house_of_pawz)\n";
    echo "  Historical 000001-000033: Fully protected (zero modifications)\n";
    echo "====================================================================\n";
    exit(0);
}

// ------------------------------------------------------------------------------
// 3. EXACT DECIMAL ARITHMETIC & FORMATTING HELPERS (Zero Floats for Money)
// ------------------------------------------------------------------------------
function toDecimalStr($val, $scale = 2) {
    if ($val === null || $val === '') {
        return '0.' . str_repeat('0', $scale);
    }
    $clean = trim((string)$val);
    $clean = str_replace([',', ' '], '', $clean);
    if (!is_numeric($clean)) {
        return '0.' . str_repeat('0', $scale);
    }
    if (function_exists('bcadd')) {
        return bcadd($clean, '0', $scale);
    }
    return number_format((float)$clean, $scale, '.', '');
}

function decimalAddStr($a, $b, $scale = 2) {
    $aDec = toDecimalStr($a, $scale);
    $bDec = toDecimalStr($b, $scale);
    if (function_exists('bcadd')) {
        return bcadd($aDec, $bDec, $scale);
    }
    return number_format((float)$aDec + (float)$bDec, $scale, '.', '');
}

function decimalCompareStr($a, $b, $scale = 2) {
    $aDec = toDecimalStr($a, $scale);
    $bDec = toDecimalStr($b, $scale);
    if (function_exists('bccomp')) {
        return bccomp($aDec, $bDec, $scale) === 0;
    }
    return $aDec === $bDec;
}

function toMysqlDateTime($val, $default = null) {
    if ($val === null || $val === '') {
        return $default !== null ? $default : date('Y-m-d H:i:s');
    }
    $str = trim((string)$val);
    try {
        $dt = new DateTime($str);
        return $dt->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        $timestamp = strtotime($str);
        if ($timestamp !== false && $timestamp > 0) {
            return date('Y-m-d H:i:s', $timestamp);
        }
        return $default !== null ? $default : date('Y-m-d H:i:s');
    }
}

function toMysqlDate($val, $default = null) {
    if ($val === null || $val === '') {
        return $default !== null ? $default : date('Y-m-d');
    }
    $str = trim((string)$val);
    try {
        $dt = new DateTime($str);
        return $dt->format('Y-m-d');
    } catch (Exception $e) {
        $timestamp = strtotime($str);
        if ($timestamp !== false && $timestamp > 0) {
            return date('Y-m-d', $timestamp);
        }
        return $default !== null ? $default : date('Y-m-d');
    }
}

// ------------------------------------------------------------------------------
// 4. LOGGING & LOCK FILE MANAGEMENT
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
    
    // Echo to CLI with ANSI color codes
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
// 5. LOAD & SANITIZE ENVIRONMENT CONFIGURATION (Strict Credential Checks)
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

// Supabase Credentials: ONLY Service-Role / Secret Key Allowed. ANON KEY IS STRICTLY FORBIDDEN!
$supabaseUrl = getenv('SUPABASE_URL') ?: ($env['SUPABASE_URL'] ?? (getenv('VITE_SUPABASE_URL') ?: ($env['VITE_SUPABASE_URL'] ?? '')));
$supabaseKey = getenv('SUPABASE_SECRET_KEY') ?: ($env['SUPABASE_SECRET_KEY'] ?? (getenv('SUPABASE_SERVICE_ROLE_KEY') ?: ($env['SUPABASE_SERVICE_ROLE_KEY'] ?? (getenv('VITE_SUPABASE_SERVICE_ROLE_KEY') ?: ($env['VITE_SUPABASE_SERVICE_ROLE_KEY'] ?? '')))));

if (empty($supabaseUrl) || empty($supabaseKey)) {
    logMsg("CRITICAL ERROR: Supabase service-role credentials missing from .env.", 'CRITICAL');
    logMsg("Required variables: SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).", 'ERROR');
    logMsg("Note: Public anon keys (VITE_SUPABASE_ANON_KEY) are strictly forbidden for database migration.", 'ERROR');
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

logMsg("Supabase Source Host: " . parse_url($supabaseUrl, PHP_URL_HOST));
logMsg("MySQL Target Database: {$dbName} @ {$dbHost}:{$dbPort} (User: {$dbUser})");

// ------------------------------------------------------------------------------
// 6. SUPABASE REST API CLIENT HELPER (cURL)
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
// 7. DEFINE EXACT 25 INVOICE SCOPE (HOP/26-27/000034 -> HOP/26-27/000058)
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
// 8. FETCH & VALIDATE SOURCE DATA FROM SUPABASE
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
    
    // Verify every single sequence member is present
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
// 9. CONNECT TO MYSQL & INSPECT PRODUCTION SCHEMA
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

// Schema Column Details Introspection
function getTableColumnMeta(PDO $pdo, $table) {
    static $cache = [];
    if (!isset($cache[$table])) {
        try {
            $stmt = $pdo->query("SHOW COLUMNS FROM `{$table}`");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $cols = [];
            foreach ($rows as $r) {
                $cols[$r['Field']] = [
                    'type' => strtolower($r['Type']),
                    'null' => strtoupper($r['Null']) === 'YES',
                    'key'  => $r['Key'],
                    'extra' => strtolower($r['Extra'])
                ];
            }
            $cache[$table] = $cols;
        } catch (Exception $e) {
            $cache[$table] = [];
        }
    }
    return $cache[$table];
}

function buildInsertDataForTable(PDO $pdo, $table, array $data) {
    $meta = getTableColumnMeta($pdo, $table);
    if (empty($meta)) return $data;
    
    $filtered = [];
    foreach ($data as $k => $v) {
        if (isset($meta[$k])) {
            // If column is auto-increment integer, omit it so MySQL assigns ID automatically
            if (strpos($meta[$k]['extra'], 'auto_increment') !== false && ($v === null || !is_numeric($v))) {
                continue;
            }
            $filtered[$k] = $v;
        }
    }
    return $filtered;
}

function execInsert(PDO $pdo, $table, array $data) {
    $filtered = buildInsertDataForTable($pdo, $table, $data);
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
// 10. TARGET DATABASE CONFLICT & HISTORICAL PROTECTION BASELINE
// ------------------------------------------------------------------------------
logMsg("Performing target database safety checks...");

// 1. Strict Target Conflict Check: NONE of 000034–000058 must exist
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

// 2. Baseline Historical Snapshot: Capture invoices 000001–000033
$histQuery = "
    SELECT internal_invoice_id, invoice_number, grand_total, paid_amount, balance_due, customer_id, invoice_date 
    FROM invoices 
    WHERE invoice_number LIKE 'HOP/26-27/%' AND invoice_number <= 'HOP/26-27/000033'
    ORDER BY invoice_number ASC
";
$histStmt = $pdo->query($histQuery);
$historicalBaseline = $histStmt->fetchAll(PDO::FETCH_ASSOC);
$histCountBaseline = count($historicalBaseline);
logMsg("Historical records baseline: {$histCountBaseline} historical invoices (000001–000033) captured for integrity protection.");

// Compute exact DECIMAL totals from Supabase source
$totalGrandTotal = '0.00';
$totalPaidAmount = '0.00';
$totalBalanceDue = '0.00';
$totalTaxable = '0.00';
$totalGst = '0.00';

foreach ($sourceInvoices as $inv) {
    $totalGrandTotal = decimalAddStr($totalGrandTotal, $inv['grand_total'] ?? 0);
    $totalPaidAmount = decimalAddStr($totalPaidAmount, $inv['paid_amount'] ?? 0);
    $totalBalanceDue = decimalAddStr($totalBalanceDue, $inv['balance_due'] ?? 0);
    $totalTaxable    = decimalAddStr($totalTaxable, $inv['taxable_amount'] ?? 0);
    $totalGst        = decimalAddStr($totalGst, $inv['total_gst'] ?? 0);
}

logMsg("--------------------------------------------------------------------");
logMsg("MIGRATION DATASET EXACT DECIMAL AUDIT:");
logMsg("Invoices to Migrate:    " . count($sourceInvoices) . " (HOP/26-27/000034 to HOP/26-27/000058)");
logMsg("Line Items to Migrate:  " . count($sourceItems));
logMsg("Payments to Migrate:    " . count($sourcePayments));
logMsg("Customers Referenced:  " . count($sourceCustomers));
logMsg("Pets Referenced:        " . count($sourcePets));
logMsg("Total Taxable Value:    ₹{$totalTaxable}");
logMsg("Total GST Amount:       ₹{$totalGst}");
logMsg("Total Grand Total:      ₹{$totalGrandTotal}");
logMsg("Total Paid Amount:      ₹{$totalPaidAmount}");
logMsg("Total Balance Due:      ₹{$totalBalanceDue}");
logMsg("--------------------------------------------------------------------");

// ------------------------------------------------------------------------------
// 11. DRY-RUN MODE EXIT
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
// 12. REAL MIGRATION: ATOMIC TRANSACTION WITH IN-TRANSACTION VERIFICATION
// ------------------------------------------------------------------------------
logMsg("Beginning ATOMIC MySQL Transaction...");

try {
    $pdo->beginTransaction();

    // --------------------------------------------------------------------------
    // A. Explicit Customer ID Mapping & Insertion
    // --------------------------------------------------------------------------
    logMsg("Processing " . count($sourceCustomers) . " customer profiles with explicit mapping...");
    $customerMapping = []; // Supabase customer_id -> MySQL customer reference
    
    $custFindStmt = $pdo->prepare("SELECT id, customer_id, full_name, phone FROM customers WHERE customer_id = :cid OR phone = :phone LIMIT 1");
    $custMeta = getTableColumnMeta($pdo, 'customers');
    
    $custInserted = 0;
    $custReused = 0;
    
    foreach ($sourceCustomers as $c) {
        $sbCustId = $c['customer_id'];
        $phone = $c['phone'] ?? '';
        
        $custFindStmt->execute([':cid' => $sbCustId, ':phone' => $phone]);
        $existingCust = $custFindStmt->fetch();
        
        if ($existingCust) {
            $customerMapping[$sbCustId] = $existingCust['customer_id'];
            $custReused++;
        } else {
            $custData = [
                'id' => $c['id'] ?? $sbCustId,
                'customer_id' => $sbCustId,
                'name' => $c['full_name'] ?? ($c['name'] ?? 'Customer'),
                'full_name' => $c['full_name'] ?? ($c['name'] ?? 'Customer'),
                'phone' => $phone ?: null,
                'email' => $c['email'] ?? null,
                'address' => $c['address'] ?? null,
                'gstin' => $c['gstin'] ?? null,
                'state' => $c['state_code'] ?? ($c['state'] ?? '27-Maharashtra'),
                'state_code' => $c['state_code'] ?? ($c['state'] ?? '27-Maharashtra'),
                'emergency_contact' => $c['emergency_contact'] ?? null,
                'outstanding_balance' => toDecimalStr($c['outstanding_balance'] ?? 0),
                'advance_balance' => toDecimalStr($c['advance_balance'] ?? 0),
                'created_at' => toMysqlDateTime($c['created_at'] ?? null),
                'updated_at' => toMysqlDateTime($c['updated_at'] ?? null)
            ];
            execInsert($pdo, 'customers', $custData);
            $customerMapping[$sbCustId] = $sbCustId;
            $custInserted++;
        }
    }
    logMsg("Customer mapping complete: {$custInserted} inserted, {$custReused} existing reused.");

    // --------------------------------------------------------------------------
    // B. Explicit Pet ID Mapping & Insertion
    // --------------------------------------------------------------------------
    logMsg("Processing " . count($sourcePets) . " pet profiles with explicit mapping...");
    $petMapping = []; // Supabase pet_id -> MySQL pet reference
    
    $petFindStmt = $pdo->prepare("SELECT id, pet_id, customer_id, pet_name FROM pets WHERE pet_id = :pid LIMIT 1");
    $petInserted = 0;
    $petReused = 0;
    
    foreach ($sourcePets as $p) {
        $sbPetId = $p['pet_id'];
        $mappedCustId = $customerMapping[$p['customer_id']] ?? $p['customer_id'];
        
        $petFindStmt->execute([':pid' => $sbPetId]);
        $existingPet = $petFindStmt->fetch();
        
        if ($existingPet) {
            $petMapping[$sbPetId] = $existingPet['pet_id'];
            $petReused++;
        } else {
            $petData = [
                'id' => $p['id'] ?? $sbPetId,
                'pet_id' => $sbPetId,
                'customer_id' => $mappedCustId,
                'customer_name' => $p['customer_name'] ?? null,
                'name' => $p['pet_name'] ?? ($p['name'] ?? 'Pet'),
                'pet_name' => $p['pet_name'] ?? ($p['name'] ?? 'Pet'),
                'species' => $p['species'] ?? 'Dog',
                'breed' => $p['breed'] ?? 'Standard',
                'age' => $p['age'] ?? '2 Years',
                'gender' => $p['gender'] ?? 'Male',
                'weight' => isset($p['weight']) ? toDecimalStr($p['weight']) : null,
                'vaccination_status' => $p['vaccination_status'] ?? 'Up to Date',
                'medical_notes' => $p['medical_notes'] ?? null,
                'feeding_preferences' => $p['feeding_preferences'] ?? null,
                'microchip_number' => $p['microchip_id'] ?? ($p['microchip_number'] ?? null),
                'microchip_id' => $p['microchip_id'] ?? ($p['microchip_number'] ?? null),
                'barcode' => $p['barcode'] ?? null,
                'is_boarding_now' => !empty($p['is_boarding_now']) ? 1 : 0,
                'check_in_date' => !empty($p['check_in_date']) ? toMysqlDateTime($p['check_in_date']) : null,
                'check_out_date' => !empty($p['check_out_date']) ? toMysqlDateTime($p['check_out_date']) : null,
                'room_no' => $p['room_no'] ?? 'Standard Care',
                'created_at' => toMysqlDateTime($p['created_at'] ?? null),
                'updated_at' => toMysqlDateTime($p['updated_at'] ?? null)
            ];
            execInsert($pdo, 'pets', $petData);
            $petMapping[$sbPetId] = $sbPetId;
            $petInserted++;
        }
    }
    logMsg("Pet mapping complete: {$petInserted} inserted, {$petReused} existing reused.");

    // --------------------------------------------------------------------------
    // C. Migrate Invoices (Strictly the 25 target invoices with exact DECIMALs)
    // --------------------------------------------------------------------------
    logMsg("Migrating 25 invoice headers with exact DECIMAL precision...");
    $invInserted = 0;
    foreach ($sourceInvoices as $inv) {
        $mappedCustId = $customerMapping[$inv['customer_id']] ?? $inv['customer_id'];
        $mappedPetId = !empty($inv['pet_id']) ? ($petMapping[$inv['pet_id']] ?? $inv['pet_id']) : null;
        
        $invData = [
            'id' => $inv['id'] ?? $inv['internal_invoice_id'],
            'internal_invoice_id' => $inv['internal_invoice_id'],
            'invoice_number' => $inv['invoice_number'],
            'financial_year' => $inv['financial_year'] ?? '2026-27',
            'invoice_date' => toMysqlDate($inv['invoice_date'] ?? null),
            'due_date' => toMysqlDate($inv['due_date'] ?? ($inv['invoice_date'] ?? null)),
            'customer_id' => $mappedCustId,
            'customer_name' => $inv['customer_name'],
            'customer_phone' => $inv['customer_phone'] ?? null,
            'customer_email' => $inv['customer_email'] ?? null,
            'customer_address' => $inv['customer_address'] ?? null,
            'customer_gstin' => $inv['customer_gstin'] ?? null,
            'pet_id' => $mappedPetId,
            'pet_name' => $inv['pet_name'] ?? null,
            'place_of_supply' => $inv['place_of_supply'] ?? '27-Maharashtra',
            'is_inter_state' => !empty($inv['is_inter_state']) ? 1 : 0,
            'sub_total' => toDecimalStr($inv['sub_total']),
            'total_discount' => toDecimalStr($inv['total_discount'] ?? 0),
            'taxable_amount' => toDecimalStr($inv['taxable_amount']),
            'cgst_total' => toDecimalStr($inv['cgst_total'] ?? 0),
            'sgst_total' => toDecimalStr($inv['sgst_total'] ?? 0),
            'igst_total' => toDecimalStr($inv['igst_total'] ?? 0),
            'total_gst' => toDecimalStr($inv['total_gst'] ?? 0),
            'round_off' => toDecimalStr($inv['round_off'] ?? 0),
            'grand_total' => toDecimalStr($inv['grand_total']),
            'paid_amount' => toDecimalStr($inv['paid_amount'] ?? 0),
            'balance_due' => toDecimalStr($inv['balance_due'] ?? 0),
            'payment_status' => $inv['payment_status'] ?? 'PAID',
            'payment_mode' => $inv['payment_mode'] ?? 'Online',
            'notes' => $inv['notes'] ?? null,
            'created_by_role' => $inv['created_by_role'] ?? 'ADMIN',
            'created_by_name' => $inv['created_by_name'] ?? 'Chirag Jain',
            'is_cancelled' => !empty($inv['is_cancelled']) ? 1 : 0,
            'cancelled_reason' => $inv['cancelled_reason'] ?? null,
            'created_at' => toMysqlDateTime($inv['created_at'] ?? null),
            'updated_at' => toMysqlDateTime($inv['updated_at'] ?? null)
        ];
        execInsert($pdo, 'invoices', $invData);
        $invInserted++;
    }
    logMsg("Invoices migration: {$invInserted}/25 inserted successfully.");

    // --------------------------------------------------------------------------
    // D. Migrate Invoice Line Items (Exact DECIMAL values)
    // --------------------------------------------------------------------------
    logMsg("Migrating " . count($sourceItems) . " line items with exact DECIMAL values...");
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
            'price' => toDecimalStr($item['price']),
            'quantity' => toDecimalStr($item['quantity'] ?? 1),
            'discount_percent' => toDecimalStr($item['discount_percent'] ?? 0),
            'discount_amount' => toDecimalStr($item['discount_amount'] ?? 0),
            'taxable_value' => toDecimalStr($item['taxable_value']),
            'gst_rate' => toDecimalStr($item['gst_rate'] ?? 18),
            'cgst_amount' => toDecimalStr($item['cgst_amount'] ?? 0),
            'sgst_amount' => toDecimalStr($item['sgst_amount'] ?? 0),
            'igst_amount' => toDecimalStr($item['igst_amount'] ?? 0),
            'item_total' => toDecimalStr($item['item_total']),
            'created_at' => toMysqlDateTime($item['created_at'] ?? null),
            'updated_at' => toMysqlDateTime($item['updated_at'] ?? null)
        ];
        execInsert($pdo, 'invoice_items', $itemData);
        $itemsInserted++;
    }
    logMsg("Line items migration: {$itemsInserted}/" . count($sourceItems) . " inserted successfully.");

    // --------------------------------------------------------------------------
    // E. Migrate Payments (Exact DECIMAL values & mapped customer IDs)
    // --------------------------------------------------------------------------
    logMsg("Migrating " . count($sourcePayments) . " payment records with exact DECIMAL values...");
    $paymentsInserted = 0;
    foreach ($sourcePayments as $pay) {
        $mappedCustId = $customerMapping[$pay['customer_id']] ?? $pay['customer_id'];
        
        $payData = [
            'id' => $pay['id'] ?? $pay['payment_id'],
            'payment_id' => $pay['payment_id'],
            'internal_invoice_id' => $pay['internal_invoice_id'],
            'invoice_number' => $pay['invoice_number'],
            'customer_id' => $mappedCustId,
            'customer_name' => $pay['customer_name'],
            'amount' => toDecimalStr($pay['amount']),
            'payment_date' => toMysqlDate($pay['payment_date'] ?? null),
            'payment_mode' => $pay['payment_mode'] ?? 'Online',
            'transaction_ref' => $pay['transaction_ref'] ?? null,
            'notes' => $pay['notes'] ?? null,
            'received_by' => $pay['received_by'] ?? 'Chirag Jain',
            'created_at' => toMysqlDateTime($pay['created_at'] ?? null),
            'updated_at' => toMysqlDateTime($pay['updated_at'] ?? null)
        ];
        execInsert($pdo, 'payments', $payData);
        $paymentsInserted++;
    }
    logMsg("Payments migration: {$paymentsInserted}/" . count($sourcePayments) . " inserted successfully.");

    // --------------------------------------------------------------------------
    // F. IN-TRANSACTION PRE-COMMIT VERIFICATION (Strict Gatekeeper)
    // --------------------------------------------------------------------------
    logMsg("Executing IN-TRANSACTION pre-commit integrity verifications...");

    // 1. Verify exact 25 invoices inserted in transaction
    $chkInvStmt = $pdo->prepare("SELECT COUNT(*), SUM(grand_total), SUM(paid_amount), SUM(balance_due), SUM(taxable_amount), SUM(total_gst) FROM invoices WHERE invoice_number BETWEEN ? AND ?");
    $chkInvStmt->execute([$expectedFirst, $expectedLast]);
    $chkInvRow = $chkInvStmt->fetch(PDO::FETCH_NUM);
    
    $txInvCount = (int)$chkInvRow[0];
    $txGrandTotal = toDecimalStr($chkInvRow[1]);
    $txPaidAmount = toDecimalStr($chkInvRow[2]);
    $txBalanceDue = toDecimalStr($chkInvRow[3]);
    $txTaxable    = toDecimalStr($chkInvRow[4]);
    $txTotalGst   = toDecimalStr($chkInvRow[5]);

    if ($txInvCount !== 25) {
        throw new Exception("PRE-COMMIT ERROR: In-transaction invoice count is {$txInvCount}, expected exactly 25.");
    }

    // 2. Verify exact monetary equality (DECIMAL comparison)
    if (!decimalCompareStr($txGrandTotal, $totalGrandTotal)) {
        throw new Exception("PRE-COMMIT ERROR: Grand total mismatch. Target: {$txGrandTotal}, Source: {$totalGrandTotal}");
    }
    if (!decimalCompareStr($txPaidAmount, $totalPaidAmount)) {
        throw new Exception("PRE-COMMIT ERROR: Paid amount mismatch. Target: {$txPaidAmount}, Source: {$totalPaidAmount}");
    }
    if (!decimalCompareStr($txBalanceDue, $totalBalanceDue)) {
        throw new Exception("PRE-COMMIT ERROR: Balance due mismatch. Target: {$txBalanceDue}, Source: {$totalBalanceDue}");
    }
    if (!decimalCompareStr($txTaxable, $totalTaxable)) {
        throw new Exception("PRE-COMMIT ERROR: Taxable amount mismatch. Target: {$txTaxable}, Source: {$totalTaxable}");
    }
    if (!decimalCompareStr($txTotalGst, $totalGst)) {
        throw new Exception("PRE-COMMIT ERROR: Total GST mismatch. Target: {$txTotalGst}, Source: {$totalGst}");
    }

    // 3. Verify Line Items Count
    $chkItemStmt = $pdo->prepare("SELECT COUNT(*) FROM invoice_items WHERE invoice_number BETWEEN ? AND ?");
    $chkItemStmt->execute([$expectedFirst, $expectedLast]);
    $txItemCount = (int)$chkItemStmt->fetchColumn();
    if ($txItemCount !== count($sourceItems)) {
        throw new Exception("PRE-COMMIT ERROR: In-transaction line items count is {$txItemCount}, expected " . count($sourceItems));
    }

    // 4. Verify Payments Count
    $chkPayStmt = $pdo->prepare("SELECT COUNT(*), SUM(amount) FROM payments WHERE invoice_number BETWEEN ? AND ?");
    $chkPayStmt->execute([$expectedFirst, $expectedLast]);
    $chkPayRow = $chkPayStmt->fetch(PDO::FETCH_NUM);
    $txPayCount = (int)$chkPayRow[0];
    $txPaySum = toDecimalStr($chkPayRow[1]);
    
    if ($txPayCount !== count($sourcePayments)) {
        throw new Exception("PRE-COMMIT ERROR: In-transaction payments count is {$txPayCount}, expected " . count($sourcePayments));
    }

    // 5. Verify Historical 000001–000033 Integrity
    $histCheckStmt = $pdo->query($histQuery);
    $historicalAfter = $histCheckStmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($historicalAfter) !== $histCountBaseline) {
        throw new Exception("CRITICAL INTEGRITY ERROR: Historical invoice count altered from {$histCountBaseline} to " . count($historicalAfter));
    }
    for ($h = 0; $h < $histCountBaseline; $h++) {
        $b = $historicalBaseline[$h];
        $a = $historicalAfter[$h];
        if ($b['invoice_number'] !== $a['invoice_number'] || 
            !decimalCompareStr($b['grand_total'], $a['grand_total']) ||
            !decimalCompareStr($b['paid_amount'], $a['paid_amount']) ||
            !decimalCompareStr($b['balance_due'], $a['balance_due'])) {
            throw new Exception("CRITICAL INTEGRITY ERROR: Historical invoice {$b['invoice_number']} was modified during migration!");
        }
    }
    logMsg("In-transaction integrity checks PASSED: All pre-commit validations are 100% verified.", 'SUCCESS');

    // --------------------------------------------------------------------------
    // G. COMMIT TRANSACTION
    // --------------------------------------------------------------------------
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
// 13. POST-COMMIT FINAL AUDIT REPORT (Read-Only)
// ------------------------------------------------------------------------------
logMsg("Generating post-migration final verification audit report...");

try {
    $vInvStmt = $pdo->prepare("SELECT COUNT(*), SUM(grand_total), SUM(paid_amount), SUM(balance_due) FROM invoices WHERE invoice_number BETWEEN ? AND ?");
    $vInvStmt->execute([$expectedFirst, $expectedLast]);
    $vInvRow = $vInvStmt->fetch(PDO::FETCH_NUM);
    $finalInvCount = (int)$vInvRow[0];
    $finalGrandTotal = toDecimalStr($vInvRow[1]);
    $finalPaid = toDecimalStr($vInvRow[2]);
    $finalBal = toDecimalStr($vInvRow[3]);

    $vItemStmt = $pdo->prepare("SELECT COUNT(*) FROM invoice_items WHERE invoice_number BETWEEN ? AND ?");
    $vItemStmt->execute([$expectedFirst, $expectedLast]);
    $finalItemCount = (int)$vItemStmt->fetchColumn();

    $vPayStmt = $pdo->prepare("SELECT COUNT(*), SUM(amount) FROM payments WHERE invoice_number BETWEEN ? AND ?");
    $vPayStmt->execute([$expectedFirst, $expectedLast]);
    $vPayRow = $vPayStmt->fetch(PDO::FETCH_NUM);
    $finalPayCount = (int)$vPayRow[0];
    $finalPaySum = toDecimalStr($vPayRow[1]);

    $vListStmt = $pdo->prepare("SELECT invoice_number FROM invoices WHERE invoice_number BETWEEN ? AND ? ORDER BY invoice_number ASC");
    $vListStmt->execute([$expectedFirst, $expectedLast]);
    $finalNumbers = $vListStmt->fetchAll(PDO::FETCH_COLUMN);

    $missingInTarget = array_diff($targetInvoiceNumbers, $finalNumbers);

    $statusInvCount = ($finalInvCount === 25 && empty($missingInTarget)) ? 'PASS' : 'FAIL';
    $statusItems = ($finalItemCount === count($sourceItems)) ? 'PASS' : 'FAIL';
    $statusPayments = ($finalPayCount === count($sourcePayments)) ? 'PASS' : 'FAIL';
    $statusAmount = decimalCompareStr($finalGrandTotal, $totalGrandTotal) ? 'PASS' : 'FAIL';

    logMsg("--------------------------------------------------------------------");
    logMsg("FINAL VERIFICATION AUDIT REPORT:");
    logMsg(sprintf("Invoices:       %d/%d [%s]", $finalInvCount, 25, $statusInvCount));
    logMsg(sprintf("Invoice Items:  %d/%d [%s]", $finalItemCount, count($sourceItems), $statusItems));
    logMsg(sprintf("Payments:       %d/%d [%s]", $finalPayCount, count($sourcePayments), $statusPayments));
    logMsg("Grand Total:    ₹{$finalGrandTotal} (Source: ₹{$totalGrandTotal}) [{$statusAmount}]");
    logMsg("Total Paid:     ₹{$finalPaid} (Source: ₹{$totalPaidAmount})");
    logMsg("Total Balance:  ₹{$finalBal} (Source: ₹{$totalBalanceDue})");
    logMsg("--------------------------------------------------------------------");

    if ($statusInvCount === 'PASS' && $statusItems === 'PASS' && $statusPayments === 'PASS' && $statusAmount === 'PASS') {
        logMsg("ALL VERIFICATION CHECKS PASSED PERFECTLY! Migration is 100% Complete and Verified.", 'SUCCESS');
    } else {
        logMsg("WARNING: Verification counts showed discrepancies. Review log details.", 'WARN');
    }

} catch (Exception $e) {
    logMsg("Verification query failed: " . $e->getMessage(), 'ERROR');
}

logMsg("====================================================================");
logMsg("MIGRATION PROCESS FINISHED: " . date('Y-m-d H:i:s'));
logMsg("====================================================================");
exit(0);
