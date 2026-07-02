import { sourceOf, upper } from './helpers.js';

/** @type {Record<string, string>} */
const TYPE_MAP = { P: 'PHYSICAL', M: 'MANA' };

/** @type {Record<string, string>} */
const DURATION_MAP = { I: 'INSTANT', S: 'SUSTAINED', P: 'PERMANENT' };

/**
 * German Chummer exports carry no `_english` fields for spells, and their
 * duration/category letters collide with the English scheme (e.g. "S" means
 * Sofort/Instant in German but Sustained in English) — detect German via the
 * category word and switch both maps together. Category names not in this
 * table but ending in "ZAUBER" (German for "spell") still count as German so
 * the duration map doesn't fall back to the wrong (English) scheme.
 * @type {Record<string, string>}
 */
const DE_CATEGORY_MAP = {
  KAMPFZAUBER: 'COMBAT',
  DETEKTIONSZAUBER: 'DETECTION',
  WAHRNEHMUNGSZAUBER: 'DETECTION',
  GESUNDHEITSZAUBER: 'HEALTH',
  HEILZAUBER: 'HEALTH',
  ILLUSIONSZAUBER: 'ILLUSION',
  MANIPULATIONSZAUBER: 'MANIPULATION',
  GEOMANTIEZAUBER: 'GEOMANCY',
};

/** @type {Record<string, string>} */
const DE_TO_EN_DURATION_LETTER = { S: 'I', A: 'S', P: 'P' };

/**
 * @type {Array<[RegExp, string]>}
 */
const ELEMENT_PATTERNS = [
  [/acid|säure/i, 'ACID'],
  [/lightning|electr|blitz|elektr/i, 'ELECTRICITY'],
  [/fire|flame|fireball|feuer/i, 'FIRE'],
  [/radiation|strahlung/i, 'RADIATION'],
  [/sound|noise|lärm|klang/i, 'SOUND'],
  [/blast|explosion/i, 'BLAST'],
  [/ice|frost|cold|eis|kälte/i, 'ICE'],
  [/light|licht/i, 'LIGHT'],
  [/metal/i, 'METAL'],
  [/sand/i, 'SAND'],
  [/smoke|rauch/i, 'SMOKE'],
  [/water|wasser/i, 'WATER'],
];

/**
 * @param {string} [raw]
 * @returns {{ range: string, area: boolean }}
 */
function parseRange(raw) {
  const str = (raw ?? '').trim();
  const area = /\(\s*[af]\s*\)/i.test(str);
  const base = str
    .replace(/\(\s*[af]\s*\)/i, '')
    .trim()
    .toUpperCase();
  let range = 'LOS';
  if (base === 'B' || base.startsWith('T')) range = 'TOUCH';
  else if (base === 'SELF' || base === 'SELBST' || base === 'S') range = 'SELF';
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
      return /active|aktiv/i.test(descriptor);
    case 'ILLUSION':
      return descriptor !== '' && !/obvious|offensichtlich/i.test(descriptor);
    case 'MANIPULATION':
      return /mental/i.test(descriptor);
    case 'HEALTH':
      return /negativ/i.test(descriptor);
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
  const rawCategory = upper(record.category ?? '');
  const deCategory = DE_CATEGORY_MAP[rawCategory];
  const isGerman = deCategory !== undefined || /ZAUBER$/.test(rawCategory);
  const category = deCategory ?? (rawCategory || 'COMBAT');
  const combatType = /indire[ck]t/i.test(descriptor) ? 'INDIRECT' : 'DIRECT';
  const { range, area: rangeArea } = parseRange(
    /** @type {string} */ (record.range)
  );
  const area =
    rangeArea ||
    (category !== 'DETECTION' && /\b(area|fläche)\b/i.test(descriptor));
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
      duration:
        DURATION_MAP[
          isGerman
            ? (DE_TO_EN_DURATION_LETTER[upper(record.duration)] ?? '')
            : upper(record.duration)
        ] ?? 'PERMANENT',
      dv: parseDrain(/** @type {string} */ (record.dv)),
      damageType: ['S', 'G'].includes(upper(record.damage))
        ? 'STUN'
        : 'PHYSICAL',
      opposed: inferOpposed(category, descriptor),
      limited,
      source: sourceOf(record),
    },
  };
}
