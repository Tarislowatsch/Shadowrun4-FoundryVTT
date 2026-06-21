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
  for (const attr of characterEl.querySelectorAll(
    ':scope > attributes > attribute'
  )) {
    const name = attr.querySelector(':scope > name')?.textContent?.trim();
    const total = attr.querySelector(':scope > total')?.textContent?.trim();
    const base = attr.querySelector(':scope > base')?.textContent?.trim();
    if (name) attributes[name] = total ?? base ?? '0';
  }
  character.attributes = attributes;

  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const items = {};
  for (const [child, container] of COLLECTIONS) {
    const els = [
      ...characterEl.querySelectorAll(`:scope > ${container} > ${child}`),
    ];
    if (els.length > 0) items[child] = els.map(elementToRecord);
  }

  const skills = [
    ...characterEl.querySelectorAll(':scope > skills > skill'),
  ].map(elementToRecord);

  return { character, items, skills };
}
