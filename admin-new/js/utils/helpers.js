/**
 * Helpers - Utility Functions
 * Common utility functions for the application
 */

export const ImperiumUtils = {
  // Backward compatibility - direct methods
  escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  escapeHtml(str) {
    return this.escapeHTML(str);
  },

  generateId(prefix = 'id_') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  unescapeHTML(str) {
    return this.string.unescapeHTML(str);
  },

  async: {
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    retry(fn, retries = 3, delay = 1000) {
      return new Promise((resolve, reject) => {
        const attempt = async i => {
          try {
            const res = await fn();
            resolve(res);
          } catch (error) {
            if (i >= retries - 1) reject(error);
            else setTimeout(() => attempt(i + 1), delay);
          }
        };
        attempt(0);
      });
    },

    debounce(fn, delay, immediate = false) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          timeout = null;
          if (!immediate) fn.apply(this, args);
        }, delay);
        if (immediate && !timeout) fn.apply(this, args);
      };
    },

    throttle(fn, limit) {
      let inThrottle;
      return (...args) => {
        if (!inThrottle) {
          fn.apply(this, args);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      };
    },
  },
  // Flat aliases for methods that also live in nested groups (backward compatibility)
  formatCurrency(...args) {
    return this.format.currency(...args);
  },
  formatNumber(...args) {
    return this.format.number(...args);
  },
  formatDate(...args) {
    return this.format.date(...args);
  },
  formatDateTime(...args) {
    return this.format.datetime(...args);
  },
  formatRelativeTime(...args) {
    return this.format.relativeTime(...args);
  },
  truncate(...args) {
    return this.format.truncate(...args);
  },
  randomString(...args) {
    return this.string.random(...args);
  },
  debounce(fn, delay, immediate = false) {
    return this.async.debounce(fn, delay, immediate);
  },
  throttle(fn, limit) {
    return this.async.throttle(fn, limit);
  },
  sleep(...args) {
    return this.async.sleep(...args);
  },

  getNested(obj, path, fallback) {
    if (obj == null) return fallback;
    const parts = Array.isArray(path) ? path : String(path).split('.');
    let current = obj;
    for (const part of parts) {
      if (current == null) return fallback;
      current = current[part];
    }
    return current === undefined ? fallback : current;
  },

  downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  },

  lockBodyScroll() {
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = 'hidden';
    }
  },

  unlockBodyScroll() {
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = '';
    }
  },

  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  sanitizeInput(str) {
    return this.escapeHTML(str);
  },

  format: {
    currency(amount, currency = 'RSD', locale = 'sr-RS') {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    },

    number(value, locale = 'sr-RS', options = {}) {
      return new Intl.NumberFormat(locale, options).format(value);
    },

    percent(value, locale = 'sr-RS', decimals = 1) {
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value / 100);
    },

    date(date, locale = 'sr-RS', options = {}) {
      const defaultOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(
        new Date(date)
      );
    },

    datetime(date, locale = 'sr-RS', options = {}) {
      const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(
        new Date(date)
      );
    },

    relativeTime(date, locale = 'sr-RS') {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      const diff = Date.now() - new Date(date).getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const months = Math.floor(days / 30);
      const years = Math.floor(days / 365);

      if (years > 0) return rtf.format(-years, 'year');
      if (months > 0) return rtf.format(-months, 'month');
      if (days > 0) return rtf.format(-days, 'day');
      if (hours > 0) return rtf.format(-hours, 'hour');
      if (minutes > 0) return rtf.format(-minutes, 'minute');
      return rtf.format(-seconds, 'second');
    },

    fileSize(bytes, locale = 'sr-RS') {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (
        this.number(bytes / Math.pow(k, i), locale, { maximumFractionDigits: 2 }) + ' ' + sizes[i]
      );
    },

    truncate(str, length = 50, suffix = '...') {
      if (str.length <= length) return str;
      return str.slice(0, length - suffix.length) + suffix;
    },

    slugify(str) {
      return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    },

    capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    titleCase(str) {
      return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    },
  },

  string: {
    random(length = 8, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    },

    uuid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },

    hash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return hash.toString(36);
    },

    escapeHTML(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    escapeHtml(str) {
      return this.escapeHTML(str);
    },

    validation: {
      email(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
      },

      phone(phone) {
        const re = /^\+?[\d\s\-()]{7,}$/;
        return re.test(phone);
      },

      url(url) {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },

      required(value) {
        return value !== undefined && value !== null && value !== '';
      },

      minLength(str, min) {
        return str.length >= min;
      },

      maxLength(str, max) {
        return str.length <= max;
      },

      pattern(str, pattern) {
        return pattern.test(str);
      },
    },

    math: {
      clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      },

      lerp(start, end, t) {
        return start + (end - start) * t;
      },

      random(min, max) {
        return Math.random() * (max - min) + min;
      },

      round(value, decimals = 0) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
      },
    },

    storage: {
      get(key, defaultValue = null) {
        try {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : defaultValue;
        } catch {
          return defaultValue;
        }
      },

      set(key, value) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch {
          return false;
        }
      },

      remove(key) {
        localStorage.removeItem(key);
      },

      clear() {
        localStorage.clear();
      },
    },

    dom: {
      ready() {
        return new Promise(resolve => {
          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            resolve();
          } else {
            document.addEventListener('DOMContentLoaded', resolve);
          }
        });
      },

      query(selector, context = document) {
        return context.querySelector(selector);
      },

      queryAll(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
      },

      on(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        return () => element.removeEventListener(event, handler, options);
      },

      off(element, event, handler) {
        element.removeEventListener(event, handler);
      },

      delegate(parent, selector, event, handler) {
        parent.addEventListener(event, e => {
          const target = e.target.closest(selector);
          if (target) handler.call(target, e);
        });
      },
    },
  },
};

// Export escapeHTML as a standalone function
export const escapeHTML = str =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// Alias for backward compatibility
export const escapeHtml = escapeHTML;

export { ImperiumUtils as Utils };

export default ImperiumUtils;
