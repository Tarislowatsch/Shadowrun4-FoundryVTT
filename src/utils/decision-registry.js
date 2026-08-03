import { getGame } from '@utils/index';
import { SYSTEM_ID } from './game/system-id.js';

/**
 * @template T
 * @param {string} flagKey the system flag holding the resolved state
 * @returns {{
 *   get: (messageId: string) => T | undefined,
 *   set: (messageId: string, entry: T) => void,
 *   resolve: (messageId: string) => Promise<void>,
 * }}
 */
export function createDecisionRegistry(flagKey) {
  /** @type {Map<string, T>} */
  const registry = new Map();

  return {
    get: (messageId) => registry.get(messageId),
    set: (messageId, entry) => registry.set(messageId, entry),
    resolve: async (messageId) => {
      registry.delete(messageId);
      const message = getGame().messages?.get(messageId);
      const decision = message?.getFlag(SYSTEM_ID, flagKey);
      if (decision && !decision.resolved && message.isAuthor) {
        await message.setFlag(SYSTEM_ID, flagKey, {
          ...decision,
          resolved: true,
        });
      }
    },
  };
}
