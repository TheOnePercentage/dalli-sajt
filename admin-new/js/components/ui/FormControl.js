/**
 * DALLI Form Controls Component
 * Mobile-first, accessible, with validation, floating labels, password toggle, OTP, autocomplete
 * Components: Input, Textarea, Select, Checkbox, Radio, Switch, Range, FileUpload, OTP, Autocomplete
 */

export class FormControl {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      validateOn: options.validateOn || 'blur', // 'blur', 'input', 'submit'
      showError: options.showError !== false,
      errorMessage: options.errorMessage || 'Polje je obavezno',
      pattern: options.pattern || null,
      customValidator: options.customValidator || null,
      floatingLabel: options.floatingLabel !== false,
      ...options
    };

    this.input = element.querySelector('input, textarea, select') || element;
    this.label = element.querySelector('label');
    this.errorEl = element.querySelector('[data-error]');
    this.helperEl = element.querySelector('[data-helper]');
    this.valid = true;
    this.touched = false;

    this.init();
  }

  static createInput(options = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';
    
    const input = document.createElement('input');
    input.type = options.type || 'text';
    input.name = options.name;
    input.id = options.id || options.name;
    input.placeholder = options.placeholder || '';
    input.required = options.required || false;
    input.disabled = options.disabled || false;
    input.readOnly = options.readOnly || false;
    input.autocomplete = options.autocomplete || 'off';
    input.inputMode = options.inputMode || '';
    input.pattern = options.pattern || '';
    input.min = options.min || '';
    input.max = options.max || '';
    input.step = options.step || '';
    input.minLength = options.minLength || '';
    input.maxLength = options.maxLength || '';
    
    if (options.value) input.value = options.value;
    
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = options.label || '';
    if (options.required) label.innerHTML += ' <span class="required" aria-hidden="true">*</span>';
    
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'form-field__input-wrapper';
    wrapperDiv.appendChild(input);
    
    if (options.showError !== false) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'form-field__error';
      errorDiv.dataset.error = '';
      errorDiv.setAttribute('role', 'alert');
      errorDiv.setAttribute('aria-live', 'polite');
      wrapperDiv.appendChild(errorDiv);
    }
    
    if (options.helperText) {
      const helperDiv = document.createElement('div');
      helperDiv.className = 'form-field__helper';
      helperDiv.dataset.helper = '';
      helperDiv.textContent = options.helperText;
      wrapperDiv.appendChild(helperDiv);
    }
    
    wrapper.appendChild(label);
    wrapper.appendChild(wrapperDiv);
    
    if (options.floatingLabel !== false) {
      wrapper.classList.add('form-field--floating');
    }
    
    return new FormControl(wrapper, {
      validateOn: options.validateOn || 'blur',
      errorMessage: options.errorMessage || 'Polje je obavezno',
      pattern: options.pattern || null,
      customValidator: options.customValidator || null,
      floatingLabel: options.floatingLabel !== false
    });
  }

  static createTextarea(options = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';
    
    const textarea = document.createElement('textarea');
    textarea.name = options.name;
    textarea.id = options.id || options.name;
    textarea.placeholder = options.placeholder || '';
    textarea.required = options.required || false;
    textarea.disabled = options.disabled || false;
    textarea.readOnly = options.readOnly || false;
    textarea.rows = options.rows || 4;
    textarea.cols = options.cols || '';
    if (options.value) textarea.value = options.value;
    if (options.minLength) textarea.minLength = options.minLength;
    if (options.maxLength) textarea.maxLength = options.maxLength;
    
    const label = document.createElement('label');
    label.htmlFor = textarea.id;
    label.textContent = options.label || '';
    if (options.required) label.innerHTML += ' <span class="required" aria-hidden="true">*</span>';
    
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'form-field__input-wrapper';
    wrapperDiv.appendChild(textarea);
    
    if (options.showError !== false) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'form-field__error';
      errorDiv.dataset.error = '';
      errorDiv.setAttribute('role', 'alert');
      errorDiv.setAttribute('aria-live', 'polite');
      wrapperDiv.appendChild(errorDiv);
    }
    
    if (options.helperText) {
      const helperDiv = document.createElement('div');
      helperDiv.className = 'form-field__helper';
      helperDiv.dataset.helper = '';
      helperDiv.textContent = options.helperText;
      wrapperDiv.appendChild(helperDiv);
    }
    
    if (options.counter !== false) {
      const counter = document.createElement('div');
      counter.className = 'form-field__counter';
      counter.textContent = `0 / ${options.maxLength || '∞'}`;
      wrapperDiv.appendChild(counter);
    }
    
    wrapper.appendChild(document.createElement('label').cloneNode(true)); // placeholder for label
    wrapper.insertBefore(document.querySelector(`label[for="${textarea.id}"]`), wrapper.firstChild);
    wrapper.insertBefore(wrapper.querySelector('label'), wrapper.firstChild);
    
    wrapper.appendChild(textarea.parentElement || textarea);
    wrapper.insertBefore(wrapper.querySelector('label'), wrapper.firstChild);
    
    // Rebuild properly
    wrapper.innerHTML = '';
    wrapper.appendChild(label);
    wrapper.appendChild(wrapperDiv);
    wrapperDiv.insertBefore(textarea, wrapperDiv.firstChild);
    
    return new FormControl(wrapper, {
      validateOn: options.validateOn || 'blur',
      errorMessage: options.errorMessage || 'Polje je obavezno',
      pattern: options.pattern || null,
      customValidator: options.customValidator || null,
      floatingLabel: options.floatingLabel !== false
    });
  }

  static createSelect(options = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';
    
    const select = document.createElement('select');
    select.name = options.name;
    select.id = options.id || options.name;
    select.required = options.required || false;
    select.disabled = options.disabled || false;
    select.multiple = options.multiple || false;
    
    if (options.placeholder) {
      const placeholderOpt = document.createElement('option');
      placeholderOpt.value = '';
      placeholderOpt.disabled = true;
      placeholderOpt.selected = true;
      placeholderOpt.hidden = true;
      placeholderOpt.textContent = options.placeholder;
      select.appendChild(placeholderOpt);
    }
    
    (options.options || []).forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label || opt.value;
      option.selected = opt.selected || false;
      option.disabled = opt.disabled || false;
      select.appendChild(option);
    });
    
    if (options.value) select.value = options.value;
    
    const label = document.createElement('label');
    label.htmlFor = select.id;
    label.textContent = options.label || '';
    if (options.required) label.innerHTML += ' <span class="required" aria-hidden="true">*</span>';
    
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'form-field__input-wrapper';
    wrapperDiv.appendChild(select);
    
    if (options.showError !== false) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'form-field__error';
      errorDiv.dataset.error = '';
      errorDiv.setAttribute('role', 'alert');
      errorDiv.setAttribute('aria-live', 'polite');
      wrapperDiv.appendChild(errorDiv);
    }
    
    if (options.helperText) {
      const helperDiv = document.createElement('div');
      helperDiv.className = 'form-field__helper';
      helperDiv.dataset.helper = '';
      helperDiv.textContent = options.helperText;
      wrapperDiv.appendChild(helperDiv);
    }
    
    wrapper.appendChild(label);
    wrapper.appendChild(wrapperDiv);
    
    return new FormControl(wrapper, {
      validateOn: options.validateOn || 'blur',
      errorMessage: options.errorMessage || 'Polje je obavezno',
      customValidator: options.customValidator || null,
      floatingLabel: options.floatingLabel !== false
    });
  }

  static createCheckbox(options = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field form-field--checkbox';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = options.name;
    input.id = options.id || options.name;
    input.value = options.value || 'true';
    input.checked = options.checked || false;
    input.required = options.required || false;
    input.disabled = options.disabled || false;
    input.indeterminate = options.indeterminate || false;
    
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.className = 'checkbox-label';
    label.innerHTML = `
      <span class="checkbox-input">
        <svg class="checkbox-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
      </span>
      <span class="checkbox-text">${options.label || ''}</span>
    `;
    
    if (options.required) {
      const req = document.createElement('span');
      req.className = 'required';
      req.setAttribute('aria-hidden', 'true');
      req.textContent = '*';
      label.querySelector('.checkbox-text').appendChild(req);
    }
    
    if (options.helperText) {
      const helper = document.createElement('span');
      helper.className = 'checkbox-helper';
      helper.textContent = options.helperText;
      label.appendChild(helper);
    }
    
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'checkbox-wrapper';
    wrapperDiv.appendChild(input);
    wrapperDiv.appendChild(label);
    
    wrapper.appendChild(wrapperDiv);
    
    return new FormControl(wrapper, {
      validateOn: 'change',
      errorMessage: options.errorMessage || 'Morate prihvatiti uslove',
      customValidator: options.customValidator || null,
      floatingLabel: false
    });
  }

  static createRadioGroup(options = {}) {
    const wrapper = document.createElement('fieldset');
    wrapper.className = 'form-field form-field--radio-group';
    
    if (options.legend) {
      const legend = document.createElement('legend');
      legend.textContent = options.legend;
      if (options.required) legend.innerHTML += ' <span class="required" aria-hidden="true">*</span>';
      wrapper.appendChild(legend);
    }
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'radio-group';
    
    (options.options || []).forEach((opt, index) => {
      const optionWrapper = document.createElement('div');
      optionWrapper.className = 'radio-option';
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = options.name;
      input.id = `${options.name}-${index}`;
      input.value = opt.value;
      input.checked = opt.checked || false;
      input.disabled = opt.disabled || false;
      input.required = options.required && index === 0;
      
      const label = document.createElement('label');
      label.htmlFor = `${options.name}-${index}`;
      label.className = 'radio-label';
      label.innerHTML = `
        <span class="radio-input">
          <svg class="radio-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="7"/></svg>
        </span>
        <span class="radio-text">${opt.label}</span>
      `;
      
      const optionWrapperDiv = document.createElement('div');
      optionWrapperDiv.className = 'radio-wrapper';
      optionWrapperDiv.appendChild(input);
      optionWrapperDiv.appendChild(label);
      
      optionWrapper.appendChild(optionWrapperDiv);
      optionsContainer.appendChild(optionWrapper);
    });
    
    wrapper.appendChild(optionsContainer);
    
    if (options.helperText) {
      const helper = document.createElement('div');
      helper.className = 'form-field__helper';
      helper.textContent = options.helperText;
      wrapper.appendChild(helper);
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-field__error';
    errorDiv.dataset.error = '';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.setAttribute('aria-live', 'polite');
    wrapper.appendChild(errorDiv);
    
    return new FormControl(wrapper, {
      validateOn: 'change',
      errorMessage: options.errorMessage || 'Morate izabrati opciju',
      customValidator: options.customValidator || null,
      floatingLabel: false
    });
  }

  static createSwitch(options = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field form-field--switch';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = options.name;
    input.id = options.id || options.name;
    input.checked = options.checked || false;
    input.disabled = options.disabled || false;
    input.required = options.required || false;
    input.role = 'switch';
    input.setAttribute('aria-checked', options.checked || false);
    
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.className = 'switch-label';
    label.innerHTML = `
      <span class="switch-track" aria-hidden="true">
        <span class="switch-thumb" aria-hidden="true"></span>
      </span>
      <span class="switch-text">${options.label || ''}</span>
    `;
    
    if (options.required) {
      const req = document.createElement('span');
      req.className = 'required';
      req.setAttribute('aria-hidden', 'true');
      req.textContent = '*';
      label.querySelector('.switch-text').appendChild(req);
    }
    
    if (options.helperText) {
      const helper = document.createElement('span');
      helper.className = 'switch-helper';
      helper.textContent = options.helperText;
      label.appendChild(helper);
    }
    
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'switch-wrapper';
    wrapperDiv.appendChild(input);
    wrapperDiv.appendChild(label);
    
    wrapper.appendChild(wrapperDiv);
    
    if (options.helperText) {
      const helper = document.createElement('div');
      helper.className = 'form-field__helper';
      helper.textContent = options.helperText;
      wrapper.appendChild(helper);
    }
    
    return new FormControl(wrapper, {
      validateOn: 'change',
      errorMessage: options.errorMessage || '',
      customValidator: options.customValidator || null,
      floatingLabel: false
    });
  }

  static createOTP(options = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field form-field--otp';
    
    const label = document.createElement('label');
    label.textContent = options.label || 'Unesite kod';
    if (options.required) label.innerHTML += ' <span class="required" aria-hidden="true">*</span>';
    
    const inputsContainer = document.createElement('div');
    inputsContainer.className = 'otp-inputs';
    inputsContainer.setAttribute('role', 'group');
    inputsContainer.setAttribute('aria-label', options.label || 'Unesite kod verifikacije');
    
    const length = options.length || 6;
    const inputs = [];
    
    for (let i = 0; i < length; i++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.pattern = '[0-9]';
      input.maxLength = 1;
      input.autocomplete = 'one-time-code';
      input.required = options.required || false;
      input.disabled = options.disabled || false;
      input.dataset.index = i;
      input.setAttribute('aria-label', `Cifra ${i + 1}`);
      
      input.addEventListener('input', (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = value;
        if (value && i < length - 1) {
          inputs[i + 1]?.focus();
        }
      });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && i > 0) {
          inputs[i - 1]?.focus();
        }
        if (e.key === 'ArrowLeft' && i > 0) {
          inputs[i - 1]?.focus();
        }
        if (e.key === 'ArrowRight' && i < length - 1) {
          inputs[i + 1]?.focus();
        }
      });
      
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const digits = paste.replace(/[^0-9]/g, '').slice(0, length);
        digits.split('').forEach((digit, idx) => {
          if (idx < length) {
            inputs[idx].value = digit;
          }
        });
        inputs[Math.min(digits.length, length - 1)]?.focus();
        
        // Trigger validation
        const event = new Event('input', { bubbles: true });
        inputs[length - 1].dispatchEvent(event);
      });
      
      inputs.push(input);
      inputsContainer.appendChild(input);
    }
    
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = options.name;
    hiddenInput.id = options.id || options.name;
    
    function updateHiddenValue() {
      hiddenInput.value = inputs.map(i => i.value).join('');
      hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    inputs.forEach(input => {
      input.addEventListener('input', updateHiddenValue);
    });
    
    const wrapper2 = document.createElement('div');
    wrapper2.className = 'form-field form-field--otp';
    
    const label2 = document.createElement('label');
    label2.textContent = options.label || 'Unesite kod';
    if (options.required) label2.innerHTML += ' <span class="required" aria-hidden="true">*</span>';
    
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'otp-wrapper';
    wrapperDiv.appendChild(inputsContainer);
    wrapperDiv.appendChild(hiddenInput);
    
    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'form-field';
    wrapperEl.appendChild(document.createElement('label').cloneNode(true));
    wrapperEl.appendChild(inputsContainer);
    wrapperEl.appendChild(hiddenInput);
    
    // Rebuild
    const wrapperEl2 = document.createElement('div');
    wrapperEl2.className = 'form-field form-field--otp';
    wrapperEl2.appendChild(label);
    
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'otp-input-wrapper';
    inputWrapper.appendChild(inputsContainer);
    inputWrapper.appendChild(hiddenInput);
    wrapperEl2.appendChild(inputWrapper);
    
    if (options.showError !== false) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'form-field__error';
      errorDiv.dataset.error = '';
      errorDiv.setAttribute('role', 'alert');
      errorDiv.setAttribute('aria-live', 'polite');
      wrapperEl2.appendChild(errorDiv);
    }
    
    if (options.helperText) {
      const helper = document.createElement('div');
      helper.className = 'form-field__helper';
      helper.textContent = options.helperText;
      wrapperEl2.appendChild(helper);
    }
    
    return new FormControl(wrapperEl2, {
      validateOn: 'input',
      errorMessage: options.errorMessage || 'Unesite sve cifre koda',
      customValidator: options.customValidator || null,
      floatingLabel: false
    });
  }

  init() {
    this.input.setAttribute('aria-invalid', 'false');
    this.input.setAttribute('aria-describedby', this.errorEl?.id || '');
    
    if (this.options.floatingLabel && this.label) {
      this.element.classList.add('form-field--floating');
      this.updateFloatingLabel();
      this.input.addEventListener('input', () => this.updateFloatingLabel());
      this.input.addEventListener('focus', () => this.element.classList.add('form-field--focused'));
      this.input.addEventListener('blur', () => {
        this.element.classList.remove('form-field--focused');
        this.updateFloatingLabel();
      });
    }
    
    this.setupValidation();
    this.setupAria();
  }

  setupValidation() {
    const events = this.options.validateOn.split(',').map(e => e.trim());
    
    events.forEach(event => {
      if (event === 'submit') return;
      this.input.addEventListener(event, () => this.validate());
    });
    
    if (events.includes('input')) {
      this.input.addEventListener('input', () => {
        if (this.touched) this.validate();
      });
    }
  }

  setupAria() {
    const errorId = `error-${this.input.id || Math.random().toString(36).slice(2)}`;
    this.input.setAttribute('aria-describedby', this.errorEl?.id || errorId);
    this.input.setAttribute('aria-invalid', 'false');
    
    if (this.errorEl) {
      this.errorEl.id = errorId;
      this.errorDiv = this.errorEl;
    }
  }

  validate() {
    this.touched = true;
    const value = this.getValue();
    let isValid = true;
    let message = '';
    
    // Required check
    if (this.input.required && !value) {
      isValid = false;
      message = this.options.errorMessage || 'Polje je obavezno';
    }
    
    // Pattern check
    if (isValid && this.options.pattern && value) {
      const regex = typeof this.options.pattern === 'string' 
        ? new RegExp(this.options.pattern) 
        : this.options.pattern;
      if (!regex.test(value)) {
        isValid = false;
        message = this.options.errorMessage || 'Format nije validan';
      }
    }
    
    // Custom validator
    if (isValid && this.options.customValidator) {
      const result = this.options.customValidator(value, this.input);
      if (result !== true) {
        isValid = false;
        message = result || this.options.errorMessage || 'Vrednost nije validna';
      }
    }
    
    // Native validation
    if (isValid && this.input.validity && !this.input.validity.valid) {
      isValid = false;
      if (this.input.validity.valueMissing) message = this.options.errorMessage || 'Polje je obavezno';
      else if (this.input.validity.typeMismatch) message = 'Format nije validan';
      else if (this.input.validity.patternMismatch) message = 'Format nije validan';
      else if (this.input.validity.tooShort) message = `Minimalno ${this.input.minLength} karaktera`;
      else if (this.input.validity.tooLong) message = `Maksimalno ${this.input.maxLength} karaktera`;
      else if (this.input.validity.rangeUnderflow) message = `Minimalna vrednost je ${this.input.min}`;
      else if (this.input.validity.rangeOverflow) message = `Maksimalna vrednost je ${this.input.max}`;
      else message = 'Vrednost nije validna';
    }
    
    this.setValidity(isValid, message);
    return isValid;
  }

  setValidity(valid, message = '') {
    this.valid = valid;
    this.input.setAttribute('aria-invalid', !valid);
    
    this.element.classList.toggle('form-field--valid', valid && this.touched);
    this.element.classList.toggle('form-field--invalid', !valid && this.touched);
    this.input.setAttribute('aria-invalid', !valid);
    
    if (this.errorDiv) {
      if (!valid && this.touched) {
        this.errorDiv.textContent = message;
        this.errorDiv.style.display = 'block';
        this.input.setAttribute('aria-describedby', this.errorDiv.id);
      } else {
        this.errorDiv.textContent = '';
        this.errorDiv.style.display = 'none';
        this.input.removeAttribute('aria-describedby');
      }
    }
    
    this.input.setAttribute('aria-invalid', !valid);
  }

  getValue() {
    if (this.input.type === 'checkbox') return this.input.checked;
    if (this.input.type === 'radio') {
      const radios = document.querySelectorAll(`input[name="${this.input.name}"]:checked`);
      return radios.length ? Array.from(radios).map(r => r.value) : '';
    }
    return this.input.value;
  }

  setValue(value) {
    if (this.input.type === 'checkbox') {
      this.input.checked = !!value;
    } else if (this.input.type === 'radio') {
      const radio = document.querySelector(`input[name="${this.input.name}"][value="${value}"]`);
      if (radio) radio.checked = true;
    } else {
      this.input.value = value;
    }
    this.updateFloatingLabel();
  }

  updateFloatingLabel() {
    if (!this.options.floatingLabel || !this.label) return;
    const hasValue = this.getValue() !== '' && this.getValue() !== false;
    this.element.classList.toggle('form-field--has-value', hasValue || this.input === document.activeElement);
  }

  reset() {
    this.touched = false;
    this.valid = true;
    this.input.value = this.input.defaultValue || '';
    if (this.input.type === 'checkbox' || this.input.type === 'radio') {
      this.input.checked = this.input.defaultChecked;
    }
    this.setValidity(true);
    this.element.classList.remove('form-field--valid', 'form-field--invalid', 'form-field--has-value');
    this.updateFloatingLabel();
  }

  setError(message) {
    this.touched = true;
    this.setValidity(false, message);
  }

  clearError() {
    this.setValidity(true);
  }

  setDisabled(disabled) {
    this.input.disabled = disabled;
    this.element.classList.toggle('form-field--disabled', disabled);
  }

  focus() {
    this.input.focus();
  }

  destroy() {
    this.input.removeEventListener('input', this.validate);
    this.input.removeEventListener('blur', this.validate);
    this.input.removeEventListener('change', this.validate);
  }
}

