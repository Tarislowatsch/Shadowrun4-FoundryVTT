/**
 * @fileoverview Pure grouping layer: turns parsed records into per-compendium
 * import groups and into the type → subcategory → group view-model the UI renders.
 */

import { TAG_CONFIGS } from './registry.js';

/**
 * @param {string} str
 * @returns {string}
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * @typedef {object} ImportGroup
 * @property {string} id
 * @property {string} typeLabel
 * @property {string} source
 * @property {string} subcategory
 * @property {string} compendiumName
 * @property {string} compendiumLabel
 * @property {string} [parentFolder]
 * @property {Array<Record<string, unknown>>} records
 * @property {(record: Record<string, unknown>) => { name: string, type: string, system: object }} map
 */

/**
 * Groups parsed records by type label, subcategory and source book. Each
 * group maps to one target world compendium.
 *
 * @param {Record<string, Array<Record<string, unknown>>>} parsed
 * @returns {ImportGroup[]}
 */
export function buildImportGroups(parsed) {
  /** @type {Map<string, ImportGroup>} */
  const groups = new Map();

  for (const config of TAG_CONFIGS) {
    const records = parsed[config.xmlTag] ?? [];
    for (const record of records) {
      const source = String(record.source ?? '').trim() || 'Unknown';
      const typeLabel = config.typeLabel(record);
      const subcategory = config.subcategory(record);
      const key = `${config.xmlTag}\0${typeLabel.toLowerCase()}\0${source.toLowerCase()}\0${subcategory.toLowerCase()}`;

      if (!groups.has(key)) {
        const compendiumSlug = slugify(`${config.xmlTag}-${subcategory}`);
        groups.set(key, {
          id: slugify(`${source}-${config.xmlTag}-${subcategory}`),
          typeLabel,
          source,
          subcategory,
          compendiumName: `sr4-imported-${compendiumSlug}`,
          compendiumLabel: subcategory,
          parentFolder: config.parentFolder ?? null,
          records: [],
          map: config.map,
        });
      }
      groups.get(key).records.push(record);
    }
  }

  return [...groups.values()].sort(
    (a, b) =>
      a.typeLabel.localeCompare(b.typeLabel) ||
      a.subcategory.localeCompare(b.subcategory) ||
      a.source.localeCompare(b.source)
  );
}

/**
 * @typedef {object} TreeGroup
 * @property {string} id
 * @property {string} source
 * @property {number} count
 * @property {string} compendiumLabel
 * @property {string} typeId
 * @property {string|null} subcategoryId
 * @property {number} indent
 */

/**
 * @typedef {object} TreeSubcategory
 * @property {string} name
 * @property {string} subcategoryId
 * @property {boolean} showHeader
 * @property {TreeGroup[]} groups
 */

/**
 * @typedef {object} TreeType
 * @property {string} name
 * @property {string} typeId
 * @property {TreeSubcategory[]} subcategories
 */

/**
 * Builds the nested type → subcategory → group view-model the importer UI
 * renders. Subcategories whose name equals their parent type are flattened
 * (no header row); their groups indent one level instead of two.
 *
 * @param {ImportGroup[]} groups
 * @returns {TreeType[]}
 */
export function buildTypeTree(groups) {
  /** @type {Map<string, Map<string, Array<object>>>} */
  const typeMap = new Map();

  for (const group of groups) {
    if (!typeMap.has(group.typeLabel)) typeMap.set(group.typeLabel, new Map());
    const subcatMap = typeMap.get(group.typeLabel);
    if (!subcatMap.has(group.subcategory)) subcatMap.set(group.subcategory, []);
    subcatMap.get(group.subcategory).push({
      id: group.id,
      source: group.source,
      count: group.records.length,
      compendiumLabel: group.compendiumLabel,
    });
  }

  return [...typeMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([typeName, subcatMap]) => {
      const typeId = slugify(typeName);
      const subcategories = [...subcatMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([subcatName, subcatGroups]) => {
          const showHeader = subcatName !== typeName;
          const subcategoryId = `${typeId}--${slugify(subcatName)}`;
          return {
            name: subcatName,
            subcategoryId,
            showHeader,
            groups: subcatGroups.map((g) => ({
              ...g,
              typeId,
              subcategoryId: showHeader ? subcategoryId : null,
              indent: showHeader ? 48 : 24,
            })),
          };
        });
      return { name: typeName, typeId, subcategories };
    });
}
