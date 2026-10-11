/**
 * DALLI Advanced Promotions Engine
 * Bundles, BOGO, Flash Sales, Cart Abandonment, Coupon Engine, Loyalty Rewards
 */

export class AdvancedPromotions {
  static init() {
    this.initCouponEngine();
    this.initBundleEngine();
    this.initBOGOEngine();
    this.initFlashSales();
    this.initCartAbandonment();
    this.initLoyaltyRewards();
    this.initPromotionScheduler();
    this.initABTesting();
  }

  // ============================================================
  // COUPON ENGINE
  // ============================================================
  static initCouponEngine() {
    this.coupons = new Map();
    this.couponCodes = new Set();
  }

  static createCoupon(data) {
    const coupon = {
      id: this.generateCouponId(),
      code: data.code || this.generateCouponCode(),
      name: data.name,
      description: data.description,
      type: data.type, // percentage, fixed, free_shipping, buy_x_get_y, bundle
      value: data.value, // percentage (0-100) or fixed amount
      maxDiscount: data.maxDiscount || null,
      minOrderValue: data.minOrderValue || 0,
      maxUses: data.maxUses || null,
      usedCount: 0,
      usagePerCustomer: data.usagePerCustomer || 1,
      startsAt: data.startsAt || new Date().toISOString(),
      expiresAt: data.expiresAt || null,
      status: 'active',
      restrictions: {
        categories: data.categories || [], // empty = all
        products: data.products || [], // empty = all
        customerGroups: data.customerGroups || [], // empty = all
        firstTimeOnly: data.firstTimeOnly || false,
        newCustomersOnly: data.newCustomersOnly || false,
        excludeSaleItems: data.excludeSaleItems || false
      },
      stacking: {
        allowStacking: data.allowStacking || false,
        stackableWith: data.stackableWith || []
      },
      usage: {
        total: 0,
        byCustomer: new Map()
      },
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy,
      metadata: data.metadata || {}
    };

    this.coupons.set(coupon.id, coupon);
    this.couponCodes.add(coupon.code);

    return { success: true, coupon };
  }

