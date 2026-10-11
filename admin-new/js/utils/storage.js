export const ImperiumStorage = {
  prefix: 'dalli_admin_',

  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      console.warn(`Storage get error for ${key}:`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Storage set error for ${key}:`, e);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (e) {
      console.error(`Storage remove error for ${key}:`, e);
      return false;
    }
  },

  clear() {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));
      keys.forEach(k => localStorage.removeItem(k));
      return true;
    } catch (e) {
      console.error('Storage clear error:', e);
      return false;
    }
  },

  getAll() {
    const result = {};
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));
    keys.forEach(key => {
      const shortKey = key.slice(this.prefix.length);
      result[shortKey] = this.get(shortKey);
    });
    return result;
  },

  listen(key, callback) {
    const handler = (e) => {
      if (e.key === this.prefix + key) {
        callback(e.newValue ? JSON.parse(e.newValue) : null, e.oldValue ? JSON.parse(e.oldValue) : null);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  },

  listenAll(callback) {
    const handler = (e) => {
      if (e.key?.startsWith(this.prefix)) {
        const key = e.key.slice(this.prefix.length);
        callback(key, e.newValue ? JSON.parse(e.newValue) : null, e.oldValue ? JSON.parse(e.oldValue) : null);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
};

export const ImperiumSessionStorage = {
  prefix: 'dalli_session_',

  get(key, defaultValue = null) {
    try {
      const item = sessionStorage.getItem(this.prefix + key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      console.warn(`Session storage get error for ${key}:`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      sessionStorage.setItem(this.prefix + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Session storage set error for ${key}:`, e);
      return false;
    }
  },

  remove(key) {
    try {
      sessionStorage.removeItem(this.prefix + key);
      return true;
    } catch (e) {
      console.error(`Session storage remove error for ${key}:`, e);
      return false;
    }
  },

  clear() {
    try {
      const keys = Object.keys(sessionStorage).filter(k => k.startsWith(this.prefix));
      keys.forEach(k => sessionStorage.removeItem(k));
      return true;
    } catch (e) {
      console.error('Session storage clear error:', e);
      return false;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ImperiumStorage, ImperiumSessionStorage };
}