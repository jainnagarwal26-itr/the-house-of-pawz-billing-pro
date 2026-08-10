// ============================================================
// InvoiceItems.gs — Invoice Line Items API
// Project: The House of Pawz – Billing Pro
// ============================================================

function getInvoiceItems(token, internalInvoiceID) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'invoices_view');

    var sheet = getSheet(CONFIG.SHEETS.INVOICE_ITEMS);
    var allItems = sheetToObjects(sheet);

    if (internalInvoiceID) {
      allItems = allItems.filter(function(i) { return i.InternalInvoiceID === internalInvoiceID; });
    }

    return successResponse({ items: allItems, totalCount: allItems.length });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to retrieve invoice items.');
  }
}
