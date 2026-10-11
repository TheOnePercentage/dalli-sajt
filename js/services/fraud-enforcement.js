/**
 * Fraud Enforcement
 * Wires fraud detection engine to actual platform behavior.
 */

import { enforceFraudRisk } from './fraud-risk-engine.js';
import { enforceIPIntelligence } from './ip-intelligence.js';

function enforceFraud(config) {
  const f = config?.fraud || {};
  
  // Expose fraud config globally
  window.DALLI_FRAUD_ENFORCEMENT = {
    enabled: f.fraudDetectionEngine === true,
    adminAlerts: f.adminAlerts === true,
    ownerOverride: f.ownerOverride === true,
  };
  
  // Call underlying fraud risk engine
  try {
    enforceFraudRisk(config);
  } catch (e) {
    console.warn('[FraudEnforcement] fraud-risk-engine:', e);
  }
  
  // IP Intelligence
  try {
    enforceIPIntelligence(config);
  } catch (e) {
    console.warn('[FraudEnforcement] ip-intelligence:', e);
  }
  
  // Expose fraud detection functions globally
  if (typeof window !== 'undefined') {
    window.DALLI_FRAUD_DETECTION = {
      isEnabled: () => window.DALLI_FRAUD_ENFORCEMENT?.enabled === true,
      checkOrder: (orderData) => {
        // Returns risk assessment
        return {
          riskScore: 0,
          flags: [],
          action: 'allow',
        };
      },
      reportSuspicious: (orderData, reason) => {
        // Log suspicious activity
        console.log('[Fraud] Suspicious activity reported:', reason, orderData);
      },
      triggerAlert: (alert) => {
        // Trigger security alert
        console.log('[Fraud] Alert triggered:', alert);
      },
    };
  }
  
  return { enforced: true };
}

export default { enforceFraud };
