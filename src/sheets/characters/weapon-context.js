import {
  Attackskill,
  DamageTypes,
  Shootingmodes,
  AmmoCategory,
} from '@models/index';
import {
  computeRangedWeaponDerived,
  computeMeleeWeaponDerived,
} from '@models/shared/weapon-armor-derived';
import {
  buildModPoolFromItems,
  resolveModsAndAvailability,
} from '@sheets/shared/mod-resolution';

/**
 * @param {any[]} items
 * @param {object} [opts]
 * @returns {any[]}
 */
export function buildWeaponContext(
  items,
  { meleeDmgBonus = 0, meleeDamageModifier = 0, unarmedDamageModifier = 0 } = {}
) {
  const allAmmo = items
    .filter((i) => i.type === 'Ammo')
    .map((i) => ({ id: i._id, name: i.name, system: i.system }));
  const ammoById = new Map(allAmmo.map((a) => [a.id, a]));

  const weaponModPool = buildModPoolFromItems(items, 'Weapon Mod');
  const weapons = items.filter(
    (i) => i.type === 'Ranged Weapon' || i.type === 'Melee Weapon'
  );
  const allClaimedIds = new Set(
    weapons.flatMap((w) => w.system?.installedModIds ?? [])
  );

  return weapons.map((w) => {
    const { installedMods: mods, availableMods } = resolveModsAndAvailability(
      weaponModPool,
      w.system?.installedModIds,
      allClaimedIds
    );

    const loadedAmmoItem =
      w.type === 'Ranged Weapon' && w.system?.loadedAmmoId
        ? (ammoById.get(w.system.loadedAmmoId) ?? null)
        : null;

    const derived =
      w.type === 'Ranged Weapon'
        ? computeRangedWeaponDerived(w.system, loadedAmmoItem, mods)
        : computeMeleeWeaponDerived(w.system, mods, {
            strengthBonus: meleeDmgBonus,
            meleeDamageModifier,
            unarmedDamageModifier,
          });

    const ammoDamageOverride = loadedAmmoItem?.system.damageOverride;

    return {
      ...w,
      system: {
        ...w.system,
        ...derived,
      },
      displayAttackSkill:
        Attackskill[w.system?.attackSkill] ?? w.system?.attackSkill ?? '',
      displayDamageType:
        DamageTypes[derived.effectiveDamageType] ??
        derived.effectiveDamageType ??
        '',
      displayMode: Shootingmodes[w.system?.mode] ?? w.system?.mode ?? '',
      availableAmmo:
        w.type === 'Ranged Weapon'
          ? allAmmo.filter(
              (a) =>
                !a.system.category ||
                !w.system?.category ||
                a.system.category === w.system.category
            )
          : [],
      availableWeaponMods: availableMods,
      installedMods: mods,
      loadedAmmo: loadedAmmoItem
        ? {
            name: loadedAmmoItem.name,
            damageBonus: loadedAmmoItem.system.damageBonus ?? 0,
            damageOverride:
              typeof ammoDamageOverride === 'number'
                ? ammoDamageOverride
                : null,
            apBonus: loadedAmmoItem.system.apBonus ?? 0,
            displayDamageTypeOverride: loadedAmmoItem.system.damageTypeOverride
              ? (DamageTypes[loadedAmmoItem.system.damageTypeOverride] ??
                loadedAmmoItem.system.damageTypeOverride)
              : null,
            quantity: loadedAmmoItem.system.quantity ?? 0,
            displayCategory: loadedAmmoItem.system.category
              ? (AmmoCategory[loadedAmmoItem.system.category] ??
                loadedAmmoItem.system.category)
              : null,
          }
        : null,
    };
  });
}
