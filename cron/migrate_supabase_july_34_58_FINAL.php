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
// 3. EXACT DECIMAL ARITHMETIC (NO FLOATS / NO BCMATH DEPENDENCY)
// ------------------------------------------------------------------------------

function decimalParts($value) {
    if ($value === null || $value === '') {
        return ['sign' => 1, 'int' => '0', 'frac' => ''];
    }

    $s = trim((string)$value);
    $s = str_replace([',', ' '], '', $s);

    if ($s === '' || !preg_match('/^[+-]?(?:\d+)(?:\.\d+)?$/', $s)) {
        throw new InvalidArgumentException("Invalid decimal value: " . (string)$value);
    }

    $sign = 1;
    if ($s[0] === '-') {
        $sign = -1;
        $s = substr($s, 1);
    } elseif ($s[0] === '+') {
        $s = substr($s, 1);
    }

    $parts = explode('.', $s, 2);
    $int = ltrim($parts[0], '0');
    $frac = isset($parts[1]) ? rtrim($parts[1], '0') : '';

    return [
        'sign' => ($int === '0' && $frac === '') ? 1 : $sign,
        'int' => ($int === '' ? '0' : $int),
        'frac' => $frac
    ];
}

function decimalNormalize($value, $scale = 2) {
    $scale = max(0, (int)$scale);
    $p = decimalParts($value);

    $frac = $p['frac'];
    if (strlen($frac) > $scale) {
        // Round half-up using strings only.
        $keep = substr($frac, 0, $scale);
        $roundDigit = (int)$frac[$scale];
        if ($roundDigit >= 5) {
            $combined = $p['int'] . str_pad($keep, $scale, '0');
            $combined = decimalUnsignedAdd($combined, '1');
            if ($scale > 0) {
                $combined = str_pad($combined, $scale + 1, '0', STR_PAD_LEFT);
                $intPart = substr($combined, 0, -$scale);
                $keep = substr($combined, -$scale);
            } else {
                $intPart = $combined;
                $keep = '';
            }
        } else {
            $intPart = $p['int'];
        }
    } else {
        $intPart = $p['int'];
        $keep = $frac;
    }

    $keep = str_pad($keep, $scale, '0');
    $negative = ($p['sign'] < 0 && ($intPart !== '0' || trim($keep, '0') !== ''));

    return ($negative ? '-' : '') . $intPart . ($scale > 0 ? '.' . $keep : '');
}

function decimalUnsignedAdd($a, $b) {
    $a = ltrim((string)$a, '0'); $a = ($a === '' ? '0' : $a);
    $b = ltrim((string)$b, '0'); $b = ($b === '' ? '0' : $b);
    $i = strlen($a) - 1;
    $j = strlen($b) - 1;
    $carry = 0;
    $out = '';

    while ($i >= 0 || $j >= 0 || $carry > 0) {
        $da = ($i >= 0) ? ord($a[$i--]) - 48 : 0;
        $db = ($j >= 0) ? ord($b[$j--]) - 48 : 0;
        $sum = $da + $db + $carry;
        $out = chr(48 + ($sum % 10)) . $out;
        $carry = intdiv($sum, 10);
    }
    return ltrim($out, '0') === '' ? '0' : ltrim($out, '0');
}

function decimalUnsignedCompare($a, $b) {
    $a = ltrim((string)$a, '0'); $a = ($a === '' ? '0' : $a);
    $b = ltrim((string)$b, '0'); $b = ($b === '' ? '0' : $b);
    if (strlen($a) !== strlen($b)) return strlen($a) <=> strlen($b);
    return strcmp($a, $b) <=> 0;
}

function decimalUnsignedSubtract($a, $b) {
    // Requires a >= b; returns a-b.
    $i = strlen($a) - 1;
    $j = strlen($b) - 1;
    $borrow = 0;
    $out = '';

    while ($i >= 0) {
        $da = (ord($a[$i--]) - 48) - $borrow;
        $db = ($j >= 0) ? ord($b[$j--]) - 48 : 0;
        if ($da < $db) { $da += 10; $borrow = 1; } else { $borrow = 0; }
        $out = chr(48 + ($da - $db)) . $out;
    }
    $out = ltrim($out, '0');
    return $out === '' ? '0' : $out;
}

function decimalToScaledInteger($value, $scale) {
    $p = decimalParts($value);
    $frac = str_pad(substr($p['frac'], 0, $scale), $scale, '0');
    $scaled = ltrim($p['int'] . $frac, '0');
    $scaled = ($scaled === '' ? '0' : $scaled);
    return [$p['sign'], $scaled];
}

