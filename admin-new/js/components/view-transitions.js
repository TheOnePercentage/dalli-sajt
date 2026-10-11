import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

/**
 * View Transitions Utility - Page & Component Transitions
 * 
 * Provides utilities for View Transitions API with fallbacks.
 * Supports: page transitions, shared element transitions, component animations.
 * 
 * @example
 * // Setup global view transitions for SPA navigation
 * const vt = new ViewTransitions({
 *   defaultType: 'slide',
 *   fallback: true
 * });
 * vt.init();
 * 
 * // Animate page transition
 * await animatePageTransition(async () => {
 *   await navigateTo('/new-page');
 * }, { type: 'slide' });
 * 
 * // Shared element transition
 * document.querySelector('.card-image').style.viewTransitionName = 'card-image';
 * await navigateTo('/product/123');
 */

export class ViewTransitions extends Component {
  /**
   * @constructor
   * @param {Object} options
   * @param {string} options.defaultType - Default transition type: 'slide', 'fade', 'scale', 'none'
   * @param {boolean} options.fallback - Use fallback animations if VT API not supported
   * @param {boolean} options.debug - Enable debug logging
   * @param {Array} options.skipSelectors - Selectors to skip transitions
   */
  constructor(options = {}) {
    super(options);
    this.defaultType = options.defaultType || 'slide';
    this.fallback = options.fallback !== false;
    this.debug = options.debug === true;
    this.skipSelectors = options.skipSelectors || ['.vt-skip', '.no-transition', '[data-vt-skip]'];
    
    // State
    this.currentTransition = null;
    this.isTransitioning = false;
    this.supported = this._checkSupport();
    
    // Skip selectors regex
    this._skipRegex = new RegExp(this.skipSelectors.map(s => s.replace('.', '\\.')).join('|'));
  }

  /**
   * Check View Transitions API support
   */
  _checkSupport() {
    return typeof document.startViewTransition === 'function';
  }

  /**
   * Initialize view transitions
   */
  init() {
    if (!this.supported && !this.fallback) {
      this.log('View Transitions API not supported and fallback disabled');
      return;
    }

    this._setupGlobalStyles();
    this._setupNavigationHandling();
    this._setupAutoNames();
    
    this.emit('init', { supported: this.supported });
    this.log('View Transitions initialized', { supported: this.supported });
  }

  _setupGlobalStyles() {
    // Inject CSS custom properties for transitions
    const style = document.createElement('style');
    style.id = 'vt-global-styles';
    style.textContent = `
      /* Global view transition opt-in */
      @media (prefers-reduced-motion: no-preference) {
        ::view-transition-group(*),
        ::view-transition-image-pair(*),
        ::view-transition-old(*),
        ::view-transition-new(*) {
          animation-timing-function: var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
        }
      }

      /* Skip transitions for utility elements */
      .vt-skip,
      .vt-skip * {
        view-transition-name: none !important;
      }

      /* Fallback animations */
      @keyframes vt-fallback-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes vt-fallback-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }

      @keyframes vt-fallback-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes vt-fallback-slide-down {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(20px); }
      }

      @keyframes vt-fallback-slide-left {
        from { opacity: 0; transform: translateX(30px); }
        to { opacity: 1; transform: translateX(0); }
      }

      @keyframes vt-fallback-slide-right {
        from { opacity: 0; transform: translateX(-30px); }
        to { opacity: 1; transform: translateX(0); }
      }

      @keyframes vt-fallback-scale-up {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }

      @keyframes vt-fallback-scale-down {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.95); }
      }

      .vt-fallback-enter {
        animation: vt-fallback-fade-in var(--duration-smooth, 300ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1));
      }

      .vt-fallback-exit {
        animation: vt-fallback-fade-out var(--duration-smooth, 300ms) var(--ease-in);
      }

      .vt-fallback-enter.slide-up {
        animation: vt-fallback-slide-up var(--duration-smooth, 300ms) var(--ease-out);
      }

      .vt-fallback-exit.slide-down {
        animation: vt-fallback-slide-down var(--duration-smooth, 300ms) var(--ease-in);
      }

      .vt-fallback-enter.scale {
        animation: vt-fallback-scale-up var(--duration-smooth, 300ms) var(--ease-out);
      }

      .vt-fallback-exit.scale {
        animation: vt-fallback-scale-down var(--duration-smooth, 300ms) var(--ease-in);
      }
    `;
    document.head.appendChild(style);
  }

