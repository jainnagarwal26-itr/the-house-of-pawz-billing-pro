// ============================================================
// AuditLogs.gs — Audit Trail Write & Read
// Project: The House of Pawz – Billing Pro
// ============================================================
// SECURITY: Passwords, PINs and RecoveryKeys MUST NEVER
// be logged in this module.
// ============================================================

/**
 * Write a new audit log entry to the Audit_Logs sheet.
 *
 * @param {string} userID     - User performing the action (or null for system)
 * @param {string} userName   - Display name
 * @param {string} userRole   - Role string
 * @param {string} actionCode - From CONFIG.AUDIT_ACTIONS
 * @param {string} details    - Human-readable description (NO passwords)
 * @param {string} ipAddress  - Optional IP address string
 */
function logAudit(userID, userName, userRole, actionCode, details, ipAddress) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.AUDIT);
    var seq = getNextSequence(sheet, 'LogID');
    var logID = generateID(CONFIG.ID_PREFIX.AUDIT, seq);

    // SECURITY: Strip any accidental password references from details
    var safeDetails = String(details || '')
      .replace(/password[^\s]*/gi, '[REDACTED]')
      .replace(/pinhash[^\s]*/gi, '[REDACTED]')
      .replace(/recovery[^\s]*/gi, '[REDACTED]');

    appendRow(sheet, {
      LogID:      logID,
      Timestamp:  nowIST(),
      UserID:     userID || 'SYSTEM',
      UserName:   userName || 'System',
      UserRole:   userRole || 'SYSTEM',
      ActionCode: actionCode,
      Details:    safeDetails,
      IPAddress:  ipAddress || ''
    });
  } catch (e) {
    // Audit log failure must not break the calling operation
    Logger.log('AUDIT_LOG_WRITE_FAILED: ' + e.message);
  }
}

/**
 * API: Get paginated audit log entries.
 * Requires authentication. Requires ADMIN or BILLING_STAFF role.
 *
 * @param {string} token
 * @param {Object} params - { page: number, limit: number, actionFilter: string }
 * @returns {Object} API response with paginated logs
 */
function getAuditLogs(token, params) {
  try {
    var auth = requireAuth(token);
    if (auth.role !== CONFIG.ROLES.ADMIN && auth.role !== CONFIG.ROLES.BILLING_STAFF) {
      return errorResponse('FORBIDDEN', 'You do not have permission to view audit logs.');
    }

    var sheet = getSheet(CONFIG.SHEETS.AUDIT);
    var logs = sheetToObjects(sheet);

    // Filter by action code if provided
    var filter = params && params.actionFilter ? params.actionFilter : null;
    if (filter) {
      logs = logs.filter(function(l) {
        return String(l.ActionCode).toLowerCase().includes(filter.toLowerCase());
      });
    }

    // Sort newest first
    logs.reverse();

    // Paginate
    var page = (params && params.page) ? parseInt(params.page, 10) : 1;
    var limit = (params && params.limit) ? parseInt(params.limit, 10) : 50;
    var start = (page - 1) * limit;
    var pageData = logs.slice(start, start + limit);

    return successResponse({
      logs: pageData,
      totalCount: logs.length,
      page: page,
      limit: limit,
      totalPages: Math.ceil(logs.length / limit)
    });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to retrieve audit logs.');
  }
}
