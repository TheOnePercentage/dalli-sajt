/**
 * DALLI Market Selector — Country / Currency / Language
 * Integrates with DALLI_I18N and DALLI_COUNTRIES config
 * Vanilla JS Module
 */

export class MarketSelector {
  constructor(options = {}) {
    this.selector = options.selector || '[data-market-selector]';
    this.storageKey = options.storageKey || 'dalli_market';
    this.onChange = options.onChange || (() => {});
    this.countries = [];
    this.currentCountry = null;
    this.isOpen = false;
    this.init();
  }

  async init() {
    this.trigger = document.querySelector(this.selector);
    if (!this.trigger) return;

    this.dropdown = this.trigger.querySelector('[data-market-dropdown]');
    this.flag = this.trigger.querySelector('[data-market-flag]');
    this.code = this.trigger.querySelector('[data-market-code]');
    this.currency = this.trigger.querySelector('[data-market-currency]');
    this.chevron = this.trigger.querySelector('[data-market-chevron]');
    this.list = this.trigger.querySelector('[data-market-list]');
    this.search = this.trigger.querySelector('[data-market-search]');

    await this.loadCountries();
    this.loadPreference();
    this.bindEvents();
    this.render();
    this.updateTrigger();
  }

  async loadCountries() {
    // Try to get from DALLI_COUNTRIES global (loaded via config/countries.js)
    if (window.DALLI_COUNTRIES?.getActiveCountries) {
      this.countries = window.DALLI_COUNTRIES.getActiveCountries();
    } else if (window.DALLI_COUNTRIES?.COUNTRIES) {
      this.countries = Object.values(window.DALLI_COUNTRIES.COUNTRIES).filter(c => c.active);
    } else {
      // Fallback minimal config
      this.countries = [
        { code: 'RS', name: { sr: 'Srbija', en: 'Serbia' }, flag: '🇷🇸', currency: { code: 'RSD', symbol: 'RSD' }, language: { code: 'sr', nativeName: 'Српски' } },
        { code: 'DE', name: { sr: 'Nemačka', en: 'Germany' }, flag: '🇩🇪', currency: { code: 'EUR', symbol: '€' }, language: { code: 'de', nativeName: 'Deutsch' } },
        { code: 'AT', name: { sr: 'Austrija', en: 'Austria' }, flag: '🇦🇹', currency: { code: 'EUR', symbol: '€' }, language: { code: 'de', nativeName: 'Deutsch' } },
        { code: 'FR', name: { sr: 'Francuska', en: 'France' }, flag: '🇫🇷', currency: { code: 'EUR', symbol: '€' }, language: { code: 'fr', nativeName: 'Français' } },
        { code: 'IT', name: { sr: 'Italija', en: 'Italy' }, flag: '🇮🇹', currency: { code: 'EUR', symbol: '€' }, language: { code: 'it', nativeName: 'Italiano' } },
        { code: 'ES', name: { sr: 'Španija', en: 'Spain' }, flag: '🇪🇸', currency: { code: 'EUR', symbol: '€' }, language: { code: 'es', nativeName: 'Español' } },
        { code: 'HR', name: { sr: 'Hrvatska', en: 'Croatia' }, flag: '🇭🇷', currency: { code: 'EUR', symbol: '€' }, language: { code: 'hr', nativeName: 'Hrvatski' } },
        { code: 'BA', name: { sr: 'Bosna i Hercegovina', en: 'Bosnia and Herzegovina' }, flag: '🇧🇦', currency: { code: 'BAM', symbol: 'KM' }, language: { code: 'bs', nativeName: 'Bosanski' } },
        { code: 'ME', name: { sr: 'Crna Gora', en: 'Montenegro' }, flag: '🇲🇪', currency: { code: 'EUR', symbol: '€' }, language: { code: 'sr', nativeName: 'Српски' } },
        { code: 'SI', name: { sr: 'Slovenija', en: 'Slovenia' }, flag: '🇸🇮', currency: { code: 'EUR', symbol: '€' }, language: { code: 'sl', nativeName: 'Slovenščina' } }
      ];
    }
  }

