/**
 * DALLI Marketplace / Multi-Vendor Platform
 * Vendor onboarding, commissions, payouts, product approval, ratings
 */

export class Marketplace {
  static init() {
    this.initVendorOnboarding();
    this.initCommissionEngine();
    this.initPayoutEngine();
    this.initProductApproval();
    this.initVendorDashboard();
    this.initRatingsReviews();
    this.initDisputeResolution();
    this.initVendorAnalytics();
  }

  // ============================================================
  // VENDOR ONBOARDING
  // ============================================================
  static initVendorOnboarding() {
    this.vendors = new Map();
    this.onboardingStages = [
      { id: 'registration', name: 'Registration', required: true, order: 1 },
      { id: 'verification', name: 'Identity Verification', required: true, order: 2 },
      { id: 'banking', name: 'Banking Setup', required: true, order: 3 },
      { id: 'catalog', name: 'Catalog Setup', required: false, order: 4 },
      { id: 'go_live', name: 'Go Live', required: true, order: 5 }
    ];

    // Vendor statuses
    this.vendorStatuses = {
      pending: { id: 'pending', name: 'Pending Review', color: '#f59e0b', canSell: false },
      under_review: { id: 'under_review', name: 'Under Review', color: '#3b82f6', canSell: false },
      approved: { id: 'approved', name: 'Approved', color: '#10b981', canSell: true },
      suspended: { id: 'suspended', name: 'Suspended', color: '#f59e0b', canSell: false },
      rejected: { id: 'rejected', name: 'Rejected', color: '#ef4444', canSell: false },
      banned: { id: 'banned', name: 'Banned', color: '#7f1d1d', canSell: false }
    };
  }

  static async registerVendor(data) {
    const vendor = {
      id: this.generateVendorId(),
      businessName: data.businessName,
      legalName: data.legalName,
      taxId: data.taxId,
      registrationNumber: data.registrationNumber,
      address: data.address,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      website: data.website,
      category: data.category,
      description: data.description,
      status: 'pending',
      stage: 'registration',
      commissionRate: this.getDefaultCommissionRate(data.category),
      payoutSchedule: 'weekly',
      payoutThreshold: 5000, // RSD
      createdAt: new Date().toISOString(),
      documents: [],
      bankAccount: null,
      settings: {
        autoApproveProducts: false,
        allowReturns: true,
        returnWindowDays: 30,
        shippingRegions: ['RS'],
        processingTimeDays: 2
      },
      metrics: {
        totalSales: 0,
        totalOrders: 0,
        rating: 0,
        reviewCount: 0,
        returnRate: 0,
        avgProcessingDays: 0
      }
    };

    this.vendors.set(vendor.id, vendor);
    
    // Trigger verification workflow
    this.startVerification(vendor.id);
    
    return { success: true, vendorId: vendor.id, vendor };
  }

  static startVerification(vendorId) {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return;

    vendor.status = 'under_review';
    vendor.stage = 'verification';

    // In production, trigger KYC/AML checks
    // For now, simulate
    setTimeout(() => {
      this.completeVerification(vendorId);
    }, 5000);
  }

  static completeVerification(vendorId) {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return;

    vendor.status = 'approved';
    vendor.stage = 'go_live';
    vendor.approvedAt = new Date().toISOString();

    // Notify vendor
    this.notifyVendor(vendorId, 'approved', 'Your vendor account has been approved! You can now start selling.');
  }

  static async submitDocument(vendorId, documentType, file) {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return { success: false };

    const document = {
      id: this.generateId(),
      type: documentType, // business_license, tax_certificate, id_card, bank_statement
      fileName: documentType.fileName,
      mimeType: documentType.mimeType,
      size: documentType.size,
      url: await this.uploadDocument(file),
      uploadedAt: new Date().toISOString(),
      status: 'pending_review'
    };

    vendor.documents.push(document);
    return { success: true, document };
  }

