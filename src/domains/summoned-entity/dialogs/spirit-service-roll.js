import { rollForcedSkill } from '@utils/dialog';
import { offerEdgeRetry } from '@utils/rolls/roll-edge-decision.js';

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
  const hits = await offerEdgeRetry(actor, rollResult);
  const resistHits = await resolveResistHits(rollResult, hits);
  if (resistHits === null || resistHits === undefined) return null;
  const netHits = rollResult.isGlitch ? 0 : Math.max(0, hits - resistHits);
  return { rollResult, hits, resistHits, netHits };
}
