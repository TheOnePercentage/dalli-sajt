/**
 * Crypto Payment Core Module
 * 
 * Main orchestrator for the crypto payment experience.
 * Handles state machine, coordinates UI, provider, and flow modules.
 */

export class CryptoPayment {
  constructor() {
    this.orderData = null;
    this.config = null;
    this.provider = null;
    this.ui = null;
    this.flow = null;
    this.paymentId = null;
    this.paymentData = null;
    this.currentStep = 'idle';
    this.abortController = null;
    this._resolveOnClose = null;
  }

  async init(orderData, config) {
    this.orderData = orderData;
    this.config = config;
    
    // Initialize submodules
    await this._initModules();
    this._bindEvents();
    
    return this;
  }

async _initModules() {
    const [UIModule, AI, Upload] = await Promise.all([
      import('./CryptoPaymentUI.jsx'),
      import('../../../data/crypto-payment-provider.js'),
      import('./CryptoPaymentFlow.cjs')
    ]);
    
    this.ui = new UIModule.CryptoPaymentUI(this);
    this.provider = ProviderModule.CryptoPaymentProviderFactory.create(this.config.cryptoPayment || {});
    this.flow = new FlowModule.CryptoPaymentFlow(this);
    
    // Initialize submodules
    await this.ui.init();
    await this.provider.initialize();
    await this.flow.init();
  }

  _bindEvents() {
    // UI callbacks
    this.ui.onCurrencySelect = (currency) => this.onCurrencySelect(currency);
    this.ui.onGeneratePayment = () => this.generatePayment();
    this.ui.onRetry = () => this.retryPayment();
    this.ui.onCancel = () => this.cancel();
    this.ui.onClose = () => this.close();
    this.ui.onCopyAddress = () => this.copyAddress();
    this.ui.onOpenQR = () => this.openQR();
    
    // Flow callbacks
    this.flow.onPaymentCreated = (payment) => this.onPaymentCreated(payment);
    this.flow.onStatusUpdate = (status) => this.onStatusUpdate(status);
    this.flow.onPaymentConfirmed = (payment) => this.onPaymentConfirmed(payment);
    this.flow.onPaymentFailed = (error) => this.onPaymentFailed(error);
    this.flow.onPaymentExpired = () => this.onPaymentExpired();
  }

  async open() {
    this.currentStep = 'currency';
    this.ui.openModal();
    this.ui.showStep('currency');
    this._track('crypto_payment_opened', { 
      orderNumber: this.orderData.orderNumber,
      total: this.orderData.totals.total
    });
    
    return new Promise((resolve) => {
      this._resolveOnClose = resolve;
    });
  }

  close() {
    this.ui.closeModal();
    this._cleanup();
    this.currentStep = 'idle';
    this._resolveOnClose?.({ cancelled: true });
  }

  destroy() {
    this.close();
    this.ui?.destroy();
    this.provider?.destroy();
    this.flow?.destroy();
  }

  // ==================== FLOW STEPS ====================

  async onCurrencySelect(currency) {
    this.currentStep = 'generating';
    this.ui.showStep('generating', { currency });
    this._track('crypto_currency_selected', { 
      productId: this.orderData.orderNumber, 
      currency 
    });
    
    // Generate payment after brief delay for UX
    setTimeout(() => this.generatePayment(), 300);
  }

  async generatePayment() {
    this.currentStep = 'generating';
    this.ui.showStep('generating');
    
    try {
      const payment = await this.flow.createPayment(this.orderData);
      this.paymentId = payment.paymentId;
      this.paymentData = payment;
      
      this.currentStep = 'payment';
      this.ui.showStep('payment', payment);
      this._track('crypto_payment_created', { 
        productId: this.orderData.orderNumber, 
        paymentId: payment.paymentId,
        currency: payment.currency
      });
      
      // Start monitoring
      this.flow.startMonitoring(payment.paymentId);
      
    } catch (error) {
      this.currentStep = 'error';
      this.ui.showError(error.message);
      this._track('crypto_payment_creation_failed', { 
        productId: this.orderData.orderNumber, 
        error: error.message 
      });
    }
  }

  async onPaymentCreated(payment) {
    this.paymentData = payment;
    this.paymentId = payment.paymentId;
  }

  onStatusUpdate(status) {
    this.ui.updatePaymentStatus(status);
    this._track('crypto_payment_status_update', { 
      paymentId: this.paymentId, 
      status 
    });
  }

  async onPaymentConfirmed(payment) {
    this.currentStep = 'success';
    this.ui.showStep('success', payment);
    this._track('crypto_payment_confirmed', { 
      paymentId: this.paymentId,
      orderNumber: this.orderData.orderNumber,
      currency: payment.currency,
      amountCrypto: payment.amountCrypto
    });
    
    // Complete order
    await this.flow.completeOrder(payment);
  }

  onPaymentFailed(error) {
    this.currentStep = 'error';
    this.ui.showError(error.message || 'Plaćanje nije uspelo');
    this._track('crypto_payment_failed', { 
      paymentId: this.paymentId, 
      error: error.message 
    });
  }

  onPaymentExpired() {
    this.currentStep = 'expired';
    this.ui.showStep('expired');
    this._track('crypto_payment_expired', { 
      paymentId: this.paymentId 
    });
  }

  retryPayment() {
    this.currentStep = 'generating';
    this.generatePayment();
  }

  cancel() {
    if (this.paymentId) {
      this.flow.cancelPayment(this.paymentId);
    }
    this.close();
  }

  copyAddress() {
    if (this.paymentData?.walletAddress) {
      navigator.clipboard.writeText(this.paymentData.walletAddress);
      this.ui.showToast('Adresa kopirana u clipboard');
    }
  }

  openQR() {
    if (this.paymentData?.qrCodeImage) {
      this.ui.showQRModal(this.paymentData.qrCodeImage);
    }
  }

  async completeOrder(payment) {
    // Order completion is handled by checkout flow
    // This just signals completion
    this._resolveOnClose?.({ 
      success: true, 
      orderNumber: this.orderData.orderNumber,
      paymentId: this.paymentId,
      payment 
    });
  }

  _track(event, data) {
    const payload = {
      event: `crypto_payment:${event}`,
      section: 'crypto_payment',
      timestamp: Date.now(),
      device: window.innerWidth < 768 ? 'mobile' : 'desktop',
      ...data
    };

    if (window.dataLayer) window.dataLayer.push(payload);
    if (window.gtag) window.gtag('event', `crypto_payment:${event}`, payload);
    console.log('[CryptoPayment] Track:', payload);
  }

  _cleanup() {
    this.flow?.stopMonitoring();
    this.abortController?.abort();
    this.abortController = null;
    this.paymentData = null;
    this.paymentId = null;
  }
}

export async function createCryptoPayment(orderData) {
  const cryptoPayment = new CryptoPayment();
  await cryptoPayment.init(orderData, orderData.config || {});
  
  return {
    init: (orderData, config) => cryptoPayment.init(orderData, config),
    open: () => cryptoPayment.open(),
    close: () => cryptoPayment.close(),
    destroy: () => cryptoPayment.destroy(),
    retry: () => cryptoPayment.retryPayment(),
    cancel: () => cryptoPayment.cancel()
  };
}