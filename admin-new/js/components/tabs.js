import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

/**
 * Tabs Component - Luxury Tabs with Hash-based Navigation
 * Matches the HTML/CSS structure in admin.html and luxury-tabs.css
 * 
 * Features:
 * - Hash-based routing (auto-updates URL)
 * - Keyboard navigation (arrows, home, end)
 * - ARIA compliance (role="tablist", role="tab", role="tabpanel")
 * - Smooth animations with gold indicator
 * - Badge support on tabs
 * - Lazy panel loading
 * - Responsive scrolling
 * 
 * @extends Component
 * @example
 * const tabs = new Tabs({
 *   container: '#tabs',
 *   tabs: [
 *     { id: 'dashboard', label: 'Dashboard', icon: '<svg>...', panel: 'dashboard' },
 *     { id: 'orders', label: 'Porudžbine', icon: '<svg>...', panel: 'orders' }
 *   ],
 *   activeTab: 'dashboard',
 *   onChange: (tabId) => navigateTo(tabId)
 * });
 * 
 * // Or auto-initialize from existing HTML
 * const tabs = new Tabs({ container: '.tabs.luxury' });
 * tabs.initFromDOM();
 */
export class Tabs extends Component {
  /**
   * @constructor
   * @param {Object} options
   * @param {string|HTMLElement} options.container - Container selector or element
   * @param {Array} options.tabs - Tab definitions (for programmatic creation)
   * @param {string} options.activeTab - Initially active tab ID
   * @param {Function} options.onChange - Callback when tab changes
   * @param {boolean} options.hashRouting - Enable hash-based routing
   * @param {boolean} options.lazyLoad - Lazy load panel content
   * @param {string} options.container - Container selector (for DOM init)
   */
  constructor(options = {}) {
    super(options);
    this.tabs = options.tabs || [];
    this.activeTab = options.activeTab || null;
    this.onChange = options.onChange;
    this.hashRouting = options.hashRouting !== false;
    this.lazyLoad = options.lazyLoad !== false;
    this.container = options.container || '.tabs.luxury';
    this.id = options.id || ImperiumUtils.generateId('tabs-');
    this._initialized = false;
    this._panelsLoaded = new Set();
  }

  render() {
    if (this.tabs.length > 0) {
      return this._renderFromConfig();
    }
    // If no tabs config, assume DOM is already rendered
    return '';
  }

