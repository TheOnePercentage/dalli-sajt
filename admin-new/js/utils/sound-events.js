/**
 * Sound Events System for DALLI Social Media Center
 * Unique sounds per event type using Web Audio API
 * No external dependencies - pure browser API
 */

// Sound event types mapped to audio characteristics
const SOUND_PRESETS = {
  // Social Media Events
  'follower_milestone': {
    name: 'Milestone Pratioca',
    category: 'social',
    oscillators: [
      { type: 'sine', freq: 880, duration: 0.15, gain: 0.15 },   // A5
      { type: 'sine', freq: 1108.73, duration: 0.15, gain: 0.12, delay: 0.05 }, // C#6
      { type: 'sine', freq: 1318.51, duration: 0.25, gain: 0.1, delay: 0.1 }  // E6
    ],
    masterGain: 0.3
  },
  'engagement_spike': {
    name: 'Skok Engagementa',
    category: 'social',
    oscillators: [
      { type: 'triangle', freq: 659.25, duration: 0.1, gain: 0.15 },  // E5
      { type: 'triangle', freq: 783.99, duration: 0.1, gain: 0.12, delay: 0.04 }, // G5
      { type: 'triangle', freq: 987.77, duration: 0.1, gain: 0.1, delay: 0.08 }, // B5
      { type: 'triangle', freq: 1318.51, duration: 0.2, gain: 0.08, delay: 0.12 } // E6
    ],
    masterGain: 0.3
  },
  'video_viral': {
    name: 'Viralni Video',
    category: 'social',
    oscillators: [
      { type: 'square', freq: 523.25, duration: 0.08, gain: 0.12 },  // C5
      { type: 'square', freq: 659.25, duration: 0.08, gain: 0.12, delay: 0.03 }, // E5
      { type: 'square', freq: 783.99, duration: 0.08, gain: 0.1, delay: 0.06 }, // G5
      { type: 'square', freq: 1046.5, duration: 0.08, gain: 0.1, delay: 0.09 }, // C6
      { type: 'sine', freq: 1318.51, duration: 0.4, gain: 0.15, delay: 0.12 } // E6 - sustain
    ],
    masterGain: 0.35,
    filter: { type: 'lowpass', frequency: 2000, Q: 2 }
  },
  'new_follower': {
    name: 'Nov Pratilac',
    category: 'social',
    oscillators: [
      { type: 'sine', freq: 783.99, duration: 0.12, gain: 0.1 },  // G5
      { type: 'sine', freq: 1046.5, duration: 0.15, gain: 0.08, delay: 0.03 } // C6
    ],
    masterGain: 0.25
  },
  
  // Advertising Events
  'roas_target_hit': {
    name: 'ROAS Cilj Postignut',
    category: 'ads',
    oscillators: [
      { type: 'sine', freq: 523.25, duration: 0.1, gain: 0.15 },  // C5
      { type: 'sine', freq: 659.25, duration: 0.1, gain: 0.12, delay: 0.05 }, // E5
      { type: 'sine', freq: 783.99, duration: 0.1, gain: 0.1, delay: 0.1 }, // G5
      { type: 'sine', freq: 1046.5, duration: 0.15, gain: 0.1, delay: 0.15 }, // C6
      { type: 'sine', freq: 1318.51, duration: 0.25, gain: 0.12, delay: 0.2 } // E6
    ],
    masterGain: 0.4,
    filter: { type: 'lowpass', frequency: 3000, Q: 1 }
  },
  'roas_critical_drop': {
    name: 'Kritičan Pad ROAS',
    category: 'ads',
    oscillators: [
      { type: 'sawtooth', freq: 220, duration: 0.3, gain: 0.15 },   // A3
      { type: 'sawtooth', freq: 185, duration: 0.3, gain: 0.12, delay: 0.05 }, // F#3
      { type: 'sawtooth', freq: 155.56, duration: 0.5, gain: 0.1, delay: 0.1 } // D#3
    ],
    masterGain: 0.35,
    filter: { type: 'lowpass', frequency: 800, Q: 3 }
  },
  'budget_warning': {
    name: 'Budžet Upozorenje',
    category: 'ads',
    oscillators: [
      { type: 'triangle', freq: 349.23, duration: 0.2, gain: 0.15 }, // F4
      { type: 'triangle', freq: 415.3, duration: 0.2, gain: 0.12, delay: 0.08 }, // G#4
      { type: 'triangle', freq: 311.13, duration: 0.3, gain: 0.1, delay: 0.16 } // D#4
    ],
    masterGain: 0.3,
    filter: { type: 'bandpass', frequency: 1000, Q: 2 }
  },
  'campaign_launched': {
    name: 'Kampanja Pokrenuta',
    category: 'ads',
    oscillators: [
      { type: 'sine', freq: 392, duration: 0.08, gain: 0.12 },   // G4
      { type: 'sine', freq: 493.88, duration: 0.08, gain: 0.1, delay: 0.03 }, // B4
      { type: 'sine', freq: 587.33, duration: 0.08, gain: 0.1, delay: 0.06 }, // D5
      { type: 'sine', freq: 783.99, duration: 0.2, gain: 0.12, delay: 0.09 } // G5
    ],
    masterGain: 0.3
  },
  
  // Commerce Events
  'sale_made': {
    name: 'Prodaja Ostvarena',
    category: 'commerce',
    oscillators: [
      { type: 'sine', freq: 659.25, duration: 0.08, gain: 0.15 },  // E5
      { type: 'sine', freq: 880, duration: 0.08, gain: 0.12, delay: 0.02 }, // A5
      { type: 'sine', freq: 1046.5, duration: 0.08, gain: 0.1, delay: 0.04 }, // C6
      { type: 'sine', freq: 1318.51, duration: 0.15, gain: 0.1, delay: 0.06 } // E6
    ],
    masterGain: 0.3,
    filter: { type: 'highpass', frequency: 400, Q: 0.5 }
  },
  'high_value_sale': {
    name: 'Visokovrednosna Prodaja',
    category: 'commerce',
    oscillators: [
      { type: 'sine', freq: 523.25, duration: 0.1, gain: 0.15 },  // C5
      { type: 'sine', freq: 659.25, duration: 0.1, gain: 0.13, delay: 0.04 }, // E5
      { type: 'sine', freq: 783.99, duration: 0.1, gain: 0.12, delay: 0.08 }, // G5
      { type: 'sine', freq: 1046.5, duration: 0.1, gain: 0.1, delay: 0.12 }, // C6
      { type: 'sine', freq: 1318.51, duration: 0.1, gain: 0.1, delay: 0.16 }, // E6
      { type: 'sine', freq: 1567.98, duration: 0.3, gain: 0.15, delay: 0.2 } // G6 - triumphant
    ],
    masterGain: 0.4,
    filter: { type: 'lowpass', frequency: 4000, Q: 1 }
  },
  'conversion_milestone': {
    name: 'Milestone Konverzija',
    category: 'commerce',
    oscillators: [
      { type: 'triangle', freq: 523.25, duration: 0.1, gain: 0.12 }, // C5
      { type: 'triangle', freq: 659.25, duration: 0.1, gain: 0.1, delay: 0.05 }, // E5
      { type: 'triangle', freq: 783.99, duration: 0.15, gain: 0.1, delay: 0.1 } // G5
    ],
    masterGain: 0.3
  },
  
  // System Events
  'connection_success': {
    name: 'Uspešna Konekcija',
    category: 'system',
    oscillators: [
      { type: 'sine', freq: 523.25, duration: 0.1, gain: 0.12 }, // C5
      { type: 'sine', freq: 659.25, duration: 0.1, gain: 0.1, delay: 0.05 }, // E5
      { type: 'sine', freq: 783.99, duration: 0.2, gain: 0.1, delay: 0.1 } // G5
    ],
    masterGain: 0.25
  },
  'connection_failed': {
    name: 'Neuspešna Konekcija',
    category: 'system',
    oscillators: [
      { type: 'square', freq: 220, duration: 0.2, gain: 0.12 }, // A3
      { type: 'square', freq: 185, duration: 0.3, gain: 0.1, delay: 0.05 } // F#3
    ],
    masterGain: 0.25,
    filter: { type: 'lowpass', frequency: 600, Q: 2 }
  },
  'sync_completed': {
    name: 'Sinhronizacija Završena',
    category: 'system',
    oscillators: [
      { type: 'sine', freq: 783.99, duration: 0.08, gain: 0.1 }, // G5
      { type: 'sine', freq: 1046.5, duration: 0.1, gain: 0.08, delay: 0.02 } // C6
    ],
    masterGain: 0.2
  },
  'error_occurred': {
    name: 'Greška',
    category: 'system',
    oscillators: [
      { type: 'sawtooth', freq: 220, duration: 0.25, gain: 0.15 }, // A3
      { type: 'sawtooth', freq: 174.61, duration: 0.35, gain: 0.12, delay: 0.05 }, // F3
      { type: 'sawtooth', freq: 146.83, duration: 0.45, gain: 0.1, delay: 0.1 } // D3
    ],
    masterGain: 0.3,
    filter: { type: 'lowpass', frequency: 500, Q: 3 }
  },
  
  // Traffic Events
  'traffic_spike': {
    name: 'Skok Saobraćaja',
    category: 'traffic',
    oscillators: [
      { type: 'sine', freq: 587.33, duration: 0.1, gain: 0.12 }, // D5
      { type: 'sine', freq: 739.99, duration: 0.1, gain: 0.1, delay: 0.04 }, // F#5
      { type: 'sine', freq: 880, duration: 0.15, gain: 0.1, delay: 0.08 } // A5
    ],
    masterGain: 0.25
  },
  'traffic_drop': {
    name: 'Pad Saobraćaja',
    category: 'traffic',
    oscillators: [
      { type: 'triangle', freq: 349.23, duration: 0.2, gain: 0.12 }, // F4
      { type: 'triangle', freq: 293.66, duration: 0.25, gain: 0.1, delay: 0.06 }, // D4
      { type: 'triangle', freq: 246.94, duration: 0.3, gain: 0.08, delay: 0.12 } // B3
    ],
    masterGain: 0.25,
    filter: { type: 'lowpass', frequency: 1000, Q: 1 }
  },
  
  // Influencer Events
  'influencer_milestone': {
    name: 'Influencer Milestone',
    category: 'influencer',
    oscillators: [
      { type: 'sine', freq: 523.25, duration: 0.1, gain: 0.12 }, // C5
      { type: 'sine', freq: 659.25, duration: 0.1, gain: 0.1, delay: 0.04 }, // E5
      { type: 'sine', freq: 783.99, duration: 0.1, gain: 0.1, delay: 0.08 }, // G5
      { type: 'sine', freq: 1046.5, duration: 0.2, gain: 0.12, delay: 0.12 } // C6
    ],
    masterGain: 0.3
  },
  
  // Notification Types (generic)
  'notification': {
    name: 'Standardna Notifikacija',
    category: 'notification',
    oscillators: [
      { type: 'sine', freq: 800, duration: 0.15, gain: 0.12 }
    ],
    masterGain: 0.2
  },
  'alert': {
    name: 'Alarm',
    category: 'notification',
    oscillators: [
      { type: 'square', freq: 600, duration: 0.25, gain: 0.15 },
      { type: 'square', freq: 500, duration: 0.3, gain: 0.1, delay: 0.05 }
    ],
    masterGain: 0.3
  },
  'success': {
    name: 'Uspeh',
    category: 'notification',
    oscillators: [
      { type: 'sine', freq: 1000, duration: 0.1, gain: 0.15 },
      { type: 'sine', freq: 1320, duration: 0.15, gain: 0.1, delay: 0.03 }
    ],
    masterGain: 0.25
  },
  'warning': {
    name: 'Upozorenje',
    category: 'notification',
    oscillators: [
      { type: 'triangle', freq: 400, duration: 0.3, gain: 0.15 },
      { type: 'triangle', freq: 350, duration: 0.4, gain: 0.1, delay: 0.05 }
    ],
    masterGain: 0.25
  },
  'critical': {
    name: 'Kritičan',
    category: 'notification',
    oscillators: [
      { type: 'sawtooth', freq: 300, duration: 0.5, gain: 0.15 },
      { type: 'sawtooth', freq: 250, duration: 0.6, gain: 0.12, delay: 0.05 },
      { type: 'sawtooth', freq: 200, duration: 0.7, gain: 0.1, delay: 0.1 }
    ],
    masterGain: 0.35,
    filter: { type: 'lowpass', frequency: 600, Q: 3 }
  }
};

