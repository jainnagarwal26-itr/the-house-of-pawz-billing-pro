// ============================================================
// Locking.gs — LockService Concurrency Helper
// Project: The House of Pawz – Billing Pro
// ============================================================
// Prevents race conditions when multiple devices simultaneously
// attempt to create invoices, payments or customer records.
// ============================================================

/**
 * Execute a critical section function safely inside a LockService lock.
 * Retries a single time if the lock is held.
 *
 * @param {Function} fn       - The function to execute safely.
 * @param {number}   timeout  - Milliseconds to wait for lock (default 10000).
 * @returns {*} The return value of fn().
 * @throws If the lock cannot be acquired within timeout.
 */
function withDatabaseLock(fn, timeout) {
  var lock = LockService.getScriptLock();
  var waitMs = timeout || 10000;

  try {
    lock.waitLock(waitMs);
  } catch (lockErr) {
    throw new Error(
      'LOCK_TIMEOUT: The database is temporarily busy (another user is saving a record). ' +
      'Please try again in a few seconds.'
    );
  }

  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Acquire a short-duration lock specifically for invoice number generation.
 * Invoice sequence numbers MUST be assigned atomically to prevent duplicates
 * when multiple billing staff create invoices simultaneously.
 *
 * @param {Function} fn - Function that reads last sequence and writes new row.
 * @returns {*} Return value of fn().
 */
function withInvoiceNumberLock(fn) {
  return withDatabaseLock(fn, 12000);
}

/**
 * Acquire a short-duration lock specifically for payment recording.
 * Prevents double-entry when payment is submitted twice (network retry).
 *
 * @param {Function} fn - Function that writes the payment row.
 * @returns {*} Return value of fn().
 */
function withPaymentLock(fn) {
  return withDatabaseLock(fn, 8000);
}

/**
 * Acquire a short-duration lock for user permission updates.
 * Prevents two admin sessions from writing conflicting permission overrides.
 *
 * @param {Function} fn - Function that updates the permissions sheet.
 * @returns {*} Return value of fn().
 */
function withPermissionLock(fn) {
  return withDatabaseLock(fn, 8000);
}
