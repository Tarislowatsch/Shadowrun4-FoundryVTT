export const ASTRAL_PERCEPTION_TEMPLATE = 'astralPerception';
export const ASTRAL_PERCEPTION_STATUS = 'sr4-astral-perception';

/** @enum {string} */
export const LightConditions = Object.freeze({
  NORMAL: 'normal',
  PARTIAL_LIGHT: 'partialLight',
  FULL_DARKNESS: 'fullDarkness',
  GLARE: 'glare',
});

/** @enum {string} */
export const ObscurantConditions = Object.freeze({
  NONE: 'none',
  LIGHT_FOG: 'lightFog',
  HEAVY_FOG: 'heavyFog',
  THERMAL_SMOKE: 'thermalSmoke',
});

/** @enum {string} */
export const VisionModes = Object.freeze({
  NORMAL: 'normal',
  LOW_LIGHT: 'lowLight',
  THERMOGRAPHIC: 'thermographic',
  ULTRASOUND: 'ultrasound',
});

/** @enum {string} */
export const Senses = Object.freeze({
  SIGHT: 'sight',
  HEARING: 'hearing',
  SMELL: 'smell',
  TOUCH: 'touch',
});

export const VISION_FLAGS = Object.freeze([
  VisionModes.LOW_LIGHT,
  VisionModes.THERMOGRAPHIC,
  VisionModes.ULTRASOUND,
  'flareCompensation',
]);

/** @type {Readonly<Record<string, Readonly<Record<string, number>>>>} */
export const VISIBILITY_TABLE = Object.freeze({
  [LightConditions.FULL_DARKNESS]: Object.freeze({
    normal: -6,
    lowLight: -6,
    thermographic: -3,
    ultrasound: -3,
  }),
  [LightConditions.PARTIAL_LIGHT]: Object.freeze({
    normal: -2,
    lowLight: 0,
    thermographic: -2,
    ultrasound: -1,
  }),
  [LightConditions.GLARE]: Object.freeze({
    normal: -1,
    lowLight: -1,
    thermographic: -1,
    ultrasound: 0,
  }),
  [ObscurantConditions.LIGHT_FOG]: Object.freeze({
    normal: -2,
    lowLight: -1,
    thermographic: 0,
    ultrasound: -1,
  }),
  [ObscurantConditions.HEAVY_FOG]: Object.freeze({
    normal: -4,
    lowLight: -2,
    thermographic: -2,
    ultrasound: -2,
  }),
  [ObscurantConditions.THERMAL_SMOKE]: Object.freeze({
    normal: -4,
    lowLight: -2,
    thermographic: -6,
    ultrasound: -2,
  }),
});

const NAME_VISION_PATTERNS = Object.freeze([
  [
    VisionModes.LOW_LIGHT,
    /low[\s-]?light|restlicht|cat'?s\s+eyes|katzenaugen/i,
  ],
  [VisionModes.THERMOGRAPHIC, /thermogra(?:ph|f)|infrared|infrarot/i],
  [VisionModes.ULTRASOUND, /ultrasound|ultraschall|sonar/i],
  ['flareCompensation', /flare\s+compensation|blitzkompensation|blendschutz/i],
]);

export const VISIBILITY_LABEL_PREFIXES = Object.freeze({
  light: 'sr4.visibility.light.',
  obscurant: 'sr4.visibility.obscurant.',
  vision: 'sr4.visibility.vision.',
  sense: 'sr4.visibility.sense.',
});

/**
 * @param {Readonly<Record<string, string>> | readonly string[]} values
 * @param {string} prefix
 * @returns {{ value: string, label: string }[]}
 */
export function labelledValues(values, prefix) {
  return Object.values(values).map((value) => ({
    value,
    label: `${prefix}${value}`,
  }));
}

/**
 * @typedef {object} VisibilityConditions
 * @property {string} light
 * @property {string} obscurant
 */

/**
 * @param {Partial<VisibilityConditions>} [conditions]
 * @returns {boolean}
 */
