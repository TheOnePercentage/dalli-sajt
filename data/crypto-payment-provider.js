/**
 * Crypto Payment Provider Interface
 * 
 * Defines the contract for crypto payment providers.
 * Supports both mock (development) and production implementations.
 * 
 * Interface stays stable - swap implementations without breaking changes.
 */

// ============================================================
// PROVIDER INTERFACE
// ============================================================

export class CryptoPaymentProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = 'base';
    this.version = '1.0.0';
  }

  /**
   * Initialize the provider
   * @returns {Promise<void>}
   */
  async initialize() {
    // Override in subclass
  }

  /**
   * Create a new payment request
   * @param {Object} params
   * @param {number} params.amountRSD - Amount in RSD
   * @param {string} params.currency - Crypto currency (BTC, ETH, USDT, USDC)
   * @param {number} params.exchangeRate - RSD per crypto unit
   * @param {Object} params.order - Order object
   * @param {string} params.order.orderNumber
   * @param {Object} params.order.totals
   * @returns {Promise<Object>} Payment details
   *   - walletAddress: Destination address
   *   - amountCrypto: Amount in crypto
   *   - amountRSD: Amount in RSD
   *   - exchangeRate: RSD per crypto unit
   *   - qrCodeData: QR code data URI
   *   - qrCodeImage: QR code image data URI
   *   - paymentId: Unique payment identifier
   *   - expiresAt: Expiration timestamp
   */
  async createPayment(params) {
    throw new Error('createPayment() must be implemented by subclass');
  }

  /**
   * Check payment status
   * @param {string} paymentId - Payment identifier
   * @returns {Promise<Object>} Payment status
   *   - status: 'pending' | 'confirming' | 'confirmed' | 'failed' | 'expired'
   *   - confirmations: Current blockchain confirmations
   *   - requiredConfirmations: Required confirmations
   *   - transactionId: Blockchain transaction hash
   *   - paidAt: Payment timestamp
   *   - confirmedAt: Confirmation timestamp
   */
  async checkPaymentStatus(paymentId) {
    throw new Error('checkPaymentStatus() must be implemented by subclass');
  }

  /**
   * Cancel/expire a payment
   * @param {string} paymentId - Payment identifier
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelPayment(paymentId) {
    throw new Error('cancelPayment() must be implemented by subclass');
  }

  /**
   * Get payment details
   * @param {string} paymentId - Payment identifier
   * @returns {Promise<Object>} Payment details
   */
  async getPayment(paymentId) {
    throw new Error('getPayment() must be implemented by subclass');
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} Verification result
   */
  verifyWebhook(payload, signature) {
    throw new Error('verifyWebhook() must be implemented by subclass');
  }

  /**
   * Health check
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    return { healthy: true, provider: this.name };
  }

  /**
   * Get estimated processing time
   * @param {string} currency - Crypto currency
   * @returns {number} Estimated time in minutes
   */
  getEstimatedTime(currency) {
    const times = {
      BTC: 10,
      ETH: 5,
      USDT: 5,
      USDC: 5
    };
    return times[currency] || 10;
  }

  /**
   * Get minimum confirmations
   * @param {string} currency - Crypto currency
   * @returns {number} Minimum confirmations
   */
  getMinConfirmations(currency) {
    const confirmations = {
      BTC: 1,
      ETH: 12,
      USDT: 12,
      USDC: 12
    };
    return confirmations[currency] || 1;
  }

  /**
   * Convert RSD to crypto amount
   * @param {number} amountRSD - Amount in RSD
   * @param {number} exchangeRate - RSD per crypto unit
   * @returns {number} Amount in crypto
   */
  rsdToCrypto(amountRSD, exchangeRate) {
    return amountRSD / exchangeRate;
  }

  /**
   * Convert crypto to RSD
   * @param {number} amountCrypto - Amount in crypto
   * @param {number} exchangeRate - RSD per crypto unit
   * @returns {number} Amount in RSD
   */
  cryptoToRSD(amountCrypto, exchangeRate) {
    return Math.round(amountCrypto * exchangeRate);
  }

