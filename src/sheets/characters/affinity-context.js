/**
 * @param {Record<string, string>} affinities
 * @param {string} i18nPrefix
 * @param {'spirit' | 'sprite'} entityType
 * @param {string[]} [categories]
 */
export async function buildAffinityCategories(
  affinities,
  i18nPrefix,
  entityType,
  categories = ['COMBAT', 'DETECTION', 'HEALTH', 'ILLUSION', 'MANIPULATION']
) {
  const settingKey =
    entityType === 'sprite' ? 'spriteCompendium' : 'spiritCompendium';
  const packId = game.settings.get('shadowrun4e', settingKey) ?? '';
  let templateNames = null;

  if (packId) {
    const pack = game.packs.get(packId);
    if (pack) {
      const index = await pack.getIndex();
      const names = [...new Set(index.map((e) => e.name).filter(Boolean))];
      if (names.length > 0) templateNames = names;
    }
  }

  return categories.map((key) => ({
    key,
    label: game.i18n.localize(`${i18nPrefix}.${key}`),
    value: affinities?.[key] ?? '',
    options: templateNames,
  }));
}