export function hasActiveVisibility(conditions) {
  const light = conditions?.light ?? LightConditions.NORMAL;
  const obscurant = conditions?.obscurant ?? ObscurantConditions.NONE;
  return (
    light !== LightConditions.NORMAL || obscurant !== ObscurantConditions.NONE
  );
}

/**
 * @param {Record<string, boolean> | undefined} vision
 * @param {{ visualOnly?: boolean }} [options]
 * @returns {string[]}
 */
export function availableVisionModes(vision, { visualOnly = false } = {}) {
  return Object.values(VisionModes).filter((mode) => {
    if (mode === VisionModes.NORMAL) return true;
    if (visualOnly && mode === VisionModes.ULTRASOUND) return false;
    return vision?.[mode] === true;
  });
}

/**
 * @param {Partial<VisibilityConditions>} conditions
 * @param {string} mode
 * @param {{ flareCompensation?: boolean }} [options]
 * @returns {number}
 */
export function computeVisibilityModifier(
  conditions,
  mode,
  { flareCompensation = false } = {}
) {
  const lookup = (condition) => VISIBILITY_TABLE[condition]?.[mode] ?? 0;
  const light =
    flareCompensation && conditions?.light === LightConditions.GLARE
      ? 0
      : lookup(conditions?.light);
  return light + lookup(conditions?.obscurant);
}

/**
 * @param {Partial<VisibilityConditions>} conditions
 * @param {string[]} modes
 * @param {{ flareCompensation?: boolean }} [options]
 * @returns {string}
 */
export function bestVisionMode(conditions, modes, options = {}) {
  let best = VisionModes.NORMAL;
  let bestValue = computeVisibilityModifier(conditions, best, options);
  for (const mode of modes) {
    const value = computeVisibilityModifier(conditions, mode, options);
    if (value > bestValue) {
      best = mode;
      bestValue = value;
    }
  }
  return best;
}

/**
 * @param {Iterable<string> | undefined} names
 * @returns {Record<string, boolean>}
 */
export function visionFromNames(names) {
  /** @type {Record<string, boolean>} */
  const vision = {};
  for (const name of names ?? []) {
    for (const [mode, pattern] of NAME_VISION_PATTERNS) {
      if (pattern.test(String(name))) vision[mode] = true;
    }
  }
  return vision;
}

/**
 * @param {Iterable<{ type?: string, system?: { powers?: string[], qualities?: { positive?: string[] } } }> | undefined} items
 * @returns {Record<string, boolean>}
 */
export function visionFromMetatype(items) {
  for (const item of items ?? []) {
    if (item.type !== 'Metatype') continue;
    const names = [
      ...(item.system?.powers ?? []),
      ...(item.system?.qualities?.positive ?? []),
    ];
    const key = names.join('\u0000');
    let vision = metatypeVisionCache.get(key);
    if (!vision) {
      vision = Object.freeze(visionFromNames(names));
      metatypeVisionCache.set(key, vision);
    }
    return vision;
  }
  return {};
}

/** @type {Map<string, Readonly<Record<string, boolean>>>} */
const metatypeVisionCache = new Map();

/**
 * @param {Record<string, boolean> | undefined} manual
 * @param {Record<string, boolean> | undefined} metatype
 * @param {Record<string, boolean> | undefined} disabled
 * @returns {Record<string, boolean>}
 */
export function resolveVision(manual, metatype, disabled) {
  return Object.fromEntries(
    VISION_FLAGS.map((mode) => [
      mode,
      (manual?.[mode] === true || metatype?.[mode] === true) &&
        disabled?.[mode] !== true,
    ])
  );
}

/**
 * @param {{ system?: { realm?: string }, statuses?: Set<string> } | undefined} actor
 * @returns {boolean}
 */
export function isVisibilityApplicable(actor) {
  if (actor?.system?.realm === 'astral') return false;
  return !actor?.statuses?.has?.(ASTRAL_PERCEPTION_STATUS);
}
