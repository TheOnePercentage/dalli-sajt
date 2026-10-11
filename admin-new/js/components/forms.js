import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

export class Button extends Component {
  constructor(options = {}) {
    super(options);
    this.variant = options.variant || 'primary';
    this.size = options.size || 'md';
    this.disabled = options.disabled || false;
    this.loading = options.loading || false;
    this.onClick = options.onClick;
    this.href = options.href;
    this.icon = options.icon;
    this.iconPosition = options.iconPosition || 'left';
    this.children = options.children || '';
    this.fullWidth = options.fullWidth || false;
    this.type = options.type || 'button';
  }

  render() {
    const classes = [
      'btn',
      `btn-${this.variant}`,
      `btn-${this.size}`,
      this.fullWidth ? 'btn-block' : '',
      this.loading ? 'btn-loading' : '',
      this.disabled ? 'btn-disabled' : ''
    ].filter(Boolean).join(' ');

    const iconHtml = this.icon ? this.renderIcon() : '';
    const childrenHtml = this.loading 
      ? '<span class="btn-spinner"></span>' 
      : this.children;

    const content = this.iconPosition === 'right' 
      ? `${childrenHtml}${iconHtml}`
      : `${iconHtml}${childrenHtml}`;

    if (this.href) {
      return `<a class="${classes}" href="${this.href}" ${this.disabled ? 'aria-disabled="true" tabindex="-1"' : ''} role="button">${content}</a>`;
    }

    return `<button class="${classes}" type="${this.type}" ${this.disabled ? 'disabled' : ''} ${this.loading ? 'aria-busy="true"' : ''}>${content}</button>`;
  }

  renderIcon() {
    if (typeof this.icon === 'string') {
      return `<span class="btn-icon">${this.icon}</span>`;
    }
    return `<span class="btn-icon">${this.icon}</span>`;
  }

  bindEvents() {
    super.bindEvents();
    this.on('click', (e) => {
      if (this.disabled || this.loading) {
        e.preventDefault();
        return;
      }
      if (this.onClick) this.onClick(e);
    });
  }

  setLoading(loading) {
    this.loading = loading;
    this.setState({ loading });
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    this.setState({ disabled });
  }
}

export class Input extends Component {
  constructor(options = {}) {
    super(options);
    this.type = options.type || 'text';
    this.label = options.label;
    this.placeholder = options.placeholder || '';
    this.value = options.value || '';
    this.name = options.name;
    this.required = options.required || false;
    this.disabled = options.disabled || false;
    this.readonly = options.readonly || false;
    this.error = options.error;
    this.hint = options.hint;
    this.icon = options.icon;
    this.iconPosition = options.iconPosition || 'left';
    this.autocomplete = options.autocomplete;
    this.maxlength = options.maxlength;
    this.min = options.min;
    this.max = options.max;
    this.step = options.step;
    this.pattern = options.pattern;
    this.inputMode = options.inputMode;
    this.onChange = options.onChange;
    this.onBlur = options.onBlur;
    this.onFocus = options.onFocus;
    this.id = options.id || ImperiumUtils.generateId('input-');
  }

  render() {
    const inputClasses = [
      'input-field',
      this.error ? 'input-error' : '',
      this.icon ? `input-field-with-icon input-icon-${this.iconPosition}` : ''
    ].filter(Boolean).join(' ');

    const wrapperClasses = ['input-wrapper'].join(' ');
    const labelHtml = this.label ? `<label class="input-label" for="${this.id}">${this.label}${this.required ? ' <span class="required" aria-hidden="true">*</span>' : ''}</label>` : '';
    const hintHtml = this.hint && !this.error ? `<span class="input-hint">${this.hint}</span>` : '';
    const errorHtml = this.error ? `<span class="input-error" role="alert">${this.error}</span>` : '';
    const iconHtml = this.icon ? `<span class="input-icon" aria-hidden="true">${this.icon}</span>` : '';

    const inputAttrs = [
      `type="${this.type}"`,
      `id="${this.id}"`,
      `name="${this.name || ''}"`,
      `value="${ImperiumUtils.escapeHtml(this.value)}"`,
      `placeholder="${ImperiumUtils.escapeHtml(this.placeholder)}"`,
      this.required ? 'required' : '',
      this.disabled ? 'disabled' : '',
      this.readonly ? 'readonly' : '',
      this.autocomplete ? `autocomplete="${this.autocomplete}"` : '',
      this.maxlength ? `maxlength="${this.maxlength}"` : '',
      this.min !== undefined ? `min="${this.min}"` : '',
      this.max !== undefined ? `max="${this.max}"` : '',
      this.step !== undefined ? `step="${this.step}"` : '',
      this.pattern ? `pattern="${this.pattern}"` : '',
      this.inputMode ? `inputmode="${this.inputMode}"` : '',
      this.error ? 'aria-invalid="true"' : '',
      this.error ? `aria-describedby="${this.id}-error"` : '',
      this.hint && !this.error ? `aria-describedby="${this.id}-hint"` : ''
    ].filter(Boolean).join(' ');

    return `
      <div class="${wrapperClasses}" data-ref="wrapper">
        ${labelHtml}
        <div class="input-field-wrapper">
          ${this.iconPosition === 'left' ? iconHtml : ''}
          <input class="${inputClasses}" ${inputAttrs} data-ref="input">
          ${this.iconPosition === 'right' ? iconHtml : ''}
        </div>
        ${errorHtml}
        ${hintHtml}
      </div>
    `;
  }

