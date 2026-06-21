/**
 * @fileoverview Pure orchestration that assembles `Actor.create` data from a
 * parsed Chummer character. The canonical active-skill list is read from the
 * compendium by the caller and passed in, keeping this module Foundry-free and
 * unit-testable.
 */

import {
  mapBioware,
  mapCharacterSkill,
  mapCharacterSystem,
  mapCyberware,
  mapGear,
  mapArmor,
  mapPower,
  mapProgram,
  mapQuality,
  mapSpell,
  mapWeapon,
} from './mappers/index.js';

/**
 * @type {Record<string, (record: Record<string, unknown>) => { name: string, type: string, system: object }>}
 */
const COLLECTION_MAPPERS = {
  weapon: mapWeapon,
  armor: mapArmor,
  gear: mapGear,
  spell: mapSpell,
  quality: mapQuality,
  power: mapPower,
  cyberware: mapCyberware,
  bioware: mapBioware,
  program: mapProgram,
};

/**
 * @param {Array<Record<string, any>>} skills
 * @returns {Map<string, { rating: number, specialization: string }>}
 */
function buildSkillRatingMap(skills) {
  /** @type {Map<string, { rating: number, specialization: string }>} */
  const map = new Map();
  for (const skill of skills) {
    if (String(skill.knowledge ?? '').toUpperCase() === 'TRUE') continue;
    const rating = parseInt(String(skill.rating ?? '0'), 10) || 0;
    const specialization = String(skill.spec ?? '').trim();
    if (rating <= 0 && !specialization) continue;
    const name = String(skill.name ?? '')
      .trim()
      .toLowerCase();
    if (name) map.set(name, { rating, specialization });
  }
  return map;
}

/**
 * Merges by name so canonical items keep their `label`/attack-skill data, which
 * the combat system relies on.
 *
 * @param {Array<{ name: string, type: string, system: object }>} canonicalSkills
 * @param {Map<string, { rating: number, specialization: string }>} ratings
 * @returns {Array<object>}
 */
function mergeSkillRatings(canonicalSkills, ratings) {
  return canonicalSkills.map((skill) => {
    const override = ratings.get(String(skill.name ?? '').toLowerCase());
    if (!override) return skill;
    return {
      ...skill,
      system: {
        ...skill.system,
        rating: override.rating,
        ...(override.specialization
          ? { specialization: override.specialization }
          : {}),
      },
    };
  });
}

/**
 * @param {import('./parse-character.js').ParsedCharacter} parsed
 * @param {Array<{ name: string, type: string, system: object }>} canonicalSkills
 * @returns {{ name: string, type: 'character', img: string|null, system: object, items: Array<object> }}
 */
export function buildActorData(parsed, canonicalSkills) {
  const { name, img, system } = mapCharacterSystem(parsed.character);

  /** @type {Array<object>} */
  const items = [];
  for (const [tag, mapper] of Object.entries(COLLECTION_MAPPERS)) {
    for (const record of parsed.items?.[tag] ?? []) {
      items.push(mapper(record));
    }
  }

  const ratings = buildSkillRatingMap(parsed.skills ?? []);
  const activeSkills = mergeSkillRatings(canonicalSkills ?? [], ratings);
  const knowledgeSkills = (parsed.skills ?? [])
    .filter((s) => String(s.knowledge ?? '').toUpperCase() === 'TRUE')
    .map(mapCharacterSkill);

  return {
    name,
    type: 'character',
    img,
    system,
    items: [...items, ...activeSkills, ...knowledgeSkills],
  };
}
