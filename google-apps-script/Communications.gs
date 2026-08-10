// ============================================================
// Communications.gs — Communication Centre Logs API
// Project: The House of Pawz – Billing Pro
// ============================================================

function getCommunicationLogs(token, params) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'communication_center_view');

    var sheet = getSheet(CONFIG.SHEETS.COMM_LOGS);
    var logs = sheetToObjects(sheet);

    if (params && params.customerID) {
      logs = logs.filter(function(l) { return l.CustomerID === params.customerID; });
    }
    if (params && params.channel) {
      logs = logs.filter(function(l) { return l.Channel === params.channel; });
    }

    logs.reverse(); // Newest first
    return successResponse({ logs: logs, totalCount: logs.length });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to retrieve communication logs.');
  }
}

function logCommunication(token, commData) {
  try {
    var auth = requireAuth(token);
    var sheet = getSheet(CONFIG.SHEETS.COMM_LOGS);
    var seq = getNextSequence(sheet, 'CommLogID');

    appendRow(sheet, {
      CommLogID:    generateID(CONFIG.ID_PREFIX.COMM, seq),
      Timestamp:    nowIST(),
      Date:         todayIST(),
      CustomerID:   commData.CustomerID || '',
      CustomerName: sanitizeInput(commData.CustomerName || ''),
      DocumentType: commData.DocumentType || '',
      DocumentRef:  commData.DocumentRef || '',
      Channel:      commData.Channel || '',
      UserName:     auth.username,
      Status:       commData.Status || 'Sent',
      Notes:        sanitizeInput(commData.Notes || '')
    });

    return successResponse(null, 'Communication logged.');
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to log communication.');
  }
}
