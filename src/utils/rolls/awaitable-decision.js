/**
 * @template T
 * @typedef {object} AwaitableDecisionEntry
 * @property {(value: T) => void} resolve
 * @property {ReturnType<typeof setTimeout>} timeoutId
 * @property {() => T} getDefault
 */

/**
 * @template T
 * @template {Record<string, unknown>} E
 * @typedef {object} AwaitableDecisionApi
 * @property {(messageId: string) => (AwaitableDecisionEntry<T> & E) | undefined} get
 * @property {(opts: { messageId: string, timeoutMs: number, getDefault: () => T, onTimeout?: () => void, extra?: E }) => Promise<T>} park
 * @property {(messageId: string, value?: T) => (AwaitableDecisionEntry<T> & E) | undefined} settle
 */

/**
 * @template T
 * @template {Record<string, unknown>} [E={}]
 * @returns {AwaitableDecisionApi<T, E>}
 */
export function createAwaitableDecision() {
  /** @type {Map<string, AwaitableDecisionEntry<T> & E>} */
  const registry = new Map();

  /**
   * @param {string} messageId
   * @returns {(AwaitableDecisionEntry<T> & E) | undefined}
   */
  function get(messageId) {
    return registry.get(messageId);
  }

  /**
   * @param {string} messageId
   * @param {T} [value]
   * @returns {(AwaitableDecisionEntry<T> & E) | undefined}
   */
  function settle(messageId, value) {
    const entry = registry.get(messageId);
    if (!entry) return undefined;
    clearTimeout(entry.timeoutId);
    entry.resolve(value ?? entry.getDefault());
    registry.delete(messageId);
    return entry;
  }

  /**
   * @param {{ messageId: string, timeoutMs: number, getDefault: () => T, onTimeout?: () => void, extra?: E }} opts
   * @returns {Promise<T>}
   */
  function park({ messageId, timeoutMs, getDefault, onTimeout, extra }) {
    settle(messageId);
    /** @type {(value: T) => void} */
    let resolve;
    /** @type {Promise<T>} */
    const promise = new Promise((r) => {
      resolve = r;
    });
    const timeoutId = setTimeout(() => {
      settle(messageId);
      onTimeout?.();
    }, timeoutMs);
    registry.set(
      messageId,
      /** @type {AwaitableDecisionEntry<T> & E} */ ({
        resolve,
        timeoutId,
        getDefault,
        ...extra,
      })
    );
    return promise;
  }

  return { get, park, settle };
}
