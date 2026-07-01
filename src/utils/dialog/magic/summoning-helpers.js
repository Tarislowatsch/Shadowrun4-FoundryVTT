import { clamp, resistanceValueFromHits } from '@utils/math.js';

export const BINDING_CATEGORIES = [
  'COMBAT',
  'DETECTION',
  'HEALTH',
  'ILLUSION',
  'MANIPULATION',
];

/**
 * @param {Record<string, string>} bindings
 * @returns {string[]}
 */
export function getAvailableBindings(bindings) {
  return [
    ...new Set(
      BINDING_CATEGORIES.map((key) => bindings?.[key]).filter(
        (v) => v && v.trim().length > 0
      )
    ),
  ];
}

/**
 * @param {number} rawForce
 * @param {number} maxForce
 * @returns {number}
 */
export function clampForce(rawForce, maxForce) {
  return clamp(rawForce, 1, maxForce);
}

/**
 * @param {number} spiritHits
 * @returns {number}
 */
export function calculateSummoningDrain(spiritHits) {
  return resistanceValueFromHits(spiritHits, 2);
}
