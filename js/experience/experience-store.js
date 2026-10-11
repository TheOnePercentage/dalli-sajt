/**
 * Experience Center - Store
 * Local-first state with localStorage persistence and server sync
 * Mutation logic lives in experience-mutations.js (shared with Netlify Functions)
 */

import { createDefaultConfig, deepMerge, getPublicSlice } from './experience-config.js';

import {
  applySectionUpdate,
  applyThemeAction,
  evaluateScheduledTheme,
} from './experience-mutations.js';

const STORAGE_KEY = 'dalli_experience_config';

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

class ExperienceStore {
  constructor() {
    this._state = this._loadLocal();
    this._subscribers = new Set();
    this._serverState = null;
    this._lastSync = null;
    this._syncing = false;
  }

  _loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return deepMerge(createDefaultConfig(), JSON.parse(raw));
      }
    } catch (err) {
      console.warn('[Experience] Failed to load local config:', err);
    }
    return createDefaultConfig();
  }

  getState() {
    return clone(this._state);
  }

  get(path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), this._state);
  }

  set(path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => {
      if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
      return o[k];
    }, this._state);
    target[last] = value;
    this._persist();
    this._notify(path, value);
    return true;
  }

  patch(updates) {
    Object.entries(updates).forEach(([path, value]) => this.set(path, value));
  }

  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  _notify(path, value) {
    const snapshot = this.getState();
    this._subscribers.forEach(cb => {
      try {
        cb({ path, value, state: snapshot });
      } catch (err) {
        console.error('[Experience] Subscriber error:', err);
      }
    });
    if (typeof window !== 'undefined' && window.AdminEventBus) {
      window.AdminEventBus.emit('experience:changed', { path, state: snapshot });
    }
  }

  _persist() {
    this._state.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
    } catch (err) {
      console.warn('[Experience] Failed to persist config:', err);
    }
  }

  applyServer(config) {
    if (!config || typeof config !== 'object') return this.getState();
    this._state = deepMerge(createDefaultConfig(), config);
    this._serverState = clone(this._state);
    this._lastSync = new Date().toISOString();
    this._persist();
    this._notify('*', this._state);
    return this.getState();
  }

  async syncFromServer(api) {
    if (this._syncing) return this.getState();
    this._syncing = true;
    try {
      const remote = await api.getConfig();
      if (remote) this.applyServer(remote);
    } catch (err) {
      console.warn('[Experience] Server sync failed, using local config:', err);
    } finally {
      this._syncing = false;
    }
    return this.getState();
  }

  updateSection(section, data, by) {
    const result = applySectionUpdate(this._state, section, data, by);
    if (!result.ok) {
      return { success: false, error: result.error };
    }
    this._persist();
    this._notify(section, data);
    return { success: true, state: this.getState() };
  }

  runThemeAction(action, payload, by) {
    const result = applyThemeAction(this._state, action, payload, by);
    if (!result.ok) {
      return { success: false, error: result.error };
    }
    this._persist();
    this._notify('themes', { action, payload });
    return { success: true, state: this.getState() };
  }

  evaluateScheduledTheme() {
    const result = evaluateScheduledTheme(this._state);
    if (result.changed) {
      this._persist();
      this._notify('themes', { action: 'scheduled-evaluation' });
      return { success: true, state: this.getState() };
    }
    if (!result.ok) return { success: false, error: result.error };
    return null;
  }

  getPublicSlice() {
    return getPublicSlice(this._state);
  }

  getLastSync() {
    return this._lastSync;
  }

  reset() {
    this._state = createDefaultConfig();
    this._persist();
    this._notify('*', this._state);
  }
}

const store = new ExperienceStore();

function getPublicConfig() {
  return store.getPublicSlice();
}

export { ExperienceStore, store as experienceStore, getPublicConfig, STORAGE_KEY };
export default store;
