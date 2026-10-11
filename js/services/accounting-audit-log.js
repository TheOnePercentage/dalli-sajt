/**
 * Accounting Audit Logs - Phase 22
 * Architecture only
 */

export function createAuditEntry(entry) {
  return {
    createdBy: entry.createdBy || 'system',
    modifiedBy: entry.modifiedBy || null,
    dateCreated: new Date().toISOString(),
    dateUpdated: new Date().toISOString(),
    oldValue: entry.oldValue || null,
    newValue: entry.newValue || entry.currentValue || null,
    action: entry.action || 'create',
    entity: entry.entity || 'unknown',
    entityId: entry.entityId || null,
    ip: entry.ip || null,
    userAgent: entry.userAgent || null
  };
}

export function getAuditTrail(entity, entityId) {
  return [];
}
