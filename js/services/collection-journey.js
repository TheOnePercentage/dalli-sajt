/**
 * Collection Journey Service
 * Manages curated journey steps through collection worlds
 */

import { getWorldJourneySteps, getCurrentWorld } from './immersive-engine.js';

const JOURNEYS_DATA_URL = '/data/collection-journeys.json';

let _journeysData = null;

async function loadData() {
  if (_journeysData) return _journeysData;

  try {
    const res = await fetch(JOURNEYS_DATA_URL);
    if (res.ok) _journeysData = await res.json();
    else _journeysData = { collectionJourneys: { journeyTemplates: {}, worldJourneys: {} } };
  } catch (err) {
    console.warn('[CollectionJourney] Load failed:', err);
    _journeysData = { collectionJourneys: { journeyTemplates: {}, worldJourneys: {} } };
  }

  return _journeysData;
}

export function getJourneyTemplates() {
  return _journeysData?.collectionJourneys?.journeyTemplates || {};
}

export function getJourneyTemplate(stepId) {
  const templates = getJourneyTemplates();
  return templates[stepId];
}

export function getWorldJourney(worldId) {
  const worldJourneys = _journeysData?.collectionJourneys?.worldJourneys || {};
  return worldJourneys[worldId];
}

export function getCurrentWorldJourney() {
  const currentWorld = getCurrentWorld();
  return getWorldJourney(currentWorld);
}

export function getJourneySteps(worldId = null) {
  const world = worldId || getCurrentWorld();
  const worldJourney = getWorldJourney(world);

  if (!worldJourney?.steps) return [];

  return worldJourney.steps
    .filter(step => step.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(step => {
      const template = getJourneyTemplate(step.stepId);
      return {
        ...template,
        ...step,
        config: { ...(template?.config || {}), ...(step.config || {}) }
      };
    });
}

export function getJourneyStep(stepId, worldId = null) {
  const steps = getJourneySteps(worldId);
  return steps.find(s => s.stepId === stepId);
}

export function getNextStep(currentStepId, worldId = null) {
  const steps = getJourneySteps(worldId);
  const currentIndex = steps.findIndex(s => s.stepId === currentStepId);
  if (currentIndex >= 0 && currentIndex < steps.length - 1) {
    return steps[currentIndex + 1];
  }
  return null;
}

export function getPreviousStep(currentStepId, worldId = null) {
  const steps = getJourneySteps(worldId);
  const currentIndex = steps.findIndex(s => s.stepId === currentStepId);
  if (currentIndex > 0) {
    return steps[currentIndex - 1];
  }
  return null;
}

export function getJourneyProgress(worldId = null, visitedSteps = []) {
  const steps = getJourneySteps(worldId);
  const total = steps.length;
  const visited = steps.filter(s => visitedSteps.includes(s.stepId)).length;
  const currentStep = steps.find(s => !visitedSteps.includes(s.stepId)) || steps[total - 1];

  return {
    totalSteps: total,
    completedSteps: visited,
    currentStep: currentStep?.stepId,
    progressPercent: total > 0 ? Math.round((visited / total) * 100) : 0,
    isComplete: visited >= total
  };
}

export function getJourneyNavigationConfig() {
  return _journeysData?.collectionJourneys?.journeyNavigation || {};
}

export function getPersonalizationConfig() {
  return _journeysData?.collectionJourneys?.personalization || {};
}

export function shouldAdaptToTier(userTierId) {
  const config = getPersonalizationConfig();
  return config.adaptToTier !== false;
}

export function shouldRememberPosition() {
  const config = getPersonalizationConfig();
  return config.rememberPosition !== false;
}

export function shouldSuggestNextStep() {
  const config = getPersonalizationConfig();
  return config.suggestNextStep !== false;
}

export function shouldTrackEngagement() {
  const config = getPersonalizationConfig();
  return config.trackEngagement !== false;
}

export async function initializeCollectionJourney() {
  await loadData();
  return _journeysData;
}

export default {
  loadData,
  getJourneyTemplates,
  getJourneyTemplate,
  getWorldJourney,
  getCurrentWorldJourney,
  getJourneySteps,
  getJourneyStep,
  getNextStep,
  getPreviousStep,
  getJourneyProgress,
  getJourneyNavigationConfig,
  getPersonalizationConfig,
  shouldAdaptToTier,
  shouldRememberPosition,
  shouldSuggestNextStep,
  shouldTrackEngagement,
  initializeCollectionJourney
};