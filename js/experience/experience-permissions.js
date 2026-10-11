/**
 * Experience Center - Permission Model (read-only)
 *
 * Single source of truth: Core Platform RBAC (Roles -> Permissions).
 * Vanilla admin: AuthManager (js/admin/auth.js, DEFAULT_PERMISSIONS).
 * admin-new: auth session user.permissions.
 * Future: PostgreSQL + Prisma + RBAC remains the authority.
 *
 * Experience Center only READS the `experienceCenter` permission.
 * It never stores roles, grants or permissions of its own.
 */

import { PERMISSION_KEY } from './experience-config.js';

const OWNER_ROLES = ['vlasnik', 'owner', 'super_admin'];

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function coreAuth() {
  if (typeof window !== 'undefined' && window.AuthManager) {
    return window.AuthManager;
  }
  return null;
}

function coreAdminNewPermissions() {
  const session = readJSON('dalli_admin_auth', null);
  if (session && session.user && Array.isArray(session.user.permissions)) {
    return session.user.permissions;
  }
  return null;
}

export function detectRole() {
  const auth = coreAuth();
  if (auth && typeof auth.getRole === 'function') {
    const authenticated =
      typeof auth.isAuthenticated === 'function' ? auth.isAuthenticated() : true;
    if (authenticated) {
      const role = auth.getRole();
      if (role) return role;
    }
  }

  const vanillaRole = localStorage.getItem('dalli_admin_role');
  if (vanillaRole) return vanillaRole;

  const adminNewAuth = readJSON('dalli_admin_auth', null);
  if (adminNewAuth && adminNewAuth.user) {
    const user = adminNewAuth.user;
    if (user.permissions && user.permissions.includes('*')) return 'vlasnik';
    return user.role || 'admin';
  }

  const employee = readJSON('dalli_employees', null);
  const employeeId = localStorage.getItem('dalli_admin_employee_id');
  if (employee && employeeId) {
    const found = employee.find(e => e.id === employeeId);
    if (found) return found.role;
  }

  return null;
}

export function isOwner(role) {
  const effectiveRole = role || detectRole();
  if (!effectiveRole) return false;
  return OWNER_ROLES.includes(String(effectiveRole).toLowerCase());
}

export function canManageExperience(role) {
  const effectiveRole = role || detectRole();
  if (!effectiveRole) return false;
  if (isOwner(effectiveRole)) return true;

  const auth = coreAuth();
  if (auth && typeof auth.hasPermission === 'function') {
    return auth.hasPermission(effectiveRole, PERMISSION_KEY) === true;
  }

  const permissions = coreAdminNewPermissions();
  if (permissions) {
    return permissions.includes('*') || permissions.includes(PERMISSION_KEY);
  }

  return false;
}

export function canOwnerAction(role) {
  return isOwner(role);
}

export function getRoleHeader() {
  return detectRole() || 'anonymous';
}

export function getPermissionLabel() {
  return 'Can Manage Experience Center';
}

export function getPermissionSource() {
  return 'core-rbac';
}

export const ExperiencePermissions = {
  PERMISSION_KEY,
  detectRole,
  isOwner,
  canManageExperience,
  canOwnerAction,
  getRoleHeader,
  getPermissionLabel,
  getPermissionSource,
};

export default ExperiencePermissions;
