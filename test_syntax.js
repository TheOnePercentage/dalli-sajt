const code = `const FeaturedTabs = (() => {
  let tabsContainer = null;
  let tabs = [];
  let panels = [];
  let activeTab = 'favorites';
  let reducedMotion = false;
  let config = null;

  const TAB_CONFIG = {
  };
})();`;

new Function(code);
console.log('OK');