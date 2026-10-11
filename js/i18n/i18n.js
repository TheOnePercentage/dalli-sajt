(function() {
    'use strict';

    const I18n = {
        currentLocale: 'sr',
        locales: {},
        fallbackLocale: 'sr',
        supportedLocales: ['sr', 'en', 'ru', 'de', 'tr', 'es', 'it', 'fr'],
        localeChangeCallbacks: [],
        
        localeNames: {
            sr: 'Српски',
            en: 'English',
            ru: 'Русский',
            de: 'Deutsch',
            tr: 'Türkçe',
            es: 'Español',
            it: 'Italiano',
            fr: 'Français'
        },

        init: function() {
            this.currentLocale = localStorage.getItem('locale') || this.detectLocale() || this.fallbackLocale;
            this.loadLocale(this.currentLocale).then(() => {
                this.translatePage();
                this.initLanguageSwitcher();
            });
        },

        detectLocale: function() {
            const browserLang = navigator.language || navigator.userLanguage;
            const shortLang = browserLang.split('-')[0].toLowerCase();
            if (this.supportedLocales.includes(shortLang)) {
                return shortLang;
            }
            return null;
        },

        loadLocale: function(locale) {
            if (this.locales[locale]) {
                return Promise.resolve(this.locales[locale]);
            }

            return fetch(`js/locales/${locale}.json`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load locale: ${locale}`);
                    }
                    return response.json();
                })
                .then(data => {
                    this.locales[locale] = data;
                    return data;
                })
                .catch(error => {
                    console.error(`Error loading locale ${locale}:`, error);
                    if (locale !== this.fallbackLocale) {
                        return this.loadLocale(this.fallbackLocale);
                    }
                    return {};
                });
        },

        t: function(key, params = {}) {
            const locale = this.locales[this.currentLocale] || this.locales[this.fallbackLocale] || {};
            let translation = locale[key] || key;

            Object.keys(params).forEach(param => {
                translation = translation.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), params[param]);
            });

            return translation;
        },

        formatCurrency: function(amount, currency = 'RSD') {
            const localeMap = {
                sr: 'sr-RS',
                en: 'en-US',
                ru: 'ru-RU',
                de: 'de-DE',
                tr: 'tr-TR',
                es: 'es-ES',
                it: 'it-IT',
                fr: 'fr-FR'
            };
            const locale = localeMap[this.currentLocale] || 'sr-RS';
            const currencyMap = {
                sr: 'RSD',
                en: 'USD',
                ru: 'RUB',
                de: 'EUR',
                tr: 'TRY',
                es: 'EUR',
                it: 'EUR',
                fr: 'EUR'
            };
            const curr = currencyMap[this.currentLocale] || currency;
            return new Intl.NumberFormat(locale, { style: 'currency', currency: curr, minimumFractionDigits: 0 }).format(amount);
        },

        formatDate: function(date, options = {}) {
            const localeMap = {
                sr: 'sr-RS',
                en: 'en-US',
                ru: 'ru-RU',
                de: 'de-DE',
                tr: 'tr-TR',
                es: 'es-ES',
                it: 'it-IT',
                fr: 'fr-FR'
            };
            const locale = localeMap[this.currentLocale] || 'sr-RS';
            const defaultOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
            return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(new Date(date));
        },

        formatNumber: function(num) {
            const localeMap = {
                sr: 'sr-RS',
                en: 'en-US',
                ru: 'ru-RU',
                de: 'de-DE',
                tr: 'tr-TR',
                es: 'es-ES',
                it: 'it-IT',
                fr: 'fr-FR'
            };
            const locale = localeMap[this.currentLocale] || 'sr-RS';
            return new Intl.NumberFormat(locale).format(num);
        },

        translatePage: function() {
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                const translation = this.t(key);
                
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    if (element.placeholder !== undefined) {
                        element.placeholder = translation;
                    }
                } else if (element.hasAttribute('data-i18n-html')) {
                    element.innerHTML = translation;
                } else {
                    element.textContent = translation;
                }
            });

            document.querySelectorAll('[data-i18n-attr]').forEach(element => {
                const attrs = element.getAttribute('data-i18n-attr').split(',');
                attrs.forEach(attr => {
                    const [attrName, key] = attr.split(':');
                    if (attrName && key) {
                        element.setAttribute(attrName.trim(), this.t(key.trim()));
                    }
                });
            });

            document.documentElement.lang = this.currentLocale;
        },

        setLocale: function(locale) {
            if (!this.supportedLocales.includes(locale)) {
                console.warn(`Unsupported locale: ${locale}`);
                return;
            }

            this.currentLocale = locale;
            localStorage.setItem('locale', locale);
            this.loadLocale(locale).then(() => {
                this.translatePage();
                this.updateLanguageSwitcher();
                this.localeChangeCallbacks.forEach(cb => cb(locale));
            });
        },

        onLocaleChange: function(callback) {
            if (typeof callback === 'function') {
                this.localeChangeCallbacks.push(callback);
            }
        },

        initLanguageSwitcher: function() {
            const switcher = document.getElementById('language-switcher');
            if (!switcher) {
                this.createLanguageSwitcher();
                return;
            }

            this.updateLanguageSwitcher();
            
            const dropdown = switcher.querySelector('.language-dropdown');
            const trigger = switcher.querySelector('.language-trigger');
            
            if (trigger) {
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdown.classList.toggle('open');
                });
            }

            dropdown.querySelectorAll('.language-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    e.preventDefault();
                    const locale = option.getAttribute('data-locale');
                    this.setLocale(locale);
                    dropdown.classList.remove('open');
                });
            });

            document.addEventListener('click', (e) => {
                if (!switcher.contains(e.target)) {
                    dropdown.classList.remove('open');
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    dropdown.classList.remove('open');
                }
            });
        },

        createLanguageSwitcher: function() {
            const header = document.querySelector('header .container') || document.querySelector('header') || document.body;
            const switcher = document.createElement('div');
            switcher.id = 'language-switcher';
            switcher.className = 'language-switcher';
            switcher.innerHTML = this.getSwitcherHTML();
            header.appendChild(switcher);
            this.initLanguageSwitcher();
        },

        getSwitcherHTML: function() {
            const currentName = this.localeNames[this.currentLocale] || this.currentLocale;
            let options = '';
            this.supportedLocales.forEach(locale => {
                const name = this.localeNames[locale] || locale;
                const active = locale === this.currentLocale ? 'active' : '';
                options += `<button class="language-option ${active}" data-locale="${locale}" tabindex="-1">${name}</button>`;
            });

            return `
                <div class="language-trigger" aria-label="Select language" tabindex="0">
                    <span class="language-current">${currentName}</span>
                    <svg class="language-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                </div>
                <div class="language-dropdown" role="listbox" aria-label="Available languages">
                    ${options}
                </div>
            `;
        },

        updateLanguageSwitcher: function() {
            const switcher = document.getElementById('language-switcher');
            if (!switcher) return;

            const currentName = this.localeNames[this.currentLocale] || this.currentLocale;
            const trigger = switcher.querySelector('.language-current');
            if (trigger) {
                trigger.textContent = currentName;
            }

            switcher.querySelectorAll('.language-option').forEach(option => {
                const locale = option.getAttribute('data-locale');
                option.classList.toggle('active', locale === this.currentLocale);
            });
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = I18n;
    } else {
        window.I18n = I18n;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => I18n.init());
    } else {
        I18n.init();
    }
})();