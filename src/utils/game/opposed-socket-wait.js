import { getGame } from './game.js';
import { getOpposedRollFallbackTimeoutMs } from './opposed-roll-timeout.js';

/**
 * @template T
 * @param {{
 *   triggerAction: string,
 *   triggerPayload: object,
 *   matchAction: string,
 *   matches: (payload: object) => boolean,
 *   onMatch: (payload: object) => T,
 *   fallback: T,
 * }} options
 * @returns {Promise<T>}
 */
export function awaitOpposedSocketResponse({
  triggerAction,
  triggerPayload,
  matchAction,
  matches,
  onMatch,
  fallback,
}) {
  const socket = getGame().socket;
  if (!socket) return Promise.resolve(fallback);

  const timeoutMs = getOpposedRollFallbackTimeoutMs(
    getGame().settings.get('shadowrun4e', 'flowOpposedRollTimeout')
  );

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      socket.off('system.shadowrun4e', handler);
      resolve(fallback);
    }, timeoutMs);

    const handler = (data) => {
      if (data.action !== matchAction || !matches(data.payload)) return;
      clearTimeout(timeout);
      socket.off('system.shadowrun4e', handler);
      resolve(onMatch(data.payload));
    };

    socket.on('system.shadowrun4e', handler);
    socket.emit('system.shadowrun4e', {
      action: triggerAction,
      payload: triggerPayload,
    });
  });
}
