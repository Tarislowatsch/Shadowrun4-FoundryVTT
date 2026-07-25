/**
 * @typedef {object} ExistingItemIndex
 * @property {Map<string, string>} byGuid
 * @property {Map<string, string>} byName
 */

/**
 * @param {Array<{ _id: string, name: string, system?: object }>} indexEntries
 * @returns {ExistingItemIndex}
 */
export function buildExistingItemIndex(indexEntries) {
  /** @type {Map<string, string>} */
  const byGuid = new Map();
  /** @type {Map<string, string>} */
  const byName = new Map();
  for (const entry of indexEntries) {
    const nameKey = String(entry.name ?? '')
      .trim()
      .toLowerCase();
    if (nameKey) {
      if (byName.has(nameKey)) {
        console.warn(
          `SR4 | Importer: duplicate item name "${entry.name}" in pack, using first match for update-matching.`
        );
      } else {
        byName.set(nameKey, entry._id);
      }
    }
    const guid = entry.system?.chummerId;
    if (guid) {
      if (byGuid.has(guid)) {
        console.warn(
          `SR4 | Importer: duplicate chummerId "${guid}" in pack, using first match for update-matching.`
        );
      } else {
        byGuid.set(guid, entry._id);
      }
    }
  }
  return { byGuid, byName };
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} mappedName
 * @param {ExistingItemIndex} index
 * @returns {string | null}
 */
export function resolveExistingItemId(record, mappedName, index) {
  const guid = String(record?.id ?? '').trim();
  if (guid && index.byGuid.has(guid)) return index.byGuid.get(guid);
  return index.byName.get(mappedName.trim().toLowerCase()) ?? null;
}

/**
 * @param {ExistingItemIndex} index
 * @param {{ id?: string, _id?: string, name: string, system?: object }} doc
 */
export function addToExistingItemIndex(index, doc) {
  const id = doc.id ?? doc._id;
  if (!id) return;
  const nameKey = String(doc.name ?? '')
    .trim()
    .toLowerCase();
  if (nameKey && !index.byName.has(nameKey)) index.byName.set(nameKey, id);
  const guid = doc.system?.chummerId;
  if (guid && !index.byGuid.has(guid)) index.byGuid.set(guid, id);
}

/**
 * @param {string} matchId
 * @param {{ name: string, system: object }} data
 * @returns {{ _id: string, system: object }}
 */
export function buildUpdatePayload(matchId, data) {
  return {
    _id: matchId,
    system: {
      nameEn: data.system.nameEn ?? '',
      sourceCode: data.system.sourceCode ?? '',
      sourceBookEn: data.system.sourceBookEn ?? '',
      chummerId: data.system.chummerId ?? '',
      label: data.system.label ?? '',
    },
  };
}
