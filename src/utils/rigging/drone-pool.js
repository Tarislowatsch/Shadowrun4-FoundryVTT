import { MELEE_DEFENSE_KEYS } from '../dialog/actions/defense';
import { ControlModes } from './control-modes.js';
import { effectiveSimMode } from '@documents/derivedStats.mapper.js';
import { SimMode } from '@models/shared';

export { ControlModes };

/** @type {Record<string, string>} */
export const DEFAULT_RIGGER_LOOKUP = {
  attackSkill: 'sr4.skills.gunnery',
  fullDefenseSkill: 'sr4.skills.dodge',
  perceptionSkill: 'sr4.skills.perception',
  infiltrationSkill: 'sr4.skills.infiltration',
  commandProgram: 'Command',
};

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
const STAT_LABELS = {
  pilot: 'sr4.vehicle.pilot',
  response: 'sr4.vehicle.response',
  sensor: 'sr4.vehicle.sensor',
  body: 'sr4.vehicle.body',
  armor: 'sr4.vehicle.armor',
};

/** @type {Record<string, string>} */
const AUTOSOFT_LABELS = {
  maneuvering: 'sr4.autosoft.maneuvering',
  targeting: 'sr4.autosoft.targeting',
  clearsight: 'sr4.autosoft.clearsight',
  'electronic-warfare': 'sr4.autosoft.electronicWarfare',
  clearsoft: 'sr4.autosoft.clearsoft',
  defense: 'sr4.autosoft.defense',
  'covert-ops': 'sr4.autosoft.covertOps',
};

const stat = (key) => ({ kind: 'stat', key });
const soft = (type) => ({ kind: 'autosoft', type });
const roleSkill = (role) => ({ kind: 'riggerRoleSkill', role });
const overrideSkill = () => ({ kind: 'riggerSkillOverride' });
const command = () => ({ kind: 'command' });
const riggerInit = () => ({ kind: 'riggerInitiative' });

/** @type {Record<string, Record<string, object[]>>} */
const POOL_TABLE = {
  attack: {
    jumped: [stat('sensor'), roleSkill('attackSkill')],
    autonomous: [stat('pilot'), soft('targeting')],
    remote: [command(), roleSkill('attackSkill')],
  },
  meleeDefense: {
    jumped: [stat('response'), overrideSkill()],
    autonomous: [stat('pilot'), soft('defense')],
    remote: [command(), overrideSkill()],
  },
  rangedDefense: {
    jumped: [stat('response')],
    autonomous: [stat('response')],
    remote: [command()],
  },
  damageResistance: {
    jumped: [stat('body'), stat('armor')],
    autonomous: [stat('body'), stat('armor')],
    remote: [stat('body'), stat('armor')],
  },
  infiltration: {
    jumped: [stat('response'), roleSkill('infiltrationSkill')],
    autonomous: [stat('pilot'), soft('covert-ops')],
    remote: [command(), roleSkill('infiltrationSkill')],
  },
  maneuvering: {
    jumped: [stat('response'), overrideSkill()],
    autonomous: [stat('pilot'), soft('maneuvering')],
    remote: [command(), overrideSkill()],
  },
  perception: {
    jumped: [stat('sensor'), roleSkill('perceptionSkill')],
    autonomous: [stat('sensor'), soft('clearsight')],
    remote: [stat('sensor'), roleSkill('perceptionSkill')],
  },
  initiative: {
    jumped: [riggerInit()],
    autonomous: [stat('pilot'), stat('response')],
    remote: [riggerInit()],
  },
};

/** @type {Record<string, object>} */
const FULL_DEFENSE_EXTRA = {
  jumped: roleSkill('fullDefenseSkill'),
  autonomous: soft('defense'),
  remote: roleSkill('fullDefenseSkill'),
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
 * @returns {import('@models/index').SR4Skill | null}
 */
export function findRiggerSkill(rigger, ref) {
  let nameMatch = null;
  const lowerRef = ref.toLowerCase();
  for (const item of rigger.items) {
    if (item.type !== 'Skill') continue;
    if (item.system.label === ref) return item;
    if (!nameMatch && item.name.toLowerCase() === lowerRef) nameMatch = item;
  }
  return nameMatch;
}

/**
 * @param {import('@documents/index').SR4Actor} rigger
 * @param {string} ref
 * @returns {{ rating: number, label: string }}
 */
export function getRiggerSkill(rigger, ref) {
  const skillItem = findRiggerSkill(rigger, ref);
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
          label: item.system.label || item.name,
          rating: item.system.rating,
        });
      }
    }
    return options;
  }
  if (action === DroneActions.MELEE_DEFENSE) {
    return MELEE_DEFENSE_KEYS.map((key) => {
      const skillItem =
        findRiggerSkill(rigger, `sr4.skills.${key}`) ??
        findRiggerSkill(rigger, key);
      if (!skillItem || (skillItem.system.rating ?? 0) <= 0) return null;
      return {
        value: key,
        label: skillItem.system.label || skillItem.name,
        rating: skillItem.system.rating,
      };
    }).filter(Boolean);
  }
  return [];
}

/**
 * @param {object} part
 * @param {import('@documents/index').SR4Actor} vehicle
 * @param {import('@documents/index').SR4Actor | null} rigger
 * @param {string} action
 * @param {{ skillOverride?: string }} options
 * @param {string[]} warnings
 * @param {Record<string, string>} lookup
 * @returns {{ label: string, value: number }}
 */