  static generateCouponCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += Math.floor(Math.random() * 32).toString(32).toUpperCase();
    }
    if (this.couponCodes.has(code)) return this.generateCouponCode();
    return code;
  }

  static generateCouponId() {
    return `CPN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static validateCoupon(code, cart, customer) {
    const coupon = Array.from(this.coupons.values()).find(c => c.code === code);
    if (!coupon) return { valid: false, error: 'Invalid coupon code' };
    if (coupon.status !== 'active') return { valid: false, error: 'Coupon is not active' };
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { valid: false, error: 'Coupon has expired' };
    if (coupon.startsAt && new Date(coupon.startsAt) > new Date()) return { valid: false, error: 'Coupon not yet valid' };
    if (coupon.maxUses && coupon.usage.total >= coupon.maxUses) return { valid: false, error: 'Coupon usage limit reached' };
    
    // Customer usage check
    const customerUsage = coupon.usage.byCustomer.get(customer.id) || 0;
    if (coupon.usagePerCustomer && customerUsage >= coupon.usagePerCustomer) {
      return { valid: false, error: 'Coupon usage limit reached for this customer' };
    }

    // First time only
    if (coupon.restrictions.firstTimeOnly && this.hasCustomerOrderedBefore(customer.id)) {
      return { valid: false, error: 'Coupon valid for first order only' };
    }

    // New customers only
    if (coupon.restrictions.newCustomersOnly && this.hasCustomerOrderedBefore(customer.id)) {
      return { valid: false, error: 'Coupon valid for new customers only' };
    }

    // Cart value check
    const cartSubtotal = this.getCartSubtotal(cart);
    if (cartSubtotal < coupon.minOrderValue) {
      return { valid: false, error: `Minimum order value ${coupon.minOrderValue} RSD required` };
    }

    // Category/product restrictions
    if (!this.checkCartRestrictions(cart, coupon.restrictions)) {
      return { valid: false, error: 'Coupon not valid for items in cart' };
    }

    // Exclude sale items
    if (coupon.restrictions.excludeSaleItems && this.hasSaleItems(cart)) {
      return { valid: false, error: 'Coupon not valid on sale items' };
    }

    // Stacking rules
    if (!coupon.stacking.allowStacking && this.hasOtherActiveCoupons(cart)) {
      return { valid: false, error: 'Coupon cannot be combined with other offers' };
    }

    return { valid: true, coupon };
  }

  static applyCoupon(coupon, cart) {
    const validation = this.validateCoupon(coupon.code, cart, this.getCurrentCustomer());
    if (!validation.valid) return { success: false, error: validation.error };

    const cartSubtotal = this.getCartSubtotal(cart);
    let discount = 0;

    switch (coupon.type) {
      case 'percentage':
        discount = cartSubtotal * (coupon.value / 100);
        if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
        break;
      case 'fixed':
        discount = Math.min(coupon.value, cartSubtotal);
        break;
      case 'free_shipping':
        discount = this.calculateShippingCost(cart);
        break;
      case 'buy_x_get_y':
        discount = this.calculateBXGYDiscount(coupon, cart);
        break;
      case 'bundle':
        discount = this.calculateBundleDiscount(coupon, cart);
        break;
    }

    // Apply discount
    const discountAmount = Math.min(discount, cartSubtotal);
    
    // Record usage
    this.recordCouponUsage(coupon.code, customerId, discountAmount);

    return {
      success: true,
      discount: discountAmount,
      coupon: coupon.code,
      message: `Coupon ${coupon.code} applied: ${this.formatPrice(discountAmount)} off`
    };
  }

  static recordCouponUsage(code, customerId, discount) {
    const coupon = Array.from(this.coupons.values()).find(c => c.code === code);
    if (!coupon) return;

    coupon.usage.total++;
    coupon.usage.byCustomer.set(customerId, (coupon.usage.byCustomer.get(customerId) || 0) + 1);
    coupon.usedCount = coupon.usage.total;
    coupon.lastUsedAt = new Date().toISOString();
  }

  // ============================================================
  // BUNDLE ENGINE
  // ============================================================
  static initBundleEngine() {
    this.bundles = new Map();
  }

  static createBundle(data) {
    const bundle = {
      id: this.generateBundleId(),
      name: data.name,
      description: data.description,
      type: data.type, // fixed, mix_match, build_your_own
      products: data.products, // [{ productId, quantity, required: true/false }]
      pricing: {
        type: data.pricingType, // fixed_price, discount_percentage, discount_fixed
        value: data.pricingValue,
        compareAtPrice: data.compareAtPrice
      },
      rules: {
        minProducts: data.minProducts || 1,
        maxProducts: data.maxProducts || null,
        requireAllRequired: data.requireAllRequired !== false,
        allowSubstitutes: data.allowSubstitutes || false
      },
      inventory: {
        trackInventory: data.trackInventory !== false,
        reserveOnAdd: data.reserveOnAdd !== false
      },
      display: {
        badge: data.badge || 'Bundle',
        badgeColor: data.badgeColor || 'primary',
        showSavings: true,
        showIndividualPrices: true
      },
      schedule: {
        startsAt: data.startsAt || new Date().toISOString(),
        expiresAt: data.expiresAt || null
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy
    };

    this.bundles.set(bundle.id, bundle);
    return { success: true, bundle };
  }

  static validateBundle(bundleId, cart) {
    const bundle = this.bundles.get(bundleId);
    if (!bundle || bundle.status !== 'active') return { valid: false, error: 'Bundle not available' };

    // Check schedule
    if (bundle.schedule.startsAt && new Date(bundle.schedule.startsAt) > new Date()) {
      return { valid: false, error: 'Bundle not yet available' };
    }
    if (bundle.schedule.expiresAt && new Date(bundle.schedule.expiresAt) < new Date()) {
      return { valid: false, error: 'Bundle has expired' };
    }

    // Check cart contains required products
    const cartProductIds = new Set(cart.items.map(i => i.productId));
    const requiredProducts = bundle.products.filter(p => p.required);
    
    for (const req of requiredProducts) {
      if (!cartProductIds.has(req.productId)) {
        return { valid: false, error: `Missing required product for bundle` };
      }
    }

    // Check min/max products
    const bundleProductsInCart = cart.items.filter(i => 
      bundle.products.some(bp => bp.productId === i.productId)
    );
    const bundleProductCount = bundleProductsInCart.reduce((sum, item) => sum + item.quantity, 0);

    if (bundleProductCount < bundle.rules.minProducts) {
      return { valid: false, error: `Minimum ${bundle.rules.minProducts} products required for bundle` };
    }
    if (bundle.rules.maxProducts && bundleProductCount > bundle.rules.maxProducts) {
      return { valid: false, error: `Maximum ${bundle.rules.maxProducts} products allowed in bundle` };
    }

    return { valid: true };
  }

  static calculateBundleDiscount(bundle, cart) {
    const bundleItems = cart.items.filter(i => 
      bundle.products.some(bp => bp.productId === i.productId)
    );

    const bundleSubtotal = bundleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discount = 0;

    switch (bundle.pricing.type) {
      case 'fixed_price':
        discount = Math.max(0, bundleItems.reduce((sum, item) => sum + item.price * item.quantity, 0) - bundle.pricing.value);
        break;
      case 'discount_percentage':
        discount = bundleSubtotal * (bundle.pricing.value / 100);
        break;
      case 'discount_fixed':
        discount = Math.min(bundle.pricing.value, bundleSubtotal);
        break;
    }

    return Math.max(0, discount);
  }

  static applyBundle(bundleId, cart) {
    const validation = this.validateBundle(bundleId, cart);
    if (!validation.valid) return { success: false, error: validation.error };

    const bundle = this.bundles.get(bundleId);
    const discount = this.calculateBundleDiscount(bundle, cart);

    return {
      success: true,
      discount,
      bundleId,
      message: `Bundle discount applied: ${this.formatPrice(discount)} off`
    };
  }

  // ============================================================
  // BOGO ENGINE (Buy X Get Y)
  // ============================================================
  static initBOGOEngine() {
    this.bogoOffers = new Map();
  }

  static createBOGO(data) {
    const bogo = {
      id: this.generateBOGOId(),
      name: data.name,
      description: data.description,
      type: data.type, // buy_x_get_y_free, buy_x_get_y_percent, buy_x_get_y_fixed
      buy: {
        quantity: data.buyQuantity || 1,
        products: data.buyProducts || [], // empty = any
        categories: data.buyCategories || []
      },
      get: {
        quantity: data.getQuantity || 1,
        products: data.getProducts || [], // empty = any
        categories: data.getCategories || [],
        discountType: data.getDiscountType || 'free', // free, percentage, fixed
        discountValue: data.getDiscountValue || 100 // 100% = free
      },
      limits: {
        maxApplications: data.maxApplications || 1, // per order
        maxPerCustomer: data.maxPerCustomer || null,
        requiresAllDifferent: data.requireDifferentProducts !== false
      },
      schedule: {
        startsAt: data.startsAt || new Date().toISOString(),
        expiresAt: data.expiresAt || null
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy
    };

    this.bogoOffers.set(bogo.id, bogo);
    return { success: true, bogo };
  }

  static calculateBXGYDiscount(bogo, cart) {
    // Find qualifying "buy" items
    const buyItems = cart.items.filter(item => 
      (bogo.buy.products.length === 0 || bogo.buy.products.includes(item.productId)) &&
      (bogo.buy.categories.length === 0 || bogo.buy.categories.includes(item.category))
    );

    const totalBuyQty = buyItems.reduce((sum, item) => sum + item.quantity, 0);
    const applications = Math.floor(totalBuyQty / bogo.buy.quantity);
    
    if (applications === 0) return 0;

    // Find eligible "get" items (cheapest first for max discount)
    const getItems = cart.items.filter(item => 
      (bogo.get.products.length === 0 || bogo.get.products.includes(item.productId)) &&
      (bogo.get.categories.length === 0 || bogo.get.categories.includes(item.category))
    ).sort((a, b) => a.price - b.price); // Cheapest first for max discount

    let discount = 0;
    let applicationsUsed = 0;

    for (const getItem of getItems) {
      if (applicationsUsed >= bogo.limits.maxApplications) break;
      
      const availableQty = getItem.quantity;
      const qtyToDiscount = Math.min(availableQty, bogo.get.quantity * (bogo.limits.maxApplications - applicationsUsed));
      
      if (qtyToDiscount <= 0) break;

      let itemDiscount = 0;
      switch (bogo.get.discountType) {
        case 'free':
          itemDiscount = getItem.price * qtyToDiscount;
          break;
        case 'percentage':
          itemDiscount = getItem.price * qtyToDiscount * (bogo.get.discountValue / 100);
          break;
        case 'fixed':
          itemDiscount = Math.min(bogo.get.discountValue * qtyToDiscount, getItem.price * qtyToDiscount);
          break;
      }

      discount += itemDiscount;
      applicationsUsed += Math.ceil(qtyToDiscount / bogo.get.quantity);
    }

    return Math.min(discount, this.getCartSubtotal(cart));
  }

  static applyBOGO(bogoId, cart) {
    const bogo = this.bogoOffers.get(bogoId);
    if (!bogo || bogo.status !== 'active') return { success: false, error: 'BOGO offer not available' };

    const discount = this.calculateBXGYDiscount(bogo, cart);
    if (discount <= 0) return { success: false, error: 'No qualifying items for BOGO offer' };

    return {
      success: true,
      discount,
      bogoId: bogo.id,
      message: `BOGO offer applied: ${this.formatPrice(discount)} off`
    };
  }

  // ============================================================
  // FLASH SALES
  // ============================================================
  static initFlashSales() {
    this.flashSales = new Map();
  }

  static createFlashSale(data) {
    const flashSale = {
      id: this.generateFlashSaleId(),
      name: data.name,
      description: data.description,
      products: data.products, // [{ productId, variantId, price, originalPrice, quantityLimit }]
      schedule: {
        startsAt: data.startsAt,
        expiresAt: data.expiresAt
      },
      display: {
        showCountdown: true,
        showStock: true,
        badge: data.badge || 'Flash Sale',
        color: data.color || '#ef4444'
      },
      limits: {
        maxPerCustomer: data.maxPerCustomer || 1,
        totalQuantity: data.totalQuantity || null
      },
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy
    };

    this.flashSales.set(flashSale.id, flashSale);
    
    // Schedule activation
    if (new Date(flashSale.schedule.startsAt) > new Date()) {
      setTimeout(() => this.activateFlashSale(flashSale.id), 
        new Date(flashSale.schedule.startsAt) - new Date());
    }

    // Schedule expiration
    setTimeout(() => this.deactivateFlashSale(flashSale.id),
      new Date(flashSale.schedule.expiresAt) - new Date());

    return { success: true, flashSale };
  }

  static activateFlashSale(flashSaleId) {
    const sale = this.flashSales.get(flashSaleId);
    if (!sale) return;

    sale.status = 'active';
    // Notify subscribers, update UI, etc.
    this.notifyFlashSaleStart(flashSaleId);
  }

  static deactivateFlashSale(flashSaleId) {
    const sale = this.flashSales.get(flashSaleId);
    if (!sale) return;

    sale.status = 'ended';
    // Notify
    this.notifyFlashSaleEnd(flashSaleId);
  }

  static getActiveFlashSales() {
    const now = new Date();
    return Array.from(this.flashSales.values())
      .filter(s => s.status === 'active' && 
        new Date(s.schedule.startsAt) <= new Date() && 
        new Date(s.schedule.expiresAt) >= new Date());
  }

  // ============================================================
  // CART ABANDONMENT RECOVERY
  // ============================================================
  static initCartAbandonment() {
    this.abandonedCarts = new Map();
    this.recoveryEmails = new Map();
    this.recoverySMS = new Map();
    this.recoveryPush = new Map();
  }

  static trackCartActivity(customerId, cart) {
    const now = Date.now();
    const key = `cart_${customerId}`;

    const activity = {
      customerId,
      cart: JSON.parse(JSON.stringify(cart)),
      lastActivity: Date.now(),
      abandonmentEmailSent: false,
      reminderSent: false,
      recovered: false,
      recoveredAt: null,
      recoveryChannel: null
    };

    this.abandonedCarts.set(key, activity);
  }

  static initAbandonmentTracking() {
    // Track cart changes
    document.addEventListener('cart:update', (e) => {
      const customerId = window.currentUserId;
      if (!customerId) return;
      this.trackCartActivity(customerId, e.detail.cart);
    });

    // Detect abandonment (no activity for 30 min)
    setInterval(() => {
      const now = Date.now();
      for (const [key, cart] of this.abandonedCarts.entries()) {
        if (cart.recovered) continue;
        if (now - cart.lastActivity > 30 * 60 * 1000) { // 30 minutes
          this.triggerAbandonmentRecovery(cart);
        }
      }
    }, 60000); // Check every minute
  }

  static triggerAbandonmentRecovery(cart) {
    // Stage 1: Email after 30 min
    if (!cart.abandonmentEmailSent) {
      this.sendAbandonmentEmail(cart);
      cart.abandonmentEmailSent = true;
    }

    // Stage 2: Push notification after 2 hours
    if (!cart.reminderSent && Date.now() - cart.lastActivity > 2 * 60 * 60 * 1000) {
      this.sendAbandonmentPush(cart);
      cart.reminderSent = true;
    }

    // Stage 3: SMS after 24 hours
    // if (!cart.smsSent && Date.now() - cart.lastActivity > 24 * 60 * 60 * 1000) { ... }
  }

  static sendAbandonmentEmail(cart) {
    // Send email with cart items and incentive
    const incentive = this.generateRecoveryIncentive(cart.customerId);
    
    // In production, send via email service
    console.log('Sending abandonment email to customer', cart.customerId);
  }

  static sendAbandonmentPush(cart) {
    // Send push notification
    console.log('Sending abandonment push to customer', cart.customerId);
  }

  static generateRecoveryIncentive(customerId) {
    // Generate personalized incentive
    const incentives = [
      { type: 'percentage', value: 10, label: '10% off your order' },
      { type: 'fixed', value: 500, label: '500 RSD off' },
      { type: 'free_shipping', label: 'Free shipping' }
    ];
    return incentives[Math.floor(Math.random() * incentives.length)];
  }

  static markCartRecovered(customerId, orderId) {
    const key = `cart_${customerId}`;
    const cart = this.abandonedCarts.get(key);
    if (cart) {
      cart.recovered = true;
      cart.recoveredAt = new Date().toISOString();
      cart.recoveryOrderId = orderId;
    }
  }

  // ============================================================
  // LOYALTY REWARDS INTEGRATION
  // ============================================================
  static initLoyaltyRewards() {
    // Integration with LoyaltyGamification
  }

  static applyLoyaltyRewards(cart, customerId) {
    // Apply loyalty points redemption
    // Apply tier benefits
    // Apply VIP perks
  }

  // ============================================================
  // PROMOTION SCHEDULER
  // ============================================================
  static initPromotionScheduler() {
    this.scheduledPromotions = new Map();
  }

  static schedulePromotion(promotionId, schedule) {
    // Schedule promotion activation/deactivation
    const promotion = this.getPromotion(promotionId);
    if (!promotion) return;

    if (schedule.startsAt) {
      const delay = new Date(schedule.startsAt) - new Date();
      if (delay > 0) {
        setTimeout(() => this.activatePromotion(promotionId), delay);
      }
    }

    if (schedule.expiresAt) {
      const delay = new Date(schedule.expiresAt) - new Date();
      if (delay > 0) {
        setTimeout(() => this.deactivatePromotion(promotionId), delay);
      }
    }

    this.scheduledPromotions.set(promotionId, { ...schedule, promotionId });
  }

  static activatePromotion(promotionId) {
    const promotion = this.getPromotion(promotionId);
    if (promotion) {
      promotion.status = 'active';
      this.notifyPromotionStart(promotionId);
    }
  }

  static deactivatePromotion(promotionId) {
    const promotion = this.getPromotion(promotionId);
    if (promotion) {
      promotion.status = 'ended';
      this.notifyPromotionEnd(promotionId);
    }
  }

  // ============================================================
  // A/B TESTING FOR PROMOTIONS
  // ============================================================
  static initABTesting() {
    this.abTests = new Map();
  }

  static createABTest(data) {
    const test = {
      id: this.generateABTestId(),
      name: data.name,
      hypothesis: data.hypothesis,
      variants: data.variants, // [{ id, name, trafficPercent, promotionId }]
      status: 'draft',
      startDate: data.startDate,
      endDate: data.endDate,
      targetMetric: data.targetMetric, // conversion_rate, revenue, aov
      confidenceLevel: data.confidenceLevel || 0.95,
      minSampleSize: data.minSampleSize || 100,
      results: new Map(),
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy
    };

    this.abTests.set(test.id, test);
    return { success: true, test };
  }

  static startABTest(testId) {
    const test = this.abTests.get(testId);
    if (!test) return { success: false };

    test.status = 'running';
    test.startedAt = new Date().toISOString();
    
    // Assign users to variants
    this.assignUsersToVariants(test);
    
    return { success: true, test };
  }

  static assignUsersToVariants(test) {
    // Assign users to variants based on traffic percentage
    // Store assignment in localStorage/cookie
  }

  static recordABTestEvent(testId, variantId, event, value = 1) {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'running') return;

    if (!test.results.has(variantId)) {
      test.results.set(variantId, { visitors: 0, conversions: 0, revenue: 0 });
    }

    const result = test.results.get(variantId);
    result.visitors += 1;
    if (event === 'conversion') result.conversions += 1;
    if (event === 'revenue') result.revenue += value;
  }

  static getABTestResults(testId) {
    const test = this.abTests.get(testId);
    if (!test) return null;

    const results = {};
    for (const [variantId, data] of test.results.entries()) {
      const variant = test.variants.find(v => v.id === variantId);
      results[variantId] = {
        ...data,
        variantName: variant?.name,
        conversionRate: data.visitors > 0 ? data.conversions / data.visitors : 0,
        avgOrderValue: data.conversions > 0 ? data.revenue / data.conversions : 0
      };
    }

    return { test: test.id, status: test.status, results };
  }

  // ============================================================
  // UTILITIES
  // ============================================================
  static getCurrentCustomer() {
    return JSON.parse(localStorage.getItem('dalli_user') || 'null');
  }

  static hasCustomerOrderedBefore(customerId) {
    // Check if customer has previous orders
    return false; // Mock
  }

  static getCartSubtotal(cart) {
    return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  static hasCustomerOrderedBefore(customerId) {
    return false; // Mock
  }

  static checkCartRestrictions(cart, restrictions) {
    if (restrictions.categories.length === 0 && restrictions.products.length === 0) return true;
    return cart.items.some(item => 
      restrictions.categories.includes(item.category) || 
      restrictions.products.includes(item.productId)
    );
  }

  static hasSaleItems(cart) {
    return cart.items.some(item => item.salePrice && item.salePrice < item.price);
  }

  static hasOtherActiveCoupons(cart) {
    return false; // Mock
  }

  static calculateShippingCost(cart) {
    return 290; // Mock
  }

  static calculateBXGYDiscount(coupon, cart) {
    return 0; // Mock
  }

  static calculateBundleDiscount(coupon, cart) {
    return 0; // Mock
  }

  static formatPrice(amount) {
    return window.I18n?.formatPrice?.(amount) || `${amount.toLocaleString('sr-RS')} RSD`;
  }

  static formatPrice(amount) {
    return window.I18n?.formatPrice?.(amount) || `${amount.toLocaleString('sr-RS')} RSD`;
  }

  // ============================================================
  // ID GENERATORS
  // ============================================================
  static generateCouponId() {
    return `CPN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static generateBundleId() {
    return `BND-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static generateBOGOId() {
    return `BGO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static generateFlashSaleId() {
    return `FLS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static generateCouponId() {
    return `CPN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static generateBundleId() {
    return `BND-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static generateFlashSaleId() {
    return `FLS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static generateABTestId() {
    return `ABT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  // ============================================================
  // NOTIFICATION HELPERS
  // ============================================================
  static notifyFlashSaleStart(flashSaleId) {
    // Notify subscribers
  }

  static notifyFlashSaleEnd(flashSaleId) {
    // Notify
  }

  static notifyPromotionStart(promotionId) {
    // Notify
  }

  static notifyPromotionEnd(promotionId) {
    // Notify
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================
  static init() {
    this.initCouponEngine();
    this.initBundleEngine();
    this.initBOGOEngine();
    this.initFlashSales();
    this.initCartAbandonment();
    this.initLoyaltyRewards();
    this.initPromotionScheduler();
    this.initABTesting();
    this.initAbandonmentTracking();
    
    console.log('[AdvancedPromotions] Initialized');
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AdvancedPromotions.init());
} else {
  AdvancedPromotions.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdvancedPromotions };
}

if (typeof window !== 'undefined') {
  window.AdvancedPromotions = AdvancedPromotions;
}