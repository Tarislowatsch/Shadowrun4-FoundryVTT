import { TAG_CONFIGS } from './registry.js';
import { ALL_CRITTER_CATEGORIES } from './mappers/constants.js';
import { detachMentorBonusAndChoices } from './mappers/mentors.js';

/** @type {string[]} */
const KNOWN_TAGS = [...new Set(TAG_CONFIGS.map((c) => c.xmlTag))];

/**
 * @param {Element} element
 * @returns {string | Record<string, string>} trimmed text, or `{ '#text', ...attributes }` when the element carries XML attributes
 */
function leafValue(element) {
  const text = element.textContent?.trim() ?? '';
  const attrs = element.attributes;
  if (!attrs?.length) return text;
  /** @type {Record<string, string>} */
  const value = { '#text': text };
  for (const attr of Array.from(attrs)) {
    value[attr.name] = attr.value;
  }
  return value;
}

/**
 * @param {Element} element
 * @returns {Record<string, unknown>}
 */
export function elementToRecord(element) {
  /** @type {Record<string, unknown>} */
  const record = {};
  const assign = (/** @type {string} */ key, /** @type {unknown} */ value) => {
    if (!(key in record)) {
      record[key] = value;
      return;
    }
    const existing = record[key];
    if (Array.isArray(existing)) existing.push(value);
    else record[key] = [existing, value];
  };
  for (const child of element.children) {
    const key = child.tagName;
    const nested = [...child.children];
    if (nested.length === 0) {
      assign(key, leafValue(child));
    } else if (
      nested.length > 1 &&
      new Set(nested.map((n) => n.tagName)).size === 1
    ) {
      assign(
        key,
        nested.map((n) => leafValue(n))
      );
    } else {
      assign(key, elementToRecord(child));
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
 * @param {Element} root
 * @returns {Array<Record<string, unknown>>}
 */
function extractMentorRecords(root) {
  const elements = [...root.querySelectorAll(':scope > mentors > mentor')];
  return elements.map((el) => {
    const { bonus, choices } = detachMentorBonusAndChoices(el);
    const record = elementToRecord(el);
    record._bonus = bonus;
    record._choices = choices;
    return record;
  });
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
    if (tag === 'mentor') {
      const records = extractMentorRecords(root);
      if (records.length > 0) result.mentor = records;
      continue;
    }
    const elements = [...root.querySelectorAll(`:scope > * > ${tag}`)];
    if (elements.length > 0) result[tag] = elements.map(elementToRecord);
  }
  return result;
}
