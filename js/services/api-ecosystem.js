/**
 * API Ecosystem - Phase 25
 */
export const API_TYPES = ['employee_app','warehouse_api','partner_api','analytics_api','customer_app','mobile_app','market_intelligence_api','future'];
export function generateApiKey() { return 'dalli_' + Math.random().toString(36).substr(2, 32); }