// ==================== SECURITY FEATURES ====================

  /**
   * Generate a unique payment hash for duplicate detection
   * @param {Object} params - Payment parameters
   * @returns {string} Payment hash
   */
  _generatePaymentHash(params) {
    const { amountRSD, currency, exchangeRate, order } = params;
    const hashInput = `${params.order?.orderNumber || ''}|${params.currency}|${params.amountRSD}|${params.exchangeRate}`;
    // Simple hash for demo - in production use crypto.subtle.digest
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      hash = ((hash << 5) - hash) + hashInput.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check for duplicate payment
   * @param {string} paymentHash - Payment hash
   * @returns {boolean} True if duplicate
   */
  _isDuplicatePayment(paymentHash) {
    return this.paymentHashes.has(paymentHash);
  }

  /**
   * Register payment hash to prevent duplicates
   * @param {string} paymentHash - Payment hash
   */
  _registerPaymentHash(paymentHash) {
    this.paymentHashes.set(paymentHash, Date.now());
  }

  /**
   * Check and record failed attempt for rate limiting
   * @param {string} identifier - Client identifier (IP, user ID, etc.)
   * @returns {boolean} True if allowed, false if rate limited
   */
  _checkFailedAttempts(identifier) {
    const now = Date.now();
    const attempts = this.failedAttempts.get(identifier) || [];
    
    // Clean old attempts
    const recentAttempts = attempts.filter(time => now - time < this.failedAttemptWindow);
    
    if (recentAttempts.length >= this.maxFailedAttempts) {
      return false; // Rate limited
    }
    
    recentAttempts.push(now);
    this.failedAttempts.set(identifier, recentAttempts);
    return true;
  }

  /**
   * Record failed attempt
   * @param {string} identifier - Client identifier
   */
  _recordFailedAttempt(identifier) {
    const now = Date.now();
    const attempts = this.failedAttempts.get(identifier) || [];
    attempts.push(now);
    this.failedAttempts.set(identifier, attempts);
  }

  /**
   * Validate payment parameters
   * @param {Object} params - Payment parameters
   * @returns {Object} Validation result { valid: boolean, error?: string }
   */
  _validatePaymentParams(params) {
    const { amountRSD, currency, exchangeRate, order } = params;
    
    if (!amountRSD || amountRSD <= 0) {
      return { valid: false, error: 'Iznos mora biti veći od 0' };
    }
    
    if (!currency || !['BTC', 'ETH', 'USDT', 'USDC'].includes(currency)) {
      return { valid: false, error: 'Nepodržana valuta' };
    }
    
    if (!exchangeRate || exchangeRate <= 0) {
      return { valid: false, error: 'Neispravan kurs' };
    }
    
    if (!order || !order.orderNumber) {
      return { valid: false, error: 'Nedostaje broj porudžbine' };
    }
    
    // Check amount limits
    const config = this.config;
    if (config.minAmountRSD && amountRSD < config.minAmountRSD) {
      return { valid: false, error: `Minimalan iznos je ${config.minAmountRSD} RSD` };
    }
    
    if (config.maxAmountRSD && amountRSD > config.maxAmountRSD) {
      return { valid: false, error: `Maksimalan iznos je ${config.maxAmountRSD} RSD` };
    }
    
    return { valid: true };
  }

  /**
   * Check for suspicious activity (fraud detection)
   * @param {Object} params - Payment parameters
   * @returns {Object} Risk assessment { risk: 'low'|'medium'|'high', reasons: string[] }
   */
  _assessRisk(params) {
    const risks = [];
    let riskLevel = 'low';
    
    // Check for unusually large amounts
    if (params.amountRSD > 1000000) { // > 1M RSD
      risks.push('Unusually large amount');
      riskLevel = 'high';
    } else if (params.amountRSD > 500000) { // > 500k RSD
      risks.push('Large amount');
      riskLevel = 'medium';
    }
    
    // Check for new user with large order
    if (params.order?.isNewCustomer && params.amountRSD > 100000) {
      risks.push('New customer with large order');
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
    }
    
    // Check for suspicious currency choice (e.g., BTC for small amounts)
    if (params.currency === 'BTC' && params.amountRSD < 50000) {
      risks.push('Unusual currency for small amount');
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
    }
    
    // Check for multiple payments in short time
    // (would need session tracking in real implementation)
    
    if (riskLevel === 'high' && risks.length > 2) {
      riskLevel = 'high';
    } else if (riskLevel === 'medium' && risks.length > 1) {
      riskLevel = 'medium';
    }
    
    return { risk: riskLevel, reasons: risks };
  }
}

// ============================================================
// MOCK PROVIDER (Development)
// ============================================================

