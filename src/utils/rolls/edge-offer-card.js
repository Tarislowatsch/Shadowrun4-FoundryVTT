import { getGame } from '../game/game.js';

/**
 * @typedef {object} EdgeOfferEntry
 * @property {import('@documents/index').SR4Actor} actor
 * @property {(newSuccesses: number) => Promise<void>} onReroll
 * @property {ReturnType<typeof setTimeout>} timeoutId
 */

/** @type {Map<string, EdgeOfferEntry>} */
const registry = new Map();

/**
 * @param {string} messageId
 * @returns {EdgeOfferEntry | undefined}
 */
export function getEdgeOfferEntry(messageId) {
  return registry.get(messageId);
}

/**
 * Posts a non-blocking Edge offer chat card. The flow continues immediately
 * with the original result; if the player clicks Edge on the card later, the
 * continuation (`onReroll`) re-triggers the remaining flow.
 *
 * @param {{ actor: import('@documents/index').SR4Actor, rollResult: { successes: number, rolledDice: number, isGlitch: boolean, isCriticalGlitch?: boolean }, onReroll: (newSuccesses: number) => Promise<void> }} options
 * @returns {Promise<string>} the ChatMessage id
 */
export async function postEdgeOffer({ actor, rollResult, onReroll }) {
  const i18n = getGame().i18n;
  const content = `<div class="edge-offer-card"><p>${i18n.format(
    'sr4.roll.edge.chatPrompt',
    {
      name: actor.name,
      successes: rollResult.successes,
      dice: rollResult.rolledDice,
    }
  )}</p></div>`;

  const message = await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: {
      sr4: {
        edgeOffer: {
          actorId: actor.id,
          successes: rollResult.successes,
          rolledDice: rollResult.rolledDice,
          isGlitch: rollResult.isGlitch,
          isCriticalGlitch: rollResult.isCriticalGlitch ?? false,
          resolved: false,
        },
      },
    },
  });

  const timeoutSeconds =
    game.settings.get('shadowrun4e', 'edgeCardTimeout') ?? 120;
  const timeoutId = setTimeout(async () => {
    await resolveEdgeOffer(message.id);
    const expired = game.messages?.get(message.id);
    if (expired?.isAuthor) {
      const expiredText = getGame().i18n.localize('sr4.roll.edge.expired');
      await expired.update({
        content: `<div class="edge-offer-card"><p><em>${expiredText}</em></p></div>`,
      });
    }
  }, timeoutSeconds * 1000);

  registry.set(message.id, { actor, onReroll, timeoutId });

  return message.id;
}

/**
 * Resolves an Edge offer: removes the registry entry, clears the timeout,
 * and sets the `resolved` flag on the ChatMessage so that re-renders no
 * longer show buttons.
 *
 * @param {string} messageId
 * @returns {Promise<void>}
 */
export async function resolveEdgeOffer(messageId) {
  const entry = registry.get(messageId);
  if (entry) {
    clearTimeout(entry.timeoutId);
    registry.delete(messageId);
  }
  const message = game.messages?.get(messageId);
  if (message && !message.flags?.sr4?.edgeOffer?.resolved && message.isAuthor) {
    await message.setFlag('sr4', 'edgeOffer.resolved', true);
  }
}
