import { Router } from 'express';
import { prisma } from '../../../src/lib/prisma.js';
import { requirePermission } from '../../../src/lib/rbac.js';

const router = Router();

function periodStart(period) {
  const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[period] || 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// GET /dashboard
router.get('/dashboard', requirePermission('analytics.read'), async (req, res, next) => {
  try {
    const from = periodStart(req.query.period);
    const [
      orders,
      revenueAgg,
      productCount,
      customerCount,
      pendingReviews,
      lowStock,
      recentOrders,
      recentAudit,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: from } },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          paymentStatus: true,
          user: { select: { email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: from }, status: { notIn: ['cancelled', 'refunded'] } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.product.count({ where: { status: 'published' } }),
      prisma.user.count(),
      prisma.review.count({ where: { isApproved: false } }),
      prisma.inventory.count({ where: { quantity: { lte: 5 } } }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { user: { select: { email: true } }, items: { select: { productName: true } } },
      }),
      prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 8 }),
    ]);

    const revenue = revenueAgg._sum.total || 0;
    const ordersCount = revenueAgg._count;

    // Daily buckets for chart
    const buckets = new Map();
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      const b = buckets.get(day) || { date: day, orders: 0, revenue: 0 };
      b.orders += 1;
      if (!['cancelled', 'refunded'].includes(o.status)) b.revenue += o.total;
      buckets.set(day, b);
    }
    const chart = [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      stats: {
        revenue,
        orders: ordersCount,
        averageOrderValue: ordersCount ? Math.round(revenue / ordersCount) : 0,
        products: productCount,
        customers: customerCount,
        pendingReviews,
        lowStock,
        conversionRate: customerCount ? Math.round((ordersCount / customerCount) * 100) / 100 : 0,
      },
      chart,
      recentOrders,
      recentActivity: recentAudit.map(a => ({
        id: a.id,
        eventType: a.eventType,
        result: a.result,
        timestamp: a.timestamp,
        metadata: a.metadata,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/revenue-chart
router.get(
  '/dashboard/revenue-chart',
  requirePermission('analytics.read'),
  async (req, res, next) => {
    try {
      const from = periodStart(req.query.period);
      const orders = await prisma.order.findMany({
        where: { createdAt: { gte: from } },
        select: { total: true, status: true, createdAt: true },
      });
      const buckets = new Map();
      for (const o of orders) {
        const day = o.createdAt.toISOString().slice(0, 10);
        const b = buckets.get(day) || { date: day, revenue: 0, orders: 0 };
        b.orders += 1;
        if (!['cancelled', 'refunded'].includes(o.status)) b.revenue += o.total;
        buckets.set(day, b);
      }
      res.json({ chart: [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date)) });
    } catch (err) {
      next(err);
    }
  }
);

// GET /dashboard/orders-chart
router.get(
  '/dashboard/orders-chart',
  requirePermission('analytics.read'),
  async (req, res, next) => {
    try {
      const from = periodStart(req.query.period);
      const byStatus = await prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: from } },
        _count: true,
      });
      res.json({ byStatus: byStatus.map(s => ({ status: s.status, count: s._count })) });
    } catch (err) {
      next(err);
    }
  }
);

// GET /dashboard/recent-orders
router.get(
  '/dashboard/recent-orders',
  requirePermission('analytics.read'),
  async (req, res, next) => {
    try {
      const limit = Math.min(50, parseInt(req.query.limit, 10) || 8);
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { user: { select: { email: true } }, items: { select: { productName: true } } },
      });
      res.json({ orders });
    } catch (err) {
      next(err);
    }
  }
);

// GET /dashboard/recent-activity
router.get(
  '/dashboard/recent-activity',
  requirePermission('analytics.read'),
  async (req, res, next) => {
    try {
      const limit = Math.min(50, parseInt(req.query.limit, 10) || 8);
      const activity = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
      res.json({ activity });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
