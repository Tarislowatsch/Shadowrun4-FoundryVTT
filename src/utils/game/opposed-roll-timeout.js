import { SR4 } from '@config';

/**
 * @param {number} timeoutSeconds
 * @param {number} [edgeTimeoutSeconds]
 * @returns {number}
 */
export function getOpposedRollFallbackTimeoutMs(
  timeoutSeconds,
  edgeTimeoutSeconds = 0
) {
  return (
    (timeoutSeconds +
      edgeTimeoutSeconds +
      SR4.workflow.opposedRollFallbackBufferSeconds) *
    1000
  );
}
