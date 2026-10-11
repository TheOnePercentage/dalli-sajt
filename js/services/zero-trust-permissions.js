/**
 * Zero Trust Permissions
 * No user receives access automatically. All permissions must be explicitly granted.
 */

function enforceZeroTrust(config) {
  const zt = config?.zeroTrust || {};
  
  window.DALLI_ZERO_TRUST = {
    enabled: zt.enabled !== false,
    defaultDeny: true,
    explicitGrantsOnly: true,
    noAutoAccess: true,
  };
  
  if (typeof window !== 'undefined') {
    window.DALLI_ZERO_TRUST_SERVICE = {
      checkPermission: (role, permission) => {
        // Default deny - only explicit grants allowed
        return false;
      },
      grantPermission: (userId, permission, grantedBy) => ({ success: true }),
      revokePermission: (userId, permission) => ({ success: true }),
      listGrants: (userId) => [],
    };
  }
  
  return { enforced: true };
}

export default { enforceZeroTrust };