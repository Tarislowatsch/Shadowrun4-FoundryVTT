import { getSkillDicePool, rollSkillDialog } from '../dialogutility';
import {
  emitDefenseTrigger,
  emitDefenseTriggerForTarget,
} from '@flows/defense-flow.js';
import { resolveFinalSuccessesAndEmit } from '@utils/rolls/roll-edge-decision.js';
import { openDicePoolSplitDialog } from '../dice-pool-split.js';
import { getValidTargetActors } from '@utils/game/game.js';

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @param {SR4Weapon} [weapon]
 * @returns {Promise<void>}
 */
export async function handleSkillRoll(actor, skillName, weapon) {
  const dice = getSkillDicePool(actor, skillName);
  if (dice === undefined) return;

  if (weapon) {
    const targets = getValidTargetActors();
    if (targets.length > 1) {
      const splitTargets = targets.map((t) => ({
        id: /** @type {any} */ (t).id ?? '',
        name: t.name,
      }));
      const allocations = await openDicePoolSplitDialog(
        dice,
        splitTargets,
        weapon.name
      );
      if (!allocations) return;
      for (const { targetId, allocatedDice } of allocations) {
        const t = targets.find((a) => /** @type {any} */ (a).id === targetId);
        await _rollSkillForTarget(
          actor,
          skillName,
          allocatedDice,
          weapon,
          targetId,
          t?.name ?? ''
        );
      }
      return;
    }
  }

  await openSkillDialog(actor, skillName, dice, weapon);
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @param {number | undefined} dice
 * @param {SR4Weapon} [weapon]
 * @returns {Promise<void>}
 */
export async function openSkillDialog(actor, skillName, dice, weapon) {
  const result = await rollSkillDialog(actor, skillName, dice, {
    weapon,
    edgeAvailableOverride: weapon ? false : undefined,
  });

  if (!weapon) return;
  await resolveFinalSuccessesAndEmit(actor, result, (finalSuccesses) =>
    emitDefenseTrigger(actor, weapon, finalSuccesses)
  );
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @param {number} dice
 * @param {SR4Weapon} weapon
 * @param {string} targetId
 * @param {string} targetName
 * @returns {Promise<void>}
 */
async function _rollSkillForTarget(
  actor,
  skillName,
  dice,
  weapon,
  targetId,
  targetName
) {
  const result = await rollSkillDialog(actor, skillName, dice, {
    weapon,
    titleSuffix: ` → ${targetName}`,
    edgeAvailableOverride: false,
  });
  await resolveFinalSuccessesAndEmit(actor, result, (finalSuccesses) =>
    emitDefenseTriggerForTarget(actor, weapon, finalSuccesses, targetId)
  );
}
