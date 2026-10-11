import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

/**
 * Pull to Refresh Component - Mobile List Refresh
 * 
 * Adds pull-to-refresh functionality to any scrollable container.
 * Supports custom refresh handlers, loading states, and accessibility.
 * 
 * @extends Component
 * @example
 * const ptr = new PullToRefresh({
 *   container: document.querySelector('.orders-list'),
 *   onRefresh: async () => { await loadOrders(); },
 *   threshold: 80,
 *   maxPull: 120
 * });
 * ptr.init();
 */
export class PullToRefresh extends Component {
  /**
   * @constructor
   * @param {Object} options
   * @param {HTMLElement|string} options.container - Scroll container element or selector
   * @param {Function} options.onRefresh - Async refresh handler
   * @param {number} options.threshold - Pull distance to trigger refresh (px)
   * @param {number} options.maxPull - Maximum pull distance (px)
   * @param {number} options.minPullToRefresh - Minimum pull to trigger refresh
   * @param {string} options.loadingText - Loading text
   * @param {string} options.pullText - Pull to refresh text
   * @param {string} options.releaseText - Release to refresh text
   * @param {string} options.refreshingText - Refreshing text
   * @param {string} options.completeText - Complete text
   * @param {Function} options.onPull - Pull progress callback
   * @param {Function} options.onRefreshStart - Refresh start callback
   * @param {Function} options.onRefreshComplete - Refresh complete callback
   * @param {boolean} options.enabled - Enable/disable PTR
   */
  constructor(options = {}) {
    super(options);
    this.container = typeof options.container === 'string' 
      ? document.querySelector(options.container) 
      : options.container;
    this.onRefresh = options.onRefresh;
    this.threshold = options.threshold || 80;
    this.maxPull = options.maxPull || 120;
    this.minPullToRefresh = options.minPullToRefresh || 60;
    this.loadingText = options.loadingText || 'Osvježavanje...';
    this.pullText = options.pullText || 'Vuci za osvežavanje';
    this.releaseText = options.releaseText || 'Pusti za osvežavanje';
    this.refreshingText = options.refreshingText || 'Osvježavanje...';
    this.completeText = options.completeText || 'Osvježeno!';
    this.onPull = options.onPull;
    this.onRefreshStart = options.onRefreshStart;
    this.onRefreshComplete = options.onRefreshComplete;
    this.enabled = options.enabled !== false;
    
    // State
    this.isPulling = false;
    this.isRefreshing = false;
    this.pullDistance = 0;
    this.startY = 0;
    this.currentY = 0;
    this.scrollContainer = null;
    this.triggerElement = null;
    this.indicatorElement = null;
    this.contentElement = null;
    
    // Debounce
    this._touchStartHandler = this._onTouchStart.bind(this);
    this._touchMoveHandler = this._onTouchMove.bind(this);
    this._touchEndHandler = this._onTouchEnd.bind(this);
    this._scrollHandler = this._onScroll.bind(this);
  }

  /**
   * Initialize the pull-to-refresh
   */
  init() {
    if (!this.container) {
      console.warn('[PullToRefresh] Container not found');
      return;
    }

    // Find or create scroll container
    this._findScrollContainer();
    
    // Create trigger element
    this._createTriggerElement();
    
    // Bind events
    this._bindEvents();
    
    // Set initial state
    this._updateCSSVariables();
    
    this.emit('init');
  }

  _findScrollContainer() {
    // If container has overflow scroll, use it
    const style = getComputedStyle(this.container);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      this.scrollContainer = this.container;
    } else {
      // Find first scrollable parent
      let parent = this.container.parentElement;
      while (parent && parent !== document.body) {
        const style = getComputedStyle(parent);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          this.scrollContainer = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }
    
    // Fallback to window
    if (!this.scrollContainer) {
      this.scrollContainer = window;
    }
  }

