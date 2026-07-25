import {
  ImplantGrades,
  ImplantTypes,
  implantEssenceMultiplier,
} from '@models/index';
import { computeEssenceLoss, truncate2 } from './actor-context.js';

/**
 * @param {object[]} implants
 * @param {object} sys
 */
export function buildImplantContext(implants, sys) {
  for (const item of implants) {
    item.displayType = ImplantTypes[item.system.type] ?? item.system.type ?? '';
    item.displayGrade =
      ImplantGrades[item.system.grade] ?? item.system.grade ?? '';
    const mult = implantEssenceMultiplier(item.system.type, {
      biocompatibility: sys.biocompatibility,
      sensitiveSystem: sys.sensitiveSystem,
    });
    item.essenceActualEffective = truncate2(
      (item.system.essenceActual ?? 0) * mult
    ).toFixed(2);
  }
  const groups = Object.entries(ImplantTypes).map(([key, label]) => ({
    label: game.i18n.localize(label),
    items: implants.filter((i) => i.system.type === key),
  }));
  const cyberEss = sys.derivedStats?.essenceLossCyber ?? 0;
  const bioEss = sys.derivedStats?.essenceLossBio ?? 0;
  const essenceLoss = computeEssenceLoss(cyberEss, bioEss);
  return {
    implantsByType: groups.filter((g) => g.items.length > 0),
    essenceCyber: truncate2(cyberEss).toFixed(2),
    essenceBio: truncate2(bioEss).toFixed(2),
    essenceHalved: truncate2(
      cyberEss >= bioEss ? bioEss / 2 : cyberEss / 2
    ).toFixed(2),
    essenceHalvedLabel: cyberEss >= bioEss ? 'bio' : 'cyber',
    essenceLoss: truncate2(essenceLoss).toFixed(2),
    currentEssence: truncate2(
      (sys.sheetStats?.ESSENCE ?? 6) - essenceLoss
    ).toFixed(2),
  };
}
