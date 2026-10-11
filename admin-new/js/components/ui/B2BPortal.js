/**
 * DALLI B2B/Wholesale Portal
 * Tiered pricing, net terms, purchase orders, credit limits, dedicated account management
 */

export class B2BPortal {
  static init() {
    this.initTieredPricing();
    this.initNetTerms();
    this.initPurchaseOrders();
    this.initCreditLimits();
    this.initAccountManagement();
    this.initB2BCatalog();
    this.initQuotes();
    this.initBulkOrdering();
  }

  // ============================================================
  // TIERED PRICING
  // ============================================================
  static initTieredPricing() {
    this.pricingTiers = {
      bronze: {
        id: 'bronze',
        name: 'Bronze',
        nameLocal: 'Bronza',
        minOrder: 50000, // RSD
        discount: 0,
        paymentTerms: 'prepaid',
        shippingDiscount: 0,
        dedicatedSupport: false,
        apiAccess: false
      },
      silver: {
        id: 'silver',
        name: 'Silver',
        nameLocal: 'Srebro',
        minOrder: 200000,
        discount: 5, // 5%
        paymentTerms: 'net15',
        shippingDiscount: 10, // 10%
        dedicatedSupport: false,
        apiAccess: true
      },
      gold: {
        id: 'gold',
        name: 'Gold',
        nameLocal: 'Zlato',
        minOrder: 500000,
        discount: 10, // 10%
        paymentTerms: 'net30',
        shippingDiscount: 20,
        dedicatedSupport: true,
        apiAccess: true,
        priorityProcessing: true
      },
      platinum: {
        id: 'platinum',
        name: 'Platinum',
        nameLocal: 'Platina',
        minOrder: 1500000,
        discount: 15,
        paymentTerms: 'net60',
        shippingDiscount: 25,
        dedicatedSupport: true,
        apiAccess: true,
        priorityProcessing: true,
        dedicatedManager: true,
        customPricing: true,
        earlyAccess: true
      }
    };

    // Product-specific tier pricing overrides
    this.productTierPricing = new Map();
  }

  static getTierForOrder(total) {
    const tiers = ['platinum', 'gold', 'silver', 'bronze'];
    for (const tierId of tiers) {
      if (total >= this.tiers[tierId].minOrder) {
        return this.tiers[tierId];
      }
    }
    return this.tiers.bronze;
  }

  static getTierPricing(productId, quantity, tierId) {
    const basePrice = this.getBasePrice(productId);
    const tier = this.tiers[tierId];
    const volumeDiscount = this.getVolumeDiscount(quantity);
    const tierDiscount = tier.discount;
    
    const totalDiscount = Math.min(tierDiscount + volumeDiscount, 25); // Cap at 25%
    return Math.round(basePrice * (1 - totalDiscount / 100));
  }

  static getVolumeDiscount(quantity) {
    if (quantity >= 1000) return 5;
    if (quantity >= 500) return 3;
    if (quantity >= 100) return 2;
    if (quantity >= 50) return 1;
    return 0;
  }

  static setProductTierPricing(productId, pricing) {
    this.productTierPricing.set(productId, pricing);
  }

  static getProductTierPrice(productId, tierId, quantity = 1) {
    const override = this.productTierPricing.get(productId);
    if (override && override[tierId]) {
      return override[tierId];
    }
    return this.getTierPricing(productId, quantity, tierId);
  }

  // ============================================================
  // NET TERMS & CREDIT LIMITS
  // ============================================================
  static initNetTerms() {
    this.paymentTerms = {
      prepaid: { id: 'prepaid', name: 'Prepaid', days: 0, discount: 2 },
      net7: { id: 'net7', name: 'Net 7', days: 7, discount: 1 },
      net15: { id: 'net15', name: 'Net 15', days: 15, discount: 0 },
      net30: { id: 'net30', name: 'Net 30', days: 30, discount: 0 },
      net45: { id: 'net45', name: 'Net 45', days: 45, discount: -1 },
      net60: { id: 'net60', name: 'Net 60', days: 60, discount: -2 },
      net90: { id: 'net90', name: 'Net 90', days: 90, discount: -3 }
    };

    // Credit limits by tier
    this.creditLimits = {
      bronze: 50000,
      silver: 200000,
      gold: 1000000,
      platinum: 5000000
    };

    // Credit status tracking
    this.creditStatus = new Map();
  }

  static getCreditLimit(tierId) {
    return this.creditLimits[tierId] || 0;
  }

  static getAvailableCredit(customerId) {
    const status = this.creditStatus.get(customerId) || { limit: 0, used: 0 };
    return Math.max(0, status.limit - status.used);
  }

  static checkCreditLimit(customerId, amount) {
    const available = this.getAvailableCredit(customerId);
    return available >= amount;
  }