  // ============================================================
  // COMMISSION ENGINE
  // ============================================================
  static initCommissionEngine() {
    // Category-based commission rates
    this.commissionRates = {
      'majice': 0.12,        // 12%
      'trenerke': 0.15,      // 15%
      'dukseri': 0.15,       // 15%
      'duksevi': 0.15,       // 15%
      'carape': 0.20,        // 20%
      'ostalo': 0.18,        // 18%
      'aksesoari': 0.20,     // 20%
      'aksesoari_za_kose': 0.22,
      'obuca': 0.18,
      'torbe': 0.20,
      'default': 0.15
    };

    // Tiered commission based on volume
    this.volumeTiers = [
      { minSales: 0, rate: 0 },
      { minSales: 1000000, discount: 0.01 },      // 1% off commission at 1M RSD
      { minSales: 5000000, discount: 0.02 },      // 2% off at 5M
      { minSales: 20000000, discount: 0.03 },     // 3% off at 20M
      { minSales: 50000000, discount: 0.05 }      // 5% off at 50M
    ];

    // Special promotional rates
    this.promoRates = new Map();
  }

  static getDefaultCommissionRate(category) {
    return this.commissionRates[category] || this.commissionRates.default;
  }

  static calculateCommission(vendorId, order) {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return 0;

    let rate = this.getDefaultCommissionRate(order.category);
    
    // Apply volume discounts
    const vendorSales = this.getVendorSales(vendorId);
    for (const tier of this.volumeTiers.slice().reverse()) {
      if (vendorSales >= tier.minSales) {
        rate -= tier.discount;
        break;
      }
    }

    // Check for promotional rate
    const promo = this.promoRates.get(vendor.id);
    if (promo && promo.validUntil > Date.now()) {
      rate = promo.rate;
    }

    // Minimum commission floor
    return Math.max(rate, 0.05); // Minimum 5%
  }

  static calculateCommissionAmount(vendorId, order) {
    const rate = this.calculateCommission(vendorId, order);
    const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return Math.round(subtotal * rate);
  }

  static setPromoRate(vendorId, rate, validUntil) {
    this.promoRates.set(vendorId, { rate, validUntil });
  }

  static removePromoRate(vendorId) {
    this.promoRates.delete(vendorId);
  }

  // ============================================================
  // PAYOUT ENGINE
  // ============================================================
  static initPayoutEngine() {
    this.payouts = new Map();
    this.payoutSchedules = {
      daily: { cron: '0 2 * * *', label: 'Daily' },
      weekly: { cron: '0 2 * * 1', label: 'Weekly (Mondays)' },
      biweekly: { cron: '0 2 * * 1/2', label: 'Bi-weekly' },
      monthly: { cron: '0 2 1 * *', label: 'Monthly (1st)' }
    };
  }

  static async processPayouts(schedule = 'weekly') {
    const vendors = Array.from(this.vendors.values())
      .filter(v => v.status === 'approved' && v.payoutSchedule === schedule);

    for (const vendor of vendors) {
      await this.processVendorPayout(vendor.id);
    }
  }

  static async processVendorPayout(vendorId) {
    const vendor = this.vendors.get(vendorId);
    if (!vendor || vendor.status !== 'approved') return;

    // Calculate earnings since last payout
    const lastPayout = vendor.lastPayoutAt || vendor.createdAt;
    const earnings = await this.calculateEarningsSince(vendor.id, lastPayout);

    if (earnings.netAmount < vendor.payoutThreshold) {
      return { success: false, reason: 'Below payout threshold' };
    }

    // Check for holds (disputes, returns, chargebacks)
    const holds = await this.getPendingHolds(vendorId);
    const availableAmount = earnings.netAmount - holds.total;

    if (availableAmount < vendor.payoutThreshold) {
      return { success: false, reason: 'Available amount below threshold after holds' };
    }

    // Create payout
    const payout = {
      id: this.generatePayoutId(),
      vendorId,
      grossAmount: earnings.grossAmount,
      commission: earnings.commission,
      fees: earnings.fees,
      holds: holds.total,
      netAmount: availableAmount,
      status: 'processing',
      items: earnings.items,
      createdAt: new Date().toISOString(),
      estimatedArrival: this.calculateArrivalDate()
    };

    this.payouts.set(payout.id, payout);

    // Initiate bank transfer (in production, call banking API)
    await this.initiateBankTransfer(vendor, availableAmount);

    // Update vendor
    vendor.lastPayoutAt = new Date().toISOString();
    vendor.totalPaidOut = (vendor.totalPaidOut || 0) + availableAmount;

    // Notify vendor
    this.notifyVendor(vendor.id, 'payout_initiated', {
      amount: availableAmount,
      payoutId: payout.id,
      estimatedArrival: payout.estimatedArrival
    });

    return { success: true, payout };
  }

