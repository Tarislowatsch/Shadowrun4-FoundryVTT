const MIN_RADIUS = 1;
const MIN_REMAINING_DICE = 1;

/**
 * Street Magic p. 160: base radius is the Force in meters, each withheld die moves it by 1 m.
 * @param {number} force
 * @param {number} adjust
 * @returns {number}
 */
export function areaRadius(force, adjust) {
  return force + adjust;
}

/**
 * @param {number} adjust
 * @returns {number}
 */
export function radiusAdjustCost(adjust) {
  return Math.abs(adjust);
}

/**
 * @param {number} adjust
 * @param {number} force
 * @param {number} pool
 * @returns {number}
 */
export function clampRadiusAdjust(adjust, force, pool) {
  const whole = Math.trunc(adjust) || 0;
  const maxCost = Math.max(pool - MIN_REMAINING_DICE, 0);
  const minAdjust = Math.max(MIN_RADIUS - force, 0 - maxCost);
  return Math.min(Math.max(whole, minAdjust), maxCost);
}
