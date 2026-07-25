const DICT_VERSION = 1;

/**
 * @typedef {Record<string, string>} LabelTranslations
 * @typedef {{ label: string, translations: LabelTranslations }} TranslationEntry
 */

/**
 * @param {string} settingJson
 * @returns {Record<string, LabelTranslations>}
 */
export function parseItemNameTranslations(settingJson) {
  try {
    const parsed = JSON.parse(settingJson || '{}');
    if (!parsed || parsed._version !== DICT_VERSION || !parsed.labels)
      return {};
    return parsed.labels;
  } catch {
    return {};
  }
}

/**
 * @param {Record<string, LabelTranslations>} labels
 * @returns {string}
 */
export function stringifyItemNameTranslations(labels) {
  return JSON.stringify({ _version: DICT_VERSION, labels });
}

/**
 * @param {Record<string, LabelTranslations>} labels
 * @param {TranslationEntry[]} entries
 * @returns {Record<string, LabelTranslations>}
 */
export function mergeItemNameTranslationEntries(labels, entries) {
  const result = { ...labels };
  for (const { label, translations } of entries) {
    if (!label || !translations) continue;
    const existing = result[label];
    if (existing?.en && translations.en && existing.en !== translations.en) {
      console.warn(
        `SR4 | Importer: label "${label}" collision — "${existing.en}" vs "${translations.en}", keeping first.`
      );
      result[label] = { ...translations, ...existing };
      continue;
    }
    result[label] = { ...existing, ...translations };
  }
  return result;
}

/**
 * @param {Record<string, LabelTranslations>} labels
 * @param {string} label
 * @param {string} [lang]
 * @returns {string | undefined}
 */
export function lookupItemNameTranslation(labels, label, lang) {
  const entry = labels[label];
  if (!entry) return undefined;
  return entry[lang] ?? entry.en ?? undefined;
}

let _cache = null;

/**
 * @returns {Record<string, LabelTranslations>}
 */
export function getItemNameTranslations() {
  return (_cache ??= parseItemNameTranslations(
    game.settings.get('shadowrun4e', 'itemNameTranslations')
  ));
}

/**
 * @returns {void}
 */
export function invalidateItemNameTranslationsCache() {
  _cache = null;
}

/**
 * @param {TranslationEntry[]} entries
 * @returns {Promise<void>}
 */
export async function registerItemNameTranslations(entries) {
  if (!entries || entries.length === 0) return;
  const merged = mergeItemNameTranslationEntries(
    getItemNameTranslations(),
    entries
  );
  await game.settings.set(
    'shadowrun4e',
    'itemNameTranslations',
    stringifyItemNameTranslations(merged)
  );
  invalidateItemNameTranslationsCache();
}

/**
 * @param {string} label
 * @param {string} [lang]
 * @returns {string | undefined}
 */
export function resolveItemNameTranslation(label, lang) {
  return lookupItemNameTranslation(getItemNameTranslations(), label, lang);
}
