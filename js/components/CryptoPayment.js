export class CryptoPayment {
  constructor(options = {}) {
    this.timerElement = document.getElementById(options.timerId || 'cryptoTimer');
    this.timerDuration = options.duration || 30 * 60 * 1000; // 30 minutes default
    this.endTime = null;
    this.timerInterval = null;
    this.onExpire = options.onExpire || (() => {});
    this.isRunning = false;
    this.startTime = null;
  }

  start(duration = null) {
    if (duration) {
      this.timerDuration = duration;
    }
    
    this.startTime = Date.now();
    this.endTime = this.startTime + this.timerDuration;
    this.isRunning = true;
    
    this.updateDisplay();
    this.startTimer();
  }

  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.timerInterval = setInterval(() => {
      if (!this.isRunning) return;
      
      const remaining = this.endTime - Date.now();
      
      if (remaining <= 0) {
        this.expire();
        return;
      }
      
      this.updateDisplay(remaining);
    }, 1000);
  }

  updateDisplay(remaining = null) {
    if (!this.timerElement) return;
    
    if (remaining === null) {
      remaining = this.endTime - Date.now();
    }
    
    if (remaining <= 0) {
      this.timerElement.textContent = '00:00';
      this.timerElement.classList.add('expired');
      return;
    }
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    this.timerElement.textContent = formatted;
    
    // Add warning class when under 5 minutes
    if (remaining <= 5 * 60 * 1000) {
      this.timerElement.classList.add('warning');
    }
    
    if (remaining <= 60 * 1000) {
      this.timerElement.classList.add('critical');
    }
  }

  expire() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    if (this.timerElement) {
      this.timerElement.textContent = '00:00';
      this.timerElement.classList.add('expired');
    }
    
    this.onExpire();
  }

  pause() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resume() {
    if (!this.isRunning && this.endTime > Date.now()) {
      this.isRunning = true;
      this.startTimer();
    }
  }

  reset(duration = null) {
    this.stop();
    if (duration) {
      this.timerDuration = duration;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.endTime = null;
    this.startTime = null;
    
    if (this.timerElement) {
      this.timerElement.textContent = this.formatTime(this.timerDuration);
      this.timerElement.classList.remove('warning', 'critical', 'expired');
    }
  }

  formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getRemainingTime() {
    if (!this.endTime) return 0;
    return Math.max(0, this.endTime - Date.now());
  }

  isExpired() {
    return this.endTime && Date.now() >= this.endTime;
  }

  destroy() {
    this.stop();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}

// Crypto amount calculator with exchange rates
export class CryptoAmountCalculator {
  constructor(options = {}) {
    this.currencySelect = document.getElementById(options.currencyId || 'cryptoCurrency');
    this.amountRSDInput = document.getElementById(options.amountRSDId || 'cryptoAmountRSD');
    this.amountCryptoInput = document.getElementById(options.amountCryptoId || 'cryptoAmountCrypto');
    this.currencyLabel = document.getElementById(options.currencyLabelId || 'cryptoCurrencyLabel');
    this.amountRSDDisplay = document.getElementById(options.amountRSDDisplayId || 'cryptoAmountRSD');
    this.amountCryptoDisplay = document.getElementById(options.amountCryptoDisplayId || 'cryptoAmountCrypto');
    this.currencyLabelDisplay = document.getElementById(options.currencyLabelDisplayId || 'cryptoCurrencyLabel');
    this.manualInput = document.getElementById(options.manualInputId || 'cryptoAmountManual');
    
    // Exchange rates (in production, fetch from API)
    this.exchangeRates = {
      USDT: 110,    // 1 USDT = 110 RSD
      USDC: 110,    // 1 USDC = 110 RSD
      ETH: 350000,  // 1 ETH = 350,000 RSD
      BTC: 5500000  // 1 BTC = 5,500,000 RSD
    };
    
    // Wallet addresses (in production, generate per session)
    this.walletAddresses = {
      USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      USDC: '0xA0b86a33E6417b8F9e98C4C5e40e10F3E3C18E5a',
      ETH: '0x742d35Cc6634C0532925a3b8D4C05386b74f4d6',
      BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
    };

    this.currentCurrency = 'USDT';
    this.subtotalRSD = 0;
    this.discountPercent = 15;

    this.init();
  }

  init() {
    if (!this.currencySelect) return;

    // Bind events
    if (this.currencySelect) {
      this.currencySelect.addEventListener('change', () => this.update());
    }

    if (this.manualInput) {
      this.manualInput.addEventListener('input', () => this.handleManualInput());
    }

    // Initial calculation
    this.update();
  }

  update() {
    if (!this.currencySelect) return;

    const currency = this.currencySelect.value;
    this.currentCurrency = currency;

    const rate = this.exchangeRates[currency] || 110;
    const walletAddress = this.walletAddresses[currency] || '';

    // Calculate crypto amount from RSD subtotal
    const cryptoAmount = this.subtotalRSD / rate;

    // Update displays
    if (this.amountRSDDisplay) this.amountRSDDisplay.textContent = `${this.subtotalRSD.toLocaleString('sr-RS')} RSD`;
    if (this.amountCryptoDisplay) this.amountCryptoDisplay.textContent = cryptoAmount.toFixed(currency === 'BTC' ? 8 : 4);
    if (this.currencyLabelDisplay) this.currencyLabelDisplay.textContent = currency;
    if (this.currencyLabel) this.currencyLabel.textContent = currency;

    // Update hidden inputs
    const amountRSDInput = document.getElementById('cryptoAmountRSDInput') || document.getElementById('cryptoAmountRSD');
    const amountCryptoInput = document.getElementById('cryptoAmountCryptoInput') || document.getElementById('cryptoAmountCrypto');
    const currencyInput = document.getElementById('cryptoCurrencyInput') || document.getElementById('cryptoCurrency');
    const rateInput = document.getElementById('cryptoExchangeRateInput') || document.getElementById('cryptoExchangeRate');
    const walletInput = document.getElementById('cryptoWalletAddressInput') || document.getElementById('cryptoWalletAddress');

    if (amountRSDInput) amountRSDInput.value = this.subtotalRSD;
    if (amountCryptoInput) amountCryptoInput.value = cryptoAmount.toFixed(currency === 'BTC' ? 8 : 4);
    if (currencyInput) currencyInput.value = currency;
    if (rateInput) rateInput.value = rate;
    if (walletInput) walletInput.value = this.walletAddresses[currency] || '';

    // Update QR code
    this.updateQRCode(currency);

    // Update wallet address display
    const addressEl = document.getElementById('cryptoWalletAddress');
    if (addressEl) addressEl.textContent = walletAddress;

    // Update summary amounts
    const summaryCrypto = document.getElementById('summaryAmountCrypto');
    const summaryCurrency = document.getElementById('summaryCurrency');
    const summaryRSD = document.getElementById('summaryAmountRSD');

    if (summaryCrypto) summaryCrypto.textContent = cryptoAmount.toFixed(currency === 'BTC' ? 8 : 4);
    if (summaryCurrency) summaryCurrency.textContent = currency;
    if (summaryRSD) summaryRSD.textContent = `${this.subtotalRSD.toLocaleString('sr-RS')} RSD`;

    // Update wallet address input
    const walletAddressInput = document.getElementById('cryptoWalletAddressInput');
    if (walletAddressInput) walletAddressInput.value = walletAddress;

    // Update crypto currency input
    const currencyInputEl = document.getElementById('cryptoCurrencyInput');
    if (currencyInputEl) currencyInputEl.value = currency;

    // Update exchange rate input
    const exchangeRateInput = document.getElementById('cryptoExchangeRateInput');
    if (exchangeRateInput) exchangeRateInput.value = rate;
  }

  handleManualInput() {
    if (!this.manualInput) return;
    
    const value = parseFloat(this.manualInput.value);
    if (isNaN(value) || value < 1000) return;

    this.subtotalRSD = value;
    this.update();
  }

  setSubtotal(rsd) {
    this.subtotalRSD = rsd;
    this.update();
  }

  updateQRCode(currency) {
    const qrCodeImg = document.getElementById('cryptoQRCode');
    const walletAddress = this.walletAddresses[currency] || '';
    const amount = (this.subtotalRSD / (this.exchangeRates[currency] || 110)).toFixed(currency === 'BTC' ? 8 : 4);
    
    if (qrCodeImg && walletAddress) {
      // In production, use a proper QR code library
      // For now, using a placeholder QR code service
      const paymentURI = this.buildPaymentURI(currency, walletAddress, this.subtotalRSD / (this.exchangeRates[currency] || 110));
      qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentURI)}`;
      qrCodeImg.alt = `QR kod za ${currency} plaćanje`;
    }
  }

  buildPaymentURI(currency, address, amount) {
    const prefixes = {
      BTC: 'bitcoin:',
      ETH: 'ethereum:',
      USDT: 'tron:',
      USDC: 'tron:'
    };

    const prefix = prefixes[currency] || '';
    const params = new URLSearchParams();
    params.set('amount', amount.toFixed(currency === 'BTC' ? 8 : 4));
    
    return `${prefix}${address}?${params.toString()}`;
  }

  setSubtotal(rsd) {
    this.subtotalRSD = rsd;
    this.update();
  }

  getSubtotal() {
    return this.subtotalRSD;
  }
}

// QR Code modal for enlarged view
export function initQRCodeModal() {
  const openBtn = document.getElementById('openQRBtn');
  const qrCodeImg = document.getElementById('cryptoQRCode');

  if (!openBtn || !qrCodeImg) return;

  openBtn.addEventListener('click', () => {
    const modal = document.createElement('div');
    modal.className = 'qr-modal';
    modal.innerHTML = `
      <div class="qr-modal__backdrop" data-close></div>
      <div class="qr-modal__content">
        <button class="qr-modal__close" aria-label="Zatvori" data-close>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <img src="${qrCodeImg.src}" alt="QR kod za plaćanje" style="max-width: 90vw; max-height: 80vh;">
        <button type="button" class="btn btn-primary" style="margin-top: var(--space-4);" onclick="navigator.clipboard.writeText(document.getElementById('cryptoWalletAddress').textContent); this.textContent='Kopirano!'; setTimeout(() => this.textContent='Kopiraj adresu', 2000);">
          Kopiraj adresu
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Close handlers
    const close = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    modal.querySelector('[data-close]').addEventListener('click', close);
    modal.querySelector('.qr-modal__backdrop').addEventListener('click', close);

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', escHandler);
      }
    });

    // Animate in
    requestAnimationFrame(() => modal.classList.add('open'));
  });
}

// CSS for crypto timer (add to style.css)
/*
.crypto-timer {
  font-family: var(--font-mono, monospace);
  font-weight: var(--fw-bold);
  color: var(--color-primary);
}

.crypto-timer.warning {
  color: var(--color-warning);
  animation: pulse 1s ease-in-out infinite;
}

.crypto-timer.critical {
  color: var(--color-error);
  animation: pulse 0.5s ease-in-out infinite;
}

.crypto-timer.expired {
  color: var(--color-error);
  text-decoration: line-through;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.crypto-detail--warning {
  background: var(--color-warning-light);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.crypto-detail--warning svg {
  flex-shrink: 0;
  color: var(--color-warning);
  margin-top: 2px;
}

.crypto-trust-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.crypto-trust-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.crypto-trust-item svg {
  color: var(--color-primary);
}
*/