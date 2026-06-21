/**
 * @fileoverview Shared pure helpers for the XML statblock mappers.
 * No DOM or Foundry dependencies — safe to unit test under Node.
 */

/**
 * @type {Record<string, string>}
 */
export const CATEGORY_TO_ATTACKSKILL = {
  Blades: 'BLADES',
  Clubs: 'CLUBS',
  'Exotic Melee Weapons': 'EXOTIC_MELEE',
  'Exotic Ranged Weapons': 'EXOTIC_RANGED',
  Unarmed: 'UNARMED',
  Bows: 'ARCHERY',
  Crossbows: 'ARCHERY',
  'Throwing Weapons': 'THROWING',
  Tasers: 'PISTOLS',
  Holdouts: 'PISTOLS',
  'Light Pistols': 'PISTOLS',
  'Heavy Pistols': 'PISTOLS',
  'Machine Pistols': 'AUTOMATICS',
  'Submachine Guns': 'AUTOMATICS',
  'Assault Rifles': 'AUTOMATICS',
  'Battle Rifles': 'LONGARMS',
  'Sports Rifles': 'LONGARMS',
  'Sniper Rifles': 'LONGARMS',
  Shotguns: 'LONGARMS',
  'Special Weapons': 'HEAVY_WEAPONS',
  'Light Machine Guns': 'HEAVY_WEAPONS',
  'Medium Machine Guns': 'HEAVY_WEAPONS',
  'Heavy Machine Guns': 'HEAVY_WEAPONS',
  'Assault Cannons': 'HEAVY_WEAPONS',
  Flamethrowers: 'HEAVY_WEAPONS',
  'Laser Weapons': 'HEAVY_WEAPONS',
  'Grenade Launchers': 'HEAVY_WEAPONS',
  'Mortar Launchers': 'HEAVY_WEAPONS',
  'Missile Launchers': 'HEAVY_WEAPONS',
  'Vehicle Weapons': 'HEAVY_WEAPONS',
};

/**
 * @type {Record<string, string>}
 */
export const ATTRIBUTE_ABBR_TO_KEY = {
  BOD: 'BODY',
  AGI: 'AGILITY',
  REA: 'REACTION',
  STR: 'STRENGTH',
  WIL: 'WILLPOWER',
  LOG: 'LOGIC',
  INT: 'INTUITION',
  CHA: 'CHARISMA',
  EDG: 'EDGE',
  ESS: 'ESSENCE',
  MAG: 'MAGIC',
  RES: 'RESONANCE',
};

/**
 * @param {unknown} value
 * @param {number} [fallback=0]
 * @returns {number}
 */
export function parseNumber(value, fallback = 0) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return fallback;
  const match = value.match(/[+-]?\d+/);
  return match ? parseInt(match[0], 10) : fallback;
}

/**
 * @param {unknown} value
 * @param {number} [fallback=0]
 * @returns {number}
 */
export function parseDecimal(value, fallback = 0) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return fallback;
  const match = value.match(/\d*\.\d+|\d+/);
  return match ? parseFloat(match[0]) : fallback;
}

/**
 * @param {string} [source]
 * @param {string} [page]
 * @returns {string}
 */
export function formatSource(source, page) {
  const book = (source ?? '').trim();
  const pg = (page ?? '').trim();
  if (book && pg && pg !== '0') return `${book} p. ${pg}`;
  return book;
}

/**
 * @param {Record<string, unknown>} record
 * @returns {string}
 */
export function sourceOf(record) {
  return formatSource(
    /** @type {string} */ (record.source),
    /** @type {string} */ (record.page)
  );
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ cost: number, avail: number, availability: string }}
 */
export function commerceFields(record) {
  return {
    cost: parseNumber(record.cost, 0),
    avail: parseNumber(record.avail, 0),
    availability: String(record.avail ?? '').trim(),
  };
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function upper(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

/**
 * @typedef {object} ParsedDamage
 * @property {number} damage
 * @property {string} damageType - One of PHYSICAL, STUN, ELECTRICITY, FIRE.
 * @property {boolean} strengthBased - True for Strength-scaling melee damage.
 */

/**
 * @param {string} [raw]
 * @returns {ParsedDamage}
 */
export function parseDamage(raw) {
  const str = (raw ?? '').trim();
  if (!str) return { damage: 0, damageType: 'PHYSICAL', strengthBased: false };

  const strengthBased = /STR/i.test(str);
  let damage;
  if (strengthBased) {
    const offset = str.match(/STR\s*\/\s*2\s*([+-]\s*\d+)/i);
    damage = offset ? parseInt(offset[1].replace(/\s+/g, ''), 10) : 0;
  } else {
    const match = str.match(/\d+/);
    damage = match ? parseInt(match[0], 10) : 0;
  }

  let damageType;
  if (/\(e\)/i.test(str)) damageType = 'ELECTRICITY';
  else if (/\(f\)/i.test(str)) damageType = 'FIRE';
  else {
    const code = str.replace(/STR/gi, '').replace(/\([^)]*\)/g, '');
    damageType = /S/i.test(code) && !/P/i.test(code) ? 'STUN' : 'PHYSICAL';
  }

  return { damage, damageType, strengthBased };
}

/**
 * @typedef {object} ParsedAmmo
 * @property {number} capacity
 * @property {string} feed - Magazine feed abbreviation (e.g. "c", "m", "cy").
 */

/**
 * @param {string} [raw]
 * @returns {ParsedAmmo}
 */
export function parseAmmo(raw) {
  const str = (raw ?? '').trim();
  const multi = str.match(/(\d+)\s*x\s*(\d+)/i);
  const capacity = multi
    ? parseInt(multi[1], 10) * parseInt(multi[2], 10)
    : parseNumber(str, 0);
  const feed = str.match(/\(([a-z]+)\)/i);
  return { capacity, feed: feed ? feed[1].toLowerCase() : '' };
}

/**
 * @param {string} [raw]
 * @returns {string}
 */
export function normalizeMode(raw) {
  const str = (raw ?? '').trim();
  return str === '0' ? '' : str;
}
