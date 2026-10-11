import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Button } from '../../../admin-new/js/components/ui/Button';

describe('Button', () => {
  let button: HTMLButtonElement;
  let instance: Button;

  beforeEach(() => {
    document.body.innerHTML = '';
    button = document.createElement('button');
    button.setAttribute('data-btn', 'true');
    document.body.appendChild(button);
    instance = new Button(button, { variant: 'primary', size: 'md' });
  });

  afterEach(() => {
    instance?.destroy();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct variant and size', () => {
      expect(instance.options.variant).toBe('primary');
      expect(instance.options.size).toBe('md');
      expect(button.classList.contains('btn')).toBe(true);
      expect(button.classList.contains('btn--primary')).toBe(true);
      expect(button.classList.contains('btn--md')).toBe(true);
    });

    it('should apply variant classes', () => {
      instance.setVariant('secondary');
      expect(button.classList.contains('btn--secondary')).toBe(true);
      expect(button.classList.contains('btn--primary')).toBe(false);
    });

    it('should apply size classes', () => {
      instance.setSize('lg');
      expect(button.classList.contains('btn--lg')).toBe(true);
      expect(button.classList.contains('btn--md')).toBe(false);
    });
  });

  describe('loading state', () => {
    it('should show loading state', () => {
      instance.setLoading(true);
      expect(button.classList.contains('btn--loading')).toBe(true);
      expect(button.disabled).toBe(true);
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.querySelector('.btn__spinner')).toBeTruthy();
    });

    it('should hide loading state', () => {
      instance.setLoading(true);
      instance.setLoading(false);
      expect(button.classList.contains('btn--loading')).toBe(false);
      expect(button.disabled).toBe(false);
      expect(button.hasAttribute('aria-busy')).toBe(false);
      expect(button.querySelector('.btn__spinner')).toBeFalsy();
    });
  });

  describe('disabled state', () => {
    it('should disable button', () => {
      instance.setDisabled(true);
      expect(button.disabled).toBe(true);
      expect(button.classList.contains('btn--disabled')).toBe(true);
    });

    it('should enable button', () => {
      instance.setDisabled(true);
      instance.setDisabled(false);
      expect(button.disabled).toBe(false);
      expect(button.classList.contains('btn--disabled')).toBe(false);
    });
  });

  describe('ripple effect', () => {
    it('should create ripple on pointerdown', () => {
      const event = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      button.dispatchEvent(event);
      expect(button.querySelector('.btn__ripple')).toBeTruthy();
    });

    it('should remove ripple on pointerup', async () => {
      const event = new PointerEvent('pointerdown', { clientX: 100, clientY: 100 });
      button.dispatchEvent(event);
      const ripple = button.querySelector('.btn__ripple');
      expect(ripple).toBeTruthy();

      const upEvent = new PointerEvent('pointerup');
      button.dispatchEvent(upEvent);
      // Wait for the fade animation to complete (300ms)
      await new Promise(resolve => setTimeout(resolve, 350));
      expect(button.querySelector('.btn__ripple')).toBeFalsy();
    });
  });

  describe('keyboard support', () => {
    it('should handle Enter key', () => {
      const clickHandler = vi.fn();
      instance.options.onClick = clickHandler;
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      button.dispatchEvent(event);
      expect(clickHandler).toHaveBeenCalled();
    });

    it('should handle Space key', () => {
      const clickHandler = vi.fn();
      instance.options.onClick = clickHandler;
      const event = new KeyboardEvent('keydown', { key: ' ' });
      button.dispatchEvent(event);
      expect(clickHandler).toHaveBeenCalled();
    });

    it('should not trigger on Enter when loading', () => {
      instance.setLoading(true);
      const clickHandler = vi.fn();
      instance.options.onClick = clickHandler;
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      button.dispatchEvent(event);
      expect(clickHandler).not.toHaveBeenCalled();
    });

    it('should not trigger on Enter when disabled', () => {
      instance.setDisabled(true);
      const clickHandler = vi.fn();
      instance.options.onClick = clickHandler;
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      button.dispatchEvent(event);
      expect(clickHandler).not.toHaveBeenCalled();
    });
  });

  describe('static create method', () => {
    it('should create button with options', () => {
      const btn = Button.create({
        variant: 'accent',
        size: 'lg',
        text: 'Test Button',
        onClick: vi.fn()
      });
      expect(btn.element.tagName).toBe('BUTTON');
      expect(btn.element.textContent).toBe('Test Button');
      expect(btn.element.classList.contains('btn--accent')).toBe(true);
      expect(btn.element.classList.contains('btn--lg')).toBe(true);
    });

    it('should create icon-only button', () => {
      const btn = Button.create({
        variant: 'primary',
        iconOnly: true,
        icon: '<svg>icon</svg>'
      });
      expect(btn.element.classList.contains('btn--icon-only')).toBe(true);
    });
  });

  describe('static initButtons', () => {
    it('should auto-initialize buttons with data attributes', () => {
      document.body.innerHTML = '<button data-btn data-btn-variant="secondary" data-btn-size="lg"></button>';
      Button.initButtons();
      const btn = document.querySelector('[data-btn]');
      expect(btn).toBeTruthy();
      expect(btn.classList.contains('btn--secondary')).toBe(true);
      expect(btn.classList.contains('btn--lg')).toBe(true);
    });
  });
});