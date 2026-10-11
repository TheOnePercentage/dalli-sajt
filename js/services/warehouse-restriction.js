/**
 * Warehouse Restriction System
 * Warehouse employees may view only: Order Data, Shipping Address, Customer Name, Phone Number, Order Contents, Tracking Status.
 * Nothing else.
 */

function enforceWarehouseRestriction(config) {
  const wr = config?.warehouseRestriction || {};
  
  window.DALLI_WAREHOUSE_RESTRICTION = {
    enabled: wr.enabled !== false,
    allowedFields: ['orderData', 'shippingAddress', 'customerName', 'phoneNumber', 'orderContents', 'trackingStatus'],
    forbiddenFields: [
      'customerSpend', 'membershipTier', 'vipStatus', 'financialReports', 
      'profitData', 'customerIntelligence', 'customerEmail', 'customerAddress',
      'paymentMethod', 'paymentAmount', 'discounts', 'margins', 'profitData'
    ],
  };
  
  if (typeof window !== 'undefined') {
    window.DALLI_WAREHOUSE_RESTRICTION_SERVICE = {
      filterOrderData: (orderData, role) => {
        if (['warehouse_worker', 'warehouse_manager', 'picking_team', 'packing_team', 'shipping_team'].includes(role)) {
          const allowed = ['orderData', 'shippingAddress', 'customerName', 'phoneNumber', 'orderContents', 'trackingStatus'];
          const filtered = {};
          allowed.forEach(key => {
            if (orderData[key] !== undefined) filtered[key] = orderData[key];
          });
          return filtered;
        }
        return orderData;
      },
      canAccessField: (role, field) => {
        if (['warehouse_worker', 'picking_team', 'packing_team', 'shipping_team'].includes(role)) {
          const allowed = ['orderData', 'shippingAddress', 'customerName', 'phoneNumber', 'orderContents', 'trackingStatus'];
          return allowed.includes(field);
        }
        if (role === 'warehouse_manager') {
          // Warehouse managers get slightly more access
          const allowed = ['orderData', 'shippingAddress', 'customerName', 'phoneNumber', 'orderContents', 'trackingStatus', 'customerEmail'];
          return allowed.includes(field);
        }
        return true; // Other roles get full access
      },
    };
  }
  
  return { enforced: true };
}

export default { enforceWarehouseRestriction };