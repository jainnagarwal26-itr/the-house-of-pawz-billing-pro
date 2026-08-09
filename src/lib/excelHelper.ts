import ExcelJS from 'exceljs';
import { Customer, Pet, Invoice, Payment, User, CompanySettings, AuditLog, RecurringSubscription } from '../types';

async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  // 1. Generate Buffer
  const buffer = await wb.xlsx.writeBuffer();

  // 2. Read back & validate OOXML workbook integrity
  const validationWb = new ExcelJS.Workbook();
  await validationWb.xlsx.load(buffer as ArrayBuffer);
  if (!validationWb.worksheets || validationWb.worksheets.length === 0) {
    throw new Error('Excel Validation Error: Generated workbook is invalid or corrupted.');
  }

  // 3. Trigger Download of verified Microsoft Office Open XML (.xlsx) file
  const uint8Array = new Uint8Array(buffer);
  const blob = new Blob([uint8Array], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function addStyledSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  data: Array<Record<string, any>>
) {
  const ws = wb.addWorksheet(sheetName, {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    },
    views: [
      { state: 'frozen', xSplit: 0, ySplit: 1, showGridLines: true }
    ]
  });

  if (!data || data.length === 0) {
    ws.addRow(['Information']);
    ws.addRow(['No records available for this section']);
    return ws;
  }

  const keys = Object.keys(data[0]);

  // Set column definitions with headers and auto widths
  ws.columns = keys.map(key => {
    let maxLen = key.toString().length;
    data.forEach(row => {
      const val = row[key];
      if (val !== undefined && val !== null) {
        const strVal = typeof val === 'object' ? JSON.stringify(val) : val.toString();
        maxLen = Math.max(maxLen, strVal.length);
      }
    });
    return {
      header: key,
      key: key,
      width: Math.min(Math.max(maxLen + 4, 12), 50)
    };
  });

  // Add data rows cleanly mapped to keys
  data.forEach(item => {
    const rowValues: Record<string, any> = {};
    keys.forEach(k => {
      const val = item[k];
      if (val === undefined || val === null) {
        rowValues[k] = '';
      } else if (typeof val === 'number') {
        rowValues[k] = Number.isNaN(val) ? 0 : val;
      } else {
        rowValues[k] = val;
      }
    });
    ws.addRow(rowValues);
  });

  // Header row formatting (Row 1)
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Slate 800 dark navy header
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF0F172A' } }
    };
  });

  // Data rows formatting
  ws.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.height = 22;
      const isEven = rowNumber % 2 === 0;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { size: 10, name: 'Calibri', color: { argb: 'FF1E293B' } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        if (isEven) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' } // Subtle zebra striping
          };
        }
      });
    }
  });

  return ws;
}

