import { Router } from 'express';
import { auditLog } from '../../../src/lib/audit.js';
import { prisma } from '../../../src/lib/prisma.js';
import { requirePermission } from '../../../src/lib/rbac.js';

const router = Router();

// GET /payments - admin list
router.get('/payments', requirePermission('payments.read'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.method) where.method = req.query.method;
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              createdAt: true,
              user: { select: { email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);
    res.json({ payments, count: total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /payments/:id
router.get('/payments/:id', requirePermission('payments.read'), async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { order: { include: { items: true } }, cryptoTransaction: true },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json({ payment });
  } catch (err) {
    next(err);
  }
});

// GET /payment-rules - payment method configuration
router.get('/payment-rules', requirePermission('payments.read'), async (req, res, next) => {
  try {
    const rules = await prisma.paymentRule.findMany({
      orderBy: [{ scope: 'asc' }, { sortOrder: 'asc' }],
      include: { product: { select: { id: true, name: true, slug: true } } },
    });
    res.json({ rules, count: rules.length });
  } catch (err) {
    next(err);
  }
});

// PUT /payment-rules/:id
router.put('/payment-rules/:id', requirePermission('payments.write'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const existing = await prisma.paymentRule.findUnique({
      where: { id: parseInt(req.params.id, 10) },
    });
    if (!existing) return res.status(404).json({ error: 'Payment rule not found' });
    const data = {};
    if (b.enabled !== undefined) data.enabled = !!b.enabled;
    if (b.minOrderTotal !== undefined)
      data.minOrderTotal = b.minOrderTotal == null ? null : parseInt(b.minOrderTotal, 10);
    if (b.maxOrderTotal !== undefined)
      data.maxOrderTotal = b.maxOrderTotal == null ? null : parseInt(b.maxOrderTotal, 10);
    if (b.sortOrder !== undefined) data.sortOrder = parseInt(b.sortOrder, 10) || 0;
    if (b.note !== undefined) data.note = b.note;
    const rule = await prisma.paymentRule.update({ where: { id: existing.id }, data });
    await auditLog({
      eventType: 'PAYMENT_RULE_UPDATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { ruleId: rule.id },
    });
    res.json({ rule });
  } catch (err) {
    next(err);
  }
});

// POST /payment-rules
router.post('/payment-rules', requirePermission('payments.write'), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.method)
      return res
        .status(400)
        .json({ error: 'method is required (card, bank_transfer, cod, crypto)' });
    const rule = await prisma.paymentRule.create({
      data: {
        scope: b.scope || 'global',
        productId: b.productId ?? null,
        method: b.method,
        enabled: b.enabled !== false,
        minOrderTotal: b.minOrderTotal != null ? parseInt(b.minOrderTotal, 10) : null,
        maxOrderTotal: b.maxOrderTotal != null ? parseInt(b.maxOrderTotal, 10) : null,
        sortOrder: b.sortOrder || 0,
        note: b.note || null,
      },
    });
    res.status(201).json({ rule });
  } catch (err) {
    next(err);
  }
});

// POST /payments/:id/refund
router.post('/payments/:id/refund', requirePermission('payments.write'), async (req, res, next) => {
  try {
    const { amount, reason } = req.body || {};
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status === 'refunded') return res.status(409).json({ error: 'Already refunded' });

    const refundAmount =
      amount != null ? parseInt(amount, 10) : payment.amount - payment.refundedAmount;
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundedAmount: payment.refundedAmount + refundAmount,
        status:
          payment.refundedAmount + refundAmount >= payment.amount ? 'refunded' : payment.status,
        failureReason: reason || payment.failureReason,
      },
    });
    await auditLog({
      eventType: 'PAYMENT_REFUNDED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { paymentId: payment.id, amount: refundAmount },
    });
    res.json({ payment: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