  static reserveCredit(customerId, amount) {
    const status = this.creditStatus.get(customerId) || { limit: 0, used: 0 };
    status.used += amount;
    this.creditStatus.set(customerId, status);
  }

  static releaseCredit(customerId, amount) {
    const status = this.creditStatus.get(customerId);
    if (status) {
      status.used = Math.max(0, status.used - amount);
      this.creditStatus.set(customerId, status);
    }
  }

  // ============================================================
  // PURCHASE ORDERS
  // ============================================================
  static initPurchaseOrders() {
    this.purchaseOrders = new Map();
    
    // PO statuses
    this.poStatuses = {
      draft: { id: 'draft', name: 'Draft', color: '#6b7280', next: ['submitted'] },
      submitted: { id: 'submitted', name: 'Submitted', color: '#3b82f6', next: ['approved', 'rejected'] },
      approved: { id: 'approved', name: 'Approved', color: '#10b981', next: ['processing'] },
      processing: { id: 'processing', name: 'Processing', color: '#f59e0b', next: ['shipped', 'partial'] },
      partial: { id: 'partial', name: 'Partially Shipped', color: '#8b5cf6', next: ['shipped'] },
      shipped: { id: 'shipped', name: 'Shipped', color: '#10b981', next: ['delivered'] },
      delivered: { id: 'delivered', name: 'Delivered', color: '#059669', next: ['completed'] },
      completed: { id: 'completed', name: 'Completed', color: '#059669', next: [] },
      cancelled: { id: 'cancelled', name: 'Cancelled', color: '#ef4444', next: [] },
      rejected: { id: 'rejected', name: 'Rejected', color: '#ef4444', next: [] }
    };
  }

