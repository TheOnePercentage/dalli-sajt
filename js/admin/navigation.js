/**
 * NavigationController - Routing, tabs, history, multi-tab sync for admin panel
 * Handles tab switching, browser history, role-based tab filtering, deep linking
 */
(function() {
  'use strict';

  function getEventBus() {
    return window.AdminEventBus;
  }

  function getStore() {
    return window.AdminStore;
  }

  function getAuth() {
    return window.AuthManager;
  }

  function emit(event, data) {
    const bus = getEventBus();
    if (bus) bus.emit(event, data);
  }

  const DEFAULT_TAB = 'orders';
  const TAB_PARAM = 'tab';

  class NavigationController {
    constructor() {
      this._initialized = false;
      this._currentTab = DEFAULT_TAB;
      this._role = 'employee';
      this._historyHandler = this._onHistoryChange.bind(this);
      this._storageHandler = this._onStorageChange.bind(this);
      this._tabElements = new Map(); // tabName -> { button, panel }
    }

    init() {
      if (this._initialized) return;

      this._role = window.AuthManager ? window.AuthManager.getRole() : 'employee';
      this._scanTabs();
      this._setupEventListeners();
      this._restoreFromHistory();
      this._startStorageSync();

      this._initialized = true;
    }

    // Scan DOM for tab buttons and panels
    _scanTabs() {
      this._tabElements.clear();
      
      document.querySelectorAll('.admin-tab').forEach(btn => {
        const tabName = btn.dataset.tab;
        if (tabName) {
          const panel = document.getElementById(`tab-${tabName}`);
          this._tabElements.set(tabName, { button: btn, panel });
        }
      });

      // Also scan dropdown tabs
      document.querySelectorAll('[data-dropdown-tab]').forEach(btn => {
        const tabName = btn.dataset.dropdownTab;
        if (tabName && !this._tabElements.has(tabName)) {
          const panel = document.getElementById(`tab-${tabName}`);
          this._tabElements.set(tabName, { button: btn, panel });
        }
      });
    }

    // Setup event listeners
    _setupEventListeners() {
      // Tab button clicks
      this._tabElements.forEach(({ button, panel }, tabName) => {
        if (button) {
          button.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchTab(tabName);
          });
        }
      });

      // Browser history changes
      window.addEventListener('popstate', this._historyHandler);

      // Cross-tab sync via localStorage
      window.addEventListener('storage', this._storageHandler);

      // Auth role changes
      const bus = window.AdminEventBus;
      if (bus) {
        bus.on('auth:login', ({ role }) => this._onRoleChange(role));
        bus.on('auth:logout', () => this._onRoleChange('employee'));
        bus.on('auth:roleChanged', ({ role }) => this._onRoleChange(role));
      }
    }

    // Start cross-tab sync via localStorage
    _startStorageSync() {
      window.addEventListener('storage', this._storageHandler);
    }

    // Restore tab from URL hash or localStorage
    _restoreFromHistory() {
      // 1. Check URL hash
      const hash = window.location.hash.slice(1);
      if (hash && this._tabElements.has(hash)) {
        this._switchTabInternal(hash, false);
        return;
      }

      // 2. Check URL search param
      const params = new URLSearchParams(window.location.search);
      const paramTab = params.get(TAB_PARAM);
      if (paramTab && this._tabElements.has(paramTab)) {
        this._switchTabInternal(paramTab, false);
        return;
      }

      // 3. Check localStorage
      const savedTab = localStorage.getItem('admin_active_tab');
      if (savedTab && this._tabElements.has(savedTab)) {
        this._switchTabInternal(savedTab, false);
        return;
      }

      // 4. Default tab based on role
      const auth = window.AuthManager;
      if (auth) {
        const role = auth.getRole();
        const allowed = auth.getAllowedTabs(role);
        const defaultTab = allowed.includes(DEFAULT_TAB) ? DEFAULT_TAB : (allowed[0] || DEFAULT_TAB);
        this._switchTabInternal(defaultTab, false);
      } else {
        this._switchTabInternal(DEFAULT_TAB, false);
      }
    }

    // Switch to a tab
    switchTab(tabName, pushState = true) {
      if (!this._tabElements.has(tabName)) {
        console.warn(`Tab "${tabName}" not found`);
        return false;
      }

      // Check if tab is allowed for current role
      const auth = window.AuthManager;
      if (auth && !auth.getAllowedTabs(auth.getRole()).includes(tabName)) {
        console.warn(`Tab "${tabName}" not allowed for current role`);
        return false;
      }

      this._switchTabInternal(tabName, pushState);
      return true;
    }

    // Internal tab switch logic
    _switchTabInternal(tabName, pushState) {
      if (tabName === this._currentTab) return;

      const previousTab = this._currentTab;
      this._currentTab = tabName;

      // Update URL
      if (pushState) {
        const url = new URL(window.location.href);
        url.hash = tabName;
        url.searchParams.set(TAB_PARAM, tabName);
        window.history.pushState({ tab: tabName }, '', url);
      }

      // Update localStorage for cross-tab sync
      localStorage.setItem('admin_active_tab', tabName);

      // Deactivate all tabs
      this._tabElements.forEach(({ button, panel }) => {
        if (button) {
          button.classList.remove('active');
          button.setAttribute('aria-selected', 'false');
        }
        if (panel) {
          panel.classList.remove('active');
          panel.hidden = true;
        }
      });

      // Activate new tab
      const { button, panel } = this._tabElements.get(tabName);
      if (button) {
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
      }
      if (panel) {
        panel.classList.add('active');
        panel.hidden = false;
      }

      // Update store
      const store = window.AdminStore;
      if (store) {
        store.setActiveTab(tabName);
      }

      // Emit events
      emit('nav:tabChanged', { tab: tabName, previousTab });
      emit('nav:routeChanged', { tab: tabName });

      // Scroll to top of panel
      if (panel) {
        panel.scrollTop = 0;
      }
    }

    // Get current active tab
    getCurrentTab() {
      return this._currentTab;
    }

    // Get all available tabs for current role
    getAvailableTabs() {
      const auth = window.AuthManager;
      if (!auth) return Array.from(this._tabElements.keys());
      return auth.getAllowedTabs(auth.getRole());
    }

    // Check if tab is accessible
    canAccessTab(tabName) {
      const auth = window.AuthManager;
      if (!auth) return true;
      return auth.getAllowedTabs(auth.getRole()).includes(tabName);
    }

    // Role changed - re-evaluate tabs
    _onRoleChange(role) {
      this._role = role;
      
      // Re-scan tabs (some may have been hidden)
      this._scanTabs();

      // If current tab not allowed, switch to first allowed
      const auth = window.AuthManager;
      const allowed = auth ? auth.getAllowedTabs(role) : Array.from(this._tabElements.keys());
      
      if (!allowed.includes(this._currentTab)) {
        const fallback = allowed[0] || DEFAULT_TAB;
        this._switchTabInternal(fallback, true);
      }

      // Update tab visibility
      this._updateTabVisibility(allowed);
    }

    // Update tab button visibility based on role
    _updateTabVisibility(allowedTabs) {
      this._tabElements.forEach(({ button }, tabName) => {
        if (button) {
          button.style.display = allowedTabs.includes(tabName) ? '' : 'none';
        }
      });
    }

    // History change handler (browser back/forward)
    _onHistoryChange(e) {
      const state = e.state;
      if (state && state.tab && this._tabElements.has(state.tab)) {
        this._switchTabInternal(state.tab, false);
      } else {
        // Fallback to hash
        const hash = window.location.hash.slice(1);
        if (hash && this._tabElements.has(hash)) {
          this._switchTabInternal(hash, false);
        }
      }
    }

    // Cross-tab storage sync
    _onStorageChange(e) {
      if (e.key === 'admin_active_tab' && e.newValue) {
        const tab = e.newValue;
        if (this._tabElements.has(tab) && tab !== this._currentTab) {
          this._switchTabInternal(tab, false);
        }
      }
    }

    // Navigate to tab programmatically (alias)
    goTo(tabName) {
      return this.switchTab(tabName);
    }

    // Replace current history entry (no back button)
    replaceTab(tabName) {
      if (!this._tabElements.has(tabName)) return false;
      
      const url = new URL(window.location.href);
      url.hash = tabName;
      url.searchParams.set(TAB_PARAM, tabName);
      window.history.replaceState({ tab: tabName }, '', url);
      
      localStorage.setItem('admin_active_tab', tabName);
      this._switchTabInternal(tabName, false);
      return true;
    }

    // Get tab info
    getTabInfo(tabName) {
      return this._tabElements.get(tabName) || null;
    }

    // Refresh tab elements (after dynamic content load)
    refresh() {
      this._scanTabs();
    }

    // Cleanup
    destroy() {
      window.removeEventListener('popstate', this._historyHandler);
      window.removeEventListener('storage', this._storageHandler);
      this._tabElements.clear();
      this._initialized = false;
    }
  }

  // Export singleton
  window.NavigationController = new NavigationController();
})();
