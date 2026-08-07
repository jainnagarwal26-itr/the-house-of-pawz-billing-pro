import React, { useState } from 'react';
import { QrCode, X, Search, CheckCircle2, ShoppingBag } from 'lucide-react';
import { CatalogItem } from '../types';
import { CATALOG_ITEMS } from '../lib/storage';

interface BarcodeScannerModalProps {
  onClose: () => void;
  onSelectProductBarcode: (item: CatalogItem) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  onClose,
  onSelectProductBarcode
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedItem, setScannedItem] = useState<CatalogItem | null>(null);

  const handleScan = (code: string) => {
    setBarcodeInput(code);
    const found = CATALOG_ITEMS.find(c => c.barcode === code || c.id === code);
    if (found) {
      setScannedItem(found);
    } else {
      setScannedItem(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-zinc-800">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-[#D62828]" />
            <h3 className="text-sm font-extrabold">Pet Supply Barcode Scanner</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Point physical barcode scanner or click preset barcodes below to auto-fetch pet products & prices:
        </p>

        {/* Input / Scanner Simulation */}
        <div className="relative">
          <input
            type="text"
            placeholder="Type or scan barcode SKU..."
            value={barcodeInput}
            onChange={e => handleScan(e.target.value)}
            className="w-full p-2.5 pl-9 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-xs font-mono font-bold"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        {/* Scanned Result Card */}
        {scannedItem ? (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900 dark:text-white">{scannedItem.name}</span>
              <span className="text-xs font-bold text-emerald-700 font-mono">₹{scannedItem.price}</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">HSN/SAC: {scannedItem.hsnSac} • Barcode: {scannedItem.barcode}</p>

            <button
              onClick={() => {
                onSelectProductBarcode(scannedItem);
                onClose();
              }}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Add to Active GST Invoice</span>
            </button>
          </div>
        ) : (
          barcodeInput && (
            <p className="text-xs text-red-500 italic">No catalog item found matching barcode "{barcodeInput}".</p>
          )
        )}

        {/* Preset Barcode Buttons for quick testing */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Click Quick Test Barcodes:
          </span>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {CATALOG_ITEMS.filter(c => c.barcode).map(item => (
              <button
                key={item.id}
                onClick={() => handleScan(item.barcode!)}
                className="w-full p-2 bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-left flex items-center justify-between text-xs transition-colors"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-zinc-200 block text-[11px]">{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.barcode}</span>
                </div>
                <span className="font-mono text-xs font-bold text-[#D62828]">₹{item.price}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
