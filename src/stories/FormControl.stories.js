import { FormControl } from '../../admin-new/js/components/ui/FormControl.js';

export default {
  title: 'Components/FormControl',
  component: FormControl,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'DALLI Form Control component with validation, floating labels, and accessibility features.',
      },
    },
  },
  argTypes: {
    validateOn: {
      control: 'select',
      options: ['blur', 'input', 'submit', 'blur,input'],
      description: 'When to validate',
    },
    floatingLabel: {
      control: 'boolean',
      description: 'Enable floating label animation',
    },
    required: {
      control: 'boolean',
      description: 'Required field',
    },
  },
};

export const Input = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '400px';
    container.innerHTML = `
      <div class="form-field form-field--floating">
        <label for="email">Email adresa</label>
        <div class="form-field__input-wrapper">
          <input type="email" id="email" name="email" required autocomplete="email" placeholder=" ">
          <div class="form-field__error" data-error></div>
          <div class="form-field__helper" data-helper>Unesite vašu email adresu</div>
        </div>
      </div>
    `;
    const field = container.querySelector('.form-field');
    new FormControl(field);
    return container;
  },
};

export const InputWithError = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '400px';
    container.innerHTML = `
      <div class="form-field form-field--floating form-field--invalid">
        <label for="email-error">Email adresa</label>
        <div class="form-field__input-wrapper">
          <input type="email" id="email-error" name="email" required autocomplete="email" value="invalid-email" aria-invalid="true" aria-describedby="email-error-error">
          <div class="form-field__error" id="email-error-error" style="display: block;">Unesite validnu email adresu</div>
        </div>
      </div>
    `;
    const field = container.querySelector('.form-field');
    new FormControl(field);
    return container;
  },
};

export const Textarea = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '400px';
    container.innerHTML = `
      <div class="form-field form-field--floating">
        <label for="message">Poruka</label>
        <div class="form-field__input-wrapper">
          <textarea id="message" name="message" required placeholder=" " rows="4" maxlength="500"></textarea>
          <div class="form-field__error" data-error></div>
          <div class="form-field__helper" data-helper>Maksimalno 500 karaktera</div>
          <div class="form-field__counter">0 / 500</div>
        </div>
      </div>
    `;
    const field = container.querySelector('.form-field');
    new FormControl(field);
    return container;
  },
};

export const Select = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '400px';
    container.innerHTML = `
      <div class="form-field form-field--floating">
        <label for="category">Kategorija</label>
        <div class="form-field__input-wrapper">
          <select id="category" name="category" required>
            <option value="" disabled selected hidden>Izaberite kategoriju</option>
            <option value="muska">Muška garderoba</option>
            <option value="zenska">Ženska garderoba</option>
            <option value="dukseri">Duksevi</option>
          </select>
          <div class="form-field__error" data-error></div>
        </div>
      </div>
    `;
    const field = container.querySelector('.form-field');
    new FormControl(field);
    return container;
  },
};

export const Checkbox = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '400px';
    container.innerHTML = `
      <div class="form-field form-field--checkbox">
        <div class="checkbox-wrapper">
          <input type="checkbox" id="terms" name="terms" value="true" required>
          <label class="checkbox-label" for="terms">
            <span class="checkbox-input">
              <svg class="checkbox-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <span class="checkbox-text">Prihvatao sam <a href="/terms.html">uslove korišćenja</a> i <a href="/privacy.html">politiku privatnosti</a> <span class="required" aria-hidden="true">*</span></span>
          </label>
        </div>
        <div class="form-field__error" data-error></div>
      </div>
    `;
    const field = container.querySelector('.form-field');
    new FormControl(field);
    return container;
  },
};

