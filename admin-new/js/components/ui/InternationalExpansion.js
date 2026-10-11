/**
 * DALLI International Expansion Module
 * Multi-region deployment, local payments, tax compliance, logistics partners
 */

export class InternationalExpansion {
  static init() {
    this.regions = new Map();
    this.currencies = new Map();
    this.paymentMethods = new Map();
    this.taxRules = new Map();
    this.logisticsPartners = new Map();
    this.localization = new Map();
    this.complianceRules = new Map();
    
    this.initDefaultConfig();
    console.log('[InternationalExpansion] Initialized');
  }

  static initDefaultConfig() {
    // Supported regions with their configurations
    this.regions.set('RS', {
      code: 'RS',
      name: 'Serbia',
      currency: 'RSD',
      language: 'sr',
      timezone: 'Europe/Belgrade',
      dateFormat: 'DD.MM.YYYY',
      numberFormat: { decimal: ',', thousands: '.' },
      vatRate: 20,
      vatNumberFormat: 'RS########',
      ossEligible: true,
      shippingZones: ['RS', 'BA', 'ME', 'MK', 'HR'],
      restrictedProducts: [],
      customsUnion: false
    });

    this.regions.set('BA', {
      code: 'BA',
      name: 'Bosnia and Herzegovina',
      currency: 'BAM',
      language: 'bs',
      timezone: 'Europe/Sarajevo',
      dateFormat: 'DD.MM.YYYY',
      numberFormat: { decimal: ',', thousands: '.' },
      vatRate: 17,
      vatNumberFormat: '##########',
      ossEligible: false,
      shippingZones: ['BA'],
      restrictedProducts: ['alcohol', 'tobacco'],
      customsUnion: false
    });

    this.regions.set('ME', {
      code: 'ME',
      name: 'Montenegro',
      currency: 'EUR',
      language: 'sr',
      timezone: 'Europe/Podgorica',
      dateFormat: 'DD.MM.YYYY',
      numberFormat: { decimal: ',', thousands: '.' },
      vatRate: 21,
      vatNumberFormat: '##########',
      ossEligible: false,
      shippingZones: ['ME'],
      restrictedProducts: [],
      customsUnion: false
    });

    this.regions.set('EU', {
      code: 'EU',
      name: 'European Union',
      currency: 'EUR',
      language: 'en',
      timezone: 'Europe/Brussels',
      dateFormat: 'DD.MM.YYYY',
      numberFormat: { decimal: ',', thousands: '.' },
      vatRate: 0, // Varies by country
      vatNumberFormat: '[A-Z]{2}[0-9A-Z]{2,12}',
      ossEligible: true,
      shippingZones: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'],
      restrictedProducts: [],
      customsUnion: true
    });

    // Currencies
    this.currencies.set('RSD', { code: 'RSD', symbol: 'дин', name: 'Serbian Dinar', decimals: 0, exchangeRate: 1 });
    this.currencies.set('EUR', { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, exchangeRate: 117.5 });
    this.currencies.set('BAM', { code: 'BAM', symbol: 'KM', name: 'Convertible Mark', decimals: 2, exchangeRate: 60.1 });
    this.currencies.set('USD', { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, exchangeRate: 108.2 });
    this.currencies.set('GBP', { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, exchangeRate: 135.8 });

    // Payment methods per region
    this.paymentMethods.set('RS', [
      { id: 'card', name: 'Kartica', types: ['visa', 'mastercard', 'maestro', 'dina'], enabled: true },
      { id: 'cash_on_delivery', name: 'Plaćanje pri preuzimanju', enabled: true, maxAmount: 50000 },
      { id: 'bank_transfer', name: 'Bankovski prenos', enabled: true },
      { id: 'keks_pay', name: 'KeksPay', enabled: true },
      { id: 'yettel_pay', name: 'Yettel Pay', enabled: true }
    ]);

    this.paymentMethods.set('BA', [
      { id: 'card', name: 'Kartica', types: ['visa', 'mastercard'], enabled: true },
      { id: 'cash_on_delivery', name: 'Na gotovinu', enabled: true, maxAmount: 2000 },
      { id: 'bank_transfer', name: 'Bankovni transfer', enabled: true }
    ]);

    this.paymentMethods.set('ME', [
      { id: 'card', name: 'Kartica', types: ['visa', 'mastercard'], enabled: true },
      { id: 'cash_on_delivery', name: 'Plaćanje pri dostavi', enabled: true, maxAmount: 1000 },
      { id: 'bank_transfer', name: 'Bankovski transfer', enabled: true }
    ]);

    this.paymentMethods.set('EU', [
      { id: 'card', name: 'Credit/Debit Card', types: ['visa', 'mastercard', 'amex'], enabled: true },
      { id: 'paypal', name: 'PayPal', enabled: true },
      { id: 'klarna', name: 'Klarna', enabled: true },
      { id: 'sepa', name: 'SEPA Direct Debit', enabled: true },
      { id: 'apple_pay', name: 'Apple Pay', enabled: true },
      { id: 'google_pay', name: 'Google Pay', enabled: true }
    ]);

    // Tax rules (VAT, OSS, customs)
    this.taxRules.set('RS', {
      standardRate: 20,
      reducedRates: { books: 10, medical: 10 },
      ossRegistered: true,
      ossThreshold: 10000, // EUR
      intracommunityThreshold: 10000,
      distanceSellingThreshold: 0, // OSS applies
      invoicingRequirements: ['vat_number', 'business_name', 'address', 'date', 'sequential_number'],
      electronicInvoicing: false
    });

    this.taxRules.set('EU', {
      standardRate: 0, // Country-specific
      reducedRates: {},
      ossRegistered: true,
      ossThreshold: 10000,
      intracommunityThreshold: 10000,
      distanceSellingThreshold: 10000,
      invoicingRequirements: ['vat_number', 'business_name', 'address', 'date', 'sequential_number', 'vat_rate', 'vat_amount'],
      electronicInvoicing: true,
      viess: true // VAT Information Exchange System
    });

    // Logistics partners per region
    this.logisticsPartners.set('RS', [
      { id: 'posta_srbije', name: 'Pošta Srbije', type: 'national', cod: true, tracking: true, maxWeight: 30, maxDimensions: { l: 100, w: 60, h: 40 }, pickupPoints: 1200 },
      { id: 'dhl', name: 'DHL Express', type: 'international', cod: false, tracking: true, maxWeight: 30, maxDimensions: { l: 120, w: 80, h: 80 }, pickupPoints: 50 },
      { id: 'gls', name: 'GLS', type: 'international', cod: true, tracking: true, maxWeight: 30, maxDimensions: { l: 100, w: 60, h: 60 }, pickupPoints: 200 },
      { id: 'dpex', name: 'DPEX', type: 'regional', cod: true, tracking: true, maxWeight: 30, maxDimensions: { l: 100, w: 60, h: 60 }, pickupPoints: 150 }
    ]);

    this.logisticsPartners.set('BA', [
      { id: 'posta_bih', name: 'Pošte BiH', type: 'national', cod: true, tracking: true, maxWeight: 20 },
      { id: 'dhl_ba', name: 'DHL BiH', type: 'international', cod: false, tracking: true, maxWeight: 30 }
    ]);

    this.logisticsPartners.set('ME', [
      { id: 'posta_me', name: 'Pošta Crne Gore', type: 'national', cod: true, tracking: true, maxWeight: 20 },
      { id: 'dhl_me', name: 'DHL Montenegro', type: 'international', cod: false, tracking: true, maxWeight: 30 }
    ]);

    this.logisticsPartners.set('EU', [
      { id: 'dhl_eu', name: 'DHL Express EU', type: 'international', cod: false, tracking: true, maxWeight: 30, deliveryTime: '1-3 days' },
      { id: 'ups', name: 'UPS', type: 'international', cod: false, tracking: true, maxWeight: 30, deliveryTime: '1-3 days' },
      { id: 'dpd', name: 'DPD', type: 'international', cod: true, tracking: true, maxWeight: 30, deliveryTime: '2-5 days' },
      { id: 'postnl', name: 'PostNL', type: 'international', cod: false, tracking: true, maxWeight: 20, deliveryTime: '3-7 days' }
    ]);

    // Compliance rules per region
    this.complianceRules.set('RS', {
      consumerProtection: ['14_day_return', 'warranty_2_years', 'price_display_tax_included'],
      dataProtection: 'PDPA_Serbia', // Personal Data Protection Act
      eCommerceLaw: 'Zakon_o_trgovini_elektronskim_putem',
      ageVerification: { alcohol: 18, tobacco: 18 },
      productLabeling: ['serbian_language', 'ingredients', 'origin', 'expiry_date'],
      returnPolicy: { minDays: 14, reasonRequired: false, originalPackaging: true }
    });

    this.complianceRules.set('EU', {
      consumerProtection: ['14_day_return', 'warranty_2_years', 'price_display_tax_included', 'geo_blocking_ban'],
      dataProtection: 'GDPR',
      eCommerceLaw: 'Directive_2000/31/EC',
      ageVerification: { alcohol: 18, tobacco: 18, gambling: 18 },
      productLabeling: ['local_language', 'ingredients', 'origin', 'expiry_date', 'ce_marking'],
      returnPolicy: { minDays: 14, reasonRequired: false, originalPackaging: false },
      accessibility: 'WCAG_2_1_AA',
      sustainability: ['packaging_directive', 'weee', 'batteries_directive']
    });
  }

