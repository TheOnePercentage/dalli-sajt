/**
 * GDPR Compliance Module
 * Handles GDPR data subject rights, cookie consent, and data protection
 */

class GDPRCompliance {
  constructor() {
    this.consentRecords = new Map();
    this.dataRequests = new Map();
    this.retentionPolicies = {
      analytics: 365 * 24 * 60 * 60 * 1000, // 1 year
      marketing: 365 * 24 * 60 * 60 * 1000, // 1 year
      necessary: 365 * 24 * 60 * 60 * 1000, // 1 year
      preferences: 365 * 24 * 60 * 60 * 1000, // 1 year
      orders: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years (legal requirement)
      payments: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years (PCI-DSS)
      logs: 90 * 24 * 60 * 60 * 1000, // 90 days
      sessions: 30 * 24 * 60 * 60 * 1000 // 30 days
    };
  }

  // Cookie consent management
  async recordConsent(userId, consent) {
    const record = {
      userId,
      timestamp: new Date().toISOString(),
      ip: null, // Set from request
      userAgent: '', // Set from request
      consent: {
        necessary: true, // Always required
        analytics: consent.analytics || false,
        marketing: consent.marketing || false,
        preferences: consent.preferences || false,
        // Granular consent per purpose
        purposes: consent.purposes || {}
      },
      version: '1.0',
      ip: '',
      userAgent: ''
    };

    // Store consent record
    // In production: save to database
    console.log('[GDPR] Consent recorded:', consent);
    
    return { success: true, consentId: `consent_${Date.now()}` };
  }

