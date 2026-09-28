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
        $stmt = $pdo->query("SELECT * FROM customers ORDER BY full_name ASC");
        $customers = $stmt->fetchAll();
        
        $mapped = array_map(function($c) {
            return [
                'id' => $c['customer_id'],
                'customer_id' => $c['customer_id'],
                'name' => $c['full_name'],
                'full_name' => $c['full_name'],
                'phone' => $c['phone'],
                'email' => $c['email'] ? $c['email'] : '',
                'address' => $c['address'] ? $c['address'] : '',
                'gstin' => $c['gstin'] ? $c['gstin'] : '',
                'state_code' => isset($c['state_code']) ? $c['state_code'] : '27-Maharashtra',
                'stateCode' => isset($c['state_code']) ? $c['state_code'] : '27-Maharashtra',
                'emergency_contact' => isset($c['emergency_contact']) ? $c['emergency_contact'] : '',
                'emergencyContact' => isset($c['emergency_contact']) ? $c['emergency_contact'] : '',
                'outstanding_balance' => (float)(isset($c['outstanding_balance']) ? $c['outstanding_balance'] : 0),
                'advance_balance' => (float)(isset($c['advance_balance']) ? $c['advance_balance'] : 0),
                'created_at' => $c['created_at']
            ];
        }, $customers);

        sendJsonResponse([
            'success' => true,
            'count' => count($mapped),
            'data' => $mapped
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'POST' || $method === 'PUT') {
    $input = getJsonInput();
    $c = isset($input['customer']) ? $input['customer'] : $input;

    $custId = isset($c['customer_id']) ? $c['customer_id'] : (isset($c['id']) ? $c['id'] : null);
    $name = isset($c['full_name']) ? trim($c['full_name']) : (isset($c['name']) ? trim($c['name']) : '');

    if (empty($name)) {
        sendJsonResponse(['success' => false, 'error' => 'Customer name is required'], 400);
    }

    if (empty($custId)) {
        $maxStmt = $pdo->query("SELECT MAX(CAST(SUBSTRING(customer_id, 6) AS UNSIGNED)) FROM customers WHERE customer_id LIKE 'CUST-%'");
        $maxNum = (int)$maxStmt->fetchColumn();
        $custId = 'CUST-' . str_pad($maxNum + 1, 4, '0', STR_PAD_LEFT);
    }

    try {
        $chk = $pdo->prepare("SELECT id, customer_id, email FROM customers WHERE customer_id = :cid OR id = :cid2 LIMIT 1");
        $chk->execute([':cid' => $custId, ':cid2' => $custId]);
        $existing = $chk->fetch();

        // Email handling: Never auto-generate email.
        // If email is provided as a non-empty string, use it.
        // If updating and email field is not in payload or empty, preserve existing or keep null.
        $emailVal = null;
        if (isset($c['email']) && trim($c['email']) !== '') {
            $emailVal = trim($c['email']);
        } elseif ($existing && !empty($existing['email'])) {
            $emailVal = $existing['email'];
        }

        $custRecord = [
            'full_name' => $name,
            'phone' => isset($c['phone']) ? $c['phone'] : '',
            'email' => $emailVal,
            'address' => isset($c['address']) ? $c['address'] : null,
            'gstin' => isset($c['gstin']) ? $c['gstin'] : null,
            'state_code' => isset($c['state_code']) ? $c['state_code'] : (isset($c['stateCode']) ? $c['stateCode'] : '27-Maharashtra'),
            'emergency_contact' => isset($c['emergency_contact']) ? $c['emergency_contact'] : (isset($c['emergencyContact']) ? $c['emergencyContact'] : null),
            'updated_at' => date('Y-m-d H:i:s')
        ];

        if ($existing) {
            dynamicUpdate($pdo, 'customers', $custRecord, ['customer_id' => $existing['customer_id']]);
        } else {
            $custRecord['id'] = isset($c['id']) && strlen($c['id']) > 30 ? $c['id'] : generateUuidV4();
            $custRecord['customer_id'] = $custId;
            $custRecord['outstanding_balance'] = 0.00;
            $custRecord['advance_balance'] = 0.00;
            $custRecord['created_at'] = date('Y-m-d H:i:s');
            dynamicInsert($pdo, 'customers', $custRecord);
        }

        sendJsonResponse([
            'success' => true,
            'message' => 'Customer saved to MySQL',
            'data' => [
                'id' => $custId,
                'customer_id' => $custId,
                'name' => $name,
                'full_name' => $name,
                'email' => $emailVal
            ]
        ], 200);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}
