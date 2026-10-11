/**
 * DALLI Utility & Layout Components
 * Mobile-first, accessible, SEO-optimized
 * Components: Divider, Spacer, VisuallyHidden, SkipLink, FocusTrap, Portal, AnchorPositioning, ScrollSnap, Sticky, Grid/Flex Utilities, ContainerQueryWrappers
 */

export class UtilityLayout {
  static init() {
    this.initDividers();
    this.initSpacers();
    this.initVisuallyHidden();
    this.initSkipLinks();
    this.initFocusTrap();
    this.initPortal();
    this.initAnchorPositioning();
    this.initScrollSnap();
    this.initSticky();
    this.initGridFlexUtilities();
    this.initContainerQueryWrappers();
  }

  // ============================================================
  // DIVIDER (Horizontal, Vertical, Gradient, With Content)
  // ============================================================
  static initDividers() {
    document.querySelectorAll('.divider').forEach(divider => {
      const orientation = divider.dataset.orientation || 'horizontal';
      const variant = divider.dataset.variant || 'solid'; // solid, dashed, dotted, gradient
      const color = divider.dataset.color;
      const content = divider.dataset.content;
      const align = divider.dataAlign || 'center';

      divider.style.display = 'flex';
      divider.style.alignItems = 'center';
      divider.style.gap = 'var(--space-4)';
      
      if (orientation === 'vertical') {
        divider.style.flexDirection = 'column';
        divider.style.height = '100%';
        divider.style.width = '1px';
      } else {
        divider.style.flexDirection = 'row';
        divider.style.width = '100%';
        divider.style.height = '1px';
      }

      // Variant styles
      if (variant === 'dashed') {
        divider.style.borderStyle = 'dashed';
      } else if (variant === 'dotted') {
        divider.style.borderStyle = 'dotted';
      } else if (variant === 'gradient') {
        divider.style.background = 'var(--gradient-primary)';
        divider.style.border = 'none';
      }

      if (color) {
        divider.style.backgroundColor = color;
        divider.style.borderColor = color;
      }

      // Content in middle
      if (content) {
        const contentEl = document.createElement('span');
        contentEl.className = 'divider__content';
        contentEl.textContent = content;
        contentEl.style.cssText = `
          padding: 0 var(--space-4);
          background: var(--color-bg);
          font-size: var(--fs-xs);
          font-weight: var(--fw-medium);
          color: var(--color-text-tertiary);
          white-space: nowrap;
        `;
        
        if (orientation === 'vertical') {
          contentEl.style.transform = 'rotate(-90deg)';
        }
        
        divider.appendChild(contentEl);
      }
    });
  }

  // ============================================================
  // SPACER (Responsive, Semantic)
  // ============================================================
  static initSpacers() {
    document.querySelectorAll('.spacer').forEach(spacer => {
      const size = spacer.dataset.size || 'md'; // xs, sm, md, lg, xl, 2xl, 3xl
      const responsive = spacer.dataset.responsive === 'true';

      const sizeMap = {
        xs: 'var(--space-1)',
        sm: 'var(--space-2)',
        md: 'var(--space-4)',
        lg: 'var(--space-6)',
        xl: 'var(--space-8)',
        '2xl': 'var(--space-10)',
        '3xl': 'var(--space-12)'
      };

      spacer.style.display = 'block';
      spacer.style.height = sizeMap[size] || sizeMap.md;
      spacer.style.width = '100%';

      if (responsive) {
        spacer.style.height = `clamp(${sizeMap.xs}, 2vw, ${sizeMap.xl})`;
      }
    });
  }

  // ============================================================
  // VISUALLY HIDDEN (Screen Reader Only)
  // ============================================================
  static initVisuallyHidden() {
    document.querySelectorAll('.visually-hidden, .sr-only').forEach(el => {
      el.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `;
    });

    // Focusable visually hidden (for skip links)
    document.querySelectorAll('.visually-hidden-focusable').forEach(el => {
      el.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `;
      
      el.addEventListener('focus', () => {
        el.style.cssText = `
          position: absolute !important;
          width: auto !important;
          height: auto !important;
          padding: var(--space-3) var(--space-4) !important;
          margin: 0 !important;
          overflow: visible !important;
          clip: auto !important;
          white-space: nowrap !important;
          border: none !important;
          background: var(--color-primary) !important;
          color: var(--color-text-inverse) !important;
          font-size: var(--fs-sm) !important;
          font-weight: var(--fw-semibold) !important;
          z-index: var(--z-toast) !important;
          top: var(--space-4) !important;
          left: var(--space-4) !important;
          border-radius: var(--radius-btn) !important;
        `;
      });
      
      el.addEventListener('blur', () => {
        el.style.cssText = `
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        `;
      });
    });
  }

