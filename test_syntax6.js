const code = `const FeaturedTabs = (() => {
  let tabsContainer = null;
  let tabs = [];
  let panels = [];
  let activeTab = 'favorites';
  let reducedMotion = false;
  let config = null;

  const TAB_CONFIG = {
    favorites: { label: 'Naši Favoriti', panelId: 'panel-favorites' },
    bestsellers: { label: 'Bestsellery', panelId: 'panel-bestsellers' },
    new: { label: 'Novo u Ponudi', panelId: 'panel-new' }
  };

  const init = async () => {
    tabsContainer = $('#featuredTabs');
    if (!tabsContainer) return;

    tabs = $$('.tab-btn', tabsContainer);
    panels = $$('.tab-panel', document);
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Load dynamic config for tab settings
    await loadConfig();
  };

  // Reduced motion listener
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', (e) => {
    reducedMotion = e.matches;
  });

  return { init, activateTab, getActiveTab: () => activeTab };
})();

// Initialize FeaturedTabs on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', FeaturedTabs.init);
} else {
  FeaturedTabs.init();
}

// Export
window.FeaturedTabs = FeaturedTabs;`;

new Function(code);
console.log('OK');