export class MockCryptoPaymentProvider extends CryptoPaymentProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'mock';
    this.payments = new Map();
    this.mockDelay = config.mockDelay || 2000;
    this.mockStages = [
      { stage: 'creating', progress: 10, message: 'Kreiranje plaćanja...' },
      { stage: 'address_generation', progress: 30, message: 'Generisanje adrese...' },
      { stage: 'qr_generation', progress: 50, message: 'Generisanje QR koda...' },
      { stage: 'ready', progress: 100, message: 'Spremno za plaćanje' }
    ];
  }

  async initialize() {
    console.log('[MockCryptoProvider] Initialized');
    return true;
  }

  async createPayment(params) {
    const { amountRSD, currency, exchangeRate, order } = params;
    
    // Validate using base class method
    const validation = this._validatePaymentParams(params);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Check for duplicates
    const paymentHash = this._generatePaymentHash(params);
    if (this._isDuplicatePayment(paymentHash)) {
      throw new Error('Duplicate payment detected');
    }
    this._registerPaymentHash(paymentHash);
    
    // Assess risk
    const risk = this._assessRisk(params);
    if (risk.risk === 'high') {
      console.warn('[MockCryptoProvider] High risk payment detected:', risk.reasons);
      // In production, you might want to require additional verification
    }
    
    const amountCrypto = this.rsdToCrypto(amountRSD, exchangeRate);
    
    // Mock wallet addresses (in production, these would be generated per payment)
    const mockAddresses = {
      BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      ETH: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      USDT: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', // ERC-20
      USDC: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'  // ERC-20
    };
    
    const walletAddress = mockAddresses[currency] || mockAddresses.ETH;
    const qrData = `${currency.toLowerCase()}:${walletAddress}?amount=${amountCrypto.toFixed(8)}`;
    
    // Simulate QR code generation
    const qrCodeData = qrData;
    const qrCodeImage = `data:image/svg+xml;base64,${btoa(this._generateMockQR())}`;
    
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min
    
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const payment = {
      id: paymentId,
      orderNumber: order.orderNumber,
      currency,
      amountCrypto,
      amountRSD,
      exchangeRate,
      walletAddress,
      qrCodeData,
      qrCodeImage,
      status: 'pending_payment',
      confirmations: 0,
      requiredConfirmations: this.getMinConfirmations(currency),
      createdAt: new Date().toISOString(),
      expiresAt,
      transactionId: null,
      paidAt: null,
      confirmedAt: null,
      webhookEvents: []
    };
    
    this.payments.set(paymentId, payment);
    
    // Simulate async creation
    await this._sleep(this.mockDelay / this.mockStages.length);
    
    return {
      paymentId,
      walletAddress,
      amountCrypto,
      amountRSD,
      exchangeRate,
      qrCodeData,
      qrCodeImage,
      expiresAt,
      currency
    };
  }

  async checkPaymentStatus(paymentId) {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    // Simulate status progression for demo
    const elapsed = Date.now() - new Date(payment.createdAt).getTime();
    const elapsedMinutes = elapsed / (1000 * 60);
    
    if (payment.status === 'confirmed' || payment.status === 'failed' || payment.status === 'expired') {
      return payment;
    }
    
    if (elapsedMinutes > 30) {
      payment.status = 'expired';
      payment.expiredAt = new Date().toISOString();
      return payment;
    }
    
    // Simulate random confirmation after 2-5 minutes
    if (elapsedMinutes > 2 && Math.random() > 0.7) {
      payment.status = 'confirming';
    }
    
    if (elapsedMinutes > 5 && Math.random() > 0.5) {
      payment.status = 'confirmed';
      payment.confirmations = payment.requiredConfirmations;
      payment.transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      payment.confirmedAt = new Date().toISOString();
      payment.paidAt = new Date(Date.now() - Math.random() * 5 * 60 * 1000).toISOString();
    }
    
    return { ...payment };
  }

  async cancelPayment(paymentId) {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    if (payment.status === 'confirmed') {
      throw new Error('Cannot cancel confirmed payment');
    }
    
    payment.status = 'cancelled';
    return { success: true, paymentId };
  }

  async getPayment(paymentId) {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }
    return { ...payment };
  }

  verifyWebhook(payload, signature) {
    // Mock verification always passes
    return true;
  }

  async healthCheck() {
    return { healthy: true, provider: this.name, version: this.version };
  }

  // ==================== PRIVATE ====================
  
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  _generateMockQR() {
    // Simple SVG QR code placeholder
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#fff"/><rect x="20" y="20" width="20" height="20" fill="#000"/><rect x="60" y="20" width="20" height="20" fill="#000"/><rect x="100" y="20" width="20" height="20" fill="#000"/><rect x="20" y="60" width="20" height="20" fill="#000"/><rect x="100" y="60" width="20" height="20" fill="#000"/><rect x="20" y="100" width="20" height="20" fill="#000"/><rect x="60" y="100" width="20" height="20" fill="#000"/><rect x="100" y="100" width="20" height="20" fill="#000"/></svg>`;
  }

  // ==================== REFUND ARCHITECTURE ====================

  /**
   * Initiate a refund for a crypto payment
   * @param {string} paymentId - Payment identifier
   * @param {Object} options - Refund options
   * @param {number} options.amountCrypto - Amount to refund in crypto (optional, full refund if not specified)
   * @param {string} options.reason - Reason for refund
   * @param {string} options.requestedBy - User/admin ID requesting refund
   * @returns {Promise<Object>} Refund details
   */
  async initiateRefund(paymentId, options = {}) {
    const payment = await this.getPayment(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'confirmed' && payment.status !== 'confirmed_crypto') {
      throw new Error('Can only refund confirmed payments');
    }

    // Check if already refunded
    if (payment.refunded) {
      throw new Error('Payment already refunded');
    }

    // Create refund request
    const refundId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const refundAmountCrypto = options.amountCrypto || payment.amountCrypto;
    const refundAmountRSD = this.cryptoToRSD(refundAmountCrypto, payment.exchangeRate);

    const refund = {
      id: refundId,
      paymentId,
      orderNumber: payment.orderNumber,
      currency: payment.currency,
      amountCrypto: refundAmountCrypto,
      amountRSD: refundAmountRSD,
      exchangeRate: payment.exchangeRate,
      reason: options.reason || 'Customer request',
      requestedBy: options.requestedBy || 'customer',
      status: 'pending_review', // Requires admin approval
      requestedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      reviewNotes: '',
      processedAt: null,
      transactionId: null
    };

    // Store refund request
    if (!this.refunds) this.refunds = new Map();
    this.refunds.set(refundId, refund);

    // Log for audit
    console.log(`[CryptoProvider] Refund requested: ${refundId} for payment ${paymentId}`);

    return {
      refundId,
      status: 'pending_review',
      message: 'Refund request submitted for admin review. You will be notified once reviewed.'
    };
  }

  /**
   * Admin review and approve/reject refund
   * @param {string} refundId - Refund identifier
   * @param {Object} decision - { approved: boolean, reviewedBy: string, notes: string }
   * @returns {Promise<Object>} Updated refund
   */
  async reviewRefund(refundId, decision) {
    const refund = this.refunds?.get(refundId);
    if (!refund) {
      throw new Error('Refund not found');
    }

    if (refund.status !== 'pending_review') {
      throw new Error('Refund already processed');
    }

    if (decision.approved) {
      refund.status = 'approved';
      refund.reviewedAt = new Date().toISOString();
      refund.reviewedBy = decision.reviewedBy;
      refund.reviewNotes = decision.notes || '';
      
      // In production, initiate actual blockchain refund here
      // For now, simulate
      refund.transactionId = `ref_tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      refund.processedAt = new Date().toISOString();
      refund.status = 'completed';
      
      // Update parent payment
      const payment = this.payments.get(paymentId);
      if (payment) {
        payment.refunded = true;
        payment.refundId = refundId;
      }
    } else {
      refund.status = 'rejected';
      refund.reviewedAt = new Date().toISOString();
      refund.reviewedBy = decision.reviewedBy;
      refund.reviewNotes = decision.notes || '';
    }

    this.refunds.set(refundId, refund);
    return refund;
  }

  /**
   * Get refund details
   * @param {string} refundId - Refund identifier
   * @returns {Promise<Object>} Refund details
   */
  async getRefund(refundId) {
    const refund = this.refunds?.get(refundId);
    if (!refund) {
      throw new Error('Refund not found');
    }
    return { ...refund };
  }

  /**
   * List refunds with filters
   * @param {Object} filters - Filter options
   * @returns {Array} List of refunds
   */
  async listRefunds(filters = {}) {
    if (!this.refunds) return [];
    
    let refunds = Array.from(this.refunds.values());
    
    if (filters.status) {
      refunds = refunds.filter(r => r.status === filters.status);
    }
    if (filters.paymentId) {
      refunds = refunds.filter(r => r.paymentId === filters.paymentId);
    }
    if (filters.fromDate) {
      refunds = refunds.filter(r => r.requestedAt >= filters.fromDate);
    }
    if (filters.toDate) {
      refunds = refunds.filter(r => r.requestedAt <= filters.toDate);
    }
    
    return refunds.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  }

  _generateMockQR() {
    // Simple SVG QR code placeholder
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#fff"/><rect x="20" y="20" width="20" height="20" fill="#000"/><rect x="60" y="20" width="20" height="20" fill="#000"/><rect x="100" y="20" width="20" height="20" fill="#000"/><rect x="20" y="60" width="20" height="20" fill="#000"/><rect x="100" y="60" width="20" height="20" fill="#000"/><rect x="20" y="100" width="20" height="20" fill="#000"/><rect x="60" y="100" width="20" height="20" fill="#000"/><rect x="100" y="100" width="20" height="20" fill="#000"/></svg>`;
  }
}