  _createTriggerElement() {
    const triggerHTML = `
      <div class="pull-to-refresh__trigger" role="status" aria-live="polite" aria-hidden="true">
        <div class="pull-to-refresh__indicator">
          <svg class="pull-to-refresh__icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="pull-to-refresh__label" data-ref="label">Vuci za osvežavanje</span>
          <div class="pull-to-refresh__progress" aria-hidden="true">
            <div class="pull-to-refresh__progress-bar"></div>
          </div>
          <div class="pull-to-refresh__complete" aria-hidden="true">
            <svg class="pull-to-refresh__complete-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>
      </div>
    `;

    // Insert trigger at the top of the scroll container
    if (this.scrollContainer === window) {
      document.body.insertAdjacentHTML('afterbegin', `<div class="pull-to-refresh-global">${triggerHTML}</div>`);
      this.triggerElement = document.querySelector('.pull-to-refresh-global .pull-to-refresh__trigger');
      this.contentElement = document.body;
    } else {
      this.scrollContainer.insertAdjacentHTML('afterbegin', triggerHTML);
      this.triggerElement = this.scrollContainer.querySelector('.pull-to-refresh__trigger');
      this.contentElement = this.scrollContainer;
    }

    // Add class to scroll container
    this.scrollContainer.classList.add('pull-to-refresh', 'ptr-scroll-container');
    
    // Get references
    this.indicatorElement = this.triggerElement.querySelector('.pull-to-refresh__indicator');
    this.labelElement = this.triggerElement.querySelector('[data-ref="label"]');
  }

  _bindEvents() {
    if (!this.scrollContainer || this.scrollContainer === window) {
      // Window-level touch events
      document.addEventListener('touchstart', this._touchStartHandler, { passive: true });
      document.addEventListener('touchmove', this._touchMoveHandler, { passive: false });
      document.addEventListener('touchend', this._touchEndHandler, { passive: true });
      document.addEventListener('touchcancel', this._touchEndHandler, { passive: true });
    } else {
      // Container-level touch events
      this.scrollContainer.addEventListener('touchstart', this._touchStartHandler, { passive: true });
      this.scrollContainer.addEventListener('touchmove', this._touchMoveHandler, { passive: false });
      this.scrollContainer.addEventListener('touchend', this._touchEndHandler, { passive: true });
      this.scrollContainer.addEventListener('touchcancel', this._touchEndHandler, { passive: true });
    }

    // Scroll event for threshold detection
    this.scrollContainer.addEventListener('scroll', this._scrollHandler, { passive: true });

    // Resize handler
    window.addEventListener('resize', () => this._updateCSSVariables(), { passive: true });
  }

  _onTouchStart(e) {
    if (!this.enabled || this.isRefreshing) return;
    
    // Only start pull if at top of scroll
    const scrollTop = this.scrollContainer === window 
      ? window.scrollY 
      : this.scrollContainer.scrollTop;
    
    if (scrollTop > 0) return;

    this.isPulling = true;
    this.startY = e.touches[0].clientY;
    this.currentY = this.startY;
    
    this.scrollContainer.classList.add('pulling');
    this._updateCSSVariables();
  }

  _onTouchMove(e) {
    if (!this.isPulling || this.isRefreshing) return;

    this.currentY = e.touches[0].clientY;
    const deltaY = this.currentY - this.startY;

    // Only pull down
    if (deltaY <= 0) {
      this._resetPull();
      return;
    }

    // Calculate pull distance with resistance
    const pullDistance = Math.min(deltaY * 0.5, this.maxPull);
    this.pullDistance = pullDistance;

    // Update CSS variable for transform
    this.scrollContainer.style.setProperty('--pull-distance', `${pullDistance}px`);
    this._updateCSSVariables();

    // Update indicator text based on pull distance
    if (this.labelElement) {
      if (pullDistance >= this.threshold) {
        this.labelElement.textContent = this.releaseText;
      } else {
        this.labelElement.textContent = this.pullText;
      }
    }

    // Update progress bar
    this._updateProgressBar(pullDistance / this.threshold);

    // Callback
    if (this.onPull) {
      this.onPull(pullDistance / this.threshold);
    }
  }

