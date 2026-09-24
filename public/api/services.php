<?php
// ============================================================
// public/api/services.php
// Service Catalog CRUD for MySQL Database (jainnaga_the_house_of_pawz)
// ============================================================

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDbConnection();

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM service_catalog ORDER BY service_name ASC");
        $services = $stmt->fetchAll();
        foreach ($services as &$s) {
            $s['default_rate'] = (float)$s['default_rate'];
            $s['gst_rate'] = (float)$s['gst_rate'];
            $s['is_active'] = (bool)$s['is_active'];
        }
        sendJsonResponse([
            'success' => true,
            'count' => count($services),
            'data' => $services
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}
