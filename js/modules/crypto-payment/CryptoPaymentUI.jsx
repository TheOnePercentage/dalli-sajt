/**
 * Crypto Payment UI Module
 * 
 * Handles all UI rendering and user interactions for the crypto payment modal.
 */

export class CryptoPaymentUI {
  constructor(controller) {
    this.controller = controller;
    this.modal = null;
    this.currentStep = 'idle';
    this.selectedCurrency = 'USDT';
  }

  async init() {
    this._createModal();
  }

  _createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'vto-modal hidden';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'vto-title');
    this.modal.innerHTML = this._getModalHTML();
    document.body.appendChild(this.modal);
    this._bindEvents();
  }

  _getModalHTML() {
    return `
      <div class="vto-modal__backdrop" data-vto-action="close"></div>
      <div class="vto-modal__panel">
        <header class="vto-modal__header">
          <h2 id="vto-title" class="vto-modal__title">Virtual Fitting Room</h2>
          <button class="vto-modal__close" aria-label="Zatvori" data-vto-action="close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <div class="vto-modal__content">
          <!-- Step 1: Currency Selection -->
          <section class="vto-step" data-step="currency" hidden>
            <div class="vto-step__icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <h3>Izaberite kriptovalutu</h3>
            <p>Izaberite valutu kojom želite da platite. Popust od 15% važi za sve valute.</p>
            <div class="vto-currency-grid" id="vto-currency-grid" role="radiogroup" aria-label="Izaberite kriptovalutu"></div>
            <button class="btn btn-primary btn-lg" data-vto-action="select-currency" disabled>Nastavi</button>
          </section>

          <!-- Step 3: Payment Details -->
          <section class="vto-step" data-step="payment" hidden>
            <div class="vto-step__icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>
            </div>
            <h3>Detalji plaćanja</h3>
            <p>Pošaljite tačan iznos na adresu ispod. Plaćanje mora da se complete unutar 30 minuta.</p>
            <div class="vto-payment-details">
              <div class="vto-payment__amount">
                <span class="vto-payment__crypto" id="vto-amount-crypto">0.00</span>
                <span class="vto-payment__currency" id="vto-currency-label">USDT</span>
                <span class="vto-payment__separator">≈</span>
                <span class="vto-payment__rsd" id="vto-amount-rsd">0 RSD</span>
              </div>
              <div class="vto-payment__address">
                <label>Adresa za plaćanje:</label>
                <div class="vto-address-row">
                  <code id="vto-wallet-address" class="vto-address"></code>
                  <button class="vto-btn-copy" data-vto-action="copy-address" aria-label="Kopiraj adresu">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    <span>Kopiraj</span>
                  </button>
                </div>
              </div>
              <div class="vto-payment__qr">
                <label>QR kod:</label>
                <div class="vto-qr-container">
                  <img id="vto-qr-code" alt="QR kod za plaćanje" loading="lazy" width="180" height="180">
                  <button class="vto-btn-expand" data-vto-action="expand-qr" aria-label="Uvećaj QR kod">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/></svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="vto-payment__progress" id="vto-progress" hidden>
              <div class="vto-progress-ring">
                <svg class="vto-progress-svg" viewBox="0 0 64 64">
                  <circle class="vto-progress-bg" cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="4"/>
                  <circle class="vto-progress-bar" cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="176" stroke-dashoffset="176" style="transform: rotate(-90deg); transform-origin: 32px 32px;"/>
                </svg>
                <span class="vto-progress-percent">0%</span>
              </div>
              <p class="vto-progress-message" id="vto-progress-message">Provera plaćanja...</p>
              <div class="vto-progress-steps" id="vto-progress-steps"></div>
            </div>
            <button class="btn btn-secondary" data-vto-action="cancel-payment" hidden>Otkaži</button>
          </section>

          <!-- Trust Signals for Payment Step -->
          <div class="vto-trust-banner" hidden>
            <div class="vto-trust-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>SSL enkripcija i sigurni protokol</span>
            </div>
            <div class="vto-trust-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Ne čuvamo vaše privatne ključeve</span>
            </div>
            <div class="vto-trust-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span>Podrška 24/7 - help@dalli.rs</span>
            </div>
          </div>

          <!-- Step 3b: Confirming (Pending/Confirming) -->
          <section class="vto-step" data-step="confirming" hidden>
            <div class="vto-step__icon vto-step__icon--confirming" aria-hidden="true">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10" stroke-dasharray="62.8" stroke-dashoffset="0" style="animation: vto-spin 2s linear infinite;" fill="none"/>
                <path d="M12 6v6l4 2" stroke-linecap="round" stroke-width="2"/>
              </svg>
              <style>
                @keyframes vto-spin {
                  from { stroke-dashoffset: 62.8; }
                  to { stroke-dashoffset: 0; }
                }
              </style>
            </div>
            <h3>Potvrđujemo plaćanje...</h3>
            <p>Proveravamo blockchain da bismo potvrdili vaše plaćanje. Ovo može potrajati nekoliko minuta.</p>
            <div class="vto-payment__progress" id="vto-confirming-progress">
              <div class="vto-progress-ring">
                <svg class="vto-progress-svg" viewBox="0 0 64 64">
                  <circle class="vto-progress-bg" cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="4"/>
                  <circle class="vto-progress-bar" cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="176" stroke-dashoffset="176" style="transform: rotate(-90deg); transform-origin: 32px 32px;"/>
                </svg>
                <span class="vto-progress-percent" id="vto-confirming-percent">0%</span>
              </div>
              <p class="vto-progress-message" id="vto-confirming-message">Čekanje na potvrdu mreže...</p>
              <div class="vto-progress-steps" id="vto-confirming-steps"></div>
            </div>
            <div class="vto-confirming-info">
              <p><strong>Važno:</strong> Ne zatvarajte ovaj prozor dok se plaćanje ne potvrdi.</p>
              <p>Ako ste već poslali sredstva, mreža će ih obrađivati u narednih par minuta.</p>
            </div>
            <button class="btn btn-secondary" data-vto-action="cancel-payment">Otkaži</button>
          </section>

          <!-- Step 3: Success -->
          <section class="vto-step" data-step="success" hidden>
            <div class="vto-success__icon" aria-hidden="true">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3>Plaćanje potvrđeno!</h3>
            <p class="vto-success__desc">Vaša porudžbina je uspješno plaćena kriptovalutom. Hvala vam na poverenju.</p>
            <div class="vto-success__details">
              <div class="vto-success__item">
                <span class="vto-success__label">Broj porudžbine:</span>
                <span class="vto-success__value" id="vto-order-number">—</span>
              </div>
              <div class="vto-success__item">
                <span class="vto-success__label">Plaćeno:</span>
                <span class="vto-success__value" id="vto-paid-amount">—</span>
              </div>
              <div class="vto-success__item">
                <span class="vto-success__label">Valuta:</span>
                <span class="vto-success__value" id="vto-paid-currency">—</span>
              </div>
              <div class="vto-success__item">
                <span class="vto-success__label">Popust:</span>
                <span class="vto-success__value" style="color: var(--color-success);" id="vto-discount">—</span>
              </div>
            </div>
            <div class="vto-success__actions">
              <button class="btn btn-primary btn-lg" data-vto-action="finish">Završi</button>
              <a href="/account/orders.html" class="btn btn-secondary btn-lg">Pogledaj porudžbinu</a>
            </div>
          </section>

          <!-- Step 4: Error -->
          <section class="vto-step" data-step="error" hidden>
            <div class="vto-error__icon" aria-hidden="true">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <h3>Došlo je do greške</h3>
            <p id="vto-error-message">Pokušajte ponovo ili kontaktirajte podršku.</p>
            <div class="vto-error__actions">
              <button class="btn btn-primary" data-vto-action="retry">Pokušaj ponovo</button>
              <button class="btn btn-secondary" data-vto-action="back">Nazad</button>
            </div>
          </section>

          <!-- Step 5: Expired -->
          <section class="vto-step" data-step="expired" hidden>
            <div class="vto-error__icon" aria-hidden="true">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <h3>Vreme za plaćanje je isteklo</h3>
            <p>Vreme za plaćanje od 30 minuta je isteklo. Molimo vas da pokušate ponovo.</p>
            <div class="vto-error__actions">
              <button class="btn btn-primary" data-vto-action="retry">Pokušaj ponovo</button>
              <button class="btn btn-secondary" data-vto-action="back">Nazad na korpu</button>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  _bindEvents() {
    if (!this.modal) return;

    // Currency selection
    this.modal.querySelectorAll('[data-currency]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._track('currency_selected', { currency: btn.dataset.currency });
        this._selectCurrency(btn.dataset.currency);
      });
    });

    // Actions
    this.modal.querySelector('[data-vto-action="select-currency"]')?.addEventListener('click', () => {
      this.controller.onCurrencySelect(this.selectedCurrency);
    });

    this.modal.querySelector('[data-vto-action="retry"]')?.addEventListener('click', () => {
      this._track('retry_clicked', { step: this.currentStep });
      this.controller.retryPayment();
    });

    this.modal.querySelector('[data-vto-action="cancel-payment"]')?.addEventListener('click', () => {
      this._track('cancel_clicked', { step: this.currentStep });
      this.controller.cancel();
    });

    this.modal.querySelector('[data-vto-action="finish"]')?.addEventListener('click', () => {
      this._track('payment_completed', { orderNumber: this.controller.orderData?.orderNumber });
      this.controller.close();
    });

    this.modal.querySelector('[data-vto-action="back"]')?.addEventListener('click', () => {
      this._track('back_clicked', { fromStep: this.currentStep });
      this.showStep('currency');
    });

    this.modal.querySelector('[data-vto-action="close"]')?.addEventListener('click', () => {
      this._track('modal_closed', { step: this.currentStep });
      this.controller.close();
    });

    this.modal.querySelector('[data-vto-action="close-search"]')?.addEventListener('click', () => {
      this._track('modal_closed_from_search');
      this.controller.close();
    });

    this.modal.querySelector('[data-vto-action="copy-address"]')?.addEventListener('click', () => {
      this._track('address_copied', { paymentId: this.controller.paymentId });
      this.controller.copyAddress();
    });

    this.modal.querySelector('[data-vto-action="expand-qr"]')?.addEventListener('click', () => {
      this._track('qr_expanded', { paymentId: this.controller.paymentId });
      this.controller.openQR();
    });

    this.modal.querySelector('.vto-modal__backdrop')?.addEventListener('click', () => {
      this._track('backdrop_closed');
      this.controller.close();
    });

    // Keyboard
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this._track('escape_pressed', { step: this.currentStep });
        this.controller.close();
      }
    });

    // Currency input change
    const currencySelect = this.modal.querySelector('#vto-currency-select');
    if (currencySelect) {
      currencySelect.addEventListener('change', (e) => {
        this._track('currency_changed', { currency: e.target.value });
        this._selectCurrency(e.target.value);
      });
    }

    // Manual amount input
    const manualInput = this.modal.querySelector('#vto-manual-amount');
    if (manualInput) {
      manualInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        if (val > 0) {
          this.controller.onManualAmountEntered(val);
        }
      });
    }
  }

  _selectCurrency(currency) {
    this.selectedCurrency = currency;
    this.modal.querySelectorAll('[data-currency]').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.currency === currency);
      btn.setAttribute('aria-pressed', btn.dataset.currency === currency);
    });
    
    const nextBtn = this.modal.querySelector('[data-vto-action="select-currency"]');
    if (nextBtn) nextBtn.disabled = false;
  }

  // ==================== PUBLIC API ====================

  openModal() {
    this.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => this.modal.classList.add('open'));
    
    // Focus first focusable element
    setTimeout(() => {
      const firstFocusable = this.modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      firstFocusable?.focus();
    }, 100);
  }

  closeModal() {
    this.modal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => this.modal.classList.add('hidden'), 300);
  }

  showStep(step, data) {
    this.currentStep = step;
    this.modal.querySelectorAll('.vto-step').forEach(el => el.hidden = true);
    const stepEl = this.modal.querySelector(`[data-step="${step}"]`);
    if (stepEl) stepEl.hidden = false;

    if (step === 'payment' && data) {
      this._renderPaymentDetails(data);
    }

    if (step === 'success' && data) {
      this._renderSuccess(data);
    }

    if (step === 'error' && data) {
      const msgEl = this.modal.querySelector('#vto-error-message');
      if (msgEl) msgEl.textContent = data;
    }

    if (step === 'currency') {
      this._renderCurrencyOptions();
    }
  }

  _renderCurrencyOptions() {
    const container = this.modal.querySelector('#vto-currency-grid');
    if (!container) return;

    const currencies = [
      { id: 'PI', name: 'Pi Network (π)', desc: 'Mobilno rudarenje, brz prenos', icon: 'π' },
      { id: 'USDT', name: 'USDT (Tether)', desc: 'Stabilna, 1 USDT ≈ 110 RSD', icon: '💚' },
      { id: 'USDC', name: 'USDC (USD Coin)', desc: 'Stabilna, 1 USDC ≈ 110 RSD', icon: '💙' },
      { id: 'ETH', name: 'Ethereum (ETH)', desc: '~350.000 RSD za 1 ETH', icon: '💎' },
      { id: 'BTC', name: 'Bitcoin (BTC)', desc: '~5.500.000 RSD za 1 BTC', icon: '₿' }
    ];

    container.innerHTML = currencies.map(c => `
      <button 
        type="button" 
        class="vto-currency-option ${this.selectedCurrency === c.id ? 'selected' : ''}" 
        data-currency="${c.id}"
        role="radio"
        aria-checked="${this.selectedCurrency === c.id}"
        tabindex="${this.selectedCurrency === c.id ? '0' : '-1'}"
      >
        <span class="vto-currency-icon" aria-hidden="true">${c.icon}</span>
        <div class="vto-currency-info">
          <strong class="vto-currency-name">${c.name}</strong>
          <span class="vto-currency-desc">${c.desc}</span>
        </div>
      </button>
    `).join('');

    // Re-bind events
    this.modal.querySelectorAll('[data-currency]').forEach(btn => {
      btn.addEventListener('click', () => this._selectCurrency(btn.dataset.currency));
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._selectCurrency(btn.dataset.currency);
        }
      });
    });
  }

  _renderPaymentDetails(data) {
    const cryptoCurrency = this.controller.selectedCurrency || this.selectedCurrency;
    
    const amountRSD = this.modal.querySelector('#vto-amount-rsd');
    const amountCrypto = this.modal.querySelector('#vto-amount-crypto');
    const currencyLabel = this.modal.querySelector('#vto-currency-label');
    const walletAddress = this.modal.querySelector('#vto-wallet-address');
    const qrCode = this.modal.querySelector('#vto-qr-code');

    if (amountRSD) amountRSD.textContent = `${data.amountRSD.toLocaleString('sr-RS')} RSD`;
    if (amountCrypto) amountCrypto.textContent = data.amountCrypto.toFixed(currency === 'BTC' || currency === 'ETH' ? 6 : currency === 'PI' ? 4 : 2);
    if (currencyLabel) currencyLabel.textContent = data.currency;
    if (walletAddress) walletAddress.textContent = data.walletAddress;
    
    // Generate QR code data
    const qrData = `${data.currency.toLowerCase()}:${data.walletAddress}?amount=${data.amountCrypto.toFixed(data.currency === 'BTC' || data.currency === 'ETH' ? 8 : data.currency === 'PI' ? 4 : 2)}`;
    if (qrCode) {
      qrCode.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
      qrCode.alt = `QR kod za ${data.amountCrypto} ${data.currency}`;
    }

    // Update currency labels
    const currencyLabels = this.modal.querySelectorAll('#vto-currency-label, #vto-currency-label');
    currencyLabels.forEach(el => el.textContent = this.selectedCurrency);
  }

  _renderSuccess(data) {
    const orderNumber = this.modal.querySelector('#vto-order-number');
    const paidAmount = this.modal.querySelector('#vto-paid-amount');
    const paidCurrency = this.modal.querySelector('#vto-paid-currency');
    const discount = this.modal.querySelector('#vto-discount');

    if (orderNumber) orderNumber.textContent = data.orderNumber || '—';
    if (paidAmount) paidAmount.textContent = `${data.amountCrypto.toFixed(4)} ${data.currency}`;
    if (paidCurrency) paidCurrency.textContent = data.currency;
    if (discount) discount.textContent = `15% popust (${data.discountAmountRSD?.toLocaleString('sr-RS')} RSD)`;
  }

  updateProgress(percent, message) {
    const bar = this.modal.querySelector('.vto-progress-bar');
    const percentEl = this.modal.querySelector('.vto-progress-percent');
    const msg = this.modal.querySelector('.vto-progress-message');
    
    if (bar) bar.style.strokeDashoffset = 176 * (1 - percent / 100);
    if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
    if (msg && message) msg.textContent = message;

    // Update step indicators
    const stages = [
      { stage: 'creating', progress: 10, message: 'Kreiranje plaćanja...' },
      { stage: 'address_generation', progress: 30, message: 'Analiza pozicije tela...' },
      { stage: 'fitting', progress: 55, message: 'Prilagođavanje odeće...' },
      { stage: 'rendering', progress: 80, message: 'Renderovanje tkanine...' },
      { stage: 'finalizing', progress: 95, message: 'Finishing touches...' },
      { stage: 'complete', progress: 100, message: 'Završeno!' }
    ];

    stages.forEach((stage, i) => {
      const stageEl = this.modal.querySelector(`[data-stage="${stage.stage}"]`);
      if (stageEl) {
        if (percent >= stage.progress) stageEl.classList.add('completed');
        else stageEl.classList.remove('completed');
      }
    });
  }

  showError(message) {
    this.showStep('error', message);
  }

  showToast(message) {
    // Use existing toast system
    window.showToast?.(message, 'info');
  }

  destroy() {
    this.modal?.remove();
    this.modal = null;
  }

  getSelectedCurrency() {
    return this.selectedCurrency;
  }
}

export default CryptoPaymentUI;