function decimalAddStr($a, $b, $scale = 2) {
    $a = decimalNormalize($a, $scale);
    $b = decimalNormalize($b, $scale);
    [$sa, $ia] = decimalToScaledInteger($a, $scale);
    [$sb, $ib] = decimalToScaledInteger($b, $scale);

    if ($sa === $sb) {
        $sum = decimalUnsignedAdd($ia, $ib);
        $sign = $sa;
    } else {
        $cmp = decimalUnsignedCompare($ia, $ib);
        if ($cmp === 0) return '0.' . str_repeat('0', $scale);
        if ($cmp > 0) { $sum = decimalUnsignedSubtract($ia, $ib); $sign = $sa; }
        else { $sum = decimalUnsignedSubtract($ib, $ia); $sign = $sb; }
    }

    if ($scale > 0) {
        $sum = str_pad($sum, $scale + 1, '0', STR_PAD_LEFT);
        $intPart = substr($sum, 0, -$scale);
        $fracPart = substr($sum, -$scale);
        $result = $intPart . '.' . $fracPart;
    } else {
        $result = $sum;
    }
    return ($sign < 0 && $result !== '0.' . str_repeat('0', $scale) && $result !== '0') ? '-' . $result : $result;
}

function toDecimalStr($val, $scale = 2) {
    return decimalNormalize($val === null || $val === '' ? '0' : $val, $scale);
}

