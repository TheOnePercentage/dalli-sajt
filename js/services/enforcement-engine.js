/**
 * DALLI Enforcement Engine
 * Central wiring: Experience Center toggles → actual platform behavior
 * Called when experience config changes; applies all enforcement rules.
 */

import { experienceStore } from '../experience/experience-store.js';
import { enforceApiGovernance } from './api-governance.js';
import { enforceRBAC } from './rbac-enforcement.js';
import { enforceFraud } from './fraud-enforcement.js';
import { enforceBackup } from './backup-enforcement.js';
import { enforceQR } from './qr-enforcement.js';
import { enforceEC } from './ec-enforcement.js';
import { enforceFraudRisk } from './fraud-risk-engine.js';
import { enforceIPIntelligence } from './ip-intelligence.js';
import { enforceBackupCenter } from './backup-center.js';
import { enforceDisasterRecovery } from './disaster-recovery.js';
import { enforceZeroTrust } from './zero-trust-permissions.js';
import { enforceSecurityDashboard } from './security-dashboard.js';
import { enforceOrderProtection } from './order-protection.js';
import { enforceCourierSecurity } from './courier-security.js';
import { enforceCompliance } from './compliance-readiness.js';
import { enforceSecurityAlerts } from './security-alert-system.js';
import { enforceCustomerPrivacy } from './customer-privacy.js';
import { enforceWarehouseRestriction } from './warehouse-restriction.js';
import { enforceAPIKeySystem } from './api-governance.js';

let initialized = false;
let lastConfig = null;