// ============================================================
// PRODUCTION PROVIDER TEMPLATE
// ============================================================

/**
 * Production Crypto Payment Provider Template
 * 
 * When ready to integrate real crypto payments:
 * 
 * 1. Extend this class
 * 2. Implement all abstract methods
 * 3. Register in provider factory
 * 
 * Example integrations:
 * - Coinbase Commerce
 * - BitPay
 * - CoinPayments
 * - NOWPayments
 * - Custom blockchain integration
 */
export class ProductionCryptoPaymentProvider extends CryptoPaymentProvider {
  constructor(config = {}) {
    super(config);
    this.name = config.name || 'production';
    this.apiEndpoint = config.apiEndpoint || '/api/crypto/payment';
    this.apiKey = config.apiKey;
    this.webhookSecret = config.webhookSecret;
    this.supportedCurrencies = config.supportedCurrencies || ['BTC', 'ETH', 'USDT', 'USDC'];
  }

  async initialize() {
    // Initialize HTTP client, verify API key, etc.
    const health = await this.healthCheck();
    if (!health.healthy) {
      throw new Error(`Provider ${this.name} health check failed`);
    }
    console.log(`[${this.name}] Provider initialized`);
    return true;
  }

  async createPayment(params) {
    // Real implementation:
    // 1. Call payment provider API
    // 2. Create payment intent
    // 3. Get wallet address, QR code, payment ID
    // 4. Return payment details
    throw new Error('createPayment() not implemented - extend ProductionCryptoPaymentProvider');
  }

