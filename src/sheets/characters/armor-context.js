import { computeArmorDerived } from '@models/shared/weapon-armor-derived';
import {
  buildModPoolFromItems,
  resolveModsAndAvailability,
} from '@sheets/shared/mod-resolution';

/**
 * @param {any[]} items
 * @returns {any[]}
 */
export function buildArmorContext(items) {
  const armorModPool = buildModPoolFromItems(items, 'Armor Mod');
  const armors = items.filter((i) => i.type === 'Armor');
  const allClaimedIds = new Set(
    armors.flatMap((a) => a.system?.installedModIds ?? [])
  );

  return armors.map((a) => {
    const { installedMods: mods, availableMods } = resolveModsAndAvailability(
      armorModPool,
      a.system?.installedModIds,
      allClaimedIds
    );

    const derived = computeArmorDerived(a.system, mods);

    return {
      ...a,
      system: {
        ...a.system,
        ...derived,
      },
      availableArmorMods: availableMods,
      installedMods: mods,
    };
  });
}
