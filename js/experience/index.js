/**
 * Experience Center - Shared Entry Point
 * Exports ESM API and exposes window.DalliExperience for vanilla admin scripts
 */

export { experienceApi } from './experience-api.js';
export * from './experience-config.js';
export { ExperiencePermissions } from './experience-permissions.js';
export { ExperienceStore, STORAGE_KEY, experienceStore } from './experience-store.js';

import {
  EXPERIENCE_VERSION,
  OWNER_ONLY_ACTIONS,
  PERMISSION_KEY,
  SECTION_KEYS,
  THEME_CATALOG,
  createDefaultConfig,
  createThemeConfig,
  deepMerge,
  getPublicSlice,
  isThemeAction,
  makeHistoryEntry,
  sanitizeConfigText,
  stripTags,
  validateSection,
} from './experience-config.js';

import experienceApi from './experience-api.js';
import ExperiencePermissions, {
  canManageExperience,
  canOwnerAction,
  detectRole,
  getRoleHeader,
  isOwner,
} from './experience-permissions.js';
import { experienceStore } from './experience-store.js';

const DalliExperience = {
  VERSION: EXPERIENCE_VERSION,
  PERMISSION_KEY,
  OWNER_ONLY_ACTIONS,
  SECTION_KEYS,
  THEME_CATALOG,
  store: experienceStore,
  api: experienceApi,
  permissions: ExperiencePermissions,
  createThemeConfig,
  createDefaultConfig,
  deepMerge,
  stripTags,
  sanitizeConfigText,
  getPublicSlice,
  isThemeAction,
  validateSection,
  makeHistoryEntry,
  detectRole,
  isOwner,
  canManageExperience,
  canOwnerAction,
  getRoleHeader,
  sync: () => experienceApi.sync(),
};

if (typeof window !== 'undefined') {
  window.DalliExperience = DalliExperience;
}

export default DalliExperience;
