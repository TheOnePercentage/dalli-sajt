/**
 * Business Health Engine - Phase 22
 * Architecture only
 */

export function calculateBusinessHealth(components = {}) {
  return {
    revenueHealth: components.revenue || 0,
    inventoryHealth: components.inventory || 0,
    membershipHealth: components.membership || 0,
    growthHealth: components.growth || 0,
    operationalHealth: components.operational || 0,
    overallScore: Math.round(
      (components.revenue || 0) * 0.25 +
      (components.inventory || 0) * 0.2 +
      (components.membership || 0) * 0.15 +
      (components.growth || 0) * 0.2 +
      (components.operational || 0) * 0.2
    )
  };
}

export function getHealthStatus(score = 0) {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}
