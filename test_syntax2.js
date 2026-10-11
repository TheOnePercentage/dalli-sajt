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
})();`;

new Function(code);
console.log('OK');