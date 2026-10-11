/**
 * Crypto Payment Flow Module
 * 
 * Handles the payment flow logic: creation, monitoring, verification.
 */

import { getCryptoDiscountRateSync } from '../../services/payment-incentives.js';

export class CryptoPaymentFlow {
  constructor(controller) {
    this.controller = controller;
    this.config = null;
    this.provider = null;
    this.monitoringInterval = null;
    this.paymentId = null;
    this.pollInterval = 15000; // 15 seconds
    this.maxPollDuration = 30 * 60 * 1000; // 30 minutes
    this.startTime = null;
  }

  async init() {
    this.config = this.controller.config?.cryptoPayment || {};
    this.provider = this.controller.provider;
  }

  async createPayment(orderData) {
    const config = this.controller.config?.cryptoPayment || {};
    const totals = orderData.totals || {};
    const subtotal = totals.subtotal || totals.total || 0;
    const shipping = totals.shipping || 0;
    const discount = totals.discount || 0;
    
    // Calculate crypto discount
    const discountRate = this.config.discount?.rate ?? getCryptoDiscountRateSync();
    const discountAmount = subtotal * discountRate;
    const discountedSubtotal = subtotal - discountAmount;
    const totalRSD = discountedSubtotal + shipping;
    
    // Get selected currency
    const currency = this.controller.ui?.getSelectedCurrency?.() || 'USDT';
    
    // Get exchange rate
    const exchangeRate = await this.getExchangeRate(currency);
    
    // Calculate crypto amount
    const amountCrypto = totalRSD / exchangeRate;
    
    // Track payment creation
    this._track('payment_created', {
      orderNumber: this.controller.orderData.orderNumber,
      currency,
      amountRSD: totalRSD,
      amountCrypto,
      discountRate,
      discountAmountRSD: discountAmount
    });
    
    // Create payment via provider
    const payment = await this.provider.createPayment({
      amountRSD: totalRSD,
      currency,
      exchangeRate,
      order: {
        orderNumber: this.controller.orderData.orderNumber,
        totals: { subtotal, shipping, discount: discountAmount, total: totalRSD },
        items: this.controller.orderData.items
      }
    });
    
    return {
      paymentId: payment.paymentId,
      currency: payment.currency,
      amountCrypto: payment.amountCrypto,
      amountRSD: payment.amountRSD,
      exchangeRate: payment.exchangeRate,
      walletAddress: payment.walletAddress,
      qrCodeData: payment.qrCodeData,
      qrCodeImage: payment.qrCodeImage,
      expiresAt: payment.expiresAt,
      discountApplied: true,
      discountRate,
      discountAmountRSD: discountAmount,
      totalRSD
    };
  }

  async getExchangeRate(currency) {
    const config = this.controller.config?.cryptoPayment?.exchangeRate || {};
    const provider = config.provider || 'coingecko';
    
    // In production, fetch from API
    // For now, return mock rates
    const mockRates = {
      BTC: 5500000,    // 1 BTC = 5,500,000 RSD
      ETH: 350000,     // 1 ETH = 350,000 RSD
      USDT: 110,       // 1 USDT = 110 RSD
      USDC: 110        // 1 USDC = 110 RSD
    };
    
    return mockRates[currency] || mockRates.USDT;
  }

  startMonitoring(paymentId) {
    this.paymentId = paymentId;
    this.startTime = Date.now();
    
    // Initial check
    this.pollStatus();
    
    // Set up interval
    this.monitoringInterval = setInterval(() => {
      this.pollStatus();
    }, this.pollInterval);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  async pollStatus() {
    if (!this.paymentId) return;
    
    // Check timeout
    if (Date.now() - this.startTime > this.maxPollDuration) {
      this.stopMonitoring();
      this.controller.onPaymentExpired();
      return;
    }
    
    try {
      const status = await this.controller.provider.checkPaymentStatus(this.paymentId);
      
      // Track status update
      this.controller._track('status_update', { 
        paymentId: this.paymentId, 
        status: status.status,
        confirmations: status.confirmations,
        requiredConfirmations: status.requiredConfirmations 
      });
      
      // Update UI
      this.controller.onStatusUpdate(status.status);
      
      if (status.status === 'confirmed') {
        this.stopMonitoring();
        this.controller.onPaymentConfirmed(status);
      } else if (status.status === 'failed') {
        this.stopMonitoring();
        this.controller.onPaymentFailed(new Error(status.error || 'Plaćanje nije uspelo'));
      } else if (status.status === 'expired') {
        this.stopMonitoring();
        this.controller.onPaymentExpired();
      }
    } catch (error) {
      console.error('[CryptoFlow] Status poll error:', error);
      // Don't stop on error, just log and continue
    }
  }

  async completeOrder(payment) {
    // This is called when payment is confirmed
    // The actual order completion is handled by the checkout flow
    // We just signal completion
    this.controller.completeOrder(payment);
  }

  async cancelPayment(paymentId) {
    try {
      await this.controller.provider.cancelPayment(paymentId);
      this.stopMonitoring();
    } catch (error) {
      console.error('[CryptoFlow] Cancel error:', error);
    }
  }

  async cancel() {
    if (this.paymentId) {
      await this.cancelPayment(this.paymentId);
    }
  }
}

export default CryptoPaymentFlow;