  // ============================================================
  // REGION MANAGEMENT
  // ============================================================

  static getRegion(regionCode) {
    return this.regions.get(regionCode.toUpperCase()) || this.regions.get('RS');
  }

  static getAllRegions() {
    return Array.from(this.regions.values());
  }

  static getSupportedCountries() {
    const countries = [];
    this.regions.forEach(region => {
      if (region.shippingZones) {
        region.shippingZones.forEach(zone => {
          if (!countries.find(c => c.code === zone)) {
            const r = this.regions.get(zone);
            if (r) countries.push({ code: r.code, name: r.name, currency: r.currency });
          }
        });
      }
    });
    return countries;
  }

  // ============================================================
  // CURRENCY & LOCALIZATION
  // ============================================================

  static getCurrency(currencyCode) {
    return this.currencies.get(currencyCode.toUpperCase()) || this.currencies.get('RSD');
  }

  static formatPrice(amount, currencyCode, options = {}) {
    const currency = this.getCurrency(currencyCode);
    const { showSymbol = true, showCode = false, locale = 'sr-RS' } = options;
    
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals
    });

    let formatted = formatter.format(amount);
    
    if (!showSymbol) {
      formatted = formatted.replace(currency.symbol, '').trim();
    }
    if (showCode) {
      formatted += ` ${currency.code}`;
    }
    
    return formatted;
  }

  static convertCurrency(amount, fromCurrency, toCurrency) {
    const from = this.getCurrency(fromCurrency);
    const to = this.getCurrency(toCurrency);
    
    // Convert to base (RSD) then to target
    const inBase = amount * from.exchangeRate;
    return inBase / to.exchangeRate;
  }

  static formatDate(date, regionCode, options = {}) {
    const region = this.getRegion(regionCode);
    const locale = region.language === 'sr' ? 'sr-RS' : region.language;
    
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options
    }).format(new Date(date));
  }

  static getLocalization(regionCode) {
    const region = this.getRegion(regionCode);
    return {
      language: region.language,
      currency: region.currency,
      dateFormat: region.dateFormat,
      numberFormat: region.numberFormat,
      timezone: region.timezone,
      rtl: false
    };
  }

  // ============================================================
  // PAYMENT METHODS
  // ============================================================

  static getPaymentMethods(regionCode) {
    return this.paymentMethods.get(regionCode.toUpperCase()) || this.paymentMethods.get('RS');
  }

  static getAvailablePaymentMethods(regionCode, amount = 0) {
    const methods = this.getPaymentMethods(regionCode);
    return methods
      .filter(m => m.enabled && (!m.maxAmount || amount <= m.maxAmount))
      .map(m => ({
        id: m.id,
        name: m.name,
        types: m.types,
        cod: m.id === 'cash_on_delivery'
      }));
  }

  static validatePaymentMethod(regionCode, methodId, amount = 0) {
    const methods = this.getPaymentMethods(regionCode);
    const method = methods.find(m => m.id === methodId);
    
    if (!method || !method.enabled) {
      return { valid: false, reason: 'Payment method not available' };
    }
    
    if (method.maxAmount && amount > method.maxAmount) {
      return { valid: false, reason: `Amount exceeds maximum for ${method.name} (${this.formatPrice(method.maxAmount, this.getRegion(regionCode).currency)})` };
    }
    
    return { valid: true };
  }

  // ============================================================
  // TAX CALCULATION
  // ============================================================

  static calculateTax(amount, regionCode, productCategory = 'standard', customerType = 'B2C', customerVatNumber = null) {
    const region = this.getRegion(regionCode);
    const taxRules = this.taxRules.get(regionCode.toUpperCase()) || this.taxRules.get('RS');
    
    let rate = taxRules.standardRate;
    if (taxRules.reducedRates[productCategory]) {
      rate = taxRules.reducedRates[productCategory];
    }

    // B2B with valid VAT number - reverse charge (0% VAT)
    if (customerType === 'B2B' && customerVatNumber && this.validateVatNumber(customerVatNumber, regionCode)) {
      if (region.code === 'RS' || (region.code === 'EU' && this.isIntracommunity(customerVatNumber))) {
        return { vatRate: 0, vatAmount: 0, total: amount, regime: 'reverse_charge' };
      }
    }

    // OSS for EU distance selling
    if (region.ossEligible && customerType === 'B2C' && region.code !== 'RS') {
      // Use destination country VAT rate
      const destRegion = this.getRegion(regionCode);
      rate = destRegion.vatRate || rate;
    }

    const vatAmount = Math.round(amount * rate / 100);
    return {
      vatRate: rate,
      vatAmount,
      total: amount + vatAmount,
      regime: 'standard'
    };
  }

  static validateVatNumber(vatNumber, regionCode) {
    const region = this.getRegion(regionCode);
    const format = region.vatNumberFormat;
    
    // Simple regex validation
    const regex = new RegExp(`^${format}$`);
    return regex.test(vatNumber);
  }

  static isIntracommunity(vatNumber) {
    // Check if VAT number is from another EU country
    const euPrefixes = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
    const prefix = vatNumber.substring(0, 2).toUpperCase();
    return euPrefixes.includes(prefix);
  }

  static async checkOSSThreshold(regionCode, salesAmount) {
    const taxRules = this.taxRules.get(regionCode.toUpperCase());
    if (!taxRules || !taxRules.ossRegistered) return { required: false };
    
    return {
      required: salesAmount >= taxRules.ossThreshold,
      threshold: taxRules.ossThreshold,
      currentSales: salesAmount,
      percentage: (salesAmount / taxRules.ossThreshold * 100).toFixed(1)
    };
  }

  // ============================================================
  // LOGISTICS & SHIPPING
  // ============================================================

  static getLogisticsPartners(regionCode) {
    return this.logisticsPartners.get(regionCode.toUpperCase()) || this.logisticsPartners.get('RS');
  }

  static calculateShippingCost(regionCode, weight, dimensions, value, serviceLevel = 'standard') {
    const partners = this.getLogisticsPartners(regionCode);
    const region = this.getRegion(regionCode);
    
    // Find best partner
    const suitablePartners = partners.filter(p => {
      if (p.maxWeight && weight > p.maxWeight) return false;
      if (p.maxDimensions) {
        if (dimensions.l > p.maxDimensions.l) return false;
        if (dimensions.w > p.maxDimensions.w) return false;
        if (dimensions.h > p.maxDimensions.h) return false;
      }
      return true;
    });

    if (suitablePartners.length === 0) {
      return { available: false, reason: 'No suitable logistics partner for package dimensions/weight' };
    }

    // Simple cost calculation (in production, use partner APIs)
    const baseCost = this.calculateBaseShippingCost(regionCode, weight, serviceLevel);
    const insuranceCost = value > 5000 ? value * 0.005 : 0;
    const codFee = serviceLevel === 'cod' ? 150 : 0;

    return {
      available: true,
      partners: suitablePartners.map(p => ({
        id: p.id,
        name: p.name,
        estimatedCost: baseCost + insuranceCost + codFee,
        deliveryTime: p.deliveryTime || '2-5 business days',
        tracking: p.tracking,
        cod: p.cod
      })),
      recommended: suitablePartners[0].id
    };
  }

  static calculateBaseShippingCost(regionCode, weight, serviceLevel) {
    const baseRates = {
      'RS': { standard: 350, express: 650, cod: 50 },
      'BA': { standard: 850, express: 1500, cod: 100 },
      'ME': { standard: 750, express: 1300, cod: 100 },
      'EU': { standard: 1200, express: 2500, cod: 0 }
    };

    const rates = baseRates[regionCode.toUpperCase()] || baseRates['RS'];
    const weightMultiplier = weight <= 1 ? 1 : weight <= 5 ? 1.5 : weight <= 10 ? 2 : 3;
    
    return Math.round(rates[serviceLevel] * weightMultiplier);
  }

  static async createShipment(orderData, partnerId) {
    // In production, integrate with partner APIs
    const trackingNumber = `DAL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    return {
      trackingNumber,
      partner: partnerId,
      status: 'created',
      labelUrl: `/labels/${trackingNumber}.pdf`,
      estimatedDelivery: this.calculateEstimatedDelivery(orderData.shippingRegion, partnerId)
    };
  }

  static calculateEstimatedDelivery(regionCode, partnerId) {
    const partners = this.getLogisticsPartners(regionCode);
    const partner = partners.find(p => p.id === partnerId);
    const days = partner?.deliveryTime || '3-5 business days';
    
    // Parse days and add to current date
    const match = days.match(/(\d+)-(\d+)/);
    if (match) {
      const maxDays = parseInt(match[2]);
      const date = new Date();
      date.setDate(date.getDate() + maxDays);
      return date.toISOString().split('T')[0];
    }
    
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return date.toISOString().split('T')[0];
  }

  // ============================================================
  // COMPLIANCE
  // ============================================================

  static getComplianceRules(regionCode) {
    return this.complianceRules.get(regionCode.toUpperCase()) || this.complianceRules.get('RS');
  }

  static validateOrderCompliance(orderData, regionCode) {
    const rules = this.getComplianceRules(regionCode);
    const issues = [];

    // Age verification
    if (orderData.items) {
      orderData.items.forEach(item => {
        if (rules.ageVerification[item.category]) {
          if (!orderData.customerAgeVerified || orderData.customerAge < rules.ageVerification[item.category]) {
            issues.push({
              type: 'age_verification',
              severity: 'error',
              message: `Age verification required for ${item.category} (min ${rules.ageVerification[item.category]} years)`
            });
          }
        }
      });
    }

    // Product labeling
    if (rules.productLabeling) {
      rules.productLabeling.forEach(req => {
        if (!orderData.productLabels?.[req]) {
          issues.push({
            type: 'labeling',
            severity: 'warning',
            message: `Missing required product label: ${req}`
          });
        }
      });
    }

    // Return policy display
    if (rules.returnPolicy) {
      if (!orderData.returnPolicyAcknowledged) {
        issues.push({
          type: 'return_policy',
          severity: 'info',
          message: `Customer must acknowledge ${rules.returnPolicy.minDays}-day return policy`
        });
      }
    }

    return {
      compliant: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }

  static generateInvoiceData(orderData, regionCode) {
    const region = this.getRegion(regionCode);
    const taxRules = this.taxRules.get(regionCode.toUpperCase());
    
    return {
      invoiceNumber: `INV-${regionCode}-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      seller: {
        name: 'DALLI d.o.o.',
        address: 'Bulevar Mihaila Pupina 10, 11070 Novi Beograd',
        vatNumber: 'RS123456789',
        taxId: '123456789'
      },
      buyer: {
        name: orderData.customerName,
        address: orderData.shippingAddress,
        vatNumber: orderData.customerVatNumber,
        taxId: orderData.customerTaxId
      },
      items: orderData.items.map(item => ({
        description: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        vatRate: this.calculateTax(item.price, regionCode, item.category, orderData.customerType, orderData.customerVatNumber).vatRate,
        total: item.price * item.quantity
      })),
      totals: {
        subtotal: orderData.subtotal,
        vat: orderData.vatAmount,
        total: orderData.total,
        currency: region.currency
      },
      notes: taxRules.electronicInvoicing ? 'E-invoice generated' : 'Paper invoice'
    };
  }

  // ============================================================
  // DEPLOYMENT CONFIGURATION
  // ============================================================

  static getDeploymentConfig(regionCode) {
    const region = this.getRegion(regionCode);
    
    return {
      region: region.code,
      primaryDomain: this.getPrimaryDomain(regionCode),
      cdnEdgeLocations: this.getCDNLocations(regionCode),
      databaseRegion: this.getDatabaseRegion(regionCode),
      compliance: this.getComplianceRules(regionCode),
      featureFlags: this.getRegionFeatureFlags(regionCode)
    };
  }

  static getPrimaryDomain(regionCode) {
    const domains = {
      'RS': 'dalli.rs',
      'BA': 'dalli.ba',
      'ME': 'dalli.me',
      'EU': 'dalli.eu'
    };
    return domains[regionCode.toUpperCase()] || 'dalli.rs';
  }

  static getCDNLocations(regionCode) {
    const locations = {
      'RS': ['Belgrade', 'Novi Sad', 'Nis'],
      'BA': ['Sarajevo', 'Banja Luka'],
      'ME': ['Podgorica'],
      'EU': ['Frankfurt', 'Amsterdam', 'Paris', 'Milan', 'Vienna', 'Warsaw']
    };
    return locations[regionCode.toUpperCase()] || locations['RS'];
  }

  static getDatabaseRegion(regionCode) {
    const regions = {
      'RS': 'eu-central-1', // Frankfurt (closest to Serbia)
      'BA': 'eu-central-1',
      'ME': 'eu-central-1',
      'EU': 'eu-central-1'
    };
    return regions[regionCode.toUpperCase()] || 'eu-central-1';
  }

  static getRegionFeatureFlags(regionCode) {
    const flags = {
      'RS': { visualSearch: true, sizeRecommendation: true, loyaltyProgram: true, giftCards: true, installments: true },
      'BA': { visualSearch: true, sizeRecommendation: true, loyaltyProgram: false, giftCards: false, installments: false },
      'ME': { visualSearch: true, sizeRecommendation: true, loyaltyProgram: false, giftCards: false, installments: false },
      'EU': { visualSearch: true, sizeRecommendation: true, loyaltyProgram: true, giftCards: true, installments: true, klarna: true }
    };
    return flags[regionCode.toUpperCase()] || flags['RS'];
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => InternationalExpansion.init());
} else {
  InternationalExpansion.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InternationalExpansion };
}

if (typeof window !== 'undefined') {
  window.InternationalExpansion = InternationalExpansion;
}