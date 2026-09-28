<?php
// ============================================================
// public/api/pets.php
// Full Pets CRUD for MySQL Database (jainnaga_the_house_of_pawz)
// ============================================================

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDbConnection();

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM pets ORDER BY pet_name ASC");
        $pets = $stmt->fetchAll();
        
        $mapped = array_map(function($p) {
            return [
                'id' => $p['pet_id'],
                'pet_id' => $p['pet_id'],
                'customer_id' => $p['customer_id'],
                'customerId' => $p['customer_id'],
                'customer_name' => isset($p['customer_name']) ? $p['customer_name'] : '',
                'customerName' => isset($p['customer_name']) ? $p['customer_name'] : '',
                'name' => $p['pet_name'],
                'pet_name' => $p['pet_name'],
                'species' => isset($p['species']) ? $p['species'] : 'Dog',
                'breed' => isset($p['breed']) ? $p['breed'] : '',
                'age' => isset($p['age']) ? $p['age'] : '',
                'gender' => isset($p['gender']) ? $p['gender'] : 'Unknown',
                'vaccination_status' => isset($p['vaccination_status']) ? $p['vaccination_status'] : 'Up to Date',
                'vaccinationStatus' => isset($p['vaccination_status']) ? $p['vaccination_status'] : 'Up to Date',
                'medical_notes' => isset($p['medical_notes']) ? $p['medical_notes'] : '',
                'feeding_preferences' => isset($p['feeding_preferences']) ? $p['feeding_preferences'] : '',
                'is_boarding_now' => !empty($p['is_boarding_now']),
                'isBoardingNow' => !empty($p['is_boarding_now']),
                'room_no' => isset($p['room_no']) ? $p['room_no'] : '',
                'roomNo' => isset($p['room_no']) ? $p['room_no'] : '',
                'created_at' => $p['created_at']
            ];
        }, $pets);

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
    $p = isset($input['pet']) ? $input['pet'] : $input;

    $petId = isset($p['pet_id']) ? $p['pet_id'] : (isset($p['id']) ? $p['id'] : null);
    $name = isset($p['pet_name']) ? trim($p['pet_name']) : (isset($p['name']) ? trim($p['name']) : '');
    $customerId = isset($p['customer_id']) ? $p['customer_id'] : (isset($p['customerId']) ? $p['customerId'] : 'CUST-001');

    if (empty($name)) {
        sendJsonResponse(['success' => false, 'error' => 'Pet name is required'], 400);
    }

    if (empty($petId)) {
        $maxStmt = $pdo->query("SELECT MAX(CAST(SUBSTRING(pet_id, 5) AS UNSIGNED)) FROM pets WHERE pet_id LIKE 'PET-%'");
        $maxNum = (int)$maxStmt->fetchColumn();
        $petId = 'PET-' . str_pad($maxNum + 1, 4, '0', STR_PAD_LEFT);
    }

    try {
        $chk = $pdo->prepare("SELECT id, pet_id FROM pets WHERE pet_id = :pid OR id = :pid2 LIMIT 1");
        $chk->execute([':pid' => $petId, ':pid2' => $petId]);
        $existing = $chk->fetch();

        $petRecord = [
            'customer_id' => $customerId,
            'customer_name' => isset($p['customer_name']) ? $p['customer_name'] : (isset($p['customerName']) ? $p['customerName'] : null),
            'pet_name' => $name,
            'species' => isset($p['species']) ? $p['species'] : 'Dog',
            'breed' => isset($p['breed']) ? $p['breed'] : null,
            'age' => isset($p['age']) ? $p['age'] : null,
            'gender' => isset($p['gender']) ? $p['gender'] : 'Unknown',
            'vaccination_status' => isset($p['vaccination_status']) ? $p['vaccination_status'] : (isset($p['vaccinationStatus']) ? $p['vaccinationStatus'] : 'Up to Date'),
            'medical_notes' => isset($p['medical_notes']) ? $p['medical_notes'] : (isset($p['medicalNotes']) ? $p['medicalNotes'] : null),
            'feeding_preferences' => isset($p['feeding_preferences']) ? $p['feeding_preferences'] : (isset($p['feedingPreferences']) ? $p['feedingPreferences'] : null),
            'updated_at' => date('Y-m-d H:i:s')
        ];

        if ($existing) {
            dynamicUpdate($pdo, 'pets', $petRecord, ['pet_id' => $existing['pet_id']]);
        } else {
            $petRecord['id'] = isset($p['id']) && strlen($p['id']) > 30 ? $p['id'] : generateUuidV4();
            $petRecord['pet_id'] = $petId;
            $petRecord['created_at'] = date('Y-m-d H:i:s');
            dynamicInsert($pdo, 'pets', $petRecord);
        }

        sendJsonResponse([
            'success' => true,
            'message' => 'Pet saved to MySQL',
            'data' => [
                'id' => $petId,
                'pet_id' => $petId,
                'name' => $name,
                'pet_name' => $name
            ]
        ], 200);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}
