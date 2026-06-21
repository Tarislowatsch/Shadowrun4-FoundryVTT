/**
 * @fileoverview Pure mapper turning spell statblock records into SR4 item data.
 */

import { sourceOf, upper } from './helpers.js';

/**
 * Maps a single-letter spell type code to the system key.
 * @type {Record<string, string>}
 */
const TYPE_MAP = { P: 'PHYSICAL', M: 'MANA' };

/**
 * Maps a single-letter duration code to the system key.
 * @type {Record<string, string>}
 */
const DURATION_MAP = { I: 'INSTANT', S: 'SUSTAINED', P: 'PERMANENT' };

/**
 * @type {Array<[RegExp, string]>}
 */
const ELEMENT_PATTERNS = [
  [/acid/i, 'ACID'],
  [/lightning|electr/i, 'ELECTRICITY'],
  [/fire|flame|fireball/i, 'FIRE'],
  [/radiation/i, 'RADIATION'],
  [/sound|noise/i, 'SOUND'],
  [/blast/i, 'BLAST'],
  [/ice|frost|cold/i, 'ICE'],
  [/light/i, 'LIGHT'],
  [/metal/i, 'METAL'],
  [/sand/i, 'SAND'],
  [/smoke/i, 'SMOKE'],
  [/water/i, 'WATER'],
];

/**
 * @param {string} [raw]
 * @returns {{ range: string, area: boolean }}
 */
function parseRange(raw) {
  const str = (raw ?? '').trim();
  const area = /\(\s*a\s*\)/i.test(str);
  const base = str
    .replace(/\(\s*a\s*\)/i, '')
    .trim()
    .toUpperCase();
  let range = 'LOS';
  if (base.startsWith('T')) range = 'TOUCH';
  else if (base === 'SELF' || base === 'S') range = 'SELF';
  else if (base.startsWith('LOS') || base === 'LOI') range = 'LOS';
  return { range, area };
}

/**
 * @param {string} [raw]
 * @returns {number}
 */
function parseDrain(raw) {
  const match = String(raw ?? '').match(/([+-]\s*\d+)\s*$/);
  return match ? parseInt(match[1].replace(/\s+/g, ''), 10) : 0;
}

/**
 * @param {string} [name]
 * @returns {string}
 */
function inferElement(name) {
  for (const [pattern, element] of ELEMENT_PATTERNS) {
    if (pattern.test(name ?? '')) return element;
  }
  return '';
}

/**
 * @param {Record<string, string | string[]>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapSpell(record) {
  const name = /** @type {string} */ (record.name) ?? 'Unnamed Spell';
  const descriptor = String(record.descriptor ?? '');
  const combatType = /indirect/i.test(descriptor) ? 'INDIRECT' : 'DIRECT';
  const { range, area } = parseRange(/** @type {string} */ (record.range));
  return {
    name,
    type: 'Spell',
    system: {
      category: upper(record.category ?? 'COMBAT'),
      type: TYPE_MAP[upper(record.type)] ?? 'PHYSICAL',
      combatType,
      range,
      area,
      element: combatType === 'INDIRECT' ? inferElement(name) : '',
      duration: DURATION_MAP[upper(record.duration)] ?? 'PERMANENT',
      dv: parseDrain(/** @type {string} */ (record.dv)),
      damageType: upper(record.damage) === 'S' ? 'STUN' : 'PHYSICAL',
      source: sourceOf(record),
    },
  };
}
