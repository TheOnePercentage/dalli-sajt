import { Router } from 'express';
import { auditLog } from '../../../src/lib/audit.js';
import { hashPassword } from '../../../src/lib/auth.js';
import { prisma } from '../../../src/lib/prisma.js';
import { requirePermission } from '../../../src/lib/rbac.js';

const router = Router();

const STAFF_ROLES = ['owner', 'admin', 'manager', 'editor', 'support'];

// GET /users - staff members
router.get('/users', requirePermission('users.read'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { userRoles: { some: { roleId: { in: STAFF_ROLES } } } },
      include: {
        userRoles: {
          include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        roles: u.userRoles.map(ur => ur.role.id),
        permissions: [
          ...new Set(
            u.userRoles.flatMap(ur => ur.role.rolePermissions.map(rp => rp.permission.id))
          ),
        ],
      })),
      count: users.length,
    });
  } catch (err) {
    next(err);
  }
});

// POST /users - create staff account
router.post('/users', requirePermission('users.write'), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, roles } = req.body || {};
    if (!email || !password || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ error: 'email, password and roles[] are required' });
    }
    const invalid = roles.filter(r => !STAFF_ROLES.includes(r));
    if (invalid.length)
      return res.status(400).json({ error: `Invalid roles: ${invalid.join(', ')}` });
    if (roles.includes('owner') && !req.user.roles.includes('owner')) {
      return res.status(403).json({ error: 'Only an owner can grant the owner role' });
    }

    const user = await prisma.$transaction(async tx => {
      const u = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash: await hashPassword(password),
          firstName: firstName || null,
          lastName: lastName || null,
          emailVerified: new Date(),
        },
      });
      await tx.userRole.createMany({
        data: roles.map(roleId => ({ userId: u.id, roleId, grantedBy: req.user.id })),
      });
      return u;
    });
    await auditLog({
      eventType: 'STAFF_USER_CREATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { staffId: user.id, roles },
    });
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
      },
    });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    next(err);
  }
});

// PUT /users/:id - update staff (roles, password, active)
router.put('/users/:id', requirePermission('users.write'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { userRoles: true },
    });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const isOwnerSelf = existing.userRoles.some(ur => ur.roleId === 'owner');
    if (isOwnerSelf && !req.user.roles.includes('owner') && req.user.id !== existing.id) {
      return res.status(403).json({ error: 'Only an owner can modify an owner account' });
    }

    const data = {};
    if (b.firstName !== undefined) data.firstName = b.firstName;
    if (b.lastName !== undefined) data.lastName = b.lastName;
    if (b.password) data.passwordHash = await hashPassword(b.password);
    if (b.isActive !== undefined) data.isActive = !!b.isActive;

    const user = await prisma.$transaction(async tx => {
      const u = await tx.user.update({ where: { id: existing.id }, data });
      if (Array.isArray(b.roles)) {
        const invalid = b.roles.filter(r => !STAFF_ROLES.includes(r));
        if (invalid.length)
          throw Object.assign(new Error(`Invalid roles: ${invalid.join(', ')}`), { status: 400 });
        if (b.roles.includes('owner') && !req.user.roles.includes('owner')) {
          throw Object.assign(new Error('Only an owner can grant the owner role'), { status: 403 });
        }
        await tx.userRole.deleteMany({ where: { userId: u.id } });
        await tx.userRole.createMany({
          data: b.roles.map(roleId => ({ userId: u.id, roleId, grantedBy: req.user.id })),
        });
      }
      if (b.isActive === false) {
        await tx.session.updateMany({
          where: { userId: u.id },
          data: { revoked: true, revokedAt: new Date() },
        });
        await tx.refreshToken.updateMany({
          where: { userId: u.id },
          data: { revoked: true, revokedAt: new Date() },
        });
      }
      return u;
    });
    const { passwordHash, ...rest } = user;
    await auditLog({
      eventType: 'STAFF_USER_UPDATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { staffId: existing.id, fields: Object.keys(data), roles: b.roles },
    });
    res.json({ user: rest });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    next(err);
  }
});

// DELETE /users/:id - revoke staff access
router.delete('/users/:id', requirePermission('users.write'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: 'Cannot delete your own account' });
    await prisma.userRole.deleteMany({ where: { userId: req.params.id } });
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    await prisma.session.updateMany({
      where: { userId: req.params.id },
      data: { revoked: true, revokedAt: new Date() },
    });
    await prisma.refreshToken.updateMany({
      where: { userId: req.params.id },
      data: { revoked: true, revokedAt: new Date() },
    });
    await auditLog({
      eventType: 'STAFF_USER_REVOKED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { staffId: req.params.id },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --- Roles ---

// GET /roles - roles with permissions matrix
router.get('/roles', requirePermission('users.read'), async (req, res, next) => {
  try {
    const [roles, permissions] = await Promise.all([
      prisma.role.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { rolePermissions: true, _count: { select: { userRoles: true } } },
      }),
      prisma.permission.findMany({ orderBy: [{ group: 'asc' }, { id: 'asc' }] }),
    ]);
    res.json({
      roles: roles.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        sortOrder: r.sortOrder,
        permissions: r.rolePermissions.map(rp => rp.permissionId),
        userCount: r._count.userRoles,
      })),
      permissions,
      groups: [...new Set(permissions.map(p => p.group))],
    });
  } catch (err) {
    next(err);
  }
});

// POST /roles
router.post('/roles', requirePermission('users.write'), async (req, res, next) => {
  try {
    const { id, name, description, permissions } = req.body || {};
    if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
    if (STAFF_ROLES.includes(id)) return res.status(409).json({ error: 'Role id already exists' });
    const role = await prisma.$transaction(async tx => {
      const r = await tx.role.create({
        data: { id, name, description: description || null, sortOrder: 99 },
      });
      if (Array.isArray(permissions)) {
        await tx.rolePermission.createMany({
          data: permissions.map(permissionId => ({ roleId: r.id, permissionId })),
          skipDuplicates: true,
        });
      }
      return r;
    });
    await auditLog({
      eventType: 'ROLE_CREATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { roleId: role.id },
    });
    res.status(201).json({ role });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Role already exists' });
    next(err);
  }
});

// PUT /roles/:id - update permissions
router.put('/roles/:id', requirePermission('users.write'), async (req, res, next) => {
  try {
    const { name, description, permissions } = req.body || {};
    const existing = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Role not found' });
    if (existing.id === 'owner')
      return res.status(403).json({ error: 'Owner role permissions cannot be modified' });

    const role = await prisma.$transaction(async tx => {
      const r = await tx.role.update({
        where: { id: existing.id },
        data: { name: name ?? existing.name, description: description ?? existing.description },
      });
      if (Array.isArray(permissions)) {
        await tx.rolePermission.deleteMany({ where: { roleId: r.id } });
        await tx.rolePermission.createMany({
          data: permissions.map(permissionId => ({ roleId: r.id, permissionId })),
          skipDuplicates: true,
        });
      }
      return r;
    });
    await auditLog({
      eventType: 'ROLE_UPDATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { roleId: role.id, permissions },
    });
    res.json({ role });
  } catch (err) {
    next(err);
  }
});

export default router;
