import { localize } from '@utils/dialog';
import { resolveDrain, calculateSummonedEntityDrainPool } from './drain.js';
import { calculateSummoningDrain } from './summoning-helpers.js';
import { getEffectiveDrainModifier } from '@utils/scene/scene-modifiers.js';

/**
 * Shared drain/fading resolution for summoning, binding and dismissal flows.
 * @param {import('@documents/index').SR4Actor} actor
 * @param {number} force
 * @param {number} hits
 * @param {'spirit' | 'sprite'} entityType
 * @param {{ spiritLabelKey: string, spriteLabelKey: string }} labelKeys
 * @returns {Promise<void>}
 */
export async function resolveSpiritDrain(
  actor,
  force,
  hits,
  entityType,
  { spiritLabelKey, spriteLabelKey }
) {
  const isSprite = entityType === 'sprite';
  const drainValue = calculateSummoningDrain(
    hits,
    isSprite ? 0 : getEffectiveDrainModifier(actor)
  );

  const isPhysical =
    force >
    (isSprite ? actor.getAttribute('RESONANCE') : actor.getSpellpower());

  await resolveDrain(actor, {
    label: localize(isSprite ? spriteLabelKey : spiritLabelKey),
    force,
    drainPool: calculateSummonedEntityDrainPool(actor, entityType),
    drainValue,
    isPhysical,
  });
}
