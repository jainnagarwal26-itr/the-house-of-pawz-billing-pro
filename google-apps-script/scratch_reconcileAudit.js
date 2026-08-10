const fs = require('fs');

// Read initialClientData.ts
const content = fs.readFileSync('./src/lib/initialClientData.ts', 'utf8');

// Simple regex extraction or parsing of INITIAL_INVOICES
const invMatch = content.match(/export const INITIAL_INVOICES: Invoice\[\] = (\[[\s\S]*?\]);/);
if (!invMatch) {
  console.error("Could not match INITIAL_INVOICES");
  process.exit(1);
}

const invoices = JSON.parse(invMatch[1]);
console.log(`Extracted ${invoices.length} invoices from baseline.`);

let totalTaxable = 0;
let totalGST = 0;
let totalGrand = 0;

invoices.forEach((inv, i) => {
  totalTaxable += inv.taxableAmount || 0;
  totalGST += inv.totalGst || 0;
  totalGrand += inv.grandTotal || 0;
});

console.log(`Total Taxable: ₹${totalTaxable.toFixed(2)}`);
console.log(`Total GST:     ₹${totalGST.toFixed(2)}`);
console.log(`Total Grand:   ₹${totalGrand.toFixed(2)}`);
