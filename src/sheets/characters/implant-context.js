import { ImplantGrades, ImplantTypes } from '@models/index';
import { computeEssenceLoss } from './actor-context.js';

/**
 * @param {object[]} implants
 * @param {object} sys
 */
export function buildImplantContext(implants, sys) {
  for (const item of implants) {
    item.displayType = ImplantTypes[item.system.type] ?? item.system.type ?? '';
    item.displayGrade =
      ImplantGrades[item.system.grade] ?? item.system.grade ?? '';
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
    essenceCyber: cyberEss.toFixed(2),
    essenceBio: bioEss.toFixed(2),
    essenceHalved: (cyberEss >= bioEss ? bioEss / 2 : cyberEss / 2).toFixed(2),
    essenceHalvedLabel: cyberEss >= bioEss ? 'bio' : 'cyber',
    essenceLoss: essenceLoss.toFixed(2),
    currentEssence: ((sys.sheetStats?.ESSENCE ?? 6) - essenceLoss).toFixed(2),
  };
}
