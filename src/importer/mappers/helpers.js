/**
 * @fileoverview Shared pure helpers for the XML statblock mappers.
 * No DOM or Foundry dependencies — safe to unit test under Node.
 *
 * Mapping tables derive their target keys from the model-layer enums
 * (weapon.enums.js, attribute.enum.js) to maintain a single source of truth.
 */

import {
  WeaponCategory,
  Attackskill,
  DamageTypes,
} from '@models/items/weapon.enums.js';
import { SR4Attributes } from '@models/attribute.enum.js';

/**
 * Converts an enum object into a `{ KEY: 'KEY' }` identity map so mapping
 * tables can reference enum keys without hardcoded strings.
 *
 * @param {Record<string, string>} enumObj
 * @returns {Record<string, string>}
 */
function keyMap(enumObj) {
  return Object.fromEntries(Object.keys(enumObj).map((k) => [k, k]));
}

const wc = keyMap(WeaponCategory);
const as = keyMap(Attackskill);
const dt = keyMap(DamageTypes);
const attr = keyMap(SR4Attributes);

/**
 * @type {Record<string, string>}
 */
export const CATEGORY_TO_ATTACKSKILL = {
  Blades: as.BLADES,
  Clubs: as.CLUBS,
  'Exotic Melee Weapons': as.EXOTIC_MELEE,
  'Exotic Ranged Weapons': as.EXOTIC_RANGED,
  Unarmed: as.UNARMED,
  Bows: as.ARCHERY,
  Crossbows: as.ARCHERY,
  'Throwing Weapons': as.THROWING,
  Tasers: as.PISTOLS,
  Holdouts: as.PISTOLS,
  'Light Pistols': as.PISTOLS,
  'Heavy Pistols': as.PISTOLS,
  'Machine Pistols': as.AUTOMATICS,
  'Submachine Guns': as.AUTOMATICS,
  'Assault Rifles': as.AUTOMATICS,
  'Battle Rifles': as.LONGARMS,
  'Sports Rifles': as.LONGARMS,
  'Sniper Rifles': as.LONGARMS,
  Shotguns: as.LONGARMS,
  'Special Weapons': as.HEAVY_WEAPONS,
  'Light Machine Guns': as.HEAVY_WEAPONS,
  'Medium Machine Guns': as.HEAVY_WEAPONS,
  'Heavy Machine Guns': as.HEAVY_WEAPONS,
  'Assault Cannons': as.HEAVY_WEAPONS,
  Flamethrowers: as.HEAVY_WEAPONS,
  'Laser Weapons': as.HEAVY_WEAPONS,
  'Grenade Launchers': as.HEAVY_WEAPONS,
  'Mortar Launchers': as.HEAVY_WEAPONS,
  'Missile Launchers': as.HEAVY_WEAPONS,
  'Vehicle Weapons': as.HEAVY_WEAPONS,
};

/**
 * @type {Record<string, string>}
 */
export const XML_CATEGORY_TO_ENUM = {
  Blades: wc.BLADES,
  Clubs: wc.CLUBS,
  'Exotic Melee Weapons': wc.EXOTIC_MELEE_WEAPONS,
  'Exotic Ranged Weapons': wc.EXOTIC_RANGED_WEAPONS,
  Unarmed: wc.UNARMED,
  Bows: wc.BOWS,
  Crossbows: wc.CROSSBOWS,
  'Throwing Weapons': wc.THROWING_WEAPONS,
  Tasers: wc.TASERS,
  Holdouts: wc.HOLDOUTS,
  'Light Pistols': wc.LIGHT_PISTOLS,
  'Heavy Pistols': wc.HEAVY_PISTOLS,
  'Machine Pistols': wc.MACHINE_PISTOLS,
  'Submachine Guns': wc.SUBMACHINE_GUNS,
  'Assault Rifles': wc.ASSAULT_RIFLES,
  'Battle Rifles': wc.BATTLE_RIFLES,
  'Sports Rifles': wc.SPORTS_RIFLES,
  'Sniper Rifles': wc.SNIPER_RIFLES,
  Shotguns: wc.SHOTGUNS,
  'Special Weapons': wc.SPECIAL_WEAPONS,
  'Light Machine Guns': wc.LIGHT_MACHINE_GUNS,
  'Medium Machine Guns': wc.MEDIUM_MACHINE_GUNS,
  'Heavy Machine Guns': wc.HEAVY_MACHINE_GUNS,
  'Assault Cannons': wc.ASSAULT_CANNONS,
  Flamethrowers: wc.FLAMETHROWERS,
  'Laser Weapons': wc.LASER_WEAPONS,
  'Grenade Launchers': wc.GRENADE_LAUNCHERS,
  'Mortar Launchers': wc.MORTAR_LAUNCHERS,
  'Missile Launchers': wc.MISSILE_LAUNCHERS,
  'Vehicle Weapons': wc.VEHICLE_WEAPONS,
  Gear: wc.GEAR,
  'Underbarrel Weapons': wc.UNDERBARREL_WEAPONS,
  Cyberware: wc.CYBERWARE,
};

/**
 * @type {Record<string, string>}
 */
