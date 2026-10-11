/**
 * Warehouse Scanner System - Phase 25
 */
export const SCANNER_TYPES = ['barcode', 'qr', 'bluetooth', 'usb', 'camera'];
export function validateScan(item, scannedCode) {
  if (item.sku === scannedCode || item.barcode === scannedCode) return {valid: true};
  return {valid: false, error: 'MISMATCH'};
}
