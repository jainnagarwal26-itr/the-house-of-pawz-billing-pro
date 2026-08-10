// ============================================================
// Users.gs — User Management API
// Project: The House of Pawz – Billing Pro
// ============================================================
// SECURITY: PasswordHash, PinCode, RecoveryKey are NEVER
// returned in any API response. Only sanitized user objects.
// ============================================================

/**
 * API: Get all users (sanitized — no passwords).
 * Admin-only.
 */
function getUsers(token) {
  try {
    var auth = requireAuth(token);
    if (auth.role !== CONFIG.ROLES.ADMIN) {
      return errorResponse('FORBIDDEN', 'Only Admin can view all user accounts.');
    }

    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var users = sheetToObjects(sheet);

    // Strip all sensitive fields before returning
    var safeUsers = users.map(function(u) { return sanitizeUserForResponse(u); });

    return successResponse({ users: safeUsers, totalCount: safeUsers.length });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to retrieve users.');
  }
}

/**
 * API: Create a new user account.
 * Admin-only. Password is hashed before storage.
 * Plain-text password is NEVER stored or logged.
 *
 * @param {string} token
 * @param {Object} userData - { FullName, Username, Password, Role, Email, Phone, Designation }
 */
function createUser(token, userData) {
  try {
    var auth = requireAuth(token);
    if (auth.role !== CONFIG.ROLES.ADMIN) {
      return errorResponse('FORBIDDEN', 'Only Admin can create user accounts.');
    }
    if (!userData.FullName || !userData.Username || !userData.Password || !userData.Role) {
      return errorResponse('INVALID_INPUT', 'FullName, Username, Password, and Role are required.');
    }
    if (!ROLE_DEFAULTS[userData.Role]) {
      return errorResponse('INVALID_ROLE', 'Invalid role. Must be ADMIN, BILLING_STAFF, or USER.');
    }

    var sheet = getSheet(CONFIG.SHEETS.USERS);

    // Check username uniqueness
    var existing = findRowByKey(sheet, 'Username', userData.Username);
    if (existing) {
      return errorResponse('DUPLICATE_USERNAME', 'Username "' + userData.Username + '" is already in use.');
    }

    var seq = getNextSequence(sheet, 'UserID');
    var userID = CONFIG.ID_PREFIX.USER + '-' + userData.Role.substring(0, 5) + '-' + String(seq).padStart(3, '0');

    appendRow(sheet, {
      UserID:       userID,
      FullName:     sanitizeInput(userData.FullName),
      Username:     sanitizeInput(userData.Username),
      PasswordHash: hashPassword(userData.Password),   // Plain text password immediately hashed
      Role:         userData.Role,
      Email:        sanitizeInput(userData.Email || ''),
      Phone:        sanitizeInput(userData.Phone || ''),
      Designation:  sanitizeInput(userData.Designation || ''),
      AvatarURL:    userData.AvatarURL || '',
      LastLogin:    '',
      IsActive:     'true',
      PinCode:      hashPassword(userData.Pin || '0000'),
      RecoveryKey:  '',
      CreatedAt:    nowIST(),
      UpdatedAt:    nowIST()
    });

    logAudit(auth.userID, auth.username, auth.role,
      CONFIG.AUDIT_ACTIONS.USER_CREATED,
      'Created new user account: ' + userData.Username + ' (Role: ' + userData.Role + ')',
      '');

    return successResponse({ userID: userID }, 'User account created successfully.');
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to create user.');
  }
}

/**
 * API: Update an existing user's non-sensitive details.
 * Admin-only. Use changePassword separately for password changes.
 */
function updateUser(token, userID, updateData) {
  try {
    var auth = requireAuth(token);
    if (auth.role !== CONFIG.ROLES.ADMIN) {
      return errorResponse('FORBIDDEN', 'Only Admin can update user accounts.');
    }

    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var user = findRowByKey(sheet, 'UserID', userID);
    if (!user) {
      return errorResponse('USER_NOT_FOUND', 'User with ID ' + userID + ' not found.');
    }

    // Never allow password update through this endpoint
    delete updateData.PasswordHash;
    delete updateData.Password;
    delete updateData.PinCode;
    delete updateData.RecoveryKey;

    updateData.UpdatedAt = nowIST();
    updateRowByKey(sheet, 'UserID', userID, updateData);

    logAudit(auth.userID, auth.username, auth.role,
      CONFIG.AUDIT_ACTIONS.USER_UPDATED,
      'Updated user account: ' + user.Username + ' (UserID: ' + userID + ')',
      '');

    return successResponse(null, 'User updated successfully.');
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to update user.');
  }
}

/**
 * API: Deactivate a user account (soft delete).
 * Admin-only. Cannot deactivate the last active Admin.
 */
function deactivateUser(token, userID) {
  try {
    var auth = requireAuth(token);
    if (auth.role !== CONFIG.ROLES.ADMIN) {
      return errorResponse('FORBIDDEN', 'Only Admin can deactivate user accounts.');
    }

    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var user = findRowByKey(sheet, 'UserID', userID);
    if (!user) {
      return errorResponse('USER_NOT_FOUND', 'User not found.');
    }

    // Safety: Cannot deactivate the last active Admin
    if (user.Role === CONFIG.ROLES.ADMIN) {
      var all = sheetToObjects(sheet);
      var activeAdmins = all.filter(function(u) {
        return u.Role === CONFIG.ROLES.ADMIN && String(u.IsActive).toLowerCase() === 'true';
      });
      if (activeAdmins.length <= 1) {
        return errorResponse('SAFETY_GUARD', 'Cannot deactivate the only active Admin account.');
      }
    }

    updateRowByKey(sheet, 'UserID', userID, {
      IsActive: 'false',
      UpdatedAt: nowIST()
    });

    logAudit(auth.userID, auth.username, auth.role,
      CONFIG.AUDIT_ACTIONS.USER_DELETED,
      'Deactivated user account: ' + user.Username,
      '');

    return successResponse(null, 'User account deactivated.');
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to deactivate user.');
  }
}