function resolvePart(part, vehicle, rigger, action, options, warnings, lookup) {
  switch (part.kind) {
    case 'stat':
      return {
        label: STAT_LABELS[part.key],
        value: getVehicleStat(vehicle, part.key),
      };
    case 'autosoft': {
      const autosoft = getAutosoft(vehicle, part.type);
      if (!autosoft) {
        warnings.push('sr4.vehicle.missingAutosoft');
        return { label: AUTOSOFT_LABELS[part.type], value: 0 };
      }
      return { label: autosoft.label, value: autosoft.rating };
    }
    case 'riggerRoleSkill': {
      const ref = lookup[part.role];
      if (!rigger) return { label: ref, value: 0 };
      const riggerSkill = getRiggerSkill(rigger, ref);
      return { label: riggerSkill.label, value: riggerSkill.rating };
    }
    case 'riggerSkillOverride': {
      if (!rigger) return { label: `sr4.vehicle.actions.${action}`, value: 0 };
      const skillOptions = buildRiggerSkillOptions(rigger, action);
      const chosen = options.skillOverride
        ? skillOptions.find((o) => o.value === options.skillOverride)
        : skillOptions.reduce(
            (a, b) => (b.rating > (a?.rating ?? -Infinity) ? b : a),
            null
          );
      if (options.skillOverride && !chosen)
        return getRiggerSkillPart(rigger, options.skillOverride);
      if (!chosen) return { label: `sr4.vehicle.actions.${action}`, value: -1 };
      return { label: chosen.label, value: chosen.rating };
    }
    case 'command': {
      const programName = lookup.commandProgram;
      if (!rigger) return { label: programName, value: 0 };
      const rating = getCommandRating(rigger, programName);
      if (rating === null) {
        warnings.push('sr4.vehicle.noCommandProgram');
        return { label: programName, value: 0 };
      }
      return { label: programName, value: rating };
    }
    case 'riggerInitiative': {
      if (!rigger) return { label: 'sr4.vehicle.rigger', value: 0 };
      const value =
        typeof rigger.getInitiativeBase === 'function'
          ? rigger.getInitiativeBase()
          : /** @type {any} */ (
              rigger.system?.derivedStats?.initiative?.physical ?? 0
            );
      return { label: 'sr4.vehicle.rigger', value };
    }
    default:
      return { label: '', value: 0 };
  }
}

/**
 * @param {import('@documents/index').SR4Actor} rigger
 * @param {string} ref
 * @returns {{ label: string, value: number }}
 */
function getRiggerSkillPart(rigger, ref) {
  const riggerSkill = getRiggerSkill(rigger, ref);
  return { label: riggerSkill.label, value: riggerSkill.rating };
}

/**
 * @param {import('@documents/index').SR4Actor} vehicle
 * @param {import('@documents/index').SR4Actor | null} rigger
 * @param {string} mode
 * @param {string} action
 * @param {{ skillOverride?: string, melee?: boolean, lookup?: Record<string, string> }} [options]
 * @returns {{ pool: number, parts: { label: string, value: number }[], warnings: string[] }}
 */
export function resolveDronePool(vehicle, rigger, mode, action, options = {}) {
  const lookup = options.lookup ?? getRiggerLookup(vehicle);
  /** @type {string[]} */
  const warnings = [];
  const riggerRequired = mode !== ControlModes.AUTONOMOUS;
  if (riggerRequired && !rigger) warnings.push('sr4.vehicle.noRigger');

  let specs;
  let baseAction = action;
  if (action === DroneActions.FULL_DEFENSE) {
    baseAction = options.melee
      ? DroneActions.MELEE_DEFENSE
      : DroneActions.RANGED_DEFENSE;
    specs = [...POOL_TABLE[baseAction][mode], FULL_DEFENSE_EXTRA[mode]];
  } else {
    specs = POOL_TABLE[action]?.[mode];
  }
  if (!specs) return { pool: 0, parts: [], warnings };

  const parts = specs.map((part) =>
    resolvePart(part, vehicle, rigger, baseAction, options, warnings, lookup)
  );
  if (mode === ControlModes.JUMPED && rigger) {
    parts.push({ label: 'sr4.matrix.controlRigBonus', value: 2 });
    if (effectiveSimMode(rigger.system) === SimMode.HOT) {
      parts.push({ label: 'sr4.matrix.hotSimBonus', value: 2 });
    }
  }
  const pool = Math.max(
    0,
    parts.reduce((sum, part) => sum + part.value, 0)
  );
  return { pool, parts, warnings };
}

/**
 * @param {import('@documents/index').SR4Actor} vehicle
 * @param {import('@documents/index').SR4Actor | null} rigger
 * @param {string} mode
 * @returns {import('@documents/index').SR4Actor}
 */
export function controllingActor(vehicle, rigger, mode) {
  return mode !== ControlModes.AUTONOMOUS && rigger ? rigger : vehicle;
}

/**
 * @param {import('@documents/index').SR4Actor} vehicle
 * @returns {Promise<import('@documents/index').SR4Actor | null>}
 */
export async function resolveRigger(vehicle) {
  const uuid = /** @type {any} */ (vehicle.system)?.riggerUuid;
  if (!uuid) return null;
  try {
    return /** @type {any} */ (await fromUuid(uuid));
  } catch {
    return null;
  }
}

/**
 * @param {import('@documents/index').SR4Actor} vehicle
 * @returns {import('@documents/index').SR4Actor | null}
 */
export function resolveRiggerSync(vehicle) {
  const uuid = /** @type {any} */ (vehicle.system)?.riggerUuid;
  if (!uuid) return null;
  try {
    return /** @type {any} */ (fromUuidSync(uuid));
  } catch {
    return null;
  }
}