  bindEvents() {
    super.bindEvents();
    const input = this.ref('input');
    if (input) {
      input.addEventListener('input', (e) => {
        this.value = e.target.value;
        if (this.onChange) this.onChange(e);
        this.emit('change', { value: this.value, originalEvent: e });
      });

      input.addEventListener('blur', (e) => {
        if (this.onBlur) this.onBlur(e);
        this.emit('blur', { value: this.value, originalEvent: e });
      });

      input.addEventListener('focus', (e) => {
        if (this.onFocus) this.onFocus(e);
        this.emit('focus', { value: this.value, originalEvent: e });
      });
    }
  }

  getValue() {
    return this.ref('input')?.value ?? this.value;
  }

  setValue(value) {
    this.value = value;
    const input = this.ref('input');
    if (input) input.value = value;
  }

  setError(error) {
    this.error = error;
    this.setState({ error });
  }

  clearError() {
    this.error = null;
    this.setState({ error: null });
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    this.setState({ disabled });
  }

  focus() {
    this.ref('input')?.focus();
  }

  blur() {
    this.ref('input')?.blur();
  }
}

export class Textarea extends Input {
  constructor(options = {}) {
    super({ ...options, type: 'textarea' });
    this.rows = options.rows || 4;
    this.cols = options.cols;
    this.resize = options.resize || 'vertical';
  }

  render() {
    const inputClasses = [
      'input-field textarea-field',
      this.error ? 'input-error' : '',
      this.icon ? `input-field-with-icon input-icon-${this.iconPosition}` : ''
    ].filter(Boolean).join(' ');

    const wrapperClasses = ['input-wrapper'].join(' ');
    const labelHtml = this.label ? `<label class="input-label" for="${this.id}">${this.label}${this.required ? ' <span class="required" aria-hidden="true">*</span>' : ''}</label>` : '';
    const hintHtml = this.hint && !this.error ? `<span class="input-hint">${this.hint}</span>` : '';
    const errorHtml = this.error ? `<span class="input-error" role="alert">${this.error}</span>` : '';

    const textareaAttrs = [
      `id="${this.id}"`,
      `name="${this.name || ''}"`,
      `placeholder="${ImperiumUtils.escapeHtml(this.placeholder)}"`,
      `rows="${this.rows}"`,
      this.cols ? `cols="${this.cols}"` : '',
      this.required ? 'required' : '',
      this.disabled ? 'disabled' : '',
      this.readonly ? 'readonly' : '',
      this.maxlength ? `maxlength="${this.maxlength}"` : '',
      this.error ? 'aria-invalid="true"' : '',
      this.error ? `aria-describedby="${this.id}-error"` : '',
      this.hint && !this.error ? `aria-describedby="${this.id}-hint"` : '',
      `style="resize: ${this.resize};"`
    ].filter(Boolean).join(' ');

    return `
      <div class="${wrapperClasses}" data-ref="wrapper">
        ${labelHtml}
        <div class="input-field-wrapper">
          <textarea class="${inputClasses}" ${textareaAttrs} data-ref="input">${ImperiumUtils.escapeHtml(this.value)}</textarea>
        </div>
        ${errorHtml}
        ${hintHtml}
      </div>
    `;
  }
}

