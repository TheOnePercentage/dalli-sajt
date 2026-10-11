/**
 * Physical Store Integration - Phase 24
 */

export function createStoreSale(sale) {
  return {
    id: `store_${Date.now()}`,
    storeId: sale.storeId,
    channel: 'store',
    items: sale.items || [],
    totals: sale.totals || {},
    createdAt: new Date().toISOString()
  };
}
