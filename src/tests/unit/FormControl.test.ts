import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FormControl } from '../../../admin-new/js/components/ui/FormControl';

describe('FormControl', () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize form field with input', () => {
      document.body.innerHTML = `
        <div class="form-field">
          <label for="test-input">Test Label</label>
          <div class="form-field__input-wrapper">
            <input type="text" id="test-input" name="test" required>
          </div>
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!);
      expect(instance.input).toBeTruthy();
      expect(instance.label).toBeTruthy();
    });

    it('should create floating label field', () => {
      document.body.innerHTML = `
        <div class="form-field form-field--floating">
          <label for="floating-input">Floating Label</label>
          <div class="form-field__input-wrapper">
            <input type="text" id="floating-input" placeholder=" ">
          </div>
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!);
      expect(instance.options.floatingLabel).toBe(true);
    });
  });

  describe('validation', () => {
    it('should validate required field', () => {
      document.body.innerHTML = `
        <div class="form-field">
          <label for="required-input">Required</label>
          <input type="text" id="required-input" name="test" required>
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!);
      expect(instance.validate()).toBe(false);
    });

    it('should pass validation when required field has value', () => {
      document.body.innerHTML = `
        <div class="form-field">
          <label for="required-input">Required</label>
          <input type="text" id="required-input" name="test" required value="test">
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!);
      expect(instance.validate()).toBe(true);
    });

    it('should validate pattern', () => {
      document.body.innerHTML = `
        <div class="form-field">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" value="invalid-email">
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!, { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' });
      expect(instance.validate()).toBe(false);
    });

    it('should pass pattern validation', () => {
      document.body.innerHTML = `
        <div class="form-field">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" value="test@example.com">
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!, { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' });
      expect(instance.validate()).toBe(true);
    });

    it('should run custom validator', () => {
      document.body.innerHTML = `
        <div class="form-field">
          <label for="custom">Custom</label>
          <input type="text" id="custom" name="custom" value="abc">
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!, {
        customValidator: (value) => value.length >= 5 || 'Minimum 5 characters'
      });
      expect(instance.validate()).toBe(false);
    });

    it('should pass custom validator', () => {
      document.body.innerHTML = `
        <div class="form-field">
          <label for="custom">Custom</label>
          <input type="text" id="custom" name="custom" value="longenough">
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!, {
        customValidator: (value) => value.length >= 5 || 'Minimum 5 characters'
      });
      expect(instance.validate()).toBe(true);
    });
  });

  describe('value handling', () => {
    it('should get input value', () => {
      document.body.innerHTML = `
        <div class="form-field">
          <input type="text" id="test" value="test-value">
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!);
      expect(instance.getValue()).toBe('test-value');
    });

    it('should get checkbox value', () => {
      document.body.innerHTML = `
        <div class="form-field form-field--checkbox">
          <input type="checkbox" id="checkbox" checked>
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!);
      expect(instance.getValue()).toBe(true);
    });

    it('should set value', () => {
      document.body.innerHTML = `
        <div class="form-field">
          <input type="text" id="test">
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!);
      instance.setValue('new-value');
      const input = document.getElementById('test');
      expect(input?.value).toBe('new-value');
    });
  });

  describe('error handling', () => {
    it('should show error message', () => {
      document.body.innerHTML = `
        <div class="form-field">
          <input type="text" id="test" required>
          <div class="form-field__error" data-error></div>
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!);
      instance.setError('Error message');
      const errorEl = field.querySelector('[data-error]');
      expect(errorEl?.textContent).toBe('Error message');
      expect(errorEl?.style.display).toBe('block');
    });

    it('should clear error', () => {
      document.body.innerHTML = `
        <div class="form-field">
          <input type="text" id="test" required>
          <div class="form-field__error" data-error style="display: block">Error</div>
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!);
      instance.clearError();
      const errorEl = field.querySelector('[data-error]');
      expect(errorEl?.style.display).toBe('none');
    });
  });

  describe('floating label', () => {
    it('should show floating label when focused', () => {
      document.body.innerHTML = `
        <div class="form-field form-field--floating">
          <label for="floating">Label</label>
          <input type="text" id="floating" placeholder=" ">
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!);
      const input = document.getElementById('floating');
      input.focus();
      expect(document.querySelector('.form-field')?.classList.contains('form-field--focused')).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset field to initial state', () => {
      document.body.innerHTML = `
        <div class="form-field">
          <input type="text" id="test" value="initial">
        </div>
      `;
      const field = document.querySelector('.form-field');
      const instance = new FormControl(field!);
      instance.setValue('changed');
      instance.reset();
      const input = document.getElementById('test');
      expect(input?.value).toBe('initial');
    });
  });
});