export const RadioGroup = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '400px';
    container.innerHTML = `
      <fieldset class="form-field form-field--radio-group">
        <legend>Izaberite način plaćanja</legend>
        <div class="radio-group">
          <div class="radio-option">
            <div class="radio-wrapper">
              <input type="radio" name="payment" id="payment-card" value="card" checked>
              <label class="radio-label" for="payment-card">
                <span class="radio-input">
                  <svg class="radio-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="7"/></svg>
                </span>
                <span class="radio-text">Kartica</span>
              </label>
            </div>
          </div>
          <div class="radio-option">
            <div class="radio-wrapper">
              <input type="radio" name="payment" id="payment-cash" value="cash">
              <label class="radio-label" for="payment-cash">
                <span class="radio-input">
                  <svg class="radio-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="7"/></svg>
                </span>
                <span class="radio-text">Gotovina pri preuzimanju</span>
              </label>
            </div>
          </div>
          <div class="radio-option">
            <div class="radio-wrapper">
              <input type="radio" name="payment" id="payment-crypto" value="crypto">
              <label class="radio-label" for="payment-crypto">
                <span class="radio-input">
                  <svg class="radio-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="7"/></svg>
                </span>
                <span class="radio-text">Kripto (15% popust)</span>
              </label>
            </div>
          </div>
        </div>
      </fieldset>
    `;
    const field = container.querySelector('.form-field');
    new FormControl(field);
    return container;
  },
};

export const Switch = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '400px';
    container.innerHTML = `
      <div class="form-field form-field--switch">
        <div class="switch-wrapper">
          <input type="checkbox" id="marketing" name="marketing" role="switch" aria-checked="false">
          <label class="switch-label" for="marketing">
            <span class="switch-track">
              <span class="switch-thumb" aria-hidden="true"></span>
            </span>
            <span class="switch-text">Želim da primam promocije i novosti</span>
          </label>
        </div>
        <div class="form-field__helper">Možete se odjaviti u bilo kom trenutku</div>
      </div>
    `;
    const field = container.querySelector('.form-field');
    new FormControl(field);
    return container;
  },
};

export const OTP = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '400px';
    container.innerHTML = `
      <div class="form-field form-field--otp">
        <label for="otp">Unesite 6-cifreni kod</label>
        <div class="otp-inputs" role="group" aria-label="Unesite kod verifikacije">
          <input type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="one-time-code" required data-index="0" aria-label="Cifra 1">
          <input type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="one-time-code" required data-index="1" aria-label="Cifra 2">
          <input type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="one-time-code" required data-index="2" aria-label="Cifra 3">
          <input type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="one-time-code" required data-index="3" aria-label="Cifra 4">
          <input type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="one-time-code" required data-index="4" aria-label="Cifra 5">
          <input type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="one-time-code" required data-index="5" aria-label="Cifra 6">
        </div>
        <input type="hidden" name="otp" id="otp-hidden">
        <div class="form-field__error" data-error></div>
        <div class="form-field__helper">Kod je poslat na vaš email/telefon</div>
      </div>
    `;
    const field = container.querySelector('.form-field');
    new FormControl(field);
    return container;
  },
};

export const PasswordToggle = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '400px';
    container.innerHTML = `
      <div class="form-field form-field--floating">
        <label for="password">Lozinka</label>
        <div class="password-input-wrapper">
          <input type="password" id="password" name="password" required autocomplete="current-password" placeholder="Unesite lozinku" minlength="6" aria-describedby="passwordHelp">
          <button type="button" class="password-toggle" onclick="togglePassword('password', this)" aria-label="Prikaži/skrij lozinku" aria-pressed="false">
            <span class="eye-icon" aria-hidden="true">👁</span>
          </button>
        </div>
        <div class="form-field__error" data-error></div>
        <small id="passwordHelp" class="form-hint">Minimalno 6 karaktera</small>
      </div>
    `;
    const field = container.querySelector('.form-field');
    new FormControl(field);
    return container;
  },
};