// Audio context singleton
let audioContext = null;
let soundEnabled = true;
let masterVolume = 0.5;

// Initialize audio context on first user interaction
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// Create and play a sound from preset
export function playSoundEvent(eventId, options = {}) {
  if (!soundEnabled) return Promise.resolve();
  
  const preset = SOUND_PRESETS[eventId];
  if (!preset) {
    console.warn(`Sound event "${eventId}" not found`);
    return Promise.resolve();
  }
  
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.gain.value = (options.volume !== undefined ? options.volume : masterVolume) * (preset.masterGain || 1);
  masterGain.connect(ctx.destination);
  
  // Apply filter if specified
  let filterNode = null;
  if (preset.filter) {
    filterNode = ctx.createBiquadFilter();
    filterNode.type = preset.filter.type;
    filterNode.frequency.value = preset.filter.frequency;
    filterNode.Q.value = preset.filter.Q || 1;
    masterGain.connect(filterNode);
    filterNode.connect(ctx.destination);
  }
  
  const outputNode = filterNode || masterGain;
  const promises = [];
  
  preset.oscillators.forEach(oscConfig => {
    const promise = new Promise(resolve => {
      setTimeout(() => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = oscConfig.type;
        oscillator.frequency.value = oscConfig.freq;
        
        // Envelope: attack, decay, sustain, release
        const attackTime = 0.01;
        const decayTime = oscConfig.duration * 0.3;
        const sustainLevel = 0.7;
        const releaseTime = oscConfig.duration * 0.7;
        
        const startTime = ctx.currentTime + (oscConfig.delay || 0);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(oscConfig.gain, startTime + attackTime);
        gainNode.gain.linearRampToValueAtTime(oscConfig.gain * sustainLevel, startTime + attackTime + decayTime);
        gainNode.gain.linearRampToValueAtTime(0, startTime + oscConfig.duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(outputNode);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + oscConfig.duration);
        
        oscillator.onended = resolve;
      }, 0);
      
      promises.push(promise);
    });
  });
  
  return Promise.all(promises);
}