export class Select extends Component {
  constructor(options = {}) {
    super(options);
    this.label = options.label;
    this.placeholder = options.placeholder || 'Izaberite...';
    this.value = options.value || '';
    this.name = options.name;
    this.required = options.required || false;
    this.disabled = options.disabled || false;
    this.error = options.error;
    this.hint = options.hint;
    this.options = options.options || [];
    this.multiple = options.multiple || false;
    this.searchable = options.searchable || false;
    this.onChange = options.onChange;
    this.id = options.id || ImperiumUtils.generateId('select-');
  }

  render() {
    const wrapperClasses = ['input-wrapper'].join(' ');
    const labelHtml = this.label ? `<label class="input-label" for="${this.id}">${this.label}${this.required ? ' <span class="required" aria-hidden="true">*</span>' : ''}</label>` : '';
    const hintHtml = this.hint && !this.error ? `<span class="input-hint">${this.hint}</span>` : '';
    const errorHtml = this.error ? `<span class="input-error" role="alert">${this.error}</span>` : '';

    const selectAttrs = [
      `id="${this.id}"`,
      `name="${this.name || ''}"`,
      this.required ? 'required' : '',
      this.disabled ? 'disabled' : '',
      this.multiple ? 'multiple' : '',
      this.error ? 'aria-invalid="true"' : '',
      this.error ? `aria-describedby="${this.id}-error"` : '',
      this.hint && !this.error ? `aria-describedby="${this.id}-hint"` : '',
      'class="input-field select-field"'
    ].filter(Boolean).join(' ');

    const optionsHtml = this.options.map(opt => {
      const isGroup = opt.options !== undefined;
      if (isGroup) {
        return `<optgroup label="${ImperiumUtils.escapeHtml(opt.label)}">${opt.options.map(o => 
          `<option value="${ImperiumUtils.escapeHtml(o.value)}" ${this.value === o.value ? 'selected' : ''}>${ImperiumUtils.escapeHtml(o.label)}</option>`
        ).join('')}</optgroup>`;
      }
      return `<option value="${ImperiumUtils.escapeHtml(opt.value)}" ${this.value === opt.value ? 'selected' : ''}>${ImperiumUtils.escapeHtml(opt.label)}</option>`;
    }).join('');

    return `
      <div class="${wrapperClasses}" data-ref="wrapper">
        ${labelHtml}
        <div class="input-field-wrapper">
          <select ${selectAttrs} data-ref="select">
            <option value="">${ImperiumUtils.escapeHtml(this.placeholder)}</option>
            ${optionsHtml}
          </select>
        </div>
        ${errorHtml}
        ${hintHtml}
      </div>
    `;
  }

  bindEvents() {
    super.bindEvents();
    const select = this.ref('select');
    if (select) {
      select.addEventListener('change', (e) => {
        this.value = e.target.value;
        if (this.onChange) this.onChange(e);
        this.emit('change', { value: this.value, originalEvent: e });
      });
    }
  }

  getValue() {
    return this.ref('select')?.value ?? this.value;
  }

  setValue(value) {
    this.value = value;
    const select = this.ref('select');
    if (select) select.value = value;
  }

  setOptions(options) {
    this.options = options;
    this.setState({ options });
  }

  setError(error) {
    this.error = error;
    this.setState({ error });
  }

  clearError() {
    this.error = null;
    this.setState({ error: null });
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    this.setState({ disabled });
  }
}

export class Checkbox extends Component {
  constructor(options = {}) {
    super(options);
    this.label = options.label;
    this.value = options.value || 'on';
    this.checked = options.checked || false;
    this.name = options.name;
    this.required = options.required || false;
    this.disabled = options.disabled || false;
    this.error = options.error;
    this.onChange = options.onChange;
    this.id = options.id || ImperiumUtils.generateId('checkbox-');
  }

  render() {
    const wrapperClasses = ['checkbox-wrapper'].join(' ');
    const errorHtml = this.error ? `<span class="input-error" role="alert">${this.error}</span>` : '';

    return `
      <div class="${wrapperClasses}" data-ref="wrapper">
        <label class="checkbox-label" for="${this.id}">
          <input 
            type="checkbox" 
            class="checkbox-input" 
            id="${this.id}"
            name="${this.name || ''}"
            value="${this.value}"
            ${this.checked ? 'checked' : ''}
            ${this.required ? 'required' : ''}
            ${this.disabled ? 'disabled' : ''}
            data-ref="input"
            aria-invalid="${this.error ? 'true' : 'false'}"
          >
          <span class="checkbox-box" aria-hidden="true"></span>
          <span class="checkbox-text">${ImperiumUtils.escapeHtml(this.label)}</span>
        </label>
        ${errorHtml}
      </div>
    `;
  }