export const CompleteForm = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '500px';
    container.innerHTML = `
      <form class="auth-form" novalidate>
        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group form-field form-field--floating">
            <label for="firstName">Ime *</label>
            <input type="text" id="firstName" name="firstName" required autocomplete="given-name" placeholder="Ime">
          </div>
          <div class="form-group form-field form-field--floating">
            <label for="lastName">Prezime *</label>
            <input type="text" id="lastName" name="lastName" required autocomplete="family-name" placeholder="Prezime">
          </div>
        </div>
        <div class="form-group form-field form-field--floating">
          <label for="username">Korisničko ime *</label>
          <input type="text" id="username" name="username" required autocomplete="username" placeholder="Korisničko ime" minlength="3" maxlength="20" pattern="[a-zA-Z0-9_]+">
        </div>
        <div class="form-group form-field form-field--floating">
          <label for="email">Email *</label>
          <input type="email" id="email" name="email" required autocomplete="email" placeholder="Email adresa">
        </div>
        <div class="form-group form-field form-field--floating">
          <label for="phone">Telefon</label>
          <input type="tel" id="phone" name="phone" autocomplete="tel" placeholder="+381 6x xxx xxxx">
        </div>
        <div class="form-group form-field form-field--floating">
          <label for="password">Lozinka *</label>
          <div class="password-input-wrapper">
            <input type="password" id="password" name="password" required autocomplete="new-password" placeholder="Min. 6 karaktera" minlength="6" aria-describedby="regPasswordHelp">
            <button type="button" class="password-toggle" onclick="togglePassword('regPassword', this)" aria-label="Prikaži/skrij lozinku" aria-pressed="false">
              <span class="eye-icon" aria-hidden="true">👁</span>
            </button>
          </div>
          <small id="regPasswordHelp" class="form-hint">Minimalno 6 karaktera</small>
        </div>
        <div class="form-group form-field form-field--floating">
          <label for="confirmPassword">Potvrdi lozinku *</label>
          <input type="password" id="confirmPassword" name="confirmPassword" required autocomplete="new-password" placeholder="Ponovite lozinku">
        </div>
        <div class="form-group" style="margin-top: 24px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; color: var(--color-text);">
            <input type="checkbox" id="marketingConsent" name="marketingConsent" autocomplete="off">
            <span>Želim da primam promocije i novosti na email</span>
          </label>
        </div>
        <button type="submit" class="btn btn-primary btn-block btn-lg">Registruj se</button>
        <p class="auth-switch" style="margin-top: 16px; text-align: center; font-size: 0.9rem; color: var(--color-text-light);">
          Već imate nalog? <button type="button" class="auth-link" style="background: none; border: none; color: var(--primary); font-weight: 600; cursor: pointer; padding: 0;">Prijavite se</button>
        </p>
      </form>
    `;
    const fields = container.querySelectorAll('.form-field');
    fields.forEach(field => new FormControl(field));
    return container;
  },
};

export const ValidationStates = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = 'var(--space-6)';
    container.style.maxWidth = '400px';
    
    const states = [
      { label: 'Valid', valid: true, value: 'valid@email.com' },
      { label: 'Invalid', valid: false, value: 'invalid', error: 'Format email adrese nije validan' },
      { label: 'Required (empty)', valid: false, value: '', error: 'Polje je obavezno' },
      { label: 'Disabled', valid: true, value: 'disabled@email.com', disabled: true },
    ];
    
    states.forEach(({ label, valid, value, error, disabled }) => {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.gap = 'var(--space-2)';
      
      const labelEl = document.createElement('label');
      labelEl.textContent = label;
      labelEl.style.fontWeight = '600';
      labelEl.style.fontSize = 'var(--fs-sm)';
      
      const fieldDiv = document.createElement('div');
      fieldDiv.className = `form-field ${valid ? 'form-field--valid' : 'form-field--invalid'} ${disabled ? 'form-field--disabled' : ''}`;
      fieldDiv.innerHTML = `
        <label for="test-${label.toLowerCase()}">${label}</label>
        <input type="text" id="test-${label.toLowerCase()}" ${value ? `value="${value}"` : ''} ${disabled ? 'disabled' : ''} ${!valid && !disabled ? 'aria-invalid="true"' : ''}>
        ${error ? `<div class="form-field__error" style="display: block;">${error}</div>` : '<div class="form-field__error" data-error></div>'}
      `;
      
      wrapper.appendChild(labelEl);
      wrapper.appendChild(fieldDiv);
      container.appendChild(wrapper);
    });
    
    // Initialize form controls
    setTimeout(() => {
      container.querySelectorAll('.form-field').forEach(field => {
        new FormControl(field);
      });
    }, 0);
    
    return container;
  },
};