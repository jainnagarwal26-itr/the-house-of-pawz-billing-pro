<?php
require_once __DIR__ . '/config.php';

try {
    $pdo = getDbConnection();
    $stmt = $pdo->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $invCount = 0;
    if (in_array('invoices', $tables)) {
        $countStmt = $pdo->query("SELECT COUNT(*) FROM invoices");
        $invCount = (int)$countStmt->fetchColumn();
    }

    sendJsonResponse([
        'success' => true,
        'status' => 'connected',
        'database' => getenv('DB_NAME') ?: 'jainnaga_the_house_of_pawz',
        'tables_count' => count($tables),
        'tables' => $tables,
        'invoices_count' => $invCount,
        'server_time' => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'error' => $e->getMessage()
    ], 500);
}
