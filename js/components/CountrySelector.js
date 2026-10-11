/**
 * Country Selector Component
 * Elegant country/region selector with currency and language detection
 * Luxury UX - seamless, no page reload feel
 */

import {
  getEnabledCountries,
  getCurrentCountry,
  setCurrentCountry,
  getCurrentCurrency,
  setCurrentCurrency,
  getCurrentLanguage,
  setCurrentLanguage,
  getLanguagesForCountry,
  getCurrencyConfig,
  formatPrice
} from '../services/global-commerce.js';

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

let _selectorInstance = null;
let _isOpen = false;
let _currentCountryCode = null;

export function createCountrySelector(options = {}) {
  const {
    triggerSelector = '[data-action="country-selector"]',
    containerSelector = '#country-selector-container',
    onChange = null,
    showCurrency = true,
    showLanguage = true,
    position = 'bottom-end'
  } = options;

  if (_selectorInstance) {
    destroyCountrySelector();
  }

  const trigger = document.querySelector(triggerSelector);
  if (!trigger) return null;

  const container = document.querySelector(containerSelector) || createContainer(containerSelector);

  _currentCountryCode = getCurrentCountry();
  const countries = getEnabledCountries();
  const currentCountry = countries.find(c => c.code === _currentCountryCode) || countries[0];
  const currentCurrency = getCurrencyConfig(getCurrentCurrency());
  const currentLanguage = getLanguagesForCountry(_currentCountryCode).find(l => l.code === getCurrentLanguage()) || { code: 'en', nameLocal: 'English' };

  function createContainer(selector) {
    const div = document.createElement('div');
    div.id = selector.replace('#', '');
    div.style.cssText = 'position: fixed; z-index: 9999;';
    document.body.appendChild(div);
    return div;
  }

  function render() {
    const currentCountry = countries.find(c => c.code === _currentCountryCode) || countries[0];
    const currentCurrency = getCurrencyConfig(getCurrentCurrency());
    const languages = getLanguagesForCountry(_currentCountryCode);
    const currentLanguage = languages.find(l => l.code === getCurrentLanguage()) || { code: 'en', nameLocal: 'English' };

    // Determine flag emoji for country
    const countryFlags = {
      'RS': '🇷🇸', 'BA': '🇧🇦', 'ME': '🇲🇪', 'HR': '🇭🇷', 'MK': '🇲🇰', 'SI': '🇸🇮',
      'DE': '🇩🇪', 'AT': '🇦🇹', 'CH': '🇨🇭', 'FR': '🇫🇷', 'IT': '🇮🇹', 'GB': '🇬🇧',
      'US': '🇺🇸', 'AE': '🇦🇪'
    };

    const countryGroups = {
      'Balkans': ['RS', 'BA', 'ME', 'HR', 'MK', 'SI'],
      'DACH': ['DE', 'AT', 'CH'],
      'Western Europe': ['FR', 'IT'],
      'United Kingdom': ['GB'],
      'North America': ['US'],
      'Middle East': ['AE']
    };

    let countryListHtml = '';
    for (const [group, codes] of Object.entries(countryGroups)) {
      const groupCountries = countries.filter(c => codes.includes(c.code) && c.enabled);
      if (groupCountries.length === 0) continue;

      countryListHtml += `
        <div class="country-group" style="margin-bottom: var(--space-4);">
          <div class="country-group-label" style="font-size: var(--text-xs); font-weight: var(--font-bold); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-tertiary); padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-2);">${escapeHtml(group)}</div>
          <div class="country-list" style="display: flex; flex-direction: column; gap: var(--space-1);">
            ${groupCountries.map(country => `
              <button type="button" class="country-option ${country.code === _currentCountryCode ? 'active' : ''}" 
                data-country="${country.code}" 
                style="
                  display: flex;
                  align-items: center;
                  gap: var(--space-3);
                  width: 100%;
                  padding: var(--space-3) var(--space-4);
                  background: ${country.code === _currentCountryCode ? 'var(--color-primary-bg, #fef3c7)' : 'transparent'};
                  border: ${country.code === _currentCountryCode ? '1px solid var(--color-primary)' : '1px solid var(--color-border)'};
                  border-radius: var(--radius-md);
                  cursor: pointer;
                  text-align: left;
                  transition: all var(--duration-fast);
                  color: ${country.code === _currentCountryCode ? 'var(--color-primary)' : 'var(--color-text)'};
                "
                onmouseover="this.style.background='var(--color-primary-bg, #fef3c7)'; this.style.borderColor='var(--color-primary)'"
                onmouseout="this.style.background='${country.code === _currentCountryCode ? 'var(--color-primary-bg, #fef3c7)' : 'transparent'}'; this.style.borderColor='${country.code === _currentCountryCode ? 'var(--color-primary)' : 'var(--color-border)'}';"
              >
                <span style="font-size: 1.5rem;">${countryFlags[country.code] || '🏳️'}</span>
                <div style="flex: 1;">
                  <div style="font-weight: var(--font-medium); font-size: var(--text-sm);">${escapeHtml(country.nameLocal || country.name)}</div>
                  <div style="font-size: var(--text-xs); color: var(--color-text-tertiary);">${escapeHtml(country.currency)} • ${country.languages?.join(', ') || ''}</div>
                </div>
                ${country.code === _currentCountryCode ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-primary);"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    const currencyOptions = getEnabledCurrencies().map(curr => {
      const isCurrent = curr.code === getCurrentCurrency();
      return `
        <button type="button" class="currency-option ${isCurrent ? 'active' : ''}" 
          data-currency="${curr.code}"
          style="
            display: flex;
            align-items: center;
            gap: var(--space-3);
            width: 100%;
            padding: var(--space-2) var(--space-3);
            background: ${isCurrent ? 'var(--color-primary-bg, #fef3c7)' : 'transparent'};
            border: ${isCurrent ? '1px solid var(--color-primary)' : '1px solid var(--color-border)'};
            border-radius: var(--radius-md);
            cursor: pointer;
            text-align: left;
            transition: all var(--duration-fast);
            color: ${isCurrent ? 'var(--color-primary)' : 'var(--color-text)'};
          "
          onmouseover="this.style.background='var(--color-primary-bg, #fef3c7)'; this.style.borderColor='var(--color-primary)'"
          onmouseout="this.style.background='${isCurrent ? 'var(--color-primary-bg, #fef3c7)' : 'transparent'}'; this.style.borderColor='${isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}';"
        >
          <span style="font-weight: var(--font-semibold);">${curr.symbol || curr.code}</span>
          <span style="flex: 1; text-align: right; font-size: var(--text-sm); color: var(--color-text-tertiary);">${escapeHtml(curr.name)}</span>
          ${isCurrent ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-primary);"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </button>
      `;
    }).join('');

    const languageOptions = languages.map(lang => {
      const isCurrent = lang.code === getCurrentLanguage();
      return `
        <button type="button" class="language-option ${isCurrent ? 'active' : ''}" 
          data-language="${lang.code}"
          style="
            display: flex;
            align-items: center;
            gap: var(--space-3);
            width: 100%;
            padding: var(--space-2) var(--space-3);
            background: ${isCurrent ? 'var(--color-primary-bg, #fef3c7)' : 'transparent'};
            border: ${isCurrent ? '1px solid var(--color-primary)' : '1px solid var(--color-border)'};
            border-radius: var(--radius-md);
            cursor: pointer;
            text-align: left;
            transition: all var(--duration-fast);
            color: ${isCurrent ? 'var(--color-primary)' : 'var(--color-text)'};
          "
          onmouseover="this.style.background='var(--color-primary-bg, #fef3c7)'; this.style.borderColor='var(--color-primary)'"
          onmouseout="this.style.background='${isCurrent ? 'var(--color-primary-bg, #fef3c7)' : 'transparent'}'; this.style.borderColor='${isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}';"
        >
          <div style="font-weight: var(--font-medium);">${escapeHtml(lang.nameLocal)}</div>
          <span style="flex: 1; text-align: right; font-size: var(--text-xs); color: var(--color-text-tertiary);">${lang.code}</span>
          ${isCurrent ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-primary);"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </button>
      `;
    }).join('');

    container.innerHTML = `
      <div class="country-selector-backdrop" style="
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        z-index: 9998;
        opacity: 0;
        transition: opacity var(--duration-fast);
      "></div>
      <div class="country-selector-panel" style="
        position: fixed;
        ${position.includes('bottom') ? 'bottom: var(--space-4);' : 'top: var(--space-4);'}
        ${position.includes('end') ? 'right: var(--space-4);' : 'left: var(--space-4);'}
        z-index: 9999;
        max-width: 400px;
        max-height: 80vh;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-xl);
        overflow: hidden;
        transform: translateY(20px);
        opacity: 0;
        transition: all var(--duration-normal);
      ">
        <div class="country-selector-header" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4);
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg);
        ">
          <h3 style="margin: 0; font-size: var(--text-lg); font-weight: var(--font-semibold);">Region & Currency</h3>
          <button type="button" class="country-selector-close" style="
            width: 32px;
            height: 32px;
            border: none;
            background: transparent;
            border-radius: var(--radius-md);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--color-text-tertiary);
            transition: all var(--duration-fast);
          " onmouseover="this.style.background='var(--color-bg-hover)'; this.style.color='var(--color-text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--color-text-tertiary)'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="country-selector-tabs" style="
          display: flex;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg);
        ">
          <button type="button" class="country-tab active" data-tab="countries" style="
            flex: 1;
            padding: var(--space-3);
            border: none;
            background: transparent;
            font-size: var(--text-sm);
            font-weight: var(--font-medium);
            color: var(--color-primary);
            border-bottom: 2px solid var(--color-primary);
            cursor: pointer;
          ">🌍 Countries</button>
          ${showCurrency ? `<button type="button" class="country-tab" data-tab="currencies" style="
            flex: 1;
            padding: var(--space-3);
            border: none;
            background: transparent;
            font-size: var(--text-sm);
            font-weight: var(--font-medium);
            color: var(--color-text-tertiary);
            border-bottom: 2px solid transparent;
            cursor: pointer;
          ">💰 Currency</button>` : ''}
          ${showLanguage ? `<button type="button" class="country-tab" data-tab="languages" style="
            flex: 1;
            padding: var(--space-3);
            border: none;
            background: transparent;
            font-size: var(--text-sm);
            font-weight: var(--font-medium);
            color: var(--color-text-tertiary);
            border-bottom: 2px solid transparent;
            cursor: pointer;
          ">🌐 Language</button>` : ''}
        </div>

        <div class="country-selector-content" style="padding: var(--space-4); max-height: 60vh; overflow-y: auto;">
          <div class="tab-panel active" data-panel="countries" style="display: block;">
            ${countryListHtml}
          </div>
          ${showCurrency ? `<div class="tab-panel" data-panel="currencies" style="display: none;">
            <div style="display: flex; flex-direction: column; gap: var(--space-1);">
              ${currencyOptions}
            </div>
          </div>` : ''}
          ${showLanguage ? `<div class="tab-panel" data-panel="languages" style="display: none;">
            <div style="display: flex; flex-direction: column; gap: var(--space-1);">
              ${languageOptions}
            </div>
          </div>` : ''}
        </div>

        <div class="country-selector-footer" style="
          padding: var(--space-3) var(--space-4);
          border-top: 1px solid var(--color-border);
          background: var(--color-bg);
          display: flex;
          justify-content: flex-end;
          gap: var(--space-2);
        ">
          <span style="font-size: var(--text-xs); color: var(--color-text-tertiary); align-self: center;">
            Current: ${escapeHtml(currentCountry.nameLocal)} • ${currentCurrency.symbol} • ${currentLanguage.nameLocal}
          </span>
        </div>
      </div>
    `;

    // Animate in
    requestAnimationFrame(() => {
      const backdrop = container.querySelector('.country-selector-backdrop');
      const panel = container.querySelector('.country-selector-panel');
      if (backdrop) backdrop.style.opacity = '1';
      if (panel) {
        panel.style.transform = 'translateY(0)';
        panel.style.opacity = '1';
      }
    });

    bindEvents();
  }

  function bindEvents() {
    // Close handlers
    const closeBtn = container.querySelector('.country-selector-close');
    const backdrop = container.querySelector('.country-selector-backdrop');
    const panel = container.querySelector('.country-selector-panel');

    function close() {
      backdrop.style.opacity = '0';
      panel.style.transform = 'translateY(20px)';
      panel.style.opacity = '0';
      setTimeout(() => {
        container.innerHTML = '';
        _isOpen = false;
      }, 200);
    }

    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);

    // Tab switching
    container.querySelectorAll('.country-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.country-tab').forEach(t => {
          t.classList.remove('active');
          t.style.color = 'var(--color-text-tertiary)';
          t.style.borderBottomColor = 'transparent';
        });
        tab.classList.add('active');
        tab.style.color = 'var(--color-primary)';
        tab.style.borderBottomColor = 'var(--color-primary)';

        const targetPanel = tab.dataset.tab;
        container.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
        container.querySelector(`.tab-panel[data-panel="${targetPanel}"]`).style.display = 'block';
      });
    });

    // Country selection
    container.querySelectorAll('.country-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const countryCode = btn.dataset.country;
        await handleCountryChange(countryCode);
        close();
      });
    });

    // Currency selection
    container.querySelectorAll('.currency-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const currencyCode = btn.dataset.currency;
        handleCurrencyChange(currencyCode);
      });
    });

    // Language selection
    container.querySelectorAll('.language-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const languageCode = btn.dataset.language;
        handleLanguageChange(languageCode);
      });
    });

    // Keyboard navigation
    document.addEventListener('keydown', handleKeydown);
    function handleKeydown(e) {
      if (e.key === 'Escape') close();
    }
  }

  async function handleCountryChange(countryCode) {
    const success = setCurrentCountry(countryCode);
    if (!success) return;

    _currentCountryCode = countryCode;
    _isOpen = true; // Keep open to show currency/language for new country

    // Trigger custom event
    window.dispatchEvent(new CustomEvent('dalli:country:change', {
      detail: { country: countryCode, previousCountry: _currentCountryCode }
    }));

    // Re-render with new country's currencies/languages
    if (onChange) onChange({ country: countryCode });

    // Re-render selector
    render();
  }

  function handleCurrencyChange(currencyCode) {
    setCurrentCurrency(currencyCode);
    window.dispatchEvent(new CustomEvent('dalli:currency:change', {
      detail: { currency: currencyCode }
    }));
    render();
  }

  function handleLanguageChange(languageCode) {
    setCurrentLanguage(languageCode);
    window.dispatchEvent(new CustomEvent('dalli:language:change', {
      detail: { language: languageCode }
    }));
    render();
  }

  function open() {
    if (_isOpen) return;
    _isOpen = true;
    render();
  }

  function close() {
    const backdrop = container.querySelector('.country-selector-backdrop');
    const panel = container.querySelector('.country-selector-panel');
    if (backdrop && panel) {
      backdrop.style.opacity = '0';
      panel.style.transform = 'translateY(20px)';
      panel.style.opacity = '0';
      setTimeout(() => {
        container.innerHTML = '';
        _isOpen = false;
      }, 200);
    }
  }

  function destroy() {
    close();
    _selectorInstance = null;
  }

  // Bind trigger
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (_isOpen) close();
    else open();
  });

  _selectorInstance = { open, close, destroy, render };
  return _selectorInstance;
}

export function destroyCountrySelector() {
  if (_selectorInstance) {
    _selectorInstance.destroy();
    _selectorInstance = null;
  }
}

export function getCountrySelectorInstance() {
  return _selectorInstance;
}

// Auto-initialize if trigger exists
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const trigger = document.querySelector('[data-action="country-selector"]');
    if (trigger) {
      createCountrySelector();
    }
  });
}

export default {
  createCountrySelector,
  destroyCountrySelector,
  getCountrySelectorInstance
};