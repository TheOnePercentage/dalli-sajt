/**
 * Inventory Intelligence - Phase 22
 * Architecture only
 */

export function detectLowStock(items = []) {
  return items.filter(i => i.stock && i.stock < (i.minStock || 10));
}

export function detectDeadInventory(items = []) {
  return items.filter(i => i.daysSinceSale && i.daysSinceSale > 90);
}

export function detectFastMoving(items = []) {
  return items.filter(i => i.salesVelocity && i.salesVelocity > 5);
}

export function detectSlowMoving(items = []) {
  return items.filter(i => i.salesVelocity && i.salesVelocity < 1 && i.daysInStock > 30);
}