  // Get user consent
  async getConsent(userId) {
    // Fetch from database
    return this.consentRecords.get(userId) || {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
  }

  // Withdraw consent
  async withdrawConsent(userId, purpose) {
    const record = await this.getConsent(userId);
    if (record) {
      if (purpose) {
        record.consent[purpose] = false;
      } else {
        // Withdraw all non-necessary consent
        record.consent.analytics = false;
        record.consent.marketing = false;
        record.consent.preferences = false;
      }
      // Save updated record
      return { success: true };
    }
    return { success: false, error: 'No consent record found' };
  }

  // Data subject rights
  async handleDataSubjectRequest(request) {
    const { type, userId, email, verificationCode } = request;
    
    const validTypes = ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'];
    
    if (!validTypes.includes(request.type)) {
      throw new Error('Invalid request type');
    }

    const requestRecord = {
      id: `dsr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: request.type,
      userId,
      email,
      status: 'pending',
      createdAt: new Date().toISOString(),
      verificationCode: this.generateVerificationCode(),
      verified: false
    };

    this.dataRequests.set(request.id, requestRecord);

    // Send verification email
    // await this.sendVerificationEmail(email, requestRecord.verificationCode);

    return {
      success: true,
      requestId: requestRecord.id,
      message: 'Verification code sent to email'
    };
  }

  async processVerifiedRequest(requestId, verificationCode) {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.verificationCode !== verificationCode) {
      throw new Error('Invalid verification code');
    }

    request.verified = true;
    request.processedAt = new Date().toISOString();

    // Process based on type
    switch (request.type) {
      case 'access':
        return await this.exportUserData(request.userId);
      case 'erasure':
        return await this.eraseUserData(request.userId);
      case 'rectification':
        return await this.rectifyData(request.userId, request.data);
      case 'portability':
        return await this.exportUserData(request.userId);
      case 'restriction':
        return await this.restrictProcessing(request.userId);
      case 'objection':
        return await this.objectToProcessing(request.userId);
    }
  }

  // Data export (Right to Access / Portability)
  async exportUserData(userId) {
    // Collect all user data
    const data = {
      profile: await this.getUserProfile(userId),
      orders: await this.getUserOrders(userId),
      payments: await this.getUserPayments(userId),
      reviews: await this.getUserReviews(userId),
      wishlist: await this.getWishlist(userId),
      cart: await this.getCart(userId),
      consents: await this.getConsentRecords(userId),
      analytics: await this.getAnalyticsData(userId),
      marketing: await this.getMarketingData(userId),
      loyalty: await this.getLoyaltyData(userId),
      referrals: await this.getReferralData(userId)
    };

    return {
      format: 'JSON',
      generatedAt: new Date().toISOString(),
      data
    };
  }

  // Right to erasure (Right to be forgotten)
  async eraseUserData(userId) {
    // Check if erasure is allowed (legal obligations may prevent)
    const canErase = await this.canEraseUser(userId);
    if (!canErase) {
      throw new Error('Cannot erase user data due to legal obligations');
    }

    // Anonymize or delete data
    await this.anonymizeUserData(userId);
    
    // Remove from marketing lists
    await this.removeFromMarketingLists(userId);
    
    // Delete personal data
    await this.deletePersonalData(userId);

    // Record erasure
    await this.logErasure(userId);

    return { success: true, message: 'Personal data erased successfully' };
  }

  // Data rectification
  async rectifyData(userId, data) {
    // Update user data
    await this.updateUserData(userId, data);
    return { success: true };
  }

  // Restrict processing
  async restrictProcessing(userId) {
    // Mark user data as restricted
    await this.setProcessingRestriction(userId, true);
    return { success: true };
  }

  // Right to object
  async objectToProcessing(userId, reason) {
    // Stop processing for marketing
    await this.stopMarketingProcessing(userId);
    return { success: true };
  }

  // Data retention enforcement
  async enforceRetentionPolicies() {
    const now = Date.now();
    const results = {
      deleted: 0,
      errors: []
    };

    // Clean up expired data
    for (const [category, retentionMs] of Object.entries(this.retentionPolicies)) {
      try {
        const deleted = await this.cleanupExpiredData(category, retentionMs);
        results.deleted += deleted;
      } catch (error) {
        results.errors.push({ category, error: error.message });
      }
    }

    return results;
  }

  async cleanupExpiredData(category, retentionMs) {
    const cutoff = Date.now() - retentionMs;
    // Delete records older than retention period
    // Implementation depends on storage backend
    return 0; // Mock return
  }

  // Consent management
  async recordConsent(userId, consent) {
    const record = {
      userId,
      timestamp: new Date().toISOString(),
      consent: {
        necessary: true,
        analytics: consent.analytics || false,
        marketing: consent.marketing || false,
        preferences: consent.preferences || false
      },
      version: '1.0',
      ip: '', // Set from request
      userAgent: '' // Set from request
    };

    // Save to database
    return { success: true, consentId: `consent_${Date.now()}` };
  }

  async getConsent(userId) {
    // Fetch from database
    return {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
  }

  async withdrawConsent(userId, purpose) {
    // Update consent record
    // In production: update database
    console.log(`[GDPR] Consent withdrawn for user ${userId}, purpose: ${purpose || 'all'}`);
    return { success: true };
  }

  // Data breach notification
  async reportDataBreach(breachDetails) {
    const breach = {
      id: `breach_${Date.now()}`,
      detectedAt: new Date().toISOString(),
      ...breachDetails,
      severity: this.assessBreachSeverity(breachDetails),
      status: 'investigating'
    };

    // Log breach
    console.error('[DATA BREACH]', JSON.stringify(breach, null, 2));

    // Notify authorities within 72 hours (GDPR requirement)
    // await this.notifyAuthorities(breach);

    // Notify affected users if high risk
    // await this.notifyAffectedUsers(breach);

    return { success: true, breachId: breach.id };
  }

  assessBreachSeverity(details) {
    const { dataTypes, affectedUsers, riskLevel } = details;
    
    if (dataTypes.includes('payment') || dataTypes.includes('identity') || affectedUsers > 1000) {
      return 'high';
    }
    if (dataTypes.includes('contact') || affectedUsers > 100) {
      return 'medium';
    }
    return 'low';
  }

  // Cookie consent management
  getCookieConsentCategories() {
    return {
      necessary: {
        name: 'Neophodni',
        description: 'Neophodni za rad sajta',
        required: true,
        cookies: ['session', 'csrf', 'cart', 'auth']
      },
      analytics: {
        name: 'Analitika',
        description: 'Pomažu nam da razumemo kako posetioci koriste sajt',
        required: false,
        cookies: ['ga', 'gid', '_gat', '_fbp']
      },
      marketing: {
        name: 'Marketing',
        description: 'Personalizovane reklame i promocije',
        required: false,
        cookies: ['_fbp', 'fbc', 'twclid', 'ttclid']
      },
      preferences: {
        name: 'Podešavanja',
        description: 'Zapamćavaju vaše preference (jezik, valuta, tema)',
        required: false,
        cookies: ['locale', 'currency', 'theme']
      }
    };
  }

  generateVerificationCode() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }
}

module.exports = { GDPRCompliance };