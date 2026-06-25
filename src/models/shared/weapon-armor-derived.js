export const AP_HALF_TYPES = new Set([
  'ELECTRICITY',
  'FIRE',
  'LASER',
  'STUN_HALF',
  'BLAST',
  'LIGHT',
]);

const EXTERNAL_MOUNTS = new Set(['top', 'barrel', 'under']);

/**
 * @param {any[]} mods - resolved mod system-data-bearing objects (each must have `.system`)
 */
export function hasExternalMountConflict(mods) {
  const seen = new Set();
  for (const m of mods) {
    const mount = m.system?.mount;
    if (!EXTERNAL_MOUNTS.has(mount)) continue;
    if (seen.has(mount)) return true;
    seen.add(mount);
  }
  return false;
}

function computeUsedModSlots(mods) {
  return mods
    .filter((m) => !EXTERNAL_MOUNTS.has(m.system?.mount))
    .reduce((a, m) => a + (m.system?.slotCost ?? 0), 0);
}

/**
 * @param {any[]} items
 * @param {string} type
 */
export function filterModsByType(items, type) {
  return (items ?? []).filter((m) => m?.type === type);
}

/**
 * @param {any[]} mods
 * @param {string} key
 */
export function sumModField(mods, key) {
  return mods.reduce((a, m) => a + (m.system?.[key] ?? 0), 0);
}

/**
 * @param {any[]} mods - resolved mods (each `{ system: {...}, cost?, ... }`)
 * @param {number} [baseCost]
 */
function computeTotalCost(mods, baseCost) {
  return (baseCost ?? 0) + mods.reduce((a, m) => a + (m.system?.cost ?? 0), 0);
}

/**
 * @param {object} system
 * @param {object|null} ammo
 * @param {any[]} mods
 * @returns {{ effectiveDamage: number, effectiveAP: number, effectiveRC: number, effectiveSmartlink: boolean, effectiveDamageType: string, effectiveApHalf: boolean, effectiveArmorType: string, loadedAmmoName: string|null, usedModSlots: number, modSlotWarning: boolean, totalCost: number }}
 */
export function computeRangedWeaponDerived(system, ammo, mods) {
  const ammoDamageOverride = ammo?.system?.damageOverride;

  const modDamageBonus = sumModField(mods, 'damageBonus');
  const effectiveDamage = Math.max(
    0,
    typeof ammoDamageOverride === 'number'
      ? ammoDamageOverride
      : (system.damage ?? 0) + (ammo?.system?.damageBonus ?? 0) + modDamageBonus
  );
  const effectiveAP =
    (system.ap ?? 0) +
    (ammo?.system?.apBonus ?? 0) +
    sumModField(mods, 'apBonus');
  const effectiveRC = (system.rc ?? 0) + sumModField(mods, 'rcBonus');
  const effectiveSmartlink =
    !!system.smartlink || mods.some((m) => m.system?.grantsSmartlink);
  const effectiveDamageType =
    ammo?.system?.damageTypeOverride || system.damageType || '';
  const effectiveApHalf = AP_HALF_TYPES.has(effectiveDamageType);
  const effectiveArmorType = effectiveApHalf
    ? 'impact'
    : (system.armorType ?? 'ballistic');

  const usedModSlots = computeUsedModSlots(mods);

  return {
    effectiveDamage,
    effectiveAP,
    effectiveRC,
    effectiveSmartlink,
    effectiveDamageType,
    effectiveApHalf,
    effectiveArmorType,
    loadedAmmoName: ammo?.name ?? null,
    usedModSlots,
    modSlotWarning:
      hasExternalMountConflict(mods) || usedModSlots > (system.modSlots ?? 6),
    totalCost: computeTotalCost(mods, system.cost),
  };
}

/**
 * @param {object} system
 * @param {any[]} mods
 * @param {object} [modifiers]
 */
export function computeMeleeWeaponDerived(
  system,
  mods,
  { strengthBonus = 0, meleeDamageModifier = 0, unarmedDamageModifier = 0 } = {}
) {
  const strBonus = system.noStrengthBonus ? 0 : strengthBonus;
  const unarmedMod =
    system.attackSkill === 'unarmedcombat' ? unarmedDamageModifier : 0;

  const effectiveDamage = Math.max(
    0,
    (system.damage ?? 0) +
      strBonus +
      meleeDamageModifier +
      unarmedMod +
      sumModField(mods, 'damageBonus')
  );
  const effectiveAP = (system.ap ?? 0) + sumModField(mods, 'apBonus');
  const effectiveDamageType = system.damageType || '';
  const effectiveApHalf = AP_HALF_TYPES.has(effectiveDamageType);
  const effectiveArmorType = effectiveApHalf
    ? 'impact'
    : (system.armorType ?? 'impact');

  const usedModSlots = computeUsedModSlots(mods);

  return {
    effectiveDamage,
    effectiveAP,
    effectiveDamageType,
    effectiveApHalf,
    effectiveArmorType,
    usedModSlots,
    modSlotWarning:
      hasExternalMountConflict(mods) || usedModSlots > (system.modSlots ?? 6),
    totalCost: computeTotalCost(mods, system.cost),
  };
}

/**
 * Computes effective stats for a piece of armor.
 *
 * @param {object} system - armor system data (ballisticarmor, impactarmor, capacity, cost, ...)
 * @param {any[]} mods - resolved installed Armor Mod items (each with `.system`)
 * @returns {{
 *   effectiveBallistic: number, effectiveImpact: number, maxCapacity: number,
 *   usedCapacity: number, capacityWarning: boolean, totalCost: number,
 * }}
 */
export function computeArmorDerived(system, mods) {
  const ballistic = system.ballisticarmor ?? 0;
  const impact = system.impactarmor ?? 0;

  const effectiveBallistic = ballistic + sumModField(mods, 'ballisticBonus');
  const effectiveImpact = impact + sumModField(mods, 'impactBonus');
  const maxCapacity = system.capacity ?? Math.max(ballistic, impact);
  const usedCapacity = sumModField(mods, 'capacityCost');
  const capacityWarning = usedCapacity > maxCapacity;

  return {
    effectiveBallistic,
    effectiveImpact,
    maxCapacity,
    usedCapacity,
    capacityWarning,
    totalCost: computeTotalCost(mods, system.cost),
  };
}