  async checkPaymentStatus(paymentId) {
    // Real implementation:
    // 1. Call provider API to check status
    // 2. Check blockchain for confirmations
    // 3. Update local status
    throw new Error('checkPaymentStatus() not implemented - extend ProductionCryptoPaymentProvider');
  }

  async cancelPayment(paymentId) {
    throw new Error('cancelPayment() not implemented - extend ProductionCryptoPaymentProvider');
  }

  async getPayment(paymentId) {
    throw new Error('getPayment() not implemented - extend ProductionCryptoPaymentProvider');
  }

  verifyWebhook(payload, signature) {
    // Verify webhook signature using webhook secret
    if (!this.webhookSecret) {
      console.warn('[CryptoProvider] No webhook secret configured');
      return false;
    }
    // Implement HMAC verification
    // const expected = crypto.createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
    // return expected === signature;
    return false;
  }

  async healthCheck() {
    try {
      // Call provider health endpoint
      // const response = await fetch(`${this.apiEndpoint}/health`, { headers: { Authorization: `Bearer ${this.apiKey}` } });
      // return response.json();
      return { healthy: false, provider: this.name, message: 'Not implemented' };
    } catch (error) {
      return { healthy: false, provider: this.name, error: error.message };
    }
  }
}

/**
 * Provider Factory
 * Creates the appropriate provider based on configuration
 */
export class CryptoPaymentProviderFactory {
  static create(config = {}) {
    const providerType = config.provider || 'internal';
    
    switch (providerType) {
      case 'mock':
      case 'internal':
      case 'development':
        return new MockCryptoPaymentProvider(config);
      
      case 'coinbase':
      case 'bitpay':
      case 'coinpayments':
      case 'nowpayments':
      case 'custom':
        return new ProductionCryptoPaymentProvider(config);
      
      default:
        console.warn(`[CryptoProviderFactory] Unknown provider: ${providerType}, falling back to mock`);
        return new MockCryptoPaymentProvider(config);
    }
  }
  
  /**
   * Register a custom provider
   * @param {string} name - Provider name
   * @param {class} ProviderClass - Provider class extending CryptoPaymentProvider
   */
  static registerProvider(name, ProviderClass) {
    if (!ProviderClass.prototype instanceof CryptoPaymentProvider) {
      throw new Error('Provider must extend CryptoPaymentProvider');
    }
    // In a real implementation, you'd store this in a registry
    console.log(`[CryptoProviderFactory] Registered provider: ${name}`);
  }
}

export default {
  CryptoPaymentProvider,
  MockCryptoPaymentProvider,
  ProductionCryptoPaymentProvider,
  CryptoPaymentProviderFactory
};