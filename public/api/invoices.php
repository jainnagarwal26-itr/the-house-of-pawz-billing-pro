<?php
// ============================================================
// public/api/invoices.php
// Full Invoices CRUD for MySQL Database (jainnaga_the_house_of_pawz)
// ============================================================

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDbConnection();

// ------------------------------------------------------------
// Helper to fetch complete invoice with items and payments
// ------------------------------------------------------------
function fetchCompleteInvoice(PDO $pdo, $internalId) {
    $stmt = $pdo->prepare("SELECT * FROM invoices WHERE internal_invoice_id = :int_id OR id = :int_id2 OR invoice_number = :int_id3 LIMIT 1");
    $stmt->execute([':int_id' => $internalId, ':int_id2' => $internalId, ':int_id3' => $internalId]);
    $invoice = $stmt->fetch();
    if (!$invoice) return null;

    $realIntId = $invoice['internal_invoice_id'];
    $invNum = $invoice['invoice_number'];

    $itemStmt = $pdo->prepare("SELECT * FROM invoice_items WHERE internal_invoice_id = :int_id OR invoice_number = :inv_num ORDER BY id ASC");
    $itemStmt->execute([':int_id' => $realIntId, ':inv_num' => $invNum]);
    $items = $itemStmt->fetchAll();

    $payStmt = $pdo->prepare("SELECT * FROM payments WHERE internal_invoice_id = :int_id OR invoice_number = :inv_num ORDER BY payment_date ASC, created_at ASC");
    $payStmt->execute([':int_id' => $realIntId, ':inv_num' => $invNum]);
    $payments = $payStmt->fetchAll();

    $invoice['items'] = $items;
    $invoice['payments'] = $payments;
    $invoice['is_inter_state'] = (bool)$invoice['is_inter_state'];
    $invoice['is_cancelled'] = (bool)$invoice['is_cancelled'];
    $invoice['sub_total'] = (float)$invoice['sub_total'];
    $invoice['total_discount'] = (float)$invoice['total_discount'];
    $invoice['taxable_amount'] = (float)$invoice['taxable_amount'];
    $invoice['cgst_total'] = (float)$invoice['cgst_total'];
    $invoice['sgst_total'] = (float)$invoice['sgst_total'];
    $invoice['igst_total'] = (float)$invoice['igst_total'];
    $invoice['total_gst'] = (float)$invoice['total_gst'];
    $invoice['round_off'] = (float)$invoice['round_off'];
    $invoice['grand_total'] = (float)$invoice['grand_total'];
    $invoice['paid_amount'] = (float)$invoice['paid_amount'];
    $invoice['balance_due'] = (float)$invoice['balance_due'];

    return $invoice;
}

