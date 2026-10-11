import { Router } from 'express';
import { prisma } from '../../../src/lib/prisma.js';
import { requirePermission } from '../../../src/lib/rbac.js';

const router = Router();

// GET /inventory - all product sizes with stock
router.get('/inventory', requirePermission('inventory.read'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 100);
    const where = {};
    if (req.query.search) {
      const s = String(req.query.search);
      where.OR = [
        { product: { name: { contains: s, mode: 'insensitive' } } },
        { product: { sku: { contains: s, mode: 'insensitive' } } },
      ];
    }
    const [rows, total] = await Promise.all([
      prisma.productSize.findMany({
        where,
        include: {
          inventory: true,
          product: { select: { id: true, name: true, slug: true, sku: true, status: true } },
        },
        orderBy: { product: { name: 'asc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.productSize.count({ where }),
    ]);
    res.json({ inventory: rows, count: total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /inventory/low-stock
router.get('/inventory/low-stock', requirePermission('inventory.read'), async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold, 10) || 5;
    const rows = await prisma.inventory.findMany({
      where: { quantity: { lte: threshold } },
      include: {
        productSize: {
          include: { product: { select: { id: true, name: true, slug: true, sku: true } } },
        },
      },
      orderBy: { quantity: 'asc' },
    });
    res.json({
      items: rows.map(r => ({
        inventoryId: r.id,
        productId: r.productSize.product.id,
        productName: r.productSize.product.name,
        sku: r.productSize.product.sku,
        size: r.productSize.name,
        quantity: r.quantity,
        lowStockThreshold: r.lowStockThreshold,
      })),
      count: rows.length,
      threshold,
    });
  } catch (err) {
    next(err);
  }
});

// GET /inventory/movements - global stock movement log
router.get('/inventory/movements', requirePermission('inventory.read'), async (req, res, next) => {
  try {
    const take = Math.min(500, parseInt(req.query.limit, 10) || 100);
    const where = {};
    if (req.query.productId) {
      where.inventory = { productSize: { productId: parseInt(req.query.productId, 10) } };
    }
    const movements = await prisma.inventoryMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        inventory: {
          include: {
            productSize: { include: { product: { select: { id: true, name: true, sku: true } } } },
          },
        },
      },
    });
    res.json({
      movements: movements.map(m => ({
        ...m,
        product: m.inventory.productSize.product,
        size: m.inventory.productSize.name,
        inventory: undefined,
      })),
      count: movements.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
