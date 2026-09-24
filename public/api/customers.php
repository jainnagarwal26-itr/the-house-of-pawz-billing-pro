<?php
// ============================================================
// public/api/customers.php
// Full Customers CRUD for MySQL Database (jainnaga_the_house_of_pawz)
// ============================================================

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDbConnection();

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM customers ORDER BY name ASC");
        $customers = $stmt->fetchAll();
        sendJsonResponse([
            'success' => true,
            'count' => count($customers),
            'data' => $customers
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'POST') {
    $input = getJsonInput();
    $c = isset($input['customer']) ? $input['customer'] : $input;

    $custId = isset($c['customer_id']) ? $c['customer_id'] : (isset($c['id']) ? $c['id'] : null);
    $name = isset($c['name']) ? trim($c['name']) : '';

    if (empty($name)) {
        sendJsonResponse(['success' => false, 'error' => 'Customer name is required'], 400);
    }

    if (empty($custId)) {
        $maxStmt = $pdo->query("SELECT MAX(CAST(SUBSTRING(customer_id, 6) AS UNSIGNED)) FROM customers WHERE customer_id LIKE 'CUST-%'");
        $maxNum = (int)$maxStmt->fetchColumn();
        $custId = 'CUST-' . str_pad($maxNum + 1, 4, '0', STR_PAD_LEFT);
    }

    try {
        $chk = $pdo->prepare("SELECT id, customer_id FROM customers WHERE customer_id = :cid OR id = :cid2 LIMIT 1");
        $chk->execute([':cid' => $custId, ':cid2' => $custId]);
        $existing = $chk->fetch();

        $custRecord = [
            'name' => $name,
            'phone' => isset($c['phone']) ? $c['phone'] : '',
            'email' => isset($c['email']) ? $c['email'] : null,
            'address' => isset($c['address']) ? $c['address'] : null,
            'gstin' => isset($c['gstin']) ? $c['gstin'] : null,
            'state' => isset($c['state']) ? $c['state'] : 'Maharashtra',
            'pincode' => isset($c['pincode']) ? $c['pincode'] : null,
            'notes' => isset($c['notes']) ? $c['notes'] : null,
            'updated_at' => date('Y-m-d H:i:s')
        ];

        if ($existing) {
            dynamicUpdate($pdo, 'customers', $custRecord, ['customer_id' => $existing['customer_id']]);
        } else {
            $custRecord['id'] = isset($c['id']) && strlen($c['id']) > 30 ? $c['id'] : generateUuidV4();
            $custRecord['customer_id'] = $custId;
            $custRecord['created_at'] = date('Y-m-d H:i:s');
            dynamicInsert($pdo, 'customers', $custRecord);
        }

        sendJsonResponse([
            'success' => true,
            'message' => 'Customer saved to MySQL',
            'data' => [
                'id' => $custId,
                'customer_id' => $custId,
                'name' => $name
            ]
        ], 201);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}
