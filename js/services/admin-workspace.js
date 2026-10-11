/**
 * Admin Personal Workspace - Phase 23
 * Architecture only
 */

const STORAGE_KEY = 'dalli_admin_workspace';

export function getWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {
      personalNotes: [],
      privateNotes: [],
      tasks: [],
      reminders: [],
      savedReports: [],
      quickShortcuts: [],
      pinnedAreas: [],
      draftIdeas: []
    };
  } catch (e) {
    return { personalNotes: [], privateNotes: [], tasks: [], reminders: [], savedReports: [], quickShortcuts: [], pinnedAreas: [], draftIdeas: [] };
  }
}

export function saveWorkspace(workspace) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    return true;
  } catch (e) {
    return false;
  }
}
