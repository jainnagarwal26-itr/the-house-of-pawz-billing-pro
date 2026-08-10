// ============================================================
// Permissions.gs — Server-Side RBAC Permission Engine
// Project: The House of Pawz – Billing Pro
// ============================================================
// Mirrors the existing React permissions engine from
// src/lib/permissions.ts for server-side enforcement.
// Role defaults + User-specific overrides = Effective Permission
// ============================================================

/**
 * Default role-based permissions.
 * These mirror the DEFAULT_ROLE_PERMISSIONS in src/lib/permissions.ts.
 * Admin: ALL permissions enabled.
 * BILLING_STAFF: Billing-focused permissions.
 * USER: Read-only focused permissions.
 */
var ROLE_DEFAULTS = {
  ADMIN: {
    dashboard_view: true,
    invoices_view: true, invoices_create: true, invoices_edit: true,
    invoices_delete: true, invoices_cancel: true, invoices_pdf: true,
    invoices_whatsapp: true, invoices_email: true,
    customers_view: true, customers_create: true, customers_edit: true, customers_delete: true,
    pets_view: true, pets_create: true, pets_edit: true, pets_delete: true,
    payments_view: true, payments_record: true,
    gst_reports_view: true, gst_reports_export: true,
    recurring_view: true, recurring_manage: true,
    communication_center_view: true, receipt_share: true, statement_share: true,
    smart_import_view: true, smart_import_execute: true,
    excel_export: true, excel_import: true,
    user_management_view: true, user_management_create: true,
    user_management_edit: true, user_management_delete: true,
    user_management_permissions: true,
    audit_logs_view: true,
    settings_view: true, settings_edit: true
  },
  BILLING_STAFF: {
    dashboard_view: true,
    invoices_view: true, invoices_create: true, invoices_edit: false,
    invoices_delete: false, invoices_cancel: false, invoices_pdf: true,
    invoices_whatsapp: true, invoices_email: true,
    customers_view: true, customers_create: true, customers_edit: true, customers_delete: false,
    pets_view: true, pets_create: true, pets_edit: true, pets_delete: false,
    payments_view: true, payments_record: true,
    gst_reports_view: true, gst_reports_export: false,
    recurring_view: true, recurring_manage: false,
    communication_center_view: true, receipt_share: true, statement_share: false,
    smart_import_view: false, smart_import_execute: false,
    excel_export: true, excel_import: false,
    user_management_view: false, user_management_create: false,
    user_management_edit: false, user_management_delete: false,
    user_management_permissions: false,
    audit_logs_view: true,
    settings_view: false, settings_edit: false
  },
  USER: {
    dashboard_view: true,
    invoices_view: true, invoices_create: false, invoices_edit: false,
    invoices_delete: false, invoices_cancel: false, invoices_pdf: true,
    invoices_whatsapp: false, invoices_email: false,
    customers_view: true, customers_create: false, customers_edit: false, customers_delete: false,
    pets_view: true, pets_create: false, pets_edit: false, pets_delete: false,
    payments_view: true, payments_record: false,
    gst_reports_view: false, gst_reports_export: false,
    recurring_view: true, recurring_manage: false,
    communication_center_view: false, receipt_share: false, statement_share: false,
    smart_import_view: false, smart_import_execute: false,
    excel_export: false, excel_import: false,
    user_management_view: false, user_management_create: false,
    user_management_edit: false, user_management_delete: false,
    user_management_permissions: false,
    audit_logs_view: false,
    settings_view: false, settings_edit: false
  }
};

/**
 * Compute the effective permissions for a user.
 * Formula: Role Default + User-Specific Override = Effective Permission
 *
 * @param {string} userID - The user's UserID
 * @param {string} role   - The user's Role
 * @returns {Object} Map of permissionKey -> boolean
 */
function getEffectivePermissionsForUser(userID, role) {
  var roleDefaults = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.USER;

  // Start with a copy of role defaults
  var effective = JSON.parse(JSON.stringify(roleDefaults));

  // Apply user-specific overrides from User_Permissions sheet
  try {
    var sheet = getSheet(CONFIG.SHEETS.PERMISSIONS);
    var rows = sheetToObjects(sheet);
    rows.forEach(function(row) {
      if (String(row.UserID).trim() === String(userID).trim()) {
        var key = String(row.PermissionKey).trim();
        var val = String(row.PermissionValue).trim().toLowerCase();
        effective[key] = (val === 'true' || val === '1' || val === 'yes');
      }
    });
  } catch (e) {
    // If permissions sheet fails, fall back to role defaults
    Logger.log('PERMISSIONS_LOAD_ERROR: ' + e.message);
  }

  return effective;
}

/**
 * API: Get all permission overrides for a specific user.
 * Admin-only.
 */
function getUserPermissions(token, targetUserID) {
  try {
    var auth = requireAuth(token);
    if (auth.role !== CONFIG.ROLES.ADMIN) {
      return errorResponse('FORBIDDEN', 'Only Admin can view user permission overrides.');
    }
    if (!targetUserID) {
      return errorResponse('INVALID_INPUT', 'targetUserID is required.');
    }

    // Get user role to compute defaults
    var usersSheet = getSheet(CONFIG.SHEETS.USERS);
    var targetUser = findRowByKey(usersSheet, 'UserID', targetUserID);
    if (!targetUser) {
      return errorResponse('USER_NOT_FOUND', 'User with ID ' + targetUserID + ' not found.');
    }

    var effective = getEffectivePermissionsForUser(targetUserID, targetUser.Role);

    return successResponse({
      userID: targetUserID,
      role: targetUser.Role,
      effectivePermissions: effective
    });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to retrieve permissions.');
  }
}

/**
 * API: Update a specific user's permission override.
 * Admin-only. Uses LockService to prevent concurrent writes.
 *
 * @param {string} token
 * @param {string} targetUserID
 * @param {string} permissionKey
 * @param {boolean} permissionValue
 */
function updateUserPermission(token, targetUserID, permissionKey, permissionValue) {
  try {
    var auth = requireAuth(token);
    if (auth.role !== CONFIG.ROLES.ADMIN) {
      return errorResponse('FORBIDDEN', 'Only Admin can update user permissions.');
    }
    if (!targetUserID || !permissionKey) {
      return errorResponse('INVALID_INPUT', 'targetUserID and permissionKey are required.');
    }

    return withPermissionLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.PERMISSIONS);

      // Check if override already exists
      var rows = sheetToObjects(sheet);
      var existing = null;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].UserID === targetUserID && rows[i].PermissionKey === permissionKey) {
          existing = rows[i];
          break;
        }
      }

      if (existing) {
        // Update existing override
        updateRowByKey(sheet, 'OverrideID', existing.OverrideID, {
          PermissionValue: permissionValue ? 'true' : 'false',
          UpdatedBy: auth.username,
          UpdatedAt: nowIST()
        });
      } else {
        // Create new override
        var seq = getNextSequence(sheet, 'OverrideID');
        appendRow(sheet, {
          OverrideID:      generateID(CONFIG.ID_PREFIX.PERMISSION, seq),
          UserID:          targetUserID,
          PermissionKey:   permissionKey,
          PermissionValue: permissionValue ? 'true' : 'false',
          UpdatedBy:       auth.username,
          UpdatedAt:       nowIST()
        });
      }

      logAudit(auth.userID, auth.username, auth.role,
        CONFIG.AUDIT_ACTIONS.PERMISSION_CHANGED,
        'Updated permission "' + permissionKey + '" to ' + permissionValue + ' for userID: ' + targetUserID,
        '');

      return successResponse(null, 'Permission updated successfully.');
    });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to update permission.');
  }
}
