import { MELEE_DEFENSE_KEYS } from '@domains/combat/dialogs/defense.js';
import { findSkillIn } from '@models/index';
import { buildSkillOptions, skillDisplayLabel } from '@utils/dialog';

/** @enum {string} */
export const DroneActions = {
  ATTACK: 'attack',
  MELEE_DEFENSE: 'meleeDefense',
  RANGED_DEFENSE: 'rangedDefense',
  FULL_DEFENSE: 'fullDefense',
  DAMAGE_RESISTANCE: 'damageResistance',
  INFILTRATION: 'infiltration',
  MANEUVERING: 'maneuvering',
  PERCEPTION: 'perception',
  INITIATIVE: 'initiative',
};

/** @type {Record<string, string>} */
export const DEFAULT_RIGGER_LOOKUP = {
  attackSkill: 'sr4.skills.gunnery',
  fullDefenseSkill: 'sr4.skills.dodge',
  perceptionSkill: 'sr4.skills.perception',
  infiltrationSkill: 'sr4.skills.infiltration',
  commandProgram: 'Command',
};

/**
 * @param {Record<string, string>} defaults
 * @param {string} settingJson
 * @param {Record<string, string>} [overrides]
 * @returns {Record<string, string>}
 */
export function mergeRiggerLookup(defaults, settingJson, overrides = {}) {
  let parsed = {};
  try {
    parsed = JSON.parse(settingJson || '{}') ?? {};
  } catch {
    parsed = {};
  }
  /** @type {Record<string, string>} */
  const result = {};
  for (const key of Object.keys(defaults)) {
    result[key] = overrides[key] || parsed[key] || defaults[key];
  }
  return result;
}

/**
 * @param {import('@documents/index').SR4Actor | null} vehicle
 * @returns {Record<string, string>}
 */
export function getRiggerLookup(vehicle) {
  const settingJson =
    typeof game !== 'undefined' && game?.settings
      ? /** @type {string} */ (game.settings.get('shadowrun4e', 'riggerLookup'))
      : '{}';
  const overrides = /** @type {any} */ (vehicle?.system)?.riggerOverrides ?? {};
  return mergeRiggerLookup(DEFAULT_RIGGER_LOOKUP, settingJson, overrides);
}

/**
 * @param {import('@documents/index').SR4Actor} vehicle
 * @param {string} key
 * @returns {number}
 */
export function getVehicleStat(vehicle, key) {
  const sys = /** @type {any} */ (vehicle.system);
  const effective = {
    pilot: sys.effectivePilot,
    sensor: sys.effectiveSensor,
    body: sys.effectiveBody,
    armor: sys.effectiveArmor,
  }[key];
  return effective ?? sys[key] ?? 0;
}

/**
 * @param {import('@documents/index').SR4Actor} vehicle
 * @param {string} autosoftType
 * @returns {{ rating: number, label: string } | null}
 */
export function getAutosoft(vehicle, autosoftType) {
  /** @type {any[]} */
  const matches = [];
  for (const item of vehicle.items) {
    if (item.type === 'Autosoft' && item.system.autosoftType === autosoftType)
      matches.push(item);
  }
  if (matches.length === 0) return null;
  const best = matches.reduce((a, b) =>
    (b.system.rating ?? 0) > (a.system.rating ?? 0) ? b : a
  );
  return { rating: best.system.rating ?? 0, label: best.name };
}

/**
 * @param {import('@documents/index').SR4Actor} rigger
 * @param {string} ref
 * @returns {{ rating: number, label: string }}
 */
export function getRiggerSkill(rigger, ref) {
  const skillItem = findSkillIn(rigger.items, ref);
  const rating = skillItem?.system.rating ?? 0;
  return {
    rating: rating > 0 ? rating : -1,
    label: skillItem?.system.label || skillItem?.name || ref,
  };
}

/**
 * @param {import('@documents/index').SR4Actor} rigger
 * @param {string} [programName]
 * @returns {number|null}
 */
export function getCommandRating(
  rigger,
  programName = DEFAULT_RIGGER_LOOKUP.commandProgram
) {
  const lowerName = programName.toLowerCase();
  let found = null;
  for (const item of rigger.items) {
    if (item.type === 'Program' && item.name.toLowerCase() === lowerName)
      found = item;
  }
  return found ? (found.system.rating ?? 0) : null;
}

/**
 * @param {import('@documents/index').SR4Actor | null} rigger
 * @param {string} action
 * @returns {{ value: string, label: string, rating: number }[]}
 */
export function buildRiggerSkillOptions(rigger, action) {
  if (!rigger) return [];
  if (action === DroneActions.MANEUVERING) {
    const options = [];
    for (const item of rigger.items) {
      if (
        item.type === 'Skill' &&
        (item.system.category === 'vehicle' ||
          item.name.toLowerCase().startsWith('pilot')) &&
        (item.system.rating ?? 0) > 0
      ) {
        options.push({
          value: item.name.toLowerCase(),
          label: skillDisplayLabel(item),
          rating: item.system.rating,
        });
      }
    }
    return options;
  }
  if (action === DroneActions.MELEE_DEFENSE) {
    return buildSkillOptions(rigger, MELEE_DEFENSE_KEYS);
  }
  return [];
}
