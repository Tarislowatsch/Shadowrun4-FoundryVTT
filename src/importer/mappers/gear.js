/**
 * @fileoverview Pure mapper turning gear statblock records into SR4 item data.
 */

import { commerceFields, parseNumber, sourceOf } from './helpers.js';

/**
 * @param {string} [raw]
 * @returns {string}
 */
function parseAmmoDamageType(raw) {
  const str = (raw ?? '').trim();
  if (!str) return '';
  if (/\(e\)/i.test(str)) return 'ELECTRICITY';
  const code = str.replace(/\([^)]*\)/g, '');
  return /^s/i.test(code) ? 'STUN' : 'PHYSICAL';
}

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
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapGear(record) {
  const base = {
    ...commerceFields(record),
    rating: parseNumber(record.rating, 0),
    source: sourceOf(record),
  };

  if (hasWeaponBonus(record)) {
    return {
      name: /** @type {string} */ (record.name) ?? 'Unnamed Ammo',
      type: 'Ammo',
      system: {
        ...base,
        ...mapWeaponBonus(/** @type {any} */ (record.weaponbonus)),
      },
    };
  }

  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Item',
    type: 'Item',
    system: base,
  };
}
