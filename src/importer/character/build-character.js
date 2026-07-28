import {
  isAmmunition,
  mapBioware,
  mapCharacterMetatype,
  mapCharacterSkill,
  mapCharacterSystem,
  mapCyberware,
  mapGear,
  mapArmor,
  mapMentor,
  mapPower,
  mapProgram,
  mapQuality,
  mapSpell,
  mapWeapon,
  mapWeaponMod,
  isTrue,
  normalizeSkillName,
  resolveEssenceModifiers,
  translateSkillNameToEnglish,
} from '../mappers/index.js';

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
  cyberware: (record, _translations, essenceModifiers) =>
    String(record.improvementsource ?? '').toLowerCase() === 'bioware'
      ? mapBioware(record, _translations, essenceModifiers)
      : mapCyberware(record, _translations, essenceModifiers),
  bioware: mapBioware,
  program: mapProgram,
  mentorspirit: mapMentor,
};

/**
 * @type {RegExp}
 */
const MENTOR_QUALITY_NAME =
  /^(Mentor Spirit|Schutzpatron|Paragon)\s*\((.+)\)$/i;

/**
 * @param {import('./parse-character.js').ParsedCharacter} parsed
 * @param {Array<{ name: string, type: string, system: object }>} mappedItems
 * @returns {{ name: string, type: string, system: object, effects: object[] } | null}
 */
function buildFallbackMentorItem(parsed, mappedItems) {
  if (mappedItems.some((i) => i.type === 'Mentor')) return null;

  /** @param {string} name @param {string} category */
  const minimalMentor = (name, category) => ({
    name,
    type: 'Mentor',
    system: {
      category,
      advantage: '',
      disadvantage: '',
      choices: [],
      selectedChoices: {},
      source: '',
    },
    effects: [],
  });

  const leaf = parsed.character?.mentorspirit;
  const leafName =
    typeof leaf === 'string'
      ? leaf.trim()
      : String(leaf?.['#text'] ?? '').trim();
  if (leafName) return minimalMentor(leafName, 'Other');

  const qualityMatch = mappedItems
    .filter((i) => i.type === 'Quality')
    .map((i) => i.name.match(MENTOR_QUALITY_NAME))
    .find(Boolean);
  if (qualityMatch) {
    return minimalMentor(
      qualityMatch[2],
      /paragon/i.test(qualityMatch[1]) ? 'Resonance' : 'Other'
    );
  }

  return null;
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} [parsedItems]
 * @returns {Map<string, string>}
 */
function buildWeaponCategoryTranslations(parsedItems) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const record of parsedItems?.weapon ?? []) {
    const de = String(record.category ?? '').trim();
    const en = String(record.category_english ?? '').trim();
    if (de && en && de !== en) map.set(de, en);
  }
  return map;
}

/**
 * @param {Array<Record<string, any>>} skills
 * @returns {Map<string, { localizedName?: string, rating: number, specialization: string }>}
 */
function buildSkillRatingMap(skills) {
  /** @type {Map<string, { localizedName?: string, rating: number, specialization: string }>} */
  const map = new Map();
  for (const skill of skills) {
    if (isTrue(skill.knowledge)) continue;
    const rating = parseInt(String(skill.rating ?? '0'), 10) || 0;
    const specialization = String(skill.spec ?? '').trim();
    if (rating <= 0 && !specialization) continue;
    const name = String(skill.name ?? '').trim();
    if (!name) continue;
    const englishName = translateSkillNameToEnglish(name);
    const key = normalizeSkillName(englishName ?? name);
    map.set(key, {
      localizedName: englishName ? name : undefined,
      rating,
      specialization,
    });
  }
  return map;
}

/**
 * @param {Array<{ name: string, type: string, system: object }>} canonicalSkills
 * @param {Map<string, { localizedName?: string, rating: number, specialization: string }>} ratings
 * @returns {Array<object>}
 */
function mergeSkillRatings(canonicalSkills, ratings) {
  return canonicalSkills.map((skill) => {
    const override = ratings.get(normalizeSkillName(skill.name));
    if (!override) return skill;
    return {
      ...skill,
      ...(override.localizedName ? { name: override.localizedName } : {}),
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
  const essenceModifiers = resolveEssenceModifiers(parsed.items?.quality);
  const { name, img, system } = mapCharacterSystem(
    parsed.character,
    essenceModifiers
  );

  const weaponCategoryTranslations = buildWeaponCategoryTranslations(
    parsed.items
  );

  /** @type {Array<object>} */
  const items = [];
  for (const [tag, mapper] of Object.entries(COLLECTION_MAPPERS)) {
    for (const record of parsed.items?.[tag] ?? []) {
      items.push(mapper(record, weaponCategoryTranslations, essenceModifiers));
    }
  }

  const ratings = buildSkillRatingMap(parsed.skills ?? []);
  const activeSkills = mergeSkillRatings(canonicalSkills ?? [], ratings);
  const knowledgeSkills = (parsed.skills ?? [])
    .filter((s) => isTrue(s.knowledge))
    .map(mapCharacterSkill);

  const metatypeItem = mapCharacterMetatype(parsed.character);
  const fallbackMentorItem = buildFallbackMentorItem(parsed, items);

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
      ...(fallbackMentorItem ? [fallbackMentorItem] : []),
      ...modItems,
      ...activeSkills,
      ...knowledgeSkills,
    ],
    ammoLinks,
    weaponModLinks,
  };
}