  loadPreference() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      this.currentCountry = this.countries.find(c => c.code === saved) || this.countries[0];
    } else if (window.DALLI_I18N?.getCurrentCountry) {
      const code = window.DALLI_I18N.getCurrentCountry();
      this.currentCountry = this.countries.find(c => c.code === code) || this.countries[0];
    } else {
      this.currentCountry = this.countries[0];
    }
  }

  savePreference() {
    if (this.currentCountry) {
      localStorage.setItem(this.storageKey, this.currentCountry.code);
    }
  }

  selectCountry(countryCode) {
    const country = this.countries.find(c => c.code === countryCode);
    if (!country) return false;

    this.currentCountry = country;
    this.savePreference();
    this.updateTrigger();
    this.close();

    // Sync with i18n system
    if (window.DALLI_I18N?.setCountry) {
      window.DALLI_I18N.setCountry(countryCode).then(() => {
        this.onChange(country, this.currentCountry);
        // Reload page or trigger refresh for currency/language changes
        window.dispatchEvent(new CustomEvent('dalli:marketchange', { detail: { country } }));
      });
    } else {
      this.onChange(country, this.currentCountry);
      window.dispatchEvent(new CustomEvent('dalli:marketchange', { detail: { country } }));
    }
    return true;
  }

  getCurrentCountry() {
    return this.currentCountry;
  }

  getCountries() {
    return this.countries;
  }

  open() {
    this.isOpen = true;
    this.dropdown.hidden = false;
    this.trigger.setAttribute('aria-expanded', 'true');
    this.chevron?.style.setProperty('transform', 'rotate(180deg)');
    this.search?.focus();
    this.renderList();
    document.addEventListener('click', this.handleOutsideClick.bind(this));
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  close() {
    this.isOpen = false;
    this.dropdown.hidden = true;
    this.trigger.setAttribute('aria-expanded', 'false');
    this.chevron?.style.setProperty('transform', 'rotate(0deg)');
    if (this.search) this.search.value = '';
    this.renderList();
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
  }

  toggle() {
    if (this.isOpen) this.close(); else this.open();
  }

  handleOutsideClick(e) {
    if (!this.trigger.contains(e.target)) this.close();
  }

  handleKeydown(e) {
    if (e.key === 'Escape') this.close();
    if (e.key === 'Tab' && !this.dropdown.contains(e.target)) this.close();
  }

  filterList(query) {
    const q = query.toLowerCase().trim();
    if (!q) return this.countries;
    return this.countries.filter(c =>
      (c.name?.sr?.toLowerCase().includes(q)) ||
      (c.name?.en?.toLowerCase().includes(q)) ||
      c.code.toLowerCase().includes(q) ||
      c.currency?.code.toLowerCase().includes(q) ||
      c.language?.code.toLowerCase().includes(q)
    );
  }

  renderList() {
    if (!this.list) return;
    const query = this.search?.value || '';
    const filtered = this.filterList(query);
    const lang = document.documentElement.lang || 'sr';

    this.list.innerHTML = filtered.map(country => {
      const isActive = this.currentCountry?.code === country.code;
      const name = country.name?.[lang] || country.name?.en || country.code;
      const currency = country.currency?.symbol || country.currency?.code;
      const language = country.language?.nativeName || country.language?.code;
      return `
        <button
          class="market-selector__option${isActive ? ' market-selector__option--active' : ''}"
          data-country="${country.code}"
          role="menuitemradio"
          aria-checked="${isActive}"
          tabindex="${isActive ? 0 : -1}"
        >
          <span class="market-selector__option-flag" aria-hidden="true">${country.flag}</span>
          <div class="market-selector__option-info">
            <span class="market-selector__option-name">${name}</span>
            <span class="market-selector__option-meta">${currency} · ${language}</span>
          </div>
          <span class="market-selector__option-check" aria-hidden="true">✓</span>
        </button>
      `;
    }).join('');
  }

  render() {
    this.renderList();
  }

  updateTrigger() {
    if (!this.currentCountry) return;
    const lang = document.documentElement.lang || 'sr';
    const name = this.currentCountry.name?.[lang] || this.currentCountry.name?.en || this.currentCountry.code;
    const currency = this.currentCountry.currency?.symbol || this.currentCountry.currency?.code;
    const currencyCode = this.currentCountry.currency?.code;

    if (this.flag) this.flag.textContent = this.currentCountry.flag;
    if (this.code) this.code.textContent = this.currentCountry.code;
    if (this.currency) this.currency.textContent = `${currency} (${currencyCode})`;
    this.trigger.setAttribute('data-market-current', this.currentCountry.code);
  }

  bindEvents() {
    this.trigger.addEventListener('click', e => {
      if (e.target.closest('[data-market-search]')) return;
      this.toggle();
    });

    this.search?.addEventListener('input', e => this.renderList());
    this.search?.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.close();
    });

    this.list?.addEventListener('click', e => {
      const option = e.target.closest('[data-country]');
      if (option) this.selectCountry(option.dataset.country);
    });

    // Keyboard navigation in list
    this.list?.addEventListener('keydown', e => {
      const options = this.list.querySelectorAll('[data-country]');
      const activeIndex = Array.from(options).findIndex(o => o === document.activeElement);
      if (activeIndex === -1) return;

      let nextIndex = activeIndex;
      if (e.key === 'ArrowDown') nextIndex = (activeIndex + 1) % options.length;
      if (e.key === 'ArrowUp') nextIndex = (activeIndex - 1 + options.length) % options.length;
      if (e.key === 'Home') nextIndex = 0;
      if (e.key === 'End') nextIndex = options.length - 1;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.selectCountry(options[activeIndex].dataset.country);
      }
      if (nextIndex !== activeIndex) {
        e.preventDefault();
        options[nextIndex].focus();
      }
    });
  }

  destroy() {
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
  }
}

// Auto-initialize
export function initMarketSelector(selector = '[data-market-selector]') {
  const trigger = document.querySelector(selector);
  if (trigger && !trigger.dataset.marketSelectorInitialized) {
    trigger.dataset.marketSelectorInitialized = 'true';
    return new MarketSelector({ selector });
  }
  return null;
}

if (typeof window !== 'undefined') {
  window.DALLI_MarketSelector = { MarketSelector, initMarketSelector };
}