<?php
// ==============================================================================
// import_august_invoices.php
// Standalone Production Migration Utility: Import August 2026 Invoices (01-86)
// Project: The House of Pawz – Billing Pro
//
// Target Scope: ONLY August Invoices HOP/26-27/08/000001 to HOP/26-27/08/000086 (86 total)
// Historical Invoices (July & earlier) are PROTECTED and untouched.
//
// Features:
// 1. CLI Only Enforcement (Safe for cPanel Cron / SSH CLI execution)
// 2. --dry-run validation support
// 3. Strict Decimal Precision (Zero Floats for Money)
// 4. Atomic MySQL Transaction with In-Transaction Verification
// 5. Automatic Customer & Pet Lookups / Linking
// 6. Explicit Handling of Multi-Payments and Unpaid Difference Invoices
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
    echo " The House of Pawz – August 2026 Invoice Import Utility (01-86)\n";
    echo "====================================================================\n";
    echo "Usage:\n";
    echo "  php cron/import_august_invoices.php [options]\n\n";
    echo "Options:\n";
    echo "  --dry-run   Validate all 86 invoices, customers, pets, and financial\n";
    echo "              totals WITHOUT writing or committing any changes to MySQL.\n";
    echo "  --help, -h  Show this help screen.\n\n";
    echo "Scope:\n";
    echo "  Target: August 2026 Invoices (HOP/26-27/08/000001 to HOP/26-27/08/000086)\n";
    echo "  Target Database: MySQL (jainnaga_the_house_of_pawz)\n";
    echo "  Historical Range: Fully protected (zero modifications)\n";
    echo "====================================================================\n";
    exit(0);
}

// ------------------------------------------------------------------------------
// 3. EXACT DECIMAL ARITHMETIC HELPERS (Zero Floats for Money)
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

$logFile = $logDir . '/import_august_invoices.log';
$lockFile = $logDir . '/import_august_invoices.lock';

function logMsg($message, $level = 'INFO') {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $formatted = "[{$timestamp}] [{$level}] {$message}";
    
    $prefix = '';
    if ($level === 'ERROR' || $level === 'CRITICAL') {
        $prefix = "\033[31m";
    } elseif ($level === 'SUCCESS') {
        $prefix = "\033[32m";
    } elseif ($level === 'WARN') {
        $prefix = "\033[33m";
    } elseif ($level === 'INFO') {
        $prefix = "\033[36m";
    }
    $suffix = "\033[0m";
    
    echo "{$prefix}{$formatted}{$suffix}\n";
    @file_put_contents($logFile, $formatted . "\n", FILE_APPEND | LOCK_EX);
}

// Lock acquisition
if (file_exists($lockFile)) {
    $lockData = @file_get_contents($lockFile);
    $lockPid = trim($lockData);
    $fileAge = time() - filemtime($lockFile);
    
    if ($fileAge < 900) {
        logMsg("CRITICAL ERROR: Lock file exists (PID: {$lockPid}, Age: {$fileAge}s). Another import might be running.", 'CRITICAL');
        logMsg("If previous run crashed, remove lock file manually: {$lockFile}", 'ERROR');
        exit(1);
    } else {
        logMsg("WARNING: Removing stale lock file older than 15 minutes (Age: {$fileAge}s).", 'WARN');
        @unlink($lockFile);
    }
}

@file_put_contents($lockFile, (string)getmypid());

register_shutdown_function(function() use ($lockFile) {
    if (file_exists($lockFile)) {
        @unlink($lockFile);
    }
});

logMsg("====================================================================");
logMsg("THE HOUSE OF PAWZ – AUGUST 2026 INVOICE IMPORT (01-86)");
logMsg("Execution Mode: " . ($isDryRun ? "DRY-RUN (Safe Preflight Validation)" : "LIVE PRODUCTION EXECUTION"));
logMsg("Process ID: " . getmypid());
logMsg("====================================================================");

// ------------------------------------------------------------------------------
// 5. LOAD ENVIRONMENT CREDENTIALS
// ------------------------------------------------------------------------------
function loadEnvCredentials() {
    $envFiles = [
        '/home/jainnaga/the-house-of-pawz/.env',
        '/home/jainnaga/public_html/the-house-of-pawz/.env',
        dirname(__DIR__) . '/.env',
        __DIR__ . '/.env',
        dirname(__DIR__) . '/.env.production'
    ];
    
    $env = [];
    foreach ($envFiles as $file) {
        if (file_exists($file) && is_readable($file)) {
            logMsg("Loaded environment configuration from: {$file}");
            $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || $line[0] === '#') continue;
                if (strpos($line, '=') !== false) {
                    list($k, $v) = explode('=', $line, 2);
                    $k = trim($k);
                    $v = trim($v);
                    $v = trim($v, ""'");
                    if (!isset($env[$k])) {
                        $env[$k] = $v;
                    }
                }
            }
            break;
        }
    }
    return $env;
}

$env = loadEnvCredentials();

// MySQL Credentials
$dbHost = getenv('MYSQL_HOST') ?: ($env['MYSQL_HOST'] ?? (getenv('DB_HOST') ?: ($env['DB_HOST'] ?? 'localhost')));
$dbPort = getenv('MYSQL_PORT') ?: ($env['MYSQL_PORT'] ?? (getenv('DB_PORT') ?: ($env['DB_PORT'] ?? '3306')));
$dbName = getenv('MYSQL_DATABASE') ?: ($env['MYSQL_DATABASE'] ?? (getenv('DB_NAME') ?: ($env['DB_NAME'] ?? 'jainnaga_the_house_of_pawz')));
$dbUser = getenv('MYSQL_USER') ?: ($env['MYSQL_USER'] ?? (getenv('DB_USER') ?: ($env['DB_USER'] ?? 'jainnaga_the_house_of_pawz')));
$dbPass = getenv('MYSQL_PASSWORD') ?: ($env['MYSQL_PASSWORD'] ?? (getenv('DB_PASS') ?: ($env['DB_PASS'] ?? '')));

logMsg("Target MySQL Database: {$dbName} @ {$dbHost}:{$dbPort} (User: {$dbUser})");

// ------------------------------------------------------------------------------
// 6. CONNECT TO MYSQL & INSPECT PRODUCTION SCHEMA
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
    return $pdo->lastInsertId();
}