// Play multiple sound events in sequence
export async function playSoundSequence(eventIds, delayBetween = 200) {
  for (const eventId of eventIds) {
    await playSoundEvent(eventId);
    await new Promise(r => setTimeout(r, delayBetween));
  }
}

// Toggle sound on/off
export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  localStorage.setItem('dalli_sound_enabled', enabled.toString());
}

export function isSoundEnabled() {
  return soundEnabled;
}

// Set master volume (0-1)
export function setMasterVolume(volume) {
  masterVolume = Math.max(0, Math.min(1, volume));
  localStorage.setItem('dalli_master_volume', masterVolume.toString());
}

export function getMasterVolume() {
  return masterVolume;
}

// Load settings from localStorage
export function loadSoundSettings() {
  const enabled = localStorage.getItem('dalli_sound_enabled');
  if (enabled !== null) {
    soundEnabled = enabled === 'true';
  }
  const volume = localStorage.getItem('dalli_master_volume');
  if (volume !== null) {
    masterVolume = parseFloat(volume);
  }
}

// Get all available sound events grouped by category
export function getSoundEvents() {
  const events = {};
  for (const [id, preset] of Object.entries(SOUND_PRESETS)) {
    if (!events[preset.category]) {
      events[preset.category] = [];
    }
    events[preset.category].push({
      id,
      name: preset.name,
      category: preset.category
    });
  }
  return events;
}