  _renderFromConfig() {
    const tabsHtml = this.tabs.map((tab, index) => `
      <button class="tab ${index === 0 ? 'active' : ''}" 
              role="tab" 
              aria-selected="${index === 0}" 
              aria-controls="tab-${ImperiumUtils.escapeHtml(tab.id)}" 
              data-tab="${ImperiumUtils.escapeHtml(tab.id)}"
              id="${ImperiumUtils.escapeHtml(tab.id)}-tab"
              tabindex="${index === 0 ? '0' : '-1'}">
        ${tab.icon ? `<svg class="tab-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${tab.icon}</svg>` : ''}
        <span>${ImperiumUtils.escapeHtml(tab.label)}</span>
        ${tab.badge ? `<span class="tab-badge">${ImperiumUtils.escapeHtml(tab.badge)}</span>` : ''}
      </button>
    `).join('');

    const panelsHtml = this.tabs.map((tab, index) => `
      <div class="admin-tab-panel ${index === 0 ? 'active' : ''}" 
           id="tab-${ImperiumUtils.escapeHtml(tab.id)}" 
           role="tabpanel" 
           aria-labelledby="${ImperiumUtils.escapeHtml(tab.id)}-tab" 
           data-panel="${ImperiumUtils.escapeHtml(tab.id)}"
           ${index > 0 && this.lazyLoad ? 'style="display: none;"' : ''}>
        <section class="${ImperiumUtils.escapeHtml(tab.id)}-section" data-panel="${ImperiumUtils.escapeHtml(tab.id)}">
          ${this.lazyLoad && index > 0 ? '<div class="skeleton-loader"></div>' : ''}
        </section>
      </div>
    `).join('');

    return `
      <nav class="tabs luxury" role="tablist" aria-label="Admin paneli" id="${this.id}">
        <div class="tabs-list">${tabsHtml}</div>
      </nav>
      <div class="tab-panels" data-ref="panels">${panelsHtml}</div>
    `;
  }

  mount(container) {
    super.mount(container);
    if (!this._initialized) {
      this.initFromDOM();
      this._initialized = true;
    }
  }

  /**
   * Initialize tabs from existing DOM (for server-rendered HTML)
   */
  initFromDOM() {
    this.element = typeof this.container === 'string' 
      ? document.querySelector(this.container) 
      : this.container;

    if (!this.element) {
      console.warn('[Tabs] Container not found:', this.container);
      return;
    }

    this._tabs = this.element.querySelector('.tabs-list');
    this._panels = this.element.parentElement?.querySelector('.tab-panels') || 
                   document.querySelector('.tab-panels');

    if (!this._tabs) {
      console.warn('[Tabs] No .tabs-list found in container');
      return;
    }

    this._tabButtons = Array.from(this._tabs.querySelectorAll('.tab'));
    this._panels = this._panels || this.element.parentElement?.querySelector('.tab-panels');

    // Find active tab from DOM
    const activeButton = this._tabButtons.find(btn => btn.classList.contains('active')) || this._tabButtons[0];
    if (activeButton) {
      this.activeTab = activeButton.dataset.tab;
    }

    this._bindDOMEvents();
    this._syncPanels();
    this._setupHashRouting();
    this._setupKeyboardNavigation();

    this.emit('ready', { activeTab: this.activeTab });
  }

  _bindDOMEvents() {
    this._tabButtons.forEach(btn => {
      this.on('click', btn, (e) => {
        e.preventDefault();
        const tabId = e.currentTarget.dataset.tab;
        this.activateTab(tabId, true);
      });
    });
  }

  _syncPanels() {
    if (!this._panels) return;

    const panels = this._panels.querySelectorAll('.admin-tab-panel');
    panels.forEach(panel => {
      const panelId = panel.dataset.panel || panel.id.replace('tab-', '');
      const isActive = panelId === this.activeTab;
      
      panel.classList.toggle('active', isActive);
      panel.setAttribute('aria-hidden', !isActive);
      
      if (isActive && !this._panelsLoaded.has(panelId) && this.lazyLoad) {
        this._loadPanel(panelId, panel);
      }
    });
  }

  _setupHashRouting() {
    if (!this.hashRouting) return;

    // Handle hash changes
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1);
      if (hash && this._hasTab(hash)) {
        this.activateTab(hash, false);
      }
    });

    // Set initial hash if not set
    if (!window.location.hash && this.activeTab) {
      window.location.hash = this.activeTab;
    }
  }

  _setupKeyboardNavigation() {
    this.on('keydown', '.tab', (e) => {
      const tabs = this._tabButtons;
      const currentIndex = tabs.findIndex(btn => btn.dataset.tab === this.activeTab);
      
      let newIndex = currentIndex;
      
      switch (e.key) {
        case 'ArrowRight':
          newIndex = (currentIndex + 1) % this._tabButtons.length;
          e.preventDefault();
          break;
        case 'ArrowLeft':
          newIndex = (currentIndex - 1 + this._tabButtons.length) % this._tabButtons.length;
          e.preventDefault();
          break;
        case 'Home':
          newIndex = 0;
          e.preventDefault();
          break;
        case 'End':
          newIndex = this._tabButtons.length - 1;
          e.preventDefault();
          break;
        default:
          return;
      }
      
      const newTab = this._tabButtons[newIndex];
      if (newTab) {
        newTab.focus();
        this.activateTab(newTab.dataset.tab, true);
      }
    });
  }

  _hasTab(tabId) {
    return this._tabButtons.some(btn => btn.dataset.tab === tabId);
  }

  activateTab(tabId, updateHistory = true) {
    if (!this._hasTab(tabId)) return false;
    if (this.activeTab === tabId) return false;

    const prevTab = this.activeTab;
    this.activeTab = tabId;

    // Update buttons
    this._tabButtons.forEach(btn => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    // Update panels
    if (this._panels) {
      const panels = this._panels.querySelectorAll('.admin-tab-panel');
      panels.forEach(panel => {
        const isActive = panel.dataset.panel === tabId || panel.id === `tab-${tabId}`;
        panel.classList.toggle('active', isActive);
        panel.setAttribute('aria-hidden', !isActive);
        
        if (isActive && !this._panelsLoaded.has(panelId) && this.lazyLoad) {
          const panelId = panel.dataset.panel || panel.id.replace('tab-', '');
          this._loadPanel(panelId, panel);
        }
      });
    }

    // Update URL hash
    if (this.hashRouting && updateHistory) {
      window.location.hash = tabId;
    }

    // Update focus
    const activeBtn = this._tabs?.querySelector(`[data-tab="${tabId}"]`);
    activeBtn?.focus();

    // Emit change event
    this.emit('change', { tabId, previousTab: prevTab });
    
    if (this.onChange) {
      this.onChange(tabId, prevTab);
    }

    return true;
  }

  _loadPanel(panelId, panel) {
    this._panelsLoaded.add(panelId);
    this.emit('panel-load', { panelId, panel });
    
    // Remove skeleton if present
    const skeleton = panel.querySelector('.skeleton-loader');
    skeleton?.remove();
    
    this.emit('panel-loaded', { panelId, panel });
  }

  /**
   * Programmatically activate a tab
   * @param {string} tabId - Tab ID to activate
   * @param {boolean} updateHistory - Whether to update browser history
   * @returns {boolean} Success
   */
  activateTab(tabId, updateHistory = true) {
    return this.activateTab(tabId, updateHistory);
  }

  /**
   * Add a new tab dynamically
   * @param {Object} tab - Tab config { id, label, icon, badge, panel }
   * @param {number} index - Insert position (default: end)
   */
  addTab(tab, index = this.tabs.length) {
    if (this._hasTab(tab.id)) return false;
    
    this.tabs.splice(index, 0, tab);
    
    if (this._tabs) {
      const button = this.createElement(this._createTabButton(tab));
      if (index >= this._tabButtons.length) {
        this._tabs.appendChild(button);
      } else {
        this._tabs.insertBefore(button, this._tabButtons[index]);
      }
      
      this._tabButtons.splice(index, 0, button);
      this._bindDOMEvents(); // Rebind
    }
    
    // Add panel
    if (this._panels) {
      const panel = this.createElement(`
        <div class="admin-tab-panel" id="tab-${tab.id}" role="tabpanel" aria-labelledby="${tab.id}-tab" data-panel="${tab.id}" style="display: none;">
          <section class="${tab.id}-section" data-panel="${tab.id}"></section>
        </div>
      `);
      this._panels.appendChild(panel);
    }
    
    this.tabs.splice(index, 0, tab);
    return true;
  }

  /**
   * Remove a tab
   * @param {string} tabId - Tab ID to remove
   */
  removeTab(tabId) {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return false;
    
    this.tabs.splice(index, 1);
    
    if (this._tabs) {
      const btn = this._tabs.querySelector(`[data-tab="${tabId}"]`);
      btn?.remove();
      this._tabButtons = Array.from(this._tabs.querySelectorAll('.tab'));
    }
    
    const panel = document.getElementById(`tab-${tabId}`);
    panel?.remove();
    
    this.tabs.splice(index, 1);
    this._panelsLoaded.delete(tabId);
    
    // If active tab was removed, activate first tab
    if (this.activeTab === tabId && this.tabs.length > 0) {
      this.activateTab(this.tabs[0].id);
    }
    
    return true;
  }

  /**
   * Update tab badge
   * @param {string} tabId - Tab ID
   * @param {string|number} badge - Badge content
   */
  setBadge(tabId, badge) {
    const btn = this._tabs?.querySelector(`[data-tab="${tabId}"]`);
    if (!btn) return;
    
    let badgeEl = btn.querySelector('.tab-badge');
    if (badge) {
      if (!badgeEl) {
        badgeEl = document.createElement('span');
        badgeEl.className = 'tab-badge';
        btn.appendChild(badgeEl);
      }
      badgeEl.textContent = badge;
    } else if (badgeEl) {
      badgeEl.remove();
    }
  }

  /**
   * Initialize tabs from configuration array
   * @param {Array} tabs - Array of tab configs
   */
  setTabs(tabs) {
    this.tabs = tabs;
    if (this.element) {
      this.element.innerHTML = this.render();
      this.initFromDOM();
    }
  }

  /**
   * Get current active tab ID
   */
  getActiveTab() {
    return this.activeTab;
  }

  /**
   * Get all tab IDs
   */
  getTabs() {
    return this._tabButtons.map(btn => btn.dataset.tab);
  }

  // ========== Cleanup ==========
  
  destroy() {
    // Remove event listeners
    this._tabButtons?.forEach(btn => {
      btn.removeEventListener('click', this._clickHandler);
      btn.removeEventListener('keydown', this._keydownHandler);
    });
    
    window.removeEventListener('hashchange', this._hashChangeHandler);
    
    super.destroy();
  }
}

export function createTabs(options) {
  return new Tabs(options);
}

export function initTabsFromDOM(selector = '.tabs.luxury') {
  const tabs = new Tabs({ container: selector });
  tabs.initFromDOM();
  return tabs;
}

export default Tabs;