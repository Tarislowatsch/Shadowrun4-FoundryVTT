import { applyTranslation } from '../translation/parse-name-translations.js';
import { applyGuidFallback } from '../translation/reference-pack-translation.js';
import {
  resolveExistingItemId,
  buildUpdatePayload,
} from './existing-item-match.js';

/**
 * @typedef {object} GroupImportPlan
 * @property {Array<{ name: string, type: string, system: object }>} docs
 * @property {Array<{ _id: string, system: object }>} updates
 * @property {import('../utils/item-name-translations.js').TranslationEntry[]} translationEntries
 * @property {string[]} addedKnownNames - not deduplicated
 * @property {number} skippedCount
 */

/**
 * @param {import('./grouping.js').ImportGroup} group
 * @param {object} options
 * @param {import('./parse-name-translations.js').TranslationData | null} options.translationData
 * @param {string | null} options.lang
 * @param {Map<string, import('./reference-pack-translation.js').GuidTranslation> | null} options.guidMap
 * @param {import('./existing-item-match.js').ExistingItemIndex | null} options.existingIndex
 * @param {boolean} options.skipDuplicates
 * @param {Set<string>} options.known
 * @returns {GroupImportPlan}
 */
export function planGroupImport(
  group,
  { translationData, lang, guidMap, existingIndex, skipDuplicates, known }
) {
  const seen = new Set(known);
  const addedKnownNames = [];

  const docs = [];
  const updates = [];
  const translationEntries = [];
  let skippedCount = 0;

  for (const record of group.records) {
    const mapped = group.map(record);
    const { data: translated, translationEntry } = applyTranslation(
      mapped,
      record,
      translationData,
      lang
    );
    if (translationEntry) translationEntries.push(translationEntry);
    const data = applyGuidFallback(translated, guidMap);

    if (existingIndex) {
      const matchId = resolveExistingItemId(record, mapped.name, existingIndex);
      if (matchId) {
        updates.push(buildUpdatePayload(matchId, data));
        continue;
      }
    }

    const nameKey = data.name.toLowerCase();
    if (skipDuplicates && seen.has(nameKey)) {
      skippedCount += 1;
      continue;
    }
    seen.add(nameKey);
    addedKnownNames.push(nameKey);
    docs.push(data);
  }

  return { docs, updates, translationEntries, addedKnownNames, skippedCount };
}
