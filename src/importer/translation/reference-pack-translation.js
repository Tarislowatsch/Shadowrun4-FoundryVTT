/**
 * @typedef {object} GuidTranslation
 * @property {string} name
 * @property {string} nameEn
 * @property {string} label
 */

/**
 * @param {CompendiumCollection} pack
 * @returns {Promise<Map<string, GuidTranslation>>}
 */
export async function buildGuidTranslationMap(pack) {
  const index = await pack.getIndex({
    fields: ['system.chummerId', 'system.nameEn', 'system.label'],
  });
  /** @type {Map<string, GuidTranslation>} */
  const map = new Map();
  for (const entry of index) {
    const guid = entry.system?.chummerId;
    if (!guid) continue;
    if (!map.has(guid)) {
      map.set(guid, {
        name: entry.name,
        nameEn: entry.system?.nameEn || entry.name,
        label: entry.system?.label ?? '',
      });
    }
  }
  return map;
}

/**
 * @param {{ name: string, type: string, system: object }} data
 * @param {Map<string, GuidTranslation> | null} guidMap
 * @returns {{ name: string, type: string, system: object }}
 */
export function applyGuidFallback(data, guidMap) {
  if (data.system?.nameEn) return data;
  const guid = data.system?.chummerId;
  if (!guid) return data;
  const match = guidMap?.get(guid);
  if (!match) return data;
  return {
    ...data,
    name: data.name || match.name,
    system: {
      ...data.system,
      nameEn: match.nameEn,
      label: data.system?.label || match.label,
    },
  };
}
