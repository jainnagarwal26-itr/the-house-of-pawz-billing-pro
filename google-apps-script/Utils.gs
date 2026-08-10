// ============================================================
// Utils.gs — Shared Utilities & Helpers
// Project: The House of Pawz – Billing Pro
// ============================================================

/**
 * Standard success response envelope.
 */
function successResponse(data, message) {
  return {
    success: true,
    data: data || null,
    message: message || 'OK'
  };
}

/**
 * Standard error response envelope.
 * Never exposes raw stack traces or passwords.
 */
function errorResponse(errorCode, humanMessage) {
  return {
    success: false,
    error: errorCode || 'UNKNOWN_ERROR',
    message: humanMessage || 'An unexpected error occurred. Please try again.'
  };
}

/**
 * Convert a sheet's data rows to an array of objects using the header row.
 * Row 1 = headers, rows 2+ = data.
 */
function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    var isEmpty = true;
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, 'Asia/Kolkata', 'dd/MM/yyyy HH:mm:ss');
      }
      if (val !== '' && val !== null && val !== undefined) isEmpty = false;
      obj[headers[j]] = (val === null || val === undefined) ? '' : val;
    }
    if (!isEmpty) rows.push(obj);
  }
  return rows;
}

/**
 * Append a new data row to a sheet, mapped by header names.
 * Columns not in headers are silently ignored.
 */
function appendRow(sheet, dataObj) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function(h) {
    var val = dataObj[h];
    return (val === undefined || val === null) ? '' : val;
  });
  sheet.appendRow(row);
}

/**
 * Update an existing row in a sheet by matching a key column value.
 * Returns true if a matching row was found and updated.
 *
 * @param {Sheet} sheet
 * @param {string} keyColumn - Header name to match on (e.g. 'CustomerID')
 * @param {string} keyValue  - Value to match
 * @param {Object} dataObj   - New values to apply
 */
function updateRowByKey(sheet, keyColumn, keyValue, dataObj) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var keyIndex = headers.indexOf(keyColumn);
  if (keyIndex === -1) return false;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][keyIndex]).trim() === String(keyValue).trim()) {
      // Update only the columns present in dataObj
      for (var col in dataObj) {
        var colIdx = headers.indexOf(col);
        if (colIdx !== -1) {
          sheet.getRange(i + 1, colIdx + 1).setValue(dataObj[col]);
        }
      }
      return true;
    }
  }
  return false;
}

/**
 * Find a single row object by matching a key column value.
 * Returns the row object or null if not found.
 */
function findRowByKey(sheet, keyColumn, keyValue) {
  var rows = sheetToObjects(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][keyColumn]).trim() === String(keyValue).trim()) {
      return rows[i];
    }
  }
  return null;
}

/**
 * Generate a zero-padded sequential ID such as "CUST-000042"
 *
 * @param {string} prefix - e.g. "CUST"
 * @param {number} sequence - numeric value
 * @param {number} padding - total digit width, default 6
 */
function generateID(prefix, sequence, padding) {
  var pad = padding || 6;
  var seq = String(sequence);
  while (seq.length < pad) seq = '0' + seq;
  return prefix + '-' + seq;
}

/**
 * Get the next available sequence number for a given sheet primary key column.
 * Parses numeric suffix from IDs like "CUST-000042" → 42
 * Returns max + 1, or 1 if no records exist.
 *
 * MUST be called inside a LockService critical section for safety.
 */
function getNextSequence(sheet, idColumnName) {
  var rows = sheetToObjects(sheet);
  var max = 0;
  rows.forEach(function(row) {
    var id = String(row[idColumnName] || '');
    var parts = id.split('-');
    var num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num) && num > max) max = num;
  });
  return max + 1;
}

/**
 * Get the current IST timestamp as a formatted string.
 */
function nowIST() {
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM/yyyy HH:mm:ss');
}

/**
 * Get the current IST date as dd/MM/yyyy
 */
function todayIST() {
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM/yyyy');
}

/**
 * Validate that a string is a plausible Indian mobile number.
 * Accepts 10-digit numbers (strips country code if present).
 */
function isValidIndianMobile(phone) {
  if (!phone) return false;
  var digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  return digits.length === 10;
}

/**
 * Validate that a string is a basic valid GSTIN format.
 * GSTIN: 15 alphanumeric characters. Pattern: 2 digits + 10 PAN + 1 entity + Z + 1 check
 */
function isValidGSTIN(gstin) {
  if (!gstin) return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(String(gstin).trim().toUpperCase());
}

/**
 * Sanitize a string to prevent formula injection into Google Sheets.
 * Any value starting with = + - @ is prefixed with a single quote.
 */
function sanitizeInput(val) {
  if (typeof val !== 'string') return val;
  if (/^[=+\-@]/.test(val)) return "'" + val;
  return val;
}

/**
 * Return a safe copy of a user object with sensitive fields removed.
 */
function sanitizeUserForResponse(user) {
  if (!user) return null;
  var safe = JSON.parse(JSON.stringify(user));
  delete safe.PasswordHash;
  delete safe.PinCode;
  delete safe.RecoveryKey;
  return safe;
}

/**
 * Delete a single row matching keyColumn = keyValue.
 * Returns true if a row was found and deleted.
 */
function deleteRowByKey(sheet, keyColumn, keyValue) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return false;
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var keyIndex = headers.indexOf(keyColumn);
  if (keyIndex === -1) return false;

  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][keyIndex]).trim() === String(keyValue).trim()) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

/**
 * Delete all rows matching keyColumn = keyValue.
 * Returns count of deleted rows.
 */
function deleteRowsByKey(sheet, keyColumn, keyValue) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var keyIndex = headers.indexOf(keyColumn);
  if (keyIndex === -1) return 0;

  var count = 0;
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][keyIndex]).trim() === String(keyValue).trim()) {
      sheet.deleteRow(i + 1);
      count++;
    }
  }
  return count;
}
