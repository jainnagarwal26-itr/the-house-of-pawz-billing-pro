<?php
// ============================================================
// public/api/users.php
// Users & Permissions for MySQL Database (jainnaga_the_house_of_pawz)
// ============================================================

require_once __DIR__ . '/config.php';

$pdo = getDbConnection();

try {
    $stmt = $pdo->query("SELECT id, user_id, email, name, role, is_active, created_at FROM users ORDER BY id ASC");
    $users = $stmt->fetchAll();
    foreach ($users as &$u) {
        $u['is_active'] = (bool)$u['is_active'];
    }

    $permStmt = $pdo->query("SELECT * FROM role_permissions");
    $permissions = $permStmt->fetchAll();

    sendJsonResponse([
        'success' => true,
        'count' => count($users),
        'users' => $users,
        'role_permissions' => $permissions
    ]);
} catch (Exception $e) {
    sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