export const ATTRIBUTE_ABBR_TO_KEY = {
  BOD: attr.BODY,
  AGI: attr.AGILITY,
  REA: attr.REACTION,
  STR: attr.STRENGTH,
  WIL: attr.WILLPOWER,
  LOG: attr.LOGIC,
  INT: attr.INTUITION,
  CHA: attr.CHARISMA,
  EDG: attr.EDGE,
  ESS: attr.ESSENCE,
  MAG: attr.MAGIC,
  RES: attr.RESONANCE,
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
  if (!str) return { damage: 0, damageType: dt.PHYSICAL, strengthBased: false };

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
  if (/\(e\)/i.test(str)) damageType = dt.ELECTRICITY;
  else if (/\(f\)/i.test(str)) damageType = dt.FIRE;
  else {
    const code = str.replace(/STR/gi, '').replace(/\([^)]*\)/g, '');
    damageType = /S/i.test(code) && !/P/i.test(code) ? dt.STUN : dt.PHYSICAL;
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

/** @type {Record<string, string>} */
const CHUMMER_MODE_MAP = {
  SS: 'SINGLE_SHOT',
  SA: 'SEMI_AUTOMATIC',
  BF: 'BURST_FIRE',
  FA: 'FULL_AUTO',
  'SS/SA': 'SINGLE_SEMI',
  'SS/SA/BF': 'SINGLE_SEMI_BURST',
  'SS/SA/BF/FA': 'SINGLE_SEMI_BURST_FULL_AUTO',
  'BF/FA': 'BURST_FULL_AUTO',
  'SA/BF': 'SEMI_BURST',
  'SA/BF/FA': 'SEMI_BURST_FULL_AUTO',
};

/**
 * @param {string} [raw]
 * @returns {string}
 */
export function normalizeMode(raw) {
  const str = (raw ?? '').trim();
  if (str === '0' || str === '') return '';
  return CHUMMER_MODE_MAP[str] ?? str;
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ positive: string[], negative: string[] }}
 */
export function parseQualities(record) {
  const raw = record.qualities;
  if (!raw || typeof raw !== 'object') return { positive: [], negative: [] };

  const q = /** @type {Record<string, unknown>} */ (raw);
  const toArray = (/** @type {unknown} */ val) => {
    if (Array.isArray(val))
      return val.map((v) => String(v).trim()).filter(Boolean);
    if (typeof val === 'string' && val.trim()) return [val.trim()];
    return [];
  };

  const pos = q.positive;
  const neg = q.negative;
  return {
    positive: toArray(
      pos && typeof pos === 'object' && !Array.isArray(pos)
        ? /** @type {Record<string, unknown>} */ (pos).quality
        : pos
    ),
    negative: toArray(
      neg && typeof neg === 'object' && !Array.isArray(neg)
        ? /** @type {Record<string, unknown>} */ (neg).quality
        : neg
    ),
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ reach: number, armorBallistic: number, armorImpact: number }}
 */
export function parseBonus(record) {
  const bonus = record.bonus;
  if (!bonus || typeof bonus !== 'object')
    return { reach: 0, armorBallistic: 0, armorImpact: 0 };
  const b = /** @type {Record<string, unknown>} */ (bonus);
  const armor = b.armor;
  let armorBallistic = 0;
  let armorImpact = 0;
  if (armor && typeof armor === 'object') {
    const a = /** @type {Record<string, unknown>} */ (armor);
    armorBallistic = parseNumber(a.b, 0);
    armorImpact = parseNumber(a.i, 0);
  }
  return { reach: parseNumber(b.reach, 0), armorBallistic, armorImpact };
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} field
 * @returns {string[]}
 */
export function parsePowerList(record, field) {
  const raw = record[field];
  if (!raw) return [];
  if (Array.isArray(raw))
    return raw.map((v) => String(v).trim()).filter(Boolean);
  if (typeof raw === 'object') {
    const obj = /** @type {Record<string, unknown>} */ (raw);
    const power = obj.power;
    if (Array.isArray(power))
      return power.map((v) => String(v).trim()).filter(Boolean);
    if (typeof power === 'string' && power.trim()) return [power.trim()];
  }
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
  return [];
}

/** @type {Array<[string, string]>} [xmlPrefix, attrKey] */
export const ATTRIBUTE_MAP = [
  ['bod', 'body'],
  ['agi', 'agility'],
  ['rea', 'reaction'],
  ['str', 'strength'],
  ['cha', 'charisma'],
  ['int', 'intuition'],
  ['log', 'logic'],
  ['wil', 'willpower'],
  ['ini', 'initiative'],
  ['edg', 'edge'],
  ['mag', 'magic'],
  ['res', 'resonance'],
  ['ess', 'essence'],
];

/** @type {Set<string>} */
export const FORCE_SPIRIT_CATEGORIES = new Set([
  'Spirits',
  'Toxic Spirits',
  'Insect Spirits',
  'Shadow Spirits',
  'Primordial Spirits',
  'Fey',
  'Ghosts and Haunts',
  'Harbingers',
  'Shedim',
  'Imps',
]);

/** @type {Set<string>} */
export const FORCE_SPRITE_CATEGORIES = new Set([
  'Sprites',
  'Entropic Sprites',
  'Technocritters',
  'Protosapients',
  'A.I.s',
]);

/** @type {Set<string>} */
export const FIXED_CRITTER_CATEGORIES = new Set([
  'Mundane Critters',
  'Paranormal Critters',
  'Dracoforms',
  'Infected',
  'Mutant Critters',
  'Toxic Critters',
]);

/** @type {Set<string>} */
export const ALL_CRITTER_CATEGORIES = new Set([
  ...FORCE_SPIRIT_CATEGORIES,
  ...FORCE_SPRITE_CATEGORIES,
  ...FIXED_CRITTER_CATEGORIES,
]);

/**
 * @param {string} category
 * @returns {'npc'|'spirit'|'sprite'}
 */
export function critterActorType(category) {
  if (FORCE_SPIRIT_CATEGORIES.has(category)) return 'spirit';
  if (FORCE_SPRITE_CATEGORIES.has(category)) return 'sprite';
  return 'npc';
}