// Password Toggle Utility
export function initPasswordToggles(root = document) {
  root.querySelectorAll('.password-toggle').forEach(btn => {
    if (btn._initialized) return;
    btn._initialized = true;
    
    const input = btn.closest('.password-input-wrapper')?.querySelector('input[type="password"], input[type="text"]');
    if (!input) return;
    
    btn.addEventListener('click', () => {
      const type = input.type === 'password' ? 'text' : 'password';
      input.type = type;
      btn.setAttribute('aria-pressed', type === 'text');
      const eyeIcon = btn.querySelector('.eye-icon');
      if (eyeIcon) eyeIcon.textContent = type === 'password' ? '👁' : '🙈';
      input.focus();
    });
  });
}

// Character Counter
export function initCharCounters(root = document) {
  root.querySelectorAll('[data-maxlength]').forEach(el => {
    if (el._counterInit) return;
    el._counterInit = true;
    
    const max = parseInt(el.dataset.maxlength, 10);
    const counter = document.createElement('div');
    counter.className = 'form-field__counter';
    counter.textContent = `${el.value.length} / ${max}`;
    el.closest('.form-field__input-wrapper')?.appendChild(counter);
    
    el.addEventListener('input', () => {
      counter.textContent = `${el.value.length} / ${max}`;
      counter.classList.toggle('form-field__counter--warning', el.value.length > max * 0.9);
      counter.classList.toggle('form-field__counter--error', el.value.length > max);
    });
  });
}

// Auto-initialize form fields
export function initFormControls(root = document) {
  initPasswordToggles(root);
  initCharCounters(root);
  
  root.querySelectorAll('.form-field').forEach(el => {
    if (el._formControl) return;
    el._formControl = new FormControl(el);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FormControl, initFormControls, initPasswordToggles, initCharCounters };
}

// Global export for non-module environments
if (typeof window !== 'undefined') {
  window.FormControl = FormControl;
  window.initFormControls = initFormControls;
  window.initPasswordToggles = initPasswordToggles;
  window.initCharCounters = initCharCounters;
}