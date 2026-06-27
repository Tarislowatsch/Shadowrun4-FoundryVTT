import { DamageTypes } from '@models/items/weapon.enums.js';

import {
  commerceFields,
  parseNumber,
  sourceOf,
  upper,
  XML_CATEGORY_TO_ENUM,
} from './helpers.js';
import { mapProgram } from './programs.js';

const dt = Object.fromEntries(Object.keys(DamageTypes).map((k) => [k, k]));

/**
 * @param {string} [raw]
 * @returns {string}
 */
function parseAmmoDamageType(raw) {
  const str = (raw ?? '').trim();
  if (!str) return '';
  if (/\(e\)/i.test(str)) return dt.ELECTRICITY;
  const code = str.replace(/\([^)]*\)/g, '');
  return /^s/i.test(code) ? dt.STUN : dt.PHYSICAL;
}

/** @type {{ damageBonus: number, apBonus: number, damageTypeOverride: string, damageOverride: number|null }} */
const EMPTY_WEAPON_BONUS = Object.freeze({
  damageBonus: 0,
  apBonus: 0,
  damageTypeOverride: '',
  damageOverride: null,
});

/**
 * @param {Record<string, string>} bonus
 * @returns {{ damageBonus: number, apBonus: number, damageTypeOverride: string, damageOverride: number|null }}
 */
function mapWeaponBonus(bonus) {
  const replaceType = parseAmmoDamageType(bonus.damagereplace);
  return {
    damageBonus: parseNumber(bonus.damage, 0),
    apBonus: parseNumber(bonus.ap, 0),
    damageTypeOverride: replaceType || parseAmmoDamageType(bonus.damagetype),
    damageOverride: bonus.damagereplace
      ? parseNumber(bonus.damagereplace, 0)
      : null,
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
export function hasWeaponBonus(record) {
  const b = record.weaponbonus;
  return !!b && typeof b === 'object' && !Array.isArray(b);
}

/**
 * @param {Record<string, unknown>} record
 * @returns {Record<string, string>|null}
 */
function parseFlatWeaponBonus(record) {
  const rawDmg = String(record.weaponbonusdamage ?? '').trim();
  const rawAp = String(record.weaponbonusap ?? '').trim();
  if (!rawDmg && !rawAp) return null;
  const match = rawDmg.match(/^([+-]?\d+)\s*(.*)$/);
  return {
    damage: match?.[1] ?? '0',
    damagetype: match?.[2] ?? '',
    ap: rawAp || '0',
  };
}

const AMMO_ACCESSORY_NAMES = new Set(['spare clip', 'speed loader']);

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
export function isAmmunition(record) {
  if (hasWeaponBonus(record) || parseFlatWeaponBonus(record)) return true;
  if (
    String(record.category ?? '')
      .trim()
      .toLowerCase() !== 'ammunition'
  )
    return false;
  return !AMMO_ACCESSORY_NAMES.has(
    String(record.name ?? '')
      .trim()
      .toLowerCase()
  );
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
export function isFocus(record) {
  return String(record.category ?? '').trim() === 'Foci';
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
export function isFetish(record) {
  return String(record.category ?? '').trim() === 'Fetishes';
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
export function isCommlink(record) {
  return upper(record.iscommlink) === 'TRUE';
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
export function isProgram(record) {
  return upper(record.isprogram) === 'TRUE' || upper(record.isos) === 'TRUE';
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapGear(record) {
  const base = {
    ...commerceFields(record),
    rating: parseNumber(record.rating, 0),
    quantity: parseNumber(record.qty, 0),
    source: sourceOf(record),
  };

  if (isAmmunition(record)) {
    const flat = parseFlatWeaponBonus(record);
    const bonus = hasWeaponBonus(record)
      ? mapWeaponBonus(/** @type {any} */ (record.weaponbonus))
      : flat
        ? mapWeaponBonus(flat)
        : EMPTY_WEAPON_BONUS;
    return {
      name: /** @type {string} */ (record.name) ?? 'Unnamed Ammo',
      type: 'Ammo',
      system: {
        ...base,
        ...bonus,
        category: XML_CATEGORY_TO_ENUM[String(record.extra ?? '').trim()] ?? '',
      },
    };
  }

  if (isCommlink(record)) {
    return {
      name: /** @type {string} */ (record.name) ?? 'Unnamed Commlink',
      type: 'Commlink',
      system: {
        ...base,
        response: parseNumber(record.response, 1),
        signal: parseNumber(record.signal, 1),
        firewall: parseNumber(record.firewall, 1),
        os: parseNumber(record.system, 1),
      },
    };
  }

  if (isProgram(record)) {
    return mapProgram(record);
  }

  if (isFocus(record)) {
    return {
      name: /** @type {string} */ (record.name) ?? 'Unnamed Focus',
      type: 'Focus',
      system: {
        ...base,
        equipped: upper(record.equipped) === 'TRUE',
      },
    };
  }

  if (isFetish(record)) {
    return {
      name: /** @type {string} */ (record.name) ?? 'Unnamed Fetish',
      type: 'Fetish',
      system: base,
    };
  }

  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Item',
    type: 'Item',
    system: base,
  };
}
