// ============================================================
// Customers.gs — Customer Master API
// Project: The House of Pawz – Billing Pro
// ============================================================

/**
 * API: Get all customers.
 * Requires authentication.
 */
function getCustomers(token, params) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'customers_view');

    var sheet = getSheet(CONFIG.SHEETS.CUSTOMERS);
    var customers = sheetToObjects(sheet);

    // Optional search filter
    if (params && params.search) {
      var q = String(params.search).toLowerCase();
      customers = customers.filter(function(c) {
        return (
          String(c.FullName).toLowerCase().includes(q) ||
          String(c.Phone).toLowerCase().includes(q) ||
          String(c.Email).toLowerCase().includes(q) ||
          String(c.GSTIN).toLowerCase().includes(q)
        );
      });
    }

    return successResponse({ customers: customers, totalCount: customers.length });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to retrieve customers.');
  }
}

/**
 * API: Create or update a customer record.
 * Requires authentication and customers_create or customers_edit permission.
 *
 * @param {string} token
 * @param {Object} customerData - Customer record. If CustomerID is provided, updates.
 */
function saveCustomer(token, customerData) {
  try {
    var auth = requireAuth(token);

    var sheet = getSheet(CONFIG.SHEETS.CUSTOMERS);
    var isUpdate = false;
    var existing = null;
    if (customerData.CustomerID) {
      existing = findRowByKey(sheet, 'CustomerID', customerData.CustomerID);
      if (existing) {
        isUpdate = true;
      }
    }

    if (isUpdate) {
      requirePermission(auth, 'customers_edit');
      customerData.UpdatedAt = nowIST();
      // Preserve immutable fields
      delete customerData.CreatedAt;
      updateRowByKey(sheet, 'CustomerID', customerData.CustomerID, customerData);

      logAudit(auth.userID, auth.username, auth.role,
        CONFIG.AUDIT_ACTIONS.CUSTOMER_UPDATED,
        'Updated customer: ' + customerData.FullName + ' (' + customerData.CustomerID + ')',
        '');
      return successResponse({ customerID: customerData.CustomerID }, 'Customer updated.');
    } else {
      requirePermission(auth, 'customers_create');
      if (!customerData.FullName || !customerData.Phone) {
        return errorResponse('INVALID_INPUT', 'FullName and Phone are required to create a customer.');
      }

      var seq = getNextSequence(sheet, 'CustomerID');
      var customerID = generateID(CONFIG.ID_PREFIX.CUSTOMER, seq);

      appendRow(sheet, {
        CustomerID:        customerID,
        FullName:          sanitizeInput(customerData.FullName),
        Phone:             sanitizeInput(customerData.Phone),
        Email:             sanitizeInput(customerData.Email || ''),
        Address:           sanitizeInput(customerData.Address || ''),
        GSTIN:             sanitizeInput(customerData.GSTIN || ''),
        StateCode:         customerData.StateCode || '',
        EmergencyContact:  sanitizeInput(customerData.EmergencyContact || ''),
        OutstandingBalance: customerData.OutstandingBalance || 0,
        AdvanceBalance:    customerData.AdvanceBalance || 0,
        CreatedAt:         nowIST(),
        UpdatedAt:         nowIST()
      });

      logAudit(auth.userID, auth.username, auth.role,
        CONFIG.AUDIT_ACTIONS.CUSTOMER_CREATED,
        'Created new customer: ' + customerData.FullName + ' (' + customerID + ')',
        '');
      return successResponse({ customerID: customerID }, 'Customer created.');
    }
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to save customer.');
  }
}

/**
 * API: Delete a customer record. Requires customers_delete permission.
 */
function deleteCustomer(token, customerID) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'customers_delete');

    var sheet = getSheet(CONFIG.SHEETS.CUSTOMERS);
    var deleted = deleteRowByKey(sheet, 'CustomerID', customerID);
    if (!deleted) return errorResponse('NOT_FOUND', 'Customer not found to delete.');

    logAudit(auth.userID, auth.username, auth.role,
      CONFIG.AUDIT_ACTIONS.CUSTOMER_UPDATED,
      'Deleted customer: ' + customerID, '');

    return successResponse(null, 'Customer deleted.');
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to delete customer.');
  }
}
