/**
 * @fileoverview Browser-only XML parsing layer for the single-character
 * importer. Reads one Chummer `<character>` element into a flat field record,
 * an attribute map and per-collection item/skill record arrays. Kept separate
 * from the pure mappers so those stay unit-testable under Node.
 */

import { elementToRecord } from './parse-xml.js';

/**
 * Item collections to extract, as `[childTag, containerTag]` pairs. Scoping to
 * `container > child` keeps vehicle-mounted weapons (nested under
 * `vehicles/vehicle/weapons`) out of the character's own item lists.
 * @type {Array<[string, string]>}
 */
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
];

/**
 * @typedef {object} ParsedCharacter
 * @property {Record<string, unknown>} character - Leaf fields plus `attributes`.
 * @property {Record<string, Array<Record<string, unknown>>>} items
 * @property {Array<Record<string, unknown>>} skills
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
    if (name) attributes[name] = total ?? base ?? '0';
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
    items[child] = els.map(elementToRecord);
    if (child === 'weapon') weaponEls = els;
    if (child === 'gear') gearEls = els;
  }

  if (gearEls) {
    for (const gearEl of gearEls) {
      const childGearEls = [
        ...gearEl.querySelectorAll(':scope > children > gear'),
      ];
      for (const childEl of childGearEls) {
        items.gear.push(elementToRecord(childEl));
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
    }
  }

  const skills = [
    ...characterEl.querySelectorAll(':scope > skills > skill'),
  ].map(elementToRecord);

  character.contacts = [
    ...characterEl.querySelectorAll(':scope > contacts > contact'),
  ].map(elementToRecord);

  return { character, items, skills };
}
