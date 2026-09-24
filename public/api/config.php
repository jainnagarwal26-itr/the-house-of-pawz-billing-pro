<?php
// ============================================================
// public/api/config.php
// The House of Pawz – MySQL Database Connection & Helpers
// Database: jainnaga_the_house_of_pawz
// ============================================================

// Allow Cross-Origin Requests & Set Content Type
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * Loads .env file if present in current or parent directories
 */
function loadEnv($dir = null) {
    if (!$dir) {
        $dir = dirname(__DIR__, 2); // default to root directory
    }
    $paths = [
        $dir . '/.env',
        dirname(__DIR__) . '/.env',
        __DIR__ . '/.env'
    ];
    foreach ($paths as $file) {
        if (file_exists($file) && is_readable($file)) {
            $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($key, $val) = explode('=', $line, 2);
                    $key = trim($key);
                    $val = trim($val, " \t\n\r\0\x0B\"'");
                    if (!isset($_ENV[$key])) {
                        $_ENV[$key] = $val;
                        putenv("$key=$val");
                    }
                }
            }
            break;
        }
    }
}

loadEnv();

/**
 * Returns a PDO connection to MySQL database
 */
function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $host = getenv('DB_HOST') ?: (getenv('MYSQL_HOST') ?: 'localhost');
    $db   = getenv('DB_NAME') ?: (getenv('MYSQL_DATABASE') ?: 'jainnaga_the_house_of_pawz');
    $user = getenv('DB_USER') ?: (getenv('MYSQL_USER') ?: 'jainnaga_the_house_of_pawz');
    $pass = getenv('DB_PASS') ?: (getenv('MYSQL_PASSWORD') ?: '');
    $charset = 'utf8mb4';

    $dsn = "mysql:host={$host};dbname={$db};charset={$charset}";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, $user, $pass, $options);
        return $pdo;
    } catch (PDOException $e) {
        sendJsonResponse([
            'success' => false,
            'error' => 'Database connection failed: ' . $e->getMessage()
        ], 500);
        exit();
    }
}

/**
 * Sends a standard JSON response
 */
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

/**
 * Parses and returns the JSON input body from POST/PUT request
 */
function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Generates a unique UUID v4 string
 */
function generateUuidV4() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
