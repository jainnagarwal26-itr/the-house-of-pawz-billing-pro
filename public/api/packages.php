<?php
// ============================================================
// public/api/packages.php
// Package Master for MySQL Database (jainnaga_the_house_of_pawz)
// ============================================================

require_once __DIR__ . '/config.php';

$pdo = getDbConnection();

try {
    $stmt = $pdo->query("SELECT * FROM service_package_master ORDER BY package_name ASC");
    $packages = $stmt->fetchAll();
    foreach ($packages as &$p) {
        $p['total_sessions'] = (int)$p['total_sessions'];
        $p['package_price'] = (float)$p['package_price'];
        $p['validity_days'] = (int)$p['validity_days'];
        $p['gst_rate'] = (float)$p['gst_rate'];
        $p['is_active'] = (bool)$p['is_active'];
    }
    sendJsonResponse([
        'success' => true,
        'count' => count($packages),
        'data' => $packages
    ]);
} catch (Exception $e) {
    sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
