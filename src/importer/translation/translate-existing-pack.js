import { normalizeItemLabel, canonicalItemName } from '../mappers/helpers.js';

const CHUNK_SIZE = 100;

/**
 * @typedef {object} ExistingItemTranslationResult
 * @property {{ _id: string, system: { label: string } } | null} update
 * @property {import('@utils/item-name-translations.js').TranslationEntry | null} translationEntry
 */

/**
 * @param {{ _id?: string, id?: string, name: string, system?: object }} item
 * @param {import('./parse-name-translations.js').TranslationData} translations
 * @param {string} lang
 * @returns {ExistingItemTranslationResult | null}
 */
export function resolveTranslationForItem(item, translations, lang) {
  const id = item._id ?? item.id;
  if (!id) return null;

  const canonicalName = canonicalItemName(item);
  const translated = translations.names.get(canonicalName.trim());
  if (!translated) return null;

  const label = item.system?.label || normalizeItemLabel(canonicalName);
  return {
    update: item.system?.label ? null : { _id: id, system: { label } },
    translationEntry: {
      label,
      translations: { en: canonicalName, [lang]: translated },
    },
  };
}

/**
 * @param {CompendiumCollection} pack
 * @param {import('./parse-name-translations.js').TranslationData} translations
 * @param {string} lang
 * @returns {Promise<import('@utils/item-name-translations.js').TranslationEntry[]>}
 */
export async function translateExistingPack(pack, translations, lang) {
  const index = await pack.getIndex({
    fields: ['system.nameEn', 'system.label'],
  });
  const updates = [];
  const entries = [];
  for (const entry of index) {
    const result = resolveTranslationForItem(entry, translations, lang);
    if (!result) continue;
    if (result.update) updates.push(result.update);
    entries.push(result.translationEntry);
  }

  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    await pack.documentClass.updateDocuments(updates.slice(i, i + CHUNK_SIZE), {
      pack: pack.collection,
    });
  }

  return entries;
}
