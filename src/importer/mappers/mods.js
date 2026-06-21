import { commerceFields, parseNumber, sourceOf } from './helpers.js';

const WEAPON_MOD_CATEGORIES = new Set(['Weapon Mod', 'Special Mod']);

/**
 * @param {unknown} raw
 * @returns {'top'|'barrel'|'under'|'internal'}
 */
export function parseMount(raw) {
  // Combined mounts like "Top/Under" resolve to their first listed point.
  const first = String(raw ?? '')
    .split('/')[0]
    .trim()
    .toLowerCase();
  if (first === 'top') return 'top';
  if (first === 'barrel') return 'barrel';
  if (first === 'under') return 'under';
  return 'internal';
}

/**
 * @param {unknown} value
 * @param {number} rating
 * @returns {number}
 */
function resolveBonus(value, rating) {
  if (value === undefined || value === null) return 0;
  const str = String(value);
  const formula = str.match(/rating\s*\*\s*([\d.]+)/i);
  if (formula) return rating * parseFloat(formula[1]);
  if (/^rating$/i.test(str.trim())) return rating;
  return parseNumber(value, 0);
}

/**
 * @param {Record<string, unknown>} record
 * @returns {'armor'|'weapon'|'vehicle'}
 */
export function modKind(record) {
  if (
    record.armorcapacity !== undefined ||
    (record.b !== undefined && record.i !== undefined)
  ) {
    return 'armor';
  }
  if (WEAPON_MOD_CATEGORIES.has(String(record.category ?? ''))) {
    return 'weapon';
  }
  return 'vehicle';
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapWeaponMod(record) {
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Weapon Mod',
    type: 'Weapon Mod',
    system: {
      ...commerceFields(record),
      rating: parseNumber(record.rating, 0),
      damageBonus: parseNumber(record.dvbonus, 0),
      apBonus: parseNumber(record.apbonus, 0),
      rcBonus: parseNumber(record.rc, 0),
      grantsSmartlink: /smart/i.test(String(record.name ?? '')),
      modeOverride: '',
      mount: parseMount(record.mount),
      slotCost: parseNumber(record.slots, 1),
      source: sourceOf(record),
    },
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapArmorMod(record) {
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Armor Mod',
    type: 'Armor Mod',
    system: {
      ...commerceFields(record),
      rating: parseNumber(record.maxrating, 0),
      ballisticBonus: parseNumber(record.b, 0),
      impactBonus: parseNumber(record.i, 0),
      capacityCost: parseNumber(record.armorcapacity, 0),
      source: sourceOf(record),
    },
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapVehicleMod(record) {
  const rating = parseNumber(record.rating, 0);
  const bonus = /** @type {Record<string, unknown>} */ (
    record.bonus && typeof record.bonus === 'object' ? record.bonus : {}
  );
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Vehicle Mod',
    type: 'Vehicle Mod',
    system: {
      ...commerceFields(record),
      rating,
      handlingBonus: resolveBonus(bonus.handling, rating),
      speedBonus: resolveBonus(bonus.speed, rating),
      accelBonus: resolveBonus(bonus.accel, rating),
      armorBonus: resolveBonus(bonus.armor, rating),
      sensorBonus:
        parseNumber(record.improvesensor, 0) +
        resolveBonus(bonus.sensor, rating),
      bodyBonus: resolveBonus(bonus.body, rating),
      pilotBonus: resolveBonus(bonus.pilot, rating),
      slotCost: parseNumber(record.slots, 1),
      source: sourceOf(record),
    },
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapMod(record) {
  switch (modKind(record)) {
    case 'armor':
      return mapArmorMod(record);
    case 'weapon':
      return mapWeaponMod(record);
    default:
      return mapVehicleMod(record);
  }
}
