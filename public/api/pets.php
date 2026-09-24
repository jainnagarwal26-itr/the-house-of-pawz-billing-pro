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
        $stmt = $pdo->query("SELECT * FROM pets ORDER BY name ASC");
        $pets = $stmt->fetchAll();
        sendJsonResponse([
            'success' => true,
            'count' => count($pets),
            'data' => $pets
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'POST') {
    $input = getJsonInput();
    $p = isset($input['pet']) ? $input['pet'] : $input;

    $petId = isset($p['pet_id']) ? $p['pet_id'] : (isset($p['id']) ? $p['id'] : null);
    $name = isset($p['name']) ? trim($p['name']) : '';
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
        $stmt = $pdo->prepare("
            INSERT INTO pets (
                id, pet_id, customer_id, name, species, breed, age, gender, weight, microchip_number, notes, created_at, updated_at
            ) VALUES (
                :id, :pet_id, :customer_id, :name, :species, :breed, :age, :gender, :weight, :microchip_number, :notes, NOW(), NOW()
            ) ON DUPLICATE KEY UPDATE
                customer_id = VALUES(customer_id),
                name = VALUES(name),
                species = VALUES(species),
                breed = VALUES(breed),
                age = VALUES(age),
                gender = VALUES(gender),
                weight = VALUES(weight),
                microchip_number = VALUES(microchip_number),
                notes = VALUES(notes),
                updated_at = NOW()
        ");

        $stmt->execute([
            ':id' => isset($p['id']) && strlen($p['id']) > 30 ? $p['id'] : generateUuidV4(),
            ':pet_id' => $petId,
            ':customer_id' => $customerId,
            ':name' => $name,
            ':species' => isset($p['species']) ? $p['species'] : 'Dog',
            ':breed' => isset($p['breed']) ? $p['breed'] : null,
            ':age' => isset($p['age']) ? $p['age'] : null,
            ':gender' => isset($p['gender']) ? $p['gender'] : 'Unknown',
            ':weight' => isset($p['weight']) ? (float)$p['weight'] : null,
            ':microchip_number' => isset($p['microchip_number']) ? $p['microchip_number'] : null,
            ':notes' => isset($p['notes']) ? $p['notes'] : null
        ]);

        sendJsonResponse([
            'success' => true,
            'message' => 'Pet saved to MySQL',
            'data' => [
                'id' => $petId,
                'pet_id' => $petId,
                'name' => $name
            ]
        ], 201);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}
