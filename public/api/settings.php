<?php
// ============================================================
// public/api/settings.php
// Company Settings for MySQL Database (jainnaga_the_house_of_pawz)
// ============================================================

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDbConnection();

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM company_settings LIMIT 1");
        $settings = $stmt->fetch();
        if (!$settings) {
            $settings = [
                'company_name' => 'The House of Pawz',
                'gstin' => '27AAACH7409R1ZZ',
                'phone' => '+91 98201 52539',
                'email' => 'contact@thehouseofpawz.com',
                'address' => 'Shop No 4, Ground Floor, Mumbai, Maharashtra 400050',
                'state' => '27-Maharashtra',
                'financial_year' => '2026-27'
            ];
        }
        sendJsonResponse([
            'success' => true,
            'data' => $settings
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'POST') {
    $input = getJsonInput();
    $s = isset($input['settings']) ? $input['settings'] : $input;
    try {
        $stmt = $pdo->prepare("
            INSERT INTO company_settings (
                id, company_name, gstin, phone, email, address, state, financial_year, updated_at
            ) VALUES (
                1, :name, :gstin, :phone, :email, :address, :state, :fy, NOW()
            ) ON DUPLICATE KEY UPDATE
                company_name = VALUES(company_name),
                gstin = VALUES(gstin),
                phone = VALUES(phone),
                email = VALUES(email),
                address = VALUES(address),
                state = VALUES(state),
                financial_year = VALUES(financial_year),
                updated_at = NOW()
        ");
        $stmt->execute([
            ':name' => isset($s['company_name']) ? $s['company_name'] : 'The House of Pawz',
            ':gstin' => isset($s['gstin']) ? $s['gstin'] : '27AAACH7409R1ZZ',
            ':phone' => isset($s['phone']) ? $s['phone'] : '+91 98201 52539',
            ':email' => isset($s['email']) ? $s['email'] : 'contact@thehouseofpawz.com',
            ':address' => isset($s['address']) ? $s['address'] : 'Mumbai, Maharashtra',
            ':state' => isset($s['state']) ? $s['state'] : '27-Maharashtra',
            ':fy' => isset($s['financial_year']) ? $s['financial_year'] : '2026-27'
        ]);
        sendJsonResponse(['success' => true, 'message' => 'Settings saved to MySQL']);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}
