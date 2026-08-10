// ============================================================
// Subscriptions.gs — Recurring Billing API
// Project: The House of Pawz – Billing Pro
// ============================================================

function getSubscriptions(token, params) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'recurring_view');

    var sheet = getSheet(CONFIG.SHEETS.SUBSCRIPTIONS);
    var subs = sheetToObjects(sheet);

    if (params && params.customerID) {
      subs = subs.filter(function(s) { return s.CustomerID === params.customerID; });
    }
    if (params && params.status) {
      subs = subs.filter(function(s) { return s.Status === params.status; });
    }

    return successResponse({ subscriptions: subs, totalCount: subs.length });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to retrieve subscriptions.');
  }
}
