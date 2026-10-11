import { $, $$, on } from '../core/dom.js';
import { emit, DOM_EVENTS } from '../core/events.js';

const TAB_CONFIG = {
  favorites: { label: 'Naši Favoriti', panelId: 'panel-favorites' },
  bestsellers: { label: 'Bestsellery', panelId: 'panel-bestsellers' },
  new: { label: 'Novo u Ponudi', panelId: 'panel-new' }
};

let tabsContainer = null;
let tabs = [];
let panels = [];
let activeTab = 'favorites';
let reducedMotion = false;
let config = null;

const loadConfig = async () => {
  try {
    const response = await fetch('/data/featured-config.json', { credentials: 'same-origin' });
    if (response.ok) {
      config = await response.json();
    }
  } catch (e) {
    console.warn('[FeaturedTabs] Config load failed:', e);
  }
};

const getTabFromURL = () => {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  return tab && TAB_CONFIG[tab] ? tab : null;
};

const updateURL = (tabId, push = true) => {
  const url = new URL(window.location);
  url.searchParams.set('tab', tabId);
  if (push) {
    window.history.pushState({ tab: tabId }, '', url);
  } else {
    window.history.replaceState({ tab: tabId }, '', url);
  }
};

const staggerRevealCards = (panel) => {
  if (reducedMotion) {
    $$('.product-card', panel).forEach(card => card.classList.add('product-card--revealed'));
    return;
  }

  const cards = $$('.product-card:not(.product-card--revealed)', panel);
  cards.forEach((card, index) => {
    card.style.animationDelay = `${(config?.settings?.staggerDelay || 50) * index}ms`;
    card.classList.add('animate-reveal');
    setTimeout(() => card.classList.add('product-card--revealed'),
      (config?.settings?.staggerDelay || 50) * index + 400);
  });
};

const trackTabSwitch = (fromTab, toTab) => {
  const payload = {
    event: 'featured_tab_switch',
    from_tab: fromTab,
    to_tab: toTab,
    from_label: TAB_CONFIG[fromTab]?.label,
    to_label: TAB_CONFIG[toTab]?.label,
    section: 'featured_products',
    device: window.innerWidth < 768 ? 'mobile' : 'desktop',
    timestamp: Date.now()
  };

  if (window.dataLayer) window.dataLayer.push(payload);
  if (window.gtag) window.gtag('event', 'featured_tab_switch', payload);
  console.log('[FeaturedTabs] Track:', payload);
};

const activateTab = (tabId, pushHistory = true) => {
  if (!TAB_CONFIG[tabId]) return false;

  const previousTab = activeTab;
  activeTab = tabId;

  tabs.forEach(btn => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
    btn.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  panels.forEach(panel => {
    const isActive = panel.id === TAB_CONFIG[tabId].panelId;
    if (isActive) {
      panel.hidden = false;
      panel.offsetHeight;
      requestAnimationFrame(() => {
        panel.classList.add('active');
      });
    } else {
      panel.classList.remove('active');
      if (!reducedMotion) {
        setTimeout(() => {
          if (!panel.classList.contains('active')) panel.hidden = true;
        }, 300);
      } else {
        panel.hidden = true;
      }
    }
  });

  updateURL(tabId, pushHistory);

  if (previousTab !== tabId) {
    trackTabSwitch(previousTab, tabId);
  }

  const activePanel = $(`#${TAB_CONFIG[tabId].panelId}`);
  if (activePanel) {
    staggerRevealCards(activePanel);
  }

  return true;
};

const initTabListeners = () => {
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      activateTab(btn.dataset.tab, true);
    });
  });
};

const initKeyboardNav = () => {
  if (!tabsContainer) return;
  tabsContainer.addEventListener('keydown', (e) => {
    const focusedBtn = tabsContainer.querySelector('.tab-btn:focus, .tab-btn[aria-selected="true"]');
    if (!focusedBtn) return;

    const currentIndex = tabs.findIndex(btn => btn === focusedBtn);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = tabs.length - 1;
        break;
    }

    if (nextIndex !== currentIndex) {
      tabs[nextIndex].focus();
      activateTab(tabs[nextIndex].dataset.tab, true);
    }
  });
};

const initHashListener = () => {
  window.addEventListener('popstate', (e) => {
    const tab = getTabFromURL();
    if (tab && tab !== activeTab) {
      activateTab(tab, false);
    }
  });
};

const init = async () => {
  tabsContainer = $('#featuredTabs');
  if (!tabsContainer) return;

  tabs = $$('.tab-btn', tabsContainer);
  panels = $$('.tab-panel', document);
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  await loadConfig();

  activeTab = getTabFromURL() || 'favorites';
  activateTab(activeTab, false);

  initTabListeners();
  initKeyboardNav();
  initHashListener();

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', (e) => {
    reducedMotion = e.matches;
  });

  console.log('[FeaturedTabs] Initialized', { activeTab, tabs: tabs.length });
};

const getActiveTab = () => activeTab;

if (typeof window !== 'undefined') {
  window.DALLI_FeaturedTabs = { init, activateTab, getActiveTab };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init, activateTab, getActiveTab };