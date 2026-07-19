import { elementToRecord } from './parse-xml.js';
import { detachMentorBonusAndChoices } from './mappers/mentors.js';

/** @type {Array<[string, string]>} */
const COLLECTIONS = [
  ['weapon', 'weapons'],
  ['armor', 'armors'],
  ['gear', 'gears'],
  ['spell', 'spells'],
  ['quality', 'qualities'],
  ['power', 'powers'],
  ['cyberware', 'cyberwares'],
  ['bioware', 'biowares'],
  ['program', 'techprograms'],
  ['mentorspirit', 'mentorspirits'],
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

  /** @type {Record<string, unknown>} */
  const character = {};
  for (const child of characterEl.children) {
    if (child.children.length === 0) {
      character[child.tagName] = child.textContent?.trim() ?? '';
    }
  }

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
  character.attributes = attributes;
  character.attributeLimits = attributeLimits;

  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const items = {};
  /** @type {Element[]|undefined} */
  let weaponEls;
  /** @type {Element[]|undefined} */
  let gearEls;
  for (const [child, container] of COLLECTIONS) {
    const els = [
      ...characterEl.querySelectorAll(`:scope > ${container} > ${child}`),
    ];
    if (els.length === 0) continue;
    if (child === 'mentorspirit') {
      items[child] = els.map((el) => {
        const { bonus, choices } = detachMentorBonusAndChoices(el);
        const record = elementToRecord(el);
        record._bonus = bonus;
        record._choices = choices;
        return record;
      });
      continue;
    }
    items[child] = els.map(elementToRecord);
    if (child === 'weapon') weaponEls = els;
    if (child === 'gear') gearEls = els;
  }

  if (gearEls) {
    const queue = [...gearEls];
    while (queue.length > 0) {
      const parentEl = /** @type {Element} */ (queue.shift());
      const childGearEls = [
        ...parentEl.querySelectorAll(':scope > children > gear'),
      ];
      for (const childEl of childGearEls) {
        items.gear.push(elementToRecord(childEl));
        queue.push(childEl);
      }
    }
  }

  if (weaponEls && items.weapon) {
    for (let i = 0; i < weaponEls.length; i++) {
      const clipEls = [
        ...weaponEls[i].querySelectorAll(':scope > clips > clip'),
      ];
      if (clipEls.length > 0) {
        items.weapon[i]._clips = clipEls
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
          .filter((c) => c.gearGuid);
      }

      const modEls = [
        ...weaponEls[i].querySelectorAll(':scope > mods > weaponmod'),
        ...weaponEls[i].querySelectorAll(':scope > accessories > accessory'),
      ];
      if (modEls.length > 0) {
        items.weapon[i]._weaponMods = modEls.map(elementToRecord);
      }
    }
  }

  const skills = [
    ...characterEl.querySelectorAll(':scope > skills > skill'),
  ].map(elementToRecord);

  character.contacts = [
    ...characterEl.querySelectorAll(':scope > contacts > contact'),
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

  return { character, items, skills, spirits, vehicles };
}
