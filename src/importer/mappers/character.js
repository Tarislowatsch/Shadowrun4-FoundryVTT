/**
 * @fileoverview Pure mappers turning a parsed Chummer `<character>` record into
 * SR4 actor system data and knowledge/language skill items. No DOM or Foundry
 * dependencies — safe to unit test under Node.
 */

import {
  ATTRIBUTE_ABBR_TO_KEY,
  parseDecimal,
  parseNumber,
  sourceOf,
  upper,
} from './helpers.js';

/**
 * @type {Record<string, string>}
 */
const TRADITION_MAP = {
  hermetic: 'HERMETIC',
  shamanic: 'SHAMAN',
  shaman: 'SHAMAN',
  wicca: 'WICCA',
  wiccan: 'WICCA',
  chaos: 'CHAOS',
};

/**
 * @type {Record<string, string>}
 */
const KNOWLEDGE_CATEGORY_MAP = {
  academic: 'academic',
  professional: 'academic',
  interest: 'hobby',
  hobby: 'hobby',
  street: 'street',
  language: 'language',
};

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function parseBool(value) {
  return upper(value) === 'TRUE';
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
function resolveTradition(raw) {
  return (
    TRADITION_MAP[
      String(raw ?? '')
        .trim()
        .toLowerCase()
    ] ?? 'NONE'
  );
}

/**
 * Drain formulas read "WIL + X (n)"; the system stores the secondary attribute X.
 *
 * @param {unknown} drain
 * @param {string} tradition
 * @returns {'LOGIC' | 'CHARISMA' | 'INTUITION'}
 */
function resolveDrainAttribute(drain, tradition) {
  const s = upper(drain);
  if (/\bCHA\b/.test(s)) return 'CHARISMA';
  if (/\bLOG\b/.test(s)) return 'LOGIC';
  if (/\bINT\b/.test(s)) return 'INTUITION';
  return tradition === 'HERMETIC' ? 'LOGIC' : 'CHARISMA';
}

/**
 * @param {Record<string, string>} attributes
 * @returns {Record<string, number>}
 */
function mapSheetStats(attributes) {
  /** @type {Record<string, number>} */
  const stats = {};
  for (const [abbr, key] of Object.entries(ATTRIBUTE_ABBR_TO_KEY)) {
    const raw = attributes?.[abbr];
    if (raw === undefined) continue;
    stats[key] = key === 'ESSENCE' ? parseDecimal(raw, 6) : parseNumber(raw, 0);
  }
  if (stats.EDGE !== undefined) stats.CURRENTEDGE = stats.EDGE;
  return stats;
}

/**
 * Only raw attributes and current damage are written; condition-monitor maxima,
 * initiative and wound modifiers are left to the actor's own derivation.
 *
 * @param {Record<string, any>} character
 * @returns {{ name: string, img: string|null, system: object }}
 */
export function mapCharacterSystem(character) {
  const tradition = resolveTradition(character.tradition);
  const mugshot = String(character.mugshotbase64 ?? '').trim();

  return {
    name: String(character.name ?? '').trim() || 'Imported Character',
    img: mugshot ? `data:image/jpeg;base64,${mugshot}` : null,
    system: {
      sheetStats: mapSheetStats(character.attributes ?? {}),
      metaData: {
        nuyen: parseNumber(character.nuyen, 0),
        karma: parseNumber(character.karma, 0),
        totalKarma: parseNumber(character.totalkarma, 0),
        streetCred: parseNumber(character.totalstreetcred, 0),
        notoriety: parseNumber(character.totalnotoriety, 0),
        publicAwareness: parseNumber(character.totalpublicawareness, 0),
        age: parseNumber(character.age, 25),
      },
      descriptionAndNotes: {
        metatype: String(character.metatype ?? '').trim() || 'Human',
        gender: String(character.sex ?? '').trim() || 'Unknown',
        height: String(character.height ?? '').trim(),
        weight: String(character.weight ?? '').trim(),
        eyes: String(character.eyes ?? '').trim(),
        hair: String(character.hair ?? '').trim(),
        skin: String(character.skin ?? '').trim(),
        bio: String(character.background ?? character.description ?? '').trim(),
        notes: String(character.gamenotes ?? '').trim(),
      },
      magic: {
        magician: parseBool(character.magician),
        adept: parseBool(character.adept),
        tradition,
        drainAttribute: resolveDrainAttribute(character.drain, tradition),
      },
      technomancer: parseBool(character.technomancer),
      conditionMonitor: {
        physical: { value: parseNumber(character.physicalcmfilled, 0) },
        stun: { value: parseNumber(character.stuncmfilled, 0) },
      },
    },
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapCharacterSkill(record) {
  const knowledge = parseBool(record.knowledge);
  const rawCategory = String(record.skillcategory ?? '')
    .trim()
    .toLowerCase();
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Skill',
    type: 'Skill',
    system: {
      attribute: ATTRIBUTE_ABBR_TO_KEY[upper(record.attribute)] ?? '',
      category: KNOWLEDGE_CATEGORY_MAP[rawCategory] ?? 'misc',
      group: String(record.skillgroup ?? '').trim(),
      type: knowledge ? 'knowledge' : 'active',
      rating: parseNumber(record.rating, 0),
      specialization: String(record.spec ?? '').trim(),
      source: sourceOf(record),
    },
  };
}