// Get sound event categories
export function getSoundCategories() {
  const categories = {};
  for (const preset of Object.values(SOUND_PRESETS)) {
    if (!categories[preset.category]) {
      categories[preset.category] = {
        name: preset.category.charAt(0).toUpperCase() + preset.category.slice(1),
        count: 0
      };
    }
    categories[preset.category].count++;
  }
  return categories;
}

// Test a specific sound event
export function testSoundEvent(eventId) {
  return playSoundEvent(eventId);
}

// Preload audio context (call on user interaction)
export function preloadAudioContext() {
  getAudioContext();
  // Play a silent sound to unlock audio context
  const ctx = audioContext;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.01);
}

// Map alert types to sound events
export const ALERT_SOUND_MAP = {
  'follower_spike': 'follower_milestone',
  'follower_milestone': 'follower_milestone',
  'engagement_drop': 'engagement_spike',
  'engagement_spike': 'engagement_spike',
  'video_viral': 'video_viral',
  'video_trending': 'video_viral',
  'roas_increase': 'roas_target_hit',
  'roas_decrease': 'roas_critical_drop',
  'roas_critical': 'roas_critical_drop',
  'budget_exhausted': 'budget_warning',
  'budget_warning': 'budget_warning',
  'campaign_launched': 'campaign_launched',
  'sale_made': 'sale_made',
  'high_value_sale': 'high_value_sale',
  'conversion_milestone': 'conversion_milestone',
  'traffic_spike': 'traffic_spike',
  'traffic_drop': 'traffic_drop',
  'influencer_milestone': 'influencer_milestone',
  'connection_success': 'connection_success',
  'connection_failed': 'connection_failed',
  'sync_completed': 'sync_completed',
  'error': 'error_occurred',
  'critical': 'critical',
  'warning': 'warning',
  'info': 'notification',
  'success': 'success'
};

// Play sound for alert type
export function playAlertSound(alertType) {
  const soundEvent = ALERT_SOUND_MAP[alertType] || 'notification';
  return playSoundEvent(soundEvent);
}

export { SOUND_PRESETS };

export default {
  playSoundEvent,
  playSoundSequence,
  setSoundEnabled,
  isSoundEnabled,
  setMasterVolume,
  getMasterVolume,
  loadSoundSettings,
  getSoundEvents,
  getSoundCategories,
  testSoundEvent,
  preloadAudioContext,
  playAlertSound,
  ALERT_SOUND_MAP,
  SOUND_PRESETS
};