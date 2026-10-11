import { Router } from 'express';
import { auditLog } from '../../../src/lib/audit.js';
import { cache } from '../../../src/lib/cache.js';
import { prisma } from '../../../src/lib/prisma.js';
import { requirePermission } from '../../../src/lib/rbac.js';

const router = Router();

// GET /settings
router.get('/settings', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const settings = await prisma.siteSettings.findMany({ orderBy: { key: 'asc' } });
    res.json({ settings, count: settings.length });
  } catch (err) {
    next(err);
  }
});

// GET /settings/:key
router.get('/settings/:key', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const setting = await prisma.siteSettings.findUnique({ where: { key: req.params.key } });
    if (!setting) return res.status(404).json({ error: 'Setting not found' });
    res.json({ setting });
  } catch (err) {
    next(err);
  }
});

// PUT /settings/:key
router.put('/settings/:key', requirePermission('settings.write'), async (req, res, next) => {
  try {
    const { value, description } = req.body || {};
    if (value === undefined) return res.status(400).json({ error: 'value is required' });
    const setting = await prisma.siteSettings.upsert({
      where: { key: req.params.key },
      update: {
        value,
        ...(description !== undefined ? { description } : {}),
        updatedBy: req.user.id,
        version: { increment: 1 },
      },
      create: {
        key: req.params.key,
        value,
        description: description || null,
        updatedBy: req.user.id,
      },
    });
    await cache.del(`settings:${req.params.key}`);
    await cache.delPrefix('settings:');
    await auditLog({
      eventType: 'SETTING_UPDATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { key: req.params.key },
    });
    res.json({ setting });
  } catch (err) {
    next(err);
  }
});

// --- SEO entries (category/page SEO) ---
router.get('/seo', requirePermission('content.read'), async (req, res, next) => {
  try {
    const where = {};
    if (req.query.entityType) where.entityType = req.query.entityType;
    const entries = await prisma.seoEntry.findMany({ where, orderBy: { updatedAt: 'desc' } });
    res.json({ entries, count: entries.length });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/seo/:entityType/:entityId',
  requirePermission('content.write'),
  async (req, res, next) => {
    try {
      const { entityType, entityId } = req.params;
      const locale = req.body.locale || 'sr';
      const b = req.body || {};
      const data = {
        metaTitle: b.metaTitle ?? null,
        metaDescription: b.metaDescription ?? null,
        keywords: b.keywords || [],
        canonicalUrl: b.canonicalUrl ?? null,
        ogTitle: b.ogTitle ?? null,
        ogDescription: b.ogDescription ?? null,
        ogImage: b.ogImage ?? null,
        structuredData: b.structuredData ?? undefined,
        noindex: !!b.noindex,
      };
      const entry = await prisma.seoEntry.upsert({
        where: { entityType_entityId_locale: { entityType, entityId, locale } },
        update: data,
        create: { entityType, entityId, locale, ...data },
      });
      await auditLog({
        eventType: 'SEO_UPDATED',
        userId: req.user.id,
        ip: req.ip,
        result: 'success',
        metadata: { entityType, entityId, locale },
      });
      res.json({ entry });
    } catch (err) {
      next(err);
    }
  }
);

// --- Redirects ---
router.get('/redirects', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const redirects = await prisma.redirect.findMany({ orderBy: { id: 'asc' } });
    res.json({ redirects, count: redirects.length });
  } catch (err) {
    next(err);
  }
});

router.post('/redirects', requirePermission('settings.write'), async (req, res, next) => {
  try {
    const { fromPath, toPath, statusCode } = req.body || {};
    if (!fromPath || !toPath)
      return res.status(400).json({ error: 'fromPath and toPath are required' });
    const redirect = await prisma.redirect.create({
      data: { fromPath, toPath, statusCode: parseInt(statusCode, 10) || 301 },
    });
    res.status(201).json({ redirect });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'fromPath already exists' });
    next(err);
  }
});

router.delete('/redirects/:id', requirePermission('settings.write'), async (req, res, next) => {
  try {
    await prisma.redirect.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Redirect not found' });
    next(err);
  }
});

// --- Homepage blocks (CMS) ---
router.get('/homepage-blocks', requirePermission('cms.read'), async (req, res, next) => {
  try {
    const blocks = await prisma.homepageBlock.findMany({ orderBy: { position: 'asc' } });
    res.json({ blocks, count: blocks.length });
  } catch (err) {
    next(err);
  }
});

router.put('/homepage-blocks/:key', requirePermission('cms.write'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const data = {};
    if (b.content !== undefined) data.content = b.content;
    if (b.position !== undefined) data.position = parseInt(b.position, 10) || 0;
    if (b.enabled !== undefined) data.enabled = !!b.enabled;
    if (b.blockType !== undefined) data.blockType = b.blockType;
    if (b.themeId !== undefined) data.themeId = b.themeId;
    data.updatedBy = req.user.id;
    const block = await prisma.homepageBlock.upsert({
      where: { key: req.params.key },
      update: data,
      create: {
        key: req.params.key,
        content: b.content || {},
        blockType: b.blockType || 'product_grid',
        position: b.position || 0,
        enabled: b.enabled !== false,
        updatedBy: req.user.id,
      },
    });
    await auditLog({
      eventType: 'HOMEPAGE_BLOCK_UPDATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { key: req.params.key },
    });
    res.json({ block });
  } catch (err) {
    next(err);
  }
});

// --- Audit logs (admin) ---
router.get('/audit-logs', requirePermission('audit.read'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const where = {};
    if (req.query.eventType) where.eventType = req.query.eventType;
    if (req.query.result) where.result = req.query.result;
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ logs, count: total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

export default router;
