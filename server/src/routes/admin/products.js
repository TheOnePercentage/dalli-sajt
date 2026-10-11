import { Router } from 'express';
import { auditLog } from '../../../src/lib/audit.js';
import { cache } from '../../../src/lib/cache.js';
import { prisma } from '../../../src/lib/prisma.js';
import { requirePermission } from '../../../src/lib/rbac.js';

const router = Router();

const INCLUDE = {
  colors: { orderBy: { sortOrder: 'asc' } },
  sizes: { orderBy: { sortOrder: 'asc' }, include: { inventory: true } },
  category: { select: { id: true, slug: true, name: true } },
  collection: { select: { id: true, slug: true, title: true } },
  genders: { include: { gender: true } },
  styleOccasions: { include: { styleOccasion: true } },
};

async function invalidate(productId) {
  await cache.delPrefix('products:');
  await cache.delPrefix('search:');
  if (productId) await cache.del(`product:${productId}`);
}

// GET /products - admin list (all statuses, pagination, search)
router.get('/products', requirePermission('products.read'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.collection) where.collection = { slug: req.query.collection };
    if (req.query.category) where.category = { slug: req.query.category };
    if (req.query.search) {
      const s = String(req.query.search);
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);
    res.json({ products, count: total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /products/export - CSV
router.get('/products/export', requirePermission('products.read'), async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({ include: INCLUDE, orderBy: { id: 'asc' } });
    const header =
      'id,sku,slug,name,price,salePrice,currency,status,category,collection,featured,bestseller,stock';
    const rows = products.map(p => {
      const stock = p.sizes.reduce((n, s) => n + (s.inventory?.quantity || 0), 0);
      const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      return [
        p.id,
        esc(p.sku),
        esc(p.slug),
        esc(p.name),
        p.price,
        p.salePrice ?? '',
        p.currency,
        p.status,
        esc(p.category?.slug || ''),
        esc(p.collection?.slug || ''),
        p.featured,
        p.bestseller,
        stock,
      ].join(',');
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dalli-products.csv"');
    res.send([header, ...rows].join('\n'));
  } catch (err) {
    next(err);
  }
});

// GET /products/top
router.get('/products/top', requirePermission('products.read'), async (req, res, next) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 6);
    const products = await prisma.product.findMany({
      orderBy: { salesCount: 'desc' },
      take: limit,
      select: { id: true, name: true, slug: true, salesCount: true, viewCount: true, price: true },
    });
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

// GET /products/:id
router.get('/products/:id', requirePermission('products.read'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const product = await prisma.product.findUnique({ where: { id }, include: INCLUDE });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

// POST /products
router.post('/products', requirePermission('products.write'), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.sku || !b.slug || !b.name || b.price == null) {
      return res.status(400).json({ error: 'sku, slug, name and price are required' });
    }
    const product = await prisma.product.create({
      data: {
        sku: b.sku,
        slug: b.slug,
        name: b.name,
        description: b.description ?? null,
        shortDescription: b.shortDescription ?? null,
        price: parseInt(b.price, 10),
        salePrice: b.salePrice != null ? parseInt(b.salePrice, 10) : null,
        currency: b.currency || 'RSD',
        brand: b.brand || 'DALLI',
        images: b.images ?? undefined,
        metadata: b.metadata ?? undefined,
        collectionId: b.collectionId ?? null,
        categoryId: b.categoryId ?? null,
        status: b.status || 'draft',
        featured: !!b.featured,
        bestseller: !!b.bestseller,
        newArrival: !!b.newArrival,
        priority: b.priority || 0,
        metaTitle: b.metaTitle ?? null,
        metaDescription: b.metaDescription ?? null,
        metaKeywords: b.metaKeywords || [],
        altText: b.altText ?? null,
        searchKeywords: b.searchKeywords || [],
      },
    });
    await invalidate();
    await auditLog({
      eventType: 'PRODUCT_CREATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { productId: product.id },
    });
    res.status(201).json({ product });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'SKU or slug already exists' });
    next(err);
  }
});

