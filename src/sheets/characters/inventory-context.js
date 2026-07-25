/**
 * @param {object[]} items
 * @param {{ technomancer?: boolean }} [options]
 */
export function buildInventoryContext(items, { technomancer = false } = {}) {
  return {
    items: items.filter((i) => i.type === 'Item'),
    positiveQualities: items.filter(
      (i) => i.type === 'Quality' && i.system.category !== 'Negative'
    ),
    negativeQualities: items.filter(
      (i) => i.type === 'Quality' && i.system.category === 'Negative'
    ),
    actions: items.filter((i) => i.type === 'Action'),
    foci: items.filter((i) => i.type === 'Focus' || i.type === 'Fetish'),
    commlinks: items.filter((i) => i.type === 'Commlink'),
    complexForms: items
      .filter((i) => i.type === 'Program' && i.system.complexform)
      .sort((a, b) => a.name.localeCompare(b.name)),
    programs: items.filter(
      (i) => i.type === 'Program' && !(technomancer && i.system.complexform)
    ),
    metatypeItem: items.find((i) => i.type === 'Metatype') ?? null,
  };
}
