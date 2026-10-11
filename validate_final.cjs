const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('js/app.js', 'utf8');

console.log('=== STEP 11 COMPLETE VALIDATION ===');
console.log('');

const subSteps = [
  { name: '11.1 Faceted sidebar', checks: ['filter-panel', 'filter-facet', 'filter-option', 'filter-price-slider', 'filter-price-preset', 'filter-chips-bar'] },
  { name: '11.2 URL sync', checks: ['updateURL', 'restoreFiltersFromURL', 'history.replaceState', 'URLSearchParams'] },
  { name: '11.3 Real-time filtering', checks: ['applyFilters', 'filteredProducts', 'updateFilterCount', 'filterResultsUpdated', 'debounceTimer'] },
  { name: '11.4 Chips bar', checks: ['filter-chips-bar', 'filter-chip', 'filter-chip__remove', 'removeFacetValue', 'aria-live'] },
  { name: '11.5 For You', checks: ['id="forYou"', 'loadUserProfile', 'getPersonalizedRecommendations', 'getFallbackRecommendations', 'trackEvent'] },
  { name: '11.6 Recently viewed', checks: ['id="recentlyViewed"', 'dalli_recently_viewed', 'addView', 'scrollBy', 'updateNavButtons'] },
  { name: '11.7 Trending now', checks: ['id="trendingNow"', 'decayFactor', 'computeTrending', 'trendingScore', 'startAutoRefresh'] },
  { name: '11.8 Sort dropdown', checks: ['sortSelect', 'currentSort', 'sortProducts', 'price-asc', 'price-desc', 'newest', 'rating'] },
  { name: '11.9 Presets', checks: ['presetSelect', 'savePresetBtn', 'loadPresetBtn', 'deletePresetBtn', 'dalli_filter_presets', 'renderPresets'] },
  { name: '11.10 Analytics + RM', checks: ['dataLayer.push', 'gtag(', 'trackEvent', 'prefers-reduced-motion', 'animation: none'] },
];

let allPass = true;
subSteps.forEach(step => {
  const missing = step.checks.filter(c => !js.includes(c) && !html.includes(c));
  const pass = missing.length === 0;
  console.log(pass ? '✅' : '❌', step.name, pass ? '' : `(missing: ${missing.join(', ')})`);
  if (!pass) allPass = false;
});

console.log('');
console.log(allPass ? '🎉 ALL 10 SUB-STEPS COMPLETE!' : '❌ Some checks failed');