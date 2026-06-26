/**
 * @fileoverview Pure orchestration that assembles `Actor.create` data from a
 * parsed Chummer character. The canonical active-skill list is read from the
 * compendium by the caller and passed in, keeping this module Foundry-free and
 * unit-testable.
 */

import {
  isAmmunition,
  mapBioware,
  mapCharacterMetatype,
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
  mapWeaponMod,
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
  cyberware: (record) =>
    String(record.improvementsource ?? '').toLowerCase() === 'bioware'
      ? mapBioware(record)
      : mapCyberware(record),
  bioware: mapBioware,
  program: mapProgram,
};

/**
 * @param {string} name
 * @returns {string}
 */
function normalizeSkillName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, ' ');
}

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
    const name = normalizeSkillName(skill.name);
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
    const override = ratings.get(normalizeSkillName(skill.name));
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
 * @typedef {object} AmmoLink
 * @property {string} weaponName
 * @property {string} ammoName
 * @property {number} currentAmmo
 */

/**
 * @param {Record<string, Array<Record<string, unknown>>>} [parsedItems]
 * @returns {Map<string, string>}
 */
function buildGearGuidToName(parsedItems) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const record of parsedItems?.gear ?? []) {
    const guid = String(record.guid ?? '');
    const name = String(record.name ?? '');
    if (guid && name && isAmmunition(record)) map.set(guid, name);
  }
  return map;
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} [parsedItems]
 * @param {Map<string, string>} gearGuidToName
 * @returns {AmmoLink[]}
 */
function buildAmmoLinks(parsedItems, gearGuidToName) {
  /** @type {AmmoLink[]} */
  const links = [];
  for (const record of parsedItems?.weapon ?? []) {
    const clips =
      /** @type {Array<{gearGuid: string, count: number}>|undefined} */ (
        record._clips
      );
    if (!clips?.length) continue;
    for (const clip of clips) {
      const ammoName = gearGuidToName.get(clip.gearGuid);
      if (ammoName) {
        links.push({
          weaponName: String(record.name ?? ''),
          ammoName,
          currentAmmo: clip.count,
        });
        break;
      }
    }
  }
  return links;
}

/**
 * @typedef {object} WeaponModLink
 * @property {string} weaponName
 * @property {string} modName
 */

/**
 * @param {Record<string, Array<Record<string, unknown>>>} [parsedItems]
 * @returns {{ modItems: Array<object>, modLinks: WeaponModLink[] }}
 */
function buildWeaponModItems(parsedItems) {
  /** @type {Array<object>} */
  const modItems = [];
  /** @type {WeaponModLink[]} */
  const modLinks = [];

  for (const record of parsedItems?.weapon ?? []) {
    const mods = /** @type {Array<Record<string, unknown>>|undefined} */ (
      record._weaponMods
    );
    if (!mods?.length) continue;
    const weaponName = String(record.name ?? '');
    for (const mod of mods) {
      const normalized = { ...mod };
      if (normalized.slots === undefined) normalized.slots = '0';
      const modItem = mapWeaponMod(normalized);
      modItems.push(modItem);
      modLinks.push({ weaponName, modName: modItem.name });
    }
  }
  return { modItems, modLinks };
}

/**
 * @param {import('./parse-character.js').ParsedCharacter} parsed
 * @param {Array<{ name: string, type: string, system: object }>} canonicalSkills
 * @returns {{ name: string, type: 'character', img: string|null, system: object, items: Array<object>, ammoLinks: AmmoLink[], weaponModLinks: WeaponModLink[] }}
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

  const metatypeItem = mapCharacterMetatype(parsed.character);

  const gearGuidToName = buildGearGuidToName(parsed.items);
  const ammoLinks = buildAmmoLinks(parsed.items, gearGuidToName);
  const { modItems, modLinks: weaponModLinks } = buildWeaponModItems(
    parsed.items
  );

  return {
    name,
    type: 'character',
    img,
    system,
    items: [
      ...(metatypeItem ? [metatypeItem] : []),
      ...items,
      ...modItems,
      ...activeSkills,
      ...knowledgeSkills,
    ],
    ammoLinks,
    weaponModLinks,
  };
}
