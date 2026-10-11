/**
 * DALLI Subscription & Recurring Orders
 * Subscribe & Save, flexible intervals, pause/skip/cancel, dunning, trials, gift subscriptions
 */

export class SubscriptionManager {
  static init() {
    this.initSubscriptionPlans();
    this.initSubscriptionManagement();
    this.initDunningManagement();
    this.initTrialManagement();
    this.initGiftSubscriptions();
    this.initSubscriptionPortal();
  }

  // ============================================================
  // SUBSCRIPTION PLANS & PRICING
  // ============================================================
  static initSubscriptionPlans() {
    this.plans = {
      'subscribe-save-5': {
        id: 'subscribe-save-5',
        name: 'Subscribe & Save 5%',
        description: 'Save 5% on every delivery',
        discountPercent: 5,
        intervals: [
          { value: '2weeks', label: 'Every 2 weeks', days: 14 },
          { value: 'monthly', label: 'Monthly', days: 30 },
          { value: '6weeks', label: 'Every 6 weeks', days: 42 },
          { value: 'quarterly', label: 'Quarterly', days: 90 }
        ],
        minCommitment: 2, // minimum deliveries
        maxDiscount: 15, // cap at 15%
        eligibleProducts: ['consumables', 'essentials'],
        features: ['free_shipping', 'priority_support', 'early_access']
      },
      'subscribe-save-10': {
        id: 'subscribe-save-10',
        name: 'Subscribe & Save 10%',
        description: 'Save 10% + free shipping',
        discountPercent: 10,
        intervals: [
          { value: 'monthly', label: 'Monthly', days: 30 },
          { value: 'quarterly', label: 'Quarterly', days: 90 }
        ],
        minCommitment: 3,
        maxDiscount: 15,
        eligibleProducts: ['consumables', 'essentials', 'bundles'],
        features: ['free_shipping', 'priority_support', 'early_access', 'exclusive_products']
      },
      'subscribe-save-15': {
        id: 'subscribe-save-15',
        name: 'Subscribe & Save 15%',
        description: 'Maximum savings + VIP perks',
        discountPercent: 15,
        intervals: [
          { value: 'monthly', label: 'Monthly', days: 30 },
          { value: 'quarterly', label: 'Quarterly', days: 90 }
        ],
        minCommitment: 4,
        maxDiscount: 20,
        eligibleProducts: 'all',
        features: ['free_shipping', 'priority_support', 'early_access', 'exclusive_products', 'dedicated_support', 'birthday_gift']
      }
    };

    // Product eligibility
    this.productEligibility = new Map();
  }

  static registerProductEligibility(productId, planIds) {
    this.productEligibility.set(productId, planIds);
  }

  static getEligiblePlans(productId) {
    return this.productEligibility.get(productId) || [];
  }

  // ============================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================
  static initSubscriptionManagement() {
    // Subscribe button handlers
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="subscribe"]');
      if (!btn) return;

      e.preventDefault();
      const productId = btn.dataset.productId;
      const planId = btn.dataset.planId || this.getDefaultPlanForProduct(btn.dataset.productId);
      
