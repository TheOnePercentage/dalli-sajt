/**
 * Order Schema - Crypto Payment Extension
 * 
 * Extends the existing order schema with crypto payment fields.
 * This is the single source of truth for order structure with crypto payments.
 */

// ============================================================
// ORDER STATUS FLOW
// ============================================================

export const ORDER_STATUS = {
  // Standard statuses
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  
  // Crypto-specific statuses
  PENDING_PAYMENT: 'pending_payment',
  CONFIRMING: 'confirming',
  CONFIRMED_CRYPTO: 'confirmed_crypto',
  FAILED: 'failed',
  EXPIRED: 'expired',
  REFUNDED_CRYPTO: 'refunded_crypto'
};

/**
 * Check if status is a crypto-specific status
 */
export function isCryptoOrderStatus(status) {
  return [
    'pending_payment',
    'confirming',
    'confirmed_crypto',
    'failed',
    'expired',
    'refunded_crypto'
  ].includes(status);
}

/**
 * Check if order can be cancelled
 */
export function canCancelOrder(status) {
  return ['pending', 'pending_payment', 'confirmed'].includes(status);
}

/**
 * Check if order can be refunded
 */
export function canRefundOrder(status) {
  return ['confirmed', 'confirmed_crypto', 'delivered'].includes(status);
}

/**
 * Get next possible statuses
 */
export function getNextStatuses(currentStatus) {
  const transitions = {
    'pending': ['confirmed', 'cancelled'],
    'pending_payment': ['confirming', 'failed', 'expired'],
    'confirming': ['confirmed_crypto', 'failed'],
    'confirmed_crypto': ['processing', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['shipped'],
    'shipped': ['delivered'],
    'delivered': ['refunded'],
    'failed': ['pending_payment', 'cancelled'],
    'expired': ['pending_payment', 'cancelled'],
    'cancelled': [],
    'refunded': [],
    'refunded_crypto': []
  };
  
  return transitions[currentStatus] || [];
}

// ============================================================
// PAYMENT STATUS
// ============================================================

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIAL: 'partial',
  PENDING_CRYPTO: 'pending_crypto',
  CONFIRMING_CRYPTO: 'confirming_crypto',
  CONFIRMED_CRYPTO: 'confirmed_crypto',
  FAILED_CRYPTO: 'failed_crypto',
  EXPIRED_CRYPTO: 'expired_crypto',
  REFUNDED_CRYPTO: 'refunded_crypto'
};

/**
 * Check if payment is crypto-related
 */
export function isCryptoPaymentStatus(status) {
  return ['pending_crypto', 'confirming_crypto', 'confirmed_crypto', 'failed_crypto', 'expired_crypto', 'refunded_crypto'].includes(status);
}

// ============================================================
// PAYMENT METHOD TYPES
// ============================================================

export const PAYMENT_METHOD_TYPES = {
  TRADITIONAL: 'traditional',
  CRYPTO: 'crypto'
};

export const PAYMENT_METHODS = {
  COD: 'cod',
  BANK_TRANSFER: 'bank-transfer',
  CARD: 'card',
  CRYPTO: 'crypto'
};

// ============================================================
// EXTENDED ORDER SCHEMA
// ============================================================

/**
 * Complete order schema with crypto payment support
 */
