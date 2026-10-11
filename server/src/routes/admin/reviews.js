import { Router } from 'express';
import { auditLog } from '../../../src/lib/audit.js';
import { prisma } from '../../../src/lib/prisma.js';
import { requirePermission } from '../../../src/lib/rbac.js';

const router = Router();

// GET /reviews
router.get('/reviews', requirePermission('reviews.read'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const where = {};
    if (req.query.status === 'pending') where.isApproved = false;
    if (req.query.status === 'approved') where.isApproved = true;
    if (req.query.rating) where.rating = parseInt(req.query.rating, 10);
    if (req.query.productId) where.productId = parseInt(req.query.productId, 10);
    if (req.query.search) {
      const s = String(req.query.search);
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { content: { contains: s, mode: 'insensitive' } },
        { userName: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [reviews, total, pending] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
      prisma.review.count({ where: { isApproved: false } }),
    ]);
    res.json({
      reviews,
      count: total,
      pendingCount: pending,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// GET /reviews/:id
router.get('/reviews/:id', requirePermission('reviews.read'), async (req, res, next) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, email: true } },
      },
    });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ review });
  } catch (err) {
    next(err);
  }
});

// PATCH /reviews/:id/moderate  { action: 'approve'|'reject'|'pending' }
router.patch(
  '/reviews/:id/moderate',
  requirePermission('reviews.moderate'),
  async (req, res, next) => {
    try {
      const { action, adminNotes } = req.body || {};
      const map = { approve: true, reject: false, pending: false };
      if (!(action in map))
        return res.status(400).json({ error: "action must be 'approve', 'reject' or 'pending'" });
      const review = await prisma.review.update({
        where: { id: req.params.id },
        data: {
          isApproved: map[action],
          ...(adminNotes !== undefined ? { adminNotes } : {}),
          ...(action === 'reject' ? { isApproved: false } : {}),
        },
      });
      await auditLog({
        eventType: 'REVIEW_MODERATED',
        userId: req.user.id,
        ip: req.ip,
        result: 'success',
        metadata: { reviewId: review.id, action },
      });
      res.json({ review });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Review not found' });
      next(err);
    }
  }
);

// POST /reviews/:id/reply { response }
router.post('/reviews/:id/reply', requirePermission('reviews.moderate'), async (req, res, next) => {
  try {
    const { response } = req.body || {};
    if (!response) return res.status(400).json({ error: 'response is required' });
    const existing = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Review not found' });
    const reply = `[ADMIN REPLY ${new Date().toISOString()}] ${response}`;
    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { adminNotes: existing.adminNotes ? `${existing.adminNotes}\n${reply}` : reply },
    });
    await auditLog({
      eventType: 'REVIEW_REPLIED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { reviewId: review.id },
    });
    res.json({ review });
  } catch (err) {
    next(err);
  }
});

// GET /reviews/export
router.get('/reviews/export', requirePermission('reviews.read'), async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      include: { product: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = 'id,product,rating,approved,verified,author,title,content,date';
    const rows = reviews.map(r =>
      [
        r.id,
        esc(r.product?.name || ''),
        r.rating,
        r.isApproved,
        r.isVerified,
        esc(r.userName || ''),
        esc(r.title || ''),
        esc((r.content || '').slice(0, 500)),
        r.createdAt.toISOString(),
      ].join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dalli-reviews.csv"');
    res.send([header, ...rows].join('\n'));
  } catch (err) {
    next(err);
  }
});

export default router;