  static createPurchaseOrder(data) {
    const po = {
      id: this.generatePOId(),
      customerId: data.customerId,
      customerTier: data.customerTier,
      items: data.items,
      subtotal: data.subtotal,
      discount: data.discount || 0,
      tax: data.tax || 0,
      shipping: data.shipping || 0,
      total: data.total,
      paymentTerms: data.paymentTerms || 'net30',
      status: 'draft',
      items: data.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
tierPrice: item.tierPrice
    })),
      shippingAddress: data.shippingAddress,
      billingAddress: data.billingAddress,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.userId
    };

    this.purchaseOrders.set(po.id, po);
    return po;
  }

  static updatePOStatus(poId, newStatus, userId) {
    const po = this.purchaseOrders.get(poId);
    if (!po) return { success: false, error: 'PO not found' };

    const statusDef = this.poStatuses[newStatus];
    if (!statusDef) return { success: false, error: 'Invalid status' };

    if (!statusDef.next.includes(po.status) && po.status !== newStatus) {
      return { success: false, error: `Cannot transition from ${po.status} to ${newStatus}` };
    }

    po.status = newStatus;
    po.updatedAt = new Date().toISOString();
    po.updatedBy = userId;
    po.statusHistory = po.statusHistory || [];
    po.statusHistory.push({
      from: po.status,
      to: newStatus,
      by: userId,
      at: new Date().toISOString()
    });

    this.purchaseOrders.set(poId, po);
    
    // Trigger events
    if (newStatus === 'approved') this.onPOApproved(po);
    if (newStatus === 'shipped') this.onPOShipped(po);
    if (newStatus === 'delivered') this.onPODelivered(po);

    return { success: true, po };
  }

  static addPOLine(poId, line) {
    const po = this.purchaseOrders.get(poId);
    if (!po || po.status !== 'draft') return { success: false };

    const lineItem = {
      id: this.generateLineId(),
      ...line,
      total: line.quantity * line.unitPrice
    };
    
    po.items.push(lineItem);
    this.recalculatePO(po);
    return { success: true, line: lineItem };
  }

  static removePOLine(poId, lineId) {
    const po = this.purchaseOrders.get(poId);
    if (!po || po.status !== 'draft') return { success: false };

    po.items = po.items.filter(l => l.id !== lineId);
    this.recalculatePO(po);
    return { success: true };
  }

  static recalculatePO(po) {
    po.subtotal = po.items.reduce((sum, item) => sum + item.total, 0);
    po.total = po.subtotal - po.discount + po.shipping + po.tax;
    po.updatedAt = new Date().toISOString();
  }

  // ============================================================
  // CREDIT LIMITS & MANAGEMENT
  // ============================================================
  static initCreditLimits() {
    // Credit application workflow
    this.creditApplications = new Map();
    
    // Credit scoring factors
    this.creditScoring = {
      paymentHistory: 0.35,
      orderVolume: 0.25,
      accountAge: 0.15,
      paymentTimeliness: 0.15,
      financialHealth: 0.10
    };
  }

  static async applyForCredit(customerId, requestedLimit, financialData) {
    const application = {
      id: this.generateId(),
      customerId,
      requestedLimit,
      financialData,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      documents: []
    };

    this.creditApplications.set(application.id, application);
    
    // Trigger review workflow
    this.triggerCreditReview(application.id);
    
    return { success: true, applicationId: application.id };
  }

  static async reviewCreditApplication(applicationId, decision, reviewerId, notes) {
    const app = this.creditApplications.get(applicationId);
    if (!app) return { success: false, error: 'Application not found' };

    app.status = decision; // approved, rejected, needs_info
    app.reviewedBy = reviewerId;
    app.reviewedAt = new Date().toISOString();
    app.notes = notes;
    app.approvedLimit = decision === 'approved' ? app.requestedLimit : 0;

    if (decision === 'approved') {
      this.setCreditLimit(app.customerId, app.approvedLimit);
      // Notify customer
      this.notifyCreditDecision(app.customerId, 'approved', app.approvedLimit);
    } else if (decision === 'rejected') {
      this.notifyCreditDecision(app.customerId, 'rejected', 0, notes);
    }

    return { success: true, application: app };
  }

  static setCreditLimit(customerId, limit) {
    const status = this.creditStatus.get(customerId) || { limit: 0, used: 0 };
    status.limit = limit;
    this.creditStatus.set(customerId, status);
  }

  // ============================================================
  // B2B CATALOG & PRICING
  // ============================================================
  static initB2BCatalog() {
    // B2B-specific product catalog with tier pricing
    this.b2bCatalog = new Map();
  }

  static getB2BProductPrice(productId, customerTier, quantity) {
    // Check for customer-specific pricing
    const customerPrice = this.getCustomerSpecificPrice(productId);
    if (customerPrice) return customerPrice;

    // Check tier pricing
    return this.getProductTierPrice(productId, this.getCustomerTier(), quantity);
  }

  static getCustomerSpecificPrice(productId) {
    // In real app, fetch from customer-specific pricing table
    return null;
  }

  static getCustomerTier() {
    // Get current customer's tier
    return JSON.parse(localStorage.getItem('dalli_customer_tier') || '"bronze"');
  }

  // ============================================================
  // QUOTE MANAGEMENT
  // ============================================================
  static initQuotes() {
    this.quotes = new Map();
  }

  static createQuote(data) {
    const quote = {
      id: this.generateQuoteId(),
      customerId: data.customerId,
      items: data.items,
      subtotal: data.subtotal,
      discount: data.discount || 0,
      tax: data.tax || 0,
      shipping: data.shipping || 0,
      total: data.total,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      status: 'pending',
      notes: data.notes,
      createdAt: new Date().toISOString(),
      createdBy: data.userId
    };

    this.quotes.set(quote.id, quote);
    return quote;
  }

  static convertQuoteToPO(quoteId, userId) {
    const quote = this.quotes.get(quoteId);
    if (!quote || quote.status !== 'pending') return { success: false };

    const po = this.createPurchaseOrder({
      customerId: quote.customerId,
      customerTier: this.getCustomerTier(),
      items: quote.items,
      subtotal: quote.subtotal,
      discount: quote.discount,
      tax: quote.tax,
      shipping: quote.shipping,
      total: quote.total,
      paymentTerms: 'net30',
      shippingAddress: quote.shippingAddress,
      billingAddress: quote.billingAddress,
      notes: quote.notes,
      userId
    });

    quote.status = 'converted';
    quote.convertedTo = po.id;
    quote.convertedAt = new Date().toISOString();

    return { success: true, po };
  }

  static expireOldQuotes() {
    const now = new Date().toISOString();
    this.quotes.forEach((quote, id) => {
      if (quote.status === 'pending' && quote.validUntil < now) {
        quote.status = 'expired';
      }
    });
  }

  // ============================================================
  // BULK ORDERING
  // ============================================================
  static initBulkOrdering() {
    this.bulkOrderThreshold = 50; // Minimum qty for bulk pricing
  }

  static calculateBulkDiscount(quantity, basePrice) {
    if (quantity >= 1000) return 0.15;
    if (quantity >= 500) return 0.10;
    if (quantity >= 200) return 0.07;
    if (quantity >= 100) return 0.05;
    if (quantity >= 50) return 0.03;
    return 0;
  }

  static createBulkOrder(data) {
    const items = data.items.map(item => {
      const basePrice = this.getBasePrice(item.productId);
      const bulkDiscount = this.calculateBulkDiscount(item.quantity, basePrice);
      const tierDiscount = this.tiers[data.customerTier]?.discount || 0;
      const totalDiscount = Math.min(bulkDiscount + tierDiscount / 100, 0.25);
      
      return {
        ...item,
        basePrice,
        bulkDiscount,
        tierDiscount: tierDiscount / 100,
        totalDiscount,
        finalPrice: basePrice * (1 - totalDiscount),
        total: basePrice * (1 - totalDiscount) * item.quantity
      };
    });

    return this.createPurchaseOrder({
      ...data,
      items,
      subtotal: items.reduce((sum, i) => sum + i.total, 0)
    });
  }

  // ============================================================
  // QUICK ORDER / REORDER
  // ============================================================
  static initQuickOrder() {
    // Quick order form for repeat purchases
    this.quickOrderTemplates = new Map();
  }

  static saveQuickOrderTemplate(customerId, name, items) {
    const template = {
      id: this.generateId(),
      customerId,
      name,
      items,
      createdAt: new Date().toISOString()
    };
    this.quickOrderTemplates.set(template.id, template);
    return template;
  }

  static getQuickOrderTemplates(customerId) {
    return Array.from(this.quickOrderTemplates.values())
      .filter(t => t.customerId === customerId);
  }

  static createOrderFromTemplate(templateId, modifications = {}) {
    const template = this.quickOrderTemplates.get(templateId);
    if (!template) return { success: false };

    const items = template.items.map(item => ({
      ...item,
      ...modifications.items?.find(m => m.productId === item.productId)
    })).filter(i => i.quantity > 0);

    return this.createPurchaseOrder({
      customerId: modifications.customerId,
      items,
      ...modifications
    });
  }

  // ============================================================
  // DEDICATED ACCOUNT MANAGEMENT
  // ============================================================
  static initAccountManagement() {
    this.accountManagers = new Map();
  }

  static assignAccountManager(customerId, managerId) {
    this.accountManagers.set(customerId, {
      managerId,
      assignedAt: new Date().toISOString(),
      contactEmail: `manager${managerId}@dalli.rs`,
      phone: `+381-11-${1000 + managerId}`
    });
  }

  static getAccountManager(customerId) {
    return this.accountManagers.get(customerId);
  }

  // ============================================================
  // ANALYTICS & REPORTING
  // ============================================================
  static initB2BAnalytics() {
    this.b2bMetrics = {
      totalRevenue: 0,
      orderCount: 0,
      avgOrderValue: 0,
      avgPaymentDays: 0,
      creditUtilization: 0,
      repeatRate: 0
    };
  }

  static generateB2BReport(customerId, period = 'monthly') {
    // Generate B2B analytics report
    return {
      customerId,
      period,
      generatedAt: new Date().toISOString(),
      summary: { ...this.b2bMetrics },
      orders: [],
      creditUsage: this.creditStatus.get(customerId) || {},
      topProducts: [],
      paymentHistory: []
    };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================
  static generatePOId() {
    return `PO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static generateQuoteId() {
    return `QT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateLineId() {
    return `LN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static generatePOId() {
    return `PO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  // ============================================================
  // EVENT HANDLERS
  // ============================================================
  static onPOApproved(po) {
    // Reserve credit
    this.reserveCredit(po.customerId, po.total);
    
    // Notify warehouse
    this.notifyWarehouse(po);
    
    // Send confirmation to customer
    this.notifyCustomerPOApproved(po);
  }

  static onPOShipped(po) {
    // Release credit (or adjust)
    this.releaseCredit(po.customerId, po.total);
    
    // Send tracking info
    this.sendTrackingInfo(po);
  }

  static onPODelivered(po) {
    // Release any remaining credit hold
    this.releaseCredit(po.customerId, po.total);
    
    // Trigger invoice
    this.generateInvoice(po);
  }

  static notifyWarehouse(po) {
    // Send to warehouse system
    console.log('Notify warehouse for PO:', po.id);
  }

  static notifyCustomerPOApproved(po) {
    window.showToast?.(`PO ${po.id} approved`, 'success');
  }

  static sendTrackingInfo(po) {
    window.showToast?.(`PO ${po.id} shipped`, 'success');
  }

  static generateInvoice(po) {
    // Generate invoice PDF
    console.log('Generate invoice for PO:', po.id);
  }

  static notifyCreditDecision(customerId, decision, limit, notes) {
    const messages = {
      approved: `Your credit limit has been approved: ${limit} RSD`,
      rejected: `Credit application declined: ${notes}`,
      needs_info: `Additional information required: ${notes}`
    };
    window.showToast?.(messages[decision], decision === 'approved' ? 'success' : 'warning');
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================
  static init() {
    this.initTieredPricing();
    this.initNetTerms();
    this.initPurchaseOrders();
    this.initCreditLimits();
    this.initPurchaseOrders();
    this.initCreditLimits();
    this.initB2BCatalog();
    this.initQuotes();
    this.initBulkOrdering();
    this.initQuickOrder();
    this.initAccountManagement();
    this.initB2BAnalytics();
    
    console.log('[B2BPortal] Initialized');
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => B2BPortal.init());
} else {
  B2BPortal.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { B2BPortal };
}

if (typeof window !== 'undefined') {
  window.B2BPortal = B2BPortal;
}