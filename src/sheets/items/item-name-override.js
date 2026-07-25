/**
 * @param {string} value
 * @returns {{ name: string, 'system.hasCustomName': true } | null}
 */
export function buildCustomNamePayload(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return null;
  return { name: trimmed, 'system.hasCustomName': true };
}

/**
 * @param {{ name: string, system?: { nameEn?: string } }} item
 * @returns {{ payload: { name: string, 'system.hasCustomName': false }, restoredCanonicalName: boolean }}
 */
export function buildResetNamePayload(item) {
  const nameEn = item.system?.nameEn;
  return {
    payload: { name: nameEn || item.name, 'system.hasCustomName': false },
    restoredCanonicalName: Boolean(nameEn),
  };
}
