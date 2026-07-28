import { elementToRecord, toMentorRecord } from '../xml/parse-xml.js';

/** @type {Array<[string, string, ((el: Element) => Record<string, unknown>)?]>} [child, container, recordMapper] */
const COLLECTIONS = [
  ['weapon', 'weapons', parseWeaponRecord],
  ['armor', 'armors'],
  ['gear', 'gears'],
  ['spell', 'spells'],
  ['quality', 'qualities'],
  ['power', 'powers'],
  ['cyberware', 'cyberwares'],
  ['bioware', 'biowares'],
  ['program', 'techprograms'],
  ['mentorspirit', 'mentorspirits', toMentorRecord],
];

/**
 * @typedef {object} ParsedCharacter
 * @property {Record<string, unknown>} character - Leaf fields plus `attributes`.
 * @property {Record<string, Array<Record<string, unknown>>>} items
 * @property {Array<Record<string, unknown>>} skills
 * @property {Array<Record<string, unknown>>} spirits - Both spirits and sprites (`type` field distinguishes them).
 * @property {Array<Record<string, unknown>>} vehicles - Each record has a `_mods` array of `<mods><mod>` children.
 */

/**
 * @param {Element} characterEl
 * @returns {Record<string, string>}
 */
function parseLeafFields(characterEl) {
  /** @type {Record<string, string>} */
  const fields = {};
  for (const child of characterEl.children) {
    if (child.children.length === 0) {
      fields[child.tagName] = child.textContent?.trim() ?? '';
    }
  }
  return fields;
}

/**
 * @param {Element} characterEl
 * @returns {{ attributes: Record<string, string>, attributeLimits: Record<string, { min: string, max: string, aug: string }> }}
 */
function parseAttributes(characterEl) {
  /** @type {Record<string, string>} */
  const attributes = {};
  /** @type {Record<string, { min: string, max: string, aug: string }>} */
  const attributeLimits = {};
  for (const attr of characterEl.querySelectorAll(
    ':scope > attributes > attribute'
  )) {
    const name = attr.querySelector(':scope > name')?.textContent?.trim();
    const total = attr.querySelector(':scope > total')?.textContent?.trim();
    const base = attr.querySelector(':scope > base')?.textContent?.trim();
    if (name) attributes[name] = base ?? total ?? '0';
    const min = attr.querySelector(':scope > min')?.textContent?.trim();
    const max = attr.querySelector(':scope > max')?.textContent?.trim();
    const aug = attr.querySelector(':scope > aug')?.textContent?.trim();
    if (name && (min || max || aug)) {
      attributeLimits[name] = {
        min: min ?? '0',
        max: max ?? '0',
        aug: aug ?? '0',
      };
    }
  }
  return { attributes, attributeLimits };
}

/**
 * @param {Element} weaponEl
 * @returns {Record<string, unknown>}
 */
function parseWeaponRecord(weaponEl) {
  const record = elementToRecord(weaponEl);
  const { clips, weaponMods } = parseWeaponAttachments(weaponEl);
  if (clips) record._clips = clips;
  if (weaponMods) record._weaponMods = weaponMods;
  return record;
}

/**
 * @param {Element} weaponEl
 * @returns {{ clips?: Array<{ gearGuid: string, count: number }>, weaponMods?: Array<Record<string, unknown>> }}
 */
function parseWeaponAttachments(weaponEl) {
  const clipEls = [...weaponEl.querySelectorAll(':scope > clips > clip')];
  const modEls = [
    ...weaponEl.querySelectorAll(':scope > mods > weaponmod'),
    ...weaponEl.querySelectorAll(':scope > accessories > accessory'),
  ];
  return {
    clips: clipEls.length
      ? clipEls
          .map((clip) => ({
            gearGuid:
              clip.querySelector(':scope > id')?.textContent?.trim() ?? '',
            count:
              parseInt(
                clip.querySelector(':scope > count')?.textContent?.trim() ??
                  '0',
                10
              ) || 0,
          }))
          .filter((c) => c.gearGuid)
      : undefined,
    weaponMods: modEls.length ? modEls.map(elementToRecord) : undefined,
  };
}

/**
 * @param {Element[]} gearEls - Top-level `<gear>` elements already mapped into `gearRecords`.
 * @param {Array<Record<string, unknown>>} gearRecords - Mutated in place with the flattened `<children><gear>` descendants.
 */
function collectNestedGear(gearEls, gearRecords) {
  const queue = [...gearEls];
  while (queue.length > 0) {
    const parentEl = /** @type {Element} */ (queue.shift());
    for (const childEl of parentEl.querySelectorAll(
      ':scope > children > gear'
    )) {
      gearRecords.push(elementToRecord(childEl));
      queue.push(childEl);
    }
  }
}

/**
 * @param {Element} characterEl
 * @returns {Record<string, Array<Record<string, unknown>>>}
 */
function parseItemCollections(characterEl) {
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const items = {};
  /** @type {Element[]|undefined} */
  let gearEls;
  for (const [child, container, mapRecord = elementToRecord] of COLLECTIONS) {
    const els = [
      ...characterEl.querySelectorAll(`:scope > ${container} > ${child}`),
    ];
    if (els.length === 0) continue;
    items[child] = els.map(mapRecord);
    if (child === 'gear') gearEls = els;
  }
  if (gearEls) collectNestedGear(gearEls, items.gear);
  return items;
}

/**
 * @param {Element} characterEl
 * @returns {Array<Record<string, unknown>>}
 */
function parseContacts(characterEl) {
  return [...characterEl.querySelectorAll(':scope > contacts > contact')].map(
    elementToRecord
  );
}

/**
 * @param {Element} characterEl
 * @returns {{ skills: Array<Record<string, unknown>>, spirits: Array<Record<string, unknown>>, vehicles: Array<Record<string, unknown>> }}
 */
function parseSubActors(characterEl) {
  const skills = [
    ...characterEl.querySelectorAll(':scope > skills > skill'),
  ].map(elementToRecord);
  const spirits = [
    ...characterEl.querySelectorAll(':scope > spirits > spirit'),
  ].map(elementToRecord);
  const vehicles = [
    ...characterEl.querySelectorAll(':scope > vehicles > vehicle'),
  ].map((el) => {
    const record = elementToRecord(el);
    record._mods = [...el.querySelectorAll(':scope > mods > mod')].map(
      elementToRecord
    );
    return record;
  });
  return { skills, spirits, vehicles };
}

/**
 * @param {string} xmlString
 * @returns {ParsedCharacter}
 * @throws {Error} When the XML is malformed or contains no `<character>`.
 */
export function extractCharacter(xmlString) {
  const doc = new DOMParser().parseFromString(xmlString, 'application/xml');
  const error = doc.querySelector('parsererror');
  if (error) {
    throw new Error(error.textContent?.trim() || 'Invalid XML document.');
  }

  const characterEl = doc.querySelector('character');
  if (!characterEl) throw new Error('No <character> element found.');

  const { attributes, attributeLimits } = parseAttributes(characterEl);
  const { skills, spirits, vehicles } = parseSubActors(characterEl);

  /** @type {Record<string, unknown>} */
  const character = {
    ...parseLeafFields(characterEl),
    attributes,
    attributeLimits,
    contacts: parseContacts(characterEl),
  };

  const items = parseItemCollections(characterEl);

  return { character, items, skills, spirits, vehicles };
}
