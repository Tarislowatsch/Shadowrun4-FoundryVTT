import { SR4 } from '../../config.js';

/**
 * @param {number} timeoutSeconds
 * @returns {number}
 */
export function getOpposedRollFallbackTimeoutMs(timeoutSeconds) {
  return (
    (timeoutSeconds + SR4.workflow.opposedRollFallbackBufferSeconds) * 1000
  );
}