// PUT /products/:id
router.put('/products/:id', requirePermission('products.write'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b = req.body || {};
    const data = {};
    const scalarMap = {
      sku: 'sku',
      slug: 'slug',
      name: 'name',
      description: 'description',
      shortDescription: 'shortDescription',
      currency: 'currency',
      brand: 'brand',
      status: 'status',
      metaTitle: 'metaTitle',
      metaDescription: 'metaDescription',
      altText: 'altText',
      collectionId: 'collectionId',
      categoryId: 'categoryId',
    };
    for (const [k, col] of Object.entries(scalarMap)) if (b[k] !== undefined) data[col] = b[k];
    if (b.price !== undefined) data.price = parseInt(b.price, 10);
    if (b.salePrice !== undefined)
      data.salePrice = b.salePrice == null ? null : parseInt(b.salePrice, 10);
    if (b.featured !== undefined) data.featured = !!b.featured;
    if (b.bestseller !== undefined) data.bestseller = !!b.bestseller;
    if (b.newArrival !== undefined) data.newArrival = !!b.newArrival;
    if (b.priority !== undefined) data.priority = parseInt(b.priority, 10) || 0;
    if (b.images !== undefined) data.images = b.images;
    if (b.metadata !== undefined) data.metadata = b.metadata;
    if (b.metaKeywords !== undefined) data.metaKeywords = b.metaKeywords;
    if (b.searchKeywords !== undefined) data.searchKeywords = b.searchKeywords;

    const product = await prisma.product.update({ where: { id }, data });
    await invalidate(id);
    await auditLog({
      eventType: 'PRODUCT_UPDATED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { productId: id, fields: Object.keys(data) },
    });
    res.json({ product });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'SKU or slug already exists' });
    next(err);
  }
});

// DELETE /products/:id
router.delete('/products/:id', requirePermission('products.delete'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.product.delete({ where: { id } });
    await invalidate();
    await auditLog({
      eventType: 'PRODUCT_DELETED',
      userId: req.user.id,
      ip: req.ip,
      result: 'success',
      metadata: { productId: id },
    });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    next(err);
  }
});

// --- Variants: colors + sizes (+ inventory) ---

// GET /products/:id/variants
router.get('/products/:id/variants', requirePermission('products.read'), async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const [colors, sizes] = await Promise.all([
      prisma.productColor.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } }),
      prisma.productSize.findMany({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
        include: { inventory: true },
      }),
    ]);
    res.json({
      colors,
      sizes,
      variants: [
        ...colors.map(c => ({ ...c, type: 'color' })),
        ...sizes.map(s => ({ ...s, type: 'size' })),
      ],
    });
  } catch (err) {
    next(err);
  }
});

// POST /products/:id/variants  { type: 'color'|'size', name, hex?, stock? }
router.post(
  '/products/:id/variants',
  requirePermission('products.write'),
  async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id, 10);
      const { type, name, hex, stock, sortOrder } = req.body || {};
      if (!type || !name) return res.status(400).json({ error: 'type and name are required' });

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return res.status(404).json({ error: 'Product not found' });

      if (type === 'color') {
        const color = await prisma.productColor.create({
          data: { productId, name, hex: hex || null, sortOrder: sortOrder ?? 0 },
        });
        await invalidate(productId);
        return res.status(201).json({ variant: color, type: 'color' });
      }
      if (type === 'size') {
        const size = await prisma.productSize.create({
          data: { productId, name, sortOrder: sortOrder ?? 0 },
        });
        const inventory = await prisma.inventory.create({
          data: { productSizeId: size.id, quantity: parseInt(stock, 10) || 0 },
        });
        await invalidate(productId);
        return res.status(201).json({ variant: { ...size, inventory }, type: 'size' });
      }
      res.status(400).json({ error: "type must be 'color' or 'size'" });
    } catch (err) {
      if (err.code === 'P2002')
        return res.status(409).json({ error: 'Variant already exists for this product' });
      next(err);
    }
  }
);