export async function exportFullDatabaseToExcel(data: {
  customers: Customer[];
  pets: Pet[];
  invoices: Invoice[];
  payments: Payment[];
  users: User[];
  settings: CompanySettings;
  auditLogs: AuditLog[];
  recurring: RecurringSubscription[];
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'The House of Pawz';
  wb.lastModifiedBy = 'Chirag Jain, CA';
  wb.created = new Date();
  wb.modified = new Date();

  // 1. Customers Sheet
  const customersData = data.customers.map(c => ({
    'Customer ID': c.id,
    'Full Name': c.name,
    'Phone': c.phone,
    'Email': c.email,
    'Address': c.address,
    'GSTIN': c.gstin || 'N/A',
    'State Code': c.stateCode,
    'Emergency Contact': c.emergencyContact,
    'Outstanding Balance (INR)': c.outstandingBalance,
    'Created At': c.createdAt
  }));
  addStyledSheet(wb, 'Customers', customersData);

  // 2. Pets Sheet
  const petsData = data.pets.map(p => ({
    'Pet ID': p.id,
    'Customer ID': p.customerId,
    'Customer Name': p.customerName,
    'Pet Name': p.name,
    'Species': p.species,
    'Breed': p.breed,
    'Age': p.age,
    'Gender': p.gender,
    'Vaccination Status': p.vaccinationStatus,
    'Boarding Status': p.isBoardingNow ? 'Currently Checked-In' : 'Checked-Out',
    'Room No': p.roomNo || 'N/A',
    'Microchip / Barcode': p.microchipId || p.barcode || 'N/A',
    'Medical Notes': p.medicalNotes || 'None',
    'Feeding Preferences': p.feedingPreferences || 'Standard'
  }));
  addStyledSheet(wb, 'Pets', petsData);

  // 3. Invoices Sheet
  const invoicesData = data.invoices.map(inv => ({
    'Invoice Number': inv.invoiceNumber,
    'Date': inv.invoiceDate,
    'Due Date': inv.dueDate,
    'Customer Name': inv.customerName,
    'Customer Phone': inv.customerPhone,
    'Customer GSTIN': inv.customerGSTIN || 'URP',
    'Pet Name': inv.petName || 'N/A',
    'Place of Supply': inv.placeOfSupply,
    'Is InterState': inv.isInterState ? 'YES' : 'NO',
    'Taxable Value (INR)': inv.taxableAmount,
    'CGST (INR)': inv.cgstTotal,
    'SGST (INR)': inv.sgstTotal,
    'IGST (INR)': inv.igstTotal,
    'Total GST (INR)': inv.totalGst,
    'Round Off (INR)': inv.roundOff,
    'Grand Total (INR)': inv.grandTotal,
    'Paid Amount (INR)': inv.paidAmount,
    'Balance Due (INR)': inv.balanceDue,
    'Payment Status': inv.paymentStatus,
    'Payment Mode': inv.paymentMode,
    'Created By': `${inv.createdByName} (${inv.createdByRole})`
  }));
  addStyledSheet(wb, 'Invoices', invoicesData);

  // 4. Invoice_Items Sheet
  const invoiceItemsData: Array<Record<string, unknown>> = [];
  data.invoices.forEach(inv => {
    inv.items.forEach(item => {
      invoiceItemsData.push({
        'Invoice Number': inv.invoiceNumber,
        'Item Type': item.type,
        'Item Name': item.name,
        'HSN/SAC': item.hsnSac,
        'Rate (INR)': item.price,
        'Quantity': item.qty,
        'Discount (%)': item.discount,
        'Taxable Value (INR)': item.taxableValue,
        'GST Rate (%)': item.gstRate,
        'CGST (INR)': item.cgstAmount,
        'SGST (INR)': item.sgstAmount,
        'IGST (INR)': item.igstAmount,
        'Item Total (INR)': item.total
      });
    });
  });
  addStyledSheet(wb, 'Invoice_Items', invoiceItemsData);

  // 5. Payments Sheet
  const paymentsData = data.payments.map(pay => ({
    'Payment ID': pay.id,
    'Invoice Number': pay.invoiceNumber,
    'Customer Name': pay.customerName,
    'Amount (INR)': pay.amount,
    'Payment Date': pay.paymentDate,
    'Payment Mode': pay.paymentMode,
    'Transaction Ref': pay.transactionRef || 'N/A',
    'Received By': pay.receivedBy,
    'Notes': pay.notes || ''
  }));
  addStyledSheet(wb, 'Payments', paymentsData);

  // 6. Users Sheet
  const usersData = data.users.map(u => ({
    'User ID': u.id,
    'Full Name': u.name,
    'Username': u.username,
    'Role': u.role,
    'Email': u.email,
    'Phone': u.phone,
    'Last Login': u.lastLogin,
    'Status': u.isActive ? 'Active' : 'Inactive',
    'Custom Permissions': Object.keys(u.permissions || {}).filter(k => u.permissions![k]).join(', ') || 'Role Defaults'
  }));
  addStyledSheet(wb, 'Users', usersData);

  // 7. Settings Sheet
  const settingsData = [{
    'Company Name': data.settings.companyName,
    'Tagline': data.settings.tagline,
    'Address': data.settings.address,
    'City State Zip': data.settings.cityStateZip,
    'Phone': data.settings.phone,
    'Email': data.settings.email,
    'GSTIN': data.settings.gstin,
    'State Code': data.settings.stateCode,
    'Bank Name': data.settings.bankName,
    'Account No': data.settings.accountNo,
    'IFSC Code': data.settings.ifscCode,
    'UPI ID': data.settings.upiId,
    'Invoice Prefix': data.settings.invoicePrefix,
    'Financial Year': data.settings.financialYear
  }];
  addStyledSheet(wb, 'Settings', settingsData);

  // 8. GST_Reports Sheet
  const gstReportsData = data.invoices
    .filter(inv => !inv.isCancelled)
    .map(inv => ({
      'Invoice No': inv.invoiceNumber,
      'Invoice Date': inv.invoiceDate,
      'Customer Name': inv.customerName,
      'GSTIN / UIN': inv.customerGSTIN || 'Unregistered',
      'Place Of Supply': inv.placeOfSupply,
      'Invoice Value (INR)': inv.grandTotal,
      'Taxable Value (INR)': inv.taxableAmount,
      'Integrated Tax (IGST)': inv.igstTotal,
      'Central Tax (CGST)': inv.cgstTotal,
      'State Tax (SGST)': inv.sgstTotal,
      'Total Tax Amount': inv.totalGst
    }));
  addStyledSheet(wb, 'GST_Reports', gstReportsData);

  // 9. Audit_Logs Sheet
  const auditData = data.auditLogs.map(log => ({
    'Log ID': log.id,
    'Timestamp': log.timestamp,
    'User Name': log.userName,
    'User Role': log.userRole,
    'Action Code': log.action,
    'Details': log.details
  }));
  addStyledSheet(wb, 'Audit_Logs', auditData);

  await downloadWorkbook(wb, 'THOP_BILLING_DATABASE.xlsx');
}

export async function exportGSTReportToExcel(invoices: Invoice[], settings: CompanySettings) {
  const wb = new ExcelJS.Workbook();
  wb.creator = settings.companyName;
  wb.lastModifiedBy = 'Chirag Jain, CA';
  wb.created = new Date();

  const activeInvoices = invoices.filter(i => !i.isCancelled);

  // GSTR-1 B2B (Invoices to GST registered customers)
  const b2bInvoices = activeInvoices.filter(i => i.customerGSTIN && i.customerGSTIN.trim().length > 5);
  const b2bRows = b2bInvoices.map(inv => ({
    'GSTIN/UIN of Recipient': inv.customerGSTIN,
    'Receiver Name': inv.customerName,
    'Invoice Number': inv.invoiceNumber,
    'Invoice Date': inv.invoiceDate,
    'Invoice Value (₹)': inv.grandTotal,
    'Place Of Supply': inv.placeOfSupply,
    'Reverse Charge': 'N',
    'Invoice Type': 'Regular',
    'E-Commerce GSTIN': '',
    'Rate (%)': 18,
    'Taxable Value (₹)': inv.taxableAmount,
    'Cess Amount': 0
  }));

  // GSTR-1 B2C (Invoices to Unregistered Customers)
  const b2cInvoices = activeInvoices.filter(i => !i.customerGSTIN || i.customerGSTIN.trim().length <= 5);
  const b2cRows = b2cInvoices.map(inv => ({
    'Type': 'OE',
    'Place Of Supply': inv.placeOfSupply,
    'Rate (%)': 18,
    'Taxable Value (₹)': inv.taxableAmount,
    'Cess Amount': 0,
    'E-Commerce GSTIN': '',
    'Count': 1
  }));

  // HSN Summary Sheet
  const hsnMap: Record<string, { description: string; totalQty: number; totalVal: number; taxableVal: number; cgst: number; sgst: number; igst: number }> = {};
  
  activeInvoices.forEach(inv => {
    inv.items.forEach(item => {
      const code = item.hsnSac || '999799';
      if (!hsnMap[code]) {
        hsnMap[code] = {
          description: item.name,
          totalQty: 0,
          totalVal: 0,
          taxableVal: 0,
          cgst: 0,
          sgst: 0,
          igst: 0
        };
      }
      hsnMap[code].totalQty += item.qty;
      hsnMap[code].totalVal += item.total;
      hsnMap[code].taxableVal += item.taxableValue;
      hsnMap[code].cgst += item.cgstAmount;
      hsnMap[code].sgst += item.sgstAmount;
      hsnMap[code].igst += item.igstAmount;
    });
  });

  const hsnRows = Object.entries(hsnMap).map(([code, val]) => ({
    'HSN/SAC Code': code,
    'Description': val.description,
    'UQC': 'OTH - OTHERS',
    'Total Quantity': val.totalQty,
    'Total Value (₹)': val.totalVal,
    'Taxable Value (₹)': val.taxableVal,
    'Integrated Tax (₹)': val.igst,
    'Central Tax (₹)': val.cgst,
    'State Tax (₹)': val.sgst,
    'Cess (₹)': 0
  }));

  addStyledSheet(wb, 'B2B_Invoices', b2bRows.length > 0 ? b2bRows : [{ 'Info': 'No B2B Invoices for period' }]);
  addStyledSheet(wb, 'B2C_Summary', b2cRows.length > 0 ? b2cRows : [{ 'Info': 'No B2C Invoices for period' }]);
  addStyledSheet(wb, 'HSN_Summary', hsnRows.length > 0 ? hsnRows : [{ 'Info': 'No HSN Summary data' }]);

  await downloadWorkbook(wb, `GSTR1_Report_${settings.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_FY26-27.xlsx`);
}
