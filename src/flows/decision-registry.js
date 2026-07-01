import { getGame } from '@utils/index';

/**
 * @template T
 * @param {string} flagKey the key under `flags.sr4` holding the resolved state
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
      if (
        message &&
        !message.flags?.sr4?.[flagKey]?.resolved &&
        message.isAuthor
      ) {
        await message.update({ [`flags.sr4.${flagKey}.resolved`]: true });
      }
    },
  };
}
