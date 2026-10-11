/**
 * Immersive Experience Engine
 * Core service for DALLI Worlds, cinematic collections, and luxury presentation
 */

const WORLDS_DATA_URL = '/data/dalli-worlds.json';
const JOURNEYS_DATA_URL = '/data/collection-journeys.json';
const MOMENTS_DATA_URL = '/data/signature-moments.json';

let _worldsData = null;
let _journeysData = null;
let _momentsData = null;
let _loadPromise = null;
let _currentWorld = null;
let _worldHistory = [];

async function loadAllData() {
  if (_worldsData && _journeysData && _momentsData) {
    return { worlds: _worldsData, journeys: _journeysData, moments: _momentsData };
  }

  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      const [worldsRes, journeysRes, momentsRes] = await Promise.all([
        fetch(WORLDS_DATA_URL),
        fetch(JOURNEYS_DATA_URL),
        fetch(MOMENTS_DATA_URL)
      ]);

      if (worldsRes.ok) _worldsData = await worldsRes.json();
      else _worldsData = { dalliWorlds: { worlds: [], editorialExperience: {} } };

      if (journeysRes.ok) _journeysData = await journeysRes.json();
      else _journeysData = { collectionJourneys: { journeyTemplates: {}, worldJourneys: {} } };

      if (momentsRes.ok) _momentsData = await momentsRes.json();
      else _momentsData = { signatureMoments: { moments: {}, momentEngine: {} } };
    } catch (err) {
      console.warn('[ImmersiveEngine] Load failed:', err);
      _worldsData = _worldsData || { dalliWorlds: { worlds: [], editorialExperience: {} } };
      _journeysData = _journeysData || { collectionJourneys: { journeyTemplates: {}, worldJourneys: {} } };
      _momentsData = _momentsData || { signatureMoments: { moments: {}, momentEngine: {} } };
    } finally {
      _loadPromise = null;
    }

    return { worlds: _worldsData, journeys: _journeysData, moments: _momentsData };
  })();

  return _loadPromise;
}

export function getAllWorlds() {
  return _worldsData?.dalliWorlds?.worlds || [];
}

export function getWorldById(worldId) {
  const worlds = getAllWorlds();
  return worlds.find(w => w.id === worldId) || worlds[0];
}

export function getCurrentWorld() {
  if (_currentWorld) return _currentWorld;

  // Try to determine from URL
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path.includes('/elegance')) _currentWorld = 'elegance';
    else if (path.includes('/casual')) _currentWorld = 'casual';
  }

  return _currentWorld || 'casual';
}

export function setCurrentWorld(worldId) {
  const previousWorld = _currentWorld;
  _currentWorld = worldId;
  _worldHistory.push({ from: previousWorld, to: worldId, timestamp: Date.now() });

  // Keep history limited
  if (_worldHistory.length > 10) _worldHistory.shift();

  return { previousWorld, currentWorld: worldId };
}

export function getWorldHistory() {
  return [..._worldHistory];
}

export function getWorldConfig(worldId) {
  return getWorldById(worldId);
}

export function getWorldColorPalette(worldId) {
  const world = getWorldById(worldId);
  return world?.colorPalette || {};
}

export function getWorldTypography(worldId) {
  const world = getWorldById(worldId);
  return world?.typography || {};
}

export function getWorldLayout(worldId) {
  const world = getWorldById(worldId);
  return world?.layout || {};
}

export function getWorldNavigation(worldId) {
  const world = getWorldById(worldId);
  return world?.navigation || {};
}

export function getWorldJourneySteps(worldId) {
  const world = getWorldById(worldId);
  return world?.journeySteps || [];
}

export function getEditorialLayouts() {
  return _worldsData?.dalliWorlds?.editorialExperience?.layouts || {};
}

export function getEditorialTypography() {
  return _worldsData?.dalliWorlds?.editorialExperience?.typography || {};
}

export function getEditorialColorModes() {
  return _worldsData?.dalliWorlds?.editorialExperience?.colorModes || {};
}

export function getCinematicComponents() {
  return _worldsData?.dalliWorlds?.cinematicCollection?.components || {};
}

export function getLuxuryPresentationRules() {
  return _worldsData?.dalliWorlds?.luxuryPresentationRules || {};
}

export function getWorldTransitionConfig() {
  return _worldsData?.dalliWorlds?.worldTransition || {};
}

export function shouldRespectReducedMotion() {
  const rules = getLuxuryPresentationRules();
  if (rules.motion?.respectReducedMotion) {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }
  return false;
}

export function getDefaultAnimationConfig() {
  const rules = getLuxuryPresentationRules();
  return {
    duration: rules.motion?.defaultDuration || 600,
    easing: rules.motion?.defaultEasing || 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: rules.motion?.springConfig || { stiffness: 200, damping: 20 }
  };
}

export async function initializeImmersiveEngine() {
  await loadAllData();

  // Auto-detect current world
  if (typeof window !== 'undefined' && !_currentWorld) {
    const path = window.location.pathname;
    if (path.includes('/elegance/')) _currentWorld = 'elegance';
    else if (path.includes('/casual/')) _currentWorld = 'casual';
  }

  return { worlds: _worldsData, journeys: _journeysData, moments: _momentsData };
}

export default {
  loadAllData,
  getAllWorlds,
  getWorldById,
  getCurrentWorld,
  setCurrentWorld,
  getWorldHistory,
  getWorldConfig,
  getWorldColorPalette,
  getWorldTypography,
  getWorldLayout,
  getWorldNavigation,
  getWorldJourneySteps,
  getEditorialLayouts,
  getEditorialTypography,
  getEditorialColorModes,
  getCinematicComponents,
  getLuxuryPresentationRules,
  getWorldTransitionConfig,
  shouldRespectReducedMotion,
  getDefaultAnimationConfig,
  initializeImmersiveEngine
};