// PUT /products/:id/variants/:variantId
router.put(
  '/products/:id/variants/:variantId',
  requirePermission('products.write'),
  async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id, 10);
      const variantId = parseInt(req.params.variantId, 10);
      const b = req.body || {};

      const color = await prisma.productColor.findFirst({ where: { id: variantId, productId } });
      if (color) {
        const updated = await prisma.productColor.update({
          where: { id: variantId },
          data: {
            name: b.name ?? color.name,
            hex: b.hex !== undefined ? b.hex : color.hex,
            sortOrder: b.sortOrder !== undefined ? b.sortOrder : color.sortOrder,
          },
        });
        await invalidate(productId);
        return res.json({ variant: updated, type: 'color' });
      }

      const size = await prisma.productSize.findFirst({
        where: { id: variantId, productId },
        include: { inventory: true },
      });
      if (!size) return res.status(404).json({ error: 'Variant not found' });

      const updatedSize = await prisma.productSize.update({
        where: { id: variantId },
        data: {
          name: b.name ?? size.name,
          sortOrder: b.sortOrder !== undefined ? b.sortOrder : size.sortOrder,
        },
      });
      let inventory = size.inventory;
      if (b.stock != null && inventory) {
        const delta = parseInt(b.stock, 10) - inventory.quantity;
        inventory = await prisma.inventory.update({
          where: { id: inventory.id },
          data: { quantity: parseInt(b.stock, 10) },
        });
        if (delta !== 0) {
          await prisma.inventoryMovement.create({
            data: {
              inventoryId: inventory.id,
              delta,
              reason: 'adjustment',
              actorId: req.user.id,
              note: 'variant update',
            },
          });
        }
      }
      await invalidate(productId);
      res.json({ variant: { ...updatedSize, inventory }, type: 'size' });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Variant not found' });
      next(err);
    }
  }
);

// DELETE /products/:id/variants/:variantId
router.delete(
  '/products/:id/variants/:variantId',
  requirePermission('products.write'),
  async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id, 10);
      const variantId = parseInt(req.params.variantId, 10);
      const color = await prisma.productColor.findFirst({ where: { id: variantId, productId } });
      if (color) {
        await prisma.productColor.delete({ where: { id: variantId } });
        await invalidate(productId);
        return res.json({ success: true });
      }
      const size = await prisma.productSize.findFirst({ where: { id: variantId, productId } });
      if (size) {
        await prisma.productSize.delete({ where: { id: variantId } }); // inventory cascades
        await invalidate(productId);
        return res.json({ success: true });
      }
      res.status(404).json({ error: 'Variant not found' });
    } catch (err) {
      next(err);
    }
  }
);

// POST /products/:id/stock/adjust  { sizeId | size, delta, reason, note }
router.post(
  '/products/:id/stock/adjust',
  requirePermission('inventory.write'),
  async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id, 10);
      const { sizeId, size, delta, reason, note } = req.body || {};
      const d = parseInt(delta, 10);
      if (!d) return res.status(400).json({ error: 'delta (non-zero integer) is required' });

      let inventory = null;
      if (sizeId) {
        const sz = await prisma.productSize.findFirst({
          where: { id: parseInt(sizeId, 10), productId },
          include: { inventory: true },
        });
        inventory = sz?.inventory || null;
      } else if (size) {
        const sz = await prisma.productSize.findFirst({
          where: { productId, name: size },
          include: { inventory: true },
        });
        inventory = sz?.inventory || null;
      }
      if (!inventory)
        return res.status(404).json({ error: 'Inventory record not found for that size' });

      const updated = await prisma.$transaction(async tx => {
        const inv = await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: { increment: d } },
        });
        await tx.inventoryMovement.create({
          data: {
            inventoryId: inv.id,
            delta: d,
            reason: reason || 'adjustment',
            actorId: req.user.id,
            note: note || null,
          },
        });
        return inv;
      });
      await invalidate(productId);
      await auditLog({
        eventType: 'STOCK_ADJUSTED',
        userId: req.user.id,
        ip: req.ip,
        result: 'success',
        metadata: { productId, delta: d, reason },
      });
      res.json({ inventory: updated });
    } catch (err) {
      next(err);
    }
  }
);

// GET /products/:id/stock/movements
router.get(
  '/products/:id/stock/movements',
  requirePermission('inventory.read'),
  async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id, 10);
      const sizes = await prisma.productSize.findMany({
        where: { productId },
        include: {
          inventory: { include: { movements: { orderBy: { createdAt: 'desc' }, take: 50 } } },
        },
      });
      const movements = sizes.flatMap(s =>
        (s.inventory?.movements || []).map(m => ({ ...m, size: s.name }))
      );
      movements.sort((a, b) => b.createdAt - a.createdAt);
      res.json({ movements });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
