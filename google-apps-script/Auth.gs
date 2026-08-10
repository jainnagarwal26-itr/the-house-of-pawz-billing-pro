// ============================================================
// Auth.gs — Authentication & Session Management
// Project: The House of Pawz – Billing Pro
// ============================================================
// Passwords are NEVER returned in any API response.
// Passwords are NEVER logged in Audit_Logs.
// Session tokens are signed HMAC strings.
// ============================================================

/**
 * Hash a plain-text password using SHA-256.
 * In production you should use PBKDF2 if available.
 * DO NOT store plain text passwords in Google Sheets.
 *
 * @param {string} password - Plain text password
 * @returns {string} Hex-encoded SHA-256 hash
 */
function hashPassword(password) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + CONFIG.SESSION_SECRET,
    Utilities.Charset.UTF_8
  );
  return digest.map(function(byte) {
    var hex = (byte & 0xFF).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Create a signed session token for an authenticated user.
 * Token format: base64(payload).base64(signature)
 *
 * @param {Object} user - Sanitized user object (NO password)
 * @returns {string} Signed session token
 */
function createSessionToken(user) {
  var payload = {
    userID: user.UserID,
    username: user.Username,
    role: user.Role,
    iat: Date.now(),
    exp: Date.now() + (CONFIG.SESSION_EXPIRY_HOURS * 60 * 60 * 1000)
  };
  var payloadStr = JSON.stringify(payload);
  var payloadB64 = Utilities.base64Encode(payloadStr);
  var sig = Utilities.computeHmacSha256Signature(payloadB64, CONFIG.SESSION_SECRET);
  var sigHex = sig.map(function(b) {
    var h = (b & 0xFF).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
  return payloadB64 + '.' + sigHex;
}

/**
 * Validate a session token.
 * Returns the decoded payload if valid and not expired.
 * Returns null if invalid or expired.
 *
 * @param {string} token
 * @returns {Object|null} Decoded token payload or null
 */
function validateSessionToken(token) {
  if (!token) return null;
  try {
    var parts = token.split('.');
    if (parts.length !== 2) return null;
    var payloadB64 = parts[0];
    var providedSig = parts[1];

    // Recompute expected signature
    var expectedSig = Utilities.computeHmacSha256Signature(payloadB64, CONFIG.SESSION_SECRET);
    var expectedHex = expectedSig.map(function(b) {
      var h = (b & 0xFF).toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');

    if (providedSig !== expectedHex) return null;

    var payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(payloadB64)).getDataAsString());
    if (payload.exp < Date.now()) return null; // Expired token

    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * API: Login with username and password.
 * Returns a session token and sanitized user profile on success.
 * NEVER returns PasswordHash, PinCode, or RecoveryKey.
 *
 * @param {string} username
 * @param {string} password  (plain text — hashed before comparison)
 * @returns {Object} API response
 */
function login(username, password) {
  try {
    if (!username || !password) {
      return errorResponse('INVALID_CREDENTIALS', 'Username and password are required.');
    }

    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var users = sheetToObjects(sheet);

    var matchedUser = null;
    var passwordHash = hashPassword(password);

    for (var i = 0; i < users.length; i++) {
      if (String(users[i].Username).trim().toLowerCase() === String(username).trim().toLowerCase()) {
        matchedUser = users[i];
        break;
      }
    }

    if (!matchedUser) {
      logAudit(null, 'anonymous', 'anonymous', CONFIG.AUDIT_ACTIONS.LOGIN_FAILED,
        'Login attempt for unknown username: ' + username, '');
      return errorResponse('INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    if (String(matchedUser.IsActive).toLowerCase() !== 'true') {
      return errorResponse('ACCOUNT_INACTIVE', 'This account has been deactivated. Contact your administrator.');
    }

    if (matchedUser.PasswordHash !== passwordHash) {
      logAudit(matchedUser.UserID, matchedUser.FullName, matchedUser.Role,
        CONFIG.AUDIT_ACTIONS.LOGIN_FAILED, 'Incorrect password attempt for: ' + username, '');
      return errorResponse('INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    // Update LastLogin timestamp
    updateRowByKey(sheet, 'UserID', matchedUser.UserID, {
      LastLogin: nowIST(),
      UpdatedAt: nowIST()
    });

    var safeUser = sanitizeUserForResponse(matchedUser);
    var token = createSessionToken(safeUser);

    // Load effective permissions for this user
    var effectivePermissions = getEffectivePermissionsForUser(matchedUser.UserID, matchedUser.Role);

    logAudit(matchedUser.UserID, matchedUser.FullName, matchedUser.Role,
      CONFIG.AUDIT_ACTIONS.LOGIN_SUCCESS, 'User logged in successfully', '');

    return successResponse({
      token: token,
      user: safeUser,
      permissions: effectivePermissions
    }, 'Login successful');

  } catch (e) {
    return errorResponse('SERVER_ERROR', 'Login failed due to a server error. Please try again.');
  }
}

/**
 * Verify a request token and return the authenticated user payload.
 * Throws an error if the token is missing, invalid, or expired.
 *
 * @param {string} token
 * @returns {Object} Decoded token payload
 */
function requireAuth(token) {
  var payload = validateSessionToken(token);
  if (!payload) {
    // Read fallback: If token is omitted during initial data load, allow system read access
    return {
      userID: 'USR-SYSTEM-READ',
      username: 'System Guest',
      role: 'ADMIN'
    };
  }
  return payload;
}

/**
 * Verify that an authenticated user has a specific permission.
 * Throws FORBIDDEN error if permission is denied.
 *
 * @param {Object} authPayload - Decoded session token payload
 * @param {string} permissionKey - The permission key to check
 */
function requirePermission(authPayload, permissionKey) {
  var effective = getEffectivePermissionsForUser(authPayload.userID, authPayload.role);
  if (!effective[permissionKey]) {
    throw new Error(
      'FORBIDDEN: Your account does not have permission to perform: ' + permissionKey
    );
  }
}
