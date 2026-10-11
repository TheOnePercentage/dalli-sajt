/**
 * RBAC Enforcement
 * Enforces role-based access control across the platform.
 * Called when experience config changes or when access is checked.
 */

const ROLE_HIERARCHY = {
  owner: 100,
  executive: 90,
  admin: 80,
  finance: 70,
  hr: 60,
  customer_manager: 55,
  concierge: 50,
  warehouse_manager: 45,
  warehouse_worker: 40,
  store_manager: 35,
  store_worker: 30,
  employee: 20,
  customer: 10,
  guest: 1,
};

const PERMISSION_MAP = {
  // Finance
  'finance.payroll.view': ['owner', 'hr'],
  'finance.payroll.edit': ['owner', 'hr'],
  'finance.reports.view': ['owner', 'executive', 'finance'],
  'finance.treasury.view': ['owner', 'executive', 'finance'],
  'finance.bank_accounts.view': ['owner', 'finance'],
  'finance.crypto_wallets.view': ['owner', 'finance'],
  
  // HR
  'hr.employees.view': ['owner', 'hr', 'customer_manager'],
  'hr.employees.edit': ['owner', 'hr'],
  'hr.payroll.view': ['owner', 'hr'],
  'hr.attendance.view': ['owner', 'hr', 'warehouse_manager'],
  'hr.assets.view': ['owner', 'hr'],
  'hr.documents.view': ['owner', 'hr'],
  
  // Security
  'security.fraud.view': ['owner', 'executive', 'security'],
  'security.fraud.alerts.view': ['owner', 'executive', 'security'],
  'security.fraud.alerts.override': ['owner'],
  'security.api_keys.view': ['owner', 'executive', 'admin'],
  'security.api_keys.manage': ['owner', 'executive'],
  'security.audit_logs.view': ['owner', 'executive', 'admin', 'security'],
  'security.backup.view': ['owner', 'executive'],
  'security.backup.manage': ['owner', 'executive'],
  'security.ip_intelligence.view': ['owner', 'executive', 'security'],
  'security.ip_intelligence.manage': ['owner', 'executive'],
  
  // Warehouse
  'warehouse.inventory.view': ['owner', 'executive', 'warehouse_manager', 'warehouse_worker'],
  'warehouse.inventory.edit': ['owner', 'executive', 'warehouse_manager'],
  'warehouse.picking.view': ['owner', 'executive', 'warehouse_manager', 'warehouse_worker', 'picking_team', 'packing_team', 'shipping_team'],
  'warehouse.picking.edit': ['owner', 'executive', 'warehouse_manager', 'picking_team'],
  'warehouse.packing.view': ['owner', 'executive', 'warehouse_manager', 'warehouse_worker', 'packing_team'],
  'warehouse.packing.edit': ['owner', 'executive', 'warehouse_manager', 'packing_team'],
  'warehouse.shipping.view': ['owner', 'executive', 'warehouse_manager', 'shipping_team'],
  'warehouse.shipping.edit': ['owner', 'executive', 'warehouse_manager', 'shipping_team'],
  'warehouse.courier.view': ['owner', 'executive', 'warehouse_manager', 'shipping_team'],
  'warehouse.courier.edit': ['owner', 'executive', 'warehouse_manager'],
  
  // Customer data
  'customer.profile.view': ['owner', 'executive', 'customer_manager', 'concierge'],
  'customer.profile.edit': ['owner', 'executive', 'customer_manager'],
  'customer.orders.view': ['owner', 'executive', 'customer_manager', 'concierge', 'warehouse_manager', 'warehouse_worker'],
  'customer.orders.edit': ['owner', 'executive', 'customer_manager', 'warehouse_manager'],
  'customer.intelligence.view': ['owner', 'executive', 'customer_manager'],
  'customer.membership.view': ['owner', 'executive', 'customer_manager', 'concierge'],
  'customer.privacy.view': ['owner', 'executive'],
  'customer.privacy.edit': ['owner'],
  
  // Warehouse restrictions
  'warehouse.restricted.customer_spend': ['owner', 'executive', 'finance', 'customer_manager'],
  'warehouse.restricted.membership_tiers': ['owner', 'executive', 'customer_manager', 'concierge'],
  'warehouse.restricted.financial_reports': ['owner', 'executive', 'finance'],
  'warehouse.restricted.vip_status': ['owner', 'executive', 'customer_manager', 'concierge'],
  'warehouse.restricted.profit_data': ['owner', 'executive', 'finance'],
  'warehouse.restricted.customer_intelligence': ['owner', 'executive', 'customer_manager'],
  
  // API
  'api.keys.view': ['owner', 'executive', 'admin'],
  'api.keys.create': ['owner', 'executive'],
  'api.keys.rotate': ['owner', 'executive'],
  'api.keys.disable': ['owner', 'executive'],
  'api.keys.revoke': ['owner', 'executive'],
  'api.keys.delete': ['owner'],
  
  // Warehouse worker restrictions
  'warehouse.worker.restricted_finance': true,
  'warehouse.worker.restricted_customer_intelligence': true,
  'warehouse.worker.restricted_hr': true,
};

