/**
 * Offline Readiness - Phase 23
 * Architecture only
 */

const STORAGE_KEY = 'dalli_offline_drafts';

export function saveDraft(key, data) {
  try {
    const drafts = getDrafts();
    drafts[key] = { data, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    return true;
  } catch (e) {
    return false;
  }
}

export function getDrafts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function getDraft(key) {
  const drafts = getDrafts();
  return drafts[key] || null;
}

export function clearDraft(key) {
  const drafts = getDrafts();
  delete drafts[key];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    return true;
  } catch (e) {
    return false;
  }
}
