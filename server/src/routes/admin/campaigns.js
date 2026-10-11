import { Router } from 'express';
import { auditLog } from '../../../src/lib/audit.js';
import { prisma } from '../../../src/lib/prisma.js';
import { requirePermission } from '../../../src/lib/rbac.js';

const router = Router();

// GET /campaigns
router.get('/campaigns', requirePermission('campaigns.read'), async (req, res, next) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.type) where.type = req.query.type;
    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        products: { include: { product: { select: { id: true, name: true, slug: true } } } },
        tiers: { include: { tier: true } },
        _count: { select: { products: true, banners: true } },
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ campaigns, count: campaigns.length });
  } catch (err) {
    next(err);
  }
});

// GET /campaigns/:id
router.get('/campaigns/:id', requirePermission('campaigns.read'), async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { OR: [{ id: parseInt(req.params.id, 10) || -1 }, { key: req.params.id }] },
      include: {
        products: { include: { product: true } },
        tiers: { include: { tier: true } },
        banners: true,
      },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

// POST /campaigns
router.post('/campaigns', requirePermission('campaigns.write'), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.key || !b.name) return res.status(400).json({ error: 'key and name are required' });
    const campaign = await prisma.$transaction(async tx => {
      const c = await tx.campaign.create({
        data: {
          key: b.key,
          name: b.name,
          type: b.type || 'promo_banner',
          status: b.status || 'draft',
          startsAt: b.startsAt ? new Date(b.startsAt) : null,
          endsAt: b.endsAt ? new Date(b.endsAt) : null,
          rules: b.rules ?? undefined,
          promoCode: b.promoCode || null,
          priority: b.priority || 0,
        },
      });
      if (Array.isArray(b.productIds)) {
        await tx.campaignProduct.createMany({
          data: b.productIds.map(productId => ({ campaignId: c.id, productId })),
          skipDuplicates: true,
        });
      }
      if (Array.isArray(b.tierIds)) {
        await tx.campaignTier.createMany({
          data: b.tierIds.map(tierId => ({ campaignId: c.id, tierId })),
          skipDuplicates: true,
        });
      }
      return c;
    });
    await auditLog({
      eventType: 'CAMPAIGN_CREATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { campaignId: campaign.id },
    });
    res.status(201).json({ campaign });
  } catch (err) {
    if (err.code === 'P2002')
      return res.status(409).json({ error: 'Campaign key/promoCode already exists' });
    next(err);
  }
});

// PUT /campaigns/:id
router.put('/campaigns/:id', requirePermission('campaigns.write'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const existing = await prisma.campaign.findFirst({
      where: { OR: [{ id: parseInt(req.params.id, 10) || -1 }, { key: req.params.id }] },
    });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    const data = {};
    for (const k of ['name', 'type', 'status', 'promoCode']) if (b[k] !== undefined) data[k] = b[k];
    if (b.startsAt !== undefined) data.startsAt = b.startsAt ? new Date(b.startsAt) : null;
    if (b.endsAt !== undefined) data.endsAt = b.endsAt ? new Date(b.endsAt) : null;
    if (b.rules !== undefined) data.rules = b.rules;
    if (b.priority !== undefined) data.priority = parseInt(b.priority, 10) || 0;
    const campaign = await prisma.$transaction(async tx => {
      const c = await tx.campaign.update({ where: { id: existing.id }, data });
      if (Array.isArray(b.productIds)) {
        await tx.campaignProduct.deleteMany({ where: { campaignId: c.id } });
        await tx.campaignProduct.createMany({
          data: b.productIds.map(productId => ({ campaignId: c.id, productId })),
          skipDuplicates: true,
        });
      }
      if (Array.isArray(b.tierIds)) {
        await tx.campaignTier.deleteMany({ where: { campaignId: c.id } });
        await tx.campaignTier.createMany({
          data: b.tierIds.map(tierId => ({ campaignId: c.id, tierId })),
          skipDuplicates: true,
        });
      }
      return c;
    });
    await auditLog({
      eventType: 'CAMPAIGN_UPDATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { campaignId: existing.id },
    });
    res.json({ campaign });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Promo code already exists' });
    next(err);
  }
});

// PATCH /campaigns/:id/status  { status: 'active'|'paused'|... }
router.patch(
  '/campaigns/:id/status',
  requirePermission('campaigns.write'),
  async (req, res, next) => {
    try {
      const { status } = req.body || {};
      const allowed = ['draft', 'scheduled', 'active', 'paused', 'ended'];
      if (!allowed.includes(status))
        return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
      const existing = await prisma.campaign.findFirst({
        where: { OR: [{ id: parseInt(req.params.id, 10) || -1 }, { key: req.params.id }] },
      });
      if (!existing) return res.status(404).json({ error: 'Campaign not found' });
      const campaign = await prisma.campaign.update({
        where: { id: existing.id },
        data: { status },
      });
      await auditLog({
        eventType: 'CAMPAIGN_STATUS_CHANGED',
        userId: req.user.id,
        ip: req.ip,
        result: 'success',
        metadata: { campaignId: existing.id, status },
      });
      res.json({ campaign });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /campaigns/:id
router.delete('/campaigns/:id', requirePermission('campaigns.write'), async (req, res, next) => {
  try {
    const existing = await prisma.campaign.findFirst({
      where: { OR: [{ id: parseInt(req.params.id, 10) || -1 }, { key: req.params.id }] },
    });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    await prisma.campaign.delete({ where: { id: existing.id } });
    await auditLog({
      eventType: 'CAMPAIGN_DELETED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { campaignId: existing.id },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
