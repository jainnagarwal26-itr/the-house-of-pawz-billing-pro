<?php
require_once __DIR__ . '/config.php';

$fy = isset($_GET['fy']) ? trim($_GET['fy']) : '2026-27';
$month = isset($_GET['month']) ? trim($_GET['month']) : date('m');

// Format 2-digit FY short format, e.g. '26-27'
$fyShort = $fy;
if (preg_match('/^20(\d{2})-20(\d{2})$/', $fy, $m)) {
    $fyShort = $m[1] . '-' . $m[2];
} elseif (preg_match('/^20(\d{2})-(\d{2})$/', $fy, $m)) {
    $fyShort = $m[1] . '-' . $m[2];
}

$monthStr = str_pad($month, 2, '0', STR_PAD_LEFT);
$pattern = "HOP/{$fyShort}/{$monthStr}/%";

try {
    $pdo = getDbConnection();
    $stmt = $pdo->prepare("
        SELECT invoice_number 
        FROM invoices 
        WHERE invoice_number LIKE :pattern 
        ORDER BY id DESC
    ");
    $stmt->execute([':pattern' => $pattern]);
    $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $maxSerial = 0;
    foreach ($rows as $invNum) {
        $parts = explode('/', $invNum);
        $last = end($parts);
        if (is_numeric($last)) {
            $num = (int)$last;
            if ($num > $maxSerial) {
                $maxSerial = $num;
            }
        }
    }

    $nextSerial = $maxSerial + 1;
    $nextInvoiceNumber = sprintf("HOP/%s/%s/%06d", $fyShort, $monthStr, $nextSerial);

    sendJsonResponse([
        'success' => true,
        'next_invoice_number' => $nextInvoiceNumber,
        'financial_year' => $fy,
        'month' => $monthStr,
        'serial' => $nextSerial
    ]);
} catch (Exception $e) {
    sendJsonResponse([
        'success' => false,
        'error' => $e->getMessage()
    ], 500);
}