  bindEvents() {
    super.bindEvents();
    const input = this.ref('input');
    if (input) {
      input.addEventListener('change', (e) => {
        this.checked = e.target.checked;
        if (this.onChange) this.onChange(e);
        this.emit('change', { checked: this.checked, originalEvent: e });
      });
    }
  }

  getValue() {
    return this.ref('input')?.checked ?? this.checked;
  }

  setValue(checked) {
    this.checked = checked;
    const input = this.ref('input');
    if (input) input.checked = checked;
  }

  setError(error) {
    this.error = error;
    this.setState({ error });
  }

  clearError() {
    this.error = null;
    this.setState({ error: null });
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    this.setState({ disabled });
  }
}

export class Radio extends Component {
  constructor(options = {}) {
    super(options);
    this.label = options.label;
    this.value = options.value;
    this.name = options.name;
    this.checked = options.checked || false;
    this.disabled = options.disabled || false;
    this.onChange = options.onChange;
    this.id = options.id || ImperiumUtils.generateId('radio-');
  }

  render() {
    const wrapperClasses = ['radio-wrapper'].join(' ');

    return `
      <div class="${wrapperClasses}" data-ref="wrapper">
        <label class="radio-label" for="${this.id}">
          <input 
            type="radio" 
            class="radio-input" 
            id="${this.id}"
            name="${this.name || ''}"
            value="${ImperiumUtils.escapeHtml(this.value)}"
            ${this.checked ? 'checked' : ''}
            ${this.disabled ? 'disabled' : ''}
            data-ref="input"
          >
          <span class="radio-box" aria-hidden="true"></span>
          <span class="radio-text">${ImperiumUtils.escapeHtml(this.label)}</span>
        </label>
      </div>
    `;
  }

  bindEvents() {
    super.bindEvents();
    const input = this.ref('input');
    if (input) {
      input.addEventListener('change', (e) => {
        this.checked = e.target.checked;
        if (this.onChange) this.onChange(e);
        this.emit('change', { checked: this.checked, originalEvent: e });
      });
    }
  }

  getValue() {
    return this.ref('input')?.checked ?? this.checked;
  }

  setValue(checked) {
    this.checked = checked;
    const input = this.ref('input');
    if (input) input.checked = checked;
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    this.setState({ disabled });
  }
}

export class Switch extends Component {
  constructor(options = {}) {
    super(options);
    this.label = options.label;
    this.value = options.value || false;
    this.checked = options.checked || false;
    this.name = options.name;
    this.disabled = options.disabled || false;
    this.onChange = options.onChange;
    this.id = options.id || ImperiumUtils.generateId('switch-');
  }

  render() {
    const wrapperClasses = ['switch-wrapper', 'checkbox-wrapper'].join(' ');

    return `
      <div class="${wrapperClasses}" data-ref="wrapper">
        <label class="switch-label" for="${this.id}">
          <div class="switch-track">
            <input 
              type="checkbox" 
              class="switch-input" 
              id="${this.id}"
              name="${this.name || ''}"
              ${this.checked ? 'checked' : ''}
              ${this.disabled ? 'disabled' : ''}
              data-ref="input"
            >
            <span class="switch-thumb" aria-hidden="true"></span>
          </div>
          ${this.label ? `<span class="switch-text">${ImperiumUtils.escapeHtml(this.label)}</span>` : ''}
        </label>
      </div>
    `;
  }

  bindEvents() {
    super.bindEvents();
    const input = this.ref('input');
    if (input) {
      input.addEventListener('change', (e) => {
        this.checked = e.target.checked;
        if (this.onChange) this.onChange(e);
        this.emit('change', { checked: this.checked, originalEvent: e });
      });
    }
  }

  getValue() {
    return this.ref('input')?.checked ?? this.checked;
  }

  setValue(checked) {
    this.checked = checked;
    const input = this.ref('input');
    if (input) input.checked = checked;
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    this.setState({ disabled });
  }
}