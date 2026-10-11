/**
 * Review Components Index
 * Exports all review-related web components
 */

export { default as ReviewWidget } from './ReviewWidget.js';
export { default as ReviewSummary } from './ReviewSummary.js';
export { default as ReviewForm } from './ReviewForm.js';

// Auto-register all components
if (typeof window !== 'undefined') {
  // Components auto-register via customElements.define
  console.log('[ReviewComponents] Loaded: ReviewWidget, ReviewSummary, ReviewForm');
}

export const ReviewComponents = {
  ReviewWidget,
  ReviewSummary,
  ReviewForm
};

export default {
  ReviewWidget,
  ReviewSummary,
  ReviewForm
};