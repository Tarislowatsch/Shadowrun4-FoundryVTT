import { SR4ActiveEffect } from '@effects/index';
import { getGame } from '@utils/game/game.js';
import { SR4 } from '@config';

const GEL_BODY_PENALTY = 2;

export const KNOCKED_DOWN_TEMPLATE = 'knockedDown';
export const KNOCKED_DOWN_STATUS = 'sr4-knocked-down';

/** @type {ReadonlySet<string>} */
export const KNOCKDOWN_CONTEXTS = new Set(['combat', 'spell']);

export const KnockdownMode = Object.freeze({
  OFF: 'off',
  ALWAYS: 'always',
  GEL_ONLY: 'gelOnly',
});

/**
 * @typedef {object} SR4AttackContext
 * @property {boolean} [gelRounds]
 */

/**
 * @typedef {object} SR4KnockdownResult
 * @property {boolean} knocked
 * @property {number} threshold
 * @property {'body'|'auto'|null} reason
 */

/**
 * @returns {{ mode: string, autoThreshold: number, bodyModifier: number }}
 */
export function readKnockdownSettings() {
  const settings = getGame().settings;
  return {
    mode: settings.get(SR4.namespace, 'knockdownRule'),
    autoThreshold: settings.get(SR4.namespace, 'knockdownAutoThreshold'),
    bodyModifier: settings.get(SR4.namespace, 'knockdownBodyModifier'),
  };
}

/**
 * @param {{ damage: number, body: number, gelRounds?: boolean, mode: string,
 *   autoThreshold: number, bodyModifier: number }} params
 * @returns {SR4KnockdownResult}
 */
export function computeKnockdown({
  damage,
  body,
  gelRounds = false,
  mode,
  autoThreshold,
  bodyModifier,
}) {
  if (mode !== KnockdownMode.ALWAYS && mode !== KnockdownMode.GEL_ONLY)
    return { knocked: false, threshold: 0, reason: null };

  const bodyApplies = mode === KnockdownMode.ALWAYS || gelRounds;
  const threshold = bodyApplies
    ? Math.max(body + bodyModifier - (gelRounds ? GEL_BODY_PENALTY : 0), 1)
    : 0;
  if (bodyApplies && damage >= threshold)
    return { knocked: true, threshold, reason: 'body' };
  if (autoThreshold > 0 && damage >= autoThreshold)
    return { knocked: true, threshold: autoThreshold, reason: 'auto' };

  return { knocked: false, threshold, reason: null };
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {boolean}
 */
function isKnockedDown(actor) {
  return !!(/** @type {any} */ (actor).statuses?.has(KNOCKED_DOWN_STATUS));
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {number | null}
 */
function resolveKnockdownBody(actor) {
  const body = /** @type {any} */ (actor).getAttribute?.('BODY');
  if (typeof body !== 'number' || !Number.isFinite(body) || body <= 0)
    return null;
  return body;
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {number} damage
 * @param {SR4AttackContext} [attack]
 * @returns {Promise<SR4KnockdownResult | null>}
 */
export async function applyKnockdown(actor, damage, attack = {}) {
  if (!actor || damage <= 0) return null;
  if (actor.type === 'vehicle') return null;
  if (isKnockedDown(actor)) return null;

  const body = resolveKnockdownBody(actor);
  if (body === null) return null;

  const result = computeKnockdown({
    damage,
    body,
    gelRounds: attack.gelRounds,
    ...readKnockdownSettings(),
  });
  if (!result.knocked) return result;

  await SR4ActiveEffect.fromTemplate(
    KNOCKED_DOWN_TEMPLATE,
    /** @type {any} */ (actor)
  );
  await ChatMessage.create({
    content: getGame().i18n.format(
      result.reason === 'auto'
        ? 'sr4.damage.knockdownAuto'
        : 'sr4.damage.knockdown',
      { name: actor.name, damage, threshold: result.threshold }
    ),
    speaker: ChatMessage.getSpeaker({ actor }),
  });

  return result;
}
