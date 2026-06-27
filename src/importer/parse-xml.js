import { TAG_CONFIGS } from './registry.js';
import { ALL_CRITTER_CATEGORIES } from './mappers/helpers.js';

/** @type {string[]} */
const KNOWN_TAGS = [...new Set(TAG_CONFIGS.map((c) => c.xmlTag))];

/**
 * @param {Element} element
 * @returns {Record<string, unknown>}
 */
export function elementToRecord(element) {
  /** @type {Record<string, unknown>} */
  const record = {};
  for (const child of element.children) {
    const key = child.tagName;
    const nested = [...child.children];
    if (nested.length === 0) {
      record[key] = child.textContent?.trim() ?? '';
    } else if (
      nested.length > 1 &&
      new Set(nested.map((n) => n.tagName)).size === 1
    ) {
      record[key] = nested.map((n) => n.textContent?.trim() ?? '');
    } else {
      record[key] = elementToRecord(child);
    }
  }
  return record;
}

/**
 * @param {Element} root
 * @returns {Array<Record<string, unknown>>}
 */
function extractMetatypeRecords(root) {
  const elements = [...root.querySelectorAll(':scope > metatypes > metatype')];
  /** @type {Array<Record<string, unknown>>} */
  const records = [];
  for (const el of elements) {
    const variantEls = [
      ...el.querySelectorAll(':scope > metavariants > metavariant'),
    ];
    el.querySelector(':scope > metavariants')?.remove();
    const record = elementToRecord(el);
    records.push(record);

    for (const varEl of variantEls) {
      const varRecord = elementToRecord(varEl);
      varRecord._parentRecord = record;
      records.push(varRecord);
    }
  }
  return records;
}

/**
 * Parses an XML string into per-tag record arrays. The document root is never
 * inspected, so any container layout is accepted.
 *
 * @param {string} xmlString
 * @returns {Record<string, Array<Record<string, unknown>>>}
 * @throws {Error} When the XML is malformed.
 */
export function extractRecords(xmlString) {
  const doc = new DOMParser().parseFromString(xmlString, 'application/xml');
  const error = doc.querySelector('parsererror');
  if (error) {
    throw new Error(error.textContent?.trim() || 'Invalid XML document.');
  }

  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const result = {};
  const root = doc.documentElement;
  for (const tag of KNOWN_TAGS) {
    if (tag === 'metatype') {
      const allRecords = extractMetatypeRecords(root);
      const metatypes = [];
      const critters = [];
      for (const rec of allRecords) {
        const cat = String(
          rec._parentRecord?.category ?? rec.category ?? ''
        ).trim();
        if (ALL_CRITTER_CATEGORIES.has(cat)) {
          critters.push(rec);
        } else {
          metatypes.push(rec);
        }
      }
      if (metatypes.length > 0) result.metatype = metatypes;
      if (critters.length > 0) result.critter = critters;
      continue;
    }
    if (tag === 'critter') continue;
    const elements = [...root.querySelectorAll(`:scope > * > ${tag}`)];
    if (elements.length > 0) result[tag] = elements.map(elementToRecord);
  }
  return result;
}
