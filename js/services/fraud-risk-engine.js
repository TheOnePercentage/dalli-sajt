/**
 * Fraud & Risk Engine - Phase 25
 */
export function detectFraud(order, history=[]) {
  const alerts = [];
  if (history.filter(h => h.ip === order.ip).length > 5) alerts.push({type:'velocity', severity:'high'});
  return {alerts, riskScore: alerts.length * 20};
}
