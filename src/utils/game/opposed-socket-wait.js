import { getGame } from './game.js';
import { getOpposedRollFallbackTimeoutMs } from './opposed-roll-timeout.js';
import {
  emitSystemSocket,
  offSystemSocket,
  onSystemSocket,
} from './system-socket.js';

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
  const timeoutMs = getOpposedRollFallbackTimeoutMs(
    getGame().settings.get('shadowrun4e', 'flowOpposedRollTimeout')
  );

  return new Promise((resolve) => {
    let settled = false;

    /**
     * @param {T} value
     * @returns {void}
     */
    const settle = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      offSystemSocket(handler);
      resolve(value);
    };

    const timeout = setTimeout(() => {
      console.warn(
        `SR4 | no ${matchAction} within ${timeoutMs}ms after ${triggerAction}, using the fallback`
      );
      settle(fallback);
    }, timeoutMs);

    const handler = (data) => {
      if (settled) return;
      if (data.action !== matchAction || !matches(data.payload)) return;
      settle(onMatch(data.payload));
    };

    onSystemSocket(handler);
    emitSystemSocket({ action: triggerAction, payload: triggerPayload }).catch(
      (error) => {
        console.error(`SR4 | failed to emit ${triggerAction}`, error);
        settle(fallback);
      }
    );
  });
}
