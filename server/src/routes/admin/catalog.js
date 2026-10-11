import { Router } from 'express';
import { auditLog } from '../../../src/lib/audit.js';
import { cache } from '../../../src/lib/cache.js';
import { prisma } from '../../../src/lib/prisma.js';
import { requirePermission } from '../../../src/lib/rbac.js';

const router = Router();

async function invalidateCatalog() {
  await cache.delPrefix('categories:');
  await cache.delPrefix('collections:');
}

// --- Categories ---

router.get('/categories', requirePermission('categories.read'), async (req, res, next) => {
  try {
    const where = {};
    if (req.query.search) {
      where.OR = [
        { name: { contains: String(req.query.search), mode: 'insensitive' } },
        { slug: { contains: String(req.query.search), mode: 'insensitive' } },
      ];
    }
    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ parentCategoryId: 'asc' }, { sortOrder: 'asc' }],
      include: {
        genders: { include: { gender: true } },
        collections: { include: { collection: { select: { id: true, slug: true, title: true } } } },
        seo: true,
        _count: { select: { products: true, children: true } },
      },
    });
    res.json({ categories, count: categories.length });
  } catch (err) {
    next(err);
  }
});

router.get('/categories/tree', requirePermission('categories.read'), async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        genders: { include: { gender: true } },
        collections: { include: { collection: true } },
        _count: { select: { products: true } },
      },
    });
    const byId = new Map(categories.map(c => [c.id, { ...c, children: [] }]));
    const roots = [];
    for (const c of byId.values()) {
      if (c.parentCategoryId && byId.has(c.parentCategoryId))
        byId.get(c.parentCategoryId).children.push(c);
      else roots.push(c);
    }
    res.json({ tree: roots });
  } catch (err) {
    next(err);
  }
});

router.get('/categories/:id', requirePermission('categories.read'), async (req, res, next) => {
  try {
    const category = await prisma.category.findFirst({
      where: { OR: [{ id: req.params.id }, { slug: req.params.id }] },
      include: {
        genders: { include: { gender: true } },
        collections: { include: { collection: true } },
        seo: true,
      },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ category });
  } catch (err) {
    next(err);
  }
});

router.post('/categories', requirePermission('categories.write'), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.slug || !b.name) return res.status(400).json({ error: 'slug and name are required' });
    const category = await prisma.$transaction(async tx => {
      const c = await tx.category.create({
        data: {
          slug: b.slug,
          name: b.name,
          description: b.description ?? null,
          image: b.image ?? null,
          parentCategoryId: b.parentCategoryId ?? null,
          sortOrder: b.sortOrder || 0,
          isActive: b.isActive !== false,
        },
      });
      if (Array.isArray(b.genderIds)) {
        await tx.categoryGender.createMany({
          data: b.genderIds.map(genderId => ({ categoryId: c.id, genderId })),
          skipDuplicates: true,
        });
      }
      if (Array.isArray(b.collectionIds)) {
        await tx.collectionCategory.createMany({
          data: b.collectionIds.map(collectionId => ({ collectionId, categoryId: c.id })),
          skipDuplicates: true,
        });
      }
      return c;
    });
    await invalidateCatalog();
    await auditLog({
      eventType: 'CATEGORY_CREATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { categoryId: category.id },
    });
    res.status(201).json({ category });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' });
    next(err);
  }
});

