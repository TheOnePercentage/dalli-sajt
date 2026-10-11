/**
 * Signature Moments Service
 * Manages luxury moment triggers, sequences, and presentation
 */

const MOMENTS_DATA_URL = '/data/signature-moments.json';

let _momentsData = null;
let _momentQueue = [];
let _activeMoment = null;
let _momentHistory = [];
let _userPreferences = {
  muted: false,
  volume: 0.5,
  doNotDisturb: false,
  dismissedMoments: []
};

async function loadData() {
  if (_momentsData) return _momentsData;

  try {
    const res = await fetch(MOMENTS_DATA_URL);
    if (res.ok) _momentsData = await res.json();
    else _momentsData = { signatureMoments: { moments: {}, momentEngine: {}, soundArchitecture: {} } };
  } catch (err) {
    console.warn('[SignatureMoments] Load failed:', err);
    _momentsData = { signatureMoments: { moments: {}, momentEngine: {}, soundArchitecture: {} } };
  }

  // Load user preferences from localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('dalli_moment_preferences');
      if (stored) _userPreferences = { ..._userPreferences, ...JSON.parse(stored) };
    } catch (e) {
      // Ignore
    }
  }

  return _momentsData;
}

function savePreferences() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('dalli_moment_preferences', JSON.stringify(_userPreferences));
    } catch (e) {
      // Ignore
    }
  }
}

function getAllMoments() {
  return _momentsData?.signatureMoments?.moments || {};
}

function getMomentEngineConfig() {
  return _momentsData?.signatureMoments?.momentEngine || {};
}

function getSoundArchitecture() {
  return _momentsData?.signatureMoments?.soundArchitecture || {};
}

function checkTrigger(moment, context) {
  const trigger = moment.trigger;
  if (!trigger) return false;

  switch (trigger.type) {
    case 'first-session':
      return !context.hasVisitedBefore && !context.fromCampaign && !context.isBot;

    case 'route-change':
      return context.fromDifferentWorld || context.directEntry;

    case 'returning-member':
      return context.memberSince && context.memberSince < Date.now() - 30 * 24 * 60 * 60 * 1000 && context.hasActiveSession;

    case 'tier-change':
      return context.newTierLevel > context.previousTierLevel;

    case 'tier-entry':
      return trigger.conditions?.tierId?.split(':')[1]?.split(',').includes(context.currentTier);

    case 'scheduled':
      return context.launchDate && context.launchDate <= Date.now() && context.collection === 'new-season';

    case 'product-release':
      return trigger.conditions?.accessLevel?.split(':')[1]?.split(',').includes(context.currentTier) && context.limitedEdition;

    case 'journey-completion':
      return context.allStepsVisited && context.timeSpent >= (trigger.conditions?.minTimeSpent || 120000);

    default:
      return false;
  }
}

function checkConditions(moment, context) {
  const engine = getMomentEngineConfig();

  // Check if moment is enabled
  if (moment.enabled === false) return false;

  // Check max concurrent
  if (_activeMoment && engine.maxConcurrent === 1) return false;

  // Check do not disturb
  if (engine.respectDoNotDisturb && _userPreferences.doNotDisturb) {
    const now = new Date();
    const hours = now.getHours();
    const [start, end] = (engine.doNotDisturbHours || '22:00-08:00').split('-').map(h => parseInt(h.split(':')[0]));
    if (start > end) {
      if (hours >= start || hours < end) return false;
    } else {
      if (hours >= start && hours < end) return false;
    }
  }

  // Check cooldown
  if (moment.cooldown > 0) {
    const lastShown = _momentHistory.find(h => h.momentId === moment.id);
    if (lastShown && Date.now() - lastShown.timestamp < moment.cooldown) return false;
  }

  // Check frequency
  if (moment.frequency === 'once-per-device' || moment.frequency === 'once-per-upgrade' || moment.frequency === 'once-per-tier-entry' || moment.frequency === 'once-per-journey-per-season') {
    const shown = _momentHistory.some(h => h.momentId === moment.id);
    if (shown) return false;
  }

  if (moment.frequency === 'daily-max' || moment.frequency === 'per-world-entry') {
    const today = new Date().toDateString();
    const shownToday = _momentHistory.some(h => h.momentId === moment.id && new Date(h.timestamp).toDateString() === today);
    if (shownToday) return false;
  }

  if (moment.frequency === 'per-season' || moment.frequency === 'per-release') {
    const shown = _momentHistory.some(h => h.momentId === moment.id);
    if (shown) return false;
  }

  // Check dismissed
  if (_userPreferences.dismissedMoments.includes(moment.id)) return false;

  // Check trigger
  return checkTrigger(moment, context);
}

export function evaluateMoments(context) {
  const moments = getAllMoments();
  const eligible = [];

  for (const [id, moment] of Object.entries(moments)) {
    if (checkConditions(moment, context)) {
      eligible.push({ ...moment, id });
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  eligible.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

  return eligible;
}

export function getMomentSequence(momentId) {
  const moment = getAllMoments()[momentId];
  return moment?.sequence || [];
}

export function playMoment(momentId, context = {}) {
  const sequence = getMomentSequence(momentId);
  if (!sequence.length) return Promise.resolve();

  _activeMoment = momentId;
  _momentHistory.push({ momentId, timestamp: Date.now(), context });

  // Keep history limited
  if (_momentHistory.length > 50) _momentHistory.shift();

  return executeSequence(sequence, 0, context);
}

async function executeSequence(sequence, index, context) {
  if (index >= sequence.length || !_activeMoment) return;

  const step = sequence[index];
  const duration = step.duration || 0;

  // Execute step (this would trigger UI components)
  await executeStep(step, context);

  // Wait for duration
  if (duration > 0) {
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  // Continue to next step
  return executeSequence(sequence, index + 1, context);
}

async function executeStep(step, context) {
  // Dispatch custom event for UI components to handle
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dalli:moment:step', {
      detail: { step, context, momentId: _activeMoment }
    }));
  }
}

export function dismissCurrentMoment() {
  _activeMoment = null;
}

export function dismissMoment(momentId) {
  _userPreferences.dismissedMoments.push(momentId);
  savePreferences();
}

export function setMuted(muted) {
  _userPreferences.muted = muted;
  savePreferences();
}

export function setVolume(volume) {
  _userPreferences.volume = Math.max(0, Math.min(1, volume));
  savePreferences();
}

export function setDoNotDisturb(enabled) {
  _userPreferences.doNotDisturb = enabled;
  savePreferences();
}

export function getUserPreferences() {
  return { ..._userPreferences };
}

export function getMomentHistory() {
  return [..._momentHistory];
}

export function getActiveMoment() {
  return _activeMoment;
}

export function getSoundConfig(soundId) {
  const sounds = getSoundArchitecture().sounds || {};
  return sounds[soundId];
}

export function shouldPlaySound(soundId) {
  if (_userPreferences.muted) return false;
  const sound = getSoundConfig(soundId);
  return sound && !_userPreferences.muted;
}

export async function initializeSignatureMoments() {
  await loadData();
  return _momentsData;
}

export default {
  loadData,
  evaluateMoments,
  getMomentSequence,
  playMoment,
  dismissCurrentMoment,
  dismissMoment,
  setMuted,
  setVolume,
  setDoNotDisturb,
  getUserPreferences,
  getMomentHistory,
  getActiveMoment,
  getSoundConfig,
  shouldPlaySound,
  initializeSignatureMoments
};