function getConfig() {
  return experienceStore.getState();
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function hasChanged(a, b, path) {
  const aVal = a ? path.split('.').reduce((o, k) => o?.[k], a) : undefined;
  const bVal = b ? path.split('.').reduce((o, k) => o?.[k], b) : undefined;
  return !deepEqual(aVal, bVal);
}

function enforcePayments(config) {
  const p = config.payments || {};
  // cryptoShippingPaid affects checkout shipping calculation
  // This flag is consumed by checkout logic
  window.DALLI_PAYMENTS_ENFORCEMENT = {
    cryptoShippingPaid: p.cryptoShippingPaid !== false,
    store: p.store || {},
    productOverrides: p.productOverrides || {},
  };
}

function enforcePaymentIncentives(config) {
  const pi = config.paymentIncentives || {};
  window.DALLI_PAYMENT_INCENTIVES = {
    global: pi.global || {},
    countryOverrides: pi.countryOverrides || {},
    collectionOverrides: pi.collectionOverrides || {},
    productOverrides: pi.productOverrides || {},
  };
}

function enforceMaintenance(config) {
  const m = config.maintenance || {};
  window.DALLI_MAINTENANCE = {
    enabled: m.enabled === true,
    message: m.message || '',
    countdownEnabled: m.countdownEnabled === true,
    targetAt: m.targetAt || null,
    allowAdminBypass: m.allowAdminBypass !== false,
  };
}

function enforceLuxury(config) {
  const l = config.luxury || {};
  window.DALLI_LUXURY = {
    enabled: l.enabled === true,
    emphasis: l.emphasis || 'elegance',
    reducePromotions: l.reducePromotions === true,
    editorialLayout: l.editorialLayout === true,
  };
}

function enforceEditorial(config) {
  const e = config.editorial || {};
  window.DALLI_EDITORIAL = {
    enabled: e.enabled === true,
    reducePromotions: e.reducePromotions === true,
    largerStorySections: e.largerStorySections === true,
    moreBrandContent: e.moreBrandContent === true,
    moreCollectionPresentation: e.moreCollectionPresentation === true,
    hideSaleBadges: e.hideSaleBadges === true,
    showEditorialNote: e.showEditorialNote === true,
  };
}

function enforceMaintenanceMode(config) {
  const ops = config.operations || {};
  window.DALLI_OPERATIONS = {
    holiday: ops.holiday || { enabled: false },
    notices: ops.notices || [],
    orderPause: ops.orderPause || { enabled: false },
    shippingPause: ops.shippingPause || { enabled: false },
  };
}

function enforcePaymentsCrypto(config) {
  const p = config.payments || {};
  window.DALLI_CRYPTO_PAYMENTS = {
    cryptoEnabled: config.payments?.store?.crypto === true,
    cryptoShippingPaid: p.cryptoShippingPaid !== false,
    productOverrides: p.productOverrides || {},
  };
}

function enforcePaymentIncentivesCrypto(config) {
  const pi = config.paymentIncentives || {};
  window.DALLI_CRYPTO_INCENTIVES = {
    globalEnabled: pi.global?.cryptoEnabled === true,
    discountEnabled: pi.global?.cryptoDiscountEnabled === true,
    discountType: pi.global?.discountType || 'percentage',
    discountValue: pi.global?.discountValue || 15,
    customMessage: pi.global?.customMessage || '15% popust kripto',
    customMessageEn: pi.global?.customMessageEn || '15% crypto discount',
    appliesTo: pi.global?.appliesTo || 'subtotal',
  };
}

function enforceGlobalExpansion(config) {
  const g = config.global || {};
  window.DALLI_GLOBAL = {
    enabled: g.enabled === true,
    countryActivation: g.countryActivation === true,
    regionalPricing: g.regionalPricing === true,
    regionalSEO: g.regionalSEO === true,
    regionalCollections: g.regionalCollections === true,
    multiCurrency: g.multiCurrency === true,
    regionalPersonalization: g.regionalPersonalization === true,
    countries: g.countries || {},
    currencies: g.currencies || {},
    languages: g.languages || {},
    shipping: g.shipping || {},
    payments: g.payments || {},
    seo: g.seo || {},
    analytics: g.analytics || {},
  };
}

function enforceConcierge(config) {
  const c = config.concierge || {};
  window.DALLI_CONCIERGE = {
    enabled: c.enabled === true,
    conciergeCenterEnabled: c.conciergeCenterEnabled === true,
    personalShopperEnabled: c.personalShopperEnabled === true,
    styleIntelligenceEnabled: c.styleIntelligenceEnabled === true,
    vipExperiencesEnabled: c.vipExperiencesEnabled === true,
    clientelingEngineEnabled: c.clientelingEngineEnabled === true,
  };
}

function enforceExecutive(config) {
  const ex = config.executive || {};
  window.DALLI_EXECUTIVE = {
    enabled: ex.enabled === true,
    executiveIntelligenceEnabled: ex.executiveIntelligenceEnabled === true,
    businessInsightsEnabled: ex.businessInsightsEnabled === true,
    forecastingEnabled: ex.forecastingEnabled === true,
    automaticReportsEnabled: ex.automaticReportsEnabled === true,
    alertsEnabled: ex.alertsEnabled === true,
  };
}

function enforceOmnichannel(config) {
  const o = config.omnichannel || {};
  window.DALLI_OMNICHANNEL = {
    omnichannelEngine: o.omnichannelEngine === true,
    storeIntegration: o.storeIntegration === true,
    socialCommerce: o.socialCommerce === true,
    warehouseNetwork: o.warehouseNetwork === true,
    customer360: o.customer360 === true,
  };
}

function enforceAPI(config) {
  const a = config.api || {};
  window.DALLI_API = {
    apiEcosystem: a.apiEcosystem === true,
    applicationManager: a.applicationManager === true,
    marketIntelligenceApi: a.marketIntelligenceApi === true,
    keys: a.keys || {},
  };
}

function enforceEmployee(config) {
  const e = config.employee || {};
  window.DALLI_EMPLOYEE = {
    attendanceSystem: e.attendanceSystem === true,
    dynamicQrAttendance: e.dynamicQrAttendance === true,
    employeeAppReadiness: e.employeeAppReadiness === true,
  };
}

function enforceFraudConfig(config) {
  const f = config.fraud || {};
  window.DALLI_FRAUD = {
    fraudDetectionEngine: f.fraudDetectionEngine === true,
    adminAlerts: f.adminAlerts === true,
    ownerOverride: f.ownerOverride === true,
  };
}

function enforceAI(config) {
  const ai = config.ai || {};
  window.DALLI_AI = {
    global: ai.global || {},
    collections: ai.collections || {},
    products: ai.products || {},
  };
}

function enforceCommunity(config) {
  const c = config.community || {};
  window.DALLI_COMMUNITY = {
    reviews: c.reviews || {},
    photoReviews: c.photoReviews || {},
    videoReviews: c.videoReviews || {},
    gallery: c.gallery || {},
    qna: c.qna || {},
    moderation: c.moderation || {},
  };
}

function enforceTrust(config) {
  const t = config.trust || {};
  window.DALLI_TRUST = {
    enabled: t.enabled === true,
    blocks: t.blocks || {},
  };
}

function enforceJournal(config) {
  const j = config.journal || {};
  window.DALLI_JOURNAL = {
    enabled: j.enabled === true,
    categories: j.categories || {},
    showEditorialNote: j.showEditorialNote === true,
  };
}

function enforceCraftsmanship(config) {
  const c = config.craftsmanship || {};
  window.DALLI_CRAFTSMANSHIP = {
    enabled: c.enabled === true,
    sections: c.sections || {},
  };
}

function enforceMaterials(config) {
  const m = config.materials || {};
  window.DALLI_MATERIALS = {
    enabled: m.enabled === true,
    visible: m.visible || [],
  };
}

function enforceVideo(config) {
  const v = config.video || {};
  window.DALLI_VIDEO = {
    enabled: v.enabled === true,
    lazyLoad: v.lazyLoad === true,
    preload: v.preload || 'none',
    maxConcurrent: v.maxConcurrent || 1,
    videos: v.videos || {},
  };
}

function enforceOutfits(config) {
  const o = config.outfits || {};
  window.DALLI_OUTFITS = {
    enabled: o.enabled === true,
    lookRecommendations: o.lookRecommendations === true,
    styleRecommendations: o.styleRecommendations === true,
    luxuryStylingMode: o.luxuryStylingMode === true,
    completeTheLook: o.completeTheLook === true,
    lookOfTheWeek: o.lookOfTheWeek === true,
  };
}

function enforceMembership(config) {
  const m = config.membership || {};
  window.DALLI_MEMBERSHIP = {
    enabled: m.enabled === true,
    earlyAccessEngine: m.earlyAccessEngine === true,
    exclusiveCollections: m.exclusiveCollections === true,
    vipDashboard: m.vipDashboard === true,
    privateClientProgram: m.privateClientProgram === true,
    invitationSystem: m.invitationSystem === true,
    limitedEditionEngine: m.limitedEditionEngine === true,
    tierRules: m.tierRules || {},
    releaseRules: m.releaseRules || {},
    visibility: m.visibility || {},
  };
}

function enforceImmersive(config) {
  const i = config.immersive || {};
  window.DALLI_IMMERSIVE = {
    enabled: i.enabled === true,
    worlds: i.worlds || {},
    collectionWorlds: i.collectionWorlds === true,
    signatureMoments: i.signatureMoments === true,
    editorialExperience: i.editorialExperience === true,
    luxuryJourneySystem: i.luxuryJourneySystem === true,
    cinematicCollections: i.cinematicCollections === true,
    microInteractions: i.microInteractions === true,
    presentationRules: i.presentationRules || {},
    soundArchitecture: i.soundArchitecture || {},
  };
}

function enforceDomains(config) {
  const d = config.domains || {};
  window.DALLI_DOMAINS = {
    primary: d.primary || { domain: 'dalli.rs', language: 'sr', currency: 'RSD' },
    list: d.list || [],
  };
}

function enforceAssets(config) {
  const a = config.assets || {};
  window.DALLI_ASSETS = {
    library: a.library || [],
    positions: a.positions || {},
  };
}

function enforceBrandIdentity(config) {
  const b = config.brandIdentity || {};
  window.DALLI_BRAND_IDENTITY = {
    brandName: b.brandName || 'DALLI',
    companyName: b.companyName || '',
    businessInfo: b.businessInfo || '',
    primaryDomain: b.primaryDomain || 'dalli.rs',
    secondaryDomains: b.secondaryDomains || [],
    phones: b.phones || [],
    emails: b.emails || [],
    address: b.address || {},
    contactInfo: b.contactInfo || '',
  };
}

function enforceAssetsPositions(config) {
  const a = config.assets || {};
  window.DALLI_ASSET_POSITIONS = a.positions || {};
}

function enforceCommunication(config) {
  const c = config.communication || {};
  window.DALLI_COMMUNICATION = {
    emails: c.emails || [],
    phones: c.phones || [],
  };
}

function enforceSocial(config) {
  const s = config.social || {};
  window.DALLI_SOCIAL = {
    accounts: s.accounts || [],
    platforms: s.platforms || [],
    scopes: s.scopes || [],
  };
}

function enforceIntegrations(config) {
  const i = config.integrations || {};
  window.DALLI_INTEGRATIONS = {
    social: i.social || {},
    ads: i.ads || {},
  };
}

function enforceOperations(config) {
  const o = config.operations || {};
  window.DALLI_OPERATIONS = {
    holiday: o.holiday || { enabled: false },
    notices: o.notices || [],
    orderPause: o.orderPause || { enabled: false },
    shippingPause: o.shippingPause || { enabled: false },
  };
}

function enforceStores(config) {
  const s = config.stores || [];
  window.DALLI_STORES = s;
}

function enforceWarehouses(config) {
  const w = config.warehouses || [];
  window.DALLI_WAREHOUSES = w;
}

function enforceShipping(config) {
  const s = config.shipping || {};
  window.DALLI_SHIPPING = {
    couriers: s.couriers || {},
    zonesEnabled: s.zonesEnabled === true,
    tracking: s.tracking || {},
  };
}

function enforcePermissions(config) {
  const p = config.permissions || {};
  window.DALLI_PERMISSIONS = p.policy || {};
}

function enforceTheme(config) {
  const activeId = config.activeThemeId || 'default';
  const theme = config.themes?.[activeId];
  window.DALLI_ACTIVE_THEME = theme || null;
}

function enforceAll(config) {
  enforcePayments(config);
  enforcePaymentIncentives(config);
  enforceMaintenance(config);
  enforceLuxury(config);
  enforceEditorial(config);
  enforceMaintenanceMode(config);
  enforcePaymentsCrypto(config);
  enforcePaymentIncentivesCrypto(config);
  enforceGlobalExpansion(config);
  enforceConcierge(config);
  enforceExecutive(config);
  enforceOmnichannel(config);
  enforceAPI(config);
  enforceEmployee(config);
  enforceFraudConfig(config);
  enforceAI(config);
  enforceCommunity(config);
  enforceTrust(config);
  enforceJournal(config);
  enforceCraftsmanship(config);
  enforceMaterials(config);
  enforceVideo(config);
  enforceOutfits(config);
  enforceMembership(config);
  enforceImmersive(config);
  enforceDomains(config);
  enforceAssets(config);
  enforceBrandIdentity(config);
  enforceAssetsPositions(config);
  enforceCommunication(config);
  enforceSocial(config);
  enforceIntegrations(config);
  enforceOperations(config);
  enforceStores(config);
  enforceWarehouses(config);
  enforceShipping(config);
  enforcePermissions(config);
  enforceTheme(config);

  // Call enforcement hooks from services
  try { enforceApiGovernance(config); } catch (e) { console.warn('[Enforcement] api-governance:', e); }
  try { enforceRBAC(config); } catch (e) { console.warn('[Enforcement] rbac:', e); }
  try { enforceFraud(config); } catch (e) { console.warn('[Enforcement] fraud:', e); }
  try { enforceBackup(config); } catch (e) { console.warn('[Enforcement] backup:', e); }
  try { enforceQR(config); } catch (e) { console.warn('[Enforcement] qr:', e); }
  try { enforceEC(config); } catch (e) { console.warn('[Enforcement] ec:', e); }
  try { enforceFraudRisk(config); } catch (e) { console.warn('[Enforcement] fraud-risk:', e); }
  try { enforceIPIntelligence(config); } catch (e) { console.warn('[Enforcement] ip-intelligence:', e); }
  try { enforceBackupCenter(config); } catch (e) { console.warn('[Enforcement] backup-center:', e); }
  try { enforceDisasterRecovery(config); } catch (e) { console.warn('[Enforcement] disaster-recovery:', e); }
  try { enforceZeroTrust(config); } catch (e) { console.warn('[Enforcement] zero-trust:', e); }
  try { enforceSecurityDashboard(config); } catch (e) { console.warn('[Enforcement] security-dashboard:', e); }
  try { enforceOrderProtection(config); } catch (e) { console.warn('[Enforcement] order-protection:', e); }
  try { enforceCourierSecurity(config); } catch (e) { console.warn('[Enforcement] courier-security:', e); }
  try { enforceCompliance(config); } catch (e) { console.warn('[Enforcement] compliance:', e); }
  try { enforceSecurityAlerts(config); } catch (e) { console.warn('[Enforcement] security-alerts:', e); }
  try { enforceCustomerPrivacy(config); } catch (e) { console.warn('[Enforcement] customer-privacy:', e); }
  try { enforceWarehouseRestriction(config); } catch (e) { console.warn('[Enforcement] warehouse-restriction:', e); }
  try { enforceAPIKeySystem(config); } catch (e) { console.warn('[Enforcement] api-keys:', e); }
}

export function initEnforcementEngine() {
  if (typeof window === 'undefined') return;
  
  // Initial enforcement
  const config = experienceStore.getState();
  lastConfig = experienceStore.getState();
  enforceAll(lastConfig);
  
  // Subscribe to changes
  experienceStore.subscribe(({ path, value, state }) => {
    if (!lastConfig) {
      lastConfig = state;
      return;
    }
    
    // Check what changed and re-enforce
    const pathsToCheck = [
      'payments', 'paymentIncentives', 'maintenance', 'luxury', 'editorial',
      'operations', 'global', 'concierge', 'executive', 'omnichannel',
      'api', 'employee', 'fraud', 'ai', 'community', 'trust', 'journal',
      'craftsmanship', 'materials', 'video', 'outfits', 'membership',
      'immersive', 'domains', 'assets', 'brandIdentity', 'communication',
      'social', 'integrations', 'operations', 'stores', 'warehouses',
      'shipping', 'permissions', 'themes', 'hero', 'collections', 'hero',
      'brandIdentity', 'assets', 'communication', 'social', 'integrations',
      'stores', 'warehouses', 'shipping', 'permissions', 'themes',
      'hero', 'collections', 'paymentIncentives', 'maintenance', 'luxury',
      'editorial', 'global', 'concierge', 'executive', 'omnichannel',
      'api', 'employee', 'fraud', 'ai', 'community', 'trust', 'journal',
      'craftsmanship', 'materials', 'video', 'outfits', 'membership',
      'immersive', 'domains', 'assets', 'brandIdentity', 'communication',
      'social', 'integrations', 'stores', 'warehouses', 'shipping',
      'permissions', 'payments', 'paymentIncentives', 'maintenance',
      'luxury', 'editorial', 'omnichannel', 'api', 'employee', 'fraud',
    ];
    
    for (const p of pathsToCheck) {
      if (hasChanged(lastConfig, state, p)) {
        enforceAll(state);
        break;
      }
    }
    lastConfig = state;
  });
  
  initialized = true;
  console.log('[EnforcementEngine] Initialized - all EC toggles now wired to platform behavior');
}

export function forceReEnforce() {
  const config = experienceStore.getState();
  enforceAll(config);
}

export default { initEnforcementEngine, forceReEnforce };
