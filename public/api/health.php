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

    $schema = [];
    if (isset($_GET['schema'])) {
        $tablesToInspect = ['invoices', 'payments', 'customers', 'pets', 'invoice_items'];
        foreach ($tablesToInspect as $tbl) {
            try {
                $colStmt = $pdo->query("SHOW FULL COLUMNS FROM `{$tbl}`");
                $schema[$tbl] = $colStmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (Exception $e) {
                $schema[$tbl] = ['error' => $e->getMessage()];
            }
        }
    }

    sendJsonResponse([
        'success' => true,
        'status' => 'connected',
        'database' => getenv('DB_NAME') ?: 'jainnaga_the_house_of_pawz',
        'tables_count' => count($tables),
        'tables' => $tables,
        'invoices_count' => $invCount,
        'schema' => !empty($schema) ? $schema : null,
        'server_time' => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'error' => $e->getMessage()
    ], 500);
}