// ------------------------------------------------------------
// 1. GET: Fetch All Invoices or Single Invoice
// ------------------------------------------------------------
if ($method === 'GET') {
    try {
        $invId = isset($_GET['id']) ? trim($_GET['id']) : null;

        if ($invId) {
            $invoice = fetchCompleteInvoice($pdo, $invId);
            if (!$invoice) {
                sendJsonResponse(['success' => false, 'error' => 'Invoice not found'], 404);
            }
            sendJsonResponse([
                'success' => true,
                'data' => $invoice
            ]);
        } else {
            $stmt = $pdo->query("SELECT * FROM invoices ORDER BY created_at DESC");
            $invoices = $stmt->fetchAll();

            // Fetch all items and group
            $itemsStmt = $pdo->query("SELECT * FROM invoice_items ORDER BY id ASC");
            $allItems = $itemsStmt->fetchAll();
            $itemsMap = [];
            foreach ($allItems as $item) {
                $intId = $item['internal_invoice_id'];
                $invNum = $item['invoice_number'];
                if ($intId) {
                    if (!isset($itemsMap[$intId])) $itemsMap[$intId] = [];
                    $itemsMap[$intId][] = $item;
                }
                if ($invNum && $invNum !== $intId) {
                    if (!isset($itemsMap[$invNum])) $itemsMap[$invNum] = [];
                    $itemsMap[$invNum][] = $item;
                }
            }

            // Fetch all payments and group
            $paymentsStmt = $pdo->query("SELECT * FROM payments ORDER BY payment_date ASC, created_at ASC");
            $allPayments = $paymentsStmt->fetchAll();
            $paymentsMap = [];
            foreach ($allPayments as $p) {
                $intId = $p['internal_invoice_id'];
                $invNum = $p['invoice_number'];
                if ($intId) {
                    if (!isset($paymentsMap[$intId])) $paymentsMap[$intId] = [];
                    $paymentsMap[$intId][] = $p;
                }
                if ($invNum && $invNum !== $intId) {
                    if (!isset($paymentsMap[$invNum])) $paymentsMap[$invNum] = [];
                    $paymentsMap[$invNum][] = $p;
                }
            }

            // Merge items and payments into invoices
            foreach ($invoices as &$inv) {
                $intId = $inv['internal_invoice_id'];
                $invNum = $inv['invoice_number'];
                $inv['items'] = isset($itemsMap[$intId]) ? $itemsMap[$intId] : (isset($itemsMap[$invNum]) ? $itemsMap[$invNum] : []);
                $inv['payments'] = isset($paymentsMap[$intId]) ? $paymentsMap[$intId] : (isset($paymentsMap[$invNum]) ? $paymentsMap[$invNum] : []);
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
                'data' => $invoices
            ]);
        }
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
        $validPayments = [];
        if (!empty($paymentsData) && is_array($paymentsData)) {
            foreach ($paymentsData as $p) {
                $amt = (float)(isset($p['amount']) ? $p['amount'] : 0);
                if ($amt > 0) {
                    $validPayments[] = $p;
                }
            }
        } elseif (isset($invoiceData['paid_amount']) && (float)$invoiceData['paid_amount'] > 0) {
            $validPayments[] = [
                'id' => "PAY-{$internalId}-1",
                'amount' => (float)$invoiceData['paid_amount'],
                'payment_date' => isset($invoiceData['invoice_date']) ? $invoiceData['invoice_date'] : date('d/m/Y'),
                'payment_mode' => isset($invoiceData['payment_mode']) ? $invoiceData['payment_mode'] : 'UPI',
                'notes' => 'Recorded upon invoice creation'
            ];
        }

        $totalPaid = 0.0;
        foreach ($validPayments as $vp) {
            $totalPaid += (float)$vp['amount'];
        }

        $balanceDue = max(0.0, round($grandTotal - $totalPaid, 2));
        $paymentStatus = $totalPaid >= $grandTotal ? 'PAID' : ($totalPaid > 0 ? 'PARTIAL' : 'UNPAID');

        // Customer Sync: Ensure customer exists in customers table
        $custId = isset($invoiceData['customer_id']) ? $invoiceData['customer_id'] : (isset($invoiceData['customerId']) ? $invoiceData['customerId'] : 'CUST-001');
        $custName = isset($invoiceData['customer_name']) ? trim($invoiceData['customer_name']) : (isset($invoiceData['customerName']) ? trim($invoiceData['customerName']) : 'Customer');
        $custPhone = isset($invoiceData['customer_phone']) ? trim($invoiceData['customer_phone']) : (isset($invoiceData['customerPhone']) ? trim($invoiceData['customerPhone']) : '');
        $custEmail = isset($invoiceData['customer_email']) && trim($invoiceData['customer_email']) !== '' ? trim($invoiceData['customer_email']) : (isset($invoiceData['customerEmail']) && trim($invoiceData['customerEmail']) !== '' ? trim($invoiceData['customerEmail']) : null);
        $custAddress = isset($invoiceData['customer_address']) ? $invoiceData['customer_address'] : (isset($invoiceData['customerAddress']) ? $invoiceData['customerAddress'] : '');
        $custGstin = isset($invoiceData['customer_gstin']) ? $invoiceData['customer_gstin'] : (isset($invoiceData['customerGSTIN']) ? $invoiceData['customerGSTIN'] : '');

        $chkCust = $pdo->prepare("SELECT id, customer_id, email FROM customers WHERE customer_id = :cid OR id = :cid2 LIMIT 1");
        $chkCust->execute([':cid' => $custId, ':cid2' => $custId]);
        $existingCust = $chkCust->fetch();

        if ($existingCust) {
            $custUpd = [
                'full_name' => $custName,
                'phone' => $custPhone,
                'address' => $custAddress,
                'gstin' => $custGstin,
                'updated_at' => date('Y-m-d H:i:s')
            ];
            if ($custEmail !== null) {
                $custUpd['email'] = $custEmail;
            }
            dynamicUpdate($pdo, 'customers', $custUpd, ['customer_id' => $existingCust['customer_id']]);
        } else {
            $newCustRec = [
                'id' => generateUuidV4(),
                'customer_id' => $custId,
                'full_name' => $custName,
                'phone' => $custPhone,
                'email' => $custEmail,
                'address' => $custAddress,
                'gstin' => $custGstin,
                'state_code' => isset($invoiceData['place_of_supply']) ? $invoiceData['place_of_supply'] : '27-Maharashtra',
                'outstanding_balance' => 0.00,
                'advance_balance' => 0.00,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];
            dynamicInsert($pdo, 'customers', $newCustRec);
        }

        // Pet Sync: Ensure pet exists in pets table
        $petId = isset($invoiceData['pet_id']) ? $invoiceData['pet_id'] : (isset($invoiceData['petId']) ? $invoiceData['petId'] : null);
        $petName = isset($invoiceData['pet_name']) ? trim($invoiceData['pet_name']) : (isset($invoiceData['petName']) ? trim($invoiceData['petName']) : null);
        if ($petId && $petName) {
            $chkPet = $pdo->prepare("SELECT id, pet_id FROM pets WHERE pet_id = :pid OR id = :pid2 LIMIT 1");
            $chkPet->execute([':pid' => $petId, ':pid2' => $petId]);
            $existingPet = $chkPet->fetch();

            if ($existingPet) {
                dynamicUpdate($pdo, 'pets', [
                    'pet_name' => $petName,
                    'customer_name' => $custName,
                    'updated_at' => date('Y-m-d H:i:s')
                ], ['pet_id' => $existingPet['pet_id']]);
            } else {
                dynamicInsert($pdo, 'pets', [
                    'id' => generateUuidV4(),
                    'pet_id' => $petId,
                    'customer_id' => $custId,
                    'customer_name' => $custName,
                    'pet_name' => $petName,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            }
        }

        // Insert into invoices table
        $invRecord = [
            'id' => $uuid,
            'internal_invoice_id' => $internalId,
            'invoice_number' => $invoiceNumber,
            'financial_year' => isset($invoiceData['financial_year']) ? $invoiceData['financial_year'] : (isset($invoiceData['financialYear']) ? $invoiceData['financialYear'] : '2026-27'),
            'invoice_date' => isset($invoiceData['invoice_date']) ? $invoiceData['invoice_date'] : (isset($invoiceData['invoiceDate']) ? $invoiceData['invoiceDate'] : date('d/m/Y')),
            'due_date' => isset($invoiceData['due_date']) ? $invoiceData['due_date'] : (isset($invoiceData['dueDate']) ? $invoiceData['dueDate'] : null),
            'customer_id' => $custId,
            'customer_name' => $custName,
            'customer_phone' => $custPhone,
            'customer_email' => $custEmail !== null ? $custEmail : '',
            'customer_address' => $custAddress,
            'customer_gstin' => $custGstin,
            'pet_id' => $petId,
            'pet_name' => $petName,
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

        // Insert line items
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

        // Insert payments
        if (!empty($validPayments)) {
            $pidx = 1;
            foreach ($validPayments as $pay) {
                $payId = isset($pay['id']) && strlen($pay['id']) > 3 ? $pay['id'] : "PAY-{$internalId}-{$pidx}";
                $payRecord = [
                    'id' => generateUuidV4(),
                    'payment_id' => $payId,
                    'internal_invoice_id' => $internalId,
                    'invoice_number' => $invoiceNumber,
                    'customer_id' => $custId,
                    'customer_name' => $custName,
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

        $savedFull = fetchCompleteInvoice($pdo, $internalId);

        sendJsonResponse([
            'success' => true,
            'message' => 'Invoice successfully saved to MySQL',
            'data' => $savedFull ? $savedFull : [
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
// 3. PUT: Update Existing Invoice (Complete Transactional Flow)
// ------------------------------------------------------------
if ($method === 'PUT') {
    $input = getJsonInput();
    $invoiceData = isset($input['invoice']) ? $input['invoice'] : $input;
    $itemsData = isset($input['items']) ? $input['items'] : (isset($invoiceData['items']) ? $invoiceData['items'] : null);
    $paymentsData = isset($input['payments']) ? $input['payments'] : (isset($invoiceData['payments']) ? $invoiceData['payments'] : (isset($invoiceData['initialPayments']) ? $invoiceData['initialPayments'] : null));

    $internalId = isset($invoiceData['internal_invoice_id']) ? $invoiceData['internal_invoice_id'] : (isset($invoiceData['id']) ? $invoiceData['id'] : null);
    $invoiceNumber = isset($invoiceData['invoice_number']) ? trim($invoiceData['invoice_number']) : (isset($invoiceData['invoiceNumber']) ? trim($invoiceData['invoiceNumber']) : '');

    if (!$internalId && empty($invoiceNumber)) {
        sendJsonResponse(['success' => false, 'error' => 'internal_invoice_id or invoice_number required for update'], 400);
    }

    try {
        $pdo->beginTransaction();

        // 1. Locate existing invoice record in database
        $invStmt = $pdo->prepare("SELECT * FROM invoices WHERE internal_invoice_id = :int_id OR id = :int_id2 OR invoice_number = :inv_num LIMIT 1");
        $invStmt->execute([
            ':int_id' => $internalId ? $internalId : $invoiceNumber,
            ':int_id2' => $internalId ? $internalId : $invoiceNumber,
            ':inv_num' => !empty($invoiceNumber) ? $invoiceNumber : $internalId
        ]);
        $existingInvoice = $invStmt->fetch();

        if (!$existingInvoice) {
            $pdo->rollBack();
            sendJsonResponse(['success' => false, 'error' => "Invoice not found in database for ID: {$internalId} / {$invoiceNumber}"], 404);
        }

        $internalId = $existingInvoice['internal_invoice_id'];
        if (empty($invoiceNumber)) {
            $invoiceNumber = $existingInvoice['invoice_number'];
        }

        $grandTotal = (float)(isset($invoiceData['grand_total']) ? $invoiceData['grand_total'] : (isset($invoiceData['grandTotal']) ? $invoiceData['grandTotal'] : $existingInvoice['grand_total']));

        // 2. Customer Update: Update customer master record safely
        $custId = isset($invoiceData['customer_id']) ? $invoiceData['customer_id'] : (isset($invoiceData['customerId']) ? $invoiceData['customerId'] : $existingInvoice['customer_id']);
        $custName = isset($invoiceData['customer_name']) ? trim($invoiceData['customer_name']) : (isset($invoiceData['customerName']) ? trim($invoiceData['customerName']) : $existingInvoice['customer_name']);
        $custPhone = isset($invoiceData['customer_phone']) ? trim($invoiceData['customer_phone']) : (isset($invoiceData['customerPhone']) ? trim($invoiceData['customerPhone']) : $existingInvoice['customer_phone']);
        $custAddress = isset($invoiceData['customer_address']) ? $invoiceData['customer_address'] : (isset($invoiceData['customerAddress']) ? $invoiceData['customerAddress'] : $existingInvoice['customer_address']);
        $custGstin = isset($invoiceData['customer_gstin']) ? $invoiceData['customer_gstin'] : (isset($invoiceData['customerGSTIN']) ? $invoiceData['customerGSTIN'] : $existingInvoice['customer_gstin']);
        
        // Email safety: Only update if explicitly provided non-empty, never auto-generate dummy emails
        $custEmail = null;
        if (isset($invoiceData['customer_email']) && trim($invoiceData['customer_email']) !== '') {
            $custEmail = trim($invoiceData['customer_email']);
        } elseif (isset($invoiceData['customerEmail']) && trim($invoiceData['customerEmail']) !== '') {
            $custEmail = trim($invoiceData['customerEmail']);
        }

        if (!empty($custId)) {
            $chkCust = $pdo->prepare("SELECT id, customer_id, email FROM customers WHERE customer_id = :cid OR id = :cid2 LIMIT 1");
            $chkCust->execute([':cid' => $custId, ':cid2' => $custId]);
            $existingCust = $chkCust->fetch();

            if ($existingCust) {
                $updCust = [
                    'full_name' => $custName,
                    'phone' => $custPhone,
                    'address' => $custAddress,
                    'gstin' => $custGstin,
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                if ($custEmail !== null) {
                    $updCust['email'] = $custEmail;
                }
                dynamicUpdate($pdo, 'customers', $updCust, ['customer_id' => $existingCust['customer_id']]);
            } else {
                $newCustRec = [
                    'id' => generateUuidV4(),
                    'customer_id' => $custId,
                    'full_name' => $custName,
                    'phone' => $custPhone,
                    'email' => $custEmail,
                    'address' => $custAddress,
                    'gstin' => $custGstin,
                    'state_code' => isset($invoiceData['place_of_supply']) ? $invoiceData['place_of_supply'] : '27-Maharashtra',
                    'outstanding_balance' => 0.00,
                    'advance_balance' => 0.00,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                dynamicInsert($pdo, 'customers', $newCustRec);
            }
        }

        // 3. Pet Update: Update pet record safely
        $petId = isset($invoiceData['pet_id']) ? $invoiceData['pet_id'] : (isset($invoiceData['petId']) ? $invoiceData['petId'] : $existingInvoice['pet_id']);
        $petName = isset($invoiceData['pet_name']) ? trim($invoiceData['pet_name']) : (isset($invoiceData['petName']) ? trim($invoiceData['petName']) : $existingInvoice['pet_name']);

        if (!empty($petId) && !empty($petName)) {
            $chkPet = $pdo->prepare("SELECT id, pet_id FROM pets WHERE pet_id = :pid OR id = :pid2 LIMIT 1");
            $chkPet->execute([':pid' => $petId, ':pid2' => $petId]);
            $existingPet = $chkPet->fetch();

            if ($existingPet) {
                dynamicUpdate($pdo, 'pets', [
                    'pet_name' => $petName,
                    'customer_name' => $custName,
                    'updated_at' => date('Y-m-d H:i:s')
                ], ['pet_id' => $existingPet['pet_id']]);
            } elseif (!empty($custId)) {
                dynamicInsert($pdo, 'pets', [
                    'id' => generateUuidV4(),
                    'pet_id' => $petId,
                    'customer_id' => $custId,
                    'customer_name' => $custName,
                    'pet_name' => $petName,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            }
        }

        // 4. Payments Synchronization
        if ($paymentsData !== null && is_array($paymentsData)) {
            $delPayStmt = $pdo->prepare("DELETE FROM payments WHERE internal_invoice_id = :int_id OR invoice_number = :inv_num");
            $delPayStmt->execute([':int_id' => $internalId, ':inv_num' => $invoiceNumber]);

            $validPayments = array_filter($paymentsData, function($p) {
                return isset($p['amount']) && (float)$p['amount'] > 0;
            });

            if (!empty($validPayments)) {
                $pidx = 1;
                foreach ($validPayments as $pay) {
                    $payId = isset($pay['id']) && strlen($pay['id']) > 3 && strpos($pay['id'], 'PAY-INIT-') !== 0 && strpos($pay['id'], 'PAY-FULL-') !== 0 ? $pay['id'] : "PAY-{$internalId}-{$pidx}";
                    $payRecord = [
                        'id' => generateUuidV4(),
                        'payment_id' => $payId,
                        'internal_invoice_id' => $internalId,
                        'invoice_number' => $invoiceNumber,
                        'customer_id' => $custId,
                        'customer_name' => $custName,
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
        }

        // 5. Authoritative recalculation from payments table
        $paySumStmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE internal_invoice_id = :int_id OR invoice_number = :inv_num");
        $paySumStmt->execute([':int_id' => $internalId, ':inv_num' => $invoiceNumber]);
        $totalPaid = (float)$paySumStmt->fetchColumn();

        // Fallback: If payments table has 0 rows but paid_amount > 0 was explicitly sent in payload, auto-create a payment record
        if ($totalPaid == 0.0) {
            $explicitPaid = 0.0;
            if (isset($invoiceData['paid_amount']) && (float)$invoiceData['paid_amount'] > 0) {
                $explicitPaid = (float)$invoiceData['paid_amount'];
            } elseif (isset($invoiceData['paidAmount']) && (float)$invoiceData['paidAmount'] > 0) {
                $explicitPaid = (float)$invoiceData['paidAmount'];
            }

            if ($explicitPaid > 0.0) {
                $payMode = isset($invoiceData['payment_mode']) ? $invoiceData['payment_mode'] : (isset($invoiceData['paymentMode']) ? $invoiceData['paymentMode'] : 'UPI');
                $payDate = isset($invoiceData['invoice_date']) ? $invoiceData['invoice_date'] : (isset($invoiceData['invoiceDate']) ? $invoiceData['invoiceDate'] : date('d/m/Y'));
                $payRecord = [
                    'id' => generateUuidV4(),
                    'payment_id' => "PAY-{$internalId}-1",
                    'internal_invoice_id' => $internalId,
                    'invoice_number' => $invoiceNumber,
                    'customer_id' => $custId,
                    'customer_name' => $custName,
                    'amount' => $explicitPaid,
                    'payment_date' => $payDate,
                    'payment_mode' => $payMode,
                    'notes' => 'Recorded upon invoice update',
                    'received_by' => isset($invoiceData['created_by_name']) ? $invoiceData['created_by_name'] : (isset($invoiceData['createdByName']) ? $invoiceData['createdByName'] : 'Staff'),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                dynamicInsert($pdo, 'payments', $payRecord);
                $totalPaid = $explicitPaid;
            }
        }

        $balanceDue = max(0.0, round($grandTotal - $totalPaid, 2));
        $paymentStatus = $totalPaid >= $grandTotal ? 'PAID' : ($totalPaid > 0 ? 'PARTIAL' : 'UNPAID');
        $paymentMode = isset($invoiceData['payment_mode']) ? $invoiceData['payment_mode'] : (isset($invoiceData['paymentMode']) ? $invoiceData['paymentMode'] : $existingInvoice['payment_mode']);

        // 6. Update invoices table
        $updInvoiceRecord = [
            'invoice_number' => $invoiceNumber,
            'invoice_date' => isset($invoiceData['invoice_date']) ? $invoiceData['invoice_date'] : (isset($invoiceData['invoiceDate']) ? $invoiceData['invoiceDate'] : $existingInvoice['invoice_date']),
            'due_date' => isset($invoiceData['due_date']) ? $invoiceData['due_date'] : (isset($invoiceData['dueDate']) ? $invoiceData['dueDate'] : $existingInvoice['due_date']),
            'customer_id' => $custId,
            'customer_name' => $custName,
            'customer_phone' => $custPhone,
            'customer_email' => $custEmail !== null ? $custEmail : $existingInvoice['customer_email'],
            'customer_address' => $custAddress,
            'customer_gstin' => $custGstin,
            'pet_id' => $petId,
            'pet_name' => $petName,
            'place_of_supply' => isset($invoiceData['place_of_supply']) ? $invoiceData['place_of_supply'] : (isset($invoiceData['placeOfSupply']) ? $invoiceData['placeOfSupply'] : $existingInvoice['place_of_supply']),
            'is_inter_state' => isset($invoiceData['is_inter_state']) || isset($invoiceData['isInterState']) ? (!empty($invoiceData['is_inter_state']) || !empty($invoiceData['isInterState']) ? 1 : 0) : $existingInvoice['is_inter_state'],
            'sub_total' => (float)(isset($invoiceData['sub_total']) ? $invoiceData['sub_total'] : (isset($invoiceData['subTotal']) ? $invoiceData['subTotal'] : $existingInvoice['sub_total'])),
            'total_discount' => (float)(isset($invoiceData['total_discount']) ? $invoiceData['total_discount'] : (isset($invoiceData['totalDiscount']) ? $invoiceData['totalDiscount'] : $existingInvoice['total_discount'])),
            'taxable_amount' => (float)(isset($invoiceData['taxable_amount']) ? $invoiceData['taxable_amount'] : (isset($invoiceData['taxableAmount']) ? $invoiceData['taxableAmount'] : $existingInvoice['taxable_amount'])),
            'cgst_total' => (float)(isset($invoiceData['cgst_total']) ? $invoiceData['cgst_total'] : (isset($invoiceData['cgstTotal']) ? $invoiceData['cgstTotal'] : $existingInvoice['cgst_total'])),
            'sgst_total' => (float)(isset($invoiceData['sgst_total']) ? $invoiceData['sgst_total'] : (isset($invoiceData['sgstTotal']) ? $invoiceData['sgstTotal'] : $existingInvoice['sgst_total'])),
            'igst_total' => (float)(isset($invoiceData['igst_total']) ? $invoiceData['igst_total'] : (isset($invoiceData['igstTotal']) ? $invoiceData['igstTotal'] : $existingInvoice['igst_total'])),
            'total_gst' => (float)(isset($invoiceData['total_gst']) ? $invoiceData['total_gst'] : (isset($invoiceData['totalGst']) ? $invoiceData['totalGst'] : $existingInvoice['total_gst'])),
            'round_off' => (float)(isset($invoiceData['round_off']) ? $invoiceData['round_off'] : (isset($invoiceData['roundOff']) ? $invoiceData['roundOff'] : $existingInvoice['round_off'])),
            'grand_total' => $grandTotal,
            'paid_amount' => $totalPaid,
            'balance_due' => $balanceDue,
            'payment_status' => $paymentStatus,
            'payment_mode' => $paymentMode,
            'notes' => isset($invoiceData['notes']) ? $invoiceData['notes'] : $existingInvoice['notes'],
            'updated_at' => date('Y-m-d H:i:s')
        ];

        dynamicUpdate($pdo, 'invoices', $updInvoiceRecord, ['internal_invoice_id' => $internalId]);

        // 7. Update items dynamically if supplied
        if ($itemsData !== null && is_array($itemsData)) {
            $delStmt = $pdo->prepare("DELETE FROM invoice_items WHERE internal_invoice_id = :int_id OR invoice_number = :inv_num");
            $delStmt->execute([':int_id' => $internalId, ':inv_num' => $invoiceNumber]);

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
                    'service_date' => isset($item['service_date']) ? $item['service_date'] : (isset($item['serviceDate']) ? $item['serviceDate'] : null),
                    'service_start_date' => isset($item['service_start_date']) ? $item['service_start_date'] : (isset($item['serviceStartDate']) ? $item['serviceStartDate'] : null),
                    'service_end_date' => isset($item['service_end_date']) ? $item['service_end_date'] : (isset($item['serviceEndDate']) ? $item['serviceEndDate'] : null),
                    'duration' => isset($item['duration']) ? (float)$item['duration'] : null,
                    'unit' => isset($item['unit']) ? $item['unit'] : null,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                dynamicInsert($pdo, 'invoice_items', $itemRecord);
                $idx++;
            }
        }

        $pdo->commit();

        $updatedFull = fetchCompleteInvoice($pdo, $internalId);

        sendJsonResponse([
            'success' => true,
            'message' => 'Invoice successfully updated in MySQL',
            'data' => $updatedFull ? $updatedFull : [
                'id' => $internalId,
                'internal_invoice_id' => $internalId,
                'invoice_number' => $invoiceNumber,
                'grand_total' => $grandTotal,
                'paid_amount' => $totalPaid,
                'balance_due' => $balanceDue,
                'payment_status' => $paymentStatus
            ]
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
