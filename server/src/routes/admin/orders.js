import { Router } from 'express';
import { auditLog } from '../../../src/lib/audit.js';
import { prisma } from '../../../src/lib/prisma.js';
import { requirePermission } from '../../../src/lib/rbac.js';

const router = Router();

const STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

// GET /orders
router.get('/orders', requirePermission('orders.read'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.paymentStatus) where.paymentStatus = req.query.paymentStatus;
    if (req.query.search) {
      const s = String(req.query.search);
      where.OR = [
        { orderNumber: { contains: s, mode: 'insensitive' } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
        { trackingNumber: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(req.query.from);
      if (req.query.to) where.createdAt.lte = new Date(req.query.to);
    }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          payments: { select: { id: true, method: true, status: true, amount: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ orders, count: total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /orders/export
router.get('/orders/export', requirePermission('orders.read'), async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: true, user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header =
      'orderNumber,date,email,status,paymentStatus,items,subtotal,shipping,total,currency,trackingNumber';
    const rows = orders.map(o =>
      [
        o.orderNumber,
        o.createdAt.toISOString(),
        esc(o.user?.email || ''),
        o.status,
        o.paymentStatus,
        o.items.length,
        o.subtotal,
        o.shipping,
        o.total,
        o.currency,
        esc(o.trackingNumber || ''),
      ].join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dalli-orders.csv"');
    res.send([header, ...rows].join('\n'));
  } catch (err) {
    next(err);
  }
});

// GET /orders/:id
router.get('/orders/:id', requirePermission('orders.read'), async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id: req.params.id }, { orderNumber: req.params.id }] },
      include: {
        items: { include: { product: { select: { id: true, name: true, slug: true } } } },
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        payments: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

// PATCH /orders/:id/status
router.patch('/orders/:id/status', requirePermission('orders.write'), async (req, res, next) => {
  try {
    const { status, note, trackingNumber } = req.body || {};
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${STATUSES.join(', ')}` });
    }
    const existing = await prisma.order.findFirst({
      where: { OR: [{ id: req.params.id }, { orderNumber: req.params.id }] },
    });
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const data = { status };
    if (trackingNumber !== undefined) data.trackingNumber = trackingNumber;
    if (status === 'shipped') data.shippedAt = new Date();
    if (status === 'delivered') data.deliveredAt = new Date();
    if (status === 'refunded') data.paymentStatus = 'refunded';

    const order = await prisma.$transaction(async tx => {
      const o = await tx.order.update({ where: { id: existing.id }, data });
      await tx.orderStatusHistory.create({
        data: {
          orderId: o.id,
          fromStatus: existing.status,
          toStatus: status,
          note: note || null,
          changedBy: req.user.id,
        },
      });
      return o;
    });
    await auditLog({
      eventType: 'ORDER_STATUS_CHANGED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { orderId: existing.id, from: existing.status, to: status },
    });
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

// PUT /orders/:id/notes
router.put('/orders/:id/notes', requirePermission('orders.write'), async (req, res, next) => {
  try {
    const { adminNotes, customerNotes } = req.body || {};
    const existing = await prisma.order.findFirst({
      where: { OR: [{ id: req.params.id }, { orderNumber: req.params.id }] },
    });
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    const data = {};
    if (adminNotes !== undefined) data.adminNotes = adminNotes;
    if (customerNotes !== undefined) data.customerNotes = customerNotes;
    const order = await prisma.order.update({ where: { id: existing.id }, data });
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

export default router;
