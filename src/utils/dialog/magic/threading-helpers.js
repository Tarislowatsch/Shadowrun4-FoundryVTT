import { clamp, resistanceValueFromHits } from '@utils/math.js';

/**
 * @param {number} rating
 * @param {number} cap
 * @returns {number}
 */
export function clampRating(rating, cap) {
  return clamp(rating, 0, cap);
}

/**
 * @param {number} hits
 * @returns {number}
 */
export function calculateFadingValue(hits) {
  return resistanceValueFromHits(hits);
}

/**
 * @param {number} resonance
 * @returns {number}
 */
export function calculateThreadingCap(resonance) {
  return 2 * resonance;
}
