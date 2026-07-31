import { rollForcedSkill } from '@utils/dialog';
import {
  ALWAYS_OFFER_EDGE,
  resolveEdgeForRoll,
} from '@utils/rolls/roll-edge-decision.js';

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @param {number} forceOrRating
 * @param {(rollResult: { successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null }, hits: number) => Promise<number | null>} resolveResistHits - return null to abort (e.g. no valid target)
 * @returns {Promise<{ rollResult: { successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null }, hits: number, resistHits: number, netHits: number } | null>}
 */
export async function resolveSpiritServiceRoll(
  actor,
  skillName,
  forceOrRating,
  resolveResistHits
) {
  const rollResult = await rollForcedSkill(actor, skillName, forceOrRating);
  if (!rollResult) return null;
  const hits = await resolveEdgeForRoll(actor, rollResult, ALWAYS_OFFER_EDGE);
  const resistHits = await resolveResistHits(rollResult, hits);
  if (resistHits === null || resistHits === undefined) return null;
  const netHits = Math.max(0, hits - resistHits);
  return { rollResult, hits, resistHits, netHits };
}
