<?php
// ============================================================
// public/api/invoices.php
// Full Invoices CRUD for MySQL Database (jainnaga_the_house_of_pawz)
// ============================================================

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDbConnection();

// ------------------------------------------------------------
// 1. GET: Fetch All Invoices or Single Invoice
// ------------------------------------------------------------
if ($method === 'GET') {
    try {
        $invId = isset($_GET['id']) ? trim($_GET['id']) : null;

        if ($invId) {
            $stmt = $pdo->prepare("SELECT * FROM invoices WHERE id = :id OR internal_invoice_id = :int_id OR invoice_number = :inv_num");
            $stmt->execute([':id' => $invId, ':int_id' => $invId, ':inv_num' => $invId]);
            $invoice = $stmt->fetch();
            if (!$invoice) {
                sendJsonResponse(['success' => false, 'error' => 'Invoice not found'], 404);
            }
            $invoices = [$invoice];
        } else {
            $stmt = $pdo->query("SELECT * FROM invoices ORDER BY created_at DESC");
            $invoices = $stmt->fetchAll();
        }

        // Fetch all items and group by internal_invoice_id
        $itemsStmt = $pdo->query("SELECT * FROM invoice_items ORDER BY id ASC");
        $allItems = $itemsStmt->fetchAll();
        $itemsMap = [];
        foreach ($allItems as $item) {
            $intId = $item['internal_invoice_id'];
            if (!isset($itemsMap[$intId])) {
                $itemsMap[$intId] = [];
            }
            $itemsMap[$intId][] = $item;
        }

        // Fetch all payments and group by internal_invoice_id
        $paymentsStmt = $pdo->query("SELECT * FROM payments ORDER BY payment_date ASC, created_at ASC");
        $allPayments = $paymentsStmt->fetchAll();
        $paymentsMap = [];
        foreach ($allPayments as $p) {
            $intId = $p['internal_invoice_id'];
            if (!isset($paymentsMap[$intId])) {
                $paymentsMap[$intId] = [];
            }
            $paymentsMap[$intId][] = $p;
        }

        // Merge items and payments into invoices
        foreach ($invoices as &$inv) {
            $intId = $inv['internal_invoice_id'];
            $inv['items'] = isset($itemsMap[$intId]) ? $itemsMap[$intId] : [];
            $inv['payments'] = isset($paymentsMap[$intId]) ? $paymentsMap[$intId] : [];
            // Format boolean / numeric
            $inv['is_inter_state'] = (bool)$inv['is_inter_state'];
            $inv['is_cancelled'] = (bool)$inv['is_cancelled'];
            $inv['sub_total'] = (float)$inv['sub_total'];
            $inv['total_discount'] = (float)$inv['total_discount'];
            $inv['taxable_amount'] = (float)$inv['taxable_amount'];
            $inv['cgst_total'] = (float)$inv['cgst_total'];
            $inv['sgst_total'] = (float)$inv['sgst_total'];
            $inv['igst_total'] = (float)$inv['igst_total'];
            $inv['total_gst'] = (float)$inv['total_gst'];
            $inv['round_off'] = (float)$inv['round_off'];
            $inv['grand_total'] = (float)$inv['grand_total'];
            $inv['paid_amount'] = (float)$inv['paid_amount'];
            $inv['balance_due'] = (float)$inv['balance_due'];
        }

        sendJsonResponse([
            'success' => true,
            'count' => count($invoices),
            'data' => $invId ? $invoices[0] : $invoices
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// ------------------------------------------------------------
// 2. POST: Create New Invoice (with items & payments)
// ------------------------------------------------------------
if ($method === 'POST') {
    $input = getJsonInput();
    if (empty($input)) {
        sendJsonResponse(['success' => false, 'error' => 'No invoice data provided'], 400);
    }

    $invoiceData = isset($input['invoice']) ? $input['invoice'] : $input;
    $itemsData = isset($input['items']) ? $input['items'] : (isset($invoiceData['items']) ? $invoiceData['items'] : []);
    $paymentsData = isset($input['payments']) ? $input['payments'] : (isset($invoiceData['payments']) ? $invoiceData['payments'] : (isset($invoiceData['initialPayments']) ? $invoiceData['initialPayments'] : []));

    try {
        $pdo->beginTransaction();

        $uuid = isset($invoiceData['id']) && strlen($invoiceData['id']) > 30 ? $invoiceData['id'] : generateUuidV4();
        $internalId = isset($invoiceData['internal_invoice_id']) ? $invoiceData['internal_invoice_id'] : (isset($invoiceData['id']) && strpos($invoiceData['id'], 'INV-') === 0 ? $invoiceData['id'] : 'INV-' . date('Ymd-His') . '-' . substr(bin2hex(random_bytes(2)), 0, 4));
        $invoiceNumber = isset($invoiceData['invoice_number']) ? trim($invoiceData['invoice_number']) : (isset($invoiceData['invoiceNumber']) ? trim($invoiceData['invoiceNumber']) : '');

        // Auto-generate invoice number if not provided
        if (empty($invoiceNumber)) {
            $fy = isset($invoiceData['financial_year']) ? $invoiceData['financial_year'] : '2026-27';
            $fyShort = '26-27';
            if (preg_match('/^20(\d{2})-20(\d{2})$/', $fy, $m)) $fyShort = $m[1] . '-' . $m[2];
            elseif (preg_match('/^20(\d{2})-(\d{2})$/', $fy, $m)) $fyShort = $m[1] . '-' . $m[2];
            $monthStr = date('m');
            $patt = "HOP/{$fyShort}/{$monthStr}/%";
            $s = $pdo->prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE :p ORDER BY id DESC");
            $s->execute([':p' => $patt]);
            $nums = $s->fetchAll(PDO::FETCH_COLUMN);
            $maxS = 0;
            foreach ($nums as $n) {
                $p = explode('/', $n);
                $end = end($p);
                if (is_numeric($end) && (int)$end > $maxS) $maxS = (int)$end;
            }
            $invoiceNumber = sprintf("HOP/%s/%s/%06d", $fyShort, $monthStr, $maxS + 1);
        }

        $grandTotal = (float)(isset($invoiceData['grand_total']) ? $invoiceData['grand_total'] : (isset($invoiceData['grandTotal']) ? $invoiceData['grandTotal'] : 0));
        
        // Calculate initial payments
        $totalPaid = 0.0;
        $validPayments = [];
        if (!empty($paymentsData) && is_array($paymentsData)) {
            foreach ($paymentsData as $p) {
                $amt = (float)(isset($p['amount']) ? $p['amount'] : 0);
                if ($amt > 0) {
                    $totalPaid += $amt;
                    $validPayments[] = $p;
                }
            }
        } elseif (isset($invoiceData['paid_amount']) && (float)$invoiceData['paid_amount'] > 0) {
            $totalPaid = (float)$invoiceData['paid_amount'];
            $validPayments[] = [
                'amount' => $totalPaid,
                'payment_date' => isset($invoiceData['invoice_date']) ? $invoiceData['invoice_date'] : date('d/m/Y'),
                'payment_mode' => isset($invoiceData['payment_mode']) ? $invoiceData['payment_mode'] : 'UPI',
                'notes' => 'Initial payment upon invoice creation'
            ];
        }

        $balanceDue = max(0.0, round($grandTotal - $totalPaid, 2));
        $paymentStatus = $totalPaid >= $grandTotal ? 'PAID' : ($totalPaid > 0 ? 'PARTIAL' : 'UNPAID');

        // Insert into invoices table dynamically
        $invRecord = [
            'id' => $uuid,
            'internal_invoice_id' => $internalId,
            'invoice_number' => $invoiceNumber,
            'financial_year' => isset($invoiceData['financial_year']) ? $invoiceData['financial_year'] : (isset($invoiceData['financialYear']) ? $invoiceData['financialYear'] : '2026-27'),
            'invoice_date' => isset($invoiceData['invoice_date']) ? $invoiceData['invoice_date'] : (isset($invoiceData['invoiceDate']) ? $invoiceData['invoiceDate'] : date('d/m/Y')),
            'due_date' => isset($invoiceData['due_date']) ? $invoiceData['due_date'] : (isset($invoiceData['dueDate']) ? $invoiceData['dueDate'] : null),
            'customer_id' => isset($invoiceData['customer_id']) ? $invoiceData['customer_id'] : (isset($invoiceData['customerId']) ? $invoiceData['customerId'] : 'CUST-001'),
            'customer_name' => isset($invoiceData['customer_name']) ? $invoiceData['customer_name'] : (isset($invoiceData['customerName']) ? $invoiceData['customerName'] : 'Customer'),
            'customer_phone' => isset($invoiceData['customer_phone']) ? $invoiceData['customer_phone'] : (isset($invoiceData['customerPhone']) ? $invoiceData['customerPhone'] : ''),
            'customer_email' => isset($invoiceData['customer_email']) ? $invoiceData['customer_email'] : (isset($invoiceData['customerEmail']) ? $invoiceData['customerEmail'] : ''),
            'customer_address' => isset($invoiceData['customer_address']) ? $invoiceData['customer_address'] : (isset($invoiceData['customerAddress']) ? $invoiceData['customerAddress'] : ''),
            'customer_gstin' => isset($invoiceData['customer_gstin']) ? $invoiceData['customer_gstin'] : (isset($invoiceData['customerGSTIN']) ? $invoiceData['customerGSTIN'] : ''),
            'pet_id' => isset($invoiceData['pet_id']) ? $invoiceData['pet_id'] : (isset($invoiceData['petId']) ? $invoiceData['petId'] : null),
            'pet_name' => isset($invoiceData['pet_name']) ? $invoiceData['pet_name'] : (isset($invoiceData['petName']) ? $invoiceData['petName'] : null),
            'place_of_supply' => isset($invoiceData['place_of_supply']) ? $invoiceData['place_of_supply'] : (isset($invoiceData['placeOfSupply']) ? $invoiceData['placeOfSupply'] : '27-Maharashtra'),
            'is_inter_state' => !empty($invoiceData['is_inter_state']) || !empty($invoiceData['isInterState']) ? 1 : 0,
            'sub_total' => (float)(isset($invoiceData['sub_total']) ? $invoiceData['sub_total'] : (isset($invoiceData['subTotal']) ? $invoiceData['subTotal'] : 0)),
            'total_discount' => (float)(isset($invoiceData['total_discount']) ? $invoiceData['total_discount'] : (isset($invoiceData['totalDiscount']) ? $invoiceData['totalDiscount'] : 0)),
            'taxable_amount' => (float)(isset($invoiceData['taxable_amount']) ? $invoiceData['taxable_amount'] : (isset($invoiceData['taxableAmount']) ? $invoiceData['taxableAmount'] : 0)),
            'cgst_total' => (float)(isset($invoiceData['cgst_total']) ? $invoiceData['cgst_total'] : (isset($invoiceData['cgstTotal']) ? $invoiceData['cgstTotal'] : 0)),
            'sgst_total' => (float)(isset($invoiceData['sgst_total']) ? $invoiceData['sgst_total'] : (isset($invoiceData['sgstTotal']) ? $invoiceData['sgstTotal'] : 0)),
            'igst_total' => (float)(isset($invoiceData['igst_total']) ? $invoiceData['igst_total'] : (isset($invoiceData['igstTotal']) ? $invoiceData['igstTotal'] : 0)),
            'total_gst' => (float)(isset($invoiceData['total_gst']) ? $invoiceData['total_gst'] : (isset($invoiceData['totalGst']) ? $invoiceData['totalGst'] : 0)),
            'round_off' => (float)(isset($invoiceData['round_off']) ? $invoiceData['round_off'] : (isset($invoiceData['roundOff']) ? $invoiceData['roundOff'] : 0)),
            'grand_total' => $grandTotal,
            'paid_amount' => $totalPaid,
            'balance_due' => $balanceDue,
            'payment_status' => $paymentStatus,
            'payment_mode' => isset($invoiceData['payment_mode']) ? $invoiceData['payment_mode'] : (isset($invoiceData['paymentMode']) ? $invoiceData['paymentMode'] : 'UPI'),
            'notes' => isset($invoiceData['notes']) ? $invoiceData['notes'] : '',
            'created_by_role' => isset($invoiceData['created_by_role']) ? $invoiceData['created_by_role'] : (isset($invoiceData['createdByRole']) ? $invoiceData['createdByRole'] : 'ADMIN'),
            'created_by_name' => isset($invoiceData['created_by_name']) ? $invoiceData['created_by_name'] : (isset($invoiceData['createdByName']) ? $invoiceData['createdByName'] : 'Staff'),
            'is_cancelled' => 0,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];

        dynamicInsert($pdo, 'invoices', $invRecord);

        // Insert line items dynamically
        if (!empty($itemsData) && is_array($itemsData)) {
            $idx = 1;
            foreach ($itemsData as $item) {
                $lineId = isset($item['id']) && strlen($item['id']) > 3 ? $item['id'] : "ITEM-{$internalId}-{$idx}";
                $itemRecord = [
                    'id' => generateUuidV4(),
                    'line_item_id' => $lineId,
                    'internal_invoice_id' => $internalId,
                    'invoice_number' => $invoiceNumber,
                    'catalog_item_id' => isset($item['catalog_item_id']) ? $item['catalog_item_id'] : (isset($item['catalogItemId']) ? $item['catalogItemId'] : null),
                    'item_type' => isset($item['item_type']) ? $item['item_type'] : (isset($item['type']) ? $item['type'] : 'SERVICE'),
                    'item_name' => isset($item['item_name']) ? $item['item_name'] : (isset($item['name']) ? $item['name'] : 'Service'),
                    'hsn_sac' => isset($item['hsn_sac']) ? $item['hsn_sac'] : (isset($item['hsnSac']) ? $item['hsnSac'] : '999799'),
                    'price' => (float)(isset($item['price']) ? $item['price'] : 0),
                    'quantity' => (float)(isset($item['quantity']) ? $item['quantity'] : (isset($item['qty']) ? $item['qty'] : 1)),
                    'discount_percent' => (float)(isset($item['discount_percent']) ? $item['discount_percent'] : (isset($item['discount']) ? $item['discount'] : 0)),
                    'discount_amount' => (float)(isset($item['discount_amount']) ? $item['discount_amount'] : (isset($item['discountAmount']) ? $item['discountAmount'] : 0)),
                    'taxable_value' => (float)(isset($item['taxable_value']) ? $item['taxable_value'] : (isset($item['taxableValue']) ? $item['taxableValue'] : 0)),
                    'gst_rate' => (float)(isset($item['gst_rate']) ? $item['gst_rate'] : (isset($item['gstRate']) ? $item['gstRate'] : 18)),
                    'cgst_amount' => (float)(isset($item['cgst_amount']) ? $item['cgst_amount'] : (isset($item['cgstAmount']) ? $item['cgstAmount'] : 0)),
                    'sgst_amount' => (float)(isset($item['sgst_amount']) ? $item['sgst_amount'] : (isset($item['sgstAmount']) ? $item['sgstAmount'] : 0)),
                    'igst_amount' => (float)(isset($item['igst_amount']) ? $item['igst_amount'] : (isset($item['igstAmount']) ? $item['igstAmount'] : 0)),
                    'item_total' => (float)(isset($item['item_total']) ? $item['item_total'] : (isset($item['total']) ? $item['total'] : 0)),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                dynamicInsert($pdo, 'invoice_items', $itemRecord);
                $idx++;
            }
        }

        // Insert payments dynamically
        if (!empty($validPayments)) {
            $pidx = 1;
            foreach ($validPayments as $pay) {
                $payId = isset($pay['id']) && strlen($pay['id']) > 3 ? $pay['id'] : "PAY-{$internalId}-{$pidx}";
                $payRecord = [
                    'id' => generateUuidV4(),
                    'payment_id' => $payId,
                    'internal_invoice_id' => $internalId,
                    'invoice_number' => $invoiceNumber,
                    'customer_id' => isset($invoiceData['customer_id']) ? $invoiceData['customer_id'] : (isset($invoiceData['customerId']) ? $invoiceData['customerId'] : 'CUST-001'),
                    'customer_name' => isset($invoiceData['customer_name']) ? $invoiceData['customer_name'] : (isset($invoiceData['customerName']) ? $invoiceData['customerName'] : 'Customer'),
                    'amount' => (float)$pay['amount'],
                    'payment_date' => isset($pay['payment_date']) ? $pay['payment_date'] : (isset($pay['paymentDate']) ? $pay['paymentDate'] : date('d/m/Y')),
                    'payment_mode' => isset($pay['payment_mode']) ? $pay['payment_mode'] : (isset($pay['paymentMode']) ? $pay['paymentMode'] : 'UPI'),
                    'transaction_ref' => isset($pay['transaction_ref']) ? $pay['transaction_ref'] : (isset($pay['transactionRef']) ? $pay['transactionRef'] : null),
                    'notes' => isset($pay['notes']) ? $pay['notes'] : null,
                    'received_by' => isset($invoiceData['created_by_name']) ? $invoiceData['created_by_name'] : (isset($invoiceData['createdByName']) ? $invoiceData['createdByName'] : 'Staff'),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                dynamicInsert($pdo, 'payments', $payRecord);
                $pidx++;
            }
        }

        $pdo->commit();

        sendJsonResponse([
            'success' => true,
            'message' => 'Invoice successfully saved to MySQL',
            'data' => [
                'id' => $internalId,
                'internal_invoice_id' => $internalId,
                'invoice_number' => $invoiceNumber,
                'grand_total' => $grandTotal,
                'paid_amount' => $totalPaid,
                'balance_due' => $balanceDue,
                'payment_status' => $paymentStatus
            ]
        ], 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// ------------------------------------------------------------
// 3. PUT: Update Existing Invoice
// ------------------------------------------------------------
if ($method === 'PUT') {
    $input = getJsonInput();
    $invoiceData = isset($input['invoice']) ? $input['invoice'] : $input;
    $itemsData = isset($input['items']) ? $input['items'] : (isset($invoiceData['items']) ? $invoiceData['items'] : []);

    $internalId = isset($invoiceData['internal_invoice_id']) ? $invoiceData['internal_invoice_id'] : (isset($invoiceData['id']) ? $invoiceData['id'] : null);
    if (!$internalId) {
        sendJsonResponse(['success' => false, 'error' => 'internal_invoice_id required for update'], 400);
    }

    try {
        $pdo->beginTransaction();

        $grandTotal = (float)(isset($invoiceData['grand_total']) ? $invoiceData['grand_total'] : (isset($invoiceData['grandTotal']) ? $invoiceData['grandTotal'] : 0));
        
        // Recalculate total paid from existing payments table
        $paySumStmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE internal_invoice_id = :int_id");
        $paySumStmt->execute([':int_id' => $internalId]);
        $totalPaid = (float)$paySumStmt->fetchColumn();

        $balanceDue = max(0.0, round($grandTotal - $totalPaid, 2));
        $paymentStatus = $totalPaid >= $grandTotal ? 'PAID' : ($totalPaid > 0 ? 'PARTIAL' : 'UNPAID');
        $invoiceNumber = isset($invoiceData['invoice_number']) ? trim($invoiceData['invoice_number']) : (isset($invoiceData['invoiceNumber']) ? trim($invoiceData['invoiceNumber']) : '');

        // Update invoices table dynamically
        $updInvoiceRecord = [
            'customer_id' => isset($invoiceData['customer_id']) ? $invoiceData['customer_id'] : (isset($invoiceData['customerId']) ? $invoiceData['customerId'] : 'CUST-001'),
            'customer_name' => isset($invoiceData['customer_name']) ? $invoiceData['customer_name'] : (isset($invoiceData['customerName']) ? $invoiceData['customerName'] : 'Customer'),
            'customer_phone' => isset($invoiceData['customer_phone']) ? $invoiceData['customer_phone'] : (isset($invoiceData['customerPhone']) ? $invoiceData['customerPhone'] : ''),
            'customer_email' => isset($invoiceData['customer_email']) ? $invoiceData['customer_email'] : (isset($invoiceData['customerEmail']) ? $invoiceData['customerEmail'] : ''),
            'customer_address' => isset($invoiceData['customer_address']) ? $invoiceData['customer_address'] : (isset($invoiceData['customerAddress']) ? $invoiceData['customerAddress'] : ''),
            'customer_gstin' => isset($invoiceData['customer_gstin']) ? $invoiceData['customer_gstin'] : (isset($invoiceData['customerGSTIN']) ? $invoiceData['customerGSTIN'] : ''),
            'pet_id' => isset($invoiceData['pet_id']) ? $invoiceData['pet_id'] : (isset($invoiceData['petId']) ? $invoiceData['petId'] : null),
            'pet_name' => isset($invoiceData['pet_name']) ? $invoiceData['pet_name'] : (isset($invoiceData['petName']) ? $invoiceData['petName'] : null),
            'place_of_supply' => isset($invoiceData['place_of_supply']) ? $invoiceData['place_of_supply'] : (isset($invoiceData['placeOfSupply']) ? $invoiceData['placeOfSupply'] : '27-Maharashtra'),
            'is_inter_state' => !empty($invoiceData['is_inter_state']) || !empty($invoiceData['isInterState']) ? 1 : 0,
            'sub_total' => (float)(isset($invoiceData['sub_total']) ? $invoiceData['sub_total'] : (isset($invoiceData['subTotal']) ? $invoiceData['subTotal'] : 0)),
            'total_discount' => (float)(isset($invoiceData['total_discount']) ? $invoiceData['total_discount'] : (isset($invoiceData['totalDiscount']) ? $invoiceData['totalDiscount'] : 0)),
            'taxable_amount' => (float)(isset($invoiceData['taxable_amount']) ? $invoiceData['taxable_amount'] : (isset($invoiceData['taxableAmount']) ? $invoiceData['taxableAmount'] : 0)),
            'cgst_total' => (float)(isset($invoiceData['cgst_total']) ? $invoiceData['cgst_total'] : (isset($invoiceData['cgstTotal']) ? $invoiceData['cgstTotal'] : 0)),
            'sgst_total' => (float)(isset($invoiceData['sgst_total']) ? $invoiceData['sgst_total'] : (isset($invoiceData['sgstTotal']) ? $invoiceData['sgstTotal'] : 0)),
            'igst_total' => (float)(isset($invoiceData['igst_total']) ? $invoiceData['igst_total'] : (isset($invoiceData['igstTotal']) ? $invoiceData['igstTotal'] : 0)),
            'total_gst' => (float)(isset($invoiceData['total_gst']) ? $invoiceData['total_gst'] : (isset($invoiceData['totalGst']) ? $invoiceData['totalGst'] : 0)),
            'round_off' => (float)(isset($invoiceData['round_off']) ? $invoiceData['round_off'] : (isset($invoiceData['roundOff']) ? $invoiceData['roundOff'] : 0)),
            'grand_total' => $grandTotal,
            'paid_amount' => $totalPaid,
            'balance_due' => $balanceDue,
            'payment_status' => $paymentStatus,
            'notes' => isset($invoiceData['notes']) ? $invoiceData['notes'] : '',
            'updated_at' => date('Y-m-d H:i:s')
        ];

        dynamicUpdate($pdo, 'invoices', $updInvoiceRecord, ['internal_invoice_id' => $internalId]);

        // Replace items dynamically
        if (!empty($itemsData)) {
            $delStmt = $pdo->prepare("DELETE FROM invoice_items WHERE internal_invoice_id = :int_id");
            $delStmt->execute([':int_id' => $internalId]);

            $idx = 1;
            foreach ($itemsData as $item) {
                $lineId = isset($item['id']) && strlen($item['id']) > 3 ? $item['id'] : "ITEM-{$internalId}-{$idx}";
                $itemRecord = [
                    'id' => generateUuidV4(),
                    'line_item_id' => $lineId,
                    'internal_invoice_id' => $internalId,
                    'invoice_number' => $invoiceNumber,
                    'catalog_item_id' => isset($item['catalog_item_id']) ? $item['catalog_item_id'] : (isset($item['catalogItemId']) ? $item['catalogItemId'] : null),
                    'item_type' => isset($item['item_type']) ? $item['item_type'] : (isset($item['type']) ? $item['type'] : 'SERVICE'),
                    'item_name' => isset($item['item_name']) ? $item['item_name'] : (isset($item['name']) ? $item['name'] : 'Service'),
                    'hsn_sac' => isset($item['hsn_sac']) ? $item['hsn_sac'] : (isset($item['hsnSac']) ? $item['hsnSac'] : '999799'),
                    'price' => (float)(isset($item['price']) ? $item['price'] : 0),
                    'quantity' => (float)(isset($item['quantity']) ? $item['quantity'] : (isset($item['qty']) ? $item['qty'] : 1)),
                    'discount_percent' => (float)(isset($item['discount_percent']) ? $item['discount_percent'] : (isset($item['discount']) ? $item['discount'] : 0)),
                    'discount_amount' => (float)(isset($item['discount_amount']) ? $item['discount_amount'] : (isset($item['discountAmount']) ? $item['discountAmount'] : 0)),
                    'taxable_value' => (float)(isset($item['taxable_value']) ? $item['taxable_value'] : (isset($item['taxableValue']) ? $item['taxableValue'] : 0)),
                    'gst_rate' => (float)(isset($item['gst_rate']) ? $item['gst_rate'] : (isset($item['gstRate']) ? $item['gstRate'] : 18)),
                    'cgst_amount' => (float)(isset($item['cgst_amount']) ? $item['cgst_amount'] : (isset($item['cgstAmount']) ? $item['cgstAmount'] : 0)),
                    'sgst_amount' => (float)(isset($item['sgst_amount']) ? $item['sgst_amount'] : (isset($item['sgstAmount']) ? $item['sgstAmount'] : 0)),
                    'igst_amount' => (float)(isset($item['igst_amount']) ? $item['igst_amount'] : (isset($item['igstAmount']) ? $item['igstAmount'] : 0)),
                    'item_total' => (float)(isset($item['item_total']) ? $item['item_total'] : (isset($item['total']) ? $item['total'] : 0)),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                dynamicInsert($pdo, 'invoice_items', $itemRecord);
                $idx++;
            }
        }

        // Update payments snapshot reference
        $updPayRecord = [
            'customer_id' => isset($invoiceData['customer_id']) ? $invoiceData['customer_id'] : (isset($invoiceData['customerId']) ? $invoiceData['customerId'] : 'CUST-001'),
            'customer_name' => isset($invoiceData['customer_name']) ? $invoiceData['customer_name'] : (isset($invoiceData['customerName']) ? $invoiceData['customerName'] : 'Customer'),
            'invoice_number' => $invoiceNumber,
            'updated_at' => date('Y-m-d H:i:s')
        ];
        dynamicUpdate($pdo, 'payments', $updPayRecord, ['internal_invoice_id' => $internalId]);

        $pdo->commit();

        sendJsonResponse([
            'success' => true,
            'message' => 'Invoice successfully updated in MySQL'
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// ------------------------------------------------------------
// 4. DELETE: Cancel or Delete Invoice
// ------------------------------------------------------------
if ($method === 'DELETE') {
    $input = getJsonInput();
    $internalId = isset($_GET['id']) ? trim($_GET['id']) : (isset($input['internal_invoice_id']) ? $input['internal_invoice_id'] : null);
    $reason = isset($input['reason']) ? trim($input['reason']) : 'Cancelled by user';

    if (!$internalId) {
        sendJsonResponse(['success' => false, 'error' => 'internal_invoice_id required'], 400);
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE invoices SET 
                is_cancelled = 1, 
                cancelled_reason = :reason,
                payment_status = 'CANCELLED',
                updated_at = NOW()
            WHERE internal_invoice_id = :int_id
        ");
        $stmt->execute([':reason' => $reason, ':int_id' => $internalId]);

        sendJsonResponse([
            'success' => true,
            'message' => 'Invoice marked as cancelled in MySQL'
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}