function decimalCompareStr($a, $b, $scale = 2) {
    $a = decimalNormalize($a, $scale);
    $b = decimalNormalize($b, $scale);
    [$sa, $ia] = decimalToScaledInteger($a, $scale);
    [$sb, $ib] = decimalToScaledInteger($b, $scale);

    if ($sa !== $sb) {
        if ($ia === '0' && $ib === '0') return true;
        return $sa > $sb;
    }
    $cmp = decimalUnsignedCompare($ia, $ib);
    return $sa > 0 ? $cmp === 0 : $cmp === 0;
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

$requiredExtensions = ['curl', 'pdo', 'pdo_mysql'];
foreach ($requiredExtensions as $ext) {
    if (!extension_loaded($ext)) {
        logMsg("CRITICAL ERROR: Required PHP extension missing: {$ext}", 'CRITICAL');
        exit(1);
    }
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

    // Strict source relationship validation before any MySQL write.
    $sourceInvoiceIds = [];
    foreach ($sourceInvoices as $inv) {
        if (!isset($inv['internal_invoice_id']) || $inv['internal_invoice_id'] === '') {
            throw new Exception("Source invoice {$inv['invoice_number']} has no internal_invoice_id.");
        }
        $sourceInvoiceIds[(string)$inv['internal_invoice_id']] = $inv['invoice_number'];
    }

    foreach ($sourceItems as $item) {
        $iid = (string)($item['internal_invoice_id'] ?? '');
        if (!isset($sourceInvoiceIds[$iid])) {
            throw new Exception("Source invoice_items contains an orphan internal_invoice_id: {$iid}");
        }
        if (!isset($receivedMap[$item['invoice_number']])) {
            throw new Exception("Source invoice_items contains an out-of-scope invoice number: " . ($item['invoice_number'] ?? 'NULL'));
        }
    }

    foreach ($sourcePayments as $pay) {
        $iid = (string)($pay['internal_invoice_id'] ?? '');
        if (!isset($sourceInvoiceIds[$iid])) {
            throw new Exception("Source payments contains an orphan internal_invoice_id: {$iid}");
        }
        if (!isset($receivedMap[$pay['invoice_number']])) {
            throw new Exception("Source payments contains an out-of-scope invoice number: " . ($pay['invoice_number'] ?? 'NULL'));
        }
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
        $stmt = $pdo->query("SHOW COLUMNS FROM `" . str_replace('`','``',$table) . "`");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $cols = [];
        foreach ($rows as $r) {
            $cols[$r['Field']] = [
                'type' => strtolower($r['Type']),
                'null' => strtoupper($r['Null']) === 'YES',
                'key' => $r['Key'],
                'extra' => strtolower($r['Extra']),
                'default' => $r['Default']
            ];
        }
        $cache[$table] = $cols;
    }
    return $cache[$table];
}

function isAutoIncrementColumn(array $meta, $column) {
    return isset($meta[$column]) && strpos($meta[$column]['extra'], 'auto_increment') !== false;
}

function getForeignKeyReference(PDO $pdo, $table, $column) {
    $sql = "
        SELECT REFERENCED_TABLE_NAME AS ref_table, REFERENCED_COLUMN_NAME AS ref_column
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :table
          AND COLUMN_NAME = :column
          AND REFERENCED_TABLE_NAME IS NOT NULL
        LIMIT 1
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':table'=>$table, ':column'=>$column]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function buildInsertDataForTable(PDO $pdo, $table, array $data) {
    $meta = getTableColumnMeta($pdo, $table);
    if (empty($meta)) throw new Exception("Target table '{$table}' does not exist or has no readable columns.");

    $filtered = [];
    foreach ($data as $k => $v) {
        if (!isset($meta[$k])) continue;
        // NEVER explicitly insert an AUTO_INCREMENT column.
        if (isAutoIncrementColumn($meta, $k)) continue;
        $filtered[$k] = $v;
    }
    return $filtered;
}

function execInsert(PDO $pdo, $table, array $data) {
    $filtered = buildInsertDataForTable($pdo, $table, $data);
    if (empty($filtered)) throw new Exception("No valid columns to insert into table {$table}");

    $colList = '`' . implode('`, `', array_keys($filtered)) . '`';
    $paramList = ':' . implode(', :', array_keys($filtered));
    $stmt = $pdo->prepare("INSERT INTO `{$table}` ({$colList}) VALUES ({$paramList})");
    $params = [];
    foreach ($filtered as $k => $v) $params[':' . $k] = $v;
    $stmt->execute($params);
    return $stmt;
}

function chooseReferenceColumn(PDO $pdo, $childTable, $childColumn, $expectedTable, $defaultColumn) {
    $fk = getForeignKeyReference($pdo, $childTable, $childColumn);
    if ($fk && strcasecmp($fk['ref_table'], $expectedTable) === 0) {
        return $fk['ref_column'];
    }
    return $defaultColumn;
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
    logMsg("All 25 invoices and their source relationships are valid and ready. No MySQL rows were written.", 'SUCCESS');
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
    // A. Explicit Customer Mapping & Insertion
    logMsg("Processing " . count($sourceCustomers) . " customer profiles with explicit target mapping...");
    $customerMapping = [];
    $customerRowsBySource = [];

    $invoiceMeta = getTableColumnMeta($pdo, 'invoices');
    $customerMeta = getTableColumnMeta($pdo, 'customers');
    $petMeta = getTableColumnMeta($pdo, 'pets');

    // Determine which target column invoices.customer_id actually references.
    $invoiceCustomerRefColumn = chooseReferenceColumn($pdo, 'invoices', 'customer_id', 'customers', 'customer_id');
    if (!isset($customerMeta[$invoiceCustomerRefColumn])) {
        throw new Exception("Cannot resolve invoices.customer_id -> customers reference column '{$invoiceCustomerRefColumn}'.");
    }
    logMsg("Customer FK mapping: invoices.customer_id -> customers.{$invoiceCustomerRefColumn}");

    $custFindStmt = $pdo->prepare(
        "SELECT * FROM customers WHERE customer_id = :cid OR phone = :phone LIMIT 1"
    );

    $custInserted = 0; $custReused = 0;
    foreach ($sourceCustomers as $c) {
        $sbCustId = (string)$c['customer_id'];
        $phone = isset($c['phone']) ? (string)$c['phone'] : '';

        $custFindStmt->execute([':cid'=>$sbCustId, ':phone'=>$phone]);
        $existingCust = $custFindStmt->fetch(PDO::FETCH_ASSOC);

        if ($existingCust) {
            $customerRowsBySource[$sbCustId] = $existingCust;
            $customerMapping[$sbCustId] = $existingCust[$invoiceCustomerRefColumn] ?? $existingCust['customer_id'];
            $custReused++;
        } else {
            $custData = [
                'customer_id' => $sbCustId,
                'name' => $c['full_name'] ?? ($c['name'] ?? 'Customer'),
                'full_name' => $c['full_name'] ?? ($c['name'] ?? 'Customer'),
                'phone' => $phone,
                'email' => $c['email'] ?? null,
                'address' => $c['address'] ?? null,
                'gstin' => $c['gstin'] ?? null,
                'state' => $c['state_code'] ?? ($c['state'] ?? '27-Maharashtra'),
                'state_code' => $c['state_code'] ?? ($c['state'] ?? '27-Maharashtra'),
                'emergency_contact' => $c['emergency_contact'] ?? null,
                'outstanding_balance' => toDecimalStr($c['outstanding_balance'] ?? 0),
                'advance_balance' => toDecimalStr($c['advance_balance'] ?? 0),
                'created_at' => $c['created_at'] ?? date('Y-m-d H:i:s'),
                'updated_at' => $c['updated_at'] ?? date('Y-m-d H:i:s')
            ];
            execInsert($pdo, 'customers', $custData);

            $lookup = $pdo->prepare("SELECT * FROM customers WHERE customer_id = :cid LIMIT 1");
            $lookup->execute([':cid'=>$sbCustId]);
            $newCust = $lookup->fetch(PDO::FETCH_ASSOC);
            if (!$newCust) throw new Exception("Customer insertion succeeded but target customer {$sbCustId} could not be re-read.");

            $customerRowsBySource[$sbCustId] = $newCust;
            $customerMapping[$sbCustId] = $newCust[$invoiceCustomerRefColumn] ?? $newCust['customer_id'];
            $custInserted++;
        }
    }
    logMsg("Customer mapping complete: {$custInserted} inserted, {$custReused} existing reused.");

    // B. Explicit Pet Mapping & Insertion
    logMsg("Processing " . count($sourcePets) . " pet profiles with explicit target mapping...");
    $petMapping = [];
    $petRowsBySource = [];

    $invoicePetRefColumn = null;
    if (isset($invoiceMeta['pet_id'])) {
        $fkPet = getForeignKeyReference($pdo, 'invoices', 'pet_id');
        if ($fkPet && strcasecmp($fkPet['ref_table'], 'pets') === 0) {
            $invoicePetRefColumn = $fkPet['ref_column'];
        } else {
            $invoicePetRefColumn = 'pet_id';
        }
    }
    if ($invoicePetRefColumn && !isset($petMeta[$invoicePetRefColumn])) {
        throw new Exception("Cannot resolve invoices.pet_id -> pets.{$invoicePetRefColumn}.");
    }
    if ($invoicePetRefColumn) logMsg("Pet FK mapping: invoices.pet_id -> pets.{$invoicePetRefColumn}");

    $petFindStmt = $pdo->prepare("SELECT * FROM pets WHERE pet_id = :pid LIMIT 1");
    $petInserted = 0; $petReused = 0;

    foreach ($sourcePets as $p) {
        $sbPetId = (string)$p['pet_id'];
        $mappedCustForPet = $customerMapping[(string)($p['customer_id'] ?? '')] ?? ($p['customer_id'] ?? null);

        $petFindStmt->execute([':pid'=>$sbPetId]);
        $existingPet = $petFindStmt->fetch(PDO::FETCH_ASSOC);

        if ($existingPet) {
            $petRowsBySource[$sbPetId] = $existingPet;
            $petMapping[$sbPetId] = $invoicePetRefColumn ? ($existingPet[$invoicePetRefColumn] ?? $existingPet['pet_id']) : $existingPet['pet_id'];
            $petReused++;
        } else {
            $petData = [
                'pet_id' => $sbPetId,
                'customer_id' => $mappedCustForPet,
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
                'check_in_date' => $p['check_in_date'] ?? null,
                'check_out_date' => $p['check_out_date'] ?? null,
                'room_no' => $p['room_no'] ?? 'Standard Care',
                'created_at' => $p['created_at'] ?? date('Y-m-d H:i:s'),
                'updated_at' => $p['updated_at'] ?? date('Y-m-d H:i:s')
            ];
            execInsert($pdo, 'pets', $petData);

            $lookup = $pdo->prepare("SELECT * FROM pets WHERE pet_id = :pid LIMIT 1");
            $lookup->execute([':pid'=>$sbPetId]);
            $newPet = $lookup->fetch(PDO::FETCH_ASSOC);
            if (!$newPet) throw new Exception("Pet insertion succeeded but target pet {$sbPetId} could not be re-read.");

            $petRowsBySource[$sbPetId] = $newPet;
            $petMapping[$sbPetId] = $invoicePetRefColumn ? ($newPet[$invoicePetRefColumn] ?? $newPet['pet_id']) : $newPet['pet_id'];
            $petInserted++;
        }
    }
    logMsg("Pet mapping complete: {$petInserted} inserted, {$petReused} existing reused.");

    // C. Migrate invoice headers and build SOURCE internal_invoice_id -> TARGET reference map.
    logMsg("Migrating 25 invoice headers with exact source values...");
    $invoiceInternalMapping = [];
    $invoiceTargetRows = [];
    $invInserted = 0;

    $invoiceInternalRefColumn = isset($invoiceMeta['internal_invoice_id']) ? 'internal_invoice_id' : 'id';
    foreach ($sourceInvoices as $inv) {
        $sourceInternalId = (string)$inv['internal_invoice_id'];
        $mappedCustId = $customerMapping[(string)$inv['customer_id']] ?? null;
        if ($mappedCustId === null) throw new Exception("No mapped customer for invoice {$inv['invoice_number']}.");

        $mappedPetId = null;
        if (!empty($inv['pet_id'])) {
            $mappedPetId = $petMapping[(string)$inv['pet_id']] ?? null;
            if ($mappedPetId === null) throw new Exception("No mapped pet for invoice {$inv['invoice_number']} / pet {$inv['pet_id']}.");
        }

        $invData = [
            'internal_invoice_id' => $inv['internal_invoice_id'],
            'invoice_number' => $inv['invoice_number'],
            'financial_year' => $inv['financial_year'] ?? '2026-27',
            'invoice_date' => $inv['invoice_date'],
            'due_date' => $inv['due_date'] ?? $inv['invoice_date'],
            'customer_id' => $mappedCustId,
            'customer_name' => $inv['customer_name'] ?? null,
            'customer_phone' => $inv['customer_phone'] ?? null,
            'customer_email' => $inv['customer_email'] ?? null,
            'customer_address' => $inv['customer_address'] ?? null,
            'customer_gstin' => $inv['customer_gstin'] ?? null,
            'pet_id' => $mappedPetId,
            'pet_name' => $inv['pet_name'] ?? null,
            'place_of_supply' => $inv['place_of_supply'] ?? '27-Maharashtra',
            'is_inter_state' => !empty($inv['is_inter_state']) ? 1 : 0,
            'sub_total' => $inv['sub_total'] ?? '0',
            'total_discount' => $inv['total_discount'] ?? '0',
            'taxable_amount' => $inv['taxable_amount'] ?? '0',
            'cgst_total' => $inv['cgst_total'] ?? '0',
            'sgst_total' => $inv['sgst_total'] ?? '0',
            'igst_total' => $inv['igst_total'] ?? '0',
            'total_gst' => $inv['total_gst'] ?? '0',
            'round_off' => $inv['round_off'] ?? '0',
            'grand_total' => $inv['grand_total'] ?? '0',
            'paid_amount' => $inv['paid_amount'] ?? '0',
            'balance_due' => $inv['balance_due'] ?? '0',
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

        execInsert($pdo, 'invoices', $invData);

        $read = $pdo->prepare("SELECT * FROM invoices WHERE invoice_number = :n LIMIT 1");
        $read->execute([':n'=>$inv['invoice_number']]);
        $targetInv = $read->fetch(PDO::FETCH_ASSOC);
        if (!$targetInv) throw new Exception("Invoice {$inv['invoice_number']} inserted but could not be re-read.");

        $targetInvoiceReference = $targetInv[$invoiceInternalRefColumn] ?? ($targetInv['id'] ?? null);
        if ($targetInvoiceReference === null) throw new Exception("Could not resolve target invoice reference for {$inv['invoice_number']}.");

        $invoiceInternalMapping[$sourceInternalId] = $targetInvoiceReference;
        $invoiceTargetRows[$inv['invoice_number']] = $targetInv;
        $invInserted++;
    }
    logMsg("Invoices migration: {$invInserted}/25 inserted successfully. Source internal_invoice_id mapping built for all 25.");

    // D. Migrate Invoice Line Items using TARGET invoice reference mapping.
    $itemInvoiceRefColumn = 'internal_invoice_id';
    $itemFk = getForeignKeyReference($pdo, 'invoice_items', 'internal_invoice_id');
    if ($itemFk && strcasecmp($itemFk['ref_table'], 'invoices') === 0) {
        $itemInvoiceRefColumn = $itemFk['ref_column'];
    }
    logMsg("invoice_items.internal_invoice_id target reference resolves to invoices.{$itemInvoiceRefColumn}");

    $itemsInserted = 0;
    foreach ($sourceItems as $item) {
        $sourceInvId = (string)($item['internal_invoice_id'] ?? '');
        if (!isset($invoiceInternalMapping[$sourceInvId])) {
            throw new Exception("Line item {$item['line_item_id']} references unknown source invoice internal ID {$sourceInvId}.");
        }

        $itemData = [
            'line_item_id' => $item['line_item_id'] ?? null,
            'internal_invoice_id' => $invoiceInternalMapping[$sourceInvId],
            'invoice_number' => $item['invoice_number'] ?? null,
            'catalog_item_id' => $item['catalog_item_id'] ?? null,
            'item_type' => $item['item_type'] ?? 'SERVICE',
            'item_name' => $item['item_name'] ?? null,
            'hsn_sac' => $item['hsn_sac'] ?? '999799',
            'price' => $item['price'] ?? '0',
            'quantity' => $item['quantity'] ?? '1',
            'discount_percent' => $item['discount_percent'] ?? '0',
            'discount_amount' => $item['discount_amount'] ?? '0',
            'taxable_value' => $item['taxable_value'] ?? '0',
            'gst_rate' => $item['gst_rate'] ?? '18',
            'cgst_amount' => $item['cgst_amount'] ?? '0',
            'sgst_amount' => $item['sgst_amount'] ?? '0',
            'igst_amount' => $item['igst_amount'] ?? '0',
            'item_total' => $item['item_total'] ?? '0',
            'created_at' => $item['created_at'] ?? date('Y-m-d H:i:s'),
            'updated_at' => $item['updated_at'] ?? date('Y-m-d H:i:s')
        ];
        execInsert($pdo, 'invoice_items', $itemData);
        $itemsInserted++;
    }
    logMsg("Line items migration: {$itemsInserted}/" . count($sourceItems) . " inserted successfully.");

    // E. Migrate Payments using TARGET invoice reference mapping.
    $paymentsInserted = 0;
    foreach ($sourcePayments as $pay) {
        $sourceInvId = (string)($pay['internal_invoice_id'] ?? '');
        if (!isset($invoiceInternalMapping[$sourceInvId])) {
            throw new Exception("Payment {$pay['payment_id']} references unknown source invoice internal ID {$sourceInvId}.");
        }

        $mappedCustId = null;
        if (isset($pay['customer_id'])) {
            $mappedCustId = $customerMapping[(string)$pay['customer_id']] ?? null;
            if ($mappedCustId === null) throw new Exception("No mapped customer for payment {$pay['payment_id']}.");
        }

        $payData = [
            'payment_id' => $pay['payment_id'] ?? null,
            'internal_invoice_id' => $invoiceInternalMapping[$sourceInvId],
            'invoice_number' => $pay['invoice_number'] ?? null,
            'customer_id' => $mappedCustId,
            'customer_name' => $pay['customer_name'] ?? null,
            'amount' => $pay['amount'] ?? '0',
            'payment_date' => $pay['payment_date'] ?? null,
            'payment_mode' => $pay['payment_mode'] ?? 'Online',
            'transaction_ref' => $pay['transaction_ref'] ?? null,
            'notes' => $pay['notes'] ?? null,
            'received_by' => $pay['received_by'] ?? 'Chirag Jain',
            'created_at' => $pay['created_at'] ?? date('Y-m-d H:i:s'),
            'updated_at' => $pay['updated_at'] ?? date('Y-m-d H:i:s')
        ];
        execInsert($pdo, 'payments', $payData);
        $paymentsInserted++;
    }
    logMsg("Payments migration: {$paymentsInserted}/" . count($sourcePayments) . " inserted successfully.");

// --------------------------------------------------------------------------
    // F. IN-TRANSACTION PRE-COMMIT VERIFICATION (Strict Gatekeeper)
    // --------------------------------------------------------------------------
    logMsg("Executing IN-TRANSACTION pre-commit integrity verifications...");

    // 1. Verify exactly the 25 invoice numbers exist.
    $chkInvStmt = $pdo->prepare("SELECT COUNT(*), SUM(grand_total), SUM(paid_amount), SUM(balance_due), SUM(taxable_amount), SUM(total_gst) FROM invoices WHERE invoice_number BETWEEN ? AND ?");
    $chkInvStmt->execute([$expectedFirst, $expectedLast]);
    $chkInvRow = $chkInvStmt->fetch(PDO::FETCH_NUM);

    $txInvCount = (int)$chkInvRow[0];
    $txGrandTotal = toDecimalStr($chkInvRow[1]);
    $txPaidAmount = toDecimalStr($chkInvRow[2]);
    $txBalanceDue = toDecimalStr($chkInvRow[3]);
    $txTaxable = toDecimalStr($chkInvRow[4]);
    $txTotalGst = toDecimalStr($chkInvRow[5]);

    if ($txInvCount !== 25) throw new Exception("PRE-COMMIT ERROR: Invoice count {$txInvCount}; expected 25.");
    if (!decimalCompareStr($txGrandTotal, $totalGrandTotal)) throw new Exception("PRE-COMMIT ERROR: Grand total mismatch.");
    if (!decimalCompareStr($txPaidAmount, $totalPaidAmount)) throw new Exception("PRE-COMMIT ERROR: Paid amount mismatch.");
    if (!decimalCompareStr($txBalanceDue, $totalBalanceDue)) throw new Exception("PRE-COMMIT ERROR: Balance due mismatch.");
    if (!decimalCompareStr($txTaxable, $totalTaxable)) throw new Exception("PRE-COMMIT ERROR: Taxable amount mismatch.");
    if (!decimalCompareStr($txTotalGst, $totalGst)) throw new Exception("PRE-COMMIT ERROR: Total GST mismatch.");

    // 2. Exact invoice-by-invoice verification.
    $targetCheckStmt = $pdo->prepare("
        SELECT invoice_number, internal_invoice_id, grand_total, paid_amount, balance_due,
               taxable_amount, total_gst, customer_id, pet_id
        FROM invoices WHERE invoice_number = :n LIMIT 1
    ");
    foreach ($sourceInvoices as $srcInv) {
        $targetCheckStmt->execute([':n'=>$srcInv['invoice_number']]);
        $t = $targetCheckStmt->fetch(PDO::FETCH_ASSOC);
        if (!$t) throw new Exception("PRE-COMMIT ERROR: Missing target invoice {$srcInv['invoice_number']}.");

        if (!decimalCompareStr($t['grand_total'], $srcInv['grand_total'] ?? '0')) throw new Exception("Invoice {$srcInv['invoice_number']}: grand_total mismatch.");
        if (!decimalCompareStr($t['paid_amount'], $srcInv['paid_amount'] ?? '0')) throw new Exception("Invoice {$srcInv['invoice_number']}: paid_amount mismatch.");
        if (!decimalCompareStr($t['balance_due'], $srcInv['balance_due'] ?? '0')) throw new Exception("Invoice {$srcInv['invoice_number']}: balance_due mismatch.");
        if (!decimalCompareStr($t['taxable_amount'], $srcInv['taxable_amount'] ?? '0')) throw new Exception("Invoice {$srcInv['invoice_number']}: taxable_amount mismatch.");
        if (!decimalCompareStr($t['total_gst'], $srcInv['total_gst'] ?? '0')) throw new Exception("Invoice {$srcInv['invoice_number']}: total_gst mismatch.");
        if ((string)$t['internal_invoice_id'] !== (string)$invoiceInternalMapping[(string)$srcInv['internal_invoice_id']]) {
            throw new Exception("Invoice {$srcInv['invoice_number']}: internal invoice mapping mismatch.");
        }
    }

    // 3. Verify line-item count and source internal-invoice relationships.
    $chkItemStmt = $pdo->prepare("SELECT COUNT(*) FROM invoice_items WHERE invoice_number BETWEEN ? AND ?");
    $chkItemStmt->execute([$expectedFirst, $expectedLast]);
    $txItemCount = (int)$chkItemStmt->fetchColumn();
    if ($txItemCount !== count($sourceItems)) throw new Exception("PRE-COMMIT ERROR: Line item count {$txItemCount}; expected " . count($sourceItems));

    $itemVerifyStmt = $pdo->prepare("SELECT internal_invoice_id, invoice_number, item_name, price, quantity, taxable_value, item_total FROM invoice_items WHERE invoice_number = :n ORDER BY id ASC");
    $sourceItemsByInvoice = [];
    foreach ($sourceItems as $it) $sourceItemsByInvoice[$it['invoice_number']][] = $it;

    foreach ($sourceItemsByInvoice as $invoiceNo => $srcItems) {
        $itemVerifyStmt->execute([':n'=>$invoiceNo]);
        $targetItems = $itemVerifyStmt->fetchAll(PDO::FETCH_ASSOC);
        if (count($targetItems) !== count($srcItems)) {
            throw new Exception("Invoice {$invoiceNo}: item count mismatch.");
        }
        foreach ($srcItems as $idx => $srcItem) {
            $t = $targetItems[$idx];
            if ((string)$t['internal_invoice_id'] !== (string)$invoiceInternalMapping[(string)$srcItem['internal_invoice_id']]) {
                throw new Exception("Invoice {$invoiceNo}: line item invoice mapping mismatch.");
            }
            foreach (['price','quantity','taxable_value','item_total'] as $moneyCol) {
                if (!decimalCompareStr($t[$moneyCol], $srcItem[$moneyCol] ?? '0')) {
                    throw new Exception("Invoice {$invoiceNo}: line item {$moneyCol} mismatch.");
                }
            }
        }
    }

    // 4. Verify payments count, sum, and per-payment invoice mapping.
    $chkPayStmt = $pdo->prepare("SELECT COUNT(*), SUM(amount) FROM payments WHERE invoice_number BETWEEN ? AND ?");
    $chkPayStmt->execute([$expectedFirst, $expectedLast]);
    $chkPayRow = $chkPayStmt->fetch(PDO::FETCH_NUM);
    $txPayCount = (int)$chkPayRow[0];
    $txPaySum = toDecimalStr($chkPayRow[1]);
    if ($txPayCount !== count($sourcePayments)) throw new Exception("PRE-COMMIT ERROR: Payment count {$txPayCount}; expected " . count($sourcePayments));

    $sourcePaySum = '0.00';
    foreach ($sourcePayments as $pay) $sourcePaySum = decimalAddStr($sourcePaySum, $pay['amount'] ?? '0', 2);
    if (!decimalCompareStr($txPaySum, $sourcePaySum, 2)) throw new Exception("PRE-COMMIT ERROR: Payment total mismatch.");

    $payVerifyStmt = $pdo->prepare("SELECT internal_invoice_id, invoice_number, amount FROM payments WHERE invoice_number = :n ORDER BY payment_date ASC, id ASC");
    $sourcePaysByInvoice = [];
    foreach ($sourcePayments as $pay) $sourcePaysByInvoice[$pay['invoice_number']][] = $pay;

    foreach ($sourcePaysByInvoice as $invoiceNo => $srcPays) {
        $payVerifyStmt->execute([':n'=>$invoiceNo]);
        $targetPays = $payVerifyStmt->fetchAll(PDO::FETCH_ASSOC);
        if (count($targetPays) !== count($srcPays)) throw new Exception("Invoice {$invoiceNo}: payment count mismatch.");
        foreach ($srcPays as $idx => $srcPay) {
            $t = $targetPays[$idx];
            if ((string)$t['internal_invoice_id'] !== (string)$invoiceInternalMapping[(string)$srcPay['internal_invoice_id']]) {
                throw new Exception("Invoice {$invoiceNo}: payment invoice mapping mismatch.");
            }
            if (!decimalCompareStr($t['amount'], $srcPay['amount'] ?? '0')) throw new Exception("Invoice {$invoiceNo}: payment amount mismatch.");
        }
    }

    // 5. Verify historical 000001–000033 unchanged.
    $histCheckStmt = $pdo->query($histQuery);
    $historicalAfter = $histCheckStmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($historicalAfter) !== $histCountBaseline) {
        throw new Exception("CRITICAL INTEGRITY ERROR: Historical invoice count changed.");
    }
    for ($h = 0; $h < $histCountBaseline; $h++) {
        $b = $historicalBaseline[$h]; $a = $historicalAfter[$h];
        if ($b['invoice_number'] !== $a['invoice_number'] ||
            !decimalCompareStr($b['grand_total'], $a['grand_total']) ||
            !decimalCompareStr($b['paid_amount'], $a['paid_amount']) ||
            !decimalCompareStr($b['balance_due'], $a['balance_due']) ||
            (string)$b['customer_id'] !== (string)$a['customer_id'] ||
            (string)$b['invoice_date'] !== (string)$a['invoice_date']) {
            throw new Exception("CRITICAL INTEGRITY ERROR: Historical invoice {$b['invoice_number']} changed.");
        }
    }

    logMsg("In-transaction integrity checks PASSED: counts, totals, individual records, mappings and historical baseline verified.", 'SUCCESS');

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
        logMsg("ALL FINAL VERIFICATION CHECKS PASSED. Migration completed and verified.", 'SUCCESS');
        $finalAuditOk = true;
    } else {
        $finalAuditOk = false;
        logMsg("FINAL VERIFICATION FAILED. Review the migration log immediately.", 'CRITICAL');
    }

} catch (Exception $e) {
    $finalAuditOk = false;
    logMsg("Verification query failed: " . $e->getMessage(), 'CRITICAL');
}

logMsg("====================================================================");
logMsg("MIGRATION PROCESS FINISHED: " . date('Y-m-d H:i:s'));
logMsg("====================================================================");
exit(!empty($finalAuditOk) ? 0 : 1);
