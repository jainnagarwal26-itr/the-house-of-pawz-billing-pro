// ============================================================
// Invoices.gs — Invoice Creation & Management API
// Project: The House of Pawz – Billing Pro
// ============================================================
// CRITICAL: Invoice number generation uses LockService to
// prevent duplicate numbers from concurrent device writes.
// The 32 historical production invoices are NOT imported here.
// ============================================================

/**
 * API: Get all invoices with optional filtering.
 */
function getInvoices(token, params) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'invoices_view');

    var sheet = getSheet(CONFIG.SHEETS.INVOICES);
    var invoices = sheetToObjects(sheet);

    if (params && params.financialYear) {
      invoices = invoices.filter(function(i) { return i.FinancialYear === params.financialYear; });
    }
    if (params && params.status) {
      invoices = invoices.filter(function(i) { return i.PaymentStatus === params.status; });
    }
    if (params && params.customerID) {
      invoices = invoices.filter(function(i) { return i.CustomerID === params.customerID; });
    }
    if (params && params.search) {
      var q = String(params.search).toLowerCase();
      invoices = invoices.filter(function(i) {
        return (
          String(i.InvoiceNumber).toLowerCase().includes(q) ||
          String(i.CustomerName).toLowerCase().includes(q) ||
          String(i.CustomerPhone).toLowerCase().includes(q)
        );
      });
    }

    // Sort by invoice date, newest first
    invoices.sort(function(a, b) {
      return new Date(b.InvoiceDate) - new Date(a.InvoiceDate);
    });

    // Paginate
    var page = (params && params.page) ? parseInt(params.page, 10) : 1;
    var limit = (params && params.limit) ? parseInt(params.limit, 10) : 10;
    var total = invoices.length;
    var start = (page - 1) * limit;
    var pageData = invoices.slice(start, start + limit);

    return successResponse({
      invoices: pageData,
      totalCount: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to retrieve invoices.');
  }
}

/**
 * API: Get a single invoice by InternalInvoiceID, including its line items.
 */
function getInvoice(token, internalInvoiceID) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'invoices_view');

    var sheet = getSheet(CONFIG.SHEETS.INVOICES);
    var invoice = findRowByKey(sheet, 'InternalInvoiceID', internalInvoiceID);
    if (!invoice) {
      return errorResponse('NOT_FOUND', 'Invoice not found: ' + internalInvoiceID);
    }

    // Load line items
    var itemsSheet = getSheet(CONFIG.SHEETS.INVOICE_ITEMS);
    var items = sheetToObjects(itemsSheet).filter(function(item) {
      return item.InternalInvoiceID === internalInvoiceID;
    });

    return successResponse({ invoice: invoice, items: items });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to retrieve invoice.');
  }
}

/**
 * API: Create a new invoice with LockService for safe sequential numbering.
 * Does NOT import historical invoices — use the separate migration phase.
 *
 * @param {string} token
 * @param {Object} invoiceData  - Invoice header fields
 * @param {Array}  items        - Array of line-item objects
 */