  _onTouchEnd(e) {
    if (!this.isPulling || this.isRefreshing) return;

    const wasPulling = this.isPulling;
    this.isPulling = false;
    this.scrollContainer.classList.remove('pulling');

    if (this.pullDistance >= this.threshold && !this.isRefreshing) {
      // Trigger refresh
      this._triggerRefresh();
    } else {
      // Animate back
      this._animateBack();
    }

    this.pullDistance = 0;
    this._updateCSSVariables();
  }

  _onScroll(e) {
    // Update pull distance based on scroll if needed
    if (this.isRefreshing) return;
    
    const scrollTop = this.scrollContainer === window 
      ? window.scrollY 
      : this.scrollContainer.scrollTop;
    
    if (scrollTop > 0 && this.isPulling) {
      this._resetPull();
    }
  }

  _resetPull() {
    this.isPulling = false;
    this.pullDistance = 0;
    this.scrollContainer.classList.remove('pulling');
    this._updateCSSVariables();
  }

  _animateBack() {
    this.scrollContainer.style.setProperty('--pull-distance', '0px');
    this._updateCSSVariables();
    
    // Animate label back
    if (this.labelElement) {
      this.labelElement.textContent = this.pullText;
    }
  }

  _triggerRefresh() {
    if (this.isRefreshing || !this.onRefresh) return;

    this.isRefreshing = true;
    this.scrollContainer.classList.add('refreshing');
    this.scrollContainer.classList.remove('pulling');
    
    // Update UI
    if (this.labelElement) {
      this.labelElement.textContent = this.refreshingText;
    }
    this._updateCSSVariables();

    // Scroll to show refresh indicator
    this._scrollToRefresh();

    // Callbacks
    if (this.onRefreshStart) {
      this.onRefreshStart();
    }
    this.emit('refresh:start');

    // Execute refresh
    Promise.resolve(this.onRefresh())
      .then(() => this._onRefreshSuccess())
      .catch((error) => this._onRefreshError(error));
  }

