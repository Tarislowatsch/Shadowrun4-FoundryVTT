import {
  evaluateForceFormula,
  resolveAttribute,
} from '@utils/force-formula.js';
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
 * @returns {Promise<Array<{ name: string, type: string, img: string|null, system: object }>>}
 */
async function loadCompendiumSkills() {
  try {
    const compendium = game?.packs?.get('shadowrun4e.skills');
    if (!compendium) return [];
    const docs = await compendium.getDocuments({ type: 'Skill' });
    return docs.map((doc) => {
      const obj = doc.toObject();
      return {
        name: obj.name ?? doc.name,
        type: 'Skill',
        img: obj.img ?? null,
        system: obj.system ?? {},
      };
    });
  } catch {
    return [];
  }
}

/**
 * @param {{ name: string, rating: number, ratingFormula: string, spec: string }} entry
 * @param {number} force
 * @param {{ name?: string, img?: string|null, system?: object }} [compendiumSkill]
 * @returns {{ name: string, type: string, img?: string|null, system: object }}
 */
function buildSkillItem(entry, force, compendiumSkill) {
  const rating = entry.ratingFormula
    ? evaluateForceFormula(entry.ratingFormula, force)
    : entry.rating;
  return {
    name: compendiumSkill?.name ?? entry.name,
    type: 'Skill',
    ...(compendiumSkill?.img ? { img: compendiumSkill.img } : {}),
    system: {
      ...(compendiumSkill?.system ?? {}),
      rating,
      ratingFormula: entry.ratingFormula ?? '',
      specialization: entry.spec ?? '',
    },
  };
}

/**
 * @param {Array<{ name: string, rating: number, ratingFormula: string, spec: string }>} skillEntries
 * @param {number} force
 * @returns {Promise<Array<{ name: string, type: string, system: object }>>}
 */
async function buildCritterSkillItems(skillEntries, force) {
  if (!skillEntries?.length) return [];

  const compendiumSkills = await loadCompendiumSkills();
  const byName = new Map(
    compendiumSkills.map((s) => [s.name.toLowerCase(), s])
  );
  /** @type {Map<string, Array<object>>} */
  const byGroup = new Map();
  for (const s of compendiumSkills) {
    const group = String(s.system.group ?? '')
      .trim()
      .toLowerCase();
    if (!group) continue;
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(s);
  }

  const items = [];
  const seen = new Set();
  const add = (item) => {
    const key = item.name.trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const entry of skillEntries) {
    const key = entry.name.trim().toLowerCase();
    const match = byName.get(key);
    if (match) {
      add(buildSkillItem(entry, force, match));
      continue;
    }
    const groupSkills = byGroup.get(key);
    if (groupSkills?.length) {
      for (const skill of groupSkills) {
        add(buildSkillItem({ ...entry, name: skill.name }, force, skill));
      }
      continue;
    }
    add(buildSkillItem(entry, force));
  }
  return items;
}

/**
 * @param {object} templateSystem
 * @param {string} templateName
 * @param {number|null} force
 * @returns {Promise<{ name: string, type: string, system: object, items: Array<object> }>}
 */
export async function buildCritterActorData(
  templateSystem,
  templateName,
  force
) {
  const f = force ?? 0;
  const stats = resolveSheetStats(templateSystem.attributes, f);
  const powers = buildCritterPowerItems(templateSystem.powers ?? []);
  const skills = await buildCritterSkillItems(templateSystem.skills ?? [], f);

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
      items: [...powers, ...skills],
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
      items: [...powers, ...complexForms, ...skills],
    };
  }

  return {
    name: templateName,
    type: 'npc',
    system: {
      sheetStats: stats,
      notes: '',
    },
    items: [...powers, ...skills],
  };
}