router.put('/categories/:id', requirePermission('categories.write'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const existing = await prisma.category.findFirst({
      where: { OR: [{ id: req.params.id }, { slug: req.params.id }] },
    });
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    const data = {};
    for (const k of ['slug', 'name', 'description', 'image', 'parentCategoryId']) {
      if (b[k] !== undefined) data[k] = b[k];
    }
    if (b.sortOrder !== undefined) data.sortOrder = parseInt(b.sortOrder, 10) || 0;
    if (b.isActive !== undefined) data.isActive = !!b.isActive;

    const category = await prisma.$transaction(async tx => {
      const c = await tx.category.update({ where: { id: existing.id }, data });
      if (Array.isArray(b.genderIds)) {
        await tx.categoryGender.deleteMany({ where: { categoryId: c.id } });
        await tx.categoryGender.createMany({
          data: b.genderIds.map(genderId => ({ categoryId: c.id, genderId })),
          skipDuplicates: true,
        });
      }
      if (Array.isArray(b.collectionIds)) {
        await tx.collectionCategory.deleteMany({ where: { categoryId: c.id } });
        await tx.collectionCategory.createMany({
          data: b.collectionIds.map(collectionId => ({ collectionId, categoryId: c.id })),
          skipDuplicates: true,
        });
      }
      return c;
    });
    await invalidateCatalog();
    await auditLog({
      eventType: 'CATEGORY_UPDATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { categoryId: existing.id },
    });
    res.json({ category });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' });
    next(err);
  }
});

router.delete('/categories/:id', requirePermission('categories.write'), async (req, res, next) => {
  try {
    const existing = await prisma.category.findFirst({
      where: { OR: [{ id: req.params.id }, { slug: req.params.id }] },
    });
    if (!existing) return res.status(404).json({ error: 'Category not found' });
    const productCount = await prisma.product.count({ where: { categoryId: existing.id } });
    if (productCount > 0) {
      return res
        .status(409)
        .json({ error: 'Category has products - reassign them first', productCount });
    }
    await prisma.category.delete({ where: { id: existing.id } });
    await invalidateCatalog();
    await auditLog({
      eventType: 'CATEGORY_DELETED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { categoryId: existing.id },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/categories/reorder',
  requirePermission('categories.write'),
  async (req, res, next) => {
    try {
      const { orderedIds } = req.body || {};
      if (!Array.isArray(orderedIds))
        return res.status(400).json({ error: 'orderedIds array required' });
      await prisma.$transaction(
        orderedIds.map((id, idx) =>
          prisma.category.update({ where: { id }, data: { sortOrder: idx } })
        )
      );
      await invalidateCatalog();
      res.json({ success: true, count: orderedIds.length });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/categories/:id/image',
  requirePermission('categories.write'),
  async (req, res, next) => {
    try {
      const { image } = req.body || {};
      const category = await prisma.category.update({
        where: { id: req.params.id },
        data: { image: image ?? null },
      });
      await invalidateCatalog();
      res.json({ category });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
      next(err);
    }
  }
);

// --- Collections ---

router.get('/collections', requirePermission('categories.read'), async (req, res, next) => {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        categories: { include: { category: { select: { id: true, slug: true, name: true } } } },
        genders: { include: { gender: true } },
        _count: { select: { products: true } },
      },
    });
    res.json({ collections });
  } catch (err) {
    next(err);
  }
});

router.post('/collections', requirePermission('categories.write'), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.slug || !b.title) return res.status(400).json({ error: 'slug and title are required' });
    const collection = await prisma.collection.create({
      data: {
        slug: b.slug,
        title: b.title,
        description: b.description ?? null,
        image: b.image ?? null,
        sortOrder: b.sortOrder || 0,
        isActive: b.isActive !== false,
      },
    });
    await invalidateCatalog();
    res.status(201).json({ collection });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' });
    next(err);
  }
});

router.put('/collections/:id', requirePermission('categories.write'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const data = {};
    for (const k of ['slug', 'title', 'description', 'image'])
      if (b[k] !== undefined) data[k] = b[k];
    if (b.sortOrder !== undefined) data.sortOrder = parseInt(b.sortOrder, 10) || 0;
    if (b.isActive !== undefined) data.isActive = !!b.isActive;
    const collection = await prisma.collection.update({ where: { id: req.params.id }, data });
    await invalidateCatalog();
    res.json({ collection });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Collection not found' });
    next(err);
  }
});

router.delete('/collections/:id', requirePermission('categories.write'), async (req, res, next) => {
  try {
    await prisma.collection.delete({ where: { id: req.params.id } });
    await invalidateCatalog();
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Collection not found' });
    next(err);
  }
});

export default router;
