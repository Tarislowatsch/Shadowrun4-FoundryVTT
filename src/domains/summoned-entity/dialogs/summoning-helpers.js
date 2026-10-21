import { SR4 } from '@config';
import { getGame } from '@utils/game';
import { clamp, resistanceValueFromHits } from '@utils/math.js';

export const SPIRIT_AFFINITY_CATEGORIES = [
  'COMBAT',
  'DETECTION',
  'HEALTH',
  'ILLUSION',
  'MANIPULATION',
];

/**
 * @param {Record<string, string>} affinities
 * @returns {string[]}
 */
export function getAvailableAffinities(affinities) {
  return [
    ...new Set(
      SPIRIT_AFFINITY_CATEGORIES.map((key) => affinities?.[key]).filter(
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
 * @param {number} force
 * @param {number} spiritHits
 * @param {number} [modifier]
 * @returns {number}
 */
export function calculateSummoningDrain(force, spiritHits, modifier = 0) {
  if (getGame().settings.get(SR4.namespace, 'summoningDrain')) {
    return Math.ceil(force / 2) + spiritHits + modifier;
  }
  return resistanceValueFromHits(spiritHits, 2) + modifier;
}
