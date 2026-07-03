/**
 * @typedef {object} EdgeDecisionEntry
 * @property {{ successes: number, rolledDice: number, isGlitch: boolean, isCriticalGlitch?: boolean }} rollResult
 * @property {(finalSuccesses: number) => void} resolve
 * @property {ReturnType<typeof setTimeout>} timeoutId
 */

/** @type {Map<string, EdgeDecisionEntry>} */
const registry = new Map();

/**
 * @param {string} messageId
 * @returns {EdgeDecisionEntry | undefined}
 */
export function getEdgeDecisionEntry(messageId) {
  return registry.get(messageId);
}

/**
 * @param {{ messageId: string | null, actor: import('@documents/index').SR4Actor, rollResult: { successes: number, rolledDice: number, isGlitch: boolean, isCriticalGlitch?: boolean } }} options
 * @returns {Promise<number>}
 */
export async function awaitEdgeDecision({ messageId, actor, rollResult }) {
  if (!messageId || actor.getAttribute('CURRENTEDGE') <= 0) {
    return rollResult.successes;
  }

  const message = game.messages?.get(messageId);
  if (!message) return rollResult.successes;

  /** @type {(value: number) => void} */
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });

  const timeoutSeconds =
    game.settings.get('shadowrun4e', 'flowEdgeTimeout') ?? 20;
  const timeoutId = setTimeout(() => {
    resolveEdgeDecision(messageId);
  }, timeoutSeconds * 1000);

  registry.set(messageId, { rollResult, resolve, timeoutId });

  await message.update({
    'flags.sr4.edgeDecision': { pending: true, resolved: false },
  });

  return promise;
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {Record<string, unknown> & { successes: number, isGlitch: boolean, rolledDice: number, edgeUsed?: boolean, messageId: string | null } | null | undefined} result
 * @returns {Promise<number | null>}
 */
export async function resolveFinalSuccesses(actor, result) {
  if (!result || result.isGlitch) return null;
  return resolveEdgeForRoll(
    actor,
    /** @type {{ successes: number, rolledDice: number, isGlitch: boolean, edgeUsed: boolean, messageId: string | null }} */ (
      result
    ),
    Infinity
  );
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {Record<string, unknown> & { successes: number, isGlitch: boolean, rolledDice: number, edgeUsed?: boolean, messageId: string | null } | null | undefined} result
 * @param {(finalSuccesses: number) => void} onSuccess
 * @returns {Promise<void>}
 */
export async function resolveFinalSuccessesAndEmit(actor, result, onSuccess) {
  const finalSuccesses = await resolveFinalSuccesses(actor, result);
  if (finalSuccesses === null) return;
  if (finalSuccesses > 0) onSuccess(finalSuccesses);
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {{ successes: number, rolledDice: number, isGlitch: boolean, edgeUsed: boolean, messageId: string | null }} roll
 * @param {number} threshold
 * @returns {Promise<number>}
 */
export async function resolveEdgeForRoll(actor, roll, threshold) {
  const { successes, rolledDice, isGlitch, edgeUsed, messageId } = roll;
  if (edgeUsed || successes >= threshold) return successes;
  return awaitEdgeDecision({
    messageId,
    actor,
    rollResult: { successes, rolledDice, isGlitch },
  });
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {{successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null}} rollResult
 * @param {number} [threshold]
 * @returns {Promise<number>}
 */
export async function offerEdgeRetry(actor, rollResult, threshold = 0) {
  if (rollResult.edgeUsed || rollResult.isGlitch) return rollResult.successes;
  return resolveEdgeForRoll(
    actor,
    {
      successes: rollResult.successes,
      rolledDice: rollResult.rolledDice,
      isGlitch: rollResult.isGlitch,
      edgeUsed: rollResult.edgeUsed,
      messageId: rollResult.messageId,
    },
    threshold
  );
}

/**
 * @param {string} messageId
 * @param {number} [finalSuccesses]
 * @returns {Promise<void>}
 */
export async function resolveEdgeDecision(messageId, finalSuccesses) {
  const entry = registry.get(messageId);
  if (entry) {
    clearTimeout(entry.timeoutId);
    entry.resolve(finalSuccesses ?? entry.rollResult.successes);
    registry.delete(messageId);
  }
  const message = game.messages?.get(messageId);
  if (
    message &&
    !message.flags?.sr4?.edgeDecision?.resolved &&
    message.isAuthor
  ) {
    await message.update({ 'flags.sr4.edgeDecision.resolved': true });
  }
}
