import { lower } from '../mappers/helpers.js';

/**
 * @typedef {object} ExistingItemIndex
 * @property {Map<string, string>} byGuid
 * @property {Map<string, string>} byName
 */

/**
 * @param {Map<string, string>} map
 * @param {string} key
 * @param {string} id
 * @param {string} kind - Human label for the duplicate warning ("item name", "chummerId").
 * @param {string} [display=key] - Value shown in the warning, when it differs from the key.
 */
function setFirst(map, key, id, kind, display = key) {
  if (!key) return;
  if (map.has(key)) {
    console.warn(
      `SR4 | Importer: duplicate ${kind} "${display}" in pack, using first match for update-matching.`
    );
    return;
  }
  map.set(key, id);
}

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
    setFirst(byName, lower(entry.name), entry._id, 'item name', entry.name);
    setFirst(byGuid, entry.system?.chummerId, entry._id, 'chummerId');
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
  return index.byName.get(lower(mappedName)) ?? null;
}

/**
 * @param {ExistingItemIndex} index
 * @param {{ id?: string, _id?: string, name: string, system?: object }} doc
 */
export function addToExistingItemIndex(index, doc) {
  const id = doc.id ?? doc._id;
  if (!id) return;
  const nameKey = lower(doc.name);
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
