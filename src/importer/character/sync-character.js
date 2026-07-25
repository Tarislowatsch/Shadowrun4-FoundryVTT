/**
 * @typedef {object} EmbeddedItemLike
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {Record<string, any>} system
 */

/**
 * @typedef {object} ItemSyncPlan
 * @property {Array<object>} toCreate
 * @property {Array<{_id: string, [key: string]: unknown}>} toUpdate
 * @property {string[]} toDeleteIds
 */

/**
 * @param {string} type
 * @param {string} name
 * @returns {string}
 */
function itemKey(type, name) {
  return `${type}::${name}`;
}

/**
 * Multiset match on (type, name). Items present in both existing and
 * imported sets are left untouched; surplus imported items are created,
 * surplus existing items are deleted.
 *
 * @param {EmbeddedItemLike[]} existingItems
 * @param {Array<{ name: string, type: string, system: object }>} importedItems
 * @returns {ItemSyncPlan}
 */
export function planGenericItemSync(existingItems, importedItems) {
  /** @type {Map<string, string[]>} */
  const existingByKey = new Map();
  for (const item of existingItems) {
    const key = itemKey(item.type, item.name);
    if (!existingByKey.has(key)) existingByKey.set(key, []);
    existingByKey.get(key).push(item.id);
  }

  /** @type {Map<string, object[]>} */
  const importedByKey = new Map();
  for (const item of importedItems) {
    const key = itemKey(item.type, item.name);
    if (!importedByKey.has(key)) importedByKey.set(key, []);
    importedByKey.get(key).push(item);
  }

  /** @type {object[]} */
  const toCreate = [];
  /** @type {string[]} */
  const toDeleteIds = [];

  const keys = new Set([...existingByKey.keys(), ...importedByKey.keys()]);
  for (const key of keys) {
    const existingIds = existingByKey.get(key) ?? [];
    const imported = importedByKey.get(key) ?? [];
    if (imported.length > existingIds.length) {
      toCreate.push(...imported.slice(existingIds.length));
    } else if (existingIds.length > imported.length) {
      toDeleteIds.push(...existingIds.slice(imported.length));
    }
  }

  return { toCreate, toUpdate: [], toDeleteIds };
}

/**
 * Skill items are matched on (system.type, name). Matches are always
 * updated (rating/specialization reflect Chummer's current values), missing
 * skills are created. Active skills that exist but are absent from the
 * import are left alone (the canonical skill list is exhaustive, so
 * "absent" only happens for skills that were never included in the
 * comparison, e.g. a partial re-import); knowledge skills absent from the
 * import are deleted, since the knowledge skill list only ever contains
 * skills the character actually took.
 *
 * @param {EmbeddedItemLike[]} existingItems
 * @param {Array<{ name: string, type: string, system: object }>} importedSkillItems
 * @returns {ItemSyncPlan}
 */
export function planSkillSync(existingItems, importedSkillItems) {
  const existingSkills = existingItems.filter((i) => i.type === 'Skill');

  /** @type {Map<string, EmbeddedItemLike>} */
  const existingByKey = new Map();
  for (const item of existingSkills) {
    existingByKey.set(itemKey(item.system?.type, item.name), item);
  }

  /** @type {Set<string>} */
  const importedKeys = new Set();

  /** @type {object[]} */
  const toCreate = [];
  /** @type {Array<{_id: string, [key: string]: unknown}>} */
  const toUpdate = [];

  for (const skill of importedSkillItems) {
    const key = itemKey(skill.system?.type, skill.name);
    importedKeys.add(key);
    const existing = existingByKey.get(key);
    if (!existing) {
      toCreate.push(skill);
      continue;
    }
    toUpdate.push({
      _id: existing.id,
      'system.rating': skill.system.rating,
      'system.specialization': skill.system.specialization ?? '',
    });
  }

  const toDeleteIds = existingSkills
    .filter(
      (item) =>
        item.system?.type === 'knowledge' &&
        !importedKeys.has(itemKey(item.system?.type, item.name))
    )
    .map((item) => item.id);

  return { toCreate, toUpdate, toDeleteIds };
}
