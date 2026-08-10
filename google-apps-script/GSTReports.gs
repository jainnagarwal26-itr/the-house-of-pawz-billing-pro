// ============================================================
// GSTReports.gs — GST Reporting API
// Project: The House of Pawz – Billing Pro
// ============================================================

/**
 * API: Get GSTR-1 and GST summary data for a given financial year
 * and optional date range.
 */
function getGSTReports(token, params) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'gst_reports_view');

    var fy = (params && params.financialYear) ? params.financialYear : getFinancialYear(new Date());

    var invoiceSheet = getSheet(CONFIG.SHEETS.INVOICES);
    var itemsSheet = getSheet(CONFIG.SHEETS.INVOICE_ITEMS);

    var allInvoices = sheetToObjects(invoiceSheet);
    var fyInvoices = allInvoices.filter(function(i) {
      return i.FinancialYear === fy && String(i.IsCancelled).toLowerCase() !== 'true';
    });

    // B2B: Registered customers with valid GSTIN
    var b2b = fyInvoices.filter(function(i) {
      return i.CustomerGSTIN && String(i.CustomerGSTIN).trim().length === 15;
    });

    // B2C: Unregistered customers
    var b2c = fyInvoices.filter(function(i) {
      return !i.CustomerGSTIN || String(i.CustomerGSTIN).trim().length < 15;
    });

    // HSN Summary from Invoice_Items
    var allItems = sheetToObjects(itemsSheet);
    var fyInvoiceIDs = fyInvoices.map(function(i) { return i.InternalInvoiceID; });
    var fyItems = allItems.filter(function(item) {
      return fyInvoiceIDs.indexOf(item.InternalInvoiceID) !== -1;
    });

    var hsnMap = {};
    fyItems.forEach(function(item) {
      var hsn = item.HSNSAC || 'UNKNOWN';
      if (!hsnMap[hsn]) {
        hsnMap[hsn] = { HSNSAC: hsn, Description: item.ItemName, TaxableValue: 0, GSTRate: item.GSTRate || 18, CGSTAmount: 0, SGSTAmount: 0, IGSTAmount: 0, TotalTax: 0 };
      }
      hsnMap[hsn].TaxableValue += parseFloat(item.TaxableValue) || 0;
      hsnMap[hsn].CGSTAmount += parseFloat(item.CGSTAmount) || 0;
      hsnMap[hsn].SGSTAmount += parseFloat(item.SGSTAmount) || 0;
      hsnMap[hsn].IGSTAmount += parseFloat(item.IGSTAmount) || 0;
      hsnMap[hsn].TotalTax += (parseFloat(item.CGSTAmount) || 0) + (parseFloat(item.SGSTAmount) || 0) + (parseFloat(item.IGSTAmount) || 0);
    });

    // Totals
    function sumField(arr, field) {
      return arr.reduce(function(s, i) { return s + (parseFloat(i[field]) || 0); }, 0);
    }

    return successResponse({
      financialYear: fy,
      b2b: b2b,
      b2c: b2c,
      hsnSummary: Object.values(hsnMap),
      totals: {
        totalInvoices: fyInvoices.length,
        b2bCount: b2b.length,
        b2cCount: b2c.length,
        totalTaxable: sumField(fyInvoices, 'TaxableAmount'),
        totalCGST: sumField(fyInvoices, 'CGSTTotal'),
        totalSGST: sumField(fyInvoices, 'SGSTTotal'),
        totalIGST: sumField(fyInvoices, 'IGSTTotal'),
        totalGST: sumField(fyInvoices, 'TotalGST'),
        totalInvoiceValue: sumField(fyInvoices, 'GrandTotal')
      }
    });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to generate GST report.');
  }
}