  // ============================================================
  // SKIP LINKS (Accessibility)
  // ============================================================
  static initSkipLinks() {
    // Already handled in HTML, but can be enhanced
    document.querySelectorAll('.skip-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
          target.removeAttribute('tabindex');
        }
      });
    });
  }

  // ============================================================
  // FOCUS TRAP (Modals, Drawers, Dialogs)
  // ============================================================
  static initFocusTrap() {
    document.querySelectorAll('[data-focus-trap]').forEach(container => {
      const focusable = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      container.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      });

      // Auto-focus first element on open
      const observer = new MutationObserver(() => {
        if (container.classList.contains('open') || container.classList.contains('active')) {
          setTimeout(() => firstElement?.focus(), 50);
        }
      });
      observer.observe(container, { attributes: true, attributeFilter: ['class'] });
    });
  }

  // ============================================================
  // PORTAL (Render Content Anywhere in DOM)
  // ============================================================
  static initPortal() {
    // Portal root
    if (!document.getElementById('portal-root')) {
      const root = document.createElement('div');
      root.id = 'portal-root';
      document.body.appendChild(root);
    }

    // Portal component
    window.Portal = class Portal {
      constructor(content, options = {}) {
        this.container = document.createElement('div');
        this.container.className = 'portal';
        this.container.innerHTML = content;
        this.target = options.target || document.getElementById('portal-root');
      }

      mount() {
        this.target.appendChild(this.container);
        return this;
      }

      unmount() {
        this.container.remove();
      }

      update(content) {
        this.container.innerHTML = content;
      }
    };

    // Auto-mount portals
    document.querySelectorAll('[data-portal]').forEach(el => {
      const content = el.innerHTML;
      const target = el.dataset.portalTarget || 'portal-root';
      const portal = new window.Portal(el.innerHTML, { 
        target: document.getElementById(target) 
      });
      portal.mount();
      el.remove();
    });
  }

  // ============================================================
  // ANCHOR POSITIONING (Tooltips, Popovers, Dropdowns)
  // ============================================================
  static initAnchorPositioning() {
    // CSS Anchor Positioning polyfill for browsers without support
    if (!CSS.supports('anchor-name', '--my-anchor')) {
      // Polyfill for anchor positioning
      document.querySelectorAll('[data-anchor-target]').forEach(el => {
        const targetId = el.dataset.anchorTarget;
        const target = document.getElementById(targetId);
        if (!target) return;

        const position = el.dataset.anchorPosition || 'bottom';
        const offset = parseInt(el.dataset.anchorOffset || '8', 10);

        const updatePosition = () => {
          const rect = target.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          
          let top, left;
          switch (el.dataset.anchorPosition) {
            case 'top':
              top = rect.top - elRect.height - 8;
              left = rect.left + rect.width / 2 - elRect.width / 2;
              break;
            case 'bottom':
              top = rect.bottom + 8;
              left = rect.left + rect.width / 2 - elRect.width / 2;
              break;
            case 'left':
              top = rect.top + rect.height / 2 - elRect.height / 2;
              left = rect.left - elRect.width - 8;
              break;
            case 'right':
              top = rect.top + rect.height / 2 - elRect.height / 2;
              left = rect.right + 8;
              break;
            default:
              top = rect.bottom + 8;
              left = rect.left + rect.width / 2 - elRect.width / 2;
          }

          el.style.top = `${top + window.scrollY}px`;
          el.style.left = `${left + window.scrollX}px`;
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, { passive: true });
        window.addEventListener('resize', updatePosition);
      });
    }
  }

  // ============================================================
  // SCROLL SNAP (Horizontal, Vertical, Sections)
  // ============================================================
  static initScrollSnap() {
    document.querySelectorAll('[data-scroll-snap]').forEach(container => {
      const type = container.dataset.scrollSnapType || 'x mandatory';
      const align = container.dataset.scrollSnapAlign || 'start';

      container.style.cssText += `
        scroll-snap-type: ${type};
        scroll-padding: var(--space-4);
      `;

      container.querySelectorAll('[data-scroll-snap-item]').forEach(item => {
        item.style.scrollSnapAlign = align;
        item.style.scrollSnapStop = 'normal';
      });

      // Scroll indicator
      if (container.dataset.scrollIndicator === 'true') {
        const indicator = document.createElement('div');
        indicator.className = 'scroll-snap-indicator';
        indicator.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
        container.appendChild(indicator);
      }
    });
  }

  // ============================================================
  // STICKY (Headers, Footers, Sidebars, CTAs)
  // ============================================================
  static initSticky() {
    document.querySelectorAll('[data-sticky]').forEach(el => {
      const top = el.dataset.stickyTop || '0';
      const bottom = el.dataset.stickyBottom;
      const zIndex = el.dataset.stickyZ || 'var(--z-sticky)';
      const threshold = parseFloat(el.dataset.stickyThreshold || '0');

      el.style.cssText += `
        position: sticky;
        top: ${top};
        ${bottom ? `bottom: ${bottom};` : ''}
        z-index: ${zIndex};
      `;

      // Intersection observer for sticky state changes
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          el.classList.toggle('sticky--stuck', !entry.isIntersecting);
          el.classList.toggle('sticky--bottom', entry.boundingClientRect.bottom <= window.innerHeight);
        });
      }, { rootMargin: `${top} 0px ${bottom || '0px'} 0px`, threshold: [0, threshold] });

      observer.observe(el);
    });
  }

  // ============================================================
  // GRID/FLEX UTILITIES (Responsive, Container Queries)
  // ============================================================
  static initGridFlexUtilities() {
    // Grid utilities
    document.querySelectorAll('[data-grid]').forEach(el => {
      const cols = el.dataset.gridCols || '1';
      const gap = el.dataset.gap || 'var(--space-4)';
      const minWidth = el.dataset.minWidth || '280px';

      if (el.dataset.grid === 'auto-fit') {
        el.style.gridTemplateColumns = `repeat(auto-fit, minmax(${el.dataset.minWidth || '280px'}, 1fr))`;
      } else if (el.dataset.grid === 'auto-fill') {
        el.style.gridTemplateColumns = `repeat(auto-fill, minmax(${el.dataset.minWidth || '280px'}, 1fr))`;
      } else {
        el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      }
      el.style.gap = gap;
      el.style.display = 'grid';
    });

    // Flex utilities
    document.querySelectorAll('[data-flex]').forEach(el => {
      const direction = el.dataset.flexDirection || 'row';
      const wrap = el.dataset.flexWrap || 'nowrap';
      const justify = el.dataset.justifyContent || 'flex-start';
      const align = el.dataAlign || 'stretch';
      const gap = el.dataset.gap || 'var(--space-4)';

      el.style.display = 'flex';
      el.style.flexDirection = direction;
      el.style.flexWrap = wrap;
      el.style.justifyContent = justify;
      el.style.alignItems = align;
      el.style.gap = gap;
    });

    // Container Query wrappers
    document.querySelectorAll('[data-cq]').forEach(el => {
      const name = el.dataset.cq;
      el.style.containerName = name;
      el.style.containerType = 'inline-size';
    });
  }

  // ============================================================
  // CONTAINER QUERY WRAPPERS (Component-level responsiveness)
  // ============================================================
  static initContainerQueryWrappers() {
    // Already handled in CSS, but can add JS helpers
    document.querySelectorAll('[data-cq-wrapper]').forEach(wrapper => {
      const name = wrapper.dataset.cqWrapper;
      wrapper.style.containerName = name;
      wrapper.style.containerType = 'inline-size';

      // Resize observer for dynamic updates
      const observer = new ResizeObserver(() => {
        wrapper.style.setProperty('--cq-width', `${wrapper.clientWidth}px`);
      });
      observer.observe(wrapper);
    });
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  // Debounce
  static debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  // Throttle
  static throttle(fn, limit) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Class toggles
  static toggleClass(el, className, force) {
    el?.classList.toggle(className, force);
  }

  // Element creation
  static createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) el.className = options.className;
    if (options.attributes) Object.entries(options.attributes).forEach(([k, v]) => el.setAttribute(k, v));
    if (options.html) el.innerHTML = options.html;
    if (options.text) el.textContent = options.text;
    if (options.style) Object.assign(el.style, options.style);
    if (options.dataset) Object.entries(options.dataset).forEach(([k, v]) => el.dataset[k] = v);
    if (options.events) Object.entries(options.events).forEach(([event, handler]) => el.addEventListener(event, handler));
    if (options.children) options.children.forEach(child => el.appendChild(child));
    if (options.parent) options.parent.appendChild(el);
    return el;
  }

  // Query helpers
  static $(sel, ctx = document) { return ctx.querySelector(sel); }
  static $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

  // Event delegation
  static delegate(parent, selector, event, handler) {
    parent.addEventListener(event, (e) => {
      const target = e.target.closest(selector);
      if (target) handler(e, target);
    });
  }

  // Auto-initialize
  static initAll() {
    this.initDividers();
    this.initSpacers();
    this.initVisuallyHidden();
    this.initSkipLinks();
    this.initFocusTrap();
    this.initPortal();
    this.initAnchorPositioning();
    this.initScrollSnap();
    this.initSticky();
    this.initGridFlexUtilities();
    this.initContainerQueryWrappers();
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => UtilityLayout.initAll());
} else {
  UtilityLayout.initAll();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UtilityLayout };
}

if (typeof window !== 'undefined') {
  window.UtilityLayout = UtilityLayout;
}