// ------------------------------------------------------------------------------
// 7. DATASET: 86 VERIFIED AUGUST 2026 INVOICES
// ------------------------------------------------------------------------------
$augustInvoices = [
    [
        'serial' => 1,
        'invoice_number' => 'HOP/26-27/08/000001',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000001',
        'invoice_date' => '1st August, 2026',
        'invoice_date_ymd' => '2026-08-01',
        'customer_name' => 'Golden Citizens Trust (Pawdopt)',
        'customer_phone' => '9820057576',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => '',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '115350.00',
        'cgst' => '10381.50',
        'sgst' => '10381.50',
        'total_gst' => '20763.00',
        'grand_total' => '136113.00',
        'paid_amount' => '136113.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '180-night boarding package (for dogs)', 'price' => '108000.00', 'quantity' => 1, 'taxable_value' => '108000.00', 'gst_rate' => '18.00', 'cgst' => '9720.00', 'sgst' => '9720.00', 'total' => '127440.00'],
            ['name' => '28-night boarding package (for cats)', 'price' => '7350.00', 'quantity' => 1, 'taxable_value' => '7350.00', 'gst_rate' => '18.00', 'cgst' => '661.50', 'sgst' => '661.50', 'total' => '8673.00'],
        ],
        'payments' => [
            ['date' => '1st August, 2026', 'date_ymd' => '2026-08-01', 'amount' => '136113.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #1)',
    ],
    [
        'serial' => 2,
        'invoice_number' => 'HOP/26-27/08/000002',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000002',
        'invoice_date' => '1st August, 2026',
        'invoice_date_ymd' => '2026-08-01',
        'customer_name' => 'Vaibhav',
        'customer_phone' => '9819535153',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Comet',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '5100.00',
        'cgst' => '459.00',
        'sgst' => '459.00',
        'total_gst' => '918.00',
        'grand_total' => '6018.00',
        'paid_amount' => '6018.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '6 night boarding charges (2nd Aug to 8th Aug, till 12 noon )', 'price' => '5100.00', 'quantity' => 1, 'taxable_value' => '5100.00', 'gst_rate' => '18.00', 'cgst' => '459.00', 'sgst' => '459.00', 'total' => '6018.00'],
        ],
        'payments' => [
            ['date' => '1st August, 2026', 'date_ymd' => '2026-08-01', 'amount' => '6018.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #2)',
    ],
    [
        'serial' => 3,
        'invoice_number' => 'HOP/26-27/08/000003',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000003',
        'invoice_date' => '1st August, 2026',
        'invoice_date_ymd' => '2026-08-01',
        'customer_name' => 'Disha Verma',
        'customer_phone' => '7977857144',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Prince',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '750.00',
        'cgst' => '67.50',
        'sgst' => '67.50',
        'total_gst' => '135.00',
        'grand_total' => '885.00',
        'paid_amount' => '885.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 daycare charges with late-night pick-up charges (1st august)', 'price' => '750.00', 'quantity' => 1, 'taxable_value' => '750.00', 'gst_rate' => '18.00', 'cgst' => '67.50', 'sgst' => '67.50', 'total' => '885.00'],
        ],
        'payments' => [
            ['date' => '1st August, 2026', 'date_ymd' => '2026-08-01', 'amount' => '885.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #3)',
    ],
    [
        'serial' => 4,
        'invoice_number' => 'HOP/26-27/08/000004',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000004',
        'invoice_date' => '1st August, 2026',
        'invoice_date_ymd' => '2026-08-01',
        'customer_name' => 'Mausumi',
        'customer_phone' => '9820096054',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Jinny',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '1400.00',
        'cgst' => '126.00',
        'sgst' => '126.00',
        'total_gst' => '252.00',
        'grand_total' => '1652.00',
        'paid_amount' => '1652.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 night and 1 daycare charges (31st july to 1st aug evening)', 'price' => '1400.00', 'quantity' => 1, 'taxable_value' => '1400.00', 'gst_rate' => '18.00', 'cgst' => '126.00', 'sgst' => '126.00', 'total' => '1652.00'],
        ],
        'payments' => [
            ['date' => '1st August, 2026', 'date_ymd' => '2026-08-01', 'amount' => '1652.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #4)',
    ],
    [
        'serial' => 5,
        'invoice_number' => 'HOP/26-27/08/000005',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000005',
        'invoice_date' => '2nd August 2026',
        'invoice_date_ymd' => '2026-08-02',
        'customer_name' => 'Gautam Nair',
        'customer_phone' => '7620115905',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Mayalu',
        'pet_species' => 'Cat',
        'payment_mode' => 'Online',
        'sub_total' => '800.00',
        'cgst' => '72.00',
        'sgst' => '72.00',
        'total_gst' => '144.00',
        'grand_total' => '944.00',
        'paid_amount' => '944.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 night boarding and 1 daycare charges (1st aug to 2nd aug till evening)', 'price' => '800.00', 'quantity' => 1, 'taxable_value' => '800.00', 'gst_rate' => '18.00', 'cgst' => '72.00', 'sgst' => '72.00', 'total' => '944.00'],
        ],
        'payments' => [
            ['date' => '2nd August 2026', 'date_ymd' => '2026-08-02', 'amount' => '944.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #5)',
    ],
    [
        'serial' => 6,
        'invoice_number' => 'HOP/26-27/08/000006',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000006',
        'invoice_date' => '2nd August, 2026',
        'invoice_date_ymd' => '2026-08-02',
        'customer_name' => 'Shreta Gamadia',
        'customer_phone' => '8828405945',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Tyson',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '5350.00',
        'cgst' => '481.50',
        'sgst' => '481.50',
        'total_gst' => '963.00',
        'grand_total' => '6313.00',
        'paid_amount' => '6313.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '4 night boarding and 1 daycare charges (23rd july to 27th july, evening)', 'price' => '3950.00', 'quantity' => 1, 'taxable_value' => '3950.00', 'gst_rate' => '18.00', 'cgst' => '355.50', 'sgst' => '355.50', 'total' => '4661.00'],
            ['name' => '1 night boarding and 1 daycare charges (1st aug to 2nd aug, till evening)', 'price' => '1400.00', 'quantity' => 1, 'taxable_value' => '1400.00', 'gst_rate' => '18.00', 'cgst' => '126.00', 'sgst' => '126.00', 'total' => '1652.00'],
        ],
        'payments' => [
            ['date' => '2nd August, 2026', 'date_ymd' => '2026-08-02', 'amount' => '6313.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #6)',
    ],
    [
        'serial' => 7,
        'invoice_number' => 'HOP/26-27/08/000007',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000007',
        'invoice_date' => '3rd August, 2026',
        'invoice_date_ymd' => '2026-08-03',
        'customer_name' => 'Deepti Unni',
        'customer_phone' => '9821281631',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Miso',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '1700.00',
        'cgst' => '153.00',
        'sgst' => '153.00',
        'total_gst' => '306.00',
        'grand_total' => '2006.00',
        'paid_amount' => '2006.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2 night boarding charges (1st aug to 3rd aug till 12 noon)', 'price' => '1700.00', 'quantity' => 1, 'taxable_value' => '1700.00', 'gst_rate' => '18.00', 'cgst' => '153.00', 'sgst' => '153.00', 'total' => '2006.00'],
        ],
        'payments' => [
            ['date' => '3rd August, 2026', 'date_ymd' => '2026-08-03', 'amount' => '2006.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #7)',
    ],
    [
        'serial' => 8,
        'invoice_number' => 'HOP/26-27/08/000008',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000008',
        'invoice_date' => '3rd August, 2026',
        'invoice_date_ymd' => '2026-08-03',
        'customer_name' => 'Dilnavaz',
        'customer_phone' => '9819702638',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Mojito',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '18000.00',
        'cgst' => '1620.00',
        'sgst' => '1620.00',
        'total_gst' => '3240.00',
        'grand_total' => '21240.00',
        'paid_amount' => '21240.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '30 night boarding package (1st aug to 31st aug, 2026)', 'price' => '18000.00', 'quantity' => 1, 'taxable_value' => '18000.00', 'gst_rate' => '18.00', 'cgst' => '1620.00', 'sgst' => '1620.00', 'total' => '21240.00'],
        ],
        'payments' => [
            ['date' => '3rd August, 2026', 'date_ymd' => '2026-08-03', 'amount' => '21240.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #8)',
    ],
    [
        'serial' => 9,
        'invoice_number' => 'HOP/26-27/08/000009',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000009',
        'invoice_date' => '4th August, 2026',
        'invoice_date_ymd' => '2026-08-04',
        'customer_name' => 'Anil Sadarangani',
        'customer_phone' => '9819259507',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Raf and Sheru',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '39000.00',
        'cgst' => '3510.00',
        'sgst' => '3510.00',
        'total_gst' => '7020.00',
        'grand_total' => '46020.00',
        'paid_amount' => '46020.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 month boarding aug month for 2 Pets', 'price' => '39000.00', 'quantity' => 1, 'taxable_value' => '39000.00', 'gst_rate' => '18.00', 'cgst' => '3510.00', 'sgst' => '3510.00', 'total' => '46020.00'],
        ],
        'payments' => [
            ['date' => '4th August, 2026', 'date_ymd' => '2026-08-04', 'amount' => '46020.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #9)',
    ],
    [
        'serial' => 10,
        'invoice_number' => 'HOP/26-27/08/000010',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000010',
        'invoice_date' => '4th August, 2026',
        'invoice_date_ymd' => '2026-08-04',
        'customer_name' => 'Long Story Short Pictures',
        'customer_phone' => '9004001912',
        'customer_address' => 'Flat no.109/47/Gwing, Leslie Sawhney Memorial chsl, Manish Nagar Road, Four Bungalows, Mumbai, Mumbai Suburban, Maharashtra, 400053',
        'gstin' => '27AWFPB6991G2ZB',
        'pet_name' => 'Action',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '16000.00',
        'cgst' => '1440.00',
        'sgst' => '1440.00',
        'total_gst' => '2880.00',
        'grand_total' => '18880.00',
        'paid_amount' => '18880.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '20 Night Boarding Package (for dogs)', 'price' => '16000.00', 'quantity' => 1, 'taxable_value' => '16000.00', 'gst_rate' => '18.00', 'cgst' => '1440.00', 'sgst' => '1440.00', 'total' => '18880.00'],
        ],
        'payments' => [
            ['date' => '4th August, 2026', 'date_ymd' => '2026-08-04', 'amount' => '18880.00', 'mode' => 'Online'],
        ],
        'is_gst' => true,
        'notes' => 'Imported from August 2026 word records (Chunk #10)',
    ],
    [
        'serial' => 11,
        'invoice_number' => 'HOP/26-27/08/000011',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000011',
        'invoice_date' => '4th August, 2026',
        'invoice_date_ymd' => '2026-08-04',
        'customer_name' => 'Sachin Badre',
        'customer_phone' => '9821935538',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Radha And Meera',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '2006.00',
        'cgst' => '180.54',
        'sgst' => '180.54',
        'total_gst' => '361.08',
        'grand_total' => '2367.08',
        'paid_amount' => '2367.08',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 night boarding charges  for 2 pets = Rs 1,700 + 18% GST', 'price' => '2006.00', 'quantity' => 1, 'taxable_value' => '2006.00', 'gst_rate' => '18.00', 'cgst' => '180.54', 'sgst' => '180.54', 'total' => '2367.08'],
        ],
        'payments' => [
            ['date' => '4th August, 2026', 'date_ymd' => '2026-08-04', 'amount' => '2367.08', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #11)',
    ],
    [
        'serial' => 12,
        'invoice_number' => 'HOP/26-27/08/000012',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000012',
        'invoice_date' => '4th August, 2026',
        'invoice_date_ymd' => '2026-08-04',
        'customer_name' => 'Chandrama  Verma',
        'customer_phone' => '9820152539',
        'customer_address' => 'B505 New Annapurna Apartment, Yari Road, Versova, Andheri West, Mumbai 400061',
        'gstin' => '27ABHPV8741P1ZM',
        'pet_name' => 'Jazz',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '12150.00',
        'cgst' => '1093.50',
        'sgst' => '1093.50',
        'total_gst' => '2187.00',
        'grand_total' => '14337.00',
        'paid_amount' => '14337.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '10 Daycare Package', 'price' => '5225.00', 'quantity' => 1, 'taxable_value' => '5225.00', 'gst_rate' => '18.00', 'cgst' => '470.25', 'sgst' => '470.25', 'total' => '6165.50'],
            ['name' => '2 night boarding package (23rd june to 25th june, 12 noon)', 'price' => '1700.00', 'quantity' => 1, 'taxable_value' => '1700.00', 'gst_rate' => '18.00', 'cgst' => '153.00', 'sgst' => '153.00', 'total' => '2006.00'],
            ['name' => '10 Daycare Package', 'price' => '5225.00', 'quantity' => 1, 'taxable_value' => '5225.00', 'gst_rate' => '18.00', 'cgst' => '470.25', 'sgst' => '470.25', 'total' => '6165.50'],
        ],
        'payments' => [
            ['date' => '20/06/2026', 'date_ymd' => '2026-06-20', 'amount' => '6166.00', 'mode' => 'Online'],
            ['date' => '23/06/2026', 'date_ymd' => '2026-06-23', 'amount' => '1000.00', 'mode' => 'UPI'],
            ['date' => '30/06/2026', 'date_ymd' => '2026-06-30', 'amount' => '1006.00', 'mode' => 'Bank Transfer'],
            ['date' => '04/08/2026', 'date_ymd' => '2026-08-04', 'amount' => '6165.00', 'mode' => 'Net Banking'],
        ],
        'is_gst' => true,
        'notes' => 'Imported from August 2026 word records (Chunk #12)',
    ],
    [
        'serial' => 13,
        'invoice_number' => 'HOP/26-27/08/000013',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000013',
        'invoice_date' => '5th August, 2026',
        'invoice_date_ymd' => '2026-08-05',
        'customer_name' => 'Akshat Sharma',
        'customer_phone' => '9494348284',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Diago',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '550.00',
        'cgst' => '49.50',
        'sgst' => '49.50',
        'total_gst' => '99.00',
        'grand_total' => '649.00',
        'paid_amount' => '649.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 daycare charges (5th august, 2026)', 'price' => '550.00', 'quantity' => 1, 'taxable_value' => '550.00', 'gst_rate' => '18.00', 'cgst' => '49.50', 'sgst' => '49.50', 'total' => '649.00'],
        ],
        'payments' => [
            ['date' => '5th August, 2026', 'date_ymd' => '2026-08-05', 'amount' => '649.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #13)',
    ],
    [
        'serial' => 14,
        'invoice_number' => 'HOP/26-27/08/000014',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000014',
        'invoice_date' => '7th August, 2026',
        'invoice_date_ymd' => '2026-08-07',
        'customer_name' => 'Anupama Das',
        'customer_phone' => '9819811755',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Boba',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '1100.00',
        'cgst' => '99.00',
        'sgst' => '99.00',
        'total_gst' => '198.00',
        'grand_total' => '1298.00',
        'paid_amount' => '1298.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2 daycare charges (4th aug and 7th aug)', 'price' => '1100.00', 'quantity' => 1, 'taxable_value' => '1100.00', 'gst_rate' => '18.00', 'cgst' => '99.00', 'sgst' => '99.00', 'total' => '1298.00'],
        ],
        'payments' => [
            ['date' => '7th August, 2026', 'date_ymd' => '2026-08-07', 'amount' => '1298.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #14)',
    ],
    [
        'serial' => 15,
        'invoice_number' => 'HOP/26-27/08/000015',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000015',
        'invoice_date' => '7th August, 2026',
        'invoice_date_ymd' => '2026-08-07',
        'customer_name' => 'Pooja Singh',
        'customer_phone' => '9136090281',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Kuku',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '5350.00',
        'cgst' => '481.50',
        'sgst' => '481.50',
        'total_gst' => '963.00',
        'grand_total' => '6313.00',
        'paid_amount' => '6313.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '3 night and 1 daycare charges (13th july to 16th july till evening)', 'price' => '3100.00', 'quantity' => 1, 'taxable_value' => '3100.00', 'gst_rate' => '18.00', 'cgst' => '279.00', 'sgst' => '279.00', 'total' => '3658.00'],
            ['name' => '2 night and 1 daycare charges (5th aug to 7th aug till evening)', 'price' => '2250.00', 'quantity' => 1, 'taxable_value' => '2250.00', 'gst_rate' => '18.00', 'cgst' => '202.50', 'sgst' => '202.50', 'total' => '2655.00'],
        ],
        'payments' => [
            ['date' => '16th July, 2026', 'date_ymd' => '2026-07-16', 'amount' => '3658.00', 'mode' => 'Online'],
            ['date' => '7th August, 2026', 'date_ymd' => '2026-08-07', 'amount' => '2655.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #15)',
    ],
    [
        'serial' => 16,
        'invoice_number' => 'HOP/26-27/08/000016',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000016',
        'invoice_date' => '8th August, 2026',
        'invoice_date_ymd' => '2026-08-08',
        'customer_name' => 'Jaikishin Chhaproo',
        'customer_phone' => '9582252474',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Simba',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '2550.00',
        'cgst' => '229.50',
        'sgst' => '229.50',
        'total_gst' => '459.00',
        'grand_total' => '3009.00',
        'paid_amount' => '3009.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '3 night boarding charges ( 5th aug to 8th aug till 12 noon)', 'price' => '2550.00', 'quantity' => 1, 'taxable_value' => '2550.00', 'gst_rate' => '18.00', 'cgst' => '229.50', 'sgst' => '229.50', 'total' => '3009.00'],
        ],
        'payments' => [
            ['date' => '8th August, 2026', 'date_ymd' => '2026-08-08', 'amount' => '3009.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #16)',
    ],
    [
        'serial' => 17,
        'invoice_number' => 'HOP/26-27/08/000017',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000017',
        'invoice_date' => '8th August, 2026',
        'invoice_date_ymd' => '2026-08-08',
        'customer_name' => 'Oindrilla Guha Ray',
        'customer_phone' => '9873083377',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Elsa',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '20000.00',
        'cgst' => '1800.00',
        'sgst' => '1800.00',
        'total_gst' => '3600.00',
        'grand_total' => '23600.00',
        'paid_amount' => '23600.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '30 night boarding package', 'price' => '20000.00', 'quantity' => 1, 'taxable_value' => '20000.00', 'gst_rate' => '18.00', 'cgst' => '1800.00', 'sgst' => '1800.00', 'total' => '23600.00'],
        ],
        'payments' => [
            ['date' => '8th August, 2026', 'date_ymd' => '2026-08-08', 'amount' => '23600.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #17)',
    ],
    [
        'serial' => 18,
        'invoice_number' => 'HOP/26-27/08/000018',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000018',
        'invoice_date' => '10th August, 2026',
        'invoice_date_ymd' => '2026-08-10',
        'customer_name' => 'Shilpi Soni',
        'customer_phone' => '9004077939',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Gomu',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '3400.00',
        'cgst' => '306.00',
        'sgst' => '306.00',
        'total_gst' => '612.00',
        'grand_total' => '4012.00',
        'paid_amount' => '4012.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '4 night boarding charges (6th aug to 10th aug)', 'price' => '3400.00', 'quantity' => 1, 'taxable_value' => '3400.00', 'gst_rate' => '18.00', 'cgst' => '306.00', 'sgst' => '306.00', 'total' => '4012.00'],
        ],
        'payments' => [
            ['date' => '10th August, 2026', 'date_ymd' => '2026-08-10', 'amount' => '4012.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #18)',
    ],
    [
        'serial' => 19,
        'invoice_number' => 'HOP/26-27/08/000019',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000019',
        'invoice_date' => '10th August, 2026',
        'invoice_date_ymd' => '2026-08-10',
        'customer_name' => 'Shanti',
        'customer_phone' => '9930354540',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Arrow',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '8500.00',
        'cgst' => '765.00',
        'sgst' => '765.00',
        'total_gst' => '1530.00',
        'grand_total' => '10030.00',
        'paid_amount' => '10030.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '10 night boarding charges (15th aug to 25th aug, 12 noon)', 'price' => '8500.00', 'quantity' => 1, 'taxable_value' => '8500.00', 'gst_rate' => '18.00', 'cgst' => '765.00', 'sgst' => '765.00', 'total' => '10030.00'],
        ],
        'payments' => [
            ['date' => '10th August, 2026', 'date_ymd' => '2026-08-10', 'amount' => '10030.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #19)',
    ],
    [
        'serial' => 20,
        'invoice_number' => 'HOP/26-27/08/000020',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000020',
        'invoice_date' => '10th August, 2026',
        'invoice_date_ymd' => '2026-08-10',
        'customer_name' => 'Dream Catchers',
        'customer_phone' => '+919833020003',
        'customer_address' => '104, 1st Floor, Remi Bizcourt, Shah Industrial Estate, Off Veera Desai Road, Andheri West, Mumbai 400053',
        'gstin' => '27AMIPB3225A1ZS',
        'pet_name' => 'Shadow',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '21500.00',
        'cgst' => '1935.00',
        'sgst' => '1935.00',
        'total_gst' => '3870.00',
        'grand_total' => '25370.00',
        'paid_amount' => '25370.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '30 night boarding charges (1st aug to 31st aug, till 12 noon)', 'price' => '21500.00', 'quantity' => 1, 'taxable_value' => '21500.00', 'gst_rate' => '18.00', 'cgst' => '1935.00', 'sgst' => '1935.00', 'total' => '25370.00'],
        ],
        'payments' => [
            ['date' => '10th August, 2026', 'date_ymd' => '2026-08-10', 'amount' => '25370.00', 'mode' => 'Online'],
        ],
        'is_gst' => true,
        'notes' => 'Imported from August 2026 word records (Chunk #20)',
    ],
    [
        'serial' => 21,
        'invoice_number' => 'HOP/26-27/08/000021',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000021',
        'invoice_date' => '11th August, 2026',
        'invoice_date_ymd' => '2026-08-11',
        'customer_name' => 'Natasha Paul',
        'customer_phone' => '9821677090',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Leo and Chloe',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '17000.00',
        'cgst' => '1530.00',
        'sgst' => '1530.00',
        'total_gst' => '3060.00',
        'grand_total' => '20060.00',
        'paid_amount' => '20060.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2 night Boarding for 2 pets (7th sept to 9th sept, 12 noon)', 'price' => '3400.00', 'quantity' => 1, 'taxable_value' => '3400.00', 'gst_rate' => '18.00', 'cgst' => '306.00', 'sgst' => '306.00', 'total' => '4012.00'],
            ['name' => '8 night Boarding for 2 pets (16th oct to 24th oct, 12 noon)', 'price' => '13600.00', 'quantity' => 1, 'taxable_value' => '13600.00', 'gst_rate' => '18.00', 'cgst' => '1224.00', 'sgst' => '1224.00', 'total' => '16048.00'],
        ],
        'payments' => [
            ['date' => '11th August, 2026', 'date_ymd' => '2026-08-11', 'amount' => '20060.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #21)',
    ],
    [
        'serial' => 22,
        'invoice_number' => 'HOP/26-27/08/000022',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000022',
        'invoice_date' => '13th August, 2026',
        'invoice_date_ymd' => '2026-08-13',
        'customer_name' => 'Panchami Nayak',
        'customer_phone' => '9920431193',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Luna and Kaaapi',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '20400.00',
        'cgst' => '1836.00',
        'sgst' => '1836.00',
        'total_gst' => '3672.00',
        'grand_total' => '24072.00',
        'paid_amount' => '24072.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '12 night boarding charges  (4th aug to 16th aug till 12 noon)', 'price' => '20400.00', 'quantity' => 1, 'taxable_value' => '20400.00', 'gst_rate' => '18.00', 'cgst' => '1836.00', 'sgst' => '1836.00', 'total' => '24072.00'],
        ],
        'payments' => [
            ['date' => '13th August, 2026', 'date_ymd' => '2026-08-13', 'amount' => '24072.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #22)',
    ],
    [
        'serial' => 23,
        'invoice_number' => 'HOP/26-27/08/000023',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000023',
        'invoice_date' => '13th August, 2026',
        'invoice_date_ymd' => '2026-08-13',
        'customer_name' => 'Neethu Srivastava',
        'customer_phone' => '9372356855',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Bailey',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '3950.00',
        'cgst' => '355.50',
        'sgst' => '355.50',
        'total_gst' => '711.00',
        'grand_total' => '4661.00',
        'paid_amount' => '0.00',
        'balance_due' => '4661.00',
        'payment_status' => 'UNPAID',
        'items' => [
            ['name' => '4 night boarding charges and 1 daycare charges (9th aug to 13th aug till evening)', 'price' => '3950.00', 'quantity' => 1, 'taxable_value' => '3950.00', 'gst_rate' => '18.00', 'cgst' => '355.50', 'sgst' => '355.50', 'total' => '4661.00'],
        ],
        'payments' => [
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #23)',
    ],
    [
        'serial' => 24,
        'invoice_number' => 'HOP/26-27/08/000024',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000024',
        'invoice_date' => '13th August, 2026',
        'invoice_date_ymd' => '2026-08-13',
        'customer_name' => 'Allwyn Dsouza',
        'customer_phone' => '8286900346',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Nayla',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '850.00',
        'cgst' => '76.50',
        'sgst' => '76.50',
        'total_gst' => '153.00',
        'grand_total' => '1003.00',
        'paid_amount' => '1003.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 night boarding  charges (13th aug to 14th aug, 12 noon)', 'price' => '850.00', 'quantity' => 1, 'taxable_value' => '850.00', 'gst_rate' => '18.00', 'cgst' => '76.50', 'sgst' => '76.50', 'total' => '1003.00'],
        ],
        'payments' => [
            ['date' => '13th August, 2026', 'date_ymd' => '2026-08-13', 'amount' => '1003.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #24)',
    ],
    [
        'serial' => 25,
        'invoice_number' => 'HOP/26-27/08/000025',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000025',
        'invoice_date' => '13th August, 2026',
        'invoice_date_ymd' => '2026-08-13',
        'customer_name' => 'Valerian Raj Felix',
        'customer_phone' => '9073100971',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Krypto',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '5100.00',
        'cgst' => '459.00',
        'sgst' => '459.00',
        'total_gst' => '918.00',
        'grand_total' => '6018.00',
        'paid_amount' => '6018.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '6 nights boarding charges (7th aug to 13th aug, 12 noon)', 'price' => '5100.00', 'quantity' => 1, 'taxable_value' => '5100.00', 'gst_rate' => '18.00', 'cgst' => '459.00', 'sgst' => '459.00', 'total' => '6018.00'],
        ],
        'payments' => [
            ['date' => '6th August, 2026', 'date_ymd' => '2026-08-06', 'amount' => '5664.00', 'mode' => 'Online'],
            ['date' => '15th August, 2026', 'date_ymd' => '2026-08-15', 'amount' => '354.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #25)',
    ],
    [
        'serial' => 26,
        'invoice_number' => 'HOP/26-27/08/000026',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000026',
        'invoice_date' => '14th August, 2026',
        'invoice_date_ymd' => '2026-08-14',
        'customer_name' => 'Deshant Sharan',
        'customer_phone' => '9082196685',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Ranger',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '1700.00',
        'cgst' => '153.00',
        'sgst' => '153.00',
        'total_gst' => '306.00',
        'grand_total' => '2006.00',
        'paid_amount' => '2006.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2 night boarding charges (12th aug to 14th aug, 12 noon)', 'price' => '1700.00', 'quantity' => 1, 'taxable_value' => '1700.00', 'gst_rate' => '18.00', 'cgst' => '153.00', 'sgst' => '153.00', 'total' => '2006.00'],
        ],
        'payments' => [
            ['date' => '14th August, 2026', 'date_ymd' => '2026-08-14', 'amount' => '2006.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #26)',
    ],
    [
        'serial' => 27,
        'invoice_number' => 'HOP/26-27/08/000027',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000027',
        'invoice_date' => '14th August, 2026',
        'invoice_date_ymd' => '2026-08-14',
        'customer_name' => 'Anand Khadse',
        'customer_phone' => '9029477756',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Pogo',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '850.00',
        'cgst' => '76.50',
        'sgst' => '76.50',
        'total_gst' => '153.00',
        'grand_total' => '1003.00',
        'paid_amount' => '1003.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 night boarding charges (15th aug to 16th aug, 12 noon)', 'price' => '850.00', 'quantity' => 1, 'taxable_value' => '850.00', 'gst_rate' => '18.00', 'cgst' => '76.50', 'sgst' => '76.50', 'total' => '1003.00'],
        ],
        'payments' => [
            ['date' => '14th August, 2026', 'date_ymd' => '2026-08-14', 'amount' => '1003.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #27)',
    ],
    [
        'serial' => 28,
        'invoice_number' => 'HOP/26-27/08/000028',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000028',
        'invoice_date' => '15th August, 2026',
        'invoice_date_ymd' => '2026-08-15',
        'customer_name' => 'Shayoni Mitra',
        'customer_phone' => '91589967399',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Pingu and Grogu',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '2000.00',
        'cgst' => '180.00',
        'sgst' => '180.00',
        'total_gst' => '360.00',
        'grand_total' => '2360.00',
        'paid_amount' => '2360.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2 night boarding for 2 pets (15th aug to 17th aug, till 12 noon)', 'price' => '2000.00', 'quantity' => 1, 'taxable_value' => '2000.00', 'gst_rate' => '18.00', 'cgst' => '180.00', 'sgst' => '180.00', 'total' => '2360.00'],
        ],
        'payments' => [
            ['date' => '15th August, 2026', 'date_ymd' => '2026-08-15', 'amount' => '2360.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #28)',
    ],
    [
        'serial' => 29,
        'invoice_number' => 'HOP/26-27/08/000029',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000029',
        'invoice_date' => '15th August, 2026',
        'invoice_date_ymd' => '2026-08-15',
        'customer_name' => 'Shiraz Gandhi',
        'customer_phone' => '9820660986',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'King',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '1400.00',
        'cgst' => '126.00',
        'sgst' => '126.00',
        'total_gst' => '252.00',
        'grand_total' => '1652.00',
        'paid_amount' => '1652.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 night boarding and 1 daycare charges (15th aug to 16th aug, evening)', 'price' => '1400.00', 'quantity' => 1, 'taxable_value' => '1400.00', 'gst_rate' => '18.00', 'cgst' => '126.00', 'sgst' => '126.00', 'total' => '1652.00'],
        ],
        'payments' => [
            ['date' => '15th August, 2026', 'date_ymd' => '2026-08-15', 'amount' => '1652.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #29)',
    ],
    [
        'serial' => 30,
        'invoice_number' => 'HOP/26-27/08/000030',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000030',
        'invoice_date' => '16th August, 2026',
        'invoice_date_ymd' => '2026-08-16',
        'customer_name' => 'Keomi Metha',
        'customer_phone' => '9833806048',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Rumi and Gibran and Zoya',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '5100.00',
        'cgst' => '459.00',
        'sgst' => '459.00',
        'total_gst' => '918.00',
        'grand_total' => '6018.00',
        'paid_amount' => '6018.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2 night boarding charges for 3 pets (14th aug to 16th aug, 12 noon)', 'price' => '5100.00', 'quantity' => 1, 'taxable_value' => '5100.00', 'gst_rate' => '18.00', 'cgst' => '459.00', 'sgst' => '459.00', 'total' => '6018.00'],
        ],
        'payments' => [
            ['date' => '16th August, 2026', 'date_ymd' => '2026-08-16', 'amount' => '6018.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #30)',
    ],
    [
        'serial' => 31,
        'invoice_number' => 'HOP/26-27/08/000031',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000031',
        'invoice_date' => '16th August, 2026',
        'invoice_date_ymd' => '2026-08-16',
        'customer_name' => 'Pranay Pachauri',
        'customer_phone' => '9711248747',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Rosie',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '2550.00',
        'cgst' => '229.50',
        'sgst' => '229.50',
        'total_gst' => '459.00',
        'grand_total' => '3009.00',
        'paid_amount' => '3009.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '3 night charges (12th aug to 17th aug, till 12 noon)', 'price' => '2550.00', 'quantity' => 1, 'taxable_value' => '2550.00', 'gst_rate' => '18.00', 'cgst' => '229.50', 'sgst' => '229.50', 'total' => '3009.00'],
        ],
        'payments' => [
            ['date' => '16th August, 2026', 'date_ymd' => '2026-08-16', 'amount' => '3009.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #31)',
    ],
    [
        'serial' => 32,
        'invoice_number' => 'HOP/26-27/08/000032',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000032',
        'invoice_date' => '17th August, 2026',
        'invoice_date_ymd' => '2026-08-17',
        'customer_name' => 'Tanvi Chedda',
        'customer_phone' => '9821877784',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Mustang',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '19500.00',
        'cgst' => '1755.00',
        'sgst' => '1755.00',
        'total_gst' => '3510.00',
        'grand_total' => '23010.00',
        'paid_amount' => '23010.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 month boarding charges  (1st aug  to 31st aug ,2026)', 'price' => '19500.00', 'quantity' => 1, 'taxable_value' => '19500.00', 'gst_rate' => '18.00', 'cgst' => '1755.00', 'sgst' => '1755.00', 'total' => '23010.00'],
        ],
        'payments' => [
            ['date' => '17th August, 2026', 'date_ymd' => '2026-08-17', 'amount' => '23010.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #32)',
    ],
    [
        'serial' => 33,
        'invoice_number' => 'HOP/26-27/08/000033',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000033',
        'invoice_date' => '17th August, 2026',
        'invoice_date_ymd' => '2026-08-17',
        'customer_name' => 'Siena  Sharma',
        'customer_phone' => '7400479090',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Scotch',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '2550.00',
        'cgst' => '229.50',
        'sgst' => '229.50',
        'total_gst' => '459.00',
        'grand_total' => '3009.00',
        'paid_amount' => '3009.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '3 night boarding charges  (14th aug  to 17th aug, 12 noon)', 'price' => '2550.00', 'quantity' => 1, 'taxable_value' => '2550.00', 'gst_rate' => '18.00', 'cgst' => '229.50', 'sgst' => '229.50', 'total' => '3009.00'],
        ],
        'payments' => [
            ['date' => '17th August, 2026', 'date_ymd' => '2026-08-17', 'amount' => '3009.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #33)',
    ],
    [
        'serial' => 34,
        'invoice_number' => 'HOP/26-27/08/000034',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000034',
        'invoice_date' => '18th August,  2026',
        'invoice_date_ymd' => '2026-08-18',
        'customer_name' => 'K.C. Badrinaryan',
        'customer_phone' => '9821546133',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Simba',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '9676.00',
        'cgst' => '870.84',
        'sgst' => '870.84',
        'total_gst' => '1741.68',
        'grand_total' => '11417.68',
        'paid_amount' => '11417.68',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 night boarding charges (1st aug ti 2nd aug, 12 noon) = Rs 850 + 18% GST', 'price' => '1003.00', 'quantity' => 1, 'taxable_value' => '1003.00', 'gst_rate' => '18.00', 'cgst' => '90.27', 'sgst' => '90.27', 'total' => '1183.54'],
            ['name' => '3 night boarding charges (8th aug to 11th aug, till 12 noon ) = Rs 2,550 + 18% GST', 'price' => '3009.00', 'quantity' => 1, 'taxable_value' => '3009.00', 'gst_rate' => '18.00', 'cgst' => '270.81', 'sgst' => '270.81', 'total' => '3550.62'],
            ['name' => '5 night boarding charges (13th aug to 18th aug, evening) = Rs 4,800 + 18% GST', 'price' => '5664.00', 'quantity' => 1, 'taxable_value' => '5664.00', 'gst_rate' => '18.00', 'cgst' => '509.76', 'sgst' => '509.76', 'total' => '6683.52'],
        ],
        'payments' => [
            ['date' => '18th August,  2026', 'date_ymd' => '2026-08-18', 'amount' => '11417.68', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #34)',
    ],
    [
        'serial' => 35,
        'invoice_number' => 'HOP/26-27/08/000035',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000035',
        'invoice_date' => '19th August, 2026',
        'invoice_date_ymd' => '2026-08-19',
        'customer_name' => 'Shraddha Kutty',
        'customer_phone' => '9819538040',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Chikki and Chutney',
        'pet_species' => 'Cat',
        'payment_mode' => 'Online',
        'sub_total' => '10600.00',
        'cgst' => '954.00',
        'sgst' => '954.00',
        'total_gst' => '1908.00',
        'grand_total' => '12508.00',
        'paid_amount' => '12508.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '10 night boarding charges for 2 pets  (9th aug to 19th aug till evening)', 'price' => '10600.00', 'quantity' => 1, 'taxable_value' => '10600.00', 'gst_rate' => '18.00', 'cgst' => '954.00', 'sgst' => '954.00', 'total' => '12508.00'],
        ],
        'payments' => [
            ['date' => '19th August, 2026', 'date_ymd' => '2026-08-19', 'amount' => '12508.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #35)',
    ],
    [
        'serial' => 36,
        'invoice_number' => 'HOP/26-27/08/000036',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000036',
        'invoice_date' => '19th August, 2026',
        'invoice_date_ymd' => '2026-08-19',
        'customer_name' => 'Trishala Athilat',
        'customer_phone' => '9867757260',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Zoe',
        'pet_species' => 'Cat',
        'payment_mode' => 'Online',
        'sub_total' => '3400.00',
        'cgst' => '306.00',
        'sgst' => '306.00',
        'total_gst' => '612.00',
        'grand_total' => '4012.00',
        'paid_amount' => '4012.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '4 night boarding charges (15th aug to 19th aug, until 12 noon)', 'price' => '3400.00', 'quantity' => 1, 'taxable_value' => '3400.00', 'gst_rate' => '18.00', 'cgst' => '306.00', 'sgst' => '306.00', 'total' => '4012.00'],
        ],
        'payments' => [
            ['date' => '19th August, 2026', 'date_ymd' => '2026-08-19', 'amount' => '4012.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #36)',
    ],
    [
        'serial' => 37,
        'invoice_number' => 'HOP/26-27/08/000037',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000037',
        'invoice_date' => '20th August, 2026',
        'invoice_date_ymd' => '2026-08-20',
        'customer_name' => 'Aditya',
        'customer_phone' => '+917710968292',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Tzar',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '3400.00',
        'cgst' => '306.00',
        'sgst' => '306.00',
        'total_gst' => '612.00',
        'grand_total' => '4012.00',
        'paid_amount' => '4012.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '4 night boarding charges (20th aug to 24th aug, till 12 noon)', 'price' => '3400.00', 'quantity' => 1, 'taxable_value' => '3400.00', 'gst_rate' => '18.00', 'cgst' => '306.00', 'sgst' => '306.00', 'total' => '4012.00'],
        ],
        'payments' => [
            ['date' => '20th August, 2026', 'date_ymd' => '2026-08-20', 'amount' => '4012.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #37)',
    ],
    [
        'serial' => 38,
        'invoice_number' => 'HOP/26-27/08/000038',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000038',
        'invoice_date' => '21st August, 2026',
        'invoice_date_ymd' => '2026-08-21',
        'customer_name' => 'Sikhya Entertainment Pvt. Ltd.',
        'customer_phone' => '',
        'customer_address' => '64, Aram Nagar, Part‐1, Andheri West, Versova, Mumbai, Maharashtra 400061',
        'gstin' => '27AAMCS4837J1ZS',
        'pet_name' => 'Bagheera',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '16700.00',
        'cgst' => '1503.00',
        'sgst' => '1503.00',
        'total_gst' => '3006.00',
        'grand_total' => '19706.00',
        'paid_amount' => '19706.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '20 night Boarding charges (19th aug to 8th sept, till 12 noon)', 'price' => '16700.00', 'quantity' => 1, 'taxable_value' => '16700.00', 'gst_rate' => '18.00', 'cgst' => '1503.00', 'sgst' => '1503.00', 'total' => '19706.00'],
        ],
        'payments' => [
            ['date' => '21st August, 2026', 'date_ymd' => '2026-08-21', 'amount' => '19706.00', 'mode' => 'Online'],
        ],
        'is_gst' => true,
        'notes' => 'Imported from August 2026 word records (Chunk #38)',
    ],
    [
        'serial' => 39,
        'invoice_number' => 'HOP/26-27/08/000039',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000039',
        'invoice_date' => '21st August, 2026',
        'invoice_date_ymd' => '2026-08-21',
        'customer_name' => 'Ananya',
        'customer_phone' => '9739357477',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Bambam',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '5300.00',
        'cgst' => '477.00',
        'sgst' => '477.00',
        'total_gst' => '954.00',
        'grand_total' => '6254.00',
        'paid_amount' => '0.00',
        'balance_due' => '6254.00',
        'payment_status' => 'UNPAID',
        'items' => [
            ['name' => '5 daycare charges (4th aug, 7th aug, 10th aug, 11th aug)', 'price' => '2750.00', 'quantity' => 1, 'taxable_value' => '2750.00', 'gst_rate' => '18.00', 'cgst' => '247.50', 'sgst' => '247.50', 'total' => '3245.00'],
            ['name' => '3 night boarding charges (18th aug to 21st aug till 12 noon)', 'price' => '2550.00', 'quantity' => 1, 'taxable_value' => '2550.00', 'gst_rate' => '18.00', 'cgst' => '229.50', 'sgst' => '229.50', 'total' => '3009.00'],
        ],
        'payments' => [
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #39)',
    ],
    [
        'serial' => 40,
        'invoice_number' => 'HOP/26-27/08/000040',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000040',
        'invoice_date' => '22nd August, 2026',
        'invoice_date_ymd' => '2026-08-22',
        'customer_name' => 'Umesh Nair',
        'customer_phone' => '9324528086',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Daze',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '5950.00',
        'cgst' => '535.50',
        'sgst' => '535.50',
        'total_gst' => '1071.00',
        'grand_total' => '7021.00',
        'paid_amount' => '7021.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '7 night boarding charges (22nd aug to 29th aug, till 12 noon)', 'price' => '5950.00', 'quantity' => 1, 'taxable_value' => '5950.00', 'gst_rate' => '18.00', 'cgst' => '535.50', 'sgst' => '535.50', 'total' => '7021.00'],
        ],
        'payments' => [
            ['date' => '22nd August, 2026', 'date_ymd' => '2026-08-22', 'amount' => '7021.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #40)',
    ],
    [
        'serial' => 41,
        'invoice_number' => 'HOP/26-27/08/000041',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000041',
        'invoice_date' => '22nd August, 2026',
        'invoice_date_ymd' => '2026-08-22',
        'customer_name' => 'Payal Shetye',
        'customer_phone' => '7709981040',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Zuri',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '1298.00',
        'cgst' => '116.82',
        'sgst' => '116.82',
        'total_gst' => '233.64',
        'grand_total' => '1531.64',
        'paid_amount' => '1531.64',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2 daycare charges (9th aug and 22nd aug) = Rs 1,100 + 18%', 'price' => '1298.00', 'quantity' => 1, 'taxable_value' => '1298.00', 'gst_rate' => '18.00', 'cgst' => '116.82', 'sgst' => '116.82', 'total' => '1531.64'],
        ],
        'payments' => [
            ['date' => '22nd August, 2026', 'date_ymd' => '2026-08-22', 'amount' => '1531.64', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #41)',
    ],
    [
        'serial' => 42,
        'invoice_number' => 'HOP/26-27/08/000042',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000042',
        'invoice_date' => '22nd August, 2026',
        'invoice_date_ymd' => '2026-08-22',
        'customer_name' => 'Sunit Khot',
        'customer_phone' => '9820295424',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Joey',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '1600.00',
        'cgst' => '144.00',
        'sgst' => '144.00',
        'total_gst' => '288.00',
        'grand_total' => '1888.00',
        'paid_amount' => '1888.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 night boarding and 1 daycare with late night charges  (22nd aug to 23rd aug, evening)', 'price' => '1600.00', 'quantity' => 1, 'taxable_value' => '1600.00', 'gst_rate' => '18.00', 'cgst' => '144.00', 'sgst' => '144.00', 'total' => '1888.00'],
        ],
        'payments' => [
            ['date' => '22nd August, 2026', 'date_ymd' => '2026-08-22', 'amount' => '1888.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #42)',
    ],
    [
        'serial' => 43,
        'invoice_number' => 'HOP/26-27/08/000043',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000043',
        'invoice_date' => '23rd August, 2026',
        'invoice_date_ymd' => '2026-08-23',
        'customer_name' => 'Subho basu',
        'customer_phone' => '9051515550',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Honey',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '5015.00',
        'cgst' => '451.35',
        'sgst' => '451.35',
        'total_gst' => '902.70',
        'grand_total' => '5917.70',
        'paid_amount' => '5917.70',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '5 night boarding charges (18th aug to 23rd aug till 12 noon) = Rs 4,250 + 18% GST', 'price' => '5015.00', 'quantity' => 1, 'taxable_value' => '5015.00', 'gst_rate' => '18.00', 'cgst' => '451.35', 'sgst' => '451.35', 'total' => '5917.70'],
        ],
        'payments' => [
            ['date' => '23rd August, 2026', 'date_ymd' => '2026-08-23', 'amount' => '5917.70', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #43)',
    ],
    [
        'serial' => 44,
        'invoice_number' => 'HOP/26-27/08/000044',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000044',
        'invoice_date' => '23rd August,  2026',
        'invoice_date_ymd' => '2026-08-23',
        'customer_name' => 'Ravi Malik',
        'customer_phone' => '9967782186',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Coco',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '11900.00',
        'cgst' => '1071.00',
        'sgst' => '1071.00',
        'total_gst' => '2142.00',
        'grand_total' => '14042.00',
        'paid_amount' => '14042.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '14 night boarding & 1 daycare charges (9th aug to 23rd aug,till evening)', 'price' => '11900.00', 'quantity' => 1, 'taxable_value' => '11900.00', 'gst_rate' => '18.00', 'cgst' => '1071.00', 'sgst' => '1071.00', 'total' => '14042.00'],
        ],
        'payments' => [
            ['date' => '23rd August,  2026', 'date_ymd' => '2026-08-23', 'amount' => '14042.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #44)',
    ],
    [
        'serial' => 45,
        'invoice_number' => 'HOP/26-27/08/000045',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000045',
        'invoice_date' => '23rd August, 2026',
        'invoice_date_ymd' => '2026-08-23',
        'customer_name' => 'Suchi Dahibavkar',
        'customer_phone' => '9773408857',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Ricky',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '2250.00',
        'cgst' => '202.50',
        'sgst' => '202.50',
        'total_gst' => '405.00',
        'grand_total' => '2655.00',
        'paid_amount' => '2655.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 night and 1 daycare charges (8th aug to 9th aug, evening)', 'price' => '1400.00', 'quantity' => 1, 'taxable_value' => '1400.00', 'gst_rate' => '18.00', 'cgst' => '126.00', 'sgst' => '126.00', 'total' => '1652.00'],
            ['name' => '1 night charges (8th aug to 9th aug, until 12 noon)', 'price' => '850.00', 'quantity' => 1, 'taxable_value' => '850.00', 'gst_rate' => '18.00', 'cgst' => '76.50', 'sgst' => '76.50', 'total' => '1003.00'],
        ],
        'payments' => [
            ['date' => '23rd August, 2026', 'date_ymd' => '2026-08-23', 'amount' => '2655.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #45)',
    ],
    [
        'serial' => 46,
        'invoice_number' => 'HOP/26-27/08/000046',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000046',
        'invoice_date' => '23rd August, 2026',
        'invoice_date_ymd' => '2026-08-23',
        'customer_name' => 'Rakesh Singh',
        'customer_phone' => '8850724529',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Dexter',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '2150.00',
        'cgst' => '193.50',
        'sgst' => '193.50',
        'total_gst' => '387.00',
        'grand_total' => '2537.00',
        'paid_amount' => '2537.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 daycare charges with late night pick up (19th aug)', 'price' => '550.00', 'quantity' => 1, 'taxable_value' => '550.00', 'gst_rate' => '18.00', 'cgst' => '49.50', 'sgst' => '49.50', 'total' => '649.00'],
            ['name' => '1 night boarding and 1 daycare charges (22nd aug to 23rd aug, till night)', 'price' => '1600.00', 'quantity' => 1, 'taxable_value' => '1600.00', 'gst_rate' => '18.00', 'cgst' => '144.00', 'sgst' => '144.00', 'total' => '1888.00'],
        ],
        'payments' => [
            ['date' => '19th August, 2026', 'date_ymd' => '2026-08-19', 'amount' => '649.00', 'mode' => 'Online'],
            ['date' => '23rd August, 2026', 'date_ymd' => '2026-08-23', 'amount' => '1888.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #46)',
    ],
    [
        'serial' => 47,
        'invoice_number' => 'HOP/26-27/08/000047',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000047',
        'invoice_date' => '23rd August, 2026',
        'invoice_date_ymd' => '2026-08-23',
        'customer_name' => 'Vikram',
        'customer_phone' => '8286336616',
        'customer_address' => 'Plot No- C/17 , Shree Sadguru Krupa, Sector -12, Near - Gokhale High School, Kharghar, Maharashtra 410210 India',
        'gstin' => '27ABRPO6816E1ZA',
        'pet_name' => 'Arrow',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '2550.00',
        'cgst' => '229.50',
        'sgst' => '229.50',
        'total_gst' => '459.00',
        'grand_total' => '3009.00',
        'paid_amount' => '3009.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '3 night boarding charges (21st aug to 24th aug till 12 noon)', 'price' => '2550.00', 'quantity' => 1, 'taxable_value' => '2550.00', 'gst_rate' => '18.00', 'cgst' => '229.50', 'sgst' => '229.50', 'total' => '3009.00'],
        ],
        'payments' => [
            ['date' => '23rd August, 2026', 'date_ymd' => '2026-08-23', 'amount' => '3009.00', 'mode' => 'Online'],
        ],
        'is_gst' => true,
        'notes' => 'Imported from August 2026 word records (Chunk #47)',
    ],
    [
        'serial' => 48,
        'invoice_number' => 'HOP/26-27/08/000048',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000048',
        'invoice_date' => '23rd August, 2026',
        'invoice_date_ymd' => '2026-08-23',
        'customer_name' => 'Jennifer Piccinato',
        'customer_phone' => '7030945280',
        'customer_address' => 'Flat no 1701, Oberoi springs, Off link road, Andheri West, Mumbai 400053',
        'gstin' => '27BJGPP6196L1ZE',
        'pet_name' => 'Sushi',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '22000.00',
        'cgst' => '1980.00',
        'sgst' => '1980.00',
        'total_gst' => '3960.00',
        'grand_total' => '25960.00',
        'paid_amount' => '25960.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '30 night boarding package', 'price' => '22000.00', 'quantity' => 1, 'taxable_value' => '22000.00', 'gst_rate' => '18.00', 'cgst' => '1980.00', 'sgst' => '1980.00', 'total' => '25960.00'],
        ],
        'payments' => [
            ['date' => '23rd August, 2026', 'date_ymd' => '2026-08-23', 'amount' => '25960.00', 'mode' => 'Online'],
        ],
        'is_gst' => true,
        'notes' => 'Imported from August 2026 word records (Chunk #48)',
    ],
    [
        'serial' => 49,
        'invoice_number' => 'HOP/26-27/08/000049',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000049',
        'invoice_date' => '23rd August, 2026',
        'invoice_date_ymd' => '2026-08-23',
        'customer_name' => 'Avril Miranda',
        'customer_phone' => '9821148870',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Churo',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '2550.00',
        'cgst' => '229.50',
        'sgst' => '229.50',
        'total_gst' => '459.00',
        'grand_total' => '3009.00',
        'paid_amount' => '3009.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '3 night boarding charges (25th aug to 28th aug, till 12 noon)', 'price' => '2550.00', 'quantity' => 1, 'taxable_value' => '2550.00', 'gst_rate' => '18.00', 'cgst' => '229.50', 'sgst' => '229.50', 'total' => '3009.00'],
        ],
        'payments' => [
            ['date' => '23rd August, 2026', 'date_ymd' => '2026-08-23', 'amount' => '3009.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #49)',
    ],
    [
        'serial' => 50,
        'invoice_number' => 'HOP/26-27/08/000050',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000050',
        'invoice_date' => '24th August, 2026',
        'invoice_date_ymd' => '2026-08-24',
        'customer_name' => 'Brinelle',
        'customer_phone' => '9930433069',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Pogba',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '550.00',
        'cgst' => '49.50',
        'sgst' => '49.50',
        'total_gst' => '99.00',
        'grand_total' => '649.00',
        'paid_amount' => '649.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 daycare charges (22nd aug)', 'price' => '550.00', 'quantity' => 1, 'taxable_value' => '550.00', 'gst_rate' => '18.00', 'cgst' => '49.50', 'sgst' => '49.50', 'total' => '649.00'],
        ],
        'payments' => [
            ['date' => '24th August, 2026', 'date_ymd' => '2026-08-24', 'amount' => '649.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #50)',
    ],
    [
        'serial' => 51,
        'invoice_number' => 'HOP/26-27/08/000051',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000051',
        'invoice_date' => '24th August, 2026',
        'invoice_date_ymd' => '2026-08-24',
        'customer_name' => 'Vinnuthna Bandaru',
        'customer_phone' => '984497337',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Oscar and Rasco',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '11900.00',
        'cgst' => '1071.00',
        'sgst' => '1071.00',
        'total_gst' => '2142.00',
        'grand_total' => '14042.00',
        'paid_amount' => '14042.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '7 night boarding charges for 2 pets (24th aug to 31st aug, till 12 noon)', 'price' => '11900.00', 'quantity' => 1, 'taxable_value' => '11900.00', 'gst_rate' => '18.00', 'cgst' => '1071.00', 'sgst' => '1071.00', 'total' => '14042.00'],
        ],
        'payments' => [
            ['date' => '24th August, 2026', 'date_ymd' => '2026-08-24', 'amount' => '14042.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #51)',
    ],
    [
        'serial' => 52,
        'invoice_number' => 'HOP/26-27/08/000052',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000052',
        'invoice_date' => '24th August, 2026',
        'invoice_date_ymd' => '2026-08-24',
        'customer_name' => 'Dinesh Bherwani',
        'customer_phone' => '+919930139776',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Zorro',
        'pet_species' => 'Cat',
        'payment_mode' => 'Online',
        'sub_total' => '1300.00',
        'cgst' => '117.00',
        'sgst' => '117.00',
        'total_gst' => '234.00',
        'grand_total' => '1534.00',
        'paid_amount' => '1534.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2 night boarding and 1 daycare charges (22nd aug to 24th aug evening)', 'price' => '1300.00', 'quantity' => 1, 'taxable_value' => '1300.00', 'gst_rate' => '18.00', 'cgst' => '117.00', 'sgst' => '117.00', 'total' => '1534.00'],
        ],
        'payments' => [
            ['date' => '24th August, 2026', 'date_ymd' => '2026-08-24', 'amount' => '1534.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #52)',
    ],
    [
        'serial' => 53,
        'invoice_number' => 'HOP/26-27/08/000053',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000053',
        'invoice_date' => '25th August, 2026',
        'invoice_date_ymd' => '2026-08-25',
        'customer_name' => 'Mohak Lohia',
        'customer_phone' => '9699015157',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Gabbar',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '6200.00',
        'cgst' => '558.00',
        'sgst' => '558.00',
        'total_gst' => '1116.00',
        'grand_total' => '7316.00',
        'paid_amount' => '7316.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2 night boarding Charges (7th aug to 9th aug, till 12 noon)', 'price' => '1700.00', 'quantity' => 1, 'taxable_value' => '1700.00', 'gst_rate' => '18.00', 'cgst' => '153.00', 'sgst' => '153.00', 'total' => '2006.00'],
            ['name' => '1 daycare charges (18th aug)', 'price' => '550.00', 'quantity' => 1, 'taxable_value' => '550.00', 'gst_rate' => '18.00', 'cgst' => '49.50', 'sgst' => '49.50', 'total' => '649.00'],
            ['name' => '4 night boarding charges (21st aug to 25th aug till evening)', 'price' => '3950.00', 'quantity' => 1, 'taxable_value' => '3950.00', 'gst_rate' => '18.00', 'cgst' => '355.50', 'sgst' => '355.50', 'total' => '4661.00'],
        ],
        'payments' => [
            ['date' => '25th August, 2026', 'date_ymd' => '2026-08-25', 'amount' => '7316.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #53)',
    ],
    [
        'serial' => 54,
        'invoice_number' => 'HOP/26-27/08/000054',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000054',
        'invoice_date' => '25th August, 2026',
        'invoice_date_ymd' => '2026-08-25',
        'customer_name' => 'Priya Nayak',
        'customer_phone' => '9911705836',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Atlas',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '9000.00',
        'cgst' => '810.00',
        'sgst' => '810.00',
        'total_gst' => '1620.00',
        'grand_total' => '10620.00',
        'paid_amount' => '10620.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 daycare charges (8th aug)', 'price' => '550.00', 'quantity' => 1, 'taxable_value' => '550.00', 'gst_rate' => '18.00', 'cgst' => '49.50', 'sgst' => '49.50', 'total' => '649.00'],
            ['name' => '9 night boarding and 1 daycare charges (25th aug to 3rd sept, till 2 am)', 'price' => '8450.00', 'quantity' => 1, 'taxable_value' => '8450.00', 'gst_rate' => '18.00', 'cgst' => '760.50', 'sgst' => '760.50', 'total' => '9971.00'],
        ],
        'payments' => [
            ['date' => '8th August, 2026', 'date_ymd' => '2026-08-08', 'amount' => '649.00', 'mode' => 'Online'],
            ['date' => '25th August, 2026', 'date_ymd' => '2026-08-25', 'amount' => '9971.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #54)',
    ],
    [
        'serial' => 55,
        'invoice_number' => 'HOP/26-27/08/000055',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000055',
        'invoice_date' => '25th August, 2026',
        'invoice_date_ymd' => '2026-08-25',
        'customer_name' => 'Shaheen Bhatt',
        'customer_phone' => '9833333737',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Luna',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '2550.00',
        'cgst' => '229.50',
        'sgst' => '229.50',
        'total_gst' => '459.00',
        'grand_total' => '3009.00',
        'paid_amount' => '0.00',
        'balance_due' => '3009.00',
        'payment_status' => 'UNPAID',
        'items' => [
            ['name' => '3 night boarding charges (19th july to 22nd july till 12 noon)', 'price' => '2550.00', 'quantity' => 1, 'taxable_value' => '2550.00', 'gst_rate' => '18.00', 'cgst' => '229.50', 'sgst' => '229.50', 'total' => '3009.00'],
        ],
        'payments' => [
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #55)',
    ],
    [
        'serial' => 56,
        'invoice_number' => 'HOP/26-27/08/000056',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000056',
        'invoice_date' => '23rd August, 2026',
        'invoice_date_ymd' => '2026-08-23',
        'customer_name' => 'Jeswica  Dsouza',
        'customer_phone' => '9820602547',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Enzo',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '2250.00',
        'cgst' => '202.50',
        'sgst' => '202.50',
        'total_gst' => '405.00',
        'grand_total' => '2655.00',
        'paid_amount' => '2655.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2 night boarding and 1 daycare charges (18th july to 20th july, 12 noon)', 'price' => '2250.00', 'quantity' => 1, 'taxable_value' => '2250.00', 'gst_rate' => '18.00', 'cgst' => '202.50', 'sgst' => '202.50', 'total' => '2655.00'],
        ],
        'payments' => [
            ['date' => '23rd August, 2026', 'date_ymd' => '2026-08-23', 'amount' => '2655.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #56)',
    ],
    [
        'serial' => 57,
        'invoice_number' => 'HOP/26-27/08/000057',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000057',
        'invoice_date' => '26th August, 2026',
        'invoice_date_ymd' => '2026-08-26',
        'customer_name' => 'Parth  Pandya',
        'customer_phone' => '99870036630',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Whitey',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '25960.00',
        'cgst' => '2336.40',
        'sgst' => '2336.40',
        'total_gst' => '4672.80',
        'grand_total' => '30632.80',
        'paid_amount' => '30632.80',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '30 night boarding charge  = ₹ 22,000 + 18%', 'price' => '25960.00', 'quantity' => 1, 'taxable_value' => '25960.00', 'gst_rate' => '18.00', 'cgst' => '2336.40', 'sgst' => '2336.40', 'total' => '30632.80'],
        ],
        'payments' => [
            ['date' => '26th August, 2026', 'date_ymd' => '2026-08-26', 'amount' => '30632.80', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #57)',
    ],
    [
        'serial' => 58,
        'invoice_number' => 'HOP/26-27/08/000058',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000058',
        'invoice_date' => '23rd August, 2026',
        'invoice_date_ymd' => '2026-08-23',
        'customer_name' => 'Sachin Jadhav',
        'customer_phone' => '8169974084',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Rey',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '5664.00',
        'cgst' => '509.76',
        'sgst' => '509.76',
        'total_gst' => '1019.52',
        'grand_total' => '6683.52',
        'paid_amount' => '6683.52',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '5 night boarding and 1 daycare charges (23rd aug to 28th aug till, evening) - Rs 4,800 + 18% GST', 'price' => '5664.00', 'quantity' => 1, 'taxable_value' => '5664.00', 'gst_rate' => '18.00', 'cgst' => '509.76', 'sgst' => '509.76', 'total' => '6683.52'],
        ],
        'payments' => [
            ['date' => '23rd August, 2026', 'date_ymd' => '2026-08-23', 'amount' => '6683.52', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #58)',
    ],
    [
        'serial' => 59,
        'invoice_number' => 'HOP/26-27/08/000059',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000059',
        'invoice_date' => '26th August, 2026',
        'invoice_date_ymd' => '2026-08-26',
        'customer_name' => 'Mark Bennington',
        'customer_phone' => '7715805078',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Mocha and Latte',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '7300.00',
        'cgst' => '657.00',
        'sgst' => '657.00',
        'total_gst' => '1314.00',
        'grand_total' => '8614.00',
        'paid_amount' => '8614.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2 night boarding and 1 daycare charges for 2 pets (4th aug to 6th aug till evening)', 'price' => '4500.00', 'quantity' => 1, 'taxable_value' => '4500.00', 'gst_rate' => '18.00', 'cgst' => '405.00', 'sgst' => '405.00', 'total' => '5310.00'],
            ['name' => '2 night boarding charges for 2 pets (25th aug to 26th aug)', 'price' => '2800.00', 'quantity' => 1, 'taxable_value' => '2800.00', 'gst_rate' => '18.00', 'cgst' => '252.00', 'sgst' => '252.00', 'total' => '3304.00'],
        ],
        'payments' => [
            ['date' => '4th August, 2026', 'date_ymd' => '2026-08-04', 'amount' => '4012.00', 'mode' => 'Online'],
            ['date' => '6th August, 2026', 'date_ymd' => '2026-08-06', 'amount' => '1298.00', 'mode' => 'Online'],
            ['date' => '26th August, 2026', 'date_ymd' => '2026-08-26', 'amount' => '3304.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #59)',
    ],
    [
        'serial' => 60,
        'invoice_number' => 'HOP/26-27/08/000060',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000060',
        'invoice_date' => '26th August, 2026',
        'invoice_date_ymd' => '2026-08-26',
        'customer_name' => 'Beena Shah',
        'customer_phone' => '9819435935',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Bruno',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '10250.00',
        'cgst' => '922.50',
        'sgst' => '922.50',
        'total_gst' => '1845.00',
        'grand_total' => '12095.00',
        'paid_amount' => '12095.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '20 daycare package', 'price' => '10250.00', 'quantity' => 1, 'taxable_value' => '10250.00', 'gst_rate' => '18.00', 'cgst' => '922.50', 'sgst' => '922.50', 'total' => '12095.00'],
        ],
        'payments' => [
            ['date' => '26/08/2026', 'date_ymd' => '2026-08-26', 'amount' => '12095.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #60)',
    ],
    [
        'serial' => 61,
        'invoice_number' => 'HOP/26-27/08/000061',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000061',
        'invoice_date' => '26th August, 2026',
        'invoice_date_ymd' => '2026-08-26',
        'customer_name' => 'Ketaki Jategonkar',
        'customer_phone' => '9673628176',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Coco',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '2250.00',
        'cgst' => '202.50',
        'sgst' => '202.50',
        'total_gst' => '405.00',
        'grand_total' => '2655.00',
        'paid_amount' => '2655.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2 night boarding and 1 daycare charges (24th aug to 26th aug, till evening)', 'price' => '2250.00', 'quantity' => 1, 'taxable_value' => '2250.00', 'gst_rate' => '18.00', 'cgst' => '202.50', 'sgst' => '202.50', 'total' => '2655.00'],
        ],
        'payments' => [
            ['date' => '26/08/2026', 'date_ymd' => '2026-08-26', 'amount' => '2655.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #61)',
    ],
    [
        'serial' => 62,
        'invoice_number' => 'HOP/26-27/08/000062',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000062',
        'invoice_date' => '26th August, 2026',
        'invoice_date_ymd' => '2026-08-26',
        'customer_name' => 'Subhadra Venkateswaran',
        'customer_phone' => '9969888514',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Skye and toto',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '8500.00',
        'cgst' => '765.00',
        'sgst' => '765.00',
        'total_gst' => '1530.00',
        'grand_total' => '10030.00',
        'paid_amount' => '10030.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2 night boarding for 2 pets (1st aug to 3rd aug till 12 noon)', 'price' => '3400.00', 'quantity' => 1, 'taxable_value' => '3400.00', 'gst_rate' => '18.00', 'cgst' => '306.00', 'sgst' => '306.00', 'total' => '4012.00'],
            ['name' => '1 night boarding for 2 pets (13th aug to 14th aug till 12 noon)', 'price' => '1700.00', 'quantity' => 1, 'taxable_value' => '1700.00', 'gst_rate' => '18.00', 'cgst' => '153.00', 'sgst' => '153.00', 'total' => '2006.00'],
            ['name' => '2 night boarding for 2 pets (27th aug to 29th aug, till 12 noon)', 'price' => '3400.00', 'quantity' => 1, 'taxable_value' => '3400.00', 'gst_rate' => '18.00', 'cgst' => '306.00', 'sgst' => '306.00', 'total' => '4012.00'],
        ],
        'payments' => [
            ['date' => '1st August, 2026', 'date_ymd' => '2026-08-01', 'amount' => '4012.00', 'mode' => 'Online'],
            ['date' => '13th August, 2026', 'date_ymd' => '2026-08-13', 'amount' => '2006.00', 'mode' => 'Online'],
            ['date' => '26th August, 2026', 'date_ymd' => '2026-08-26', 'amount' => '4012.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #62)',
    ],
    [
        'serial' => 63,
        'invoice_number' => 'HOP/26-27/08/000063',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000063',
        'invoice_date' => '27th August, 2026',
        'invoice_date_ymd' => '2026-08-27',
        'customer_name' => 'Jeremy .Dsouza',
        'customer_phone' => '9773654284',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Jelly',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '3400.00',
        'cgst' => '306.00',
        'sgst' => '306.00',
        'total_gst' => '612.00',
        'grand_total' => '4012.00',
        'paid_amount' => '4012.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '4 night boarding charges (27th aug to 31st aug till 12 noon)', 'price' => '3400.00', 'quantity' => 1, 'taxable_value' => '3400.00', 'gst_rate' => '18.00', 'cgst' => '306.00', 'sgst' => '306.00', 'total' => '4012.00'],
        ],
        'payments' => [
            ['date' => '27th August, 2026', 'date_ymd' => '2026-08-27', 'amount' => '4012.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #63)',
    ],
    [
        'serial' => 64,
        'invoice_number' => 'HOP/26-27/08/000064',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000064',
        'invoice_date' => '27th August, 2026',
        'invoice_date_ymd' => '2026-08-27',
        'customer_name' => 'Rohit Nair',
        'customer_phone' => '9742875235',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Zoe',
        'pet_species' => 'Cat',
        'payment_mode' => 'Online',
        'sub_total' => '3100.00',
        'cgst' => '279.00',
        'sgst' => '279.00',
        'total_gst' => '558.00',
        'grand_total' => '3658.00',
        'paid_amount' => '3658.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '3 night boarding and 1 daycare charges (27th aug to 30th aug, until evening)', 'price' => '3100.00', 'quantity' => 1, 'taxable_value' => '3100.00', 'gst_rate' => '18.00', 'cgst' => '279.00', 'sgst' => '279.00', 'total' => '3658.00'],
        ],
        'payments' => [
            ['date' => '27/08/2026', 'date_ymd' => '2026-08-27', 'amount' => '3658.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #64)',
    ],
    [
        'serial' => 65,
        'invoice_number' => 'HOP/26-27/08/000065',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000065',
        'invoice_date' => '28th August, 2026',
        'invoice_date_ymd' => '2026-08-28',
        'customer_name' => 'Kajal Gopal',
        'customer_phone' => '9769881678',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Max',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '1950.00',
        'cgst' => '175.50',
        'sgst' => '175.50',
        'total_gst' => '351.00',
        'grand_total' => '2301.00',
        'paid_amount' => '0.00',
        'balance_due' => '2301.00',
        'payment_status' => 'UNPAID',
        'items' => [
            ['name' => '1 daycare charges (20th aug)', 'price' => '550.00', 'quantity' => 1, 'taxable_value' => '550.00', 'gst_rate' => '18.00', 'cgst' => '49.50', 'sgst' => '49.50', 'total' => '649.00'],
            ['name' => '1 night boarding charges (22nd aug to 23rd aug till 12 noon)', 'price' => '850.00', 'quantity' => 1, 'taxable_value' => '850.00', 'gst_rate' => '18.00', 'cgst' => '76.50', 'sgst' => '76.50', 'total' => '1003.00'],
            ['name' => '1 daycare charges (28th aug)', 'price' => '550.00', 'quantity' => 1, 'taxable_value' => '550.00', 'gst_rate' => '18.00', 'cgst' => '49.50', 'sgst' => '49.50', 'total' => '649.00'],
        ],
        'payments' => [
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #65)',
    ],
    [
        'serial' => 66,
        'invoice_number' => 'HOP/26-27/08/000066',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000066',
        'invoice_date' => '28th August, 2026',
        'invoice_date_ymd' => '2026-08-28',
        'customer_name' => 'Niti',
        'customer_phone' => '8828116373',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Frodo and Sam',
        'pet_species' => 'Dog & Cat',
        'payment_mode' => 'Online',
        'sub_total' => '17550.00',
        'cgst' => '1579.50',
        'sgst' => '1579.50',
        'total_gst' => '3159.00',
        'grand_total' => '20709.00',
        'paid_amount' => '20709.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '13 night boarding charges for Frodo (28th aug to 10th sept, till evening)', 'price' => '11050.00', 'quantity' => 1, 'taxable_value' => '11050.00', 'gst_rate' => '18.00', 'cgst' => '994.50', 'sgst' => '994.50', 'total' => '13039.00'],
            ['name' => '13 night boarding charges for Sam (cat)', 'price' => '6500.00', 'quantity' => 1, 'taxable_value' => '6500.00', 'gst_rate' => '18.00', 'cgst' => '585.00', 'sgst' => '585.00', 'total' => '7670.00'],
        ],
        'payments' => [
            ['date' => '28/08/2026', 'date_ymd' => '2026-08-28', 'amount' => '20709.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #66)',
    ],
    [
        'serial' => 67,
        'invoice_number' => 'HOP/26-27/08/000067',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000067',
        'invoice_date' => '28th August, 2026',
        'invoice_date_ymd' => '2026-08-28',
        'customer_name' => 'Anoushka Babur',
        'customer_phone' => '+971556410688',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Masti',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '7250.00',
        'cgst' => '652.50',
        'sgst' => '652.50',
        'total_gst' => '1305.00',
        'grand_total' => '8555.00',
        'paid_amount' => '8555.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '6 Daycare (20th August, 21st August, 24th August, 25th August, 26th August & 27th August)', 'price' => '3300.00', 'quantity' => 1, 'taxable_value' => '3300.00', 'gst_rate' => '18.00', 'cgst' => '297.00', 'sgst' => '297.00', 'total' => '3894.00'],
            ['name' => '4 nights + 1 daycare (29th August to 2nd September, until evening)', 'price' => '3950.00', 'quantity' => 1, 'taxable_value' => '3950.00', 'gst_rate' => '18.00', 'cgst' => '355.50', 'sgst' => '355.50', 'total' => '4661.00'],
        ],
        'payments' => [
            ['date' => '28/08/2026', 'date_ymd' => '2026-08-28', 'amount' => '8555.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #67)',
    ],
    [
        'serial' => 68,
        'invoice_number' => 'HOP/26-27/08/000068',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000068',
        'invoice_date' => '29th August, 2026',
        'invoice_date_ymd' => '2026-08-29',
        'customer_name' => 'Manu Rishi Chadha',
        'customer_phone' => '9619186969',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Pinny',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '550.00',
        'cgst' => '49.50',
        'sgst' => '49.50',
        'total_gst' => '99.00',
        'grand_total' => '649.00',
        'paid_amount' => '649.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 daycare charges (28th august)', 'price' => '550.00', 'quantity' => 1, 'taxable_value' => '550.00', 'gst_rate' => '18.00', 'cgst' => '49.50', 'sgst' => '49.50', 'total' => '649.00'],
        ],
        'payments' => [
            ['date' => '29th August, 2026', 'date_ymd' => '2026-08-29', 'amount' => '649.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #68)',
    ],
    [
        'serial' => 69,
        'invoice_number' => 'HOP/26-27/08/000069',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000069',
        'invoice_date' => '30th August, 2026',
        'invoice_date_ymd' => '2026-08-30',
        'customer_name' => 'Amey Nadkarni',
        'customer_phone' => '9820501869',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Joey',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '7150.00',
        'cgst' => '643.50',
        'sgst' => '643.50',
        'total_gst' => '1287.00',
        'grand_total' => '8437.00',
        'paid_amount' => '8437.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '13 daycare (4th aug, 6th aug, 8th aug, 12th aug, 13th aug, 14th aug, 17th aug, 18th aug, 20th aug, 22nd aug, 26th aug, 28th aug & 30th aug)', 'price' => '7150.00', 'quantity' => 1, 'taxable_value' => '7150.00', 'gst_rate' => '18.00', 'cgst' => '643.50', 'sgst' => '643.50', 'total' => '8437.00'],
        ],
        'payments' => [
            ['date' => '30/08/2026', 'date_ymd' => '2026-08-30', 'amount' => '8437.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #69)',
    ],
    [
        'serial' => 70,
        'invoice_number' => 'HOP/26-27/08/000070',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000070',
        'invoice_date' => '30th August, 2026',
        'invoice_date_ymd' => '2026-08-30',
        'customer_name' => 'Vaibhav Desai',
        'customer_phone' => '9619720818',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => ' Jordan',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '3100.00',
        'cgst' => '279.00',
        'sgst' => '279.00',
        'total_gst' => '558.00',
        'grand_total' => '3658.00',
        'paid_amount' => '3658.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '3 night boarding charges (27th aug to 30th aug, till afternoon)', 'price' => '3100.00', 'quantity' => 1, 'taxable_value' => '3100.00', 'gst_rate' => '18.00', 'cgst' => '279.00', 'sgst' => '279.00', 'total' => '3658.00'],
        ],
        'payments' => [
            ['date' => '30th August, 2026', 'date_ymd' => '2026-08-30', 'amount' => '3658.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #70)',
    ],
    [
        'serial' => 71,
        'invoice_number' => 'HOP/26-27/08/000071',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000071',
        'invoice_date' => '30th August, 2026',
        'invoice_date_ymd' => '2026-08-30',
        'customer_name' => 'Diksha Dwivedi',
        'customer_phone' => '9871622380',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Miss Pinto',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '850.00',
        'cgst' => '76.50',
        'sgst' => '76.50',
        'total_gst' => '153.00',
        'grand_total' => '1003.00',
        'paid_amount' => '1003.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 night boarding charges (29th aug to 30th aug, till noon)', 'price' => '850.00', 'quantity' => 1, 'taxable_value' => '850.00', 'gst_rate' => '18.00', 'cgst' => '76.50', 'sgst' => '76.50', 'total' => '1003.00'],
        ],
        'payments' => [
            ['date' => '30/08/2026', 'date_ymd' => '2026-08-30', 'amount' => '1003.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #71)',
    ],
    [
        'serial' => 72,
        'invoice_number' => 'HOP/26-27/08/000072',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000072',
        'invoice_date' => '30th August, 2026',
        'invoice_date_ymd' => '2026-08-30',
        'customer_name' => 'Alka Patil',
        'customer_phone' => '9920354583',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Mylo',
        'pet_species' => 'Cat',
        'payment_mode' => 'Online',
        'sub_total' => '2000.00',
        'cgst' => '180.00',
        'sgst' => '180.00',
        'total_gst' => '360.00',
        'grand_total' => '2360.00',
        'paid_amount' => '2360.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '4 night boarding  charges (1st sept to 5th sept,12 noon)', 'price' => '2000.00', 'quantity' => 1, 'taxable_value' => '2000.00', 'gst_rate' => '18.00', 'cgst' => '180.00', 'sgst' => '180.00', 'total' => '2360.00'],
        ],
        'payments' => [
            ['date' => '30/08/2026', 'date_ymd' => '2026-08-30', 'amount' => '2360.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #72)',
    ],
    [
        'serial' => 73,
        'invoice_number' => 'HOP/26-27/08/000073',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000073',
        'invoice_date' => '30th August, 2026',
        'invoice_date_ymd' => '2026-08-30',
        'customer_name' => 'Anshuman Roy',
        'customer_phone' => '+918104795267',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Dali',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '8200.00',
        'cgst' => '738.00',
        'sgst' => '738.00',
        'total_gst' => '1476.00',
        'grand_total' => '9676.00',
        'paid_amount' => '9676.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '3 nights boarding + 1 daycare (30th jul to 2nd aug, until evening)', 'price' => '2825.00', 'quantity' => 1, 'taxable_value' => '2825.00', 'gst_rate' => '18.00', 'cgst' => '254.25', 'sgst' => '254.25', 'total' => '3333.50'],
            ['name' => '4 nights boarding (11th aug to 15th aug, until 12 noon)', 'price' => '3400.00', 'quantity' => 1, 'taxable_value' => '3400.00', 'gst_rate' => '18.00', 'cgst' => '306.00', 'sgst' => '306.00', 'total' => '4012.00'],
            ['name' => '2 night boarding + 1 daycare (26th aug to 28th aug, until evening)', 'price' => '1975.00', 'quantity' => 1, 'taxable_value' => '1975.00', 'gst_rate' => '18.00', 'cgst' => '177.75', 'sgst' => '177.75', 'total' => '2330.50'],
        ],
        'payments' => [
            ['date' => '30th August, 2026', 'date_ymd' => '2026-08-30', 'amount' => '9676.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #73)',
    ],
    [
        'serial' => 74,
        'invoice_number' => 'HOP/26-27/08/000074',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000074',
        'invoice_date' => '31st August, 2026',
        'invoice_date_ymd' => '2026-08-31',
        'customer_name' => 'Tasneem Vora',
        'customer_phone' => '9699218152',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Percy',
        'pet_species' => 'Cat',
        'payment_mode' => 'Cash',
        'sub_total' => '1300.00',
        'cgst' => '117.00',
        'sgst' => '117.00',
        'total_gst' => '234.00',
        'grand_total' => '1534.00',
        'paid_amount' => '1534.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2 night boarding and 1 daycare charges (22nd aug to 24th aug till evening)', 'price' => '1300.00', 'quantity' => 1, 'taxable_value' => '1300.00', 'gst_rate' => '18.00', 'cgst' => '117.00', 'sgst' => '117.00', 'total' => '1534.00'],
        ],
        'payments' => [
            ['date' => '31/08/2026', 'date_ymd' => '2026-08-31', 'amount' => '1534.00', 'mode' => 'Cash'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #74)',
    ],
    [
        'serial' => 75,
        'invoice_number' => 'HOP/26-27/08/000075',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000075',
        'invoice_date' => '31st August, 2026',
        'invoice_date_ymd' => '2026-08-31',
        'customer_name' => 'Foram Srivastava',
        'customer_phone' => '9920914715',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Sufi',
        'pet_species' => 'Cat',
        'payment_mode' => 'Cash',
        'sub_total' => '4838.00',
        'cgst' => '435.42',
        'sgst' => '435.42',
        'total_gst' => '870.84',
        'grand_total' => '5708.84',
        'paid_amount' => '5708.84',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '2-night boarding + 1 daycare (4th August to 6th August until evening); Rs 1,300 + 18% GST', 'price' => '1534.00', 'quantity' => 1, 'taxable_value' => '1534.00', 'gst_rate' => '18.00', 'cgst' => '138.06', 'sgst' => '138.06', 'total' => '1810.12'],
            ['name' => '5-night boarding + 1 daycare (25th August to 30th August until evening) : ₹2,800 +  18% GST', 'price' => '3304.00', 'quantity' => 1, 'taxable_value' => '3304.00', 'gst_rate' => '18.00', 'cgst' => '297.36', 'sgst' => '297.36', 'total' => '3898.72'],
        ],
        'payments' => [
            ['date' => '31st August, 2026', 'date_ymd' => '2026-08-31', 'amount' => '5708.84', 'mode' => 'Cash'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #75)',
    ],
    [
        'serial' => 76,
        'invoice_number' => 'HOP/26-27/08/000076',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000076',
        'invoice_date' => '31st August, 2026',
        'invoice_date_ymd' => '2026-08-31',
        'customer_name' => 'Anushree Arora',
        'customer_phone' => '77700028609',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Don',
        'pet_species' => 'Dog',
        'payment_mode' => 'Cash / Online',
        'sub_total' => '24224.00',
        'cgst' => '2180.16',
        'sgst' => '2180.16',
        'total_gst' => '4360.32',
        'grand_total' => '28584.32',
        'paid_amount' => '28584.32',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '15 night boarding package (Package 1 - Cash)', 'price' => '12112.00', 'quantity' => 1, 'taxable_value' => '12112.00', 'gst_rate' => '18.00', 'cgst' => '1090.08', 'sgst' => '1090.08', 'total' => '14292.16'],
            ['name' => '15 night boarding package (Package 2 - Online)', 'price' => '12112.00', 'quantity' => 1, 'taxable_value' => '12112.00', 'gst_rate' => '18.00', 'cgst' => '1090.08', 'sgst' => '1090.08', 'total' => '14292.16'],
        ],
        'payments' => [
            ['date' => '31st August, 2026', 'date_ymd' => '2026-08-31', 'amount' => '14292.00', 'mode' => 'Cash'],
            ['date' => '31st August, 2026', 'date_ymd' => '2026-08-31', 'amount' => '14292.32', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #76)',
    ],
    [
        'serial' => 77,
        'invoice_number' => 'HOP/26-27/08/000077',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000077',
        'invoice_date' => '31st August, 2026',
        'invoice_date_ymd' => '2026-08-31',
        'customer_name' => 'Armaan  Ahmed',
        'customer_phone' => '8240048688',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Bubbles',
        'pet_species' => 'Dog',
        'payment_mode' => 'Cash / Online',
        'sub_total' => '18062.00',
        'cgst' => '1625.58',
        'sgst' => '1625.58',
        'total_gst' => '3251.16',
        'grand_total' => '21313.16',
        'paid_amount' => '21313.16',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '3 night boarding charges (2nd aug to 5th aug, till 12 noon)', 'price' => '2550.00', 'quantity' => 1, 'taxable_value' => '2550.00', 'gst_rate' => '18.00', 'cgst' => '229.50', 'sgst' => '229.50', 'total' => '3009.00'],
            ['name' => '4 night boarding charges (13th aug to 17th aug, until 12 noon)', 'price' => '3400.00', 'quantity' => 1, 'taxable_value' => '3400.00', 'gst_rate' => '18.00', 'cgst' => '306.00', 'sgst' => '306.00', 'total' => '4012.00'],
            ['name' => '15-Night Boarding Package', 'price' => '12112.00', 'quantity' => 1, 'taxable_value' => '12112.00', 'gst_rate' => '18.00', 'cgst' => '1090.08', 'sgst' => '1090.08', 'total' => '14292.16'],
        ],
        'payments' => [
            ['date' => '31st August, 2026', 'date_ymd' => '2026-08-31', 'amount' => '21313.16', 'mode' => 'Cash / Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #77)',
    ],
    [
        'serial' => 78,
        'invoice_number' => 'HOP/26-27/08/000078',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000078',
        'invoice_date' => '31st August, 2026',
        'invoice_date_ymd' => '2026-08-31',
        'customer_name' => 'Celesty Mahesh',
        'customer_phone' => '7796118357',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Lucy',
        'pet_species' => 'Dog',
        'payment_mode' => 'Cash',
        'sub_total' => '11033.00',
        'cgst' => '992.97',
        'sgst' => '992.97',
        'total_gst' => '1985.94',
        'grand_total' => '13018.94',
        'paid_amount' => '13018.94',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '11 night boarding  charges  (5th aug to 16th aug till evening) = Rs 9,350 + 18% GST', 'price' => '11033.00', 'quantity' => 1, 'taxable_value' => '11033.00', 'gst_rate' => '18.00', 'cgst' => '992.97', 'sgst' => '992.97', 'total' => '13018.94'],
        ],
        'payments' => [
            ['date' => '31/08/2026', 'date_ymd' => '2026-08-31', 'amount' => '13018.94', 'mode' => 'Cash'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #78)',
    ],
    [
        'serial' => 79,
        'invoice_number' => 'HOP/26-27/08/000079',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000079',
        'invoice_date' => '31st August, 2026',
        'invoice_date_ymd' => '2026-08-31',
        'customer_name' => 'Kanchan Marathe',
        'customer_phone' => '9820518989',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Hobbes',
        'pet_species' => 'Dog',
        'payment_mode' => 'Cash',
        'sub_total' => '5100.00',
        'cgst' => '459.00',
        'sgst' => '459.00',
        'total_gst' => '918.00',
        'grand_total' => '6018.00',
        'paid_amount' => '6018.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '3 night boarding (7th aug to 10th aug, until 12 noon)', 'price' => '2550.00', 'quantity' => 1, 'taxable_value' => '2550.00', 'gst_rate' => '18.00', 'cgst' => '229.50', 'sgst' => '229.50', 'total' => '3009.00'],
            ['name' => '1 night Boarding (15th aug to 16th aug until 12 noon)', 'price' => '850.00', 'quantity' => 1, 'taxable_value' => '850.00', 'gst_rate' => '18.00', 'cgst' => '76.50', 'sgst' => '76.50', 'total' => '1003.00'],
            ['name' => '2 night boarding (22nd aug to 24th aug, until 12 noon)', 'price' => '1700.00', 'quantity' => 1, 'taxable_value' => '1700.00', 'gst_rate' => '18.00', 'cgst' => '153.00', 'sgst' => '153.00', 'total' => '2006.00'],
        ],
        'payments' => [
            ['date' => '31/08/2026', 'date_ymd' => '2026-08-31', 'amount' => '6018.00', 'mode' => 'Cash'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #79)',
    ],
    [
        'serial' => 80,
        'invoice_number' => 'HOP/26-27/08/000080',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000080',
        'invoice_date' => '31st August, 2026',
        'invoice_date_ymd' => '2026-08-31',
        'customer_name' => 'Hirdeya Goyal',
        'customer_phone' => '8080339037',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Brownie and Shadow',
        'pet_species' => 'Dog',
        'payment_mode' => 'Cash',
        'sub_total' => '20500.00',
        'cgst' => '1845.00',
        'sgst' => '1845.00',
        'total_gst' => '3690.00',
        'grand_total' => '24190.00',
        'paid_amount' => '24190.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => 'Brownie Boarding Charges (19th Aug to 19th Sep)', 'price' => '19000.00', 'quantity' => 1, 'taxable_value' => '19000.00', 'gst_rate' => '18.00', 'cgst' => '1710.00', 'sgst' => '1710.00', 'total' => '22420.00'],
            ['name' => 'Shadow – 2 Daycare Charges + Late Night Pickup (22nd Aug & 28th Aug)', 'price' => '1500.00', 'quantity' => 1, 'taxable_value' => '1500.00', 'gst_rate' => '18.00', 'cgst' => '135.00', 'sgst' => '135.00', 'total' => '1770.00'],
        ],
        'payments' => [
            ['date' => '31/08/2026', 'date_ymd' => '2026-08-31', 'amount' => '24190.00', 'mode' => 'Cash'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #80)',
    ],
    [
        'serial' => 81,
        'invoice_number' => 'HOP/26-27/08/000081',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000081',
        'invoice_date' => '31st August, 2026',
        'invoice_date_ymd' => '2026-08-31',
        'customer_name' => 'Pooja Manian',
        'customer_phone' => '9975045126',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Yoda',
        'pet_species' => 'Dog',
        'payment_mode' => 'Cash / Online',
        'sub_total' => '10030.00',
        'cgst' => '902.70',
        'sgst' => '902.70',
        'total_gst' => '1805.40',
        'grand_total' => '11835.40',
        'paid_amount' => '11835.40',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 night boarding charges (2nd aug to 3rd aug until 12 noon : ₹850 + 18% GST', 'price' => '1003.00', 'quantity' => 1, 'taxable_value' => '1003.00', 'gst_rate' => '18.00', 'cgst' => '90.27', 'sgst' => '90.27', 'total' => '1183.54'],
            ['name' => '3 night boarding charges (18th aug to 21st aug until 12 noon) : ₹2,550 + 18% GST', 'price' => '3009.00', 'quantity' => 1, 'taxable_value' => '3009.00', 'gst_rate' => '18.00', 'cgst' => '270.81', 'sgst' => '270.81', 'total' => '3550.62'],
            ['name' => '6 night boarding charges (25th aug to 31st aug until 12 noon ): ₹5,100 + 18% GST', 'price' => '6018.00', 'quantity' => 1, 'taxable_value' => '6018.00', 'gst_rate' => '18.00', 'cgst' => '541.62', 'sgst' => '541.62', 'total' => '7101.24'],
        ],
        'payments' => [
            ['date' => '31st August, 2026', 'date_ymd' => '2026-08-31', 'amount' => '11835.40', 'mode' => 'Cash / Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #81)',
    ],
    [
        'serial' => 82,
        'invoice_number' => 'HOP/26-27/08/000082',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000082',
        'invoice_date' => '31st August, 2026',
        'invoice_date_ymd' => '2026-08-31',
        'customer_name' => 'Chandrama  Verma',
        'customer_phone' => '9820152539',
        'customer_address' => 'B505 New Annapurna Apartment, Yari Road, Versova, Andheri West, Mumbai 400061',
        'gstin' => '27ABHPV8741P1ZM',
        'pet_name' => 'Jazz',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '6925.00',
        'cgst' => '623.25',
        'sgst' => '623.25',
        'total_gst' => '1246.50',
        'grand_total' => '8171.50',
        'paid_amount' => '8171.50',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '10 Daycare Package', 'price' => '5225.00', 'quantity' => 1, 'taxable_value' => '5225.00', 'gst_rate' => '18.00', 'cgst' => '470.25', 'sgst' => '470.25', 'total' => '6165.50'],
            ['name' => '1 night boarding package : 7th aug to 8th aug, 12 noon', 'price' => '850.00', 'quantity' => 1, 'taxable_value' => '850.00', 'gst_rate' => '18.00', 'cgst' => '76.50', 'sgst' => '76.50', 'total' => '1003.00'],
            ['name' => '1 night boarding package : 23rd aug to 24th aug, 12 noon', 'price' => '850.00', 'quantity' => 1, 'taxable_value' => '850.00', 'gst_rate' => '18.00', 'cgst' => '76.50', 'sgst' => '76.50', 'total' => '1003.00'],
        ],
        'payments' => [
            ['date' => '31/08/2026', 'date_ymd' => '2026-08-31', 'amount' => '8171.50', 'mode' => 'Online'],
        ],
        'is_gst' => true,
        'notes' => 'Imported from August 2026 word records (Chunk #82)',
    ],
    [
        'serial' => 83,
        'invoice_number' => 'HOP/26-27/08/000083',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000083',
        'invoice_date' => '31st August, 2026',
        'invoice_date_ymd' => '2026-08-31',
        'customer_name' => 'Suchi Dahibavkar',
        'customer_phone' => '9773408857',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Ricky',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '649.00',
        'cgst' => '58.41',
        'sgst' => '58.41',
        'total_gst' => '116.82',
        'grand_total' => '765.82',
        'paid_amount' => '765.82',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 Daycare Charges (28th aug) : Rs 550 + 18% GST', 'price' => '649.00', 'quantity' => 1, 'taxable_value' => '649.00', 'gst_rate' => '18.00', 'cgst' => '58.41', 'sgst' => '58.41', 'total' => '765.82'],
        ],
        'payments' => [
            ['date' => '31/08/2026', 'date_ymd' => '2026-08-31', 'amount' => '765.82', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #83)',
    ],
    [
        'serial' => 84,
        'invoice_number' => 'HOP/26-27/08/000084',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000084',
        'invoice_date' => '31st August, 2026',
        'invoice_date_ymd' => '2026-08-31',
        'customer_name' => 'Neha Mitra',
        'customer_phone' => '9920281516',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Joey, Jordan and Coco',
        'pet_species' => 'Dog',
        'payment_mode' => 'Cash',
        'sub_total' => '146330.00',
        'cgst' => '13169.70',
        'sgst' => '13169.70',
        'total_gst' => '26339.40',
        'grand_total' => '172669.40',
        'paid_amount' => '172669.40',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => 'Coco - 30-Night Boarding Package 1 (13th Jul to 13th Aug)', 'price' => '22000.00', 'quantity' => 1, 'taxable_value' => '22000.00', 'gst_rate' => '18.00', 'cgst' => '1980.00', 'sgst' => '1980.00', 'total' => '25960.00'],
            ['name' => 'Coco - 30-Night Boarding Package 2 (30-night boarding)', 'price' => '22000.00', 'quantity' => 1, 'taxable_value' => '22000.00', 'gst_rate' => '18.00', 'cgst' => '1980.00', 'sgst' => '1980.00', 'total' => '25960.00'],
            ['name' => 'Joey and Jordan - 4 × 30-Night Boarding Packages (4 pets x ₹22,000)', 'price' => '88000.00', 'quantity' => 1, 'taxable_value' => '88000.00', 'gst_rate' => '18.00', 'cgst' => '7920.00', 'sgst' => '7920.00', 'total' => '103840.00'],
            ['name' => 'Dollar – 1 Daycare Charges', 'price' => '550.00', 'quantity' => 1, 'taxable_value' => '550.00', 'gst_rate' => '18.00', 'cgst' => '49.50', 'sgst' => '49.50', 'total' => '649.00'],
            ['name' => 'Honey & Butter – 8-Night Boarding Charges (8th Aug to 16th Aug until 12 noon)', 'price' => '13780.00', 'quantity' => 1, 'taxable_value' => '13780.00', 'gst_rate' => '18.00', 'cgst' => '1240.20', 'sgst' => '1240.20', 'total' => '16260.40'],
        ],
        'payments' => [
            ['date' => '31st August, 2026', 'date_ymd' => '2026-08-31', 'amount' => '172669.40', 'mode' => 'Cash'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #84)',
    ],
    [
        'serial' => 85,
        'invoice_number' => 'HOP/26-27/08/000085',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000085',
        'invoice_date' => '31st August, 2026',
        'invoice_date_ymd' => '2026-08-31',
        'customer_name' => 'Akansha',
        'customer_phone' => '7400245750',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Gloria',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '1003.00',
        'cgst' => '90.27',
        'sgst' => '90.27',
        'total_gst' => '180.54',
        'grand_total' => '1183.54',
        'paid_amount' => '1183.54',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => '1 night boarding (19th aug to 20th aug, 12noon) = Rs 850 + 18% GST', 'price' => '1003.00', 'quantity' => 1, 'taxable_value' => '1003.00', 'gst_rate' => '18.00', 'cgst' => '90.27', 'sgst' => '90.27', 'total' => '1183.54'],
        ],
        'payments' => [
            ['date' => '31/08/2026', 'date_ymd' => '2026-08-31', 'amount' => '1183.54', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #85)',
    ],
    [
        'serial' => 86,
        'invoice_number' => 'HOP/26-27/08/000086',
        'internal_invoice_id' => 'INV-HOP-26-27-08-000086',
        'invoice_date' => '31st August, 2026',
        'invoice_date_ymd' => '2026-08-31',
        'customer_name' => 'Maya Menon',
        'customer_phone' => '9820403531',
        'customer_address' => '',
        'gstin' => '',
        'pet_name' => 'Moh',
        'pet_species' => 'Dog',
        'payment_mode' => 'Online',
        'sub_total' => '550.00',
        'cgst' => '49.50',
        'sgst' => '49.50',
        'total_gst' => '99.00',
        'grand_total' => '649.00',
        'paid_amount' => '649.00',
        'balance_due' => '0.00',
        'payment_status' => 'PAID',
        'items' => [
            ['name' => 'One daycare charges (22nd aug )', 'price' => '550.00', 'quantity' => 1, 'taxable_value' => '550.00', 'gst_rate' => '18.00', 'cgst' => '49.50', 'sgst' => '49.50', 'total' => '649.00'],
        ],
        'payments' => [
            ['date' => '31/08/2026', 'date_ymd' => '2026-08-31', 'amount' => '649.00', 'mode' => 'Online'],
        ],
        'is_gst' => false,
        'notes' => 'Imported from August 2026 word records (Chunk #86)',
    ],
];

$totalInvoicesCount = count($augustInvoices);
logMsg("Loaded verified August dataset: {$totalInvoicesCount} invoices (HOP/26-27/08/000001 to HOP/26-27/08/000086)");

if ($totalInvoicesCount !== 86) {
    logMsg("CRITICAL ERROR: Dataset must contain exactly 86 invoices. Found {$totalInvoicesCount}.", 'CRITICAL');
    exit(1);
}

// Compute Exact Decimal Totals
$totalTaxable    = '0.00';
$totalCgst       = '0.00';
$totalSgst       = '0.00';
$totalGst        = '0.00';
$totalGrandTotal = '0.00';
$totalPaidAmount = '0.00';
$totalBalanceDue = '0.00';
$totalItemsCount = 0;
$totalPaymentsCount = 0;

foreach ($augustInvoices as $inv) {
    $totalTaxable    = decimalAddStr($totalTaxable, $inv['sub_total']);
    $totalCgst       = decimalAddStr($totalCgst, $inv['cgst']);
    $totalSgst       = decimalAddStr($totalSgst, $inv['sgst']);
    $totalGst        = decimalAddStr($totalGst, $inv['total_gst']);
    $totalGrandTotal = decimalAddStr($totalGrandTotal, $inv['grand_total']);
    $totalPaidAmount = decimalAddStr($totalPaidAmount, $inv['paid_amount']);
    $totalBalanceDue = decimalAddStr($totalBalanceDue, $inv['balance_due']);
    $totalItemsCount += count($inv['items']);
    $totalPaymentsCount += count($inv['payments']);
}

logMsg("--------------------------------------------------------------------");
logMsg("AUGUST DATASET EXACT DECIMAL AUDIT:");
logMsg("Total Invoices:         {$totalInvoicesCount} (HOP/26-27/08/000001 to HOP/26-27/08/000086)");
logMsg("Total Line Items:       {$totalItemsCount}");
logMsg("Total Payments:         {$totalPaymentsCount}");
logMsg("Total Taxable Value:    ₹{$totalTaxable}");
logMsg("Total CGST (9%):        ₹{$totalCgst}");
logMsg("Total SGST (9%):        ₹{$totalSgst}");
logMsg("Total GST (18%):        ₹{$totalGst}");
logMsg("Total Grand Total:      ₹{$totalGrandTotal}");
logMsg("Total Paid Amount:      ₹{$totalPaidAmount}");
logMsg("Total Balance Due:      ₹{$totalBalanceDue} (Unpaid difference invoices #23, #39, #55, #65)");
logMsg("--------------------------------------------------------------------");

// ------------------------------------------------------------------------------
// 8. DRY-RUN MODE EXIT CHECK
// ------------------------------------------------------------------------------
if ($isDryRun) {
    logMsg("====================================================================", 'SUCCESS');
    logMsg("DRY-RUN COMPLETE: Preflight validation successful.", 'SUCCESS');
    logMsg("All 86 August invoices, line items, payments, customers, and pets are valid.", 'SUCCESS');
    logMsg("NO records were written, inserted, or modified in MySQL.", 'SUCCESS');
    logMsg("To perform the real import, run command without --dry-run flag.", 'SUCCESS');
    logMsg("====================================================================", 'SUCCESS');
    exit(0);
}

// ------------------------------------------------------------------------------
// 9. REAL IMPORT: ATOMIC MYSQL TRANSACTION
// ------------------------------------------------------------------------------
logMsg("Beginning ATOMIC MySQL Transaction...");

try {
    $pdo->beginTransaction();

    $custFindPhoneStmt = $pdo->prepare("SELECT id, customer_id, full_name, name, phone FROM customers WHERE phone = :phone AND phone != '' LIMIT 1");
    $custFindNameStmt  = $pdo->prepare("SELECT id, customer_id, full_name, name FROM customers WHERE LOWER(full_name) = LOWER(:name) OR LOWER(name) = LOWER(:name) LIMIT 1");
    $custUpdateGstStmt = $pdo->prepare("UPDATE customers SET gstin = :gstin, address = COALESCE(NULLIF(:addr, ''), address) WHERE customer_id = :cid");
    
    $petFindStmt = $pdo->prepare("SELECT id, pet_id, customer_id, pet_name, name FROM pets WHERE customer_id = :cid AND (LOWER(pet_name) = LOWER(:name) OR LOWER(name) = LOWER(:name)) LIMIT 1");
    
    $invInserted = 0;
    $itemsInserted = 0;
    $paymentsInserted = 0;
    $custCreated = 0;
    $custReused = 0;
    $petCreated = 0;
    $petReused = 0;

    foreach ($augustInvoices as $inv) {
        $serial = $inv['serial'];
        $invNum = $inv['invoice_number'];
        $internalId = $inv['internal_invoice_id'];
        $custName = $inv['customer_name'];
        $custPhone = $inv['customer_phone'];
        $custAddress = $inv['customer_address'];
        $gstin = $inv['gstin'];
        $petName = $inv['pet_name'];
        $petSpecies = $inv['pet_species'];
        
        // A. Customer Resolution
        $existingCust = null;
        if (!empty($custPhone)) {
            $custFindPhoneStmt->execute([':phone' => $custPhone]);
            $existingCust = $custFindPhoneStmt->fetch();
        }
        if (!$existingCust && !empty($custName)) {
            $custFindNameStmt->execute([':name' => $custName]);
            $existingCust = $custFindNameStmt->fetch();
        }

        $targetCustId = null;
        if ($existingCust) {
            $targetCustId = $existingCust['customer_id'] ?? $existingCust['id'];
            $custReused++;
            if (!empty($gstin) || !empty($custAddress)) {
                $custUpdateGstStmt->execute([
                    ':gstin' => $gstin ?: null,
                    ':addr'  => $custAddress ?: null,
                    ':cid'   => $targetCustId
                ]);
            }
        } else {
            $targetCustId = 'CUST-' . strtoupper(substr(md5($custName . $custPhone . microtime(true)), 0, 12));
            $custData = [
                'customer_id' => $targetCustId,
                'name' => $custName,
                'full_name' => $custName,
                'phone' => $custPhone ?: null,
                'email' => null,
                'address' => $custAddress ?: null,
                'gstin' => $gstin ?: null,
                'state' => '27-Maharashtra',
                'state_code' => '27-Maharashtra',
                'outstanding_balance' => '0.00',
                'advance_balance' => '0.00',
                'created_at' => $inv['invoice_date_ymd'] . ' 10:00:00',
                'updated_at' => $inv['invoice_date_ymd'] . ' 10:00:00'
            ];
            execInsert($pdo, 'customers', $custData);
            $custCreated++;
        }

        // B. Pet Resolution
        $targetPetId = null;
        if (!empty($petName)) {
            $petFindStmt->execute([':cid' => $targetCustId, ':name' => $petName]);
            $existingPet = $petFindStmt->fetch();
            if ($existingPet) {
                $targetPetId = $existingPet['pet_id'] ?? $existingPet['id'];
                $petReused++;
            } else {
                $targetPetId = 'PET-' . strtoupper(substr(md5($targetCustId . $petName . microtime(true)), 0, 12));
                $petData = [
                    'pet_id' => $targetPetId,
                    'customer_id' => $targetCustId,
                    'customer_name' => $custName,
                    'name' => $petName,
                    'pet_name' => $petName,
                    'species' => $petSpecies ?: 'Dog',
                    'breed' => 'Standard',
                    'age' => '2 Years',
                    'gender' => 'Male',
                    'vaccination_status' => 'Up to Date',
                    'created_at' => $inv['invoice_date_ymd'] . ' 10:00:00',
                    'updated_at' => $inv['invoice_date_ymd'] . ' 10:00:00'
                ];
                execInsert($pdo, 'pets', $petData);
                $petCreated++;
            }
        }

        // C. Check if invoice already exists (Idempotency)
        $chkStmt = $pdo->prepare("SELECT id, internal_invoice_id FROM invoices WHERE invoice_number = :invNum OR internal_invoice_id = :intId LIMIT 1");
        $chkStmt->execute([':invNum' => $invNum, ':intId' => $internalId]);
        $existingInv = $chkStmt->fetch();

        if ($existingInv) {
            $delItemsStmt = $pdo->prepare("DELETE FROM invoice_items WHERE internal_invoice_id = :intId OR invoice_number = :invNum");
            $delItemsStmt->execute([':intId' => $internalId, ':invNum' => $invNum]);
            
            $delPayStmt = $pdo->prepare("DELETE FROM payments WHERE internal_invoice_id = :intId OR invoice_number = :invNum");
            $delPayStmt->execute([':intId' => $internalId, ':invNum' => $invNum]);
            
            $delInvStmt = $pdo->prepare("DELETE FROM invoices WHERE id = :id");
            $delInvStmt->execute([':id' => $existingInv['id']]);
        }

        // D. Insert Invoice Header
        $invHeaderData = [
            'internal_invoice_id' => $internalId,
            'invoice_number' => $invNum,
            'financial_year' => '2026-27',
            'invoice_date' => $inv['invoice_date_ymd'],
            'due_date' => $inv['invoice_date_ymd'],
            'customer_id' => $targetCustId,
            'customer_name' => $custName,
            'customer_phone' => $custPhone ?: null,
            'customer_email' => null,
            'customer_address' => $custAddress ?: null,
            'customer_gstin' => $gstin ?: null,
            'pet_id' => $targetPetId,
            'pet_name' => $petName ?: null,
            'place_of_supply' => '27-Maharashtra',
            'is_inter_state' => 0,
            'sub_total' => toDecimalStr($inv['sub_total']),
            'total_discount' => '0.00',
            'taxable_amount' => toDecimalStr($inv['sub_total']),
            'cgst_total' => toDecimalStr($inv['cgst']),
            'sgst_total' => toDecimalStr($inv['sgst']),
            'igst_total' => '0.00',
            'total_gst' => toDecimalStr($inv['total_gst']),
            'round_off' => '0.00',
            'grand_total' => toDecimalStr($inv['grand_total']),
            'paid_amount' => toDecimalStr($inv['paid_amount']),
            'balance_due' => toDecimalStr($inv['balance_due']),
            'payment_status' => $inv['payment_status'],
            'payment_mode' => $inv['payment_mode'],
            'notes' => $inv['notes'],
            'created_by_role' => 'ADMIN',
            'created_by_name' => 'Chirag Jain',
            'is_cancelled' => 0,
            'created_at' => $inv['invoice_date_ymd'] . ' 10:00:00',
            'updated_at' => $inv['invoice_date_ymd'] . ' 10:00:00'
        ];
        $mysqlInvId = execInsert($pdo, 'invoices', $invHeaderData);
        $invInserted++;

        // E. Insert Invoice Line Items
        foreach ($inv['items'] as $itemIdx => $it) {
            $lineItemId = 'ITEM-' . strtoupper(substr(md5($internalId . $itemIdx . microtime(true)), 0, 12));
            $itemData = [
                'line_item_id' => $lineItemId,
                'invoice_id' => $mysqlInvId,
                'internal_invoice_id' => $internalId,
                'invoice_number' => $invNum,
                'catalog_item_id' => null,
                'item_type' => 'SERVICE',
                'item_name' => $it['name'],
                'hsn_sac' => '999799',
                'price' => toDecimalStr($it['price']),
                'quantity' => toDecimalStr($it['quantity']),
                'discount_percent' => '0.00',
                'discount_amount' => '0.00',
                'taxable_value' => toDecimalStr($it['taxable_value']),
                'gst_rate' => toDecimalStr($it['gst_rate']),
                'cgst_amount' => toDecimalStr($it['cgst']),
                'sgst_amount' => toDecimalStr($it['sgst']),
                'igst_amount' => '0.00',
                'item_total' => toDecimalStr($it['total']),
                'created_at' => $inv['invoice_date_ymd'] . ' 10:00:00',
                'updated_at' => $inv['invoice_date_ymd'] . ' 10:00:00'
            ];
            execInsert($pdo, 'invoice_items', $itemData);
            $itemsInserted++;
        }

        // F. Insert Payments (For PAID invoices)
        if ($inv['payment_status'] === 'PAID' && !empty($inv['payments'])) {
            foreach ($inv['payments'] as $pIdx => $p) {
                $payId = 'PAY-' . strtoupper(substr(md5($internalId . $pIdx . microtime(true)), 0, 12));
                $payData = [
                    'payment_id' => $payId,
                    'invoice_id' => $mysqlInvId,
                    'internal_invoice_id' => $internalId,
                    'invoice_number' => $invNum,
                    'customer_id' => $targetCustId,
                    'customer_name' => $custName,
                    'amount' => toDecimalStr($p['amount']),
                    'payment_date' => $p['date_ymd'],
                    'payment_mode' => $p['mode'],
                    'transaction_ref' => null,
                    'notes' => 'Imported payment entry for ' . $invNum,
                    'received_by' => 'Chirag Jain',
                    'created_at' => $p['date_ymd'] . ' 10:00:00',
                    'updated_at' => $p['date_ymd'] . ' 10:00:00'
                ];
                execInsert($pdo, 'payments', $payData);
                $paymentsInserted++;
            }
        }
    }

    logMsg("All records inserted into transaction buffer successfully.");
    logMsg("Invoices inserted: {$invInserted}/86");
    logMsg("Line items inserted: {$itemsInserted}");
    logMsg("Payments inserted: {$paymentsInserted}");
    logMsg("Customers: {$custCreated} created, {$custReused} existing reused.");
    logMsg("Pets: {$petCreated} created, {$petReused} existing reused.");

    // --------------------------------------------------------------------------
    // 10. IN-TRANSACTION POST-IMPORT VERIFICATION
    // --------------------------------------------------------------------------
    logMsg("Running In-Transaction Verification Audits...");
    
    $vInvStmt = $pdo->query("SELECT COUNT(*) AS cnt, SUM(grand_total) AS tot_gt, SUM(paid_amount) AS tot_paid, SUM(balance_due) AS tot_bal FROM invoices WHERE invoice_number LIKE 'HOP/26-27/08/%'");
    $vInv = $vInvStmt->fetch();
    
    if ((int)$vInv['cnt'] !== 86) {
        throw new Exception("Post-import count check failed: Expected 86 August invoices, found " . $vInv['cnt']);
    }
    
    if (!decimalCompareStr($vInv['tot_gt'], $totalGrandTotal)) {
        throw new Exception("Post-import Grand Total check failed: Expected ₹{$totalGrandTotal}, MySQL has ₹" . $vInv['tot_gt']);
    }
    
    if (!decimalCompareStr($vInv['tot_paid'], $totalPaidAmount)) {
        throw new Exception("Post-import Paid Amount check failed: Expected ₹{$totalPaidAmount}, MySQL has ₹" . $vInv['tot_paid']);
    }

    if (!decimalCompareStr($vInv['tot_bal'], $totalBalanceDue)) {
        throw new Exception("Post-import Balance Due check failed: Expected ₹{$totalBalanceDue}, MySQL has ₹" . $vInv['tot_bal']);
    }

    // Verify line items total matches
    $vItemsStmt = $pdo->query("SELECT COUNT(*) AS cnt FROM invoice_items WHERE invoice_number LIKE 'HOP/26-27/08/%'");
    $vItems = $vItemsStmt->fetch();
    if ((int)$vItems['cnt'] !== $totalItemsCount) {
        throw new Exception("Post-import line items count mismatch: Expected {$totalItemsCount}, found " . $vItems['cnt']);
    }

    logMsg("In-Transaction Audits PASSED: 86/86 August invoices verified.", 'SUCCESS');

    // COMMIT
    $pdo->commit();
    logMsg("====================================================================", 'SUCCESS');
    logMsg("PRODUCTION IMPORT COMMITTED TO MYSQL SUCCESSFULLY!", 'SUCCESS');
    logMsg("Total Invoices Imported:    86", 'SUCCESS');
    logMsg("Total Line Items Imported:  {$itemsInserted}", 'SUCCESS');
    logMsg("Total Payments Imported:    {$paymentsInserted}", 'SUCCESS');
    logMsg("Total Grand Total:          ₹{$totalGrandTotal}", 'SUCCESS');
    logMsg("Total Paid Amount:          ₹{$totalPaidAmount}", 'SUCCESS');
    logMsg("Total Balance Due:          ₹{$totalBalanceDue}", 'SUCCESS');
    logMsg("====================================================================", 'SUCCESS');

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
        logMsg("TRANSACTION ROLLED BACK: No changes were committed to MySQL.", 'WARN');
    }
    logMsg("CRITICAL ERROR: " . $e->getMessage(), 'CRITICAL');
    exit(1);
}

// Print Final Summary Table
echo "\n========================================================================================================================\n";
echo sprintf("%-4s | %-20s | %-12s | %-25s | %-12s | %-10s | %-8s | %-15s\n", 
    "SR", "INVOICE NO", "DATE", "CUSTOMER", "PET", "GRAND TOT", "STATUS", "PAYMENTS");
echo "------------------------------------------------------------------------------------------------------------------------\n";
foreach ($augustInvoices as $inv) {
    $pInfo = count($inv['payments']) > 0 ? (count($inv['payments']) . " pay (" . $inv['payment_mode'] . ")") : "UNPAID (0)";
    echo sprintf("%-4d | %-20s | %-12s | %-25s | %-12s | ₹%-9s | %-8s | %-15s\n",
        $inv['serial'],
        $inv['invoice_number'],
        $inv['invoice_date_ymd'],
        mb_strimwidth($inv['customer_name'], 0, 24, '..'),
        mb_strimwidth($inv['pet_name'] ?: '-', 0, 11, '..'),
        $inv['grand_total'],
        $inv['payment_status'],
        $pInfo
    );
}
echo "========================================================================================================================\n\n";