      this.openSubscriptionModal(btn.dataset.productId, planId);
    });

    // Manage subscription buttons
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="manage-subscription"]');
      if (btn) {
        e.preventDefault();
        this.openSubscriptionPortal(btn.dataset.subscriptionId);
      }
    });
  }

  static getDefaultPlanForProduct(productId) {
    const eligible = this.getEligiblePlans(productId);
    return eligible[0] || 'subscribe-save-5';
  }

  static openSubscriptionModal(productId, planId) {
    const product = this.getProductData(productId);
    const plan = this.plans[planId];
    
    if (!product || !plan) return;

    const modal = this.createSubscriptionModal(product, plan);
    document.body.appendChild(modal);
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Focus trap
    this.trapFocus(modal);
  }

  static createSubscriptionModal(product, plan) {
    const intervalOptions = plan.intervals.map(i => 
      `<option value="${i.value}">${i.label}</option>`
    ).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'subscriptionModalTitle');
    modal.innerHTML = `
      <div class="modal-modern" style="max-width: 560px;">
        <div class="modal-header">
          <h3 id="subscriptionModalTitle">Subscribe & Save</h3>
          <button class="modal-close" aria-label="Zatvori" data-action="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="subscription-product">
            <img src="${this.getProductImage(product)}" alt="${product.name}" width="80" height="80" style="border-radius: var(--radius-lg);">
            <div>
              <h4>${product.name}</h4>
              <p class="product-price">${this.formatPrice(product.price)}</p>
            </div>
          </div>
          
          <div class="subscription-options">
            <div class="form-group">
              <label>Delivery frequency</label>
              <select class="form-field__input" id="subscriptionInterval" required>
                ${plan.intervals.map(i => `<option value="${i.value}">${i.label}</option>`).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label>Quantity per delivery</label>
              <div class="quantity-selector">
                <button type="button" class="qty-btn" data-action="decrease" aria-label="Decrease">−</button>
                <input type="number" id="subscriptionQty" value="1" min="1" max="10" class="form-field__input" style="width: 60px; text-align: center;">
                <button type="button" class="qty-btn" data-action="increase" aria-label="Increase">+</button>
              </div>
            </div>
            
            <div class="form-group">
              <label>Start date</label>
              <input type="date" id="subscriptionStartDate" class="form-field__input" min="${new Date().toISOString().split('T')[0]}" required>
            </div>
          </div>

          <div class="subscription-summary">
            <div class="summary-row">
              <span>Base price</span>
              <span id="basePrice">${this.formatPrice(window.I18n?.formatPrice?.(product.price) || product.price)}</span>
            </div>
            <div class="summary-row summary-row--discount">
              <span>Subscription discount (<span id="discountPercent">${100 - (100 - 5)}</span>%)</span>
              <span class="text-success" id="discountAmount">-${this.formatPrice(product.price * 0.05)}</span>
            </div>
            <div class="summary-row">
              <span>Price per delivery</span>
              <strong id="deliveryPrice">${this.formatPrice(product.price * 0.95)}</span>
            </div>
            <div class="summary-row">
              <span>Delivery frequency</span>
              <span id="frequencyLabel">Monthly</span>
            </div>
            <hr style="margin: var(--space-3) 0; border-color: var(--color-divider);">
            <div class="summary-row summary-row--total">
              <span>Estimated monthly</span>
              <strong id="monthlyTotal">${this.formatPrice(product.price * 0.95)}</span>
            </div>
            <p class="subscription-note">Minimum ${3} deliveries. Cancel anytime after minimum period.</p>
          </div>

          <div class="subscription-benefits">
            <h4>Subscription benefits</h4>
            <ul>
              ${['free_shipping', 'priority_support', 'early_access', 'exclusive_products'].map(f => 
                `<li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ${this.getFeatureLabel(f)}</li>`
              ).join('')}
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-block" data-action="close-modal">Cancel</button>
          <button type="button" class="btn btn-primary btn-block" data-action="confirm-subscription" data-product-id="${product.id}" data-plan-id="${plan.id}">Start Subscription</button>
        </div>
      </div>
    `;

    return modal;
  }

  static getProductImage(product) {
    return product.images?.main || '/images/placeholder.jpg';
  }

  static formatPrice(amount) {
    return window.I18n?.formatPrice?.(amount) || `${amount.toLocaleString('sr-RS')} RSD`;
  }

  static getFeatureLabel(feature) {
    const labels = {
      'free_shipping': 'Free shipping on all deliveries',
      'priority_support': 'Priority customer support',
      'early_access': 'Early access to new products',
      'exclusive_products': 'Exclusive subscriber-only products',
      'dedicated_support': 'Dedicated account manager',
      'birthday_gift': 'Annual birthday gift'
    };
    return feature;
  }

  static async confirmSubscription(productId, planId, options) {
    const { interval, quantity, startDate } = options;
    
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          planId,
          interval,
          quantity,
          startDate
        })
      });

      const data = await response.json();
      
      if (data.success) {
        window.showToast?.('Subscription created successfully!', 'success');
        this.closeModal(document.querySelector('.modal-overlay.open'));
        this.refreshSubscriptionList();
      } else {
        window.showToast?.(data.message || 'Failed to create subscription', 'error');
      }
    } catch (e) {
      window.showToast?.('Failed to create subscription', 'error');
    }
  }

  // ============================================================
  // SUBSCRIPTION PORTAL (User Management)
  // ============================================================
  static initSubscriptionPortal() {
    // This would be a full page or section in user profile
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="view-subscriptions"]')) {
        this.openSubscriptionPortal();
      }
    });
  }

  static openSubscriptionPortal() {
    // In a real app, this would navigate to /profile/subscriptions
    // For now, open a modal with subscription list
    this.loadUserSubscriptions().then(subscriptions => {
      const modal = this.createSubscriptionPortalModal(subscriptions);
      document.body.appendChild(modal);
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  static async loadUserSubscriptions() {
    try {
      const response = await fetch('/api/user/subscriptions', { credentials: 'include' });
      return await response.json();
    } catch (e) {
      return { subscriptions: [] };
    }
  }

  static createSubscriptionPortalModal(data) {
    const { subscriptions = [] } = data;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="modal-modern" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h3>My Subscriptions</h3>
          <button class="modal-close" aria-label="Close" data-action="close-modal">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          ${subscriptions.length === 0 ? `
            <div class="empty-state" style="text-align: center; padding: var(--space-12);">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-tertiary); margin: 0 auto var(--space-4);"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              <h3>No active subscriptions</h3>
              <p style="color: var(--color-text-secondary);">Start a subscription to save on recurring orders</p>
              <button class="btn btn-primary" data-action="close-modal" onclick="document.querySelector('[data-action=\"subscribe\"]')?.click()">Start a subscription</button>
            </div>
          ` : `
            <div class="subscription-list" style="display: flex; flex-direction: column; gap: var(--space-4);">
              ${subscriptions.map(sub => this.renderSubscriptionCard(sub)).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    return modal;
  }

  static renderSubscriptionCard(sub) {
    const statusClass = sub.status === 'active' ? 'status-active' : 
                       sub.status === 'paused' ? 'status-paused' : 'status-cancelled';
    const nextDate = new Date(sub.nextDeliveryDate).toLocaleDateString('sr-RS');
    
    return `
      <div class="subscription-card" data-subscription-id="${sub.id}">
        <div class="subscription-header">
          <div class="subscription-product">
            <img src="${sub.productImage}" alt="${sub.productName}" width="60" height="60" style="border-radius: var(--radius-md);">
            <div>
              <h4>${sub.productName}</h4>
              <p class="subscription-meta">Qty: ${sub.quantity} × ${sub.intervalLabel}</div>
            </div>
          </div>
          <div class="subscription-status">
            <span class="status-badge ${statusClass}">${sub.status}</span>
            <span class="next-delivery">Next: ${nextDate}</div>
          </div>
        </div>
        <div class="subscription-details">
          <div class="detail-row"><span>Price per delivery</span><strong>${this.formatPrice(sub.pricePerDelivery)}</strong></div>
          <div class="detail-row"><span>Discount</span><span class="text-success">${sub.discountPercent}% off</span></div>
          <div class="detail-row"><span>Next charge</span>${new Date(sub.nextChargeDate).toLocaleDateString('sr-RS')}</div>
        </div>
        <div class="subscription-actions">
          <button class="btn btn-ghost btn-sm" data-action="pause-subscription" data-sub-id="${sub.id}" ${sub.status !== 'active' ? 'disabled' : ''}>Pause</button>
          <button class="btn btn-ghost btn-sm" data-action="skip-next" data-sub-id="${sub.id}">Skip Next</button>
          <button class="btn btn-ghost btn-sm" data-action="reschedule" data-sub-id="${sub.id}">Reschedule</button>
          <button class="btn btn-danger btn-sm" data-action="cancel-subscription" data-sub-id="${sub.id}" ${sub.status === 'cancelled' ? 'disabled' : ''}>Cancel</button>
        </div>
      </div>
    `;
  }

  // ============================================================
  // DUNNING MANAGEMENT (Failed Payments)
  // ============================================================
  static initDunningManagement() {
    // Dunning sequence configuration
    this.dunningSchedule = [
      { attempt: 1, delayHours: 1, message: 'Payment failed. We\'ll retry in 1 hour.', action: 'retry' },
      { attempt: 2, delayHours: 24, message: 'Payment still failing. Please update payment method.', action: 'update_payment' },
      { attempt: 3, delayHours: 72, message: 'Final attempt. Subscription will pause if payment fails.', action: 'update_payment' },
      { attempt: 4, delayHours: 168, message: 'Subscription paused due to failed payments. Update payment to resume.', action: 'pause' }
    ];

    // Listen for failed payment events
    window.addEventListener('payment:failed', (e) => {
      this.handlePaymentFailure(e.detail);
    });
  }

  static async handlePaymentFailure(detail) {
    const { subscriptionId, attempt, error } = detail;
    
    const schedule = this.dunningSchedule[attempt - 1];
    if (!schedule) return;

    // Schedule retry
    setTimeout(() => {
      this.retryPayment(subscriptionId, attempt);
    }, schedule.delayHours * 60 * 60 * 1000);

    // Send notification
    this.sendDunningNotification(subscriptionId, schedule);
  }

  static async retryPayment(subscriptionId, attempt) {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ attempt })
      });

      const data = await response.json();
      
      if (!data.success) {
        // Schedule next attempt
        const nextAttempt = attempt + 1;
        const schedule = this.dunningSchedule[nextAttempt - 1];
        if (schedule) {
          setTimeout(() => this.retryPayment(subscriptionId, nextAttempt), schedule.delayHours * 60 * 60 * 1000);
        }
      }
    } catch (e) {
      console.error('Payment retry failed:', e);
    }
  }

  static sendDunningNotification(subscriptionId, schedule) {
    // Send email/SMS/push notification
    window.showToast?.(schedule.message, 'warning');
    
    // In production, send email/SMS via backend
    fetch('/api/notifications/dunning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ subscriptionId, message: schedule.message, action: schedule.action })
    }).catch(() => {});
  }

  // ============================================================
  // TRIAL MANAGEMENT
  // ============================================================
  static initTrialManagement() {
    this.trialPlans = {
      'trial-7': { days: 7, name: '7-Day Free Trial', requiresPaymentMethod: true },
      'trial-14': { days: 14, name: '14-Day Free Trial', requiresPaymentMethod: true },
      'trial-30': { days: 30, name: '30-Day Free Trial', requiresPaymentMethod: false }
    };

    // Track trial usage per user/product
    this.trialUsage = new Map();
  }

  static async startTrial(productId, trialId, paymentMethodId = null) {
    const trial = this.trialPlans[trialId];
    if (!trial) return { success: false, error: 'Invalid trial' };

    // Check if user already used trial for this product
    const usageKey = `trial_${trialId}_${productId}`;
    if (this.trialUsage.has(usageKey)) {
      return { success: false, error: 'Trial already used for this product' };
    }

    if (trial.requiresPaymentMethod && !paymentMethodId) {
      return { success: false, error: 'Payment method required for trial' };
    }

    try {
      const response = await fetch('/api/subscriptions/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId, trialId, paymentMethodId })
      });

      const data = await response.json();
      
      if (data.success) {
        this.trialUsage.set(usageKey, { startedAt: Date.now(), expiresAt: Date.now() + trial.days * 24 * 60 * 60 * 1000 });
        window.showToast?.('Trial started successfully!', 'success');
      } else {
        window.showToast?.(data.message || 'Failed to start trial', 'error');
      }
      
      return data;
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ============================================================
  // GIFT SUBSCRIPTIONS
  // ============================================================
  static initGiftSubscriptions() {
    this.giftPlans = {
      'gift-1': { deliveries: 1, name: 'Single Gift Delivery', discount: 0 },
      'gift-3': { deliveries: 3, name: '3-Month Gift', discount: 5 },
      'gift-6': { deliveries: 6, name: '6-Month Gift', discount: 10 },
      'gift-12': { deliveries: 12, name: 'Annual Gift', discount: 15 }
    };
  }

  static async purchaseGiftSubscription(giftPlanId, recipientEmail, senderName, message, productId, interval) {
    const plan = this.giftPlans[giftPlanId];
    if (!plan) return { success: false, error: 'Invalid gift plan' };

    try {
      const response = await fetch('/api/gifts/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          giftPlanId,
          recipientEmail,
          senderName,
          message,
          productId,
          interval
        })
      });

      const data = await response.json();
      
      if (data.success) {
        window.showToast?.('Gift subscription sent!', 'success');
      } else {
        window.showToast?.(data.message || 'Failed to send gift', 'error');
      }
      
      return data;
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ============================================================
  // SUBSCRIPTION PORTAL (User Facing)
  // ============================================================
  static initSubscriptionPortal() {
    // This would be a dedicated page at /profile/subscriptions
    // For now, we register the event handlers
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="view-subscriptions"]')) {
        e.preventDefault();
        this.openSubscriptionPortal();
      }
    });
  }

  static openSubscriptionPortal() {
    // Navigate to subscription portal page
    window.location.href = '/profile/subscriptions';
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================
  static getProductData(productId) {
    // In real app, fetch from API or state
    return window.dalliProducts?.find(p => p.id == productId) || {
      id: productId,
      name: 'Product',
      price: 1000,
      images: { main: '/images/placeholder.jpg' }
    };
  }

  static closeModal(modal) {
    if (modal) {
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 300);
      document.body.style.overflow = '';
    }
  }

  static trapFocus(modal) {
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });

    first?.focus();
  }

  static closeModal(modal) {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
    document.body.style.overflow = '';
  }

  static closeModal(modal) {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
    document.body.style.overflow = '';
  }

  static refreshSubscriptionList() {
    // Trigger reload of subscription list
    window.dispatchEvent(new CustomEvent('subscriptions:refresh'));
  }

  static formatPrice(amount) {
    return window.I18n?.formatPrice?.(amount) || `${amount.toLocaleString('sr-RS')} RSD`;
  }

  // ============================================================
  // AUTO-INITIALIZATION
  // ============================================================
  static init() {
    this.initSubscriptionPlans();
    this.initSubscriptionManagement();
    this.initDunningManagement();
    this.initTrialManagement();
    this.initGiftSubscriptions();
    this.initSubscriptionPortal();
    
    console.log('[SubscriptionManager] Initialized');
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SubscriptionManager.init());
} else {
  SubscriptionManager.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SubscriptionManager };
}

if (typeof window !== 'undefined') {
  window.SubscriptionManager = SubscriptionManager;
}