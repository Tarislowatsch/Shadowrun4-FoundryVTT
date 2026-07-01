/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * @param {number} hits
 * @param {number} [multiplier]
 * @param {number} [minimum]
 * @returns {number}
 */
export function resistanceValueFromHits(hits, multiplier = 1, minimum = 2) {
  return Math.max(minimum, hits * multiplier);
}
