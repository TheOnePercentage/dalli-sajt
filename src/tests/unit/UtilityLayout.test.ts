import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UtilityLayout } from '../../../admin-new/js/components/ui/UtilityLayout';

describe('UtilityLayout', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initDividers', () => {
    it('should initialize dividers with correct styles', () => {
      document.body.innerHTML = '<div class="divider" data-orientation="horizontal" data-variant="solid"></div>';
      UtilityLayout.initDividers();
      const divider = document.querySelector('.divider');
      expect(divider).toBeTruthy();
      expect(divider.style.display).toBe('flex');
      expect(divider.style.alignItems).toBe('center');
    });

    it('should handle vertical orientation', () => {
      document.body.innerHTML = '<div class="divider" data-orientation="vertical"></div>';
      UtilityLayout.initDividers();
      const divider = document.querySelector('.divider');
      expect(divider.style.flexDirection).toBe('column');
    });
  });

  describe('initSpacers', () => {
    it('should set correct height based on size', () => {
      document.body.innerHTML = '<div class="spacer" data-size="lg"></div>';
      UtilityLayout.initSpacers();
      const spacer = document.querySelector('.spacer');
      expect(spacer.style.height).toBe('var(--space-6)');
    });

    it('should handle responsive spacers', () => {
      document.body.innerHTML = '<div class="spacer" data-size="md" data-responsive="true"></div>';
      UtilityLayout.initSpacers();
      const spacer = document.querySelector('.spacer');
      expect(spacer.style.height).toContain('clamp');
    });
  });

  describe('initVisuallyHidden', () => {
    it('should apply correct styles to visually-hidden elements', () => {
      document.body.innerHTML = '<span class="visually-hidden">Hidden text</span>';
      UtilityLayout.initVisuallyHidden();
      const el = document.querySelector('.visually-hidden');
      expect(el.style.position).toBe('absolute');
      expect(el.style.width).toBe('1px');
      expect(el.style.height).toBe('1px');
    });
  });

  describe('initSkipLinks', () => {
    it('should handle skip link clicks', () => {
      document.body.innerHTML = `
        <a class="skip-link" href="#main-content">Skip to main</a>
        <main id="main-content">Main content</main>
      `;
      UtilityLayout.initSkipLinks();
      const link = document.querySelector('.skip-link');
      link.click();
      const target = document.getElementById('main-content');
      expect(document.activeElement).toBe(target);
    });
  });

  describe('initFocusTrap', () => {
    it('should trap focus within container', () => {
      document.body.innerHTML = `
        <div data-focus-trap>
          <button>First</button>
          <button>Last</button>
        </div>
      `;
      UtilityLayout.initFocusTrap();
      const container = document.querySelector('[data-focus-trap]');
      expect(container).toBeTruthy();
    });
  });

  describe('initPortal', () => {
    it('should create portal root', () => {
      UtilityLayout.initPortal();
      const portalRoot = document.getElementById('portal-root');
      expect(portalRoot).toBeTruthy();
    });
  });

  describe('initAnchorPositioning', () => {
    it('should set up anchor positioning for elements', () => {
      document.body.innerHTML = `
        <div id="target">Target</div>
        <div data-anchor-target="target" data-anchor-position="bottom">Tooltip</div>
      `;
      UtilityLayout.initAnchorPositioning();
      const tooltip = document.querySelector('[data-anchor-target]');
      expect(tooltip).toBeTruthy();
    });
  });

  describe('initScrollSnap', () => {
    it('should initialize scroll snap containers', () => {
      document.body.innerHTML = `
        <div data-scroll-snap>
          <div data-scroll-snap-item>Item 1</div>
          <div data-scroll-snap-item>Item 2</div>
        </div>
      `;
      UtilityLayout.initScrollSnap();
      const container = document.querySelector('[data-scroll-snap]');
      expect(container.style.scrollSnapType).toBe('x mandatory');
    });
  });

  describe('initSticky', () => {
    it('should initialize sticky elements', () => {
      document.body.innerHTML = '<header data-sticky data-sticky-top="0"></header>';
      UtilityLayout.initSticky();
      const header = document.querySelector('[data-sticky]');
      expect(header.style.position).toBe('sticky');
    });
  });

  describe('initGridFlexUtilities', () => {
    it('should initialize grid utilities', () => {
      document.body.innerHTML = '<div data-grid="auto-fit" data-gap="var(--space-4)"></div>';
      UtilityLayout.initGridFlexUtilities();
      const grid = document.querySelector('[data-grid]');
      expect(grid.style.display).toBe('grid');
    });

    it('should initialize flex utilities', () => {
      document.body.innerHTML = '<div data-flex data-flex-direction="row" data-gap="var(--space-4)"></div>';
      UtilityLayout.initGridFlexUtilities();
      const flex = document.querySelector('[data-flex]');
      expect(flex.style.display).toBe('flex');
    });
  });

  describe('initContainerQueryWrappers', () => {
    it('should initialize container query wrappers', () => {
      document.body.innerHTML = '<div data-cq-wrapper="card"></div>';
      UtilityLayout.initContainerQueryWrappers();
      const wrapper = document.querySelector('[data-cq-wrapper]');
      expect(wrapper.style.containerName).toBe('card');
      expect(wrapper.style.containerType).toBe('inline-size');
    });
  });

  describe('Utility helpers', () => {
    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debounced = UtilityLayout.debounce(fn, 100);
      debounced();
      debounced();
      debounced();
      expect(fn).not.toHaveBeenCalled();
      return new Promise(resolve => setTimeout(() => {
        expect(fn).toHaveBeenCalledTimes(1);
        resolve();
      }, 150));
    });

    it('should throttle function calls', () => {
      const fn = vi.fn();
      const throttled = UtilityLayout.throttle(fn, 100);
      throttled();
      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
      return new Promise(resolve => setTimeout(() => {
        throttled();
        expect(fn).toHaveBeenCalledTimes(2);
        resolve();
      }, 150));
    });

    it('should create elements with options', () => {
      const el = UtilityLayout.createElement('div', {
        className: 'test-class',
        attributes: { 'data-test': 'value' },
        text: 'Hello',
        style: { color: 'red' }
      });
      expect(el.tagName).toBe('DIV');
      expect(el.className).toBe('test-class');
      expect(el.dataset.test).toBe('value');
      expect(el.textContent).toBe('Hello');
      expect(el.style.color).toBe('red');
    });

    it('should query elements', () => {
      document.body.innerHTML = '<div class="test">Test</div>';
      const el = UtilityLayout.$('.test');
      expect(el).toBeTruthy();
      expect(el.textContent).toBe('Test');
    });

    it('should query all elements', () => {
      document.body.innerHTML = '<div class="test">1</div><div class="test">2</div>';
      const els = UtilityLayout.$$('.test');
      expect(els.length).toBe(2);
    });

    it('should delegate events', () => {
      document.body.innerHTML = '<ul><li data-item>1</li><li data-item>2</li></ul>';
      const handler = vi.fn();
      UtilityLayout.delegate(document.body, '[data-item]', 'click', handler);
      document.querySelector('[data-item]')?.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});