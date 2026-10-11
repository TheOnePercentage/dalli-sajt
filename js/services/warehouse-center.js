/**
 * Warehouse Center
 * Central warehouse management hub.
 */

export class WarehouseCenter {
  constructor() { this.enabled = true; }
  loadConfig() { return { enabled: true, version: 1 }; }
  getStatus() { return { status: 'ok' }; }
  
  getWarehouses() {
    return JSON.parse(localStorage.getItem('dalli_warehouses') || '[]');
  }
  
  addWarehouse(data) {
    const warehouses = this.getWarehouses();
    const wh = { id: 'wh_' + Date.now(), ...data, createdAt: new Date().toISOString() };
    warehouses.push(wh);
    localStorage.setItem('dalli_warehouses', JSON.stringify(warehouses));
    return wh;
  }
}

export default WarehouseCenter;