  _setupNavigationHandling() {
    // Handle navigation links with data-vt-type
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      // Skip external links
      if (link.host !== window.location.host) return;

      // Skip if modifier keys
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Skip if target=_blank
      if (link.target === '_blank') return;

      // Check for skip attribute
      if (link.hasAttribute('data-vt-skip') || link.closest('[data-vt-skip]')) return;

      // Get transition type from link
      const transitionType = link.dataset.vtType || this.defaultType;
      if (transitionType === 'none') return;

      // Prevent default and handle transition
      e.preventDefault();
      this.navigate(link.href, { type: transitionType });
    }, true);
  }

  _setupAutoNames() {
    // Auto-assign view-transition-name to elements with data-vt-name
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          
          // Auto-assign names to elements with data-vt-name
          const elements = node.querySelectorAll
            ? node.querySelectorAll('[data-vt-name]')
            : [];
          
          if (node.hasAttribute && node.hasAttribute('data-vt-name')) {
            elements.push(node);
          }

          elements.forEach(el => {
            const name = el.getAttribute('data-vt-name');
            if (name && !el.style.viewTransitionName) {
              el.style.viewTransitionName = name;
            }
          });

          // Auto-assign to images in cards
          const cardImages = node.querySelectorAll
            ? node.querySelectorAll('.card-image img, .product-image img, .avatar img')
            : [];
          cardImages.forEach((img, i) => {
            if (!img.style.viewTransitionName && img.src) {
              const name = `image-${img.src.split('/').pop().split('.')[0]}-${Math.random().toString(36).substr(2, 9)}`;
              img.style.viewTransitionName = name;
            }
          });
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });
    });

    // Initial pass
    document.querySelectorAll('[data-vt-name]').forEach(el => {
      el.style.viewTransitionName = el.getAttribute('data-vt-name');
    });
  }

  /**
   * Navigate with view transition
   * @param {string} url - Target URL
   * @param {Object} options
   * @param {string} options.type - Transition type: 'slide', 'fade', 'scale', 'none'
   * @param {string} options.direction - For slide: 'left', 'right', 'up', 'down'
   * @param {Function} options.onComplete - Callback after transition
   */
  async navigate(url, options = {}) {
    if (!this.supported && !this.fallback) {
      window.location.href = url;
      return;
    }

    const type = options.type || this.defaultType;
    const direction = options.direction || 'left';
    const onComplete = options.onComplete;

    if (!this.supported) {
      return this._fallbackNavigate(url, options);
    }

    // Store direction for CSS
    document.documentElement.dataset.vtDirection = options.direction || 'left';
    document.documentElement.dataset.vtType = options.type || 'slide';

    try {
      await document.startViewTransition(async () => {
        window.location.href = url;
      }).ready;
    } catch (error) {
      this.log('Navigation transition failed', error);
      window.location.href = url;
    }

    if (onComplete) onComplete();
  }

  _fallbackNavigate(url, options) {
    const type = options.type || 'fade';
    const duration = 300;

    // Add fallback class
    document.body.classList.add('vt-fallback-nav');
    document.body.classList.add(`vt-nav-${options.type || 'slide'}`);

    // Exit animation
    document.body.classList.add('vt-fallback-exit');
    document.body.classList.add(`vt-fallback-exit.${options.type || 'slide'}`);

    setTimeout(() => {
      window.location.href = url;
    }, 150);
  }

  /**
   * Animate page transition with custom callback
   * @param {Function} callback - Async function that performs the navigation
   * @param {Object} options - Transition options
   */
  static async animatePageTransition(callback, options = {}) {
    const type = options.type || 'slide';
    const direction = options.direction || 'left';

    if (typeof document.startViewTransition !== 'function') {
      // Fallback
      document.body.classList.add('vt-fallback-enter', `vt-fallback-enter.${type}`);
      try {
        await callback();
      } finally {
        document.body.classList.remove('vt-fallback-enter', `vt-fallback-enter.${type}`);
      }
      return;
    }

    document.documentElement.dataset.vtDirection = direction;
    document.documentElement.dataset.vtType = type;

    await document.startViewTransition(async () => {
      await callback();
    });
  }

  /**
   * Animate element with view transition
   * @param {HTMLElement} element - Element to animate
   * @param {string} transitionName - View transition name
   * @param {Function} callback - Function that makes the change
   */
  static async animateElement(element, transitionName, callback) {
    if (!element) return Promise.resolve();

    // Assign transition name
    const originalName = element.style.viewTransitionName;
    element.style.viewTransitionName = transitionName;

    if (typeof document.startViewTransition !== 'function') {
      // Fallback
      element.classList.add('vt-fallback-enter');
      try {
        await callback();
      } finally {
        element.classList.remove('vt-fallback-enter');
        element.style.viewTransitionName = originalName;
      }
      return;
    }

    try {
      await document.startViewTransition(async () => {
        await callback();
      });
    } finally {
      element.style.viewTransitionName = originalName;
    }
  }

  /**
   * Animate shared element transition
   * @param {HTMLElement} fromElement - Source element
   * @param {HTMLElement} toElement - Target element
   * @param {Function} callback - Navigation callback
   */
  static async animateSharedElement(fromElement, toElement, callback) {
    if (!fromElement || !toElement) return callback();

    const transitionName = `shared-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const originalFrom = fromElement.style.viewTransitionName;
    const originalTo = toElement.style.viewTransitionName;
    
    fromElement.style.viewTransitionName = transitionName;
    toElement.style.viewTransitionName = transitionName;

    try {
      if (typeof document.startViewTransition === 'function') {
        await document.startViewTransition(callback);
      } else {
        fromElement.classList.add('vt-fallback-enter');
        toElement.classList.add('vt-fallback-enter');
        await callback();
      }
    } finally {
      fromElement.style.viewTransitionName = originalFrom;
      toElement.style.viewTransitionName = originalTo;
    }
  }

  /**
   * Animate shared element by selector
   * @param {string} fromSelector - Selector for source element
   * @param {string} toSelector - Selector for target element
   * @param {Function} callback - Navigation callback
   */
  static async animateSharedElementBySelector(fromSelector, toSelector, callback) {
    const fromEl = document.querySelector(fromSelector);
    const toEl = document.querySelector(toSelector);
    return this.animateSharedElement(fromEl, toEl, callback);
  }

  /**
   * Add view-transition-name to element
   */
  static setTransitionName(element, name) {
    if (element) {
      element.style.viewTransitionName = name;
    }
  }

  /**
   * Remove view-transition-name from element
   */
  static clearTransitionName(element) {
    if (element) {
      element.style.viewTransitionName = 'none';
    }
  }

  /**
   * Skip transition for element
   */
  static skipTransition(element) {
    if (element) {
      element.classList.add('vt-skip');
    }
  }

  /**
   * Enable/disable transitions globally
   */
  static setEnabled(enabled) {
    document.documentElement.style.setProperty('--vt-enabled', enabled ? '1' : '0');
  }

  /**
   * Check if View Transitions API is supported
   */
  static isSupported() {
    return typeof document.startViewTransition === 'function';
  }

  /**
   * Get supported transition types
   */
  static getSupportedTypes() {
    return ['slide', 'fade', 'scale', 'none'];
  }

  destroy() {
    // Remove global styles
    const style = document.getElementById('vt-global-styles');
    if (style) style.remove();
    
    super.destroy();
  }
}

/**
 * Convenience function for page navigation with transition
 */
export async function animatePageTransition(callback, options = {}) {
  return ViewTransitions.animatePageTransition(callback, options);
}

/**
 * Animate shared element transition
 */
export async function animateSharedElement(fromElement, toElement, callback) {
  return ViewTransitions.animateSharedElement(fromElement, toElement, callback);
}

/**
 * Animate shared element by selector
 */
export async function animateSharedElementBySelector(fromSelector, toSelector, callback) {
  return ViewTransitions.animateSharedElementBySelector(fromSelector, toSelector, callback);
}

/**
 * Set view transition name on element
 */
export function setTransitionName(element, name) {
  ViewTransitions.setTransitionName(element, name);
}

/**
 * Clear transition name
 */
export function clearTransitionName(element) {
  ViewTransitions.clearTransitionName(element);
}

/**
 * Skip transition for element
 */
export function skipTransition(element) {
  ViewTransitions.skipTransition(element);
}

export default ViewTransitions;