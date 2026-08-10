// ============================================================
// Router.gs — Main API Router: doGet() & doPost()
// Project: The House of Pawz – Billing Pro
// ============================================================
// ALL requests pass through here. Never expose raw exceptions.
// Every response is wrapped in successResponse() or errorResponse().
// ============================================================

/**
 * HTTP GET handler — used for read-only API calls.
 * URL pattern: ?action=getInvoices&token=xxx&param1=value
 */
function doGet(e) {
  var result;
  try {
    var params = e.parameter || {};
    var action = params.action;
    var token = params.token;

    switch (action) {
      // ── Auth ──────────────────────────────────────
      case 'ping':
        result = successResponse({ status: 'THOP API Online', version: CONFIG.API_VERSION }, 'OK');
        break;

      // ── Users ─────────────────────────────────────
      case 'getUsers':
        result = getUsers(token);
        break;
      case 'getUserPermissions':
        result = getUserPermissions(token, params.userID);
        break;

      // ── Customers ─────────────────────────────────
      case 'getCustomers':
        result = getCustomers(token, params);
        break;

      // ── Pets ──────────────────────────────────────
      case 'getPets':
        result = getPets(token, params);
        break;

      // ── Invoices ──────────────────────────────────
      case 'getInvoices':
        result = getInvoices(token, params);
        break;
      case 'getInvoice':
        result = getInvoice(token, params.internalInvoiceID);
        break;
      case 'getInvoiceItems':
        result = getInvoiceItems(token, params.internalInvoiceID);
        break;

      // ── Payments ──────────────────────────────────
      case 'getPayments':
        result = getPayments(token, params);
        break;

      // ── Subscriptions ─────────────────────────────
      case 'getSubscriptions':
        result = getSubscriptions(token, params);
        break;

      // ── Communication ─────────────────────────────
      case 'getCommunicationLogs':
        result = getCommunicationLogs(token, params);
        break;

      // ── Reports ───────────────────────────────────
      case 'getDashboardSummary':
        result = getDashboardSummary(token);
        break;
      case 'getGSTReports':
        result = getGSTReports(token, params);
        break;

      // ── Audit ─────────────────────────────────────
      case 'getAuditLogs':
        result = getAuditLogs(token, params);
        break;

      // ── Health ────────────────────────────────────
      case 'healthCheck':
        result = successResponse({ report: runDatabaseHealthCheck() }, 'Health check complete');
        break;

      default:
        result = errorResponse('UNKNOWN_ACTION', 'API action "' + action + '" not found.');
    }
  } catch (err) {
    result = errorResponse('ROUTER_ERROR', 'API request failed: ' + err.message);
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * HTTP POST handler — used for write operations.
 * Body: JSON string { action, token, payload }
 */
function doPost(e) {
  var result;
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var action = body.action;
    var token = body.token;
    var payload = body.payload || {};

    switch (action) {
      // ── Auth ──────────────────────────────────────
      case 'login':
        result = login(payload.username, payload.password);
        break;

      // ── Users ─────────────────────────────────────
      case 'createUser':
        result = createUser(token, payload);
        break;
      case 'updateUser':
        result = updateUser(token, payload.userID, payload);
        break;
      case 'deactivateUser':
        result = deactivateUser(token, payload.userID);
        break;

      // ── Permissions ───────────────────────────────
      case 'updateUserPermission':
        result = updateUserPermission(token, payload.userID, payload.permissionKey, payload.permissionValue);
        break;

      // ── Customers ─────────────────────────────────
      case 'saveCustomer':
        result = saveCustomer(token, payload);
        break;
      case 'deleteCustomer':
        result = deleteCustomer(token, payload.customerID || payload.id);
        break;

      // ── Pets ──────────────────────────────────────
      case 'savePet':
        result = savePet(token, payload);
        break;
      case 'deletePet':
        result = deletePet(token, payload.petID || payload.id);
        break;
      case 'updateBoardingStatus':
        result = updateBoardingStatus(token, payload.petID, payload.isBoardingNow, payload.roomNo, payload.checkInDate, payload.checkOutDate);
        break;

      // ── Invoices ──────────────────────────────────
      case 'createInvoice':
        result = createInvoice(token, payload.invoice, payload.items);
        break;
      case 'cancelInvoice':
        result = cancelInvoice(token, payload.internalInvoiceID, payload.reason);
        break;
      case 'deleteInvoice':
        result = deleteInvoice(token, payload.internalInvoiceID || payload.invoiceNumber || payload.id);
        break;

      // ── Payments ──────────────────────────────────
      case 'recordPayment':
        result = recordPayment(token, payload);
        break;
      case 'deletePayment':
        result = deletePayment(token, payload.paymentID || payload.id);
        break;

      // ── Communication ─────────────────────────────
      case 'logCommunication':
        result = logCommunication(token, payload);
        break;

      // ── Database ──────────────────────────────────
      case 'setupDatabase': {
        // Admin-only one-time setup
        var setupAuth = requireAuth(token);
        if (setupAuth.role !== CONFIG.ROLES.ADMIN) {
          result = errorResponse('FORBIDDEN', 'Only Admin can run database setup.');
        } else {
          result = successResponse({ report: setupDatabaseSheets() }, 'Setup complete.');
        }
        break;
      }

      default:
        result = errorResponse('UNKNOWN_ACTION', 'POST action "' + action + '" not found.');
    }
  } catch (err) {
    result = errorResponse('ROUTER_ERROR', 'API request failed: ' + err.message);
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