function createInvoice(token, invoiceData, items) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'invoices_create');

    if (!invoiceData.CustomerID || !invoiceData.GrandTotal) {
      return errorResponse('INVALID_INPUT', 'CustomerID and GrandTotal are required.');
    }

    return withInvoiceNumberLock(function() {
      var invoiceSheet = getSheet(CONFIG.SHEETS.INVOICES);
      var itemsSheet = getSheet(CONFIG.SHEETS.INVOICE_ITEMS);

      var fy = getFinancialYear(new Date());
      var fyShort = fy.replace('20', '').replace('-20', '-'); // "2026-27" → "26-27"

      // Get next invoice sequence for this FY — atomic under LockService
      var allInvoices = sheetToObjects(invoiceSheet);
      var fyInvoices = allInvoices.filter(function(i) { return i.FinancialYear === fy; });
      var maxSeq = 0;
      fyInvoices.forEach(function(inv) {
        // Parse sequence from InvoiceNumber like "HOP/26-27/000042"
        var parts = String(inv.InvoiceNumber || '').split('/');
        if (parts.length >= 3) {
          var num = parseInt(parts[2], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      });
      var nextSeq = maxSeq + 1;
      var seqStr = String(nextSeq);
      while (seqStr.length < 6) seqStr = '0' + seqStr;

      var invoiceNumber = 'HOP/' + fyShort + '/' + seqStr;
      var internalID = 'INV-HOP-' + fyShort + '-' + seqStr;

      // Write invoice header
      appendRow(invoiceSheet, {
        InternalInvoiceID: internalID,
        InvoiceNumber:     invoiceNumber,
        FinancialYear:     fy,
        InvoiceDate:       invoiceData.InvoiceDate || todayIST(),
        DueDate:           invoiceData.DueDate || '',
        CustomerID:        invoiceData.CustomerID,
        CustomerName:      sanitizeInput(invoiceData.CustomerName || ''),
        CustomerPhone:     invoiceData.CustomerPhone || '',
        CustomerEmail:     invoiceData.CustomerEmail || '',
        CustomerGSTIN:     invoiceData.CustomerGSTIN || '',
        PetID:             invoiceData.PetID || '',
        PetName:           sanitizeInput(invoiceData.PetName || ''),
        PlaceOfSupply:     invoiceData.PlaceOfSupply || '',
        IsInterState:      invoiceData.IsInterState ? 'true' : 'false',
        SubTotal:          invoiceData.SubTotal || 0,
        TotalDiscount:     invoiceData.TotalDiscount || 0,
        TaxableAmount:     invoiceData.TaxableAmount || 0,
        CGSTTotal:         invoiceData.CGSTTotal || 0,
        SGSTTotal:         invoiceData.SGSTTotal || 0,
        IGSTTotal:         invoiceData.IGSTTotal || 0,
        TotalGST:          invoiceData.TotalGST || 0,
        RoundOff:          invoiceData.RoundOff || 0,
        GrandTotal:        invoiceData.GrandTotal,
        PaidAmount:        invoiceData.PaidAmount || 0,
        BalanceDue:        invoiceData.BalanceDue || invoiceData.GrandTotal,
        PaymentStatus:     invoiceData.PaidAmount >= invoiceData.GrandTotal ? 'PAID' : (invoiceData.PaidAmount > 0 ? 'PARTIAL' : 'UNPAID'),
        PaymentMode:       invoiceData.PaymentMode || '',
        Notes:             sanitizeInput(invoiceData.Notes || ''),
        CreatedByRole:     auth.role,
        CreatedByName:     auth.username,
        IsCancelled:       'false',
        CancelledReason:   '',
        CreatedAt:         nowIST(),
        UpdatedAt:         nowIST()
      });

      // Write line items
      if (items && items.length > 0) {
        var itemSeqBase = getNextSequence(itemsSheet, 'LineItemID');
        items.forEach(function(item, idx) {
          appendRow(itemsSheet, {
            LineItemID:        generateID(CONFIG.ID_PREFIX.ITEM, itemSeqBase + idx),
            InternalInvoiceID: internalID,
            InvoiceNumber:     invoiceNumber,
            CatalogItemID:     item.CatalogItemID || '',
            ItemType:          item.ItemType || 'SERVICE',
            ItemName:          sanitizeInput(item.ItemName || ''),
            HSNSAC:            item.HSNSAC || '',
            Price:             item.Price || 0,
            Quantity:          item.Quantity || 1,
            DiscountPercent:   item.DiscountPercent || 0,
            DiscountAmount:    item.DiscountAmount || 0,
            TaxableValue:      item.TaxableValue || 0,
            GSTRate:           item.GSTRate || 18,
            CGSTAmount:        item.CGSTAmount || 0,
            SGSTAmount:        item.SGSTAmount || 0,
            IGSTAmount:        item.IGSTAmount || 0,
            ItemTotal:         item.ItemTotal || 0,
            CreatedAt:         nowIST(),
            UpdatedAt:         nowIST()
          });
        });
      }

      logAudit(auth.userID, auth.username, auth.role,
        CONFIG.AUDIT_ACTIONS.INVOICE_CREATED,
        'Created invoice: ' + invoiceNumber + ' for ' + invoiceData.CustomerName + ' | Total: ₹' + invoiceData.GrandTotal,
        '');

      return successResponse({
        internalInvoiceID: internalID,
        invoiceNumber: invoiceNumber,
        financialYear: fy
      }, 'Invoice created successfully.');
    });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to create invoice.');
  }
}

/**
 * API: Cancel an invoice. Admin-only. Requires cancellation reason.
 */
function cancelInvoice(token, internalInvoiceID, reason) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'invoices_cancel');

    var sheet = getSheet(CONFIG.SHEETS.INVOICES);
    var inv = findRowByKey(sheet, 'InternalInvoiceID', internalInvoiceID);
    if (!inv) return errorResponse('NOT_FOUND', 'Invoice not found.');
    if (String(inv.IsCancelled).toLowerCase() === 'true') {
      return errorResponse('ALREADY_CANCELLED', 'This invoice is already cancelled.');
    }

    updateRowByKey(sheet, 'InternalInvoiceID', internalInvoiceID, {
      IsCancelled:     'true',
      CancelledReason: sanitizeInput(reason || 'Cancelled by Admin'),
      PaymentStatus:   'CANCELLED',
      UpdatedAt:       nowIST()
    });

    logAudit(auth.userID, auth.username, auth.role,
      CONFIG.AUDIT_ACTIONS.INVOICE_CANCELLED,
      'Cancelled invoice: ' + inv.InvoiceNumber + ' | Reason: ' + reason,
      '');

    return successResponse(null, 'Invoice cancelled.');
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to cancel invoice.');
  }
}

/**
 * API: Delete an invoice and its line items. Requires invoices_delete permission.
 */
function deleteInvoice(token, internalInvoiceID) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'invoices_delete');

    var sheet = getSheet(CONFIG.SHEETS.INVOICES);
    var itemsSheet = getSheet(CONFIG.SHEETS.INVOICE_ITEMS);

    var deleted = deleteRowByKey(sheet, 'InternalInvoiceID', internalInvoiceID);
    if (!deleted) {
      deleted = deleteRowByKey(sheet, 'InvoiceNumber', internalInvoiceID);
    }
    if (!deleted) return errorResponse('NOT_FOUND', 'Invoice not found to delete.');

    // Delete associated line items
    deleteRowsByKey(itemsSheet, 'InternalInvoiceID', internalInvoiceID);

    logAudit(auth.userID, auth.username, auth.role,
      CONFIG.AUDIT_ACTIONS.INVOICE_CANCELLED,
      'Deleted invoice: ' + internalInvoiceID, '');

    return successResponse(null, 'Invoice deleted successfully.');
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to delete invoice.');
  }
}
