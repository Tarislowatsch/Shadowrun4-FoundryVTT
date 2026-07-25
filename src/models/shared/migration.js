/**
 * @param {object|null|undefined} source
 * @param {string} key
 * @param {Record<string, string>} map
 */
export function migrateLegacyValue(source, key, map) {
  if (!source) return;
  if (typeof source[key] === 'string' && source[key] in map) {
    source[key] = map[source[key]];
  }
}
