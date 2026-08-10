// ============================================================
// Payments.gs — Payment Recording & Ledger API
// Project: The House of Pawz – Billing Pro
// ============================================================

function getPayments(token, params) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'payments_view');

    var sheet = getSheet(CONFIG.SHEETS.PAYMENTS);
    var payments = sheetToObjects(sheet);

    if (params && params.customerID) {
      payments = payments.filter(function(p) { return p.CustomerID === params.customerID; });
    }
    if (params && params.invoiceID) {
      payments = payments.filter(function(p) { return p.InternalInvoiceID === params.invoiceID; });
    }

    // Sort newest first
    payments.sort(function(a, b) { return new Date(b.PaymentDate) - new Date(a.PaymentDate); });

    return successResponse({ payments: payments, totalCount: payments.length });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to retrieve payments.');
  }
}

/**
 * API: Record a new payment against an invoice.
 * Atomically updates the invoice's PaidAmount, BalanceDue, and PaymentStatus.
 * Uses LockService to prevent double-entry from network retries.
 */
function recordPayment(token, paymentData) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'payments_record');

    if (!paymentData.InternalInvoiceID || !paymentData.Amount || !paymentData.CustomerID) {
      return errorResponse('INVALID_INPUT', 'InternalInvoiceID, CustomerID, and Amount are required.');
    }
    if (parseFloat(paymentData.Amount) <= 0) {
      return errorResponse('INVALID_INPUT', 'Payment amount must be greater than 0.');
    }

    return withPaymentLock(function() {
      // Load invoice header
      var invoiceSheet = getSheet(CONFIG.SHEETS.INVOICES);
      var invoice = findRowByKey(invoiceSheet, 'InternalInvoiceID', paymentData.InternalInvoiceID);
      if (!invoice) {
        return errorResponse('NOT_FOUND', 'Invoice not found: ' + paymentData.InternalInvoiceID);
      }
      if (String(invoice.IsCancelled).toLowerCase() === 'true') {
        return errorResponse('INVALID_STATE', 'Cannot record payment against a cancelled invoice.');
      }

      var paymentSheet = getSheet(CONFIG.SHEETS.PAYMENTS);
      var seq = getNextSequence(paymentSheet, 'PaymentID');
      var paymentID = generateID(CONFIG.ID_PREFIX.PAYMENT, seq);

      var amount = parseFloat(paymentData.Amount);
      var prevPaid = parseFloat(invoice.PaidAmount) || 0;
      var grandTotal = parseFloat(invoice.GrandTotal) || 0;

      var newPaid = prevPaid + amount;
      var newBalance = grandTotal - newPaid;
      if (newBalance < 0) newBalance = 0;

      var newStatus = newBalance <= 0 ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'UNPAID');

      // Write payment row
      appendRow(paymentSheet, {
        PaymentID:         paymentID,
        InternalInvoiceID: paymentData.InternalInvoiceID,
        InvoiceNumber:     invoice.InvoiceNumber,
        CustomerID:        paymentData.CustomerID,
        CustomerName:      sanitizeInput(paymentData.CustomerName || invoice.CustomerName),
        Amount:            amount,
        PaymentDate:       paymentData.PaymentDate || todayIST(),
        PaymentMode:       paymentData.PaymentMode || 'Cash',
        TransactionRef:    sanitizeInput(paymentData.TransactionRef || ''),
        Notes:             sanitizeInput(paymentData.Notes || ''),
        ReceivedBy:        auth.username,
        CreatedAt:         nowIST(),
        UpdatedAt:         nowIST()
      });

      // Update invoice header balances atomically
      updateRowByKey(invoiceSheet, 'InternalInvoiceID', paymentData.InternalInvoiceID, {
        PaidAmount:    newPaid,
        BalanceDue:    newBalance,
        PaymentStatus: newStatus,
        PaymentMode:   paymentData.PaymentMode || invoice.PaymentMode,
        UpdatedAt:     nowIST()
      });

      logAudit(auth.userID, auth.username, auth.role,
        CONFIG.AUDIT_ACTIONS.PAYMENT_RECORDED,
        'Recorded payment ₹' + amount + ' for ' + invoice.InvoiceNumber + ' (' + invoice.CustomerName + ') | Mode: ' + paymentData.PaymentMode + ' | Status: ' + newStatus,
        '');

      return successResponse({
        paymentID: paymentID,
        newPaidAmount: newPaid,
        newBalanceDue: newBalance,
        newPaymentStatus: newStatus
      }, 'Payment recorded successfully.');
    });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to record payment.');
  }
}

/**
 * API: Delete a payment record. Requires payments_delete permission.
 */
function deletePayment(token, paymentID) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'payments_delete');

    var sheet = getSheet(CONFIG.SHEETS.PAYMENTS);
    var deleted = deleteRowByKey(sheet, 'PaymentID', paymentID);
    if (!deleted) return errorResponse('NOT_FOUND', 'Payment record not found to delete.');

    logAudit(auth.userID, auth.username, auth.role,
      CONFIG.AUDIT_ACTIONS.PAYMENT_RECORDED,
      'Deleted payment record: ' + paymentID, '');

    return successResponse(null, 'Payment deleted.');
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to delete payment.');
  }
}
