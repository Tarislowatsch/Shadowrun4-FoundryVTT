import { resolveAttribute } from '@utils/force-formula.js';
import { ATTRIBUTE_MAP } from '@importer/mappers/constants.js';

/**
 * @param {Record<string, { value: number, formula: string }>} attributes
 * @param {number} force
 * @param {number} [fallback=0] value used for attributes missing from `attributes`
 * @returns {Record<string, number>}
 */
function resolveSheetStats(attributes, force, fallback = 0) {
  /** @type {Record<string, number>} */
  const stats = {};
  for (const [, attrKey] of ATTRIBUTE_MAP) {
    if (attrKey === 'initiative' || attrKey === 'essence') continue;
    const statKey = attrKey.toUpperCase();
    const attr = attributes[attrKey];
    stats[statKey] = attr ? resolveAttribute(attr, force) : fallback;
  }
  const ini = attributes.initiative;
  stats.INITIATIVE = ini
    ? resolveAttribute(ini, force)
    : stats.INTUITION + stats.REACTION;
  const ess = attributes.essence;
  stats.ESSENCE = ess ? resolveAttribute(ess, force) : 6;
  stats.CURRENTEDGE = stats.EDGE;
  stats.ASTRALINITIATIVE = stats.INTUITION * 2;
  stats.MATRIXINITIATIVE = stats.INTUITION + stats.REACTION;
  return stats;
}

/**
 * Flat force-scaled sheetStats for a summoned spirit/sprite with no matching
 * CritterTemplate to derive attributes from.
 * @param {number} force
 * @returns {Record<string, number>}
 */
export function buildDefaultSheetStats(force) {
  return resolveSheetStats({}, force, force);
}

/**
 * @param {string[]} powerNames
 * @returns {Array<{ name: string, type: string, system: object }>}
 */
function buildCritterPowerItems(powerNames) {
  return powerNames.map((name) => ({
    name,
    type: 'CritterPower',
    system: { description: '' },
  }));
}

/**
 * @param {string[]} names
 * @returns {Array<{ name: string, type: string, system: object }>}
 */
function buildComplexFormItems(names) {
  return names.map((name) => ({
    name,
    type: 'Program',
    system: { complexform: true, description: '' },
  }));
}

/**
 * @param {object} templateSystem
 * @param {string} templateName
 * @param {number|null} force
 * @returns {{ name: string, type: string, system: object, items: Array<object> }}
 */
export function buildCritterActorData(templateSystem, templateName, force) {
  const f = force ?? 0;
  const stats = resolveSheetStats(templateSystem.attributes, f);
  const powers = buildCritterPowerItems(templateSystem.powers ?? []);

  if (templateSystem.actorType === 'spirit') {
    return {
      name: templateName,
      type: 'spirit',
      system: {
        force: f,
        spiritType: templateSystem.category,
        services: 0,
        sheetStats: stats,
        notes: '',
      },
      items: powers,
    };
  }

  if (templateSystem.actorType === 'sprite') {
    const complexForms = buildComplexFormItems([
      ...(templateSystem.complexForms ?? []),
      ...(templateSystem.optionalComplexForms ?? []),
    ]);
    return {
      name: templateName,
      type: 'sprite',
      system: {
        rating: f,
        spriteType: templateSystem.category,
        tasks: 0,
        sheetStats: stats,
        notes: '',
      },
      items: [...powers, ...complexForms],
    };
  }

  return {
    name: templateName,
    type: 'npc',
    system: {
      sheetStats: stats,
      notes: '',
    },
    items: powers,
  };
}
