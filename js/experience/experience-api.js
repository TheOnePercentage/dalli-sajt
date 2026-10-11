/**
 * Experience Center - API Client
 * Communicates with Netlify Functions (experience-get / experience-save)
 * Falls back to local-only mode when functions are unavailable
 */

import {
  canManageExperience,
  canOwnerAction,
  getRoleHeader,
  isOwner,
} from './experience-permissions.js';
import store from './experience-store.js';

const ENDPOINTS = {
  get: '/.netlify/functions/experience-get',
  save: '/.netlify/functions/experience-save',
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Experience-Role': getRoleHeader(),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (err) {
    body = { error: 'Invalid JSON response' };
  }

  if (!response.ok) {
    const message = (body && body.error) || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

export const experienceApi = {
  async getConfig() {
    const data = await request(`${ENDPOINTS.get}?scope=full`);
    return data && data.config ? data.config : null;
  },

  async getPublicConfig() {
    const data = await request(`${ENDPOINTS.get}?scope=public`);
    return data && data.config ? data.config : null;
  },

  async saveSection(section, data) {
    const body = { scope: 'section', section, data, role: getRoleHeader() };
    const result = await request(ENDPOINTS.save, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (result && result.config) store.applyServer(result.config);
    return result;
  },

  async runThemeAction(action, payload) {
    const ownerOnlyActions = [
      'activateTheme',
      'scheduleTheme',
      'rollbackTheme',
      'cancelScheduledTheme',
    ];
    if (ownerOnlyActions.includes(action) && !isOwner()) {
      throw new Error('Samo vlasnik može vršiti ovu akciju');
    }
    if (!canManageExperience() && !isOwner()) {
      throw new Error('Nedovoljna dozvola');
    }
    const body = { scope: 'theme-action', action, data: payload, role: getRoleHeader() };
    const result = await request(ENDPOINTS.save, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (result && result.config) store.applyServer(result.config);
    return result;
  },

  async sync() {
    try {
      return await store.syncFromServer(experienceApi);
    } catch (err) {
      console.warn('[Experience] Sync unavailable, running local-only:', err.message);
      return store.getState();
    }
  },

  canManage() {
    return canManageExperience();
  },

  canOwnerAction() {
    return canOwnerAction();
  },
};

export default experienceApi;
