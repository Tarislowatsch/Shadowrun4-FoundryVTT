import { sourceOf, upper } from './helpers.js';

/** @type {Record<string, string>} */
const TYPE_MAP = { P: 'PHYSICAL', M: 'MANA' };

/** @type {Record<string, string>} */
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
 * @param {string} category
 * @param {string} descriptor
 * @returns {boolean}
 */
function inferOpposed(category, descriptor) {
  switch (category) {
    case 'DETECTION':
      return /active/i.test(descriptor);
    case 'ILLUSION':
      return descriptor !== '' && !/obvious/i.test(descriptor);
    case 'MANIPULATION':
      return /mental/i.test(descriptor);
    case 'HEALTH':
      return /negative/i.test(descriptor);
    default:
      return false;
  }
}

/**
 * @param {Record<string, string | string[]>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapSpell(record) {
  const rawName = /** @type {string} */ (record.name) ?? 'Unnamed Spell';
  const limited = /\(Limited\)\s*$/i.test(rawName);
  const name = limited
    ? rawName.replace(/\s*\(Limited\)\s*$/i, '').trim()
    : rawName;
  const descriptor = String(record.descriptor ?? record.descriptors ?? '');
  const category = upper(record.category ?? 'COMBAT');
  const combatType = /indirect/i.test(descriptor) ? 'INDIRECT' : 'DIRECT';
  const { range, area: rangeArea } = parseRange(
    /** @type {string} */ (record.range)
  );
  const area =
    rangeArea || (category !== 'DETECTION' && /\barea\b/i.test(descriptor));
  return {
    name,
    type: 'Spell',
    system: {
      category,
      type: TYPE_MAP[upper(record.type)] ?? 'PHYSICAL',
      combatType,
      range,
      area,
      element: combatType === 'INDIRECT' ? inferElement(name) : '',
      duration: DURATION_MAP[upper(record.duration)] ?? 'PERMANENT',
      dv: parseDrain(/** @type {string} */ (record.dv)),
      damageType: upper(record.damage) === 'S' ? 'STUN' : 'PHYSICAL',
      opposed: inferOpposed(category, descriptor),
      limited,
      source: sourceOf(record),
    },
  };
}
