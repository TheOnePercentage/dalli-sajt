/**
 * fit.js — pure logika za „Pronađi svoju veličinu" (size finder).
 *
 * Koristi se iz ConfiguratorIsland-a; bez React zavisnosti da bi bila
 * jednostavno testabilna u vitest-u i lako prenosiva.
 */

export const BODY_TYPES = [
  { id: 'petit', label: 'Kraća građa (do 165 cm)' },
  { id: 'medium', label: 'Prosečna građa (165–178 cm)' },
  { id: 'tall', label: 'Viša građa (178+ cm)' },
];

export const FIT_LEVELS = [
  { id: 'slim', label: 'Uže / priljubljeno', shift: -1 },
  { id: 'regular', label: 'Standardno', shift: 0 },
  { id: 'loose', label: 'Slobodnije / oversize', shift: 1 },
];

export const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

const BASE_SIZE = { petit: 'S', medium: 'M', tall: 'L' };
const FIT_SHIFT = { slim: -1, regular: 0, loose: 1 };

/**
 * @param {Object} opts
 * @param {string} opts.bodyType - 'petit' | 'medium' | 'tall'
 * @param {string} opts.fit - 'slim' | 'regular' | 'loose'
 * @param {Array<{size:string, available?:boolean}>} opts.availableSizes
 * @returns {{ size: string, note: string }}
 */
export function recommendSize({ bodyType = 'medium', fit = 'regular', availableSizes = [] }) {
  const available = (Array.isArray(availableSizes) ? availableSizes : [])
    .filter(s => s && s.available !== false && typeof s.size === 'string')
    .map(s => s.size);
  const pool = available.length > 0 ? available : SIZE_ORDER;

  const base = SIZE_ORDER.indexOf(BASE_SIZE[bodyType] || 'M');
  const target = Math.min(SIZE_ORDER.length - 1, Math.max(0, base + (FIT_SHIFT[fit] || 0)));
  const targetLabel = SIZE_ORDER[target];

  let size = pool.find(s => s === targetLabel);
  if (!size) {
    const ordered = SIZE_ORDER.filter(s => pool.includes(s));
    const lower = [...ordered].reverse().find(s => SIZE_ORDER.indexOf(s) <= target);
    const upper = ordered.find(s => SIZE_ORDER.indexOf(s) > target);
    size = lower || upper || pool[0];
  }

  const fitLabel = (FIT_LEVELS.find(f => f.id === fit) || FIT_LEVELS[1]).label;
  const bodyLabel = (BODY_TYPES.find(b => b.id === bodyType) || BODY_TYPES[1]).label;
  const note = `Preporuka za ${bodyLabel.toLowerCase()} i kroj „${fitLabel.toLowerCase()}": veličina ${size}.`;
  return { size, note };
}
