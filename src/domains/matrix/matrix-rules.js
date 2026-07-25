/**
 * @param {number} value
 * @param {number} max
 * @param {number} amount
 * @returns {{ value: number, crashed: boolean }}
 */
export function applyMatrixDamage(value, max, amount) {
  const next = Math.min((value ?? 0) + Math.max(amount, 0), max);
  return { value: next, crashed: next >= max };
}

/**
 * @param {string} jammedBy
 * @param {{ changedRealm?: string, changedSimMode?: string, clearingJam?: boolean }} [change]
 * @returns {boolean}
 */
export function isJammedMatrixEscape(
  jammedBy,
  { changedRealm, changedSimMode, clearingJam } = {}
) {
  if (!jammedBy || clearingJam) return false;
  if (changedRealm && changedRealm !== 'matrix') return true;
  return changedSimMode !== undefined;
}

/**
 * @param {string} programCategory
 * @param {number} dv
 * @param {number} resistHits
 * @param {{ simMode: 'cold'|'hot', inVR: boolean, stunValue: number, stunMax: number }} state
 * @returns {{ amount: number, isPhysical: boolean }}
 */
export function computeBiofeedbackDamage(
  programCategory,
  dv,
  resistHits,
  { simMode, inVR, stunValue, stunMax }
) {
  if (!inVR) return { amount: 0, isPhysical: false };

  const unresisted = Math.max(dv - (resistHits ?? 0), 0);
  const isBlackHammer = programCategory === 'blackHammer';
  const isPhysical = isBlackHammer && simMode === 'hot' && inVR;

  if (isBlackHammer) {
    return { amount: unresisted, isPhysical };
  }

  const room = Math.max((stunMax ?? 0) - (stunValue ?? 0), 0);
  return { amount: Math.min(unresisted, room), isPhysical: false };
}