export const EXTENDED_ORDER_SCHEMA = {
  // Core identifiers
  orderNumber: {
    type: 'string',
    required: true,
    pattern: '^DLL-[A-Z0-9]+$'
  },
  
  // Status tracking
  status: {
    type: 'string',
    enum: Object.values(ORDER_STATUS),
    default: 'pending',
    required: true
  },
  
  paymentStatus: {
    type: 'string',
    enum: Object.values(PAYMENT_STATUS),
    default: 'pending',
    required: true
  },
  
  paymentMethod: {
    type: 'string',
    enum: Object.values(PAYMENT_METHODS),
    required: true
  },
  
  // Customer info
  customer: {
    firstName: { type: 'string', required: true },
    lastName: { type: 'string', required: true },
    email: { type: 'string', required: true, format: 'email' },
    phone: { type: 'string', required: true },
    marketingConsent: { type: 'boolean', default: false }
  },
  
  // Shipping
  shipping: {
    address: { type: 'string', required: true },
    city: { type: 'string', required: true },
    postalCode: { type: 'string', required: true },
    country: { type: 'string', default: 'RS' },
    instructions: { type: 'string' }
  },
  
  // Items
  items: {
    type: 'array',
    required: true,
    minItems: 1,
    items: {
      productId: { type: 'number', required: true },
      variantId: { type: 'string', required: true },
      name: { type: 'string', required: true },
      color: { type: 'string' },
      size: { type: 'string' },
      qty: { type: 'integer', minimum: 1, required: true },
      price: { type: 'number', minimum: 0, required: true },
      image: { type: 'string' }
    }
  },
  
  // Totals
  totals: {
    subtotal: { type: 'number', minimum: 0, required: true },
    shipping: { type: 'number', minimum: 0, default: 0 },
    discount: { type: 'number', minimum: 0, default: 0 },
    total: { type: 'number', minimum: 0, required: true }
  },
  
  // Crypto payment details (only when paymentMethod === 'crypto')
  cryptoDetails: {
    currency: {
      type: 'string',
      enum: ['BTC', 'ETH', 'USDT', 'USDC']
    },
    amountCrypto: {
      type: 'number',
      minimum: 0
    },
    amountRSD: {
      type: 'number',
      minimum: 0
    },
    exchangeRate: {
      type: 'number',
      minimum: 0
    },
    exchangeRateProvider: {
      type: 'string',
      default: 'coingecko'
    },
    exchangeRateTimestamp: {
      type: 'string',
      format: 'date-time'
    },
    walletAddress: {
      type: 'string'
    },
    qrCodeData: {
      type: 'string'
    },
    qrCodeImage: {
      type: 'string'
    },
    transactionId: {
      type: 'string'
    },
    confirmations: {
      type: 'integer',
      minimum: 0,
      default: 0
    },
    requiredConfirmations: {
      type: 'integer',
      minimum: 0
    },
    status: {
      type: 'string',
      enum: [
        'pending_payment',
        'confirming',
        'confirmed',
        'failed',
        'expired',
        'refunded',
        'partial'
      ],
      default: 'pending_payment'
    },
    paidAt: {
      type: 'string',
      format: 'date-time'
    },
    confirmedAt: {
      type: 'string',
      format: 'date-time'
    },
    expiredAt: {
      type: 'string',
      format: 'date-time'
    },
    discountApplied: {
      type: 'boolean',
      default: false
    },
    discountRate: {
      type: 'number',
      default: 0.15
    },
    discountAmountRSD: {
      type: 'number',
      minimum: 0,
      default: 0
    },
    exchangeRateRSD: {
      type: 'number',
      minimum: 0
    },
    exchangeRateProvider: {
      type: 'string',
      default: 'coingecko'
    },
    exchangeRateTimestamp: {
      type: 'string',
      format: 'date-time'
    },
    retryCount: {
      type: 'integer',
      minimum: 0,
      default: 0
    },
    lastRetryAt: {
      type: 'string',
      format: 'date-time'
    },
    webhookEvents: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          event: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          data: { type: 'object' }
        }
      },
      default: []
    }
  },
  
  // Timestamps
  createdAt: {
    type: 'string',
    format: 'date-time',
    required: true
  },
  updatedAt: {
    type: 'string',
    format: 'date-time',
    required: true
  },
  paidAt: {
    type: 'string',
    format: 'date-time'
  },
  confirmedAt: {
    type: 'string',
    format: 'date-time'
  },
  shippedAt: {
    type: 'string',
    format: 'date-time'
  },
  deliveredAt: {
    type: 'string',
    format: 'date-time'
  },
  cancelledAt: {
    type: 'string',
    format: 'date-time'
  }
};

/**
 * Validate order object against schema
 */