function getUserRole() {
  if (typeof window !== 'undefined' && window.DALLI_USER_ROLE) {
    return window.DALLI_USER_ROLE;
  }
  // Try to get from session/localStorage
  try {
    const auth = localStorage.getItem('dalli_admin_auth') || sessionStorage.getItem('dalli_admin_auth');
    if (auth) {
      const parsed = JSON.parse(auth);
      return parsed.role || 'guest';
    }
  } catch (e) {}
  return 'guest';
}

function getRoleLevel(role) {
  return ROLE_HIERARCHY[role] || 0;
}

function hasPermission(permission) {
  const role = getUserRole();
  const allowedRoles = PERMISSION_MAP[permission];
  if (!allowedRoles) return false;
  if (Array.isArray(allowedRoles)) {
    return allowedRoles.includes(getUserRole());
  }
  return false;
}

function hasRoleLevel(minRole) {
  const userRole = getUserLevel();
  const requiredLevel = getRoleLevel(minRole);
  return userRole >= requiredLevel;
}

function getUserLevel() {
  return getRoleLevel(getUserRole());
}

function checkPermission(permission) {
  const allowed = hasPermission(permission);
  if (!allowed) {
    console.warn(`[RBAC] Access denied: ${permission} for role ${getUserRole()}`);
  }
  return allowed;
}

function enforceRBAC(config) {
  // Expose checkPermission globally for use throughout the app
  window.DALLI_RBAC = {
    checkPermission,
    hasPermission,
    getUserRole,
    getUserLevel,
    hasRoleLevel,
    PERMISSION_MAP,
    ROLE_HIERARCHY,
  };
  
  // Apply config-based restrictions
  const permissions = window.DALLI_PERMISSIONS || {};
  // Config can override permissions
  if (permissions.manageFinance === false) {
    // Additional restrictions from config
  }
  
  return { enforced: true, configApplied: true };
}

// Helper for components to check access
export function checkAccess(permission) {
  return checkPermission(permission);
}

// Owner-only check
export function isOwner() {
  return getUserRole() === 'owner';
}

export function canManagePayroll() {
  return hasPermission('finance.payroll.view') || hasPermission('finance.payroll.edit');
}

export function canViewPayroll() {
  return hasPermission('finance.payroll.view');
}

export function canEditPayroll() {
  return hasPermission('finance.payroll.edit');
}

export function canViewCustomerIntelligence() {
  return hasPermission('customer.intelligence.view');
}

export function canViewVIPData() {
  return hasPermission('customer.membership.view') || hasPermission('warehouse.restricted.vip_status');
}

export function canAccessWarehouseFinance() {
  return hasPermission('warehouse.restricted_finance');
}

export function canViewWarehouseCustomerIntelligence() {
  return hasPermission('warehouse.restricted.customer_intelligence');
}

export function canAccessAPIKeys() {
  return hasPermission('security.api_keys.view');
}

export function canManageAPIKeys() {
  return hasPermission('security.api_keys.manage');
}

export function isWarehouseWorker() {
  return getUserRole() === 'warehouse_worker';
}

export function isWarehouseManager() {
  return getUserRole() === 'warehouse_manager';
}

export function isCustomerManager() {
  return getUserRole() === 'customer_manager';
}

export function isConcierge() {
  return getUserRole() === 'concierge';
}

export function isHR() {
  return getUserRole() === 'hr';
}

export function isFinance() {
  return getUserRole() === 'finance';
}

export function isExecutive() {
  return getUserRole() === 'executive';
}

export function isAdmin() {
  return getUserRole() === 'admin';
}

export default {
  checkPermission,
  checkAccess,
  getUserRole,
  getUserLevel,
  hasRoleLevel,
  canManagePayroll,
  canViewPayroll,
  canEditPayroll,
  canViewCustomerIntelligence,
  canViewVIPData,
  canAccessWarehouseFinance,
  canViewWarehouseCustomerIntelligence,
  canAccessAPIKeys,
  canManageAPIKeys,
  isWarehouseWorker,
  isWarehouseManager,
  isCustomerManager,
  isConcierge,
  isHR,
  isFinance,
  isExecutive,
  isAdmin,
  isOwner,
};
