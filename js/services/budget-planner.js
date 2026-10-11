/**
 * Budget Planner - Phase 22
 * Architecture only
 */

export const BUDGET_CATEGORIES = [
  'marketing', 'inventory', 'operations', 'payroll', 'expansion', 'custom'
];

export function createBudget(category, allocated) {
  return {
    category,
    allocated: allocated || 0,
    spent: 0,
    remaining: allocated || 0,
    customCategories: []
  };
}

export function calculateBudgetUtilization(budget) {
  if (!budget.allocated || budget.allocated === 0) return 0;
  return Math.round((budget.spent / budget.allocated) * 100);
}
