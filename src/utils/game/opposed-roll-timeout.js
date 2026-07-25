import { SR4 } from '@config';

/**
 * @param {number} timeoutSeconds
 * @returns {number}
 */
export function getOpposedRollFallbackTimeoutMs(timeoutSeconds) {
  return (
    (timeoutSeconds + SR4.workflow.opposedRollFallbackBufferSeconds) * 1000
  );
}