  static async calculateEarningsSince(vendorId, since) {
    // In production, query order database
    // For now, return mock data
    return {
      grossAmount: 150000,
      commission: 18000,
      fees: 2000,
      netAmount: 130000,
      items: 45,
      orders: 38
    };
  }

  static async getPendingHolds(vendorId) {
    // Check for disputes, returns, chargebacks
    return { total: 0, items: [] };
  }

  static calculateArrivalDate() {
    const date = new Date();
    date.setDate(date.getDate() + 2); // 2 business days
    return date.toISOString().split('T')[0];
  }

  static async initiateBankTransfer(vendor, amount) {
    // In production, call banking API
    console.log(`Initiating transfer of ${amount} RSD to vendor ${vendor.id}`);
    return { success: true, transactionId: `TXN-${Date.now()}` };
  }

  // ============================================================
  // PRODUCT APPROVAL WORKFLOW
  // ============================================================
  static initProductApproval() {
    this.productSubmissions = new Map();
    this.approvalQueue = [];
  }

  static async submitProduct(vendorId, productData) {
    const vendor = this.vendors.get(vendorId);
    if (!vendor || vendor.status !== 'approved') {
      return { success: false, error: 'Vendor not approved' };
    }

    const submission = {
      id: this.generateId(),
      vendorId,
      productData,
      status: vendor.settings.autoApproveProducts ? 'auto_approved' : 'pending_review',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null
    };

    this.productSubmissions.set(submission.id, submission);

    if (submission.status === 'auto_approved') {
      this.approveProduct(submission.id);
    } else {
      this.approvalQueue.push(submission.id);
      this.notifyAdmins('new_product_submission', submission.id);
    }

    return { success: true, submissionId: submission.id, status: submission.status };
  }

  static approveProduct(submissionId, reviewerId = null) {
    const submission = this.productSubmissions.get(submissionId);
    if (!submission) return { success: false };

    submission.status = 'approved';
    submission.reviewedAt = new Date().toISOString();
    submission.reviewedBy = reviewerId || 'auto';

    // Create product in catalog
    this.publishProduct(submission);

    // Notify vendor
    this.notifyVendor(submission.vendorId, 'product_approved', {
      productId: submission.productData.id,
      productName: submission.productData.name
    });

    return { success: true };
  }

  static rejectProduct(submissionId, reviewerId, reason) {
    const submission = this.productSubmissions.get(submissionId);
    if (!submission) return { success: false };

    submission.status = 'rejected';
    submission.reviewedAt = new Date().toISOString();
    submission.reviewedBy = reviewerId;
    submission.rejectionReason = reason;

    this.notifyVendor(submission.vendorId, 'product_rejected', {
      productName: submission.productData.name,
      reason
    });

    return { success: true };
  }

  static publishProduct(submission) {
    // Add to main product catalog
    // In production, this would add to the main product database
    console.log('Publishing product:', submission.productData.name);
  }

  // ============================================================
  // VENDOR DASHBOARD
  // ============================================================
  static initVendorDashboard() {
    // Vendor dashboard data aggregation
  }

