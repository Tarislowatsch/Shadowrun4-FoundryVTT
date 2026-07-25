import { normalizeItemLabel, canonicalItemName } from '../mappers/helpers.js';

/**
 * @typedef {object} BookTranslation
 * @property {string} en
 * @property {string} translated
 */

/**
 * @typedef {object} TranslationData
 * @property {Map<string, string>} names
 * @property {Map<string, BookTranslation>} books
 */

/**
 * @param {Element} element
 * @param {Map<string, string>} names
 * @param {Map<string, BookTranslation>} books
 */
export function collectTranslations(element, names, books) {
  let name;
  let translated;
  let code;
  for (const child of element.children) {
    if (child.tagName === 'name' && name === undefined) {
      name = child.textContent?.trim();
    } else if (child.tagName === 'translate' && translated === undefined) {
      translated = child.textContent?.trim();
    } else if (child.tagName === 'code' && code === undefined) {
      code = child.textContent?.trim();
    }
  }
  if (element.tagName === 'book' && name && code) {
    if (!books.has(code))
      books.set(code, { en: name, translated: translated || name });
  } else if (name && translated && !names.has(name)) {
    names.set(name, translated);
  }
  for (const child of element.children) {
    collectTranslations(child, names, books);
  }
}

/**
 * @param {string} xmlString
 * @returns {TranslationData}
 * @throws {Error} When the XML is malformed.
 */
export function parseTranslationData(xmlString) {
  const doc = new DOMParser().parseFromString(xmlString, 'application/xml');
  const error = doc.querySelector('parsererror');
  if (error) {
    throw new Error(error.textContent?.trim() || 'Invalid XML document.');
  }

  /** @type {Map<string, string>} */
  const names = new Map();
  /** @type {Map<string, BookTranslation>} */
  const books = new Map();
  collectTranslations(doc.documentElement, names, books);
  return { names, books };
}

/**
 * @typedef {object} TranslationEntry
 * @property {string} label
 * @property {Record<string, string>} translations
 */

/**
 * @typedef {object} AppliedTranslation
 * @property {{ name: string, type: string, system: object }} data
 * @property {TranslationEntry | null} translationEntry
 */

/**
 * @param {{ name: string, type: string, system: object }} data
 * @param {Record<string, unknown>} record
 * @param {TranslationData | null} translations
 * @param {string | null} [lang]
 * @returns {AppliedTranslation}
 */
export function applyTranslation(data, record, translations, lang = null) {
  const chummerId = String(record?.id ?? '').trim();
  const sourceCode = String(record?.source ?? '').trim();
  const book = sourceCode ? translations?.books.get(sourceCode) : undefined;
  const canonicalName = canonicalItemName(data);
  const label = normalizeItemLabel(canonicalName);

  const system = {
    ...data.system,
    chummerId,
    sourceCode,
    label,
    ...(book ? { sourceBookEn: book.en } : {}),
  };

  const translatedName = translations?.names.get(canonicalName.trim());
  if (!translatedName)
    return { data: { ...data, system }, translationEntry: null };

  return {
    data: { ...data, system: { ...system, nameEn: canonicalName } },
    translationEntry: lang
      ? { label, translations: { en: canonicalName, [lang]: translatedName } }
      : null,
  };
}
