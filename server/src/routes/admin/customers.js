import { Router } from 'express';
import { auditLog } from '../../../src/lib/audit.js';
import { hashPassword } from '../../../src/lib/auth.js';
import { prisma } from '../../../src/lib/prisma.js';
import { requirePermission } from '../../../src/lib/rbac.js';

const router = Router();

function shapeUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

// GET /customers
router.get('/customers', requirePermission('customers.read'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const where = {};
    if (req.query.search) {
      const s = String(req.query.search);
      where.OR = [
        { email: { contains: s, mode: 'insensitive' } },
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          userRoles: { include: { role: true } },
          _count: { select: { orders: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    res.json({
      customers: users.map(shapeUser),
      count: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// GET /customers/export
router.get('/customers/export', requirePermission('customers.read'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: { _count: { select: { orders: true } }, orders: { select: { total: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = 'email,firstName,lastName,phone,orders,totalSpent,createdAt,active';
    const rows = users.map(u =>
      [
        esc(u.email),
        esc(u.firstName),
        esc(u.lastName),
        esc(u.phone),
        u._count.orders,
        u.orders.reduce((n, o) => n + o.total, 0),
        u.createdAt.toISOString(),
        u.isActive,
      ].join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dalli-customers.csv"');
    res.send([header, ...rows].join('\n'));
  } catch (err) {
    next(err);
  }
});

// GET /customers/:id
router.get('/customers/:id', requirePermission('customers.read'), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        userRoles: { include: { role: true } },
        addresses: true,
        orders: { orderBy: { createdAt: 'desc' }, take: 20, include: { items: true } },
        loyalty: { include: { tier: true } },
        reviews: { take: 10, orderBy: { createdAt: 'desc' } },
        _count: { select: { orders: true, reviews: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Customer not found' });

    const totalSpent = user.orders.reduce(
      (n, o) => n + (o.status !== 'cancelled' ? o.total : 0),
      0
    );
    res.json({ customer: { ...shapeUser(user), totalSpent } });
  } catch (err) {
    next(err);
  }
});

// POST /customers
router.post('/customers', requirePermission('customers.write'), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'email and password are required' });
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        emailVerified: new Date(),
      },
    });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role || 'customer' } });
    await prisma.wishlist.create({ data: { userId: user.id, name: 'Moja lista' } });
    await auditLog({
      eventType: 'CUSTOMER_CREATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { customerId: user.id },
    });
    res.status(201).json({ customer: shapeUser(user) });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    next(err);
  }
});

// PUT /customers/:id
router.put('/customers/:id', requirePermission('customers.write'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const data = {};
    for (const k of [
      'firstName',
      'lastName',
      'phone',
      'locale',
      'currency',
      'dateOfBirth',
      'gender',
    ]) {
      if (b[k] !== undefined) data[k] = b[k];
    }
    if (b.isActive !== undefined) data.isActive = !!b.isActive;
    if (b.marketingConsent !== undefined) data.marketingConsent = !!b.marketingConsent;
    if (b.emailVerified !== undefined) data.emailVerified = b.emailVerified ? new Date() : null;
    if (b.password) data.passwordHash = await hashPassword(b.password);
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    const { passwordHash, ...rest } = user;
    res.json({ customer: rest });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Customer not found' });
    next(err);
  }
});

// DELETE /customers/:id (deactivate, never hard-delete orders)
router.delete('/customers/:id', requirePermission('customers.write'), async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { revoked: true, revokedAt: new Date() },
    });
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revoked: true, revokedAt: new Date() },
    });
    await auditLog({
      eventType: 'CUSTOMER_DEACTIVATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { customerId: user.id },
    });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Customer not found' });
    next(err);
  }
});

// GET /customers/:id/orders
router.get('/customers/:id/orders', requirePermission('customers.read'), async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.params.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders, count: orders.length });
  } catch (err) {
    next(err);
  }
});

// GET /customers/:id/stats
router.get('/customers/:id/stats', requirePermission('customers.read'), async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({ where: { userId: req.params.id } });
    const valid = orders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded');
    const reviews = await prisma.review.count({ where: { userId: req.params.id } });
    res.json({
      stats: {
        ordersCount: valid.length,
        totalSpent: valid.reduce((n, o) => n + o.total, 0),
        averageOrderValue: valid.length
          ? Math.round(valid.reduce((n, o) => n + o.total, 0) / valid.length)
          : 0,
        reviewsCount: reviews,
        lastOrderAt: orders.length ? orders[0].createdAt : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
