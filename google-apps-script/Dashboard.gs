// ============================================================
// Dashboard.gs — Dashboard Summary API
// Project: The House of Pawz – Billing Pro
// ============================================================

function getDashboardSummary(token) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'dashboard_view');

    var fy = getFinancialYear(new Date());

    var invoiceSheet = getSheet(CONFIG.SHEETS.INVOICES);
    var allInvoices = sheetToObjects(invoiceSheet);
    var fyInvoices = allInvoices.filter(function(i) {
      return i.FinancialYear === fy && String(i.IsCancelled).toLowerCase() !== 'true';
    });

    // Total Sales
    var totalSales = fyInvoices.reduce(function(sum, i) { return sum + (parseFloat(i.GrandTotal) || 0); }, 0);
    var totalTaxable = fyInvoices.reduce(function(sum, i) { return sum + (parseFloat(i.TaxableAmount) || 0); }, 0);
    var totalGST = fyInvoices.reduce(function(sum, i) { return sum + (parseFloat(i.TotalGST) || 0); }, 0);
    var totalPaid = fyInvoices.reduce(function(sum, i) { return sum + (parseFloat(i.PaidAmount) || 0); }, 0);
    var totalBalance = fyInvoices.reduce(function(sum, i) { return sum + (parseFloat(i.BalanceDue) || 0); }, 0);
    var unpaidCount = fyInvoices.filter(function(i) { return i.PaymentStatus === 'UNPAID'; }).length;
    var partialCount = fyInvoices.filter(function(i) { return i.PaymentStatus === 'PARTIAL'; }).length;

    // Active Boarding Pets
    var petsSheet = getSheet(CONFIG.SHEETS.PETS);
    var boardingPets = sheetToObjects(petsSheet).filter(function(p) {
      return String(p.IsBoardingNow).toLowerCase() === 'true';
    });

    // Current Month Stats
    var now = new Date();
    var monthInvoices = fyInvoices.filter(function(i) {
      var parts = String(i.InvoiceDate).split('/');
      if (parts.length >= 2) {
        return parseInt(parts[1], 10) === (now.getMonth() + 1) &&
               parseInt(parts[2], 10) === now.getFullYear();
      }
      return false;
    });
    var monthSales = monthInvoices.reduce(function(sum, i) { return sum + (parseFloat(i.GrandTotal) || 0); }, 0);

    return successResponse({
      financialYear: fy,
      totalInvoices: fyInvoices.length,
      totalSales: totalSales,
      totalTaxable: totalTaxable,
      totalGST: totalGST,
      totalPaid: totalPaid,
      totalOutstanding: totalBalance,
      unpaidInvoiceCount: unpaidCount,
      partialInvoiceCount: partialCount,
      activeBoardingPets: boardingPets.length,
      currentMonthSales: monthSales,
      currentMonthInvoices: monthInvoices.length
    });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to load dashboard.');
  }
}
