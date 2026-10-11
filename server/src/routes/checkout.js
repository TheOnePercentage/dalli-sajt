import { randomBytes } from 'crypto';
import { Router } from 'express';
import { auditLog } from '../lib/audit.js';
import { cache } from '../lib/cache.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

const FREE_SHIPPING_THRESHOLD = 5000; // RSD
const SHIPPING_PRICES = { standard: 350, express: 700, pickup: 0 };
const CRYPTO_DISCOUNT_PERCENT = parseFloat(process.env.CRYPTO_DISCOUNT_PERCENT || '15');
const MOCK_WALLETS = {
  BTC: 'bc1qdalli000000000000000000000000000',
  ETH: '0xdalli000000000000000000000000000000',
  USDT: 'TXdalli000000000000000000000000000',
  LTC: 'ltc1qdalli0000000000000000000000000',
};

function orderNumber() {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `DAL-${ymd}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

// GET /payment-methods?total= - enabled methods for a cart total
router.get('/payment-methods', async (req, res, next) => {
  try {
    const total = parseInt(req.query.total, 10) || 0;
    const rules = await cache.wrap('payment-rules:enabled', 120, () =>
      prisma.paymentRule.findMany({
        where: { enabled: true, scope: 'global' },
        orderBy: { sortOrder: 'asc' },
      })
    );
    // No rules configured yet -> expose standard methods (STEP 7 default set)
    if (!rules.length) {
      return res.json({
        methods: [
          { method: 'card', sortOrder: 0, note: 'Platna kartica (mock gateway)' },
          { method: 'crypto', sortOrder: 1, note: `Kriptovalute (-${CRYPTO_DISCOUNT_PERCENT}%)` },
          { method: 'bank_transfer', sortOrder: 2, note: 'Bankovna uplata' },
          { method: 'cod', sortOrder: 3, note: 'Pouzećem' },
        ],
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        cryptoDiscountPercent: CRYPTO_DISCOUNT_PERCENT,
        source: 'defaults',
      });
    }
    const methods = rules
      .filter(
        r =>
          (r.minOrderTotal == null || total >= r.minOrderTotal) &&
          (r.maxOrderTotal == null || total <= r.maxOrderTotal)
      )
      .map(r => ({ method: r.method, sortOrder: r.sortOrder, note: r.note }));
    res.json({
      methods,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      cryptoDiscountPercent: CRYPTO_DISCOUNT_PERCENT,
    });
  } catch (err) {
    next(err);
  }
});

// POST /checkout - create order + payment (STEP 7)
router.post('/checkout', async (req, res, next) => {
  try {
    const b = req.body || {};
    const items = Array.isArray(b.items) ? b.items : [];
    if (!items.length) return res.status(400).json({ error: 'Cart is empty' });
    if (
      !b.shippingAddress ||
      !b.shippingAddress.address1 ||
      !b.shippingAddress.city ||
      !b.shippingAddress.postalCode
    ) {
      return res.status(400).json({ error: 'Complete shipping address is required' });
    }
    const paymentMethod = ['card', 'crypto', 'cod', 'bank_transfer'].includes(b.paymentMethod)
      ? b.paymentMethod
      : null;
    if (!paymentMethod)
      return res
        .status(400)
        .json({ error: 'paymentMethod must be card, crypto, cod or bank_transfer' });

    // Capture payment rules for in-transaction validation (when configured)
    const enabledRules = await prisma.paymentRule.findMany({
      where: { enabled: true, scope: 'global' },
      orderBy: { sortOrder: 'asc' },
    });

    // Resolve products + stock in one transaction
    const result = await prisma.$transaction(async tx => {
      let subtotal = 0;
      const orderItems = [];
      const pendingMovements = [];

      for (const item of items) {
        const productId = parseInt(item.productId, 10);
        const qty = parseInt(item.quantity, 10) || 0;
        if (!productId || qty <= 0)
          throw Object.assign(new Error('Invalid cart item'), { status: 400 });

        const product = await tx.product.findUnique({
          where: { id: productId },
          include: { sizes: { include: { inventory: true } }, colors: true },
        });
        if (!product || product.status !== 'published') {
          throw Object.assign(new Error(`Product ${productId} not available`), { status: 400 });
        }

        const unitPrice = product.salePrice != null ? product.salePrice : product.price;
        let sizeName = item.size || null;
        let inventory = null;
        if (sizeName) {
          const size = product.sizes.find(s => s.name === sizeName);
          if (!size)
            throw Object.assign(new Error(`Size ${sizeName} not available for ${product.name}`), {
              status: 400,
            });
          inventory = size.inventory;
          if (inventory && inventory.quantity < qty && !inventory.allowBackorder) {
            throw Object.assign(
              new Error(
                `Insufficient stock for ${product.name} (${sizeName}) - available: ${inventory.quantity}`
              ),
              { status: 409 }
            );
          }
        }

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: { decrement: qty } },
          });
          pendingMovements.push({
            inventoryId: inventory.id,
            delta: -qty,
            reason: 'order',
            note: 'checkout',
          });
        }

        subtotal += unitPrice * qty;
        orderItems.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: qty,
          unitPrice,
          totalPrice: unitPrice * qty,
          size: sizeName,
          color: item.color || null,
        });
      }

      // Enforce payment rules (method + order-total bounds), when configured
      if (enabledRules.length) {
        const ok = enabledRules.find(
          r =>
            r.method === paymentMethod &&
            (r.minOrderTotal == null || subtotal >= r.minOrderTotal) &&
            (r.maxOrderTotal == null || subtotal <= r.maxOrderTotal)
        );
        if (!ok) {
          throw Object.assign(new Error(`Payment method ${paymentMethod} is not available`), {
            status: 400,
            code: 'payment_method_unavailable',
          });
        }
      }

      // Shipping
      const shippingMethod =
        SHIPPING_PRICES[b.shippingMethod] !== undefined ? b.shippingMethod : 'standard';
      const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_PRICES[shippingMethod];

      // Promo code -> campaign discount
      let discount = 0;
      let promoCode = null;
      if (b.promoCode) {
        const campaign = await tx.campaign.findFirst({
          where: {
            promoCode: b.promoCode,
            status: 'active',
            OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }],
          },
        });
        if (campaign && campaign.rules?.discountPercent) {
          discount = Math.round(subtotal * (campaign.rules.discountPercent / 100));
          promoCode = campaign.promoCode;
        }
      }

      // Crypto discount
      let cryptoDiscount = 0;
      if (paymentMethod === 'crypto') {
        cryptoDiscount = Math.round((subtotal - discount) * (CRYPTO_DISCOUNT_PERCENT / 100));
      }

      const tax = 0; // RSD prices are VAT-inclusive
      const total = Math.max(0, subtotal - discount - cryptoDiscount + shipping);

      const order = await tx.order.create({
        data: {
          orderNumber: orderNumber(),
          userId: req.user?.id || b.userId || null,
          status: 'pending',
          subtotal,
          tax,
          shipping,
          discount,
          cryptoDiscount,
          total,
          currency: 'RSD',
          shippingAddress: b.shippingAddress,
          shippingMethod,
          paymentMethod,
          paymentStatus: 'pending',
          promoCode,
          customerNotes: b.customerNotes || null,
          items: { create: orderItems },
        },
        include: { items: true },
      });

      if (pendingMovements.length) {
        await tx.inventoryMovement.createMany({
          data: pendingMovements.map(m => ({ ...m, orderId: order.id })),
        });
      }

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: total,
          method: paymentMethod,
          status: 'pending',
          gateway:
            paymentMethod === 'crypto'
              ? 'mock_crypto'
              : paymentMethod === 'card'
                ? 'mock_card'
                : null,
          metadata: { shipping, discount, cryptoDiscount, subtotal },
        },
      });

      if (paymentMethod === 'crypto') {
        const currency = (b.cryptoCurrency || 'BTC').toUpperCase();
        const rate = parseFloat(process.env.CRYPTO_RATE_RSD || '10000000'); // RSD per unit (mock)
        const cryptoAmount = total / rate;
        await tx.cryptoTransaction.create({
          data: {
            paymentId: payment.id,
            currency,
            cryptoAmount,
            quotedRate: rate,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            walletAddress: MOCK_WALLETS[currency] || MOCK_WALLETS.BTC,
            requiredConfirmations: 3,
            discountPercentApplied: CRYPTO_DISCOUNT_PERCENT,
            gatewayPayload: {
              mock: true,
              note: 'Development quote - real gateway integration required for production',
            },
          },
        });
      }

      // COD: order confirmed immediately, payment collected on delivery
      if (paymentMethod === 'cod') {
        await tx.order.update({ where: { id: order.id }, data: { status: 'confirmed' } });
        order.status = 'confirmed'; // keep response in sync with DB
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: 'pending',
            toStatus: 'confirmed',
            note: 'COD - plaćanje pri preuzimanju',
          },
        });
      }

      return { order, payment };
    });

    await cache.delPrefix('products:');
    await auditLog({
      eventType: 'ORDER_CREATED',
      userId: req.user?.id || null,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'success',
      metadata: {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        total: result.order.total,
        paymentMethod,
      },
    });

    res.status(201).json({
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        status: result.order.status,
        total: result.order.total,
        items: result.order.items,
      },
      payment: result.payment,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /orders/lookup - order status by orderNumber + email
router.post('/orders/lookup', async (req, res, next) => {
  try {
    const { orderNumber: on, email } = req.body || {};
    if (!on || !email) return res.status(400).json({ error: 'orderNumber and email are required' });
    const order = await prisma.order.findUnique({
      where: { orderNumber: on },
      include: {
        items: { select: { productName: true, quantity: true, size: true, color: true } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Guest orders: match via shipping address email; account orders: via user email
    const orderEmail = order.user?.email || order.shippingAddress?.email;
    if ((orderEmail || '').toLowerCase() !== String(email).toLowerCase()) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const { user, shippingAddress, ...safe } = order;
    res.json({ order: safe, shippingAddress: { city: shippingAddress?.city } });
  } catch (err) {
    next(err);
  }
});

// POST /payments/:id/confirm - development gateway confirmation
router.post('/payments/:id/confirm', async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { cryptoTransaction: true, order: true },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status === 'completed')
      return res.status(409).json({ error: 'Payment already completed' });
    if (process.env.NODE_ENV === 'production' && payment.gateway?.startsWith('mock_')) {
      return res.status(403).json({ error: 'Mock confirmation disabled in production' });
    }

    const updated = await prisma.$transaction(async tx => {
      const p = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          paidAt: new Date(),
          transactionId: payment.transactionId || `mock_${randomBytes(8).toString('hex')}`,
        },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'paid',
          status: payment.order.status === 'pending' ? 'confirmed' : payment.order.status,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          fromStatus: payment.order.status,
          toStatus: payment.order.status === 'pending' ? 'confirmed' : payment.order.status,
          note: `Payment confirmed (${payment.method})`,
        },
      });
      if (payment.cryptoTransaction) {
        await tx.cryptoTransaction.update({
          where: { paymentId: payment.id },
          data: {
            confirmations: payment.cryptoTransaction.requiredConfirmations,
            confirmedAt: new Date(),
          },
        });
      }
      return p;
    });

    await auditLog({
      eventType: 'PAYMENT_COMPLETED',
      userId: req.user?.id || null,
      ip: req.ip,
      result: 'success',
      metadata: { paymentId: payment.id, method: payment.method },
    });
    res.json({ payment: updated });
  } catch (err) {
    next(err);
  }
});

// POST /payments/webhook/:gateway - idempotent gateway events
router.post('/payments/webhook/:gateway', async (req, res, next) => {
  try {
    const gateway = req.params.gateway;
    const b = req.body || {};
    const { gatewayEventId, status, transactionId, cryptoTxHash, confirmations, failureReason } = b;
    if (!gatewayEventId) return res.status(400).json({ error: 'gatewayEventId is required' });

    // Idempotency: event already processed?
    const existing = await prisma.payment.findUnique({ where: { gatewayEventId } });
    if (existing) return res.json({ received: true, duplicate: true, paymentId: existing.id });

    let payment = null;
    if (transactionId) {
      payment = await prisma.payment.findFirst({
        where: { transactionId },
        include: { order: true, cryptoTransaction: true },
      });
    }
    if (!payment && b.paymentId) {
      payment = await prisma.payment.findUnique({
        where: { id: b.paymentId },
        include: { order: true, cryptoTransaction: true },
      });
    }
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    const target = payment;

    const allowed = ['pending', 'processing', 'completed', 'failed', 'refunded'];
    const newStatus = allowed.includes(status) ? status : target.status;

    const updated = await prisma.$transaction(async tx => {
      const p = await tx.payment.update({
        where: { id: target.id },
        data: {
          status: newStatus,
          gatewayEventId,
          transactionId: transactionId || target.transactionId,
          failureReason: failureReason || target.failureReason,
          paidAt: newStatus === 'completed' ? new Date() : target.paidAt,
          cryptoTxHash: cryptoTxHash || target.cryptoTxHash,
        },
      });
      if (newStatus === 'completed') {
        await tx.order.update({
          where: { id: target.orderId },
          data: {
            paymentStatus: 'paid',
            cryptoTxHash: cryptoTxHash || undefined,
            status: target.order.status === 'pending' ? 'confirmed' : target.order.status,
          },
        });
      } else if (newStatus === 'failed') {
        await tx.order.update({ where: { id: target.orderId }, data: { paymentStatus: 'failed' } });
        // restore stock
        const items = await tx.orderItem.findMany({ where: { orderId: target.orderId } });
        for (const item of items) {
          const size = item.size
            ? await tx.productSize.findFirst({
                where: { productId: item.productId, name: item.size },
                include: { inventory: true },
              })
            : null;
          if (size?.inventory) {
            await tx.inventory.update({
              where: { id: size.inventory.id },
              data: { quantity: { increment: item.quantity } },
            });
            await tx.inventoryMovement.create({
              data: {
                inventoryId: size.inventory.id,
                delta: item.quantity,
                reason: 'cancel',
                note: 'payment failed',
              },
            });
          }
        }
      } else if (newStatus === 'refunded') {
        await tx.order.update({
          where: { id: target.orderId },
          data: { paymentStatus: 'refunded' },
        });
      }
      if (target.cryptoTransaction && confirmations != null) {
        await tx.cryptoTransaction.update({
          where: { paymentId: target.id },
          data: {
            confirmations: parseInt(confirmations, 10) || 0,
            txHash: cryptoTxHash || target.cryptoTransaction.txHash,
          },
        });
      }
      return p;
    });

    await auditLog({
      eventType: `PAYMENT_WEBHOOK_${String(status).toUpperCase()}`,
      ip: req.ip,
      result: 'success',
      metadata: { gateway, gatewayEventId, paymentId: target.id },
    });
    res.json({ received: true, paymentId: updated.id, status: updated.status });
  } catch (err) {
    next(err);
  }
});

export default router;