export function validateOrder(order) {
  const errors = [];
  
  // Required fields
  if (!order.orderNumber) errors.push('orderNumber is required');
  if (!order.status) errors.push('status is required');
  if (!order.paymentMethod) errors.push('paymentMethod is required');
  if (!order.customer || !order.customer.email) errors.push('customer.email is required');
  if (!order.items || !order.items.length) errors.push('items is required and must not be empty');
  if (!order.totals || typeof order.totals.total !== 'number') errors.push('totals.total is required');
  
  // Crypto-specific validation
  if (order.paymentMethod === 'crypto') {
    if (!order.cryptoDetails) {
      errors.push('cryptoDetails is required for crypto payments');
    } else {
      if (!order.cryptoDetails.currency) errors.push('cryptoDetails.currency is required');
      if (typeof order.cryptoDetails.amountRSD !== 'number') errors.push('cryptoDetails.amountRSD is required');
      if (typeof order.cryptoDetails.exchangeRate !== 'number') errors.push('cryptoDetails.exchangeRate is required');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create default order object with crypto fields
 */
export function createOrderTemplate(data = {}) {
  const now = new Date().toISOString();
  const orderNumber = 'DLL-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return {
    orderNumber,
    status: data.status || 'pending',
    paymentStatus: data.paymentStatus || 'pending',
    paymentMethod: data.paymentMethod || 'cod',
    
    customer: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      marketingConsent: false,
      ...data.customer
    },
    
    shipping: {
      address: '',
      city: '',
      postalCode: '',
      country: 'RS',
      instructions: '',
      ...data.shipping
    },
    
    items: data.items || [],
    
    totals: {
      subtotal: 0,
      shipping: 0,
      discount: 0,
      total: 0,
      ...data.totals
    },
    
    cryptoDetails: data.paymentMethod === 'crypto' ? {
      currency: null,
      amountCrypto: null,
      amountRSD: null,
      exchangeRate: null,
      exchangeRateProvider: 'coingecko',
      exchangeRateTimestamp: null,
      walletAddress: null,
      qrCodeData: null,
      qrCodeImage: null,
      transactionId: null,
      confirmations: 0,
      requiredConfirmations: null,
      status: 'pending_payment',
      paidAt: null,
      confirmedAt: null,
      expiredAt: null,
      discountApplied: false,
      discountRate: 0.15,
      discountAmountRSD: 0,
      exchangeRateRSD: null,
      exchangeRateProvider: 'coingecko',
      exchangeRateTimestamp: null,
      retryCount: 0,
      lastRetryAt: null,
      webhookEvents: []
    } : null,
    
    createdAt: now,
    updatedAt: now,
    paidAt: null,
    confirmedAt: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    
    ...data
  };
}

/**
 * Generate order number
 */
export function generateOrderNumber() {
  return 'DLL-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

/**
 * Update order timestamp
 */
export function updateOrderTimestamp(order) {
  return {
    ...order,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Transition order status
 */
export function transitionOrderStatus(order, newStatus) {
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'pending_payment': ['confirming', 'failed', 'expired'],
    'confirming': ['confirmed_crypto', 'failed'],
    'confirmed_crypto': ['processing', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['shipped'],
    'shipped': ['delivered'],
    'delivered': ['refunded'],
    'failed': ['pending_payment', 'cancelled'],
    'expired': ['pending_payment', 'cancelled'],
    'cancelled': [],
    'refunded': [],
    'refunded_crypto': []
  };
  
  const allowed = validTransitions[order.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
  }
  
  return {
    ...order,
    status: newStatus,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Get payment method display info
 */
export function getPaymentMethodInfo(method) {
  const methods = {
    'cod': { name: 'Plaćanje pri preuzimanju', type: 'traditional', icon: 'cod' },
    'bank-transfer': { name: 'Bankovni prenos', type: 'traditional', icon: 'bank-transfer' },
    'card': { name: 'Kreditna / Debitna kartica', type: 'traditional', icon: 'card' },
    'crypto': { name: 'Kripto plaćanje', type: 'crypto', icon: 'crypto' }
  };
  
  return methods[method] || { name: method, type: 'unknown', icon: 'unknown' };
}

/**
 * Check if payment method is crypto
 */
export function isCryptoPaymentMethod(method) {
  return method === 'crypto';
}

/**
 * Get crypto payment display name
 */
export function getCryptoDisplayName(currency) {
  const names = {
    'BTC': 'Bitcoin (BTC)',
    'ETH': 'Ethereum (ETH)',
    'USDT': 'Tether (USDT)',
    'USDC': 'USD Coin (USDC)'
  };
  
  return names[currency] || currency;
}

export default {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD_TYPES,
  PAYMENT_METHODS,
  EXTENDED_ORDER_SCHEMA,
  validateOrder,
  createOrderTemplate,
  generateOrderNumber: () => 'DLL-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase(),
  updateOrderTimestamp,
  transitionOrderStatus,
  getPaymentMethodInfo,
  isCryptoPaymentMethod,
  getCryptoDisplayName,
  isCryptoOrderStatus,
  isCryptoPaymentStatus: (status) => ['pending_crypto', 'confirming_crypto', 'confirmed_crypto', 'failed_crypto', 'expired_crypto', 'refunded_crypto'].includes(status)
};