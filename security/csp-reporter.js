/**
 * CSP Violation Reporter
 * Receives and logs CSP violations for monitoring and analysis
 */

const express = require('express');
const app = express();

app.use(express.json({ limit: '10kb' }));

// CSP violation endpoint
app.post('/api/security/csp-report', (req, res) => {
  const report = req.body['csp-report'] || req.body;
  
  const violation = {
    timestamp: new Date().toISOString(),
    'document-uri': report['document-uri'],
    referrer: report.referrer,
    'violated-directive': report['violated-directive'],
    'effective-directive': report['effective-directive'],
    'original-policy': report['original-policy'],
    'blocked-uri': report['blocked-uri'],
    'line-number': report['line-number'],
    'column-number': report['column-number'],
    'source-file': report['source-file'],
    'script-sample': report['script-sample'],
    'disposition': report.disposition,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  };

  // Log the violation
  console.warn('[CSP VIOLATION]', JSON.stringify(violation, null, 2));

  // In production, send to logging service (Sentry, Datadog, etc.)
  // sendToMonitoring(violation);

  res.status(204).send();
});

// GDPR Data Subject Request endpoint
app.post('/api/gdpr/request', express.json(), async (req, res) => {
  const { requestType, email, verificationCode } = req.body;
  
  const validTypes = ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'];
  
  if (!validTypes.includes(requestType)) {
    return res.status(400).json({ error: 'Invalid request type' });
  }

  // Log the request
  console.log(`[GDPR] ${requestType} request for ${email}`);

  // In production, process the request
  // 1. Verify user identity (send verification email)
  
  // 2. Process based on request type:
  // - access: Export all user data
  // - rectification: Allow user to update data
  // - erasure: Delete user data (right to be forgotten)
  // - portability: Export data in portable format
  // - restriction: Restrict processing
  // - objection: Stop processing for marketing

  res.json({
    success: true,
    message: `GDPR ${requestType} request received. We'll process within 30 days.`,
    requestId: `GDPR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  });
});

// Cookie consent endpoint
app.post('/api/cookie-consent', express.json(), (req, res) => {
  const { consent } = req.body;
  
  const consentRecord = {
    timestamp: new Date().toISOString(),
    consent: consent, // { necessary: true, analytics: true, marketing: false, preferences: true }
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };

  // Store consent record
  // In production, save to database with user session
  
  res.json({ success: true });
});

// PCI-DSS payment endpoint validation
app.post('/api/payment/validate', express.json(), (req, res) => {
  const { paymentMethod, amount, currency, cardData } = req.body;
  
  // PCI-DSS validation
  const errors = [];
  
  if (cardData) {
    // Validate card number (Luhn algorithm)
    if (!luhnCheck(cardData.number)) {
      errors.push('Invalid card number');
    }
    
    // Check expiry
    const now = new Date();
    const expMonth = parseInt(cardData.expiryMonth, 10);
    const expYear = parseInt(cardData.expiryYear, 10);
    if (expYear < new Date().getFullYear() || 
        (expYear === new Date().getFullYear() && expMonth < new Date().getMonth() + 1)) {
      errors.push('Card expired');
    }
    
    // CVV validation
    if (!/^\d{3,4}$/.test(cardData.cvv)) {
      errors.push('Invalid CVV');
    }
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ valid: false, errors });
  }
  
  res.json({ valid: true });
});

// Luhn algorithm for card validation
function luhnCheck(number) {
  let sum = 0;
  let isEven = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number.charAt(i), 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

// Security audit logging middleware
const securityAuditLog = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    };
    
    // Log security-relevant events
    if (res.statusCode >= 400 || req.path.includes('/auth/') || req.path.includes('/admin/')) {
      console.log('[SECURITY AUDIT]', JSON.stringify(logEntry));
    }
  });
  
  next();
};

module.exports = {
  app,
  securityAuditLog
};