import { commerceFields, englishOr, parseNumber, sourceOf } from './helpers.js';
import { XML_CATEGORY_TO_ENUM, dt } from './constants.js';

/**
 * @param {unknown} [raw]
 * @returns {string}
 */
function parseAmmoDamageType(raw) {
  const str = String(raw ?? '').trim();
  if (!str) return '';
  if (/\(e\)/i.test(str)) return dt.ELECTRICITY;
  const code = str.replace(/\([^)]*\)/g, '');
  return /^[sg]/i.test(code) ? dt.STUN : dt.PHYSICAL;
}

/** @type {{ damageBonus: number, apBonus: number, damageTypeOverride: string, damageOverride: number|null }} */
export const EMPTY_WEAPON_BONUS = Object.freeze({
  damageBonus: 0,
  apBonus: 0,
  damageTypeOverride: '',
  damageOverride: null,
});

/**
 * @param {Record<string, unknown>} bonus
 * @returns {{ damageBonus: number, apBonus: number, damageTypeOverride: string, damageOverride: number|null }}
 */
export function mapWeaponBonus(bonus) {
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
export function parseFlatWeaponBonus(record) {
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
function isAmmoAccessoryName(record) {
  return AMMO_ACCESSORY_NAMES.has(
    String(record.name ?? '')
      .trim()
      .toLowerCase()
  );
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
export function isAmmunition(record) {
  if (hasWeaponBonus(record) || parseFlatWeaponBonus(record)) return true;
  if (englishOr(record, 'category').toLowerCase() !== 'ammunition') {
    return false;
  }
  return !isAmmoAccessoryName(record);
}

/**
 * True for gear excluded from `isAmmunition` solely by name (spare clips,
 * speed loaders) despite carrying the raw "Ammunition" XML category — these
 * must not reuse the literal "Ammunition" subcategory, or grouping.js would
 * compute the same compendium name as the real Ammunition group and collide.
 *
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
export function isAmmoAccessory(record) {
  return (
    !hasWeaponBonus(record) &&
    !parseFlatWeaponBonus(record) &&
    englishOr(record, 'category').toLowerCase() === 'ammunition' &&
    isAmmoAccessoryName(record)
  );
}

/**
 * Ammo's `extra` field has no `_english` sibling in Chummer exports.
 * @param {Record<string, unknown>} record
 * @param {Map<string, string>} [weaponCategoryTranslations]
 * @returns {string}
 */
export function resolveAmmoWeaponCategory(record, weaponCategoryTranslations) {
  const raw = englishOr(record, 'extra');
  if (XML_CATEGORY_TO_ENUM[raw]) return raw;
  return weaponCategoryTranslations?.get(raw) ?? raw;
}

/**
 * @param {Record<string, unknown>} record
 * @param {Map<string, string>} [weaponCategoryTranslations]
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapAmmo(record, weaponCategoryTranslations) {
  const flat = parseFlatWeaponBonus(record);
  const bonus = hasWeaponBonus(record)
    ? mapWeaponBonus(
        /** @type {Record<string, unknown>} */ (record.weaponbonus)
      )
    : flat
      ? mapWeaponBonus(flat)
      : EMPTY_WEAPON_BONUS;
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Ammo',
    type: 'Ammo',
    system: {
      ...commerceFields(record),
      rating: parseNumber(record.rating, 0),
      quantity: parseNumber(record.qty, 0),
      source: sourceOf(record),
      ...bonus,
      category:
        XML_CATEGORY_TO_ENUM[
          resolveAmmoWeaponCategory(record, weaponCategoryTranslations)
        ] ?? '',
    },
  };
}
