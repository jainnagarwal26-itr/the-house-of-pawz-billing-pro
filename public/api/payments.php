<?php
// ============================================================
// public/api/payments.php
// Full Payments Ledger CRUD for MySQL Database (jainnaga_the_house_of_pawz)
// ============================================================

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDbConnection();

// ------------------------------------------------------------
// 1. GET: Fetch All Payments or Payments for specific Invoice
// ------------------------------------------------------------
if ($method === 'GET') {
    try {
        $invId = isset($_GET['invoice_id']) ? trim($_GET['invoice_id']) : null;
        if ($invId) {
            $stmt = $pdo->prepare("
                SELECT * FROM payments 
                WHERE internal_invoice_id = :int_id OR invoice_number = :inv_num
                ORDER BY payment_date ASC, created_at ASC
            ");
            $stmt->execute([':int_id' => $invId, ':inv_num' => $invId]);
        } else {
            $stmt = $pdo->query("SELECT * FROM payments ORDER BY payment_date ASC, created_at ASC");
        }

        $payments = $stmt->fetchAll();
        foreach ($payments as &$p) {
            $p['amount'] = (float)$p['amount'];
        }

        sendJsonResponse([
            'success' => true,
            'count' => count($payments),
            'data' => $payments
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// ------------------------------------------------------------
// 2. POST: Record New Payment
// ------------------------------------------------------------
if ($method === 'POST') {
    $input = getJsonInput();
    $paymentData = isset($input['payment']) ? $input['payment'] : $input;

    $internalId = isset($paymentData['internal_invoice_id']) ? $paymentData['internal_invoice_id'] : (isset($paymentData['invoiceId']) ? $paymentData['invoiceId'] : null);
    $amount = (float)(isset($paymentData['amount']) ? $paymentData['amount'] : 0);

    if (!$internalId || $amount <= 0) {
        sendJsonResponse(['success' => false, 'error' => 'internal_invoice_id and positive amount are required'], 400);
    }

    try {
        $pdo->beginTransaction();

        // 1. Find invoice
        $invStmt = $pdo->prepare("SELECT * FROM invoices WHERE internal_invoice_id = :int_id OR id = :int_id2 OR invoice_number = :inv_num LIMIT 1");
        $invStmt->execute([':int_id' => $internalId, ':int_id2' => $internalId, ':inv_num' => $internalId]);
        $invoice = $invStmt->fetch();

        if (!$invoice) {
            $pdo->rollBack();
            sendJsonResponse(['success' => false, 'error' => "Invoice {$internalId} not found in MySQL"], 404);
        }

        $realIntId = $invoice['internal_invoice_id'];
        $invoiceNumber = $invoice['invoice_number'];
        $customerId = $invoice['customer_id'];
        $customerName = $invoice['customer_name'];
        $grandTotal = (float)$invoice['grand_total'];

        // 2. Insert payment row
        $payCountStmt = $pdo->prepare("SELECT COUNT(*) FROM payments WHERE internal_invoice_id = :int_id");
        $payCountStmt->execute([':int_id' => $realIntId]);
        $paySeq = ((int)$payCountStmt->fetchColumn()) + 1;

        $paymentId = isset($paymentData['payment_id']) ? $paymentData['payment_id'] : (isset($paymentData['id']) && strpos($paymentData['id'], 'PAY-') === 0 ? $paymentData['id'] : "PAY-{$realIntId}-{$paySeq}");
        $paymentDate = isset($paymentData['payment_date']) ? $paymentData['payment_date'] : (isset($paymentData['paymentDate']) ? $paymentData['paymentDate'] : date('d/m/Y'));
        $paymentMode = isset($paymentData['payment_mode']) ? $paymentData['payment_mode'] : (isset($paymentData['paymentMode']) ? $paymentData['paymentMode'] : 'UPI');
        $txRef = isset($paymentData['transaction_ref']) ? $paymentData['transaction_ref'] : (isset($paymentData['transactionRef']) ? $paymentData['transactionRef'] : null);
        $notes = isset($paymentData['notes']) ? $paymentData['notes'] : null;
        $receivedBy = isset($paymentData['received_by']) ? $paymentData['received_by'] : (isset($paymentData['receivedBy']) ? $paymentData['receivedBy'] : 'Staff');

        $insStmt = $pdo->prepare("
            INSERT INTO payments (
                id, payment_id, internal_invoice_id, invoice_number, customer_id, customer_name,
                amount, payment_date, payment_mode, transaction_ref, notes, received_by,
                created_at, updated_at
            ) VALUES (
                :id, :payment_id, :internal_invoice_id, :invoice_number, :customer_id, :customer_name,
                :amount, :payment_date, :payment_mode, :transaction_ref, :notes, :received_by,
                NOW(), NOW()
            )
        ");

        $insStmt->execute([
            ':id' => generateUuidV4(),
            ':payment_id' => $paymentId,
            ':internal_invoice_id' => $realIntId,
            ':invoice_number' => $invoiceNumber,
            ':customer_id' => $customerId,
            ':customer_name' => $customerName,
            ':amount' => $amount,
            ':payment_date' => $paymentDate,
            ':payment_mode' => $paymentMode,
            ':transaction_ref' => $txRef,
            ':notes' => $notes,
            ':received_by' => $receivedBy
        ]);

        // 3. Atomically recalculate invoice paid_amount, balance_due, and payment_status
        $sumStmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE internal_invoice_id = :int_id");
        $sumStmt->execute([':int_id' => $realIntId]);
        $newPaidTotal = (float)$sumStmt->fetchColumn();

        $newBalance = max(0.0, round($grandTotal - $newPaidTotal, 2));
        $newStatus = $newPaidTotal >= $grandTotal ? 'PAID' : ($newPaidTotal > 0 ? 'PARTIAL' : 'UNPAID');

        $updStmt = $pdo->prepare("
            UPDATE invoices SET 
                paid_amount = :paid, 
                balance_due = :bal, 
                payment_status = :st,
                payment_mode = :pm,
                updated_at = NOW()
            WHERE internal_invoice_id = :int_id
        ");
        $updStmt->execute([
            ':paid' => $newPaidTotal,
            ':bal' => $newBalance,
            ':st' => $newStatus,
            ':pm' => $paymentMode,
            ':int_id' => $realIntId
        ]);

        $pdo->commit();

        sendJsonResponse([
            'success' => true,
            'message' => 'Payment successfully recorded in MySQL',
            'data' => [
                'payment_id' => $paymentId,
                'internal_invoice_id' => $realIntId,
                'invoice_number' => $invoiceNumber,
                'amount' => $amount,
                'new_total_paid' => $newPaidTotal,
                'new_balance_due' => $newBalance,
                'new_payment_status' => $newStatus
            ]
        ], 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// ------------------------------------------------------------
// 3. PUT: Update Existing Payment
// ------------------------------------------------------------
if ($method === 'PUT') {
    $input = getJsonInput();
    $paymentData = isset($input['payment']) ? $input['payment'] : $input;

    $payIdentifier = isset($paymentData['payment_id']) ? $paymentData['payment_id'] : (isset($paymentData['id']) ? $paymentData['id'] : null);
    if (!$payIdentifier) {
        sendJsonResponse(['success' => false, 'error' => 'payment_id required for update'], 400);
    }

    try {
        $pdo->beginTransaction();

        $chkStmt = $pdo->prepare("SELECT * FROM payments WHERE payment_id = :pid OR id = :pid2 LIMIT 1");
        $chkStmt->execute([':pid' => $payIdentifier, ':pid2' => $payIdentifier]);
        $existing = $chkStmt->fetch();

        if (!$existing) {
            $pdo->rollBack();
            sendJsonResponse(['success' => false, 'error' => "Payment {$payIdentifier} not found"], 404);
        }

        $realIntId = $existing['internal_invoice_id'];
        $amount = (float)(isset($paymentData['amount']) ? $paymentData['amount'] : $existing['amount']);
        $payDate = isset($paymentData['payment_date']) ? $paymentData['payment_date'] : (isset($paymentData['paymentDate']) ? $paymentData['paymentDate'] : $existing['payment_date']);
        $payMode = isset($paymentData['payment_mode']) ? $paymentData['payment_mode'] : (isset($paymentData['paymentMode']) ? $paymentData['paymentMode'] : $existing['payment_mode']);
        $txRef = isset($paymentData['transaction_ref']) ? $paymentData['transaction_ref'] : (isset($paymentData['transactionRef']) ? $paymentData['transactionRef'] : $existing['transaction_ref']);
        $notes = isset($paymentData['notes']) ? $paymentData['notes'] : $existing['notes'];

        $updPay = $pdo->prepare("
            UPDATE payments SET 
                amount = :amt, 
                payment_date = :pdate, 
                payment_mode = :pmode, 
                transaction_ref = :txref, 
                notes = :notes,
                updated_at = NOW()
            WHERE payment_id = :pid OR id = :pid2
        ");
        $updPay->execute([
            ':amt' => $amount,
            ':pdate' => $payDate,
            ':pmode' => $payMode,
            ':txref' => $txRef,
            ':notes' => $notes,
            ':pid' => $payIdentifier,
            ':pid2' => $payIdentifier
        ]);

        // Recalculate invoice totals
        $invStmt = $pdo->prepare("SELECT grand_total FROM invoices WHERE internal_invoice_id = :int_id");
        $invStmt->execute([':int_id' => $realIntId]);
        $grandTotal = (float)$invStmt->fetchColumn();

        $sumStmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE internal_invoice_id = :int_id");
        $sumStmt->execute([':int_id' => $realIntId]);
        $newPaidTotal = (float)$sumStmt->fetchColumn();

        $newBalance = max(0.0, round($grandTotal - $newPaidTotal, 2));
        $newStatus = $newPaidTotal >= $grandTotal ? 'PAID' : ($newPaidTotal > 0 ? 'PARTIAL' : 'UNPAID');

        $updInv = $pdo->prepare("
            UPDATE invoices SET 
                paid_amount = :paid, 
                balance_due = :bal, 
                payment_status = :st,
                updated_at = NOW()
            WHERE internal_invoice_id = :int_id
        ");
        $updInv->execute([
            ':paid' => $newPaidTotal,
            ':bal' => $newBalance,
            ':st' => $newStatus,
            ':int_id' => $realIntId
        ]);

        $pdo->commit();

        sendJsonResponse([
            'success' => true,
            'message' => 'Payment successfully updated in MySQL'
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// ------------------------------------------------------------
// 4. DELETE: Delete Payment Record
// ------------------------------------------------------------
if ($method === 'DELETE') {
    $input = getJsonInput();
    $payIdentifier = isset($_GET['id']) ? trim($_GET['id']) : (isset($input['payment_id']) ? $input['payment_id'] : (isset($input['id']) ? $input['id'] : null));

    if (!$payIdentifier) {
        sendJsonResponse(['success' => false, 'error' => 'payment_id required for delete'], 400);
    }

    try {
        $pdo->beginTransaction();

        $chkStmt = $pdo->prepare("SELECT * FROM payments WHERE payment_id = :pid OR id = :pid2 LIMIT 1");
        $chkStmt->execute([':pid' => $payIdentifier, ':pid2' => $payIdentifier]);
        $existing = $chkStmt->fetch();

        if (!$existing) {
            $pdo->rollBack();
            sendJsonResponse(['success' => false, 'error' => "Payment {$payIdentifier} not found"], 404);
        }

        $realIntId = $existing['internal_invoice_id'];

        $delStmt = $pdo->prepare("DELETE FROM payments WHERE payment_id = :pid OR id = :pid2");
        $delStmt->execute([':pid' => $payIdentifier, ':pid2' => $payIdentifier]);

        // Recalculate invoice totals
        $invStmt = $pdo->prepare("SELECT grand_total FROM invoices WHERE internal_invoice_id = :int_id");
        $invStmt->execute([':int_id' => $realIntId]);
        $grandTotal = (float)$invStmt->fetchColumn();

        $sumStmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE internal_invoice_id = :int_id");
        $sumStmt->execute([':int_id' => $realIntId]);
        $newPaidTotal = (float)$sumStmt->fetchColumn();

        $newBalance = max(0.0, round($grandTotal - $newPaidTotal, 2));
        $newStatus = $newPaidTotal >= $grandTotal ? 'PAID' : ($newPaidTotal > 0 ? 'PARTIAL' : 'UNPAID');

        $updInv = $pdo->prepare("
            UPDATE invoices SET 
                paid_amount = :paid, 
                balance_due = :bal, 
                payment_status = :st,
                updated_at = NOW()
            WHERE internal_invoice_id = :int_id
        ");
        $updInv->execute([
            ':paid' => $newPaidTotal,
            ':bal' => $newBalance,
            ':st' => $newStatus,
            ':int_id' => $realIntId
        ]);

        $pdo->commit();

        sendJsonResponse([
            'success' => true,
            'message' => 'Payment successfully deleted from MySQL'
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}
