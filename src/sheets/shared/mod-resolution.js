/**
 * @param {any[]} modPool
 * @param {string[]} installedModIds
 * @param {Set<string>} [allClaimedIds]
 * @returns {{ installedMods: { id: string, name: string, system: any }[], availableMods: { id: string, name: string, system: any }[] }}
 */
export function resolveModsAndAvailability(
  modPool,
  installedModIds,
  allClaimedIds
) {
  const modById = new Map(modPool.map((m) => [m.id, m]));
  const claimed = allClaimedIds ?? new Set(installedModIds ?? []);

  const installedMods = (installedModIds ?? [])
    .map((id) => modById.get(id))
    .filter(Boolean);

  const availableMods = modPool.filter((m) => !claimed.has(m.id));

  return { installedMods, availableMods };
}

/**
 * @param {any[]} items
 * @param {string} type
 */
export function buildModPoolFromItems(items, type) {
  return items
    .filter((i) => i.type === type)
    .map((i) => ({ id: i._id, name: i.name, system: i.system }));
}

/**
 * @param {any} actorItemsCollection
 * @param {string} type
 */
export function buildModPoolFromCollection(actorItemsCollection, type) {
  return actorItemsCollection
    .filter((i) => i.type === type)
    .map((i) => ({ id: i.id, name: i.name, system: i.system }));
}
