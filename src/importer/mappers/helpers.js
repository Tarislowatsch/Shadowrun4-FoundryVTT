import { dt } from './constants.js';

/**
 * @param {Record<string, unknown>} record
 * @param {string} field
 * @returns {string}
 */
export function englishOr(record, field) {
  const en = record[`${field}_english`];
  if (en !== undefined && en !== null && String(en).trim() !== '') {
    return String(en).trim();
  }
  return String(record[field] ?? '').trim();
}

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
  const normalized = value.replace(/,/g, '.');
  const match = normalized.match(/\d*\.\d+|\d+/);
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
    damageType = /[SG]/i.test(code) && !/P/i.test(code) ? dt.STUN : dt.PHYSICAL;
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

/** @type {Record<string, string>} */
const DE_MODE_LETTER_MAP = { EM: 'SS', HM: 'SA', SM: 'BF', AM: 'FA' };

/**
 * @param {string} [raw]
 * @returns {string}
 */
export function normalizeMode(raw) {
  const str = (raw ?? '').trim();
  if (str === '0' || str === '') return '';
  const translated = str
    .split('/')
    .map((token) => DE_MODE_LETTER_MAP[token] ?? token)
    .join('/');
  return CHUMMER_MODE_MAP[translated] ?? translated;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function textOf(value) {
  if (value !== null && typeof value === 'object') {
    const text = /** @type {Record<string, unknown>} */ (value)['#text'];
    return String(text ?? '').trim();
  }
  return String(value ?? '').trim();
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
    if (Array.isArray(val)) return val.map(textOf).filter(Boolean);
    const single = textOf(val);
    return single ? [single] : [];
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
  if (Array.isArray(raw)) return raw.map(textOf).filter(Boolean);
  if (typeof raw === 'object') {
    const obj = /** @type {Record<string, unknown>} */ (raw);
    const power = obj.power;
    if (Array.isArray(power)) return power.map(textOf).filter(Boolean);
    const single = textOf(power);
    if (single) return [single];
    return [];
  }
  const text = textOf(raw);
  return text ? [text] : [];
}