  _scrollToRefresh() {
    const targetScroll = this.threshold;
    const currentScroll = this.scrollContainer === window 
      ? window.scrollY 
      : this.scrollContainer.scrollTop;

    if (this.scrollContainer === window) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  _onRefreshSuccess() {
    this.scrollContainer.classList.remove('refreshing');
    this.scrollContainer.classList.add('complete');

    if (this.labelElement) {
      this.labelElement.textContent = this.completeText;
    }
    this._updateCSSVariables();

    if (this.onRefreshComplete) {
      this.onRefreshComplete(true);
    }
    this.emit('refresh:complete', { success: true });

    // Hide after delay
    setTimeout(() => {
      this._hideIndicator();
    }, 1000);
  }

  _onRefreshError(error) {
    this.scrollContainer.classList.remove('refreshing');
    this.scrollContainer.classList.remove('pulling');
    
    this.scrollContainer.classList.add('complete');
    
    if (this.labelElement) {
      this.labelElement.textContent = 'Greška prilikom osvežavanja';
    }
    this._updateCSSVariables();

    if (this.onRefreshComplete) {
      this.onRefreshComplete(false, error);
    }
    this.emit('refresh:complete', { success: false, error });

    // Hide after delay
    setTimeout(() => {
      this._hideIndicator();
    }, 2000);
  }

  _hideIndicator() {
    this.scrollContainer.classList.remove('complete', 'refreshing', 'pulling');
    this.pullDistance = 0;
    this._updateCSSVariables();
    
    // Reset label
    if (this.labelElement) {
      this.labelElement.textContent = this.pullText;
    }
  }

  _updateProgressBar(ratio) {
    const progressBar = this.triggerElement?.querySelector('.pull-to-refresh__progress-bar');
    if (progressBar) {
      progressBar.style.transform = `scaleX(${Math.min(ratio, 1)})`;
    }
  }

  _updateCSSVariables() {
    if (this.scrollContainer) {
      this.scrollContainer.style.setProperty('--pull-distance', `${this.pullDistance}px`);
      this.scrollContainer.style.setProperty('--pull-threshold', `${this.threshold}px`);
      this.scrollContainer.style.setProperty('--pull-max', `${this.maxPull}px`);
    }
  }

  /**
   * Programmatically trigger refresh
   */
  async refresh() {
    if (this.isRefreshing) return;
    await this._triggerRefresh();
  }

  /**
   * Enable/disable pull to refresh
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this._resetPull();
      this.scrollContainer?.classList.remove('pulling', 'refreshing', 'complete');
    }
  }

  /**
   * Check if currently refreshing
   */
  isLoading() {
    return this.isRefreshing;
  }

  /**
   * Set custom texts
   */
  setTexts(texts) {
    if (texts.pullText) this.pullText = texts.pullText;
    if (texts.releaseText) this.releaseText = texts.releaseText;
    if (texts.refreshingText) this.refreshingText = texts.refreshingText;
    if (texts.completeText) this.completeText = texts.completeText;
    if (texts.loadingText) this.loadingText = texts.loadingText;
    
    if (this.labelElement && !this.isPulling && !this.isRefreshing) {
      this.labelElement.textContent = this.pullText;
    }
  }

  /**
   * Set threshold
   */
  setThreshold(threshold) {
    this.threshold = Math.max(40, Math.min(threshold, this.maxPull - 20));
    this._updateCSSVariables();
  }

  /**
   * Destroy
   */
  destroy() {
    // Remove events
    if (this.scrollContainer === window) {
      document.removeEventListener('touchstart', this._touchStartHandler);
      document.removeEventListener('touchmove', this._touchMoveHandler);
      document.removeEventListener('touchend', this._touchEndHandler);
      document.removeEventListener('touchcancel', this._touchEndHandler);
    } else {
      this.scrollContainer.removeEventListener('touchstart', this._touchStartHandler);
      this.scrollContainer.removeEventListener('touchmove', this._touchMoveHandler);
      this.scrollContainer.removeEventListener('touchend', this._touchEndHandler);
      this.scrollContainer.removeEventListener('touchcancel', this._touchEndHandler);
    }
    
    this.scrollContainer.removeEventListener('scroll', this._scrollHandler);
    window.removeEventListener('resize', this._updateCSSVariables);

    // Remove trigger element
    if (this.triggerElement) {
      const parent = this.triggerElement.parentElement;
      if (parent?.classList.contains('pull-to-refresh-global')) {
        parent.remove();
      } else {
        this.triggerElement.remove();
      }
    }

    // Remove classes
    this.scrollContainer?.classList.remove('pull-to-refresh', 'ptr-scroll-container', 'pulling', 'refreshing', 'complete');
    this.scrollContainer?.style.removeProperty('--pull-distance');
    this.scrollContainer?.style.removeProperty('--pull-threshold');
    this.scrollContainer?.style.removeProperty('--pull-max');

    super.destroy();
  }
}

/**
 * Auto-initialize pull-to-refresh on elements with data-ptr attribute
 */
export function initPullToRefresh(selector = '[data-ptr]', options = {}) {
  const elements = document.querySelectorAll(selector);
  const instances = [];

  elements.forEach(element => {
    const options = {
      container: element,
      onRefresh: async () => {
        // Default: reload page or emit event
        window.dispatchEvent(new CustomEvent('ptr:refresh', { 
          detail: { element } 
        }));
        // Wait a bit for demo
        await new Promise(resolve => setTimeout(resolve, 1000));
      },
      ...options
    };

    const ptr = new PullToRefresh(options);
    ptr.init();
    instances.push(ptr);
  });

  return instances;
}

/**
 * Create PTR for a list container
 */
export function createPullToRefreshForList(container, onRefresh, options = {}) {
  const ptr = new PullToRefresh({
    container,
    onRefresh,
    threshold: 80,
    maxPull: 120,
    ...options
  });
  ptr.init();
  return ptr;
}

export default PullToRefresh;