  static async getVendorDashboardData(vendorId) {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return null;

    return {
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        status: vendor.status,
        commissionRate: vendor.commissionRate,
        payoutSchedule: vendor.payoutSchedule,
        payoutThreshold: vendor.payoutThreshold
      },
      metrics: vendor.metrics,
      recentOrders: await this.getRecentOrders(vendor.id),
      pendingPayouts: await this.getPendingPayouts(vendor.id),
      pendingProducts: this.getPendingProducts(vendor.id),
      recentReviews: await this.getRecentReviews(vendor.id),
      alerts: this.getVendorAlerts(vendor.id)
    };
  }

  static getVendorAlerts(vendorId) {
    const alerts = [];
    const vendor = this.vendors.get(vendorId);
    
    // Low stock alerts
    // In production, check inventory
    
    // Payout threshold alerts
    if (vendor.payoutThreshold > 0) {
      // Check if approaching threshold
    }

    // Return rate alerts
    if (vendor.metrics.returnRate > 0.15) {
      alerts.push({
        type: 'high_return_rate',
        severity: 'warning',
        message: `Return rate is ${(vendor.metrics.returnRate * 100).toFixed(1)}%`
      });
    }

    return alerts;
  }

  // ============================================================
  // RATINGS & REVIEWS
  // ============================================================
  static initRatingsReviews() {
    this.reviews = new Map();
  }

  static async submitReview(data) {
    const review = {
      id: this.generateId(),
      vendorId: data.vendorId,
      customerId: data.customerId,
      orderId: data.orderId,
      productId: data.productId,
      rating: data.rating, // 1-5
      title: data.title,
      comment: data.comment,
      images: data.images || [],
      verified: true, // Verified purchase
      status: 'published',
      helpful: 0,
      reported: false,
      createdAt: new Date().toISOString()
    };

    this.reviews.set(review.id, review);

    // Update vendor rating
    this.updateVendorRating(data.vendorId);

    // Notify vendor
    this.notifyVendor(data.vendorId, 'new_review', {
      rating: data.rating,
      productId: data.productId
    });

    return { success: true, review };
  }

  static updateVendorRating(vendorId) {
    const vendorReviews = Array.from(this.reviews.values())
      .filter(r => r.vendorId === vendorId && r.status === 'published');

    if (vendorReviews.length === 0) return;

    const avgRating = vendorReviews.reduce((sum, r) => sum + r.rating, 0) / vendorReviews.length;
    const vendor = this.vendors.get(vendorId);
    if (vendor) {
      vendor.metrics.rating = Math.round(avgRating * 10) / 10;
      vendor.metrics.reviewCount = vendorReviews.length;
    }
  }

  // ============================================================
  // DISPUTE RESOLUTION
  // ============================================================
  static initDisputeResolution() {
    this.disputes = new Map();
  }

  static async openDispute(data) {
    const dispute = {
      id: this.generateId(),
      type: data.type, // item_not_received, not_as_described, damaged, wrong_item, other
      orderId: data.orderId,
      vendorId: data.vendorId,
      customerId: data.customerId,
      reason: data.reason,
      evidence: data.evidence || [],
      status: 'open',
      priority: 'normal',
      assignedTo: null,
      messages: [],
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolution: null
    };

    this.disputes.set(dispute.id, dispute);

    // Notify vendor
    this.notifyVendor(data.vendorId, 'dispute_opened', {
      disputeId: dispute.id,
      orderId: data.orderId,
      reason: data.reason
    });

    // Notify customer
    // this.notifyCustomer(data.customerId, 'dispute_opened', { disputeId: dispute.id });

    // Auto-assign based on type/value
    this.assignDispute(dispute.id);

    return { success: true, dispute };
  }

  static assignDispute(disputeId) {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return;

    // Simple assignment logic - in production, use round-robin or skill-based
    dispute.assignedTo = 'support_team';
    dispute.status = 'assigned';
  }

  static async resolveDispute(disputeId, resolution, resolverId) {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return { success: false };

    dispute.status = 'resolved';
    dispute.resolvedAt = new Date().toISOString();
    dispute.resolution = resolution;
    dispute.resolvedBy = resolverId;

    // Process refund/replacement based on resolution
    if (resolution.type === 'refund') {
      // Process refund
    } else if (resolution.type === 'replacement') {
      // Create replacement order
    } else if (resolution.type === 'partial_refund') {
      // Partial refund
    }

    // Notify parties
    this.notifyVendor(dispute.vendorId, 'dispute_resolved', { disputeId, resolution });
    // this.notifyCustomer(dispute.customerId, 'dispute_resolved', { disputeId, resolution });

    return { success: true };
  }

  // ============================================================
  // VENDOR ANALYTICS
  // ============================================================
  static initVendorAnalytics() {
    this.vendorAnalytics = new Map();
  }

  static async getVendorAnalytics(vendorId, period = '30d') {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return null;

    // In production, aggregate from order/analytics database
    return {
      vendorId,
      period,
      generatedAt: new Date().toISOString(),
      sales: {
        revenue: 1250000,
        orders: 342,
        unitsSold: 1250,
        avgOrderValue: 2918,
        conversionRate: 3.2
      },
      traffic: {
        views: 15600,
        uniqueVisitors: 8900,
        conversionRate: 3.84
      },
      products: {
        active: 45,
        total: 52,
        outOfStock: 3,
        topSelling: [
          { productId: 1, name: 'Osnovna Majica', units: 156, revenue: 201240 },
          { productId: 5, name: 'Muški Duks', units: 89, revenue: 381810 }
        ]
      },
      customers: {
        total: 890,
        new: 156,
        returning: 734,
        repeatRate: 0.45
      },
      fulfillment: {
        avgProcessingDays: 1.2,
        onTimeRate: 0.98,
        returnRate: 0.032,
        cancellationRate: 0.015
      },
      financial: {
        grossSales: 1250000,
        commission: 187500,
        fees: 25000,
        netPayout: 1042500,
        pendingPayout: 85000
      }
    };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================
  static generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateVendorId() {
    return `VND-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static generatePayoutId() {
    return `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static notifyVendor(vendorId, type, data) {
    // In production, send email/push/websocket notification
    console.log(`Notify vendor ${vendorId}: ${type}`, data);
    
    if (window.showToast) {
      const messages = {
        approved: 'Your vendor account has been approved!',
        product_approved: 'Your product has been approved!',
        product_rejected: 'Your product was rejected',
        payout_initiated: 'Payout initiated',
        new_review: 'New review received',
        dispute_opened: 'New dispute opened',
        dispute_resolved: 'Dispute resolved'
      };
      if (messages[type]) {
        // window.showToast?.(messages[type], 'info');
      }
    }
  }

  static notifyAdmins(event, data) {
    // Notify admin team
    console.log('Admin notification:', event, data);
  }

  static async getRecentOrders(vendorId) {
    // Mock data
    return [
      { id: 'ORD-001', date: new Date().toISOString(), total: 12900, status: 'delivered' },
      { id: 'ORD-002', date: new Date(Date.now() - 86400000).toISOString(), total: 8900, status: 'shipped' }
    ];
  }

  static async getPendingPayouts(vendorId) {
    return Array.from(this.payouts.values())
      .filter(p => p.vendorId === vendorId && p.status === 'processing')
      .map(p => ({
        id: p.id,
        amount: p.netAmount,
        status: p.status,
        estimatedArrival: p.estimatedArrival
      }));
  }

  static getPendingProducts(vendorId) {
    return Array.from(this.productSubmissions.values())
      .filter(s => s.vendorId === vendorId && s.status === 'pending_review')
      .map(s => ({ id: s.id, productName: s.productData.name, submittedAt: s.submittedAt }));
  }

  static async getRecentReviews(vendorId) {
    return Array.from(this.reviews.values())
      .filter(r => r.vendorId === vendorId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }

  static getVendorSales(vendorId) {
    // In production, calculate from orders
    return 1250000; // Mock
  }

  // Auto-initialize
  static init() {
    this.initVendorOnboarding();
    this.initCommissionEngine();
    this.initPayoutEngine();
    this.initProductApproval();
    this.initVendorDashboard();
    this.initRatingsReviews();
    this.initDisputeResolution();
    this.initVendorAnalytics();
    
    console.log('[Marketplace] Initialized');
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Marketplace.init());
} else {
  Marketplace.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Marketplace };
}

if (typeof window !== 'undefined') {
  window.Marketplace = Marketplace;
}