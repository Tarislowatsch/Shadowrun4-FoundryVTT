import {
  createDialogParameters,
  createRollDialog,
  dialogActions,
  getSkillDicePool,
  localize,
  meleeAttackTemplatePath,
  renderTemplate,
} from '../dialogutility';
import { getGame } from '../../game/game.js';
import {
  emitDefenseTrigger,
  emitDefenseTriggerForTarget,
} from '@flows/defense-flow.js';
import { awaitEdgeDecision } from '@utils/rolls/roll-edge-decision.js';
import { openDicePoolSplitDialog } from '../dice-pool-split.js';
import { getValidTargetActors } from '@utils/game/game.js';

/** @typedef {import('@models/index').SR4Weapon} SR4Weapon */

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {number}
 */
export function getEquippedMeleeReach(actor) {
  let maxReach = 0;
  for (const i of /** @type {any} */ (actor).items ?? []) {
    if (i.type === 'Melee Weapon' && i.system?.equipped === true) {
      maxReach = Math.max(maxReach, i.system.reach ?? 0);
    }
  }
  return maxReach;
}

/**
 * @param {number} attackerReach
 * @param {number} defenderReach
 * @returns {number}
 */
export function computeReachModifier(attackerReach, defenderReach) {
  return attackerReach - defenderReach;
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @param {SR4Weapon} weapon
 * @returns {Promise<void>}
 */
export async function openMeleeAttackDialog(actor, skillName, weapon) {
  const dice = getSkillDicePool(actor, skillName);
  if (dice === undefined) return;

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
      await _rollMeleeForTarget(
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

  const params = createDialogParameters(actor, dice, weapon);
  params.malus -= actor.system.modifiers.attackModifier ?? 0;

  const attackerReach = weapon.system.reach ?? 0;
  const target = [...(getGame().user?.targets ?? [])][0]?.actor;
  const defenderReach = target ? getEquippedMeleeReach(target) : 0;
  const reachModifier = computeReachModifier(attackerReach, defenderReach);

  const skill = actor.getSkill(skillName);
  const totalDice = Math.max(1, dice + reachModifier);

  const content = await renderTemplate(meleeAttackTemplatePath(), {
    ...params,
    reachModifier,
  });

  const result = await createRollDialog({
    title: `${localize('sr4.roll.rolling')} ${localize(skill.system.label)} ${skill.system.specialization ?? ''}`,
    content,
    dice: totalDice,
    onRoll: (dialog) =>
      dialogActions(dialog, actor, skillName, totalDice, weapon, {
        edgeAvailableOverride: false,
      }),
  });

  if (!result || result.isGlitch) return;

  let finalSuccesses = result.successes;
  if (!result.edgeUsed) {
    finalSuccesses = await awaitEdgeDecision({
      messageId: result.messageId,
      actor,
      rollResult: {
        successes: result.successes,
        rolledDice: result.rolledDice,
        isGlitch: result.isGlitch,
      },
    });
  }
  if (finalSuccesses > 0) {
    emitDefenseTrigger(actor, weapon, finalSuccesses);
  }
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
async function _rollMeleeForTarget(
  actor,
  skillName,
  dice,
  weapon,
  targetId,
  targetName
) {
  const target = getGame().actors?.get(targetId);
  const attackerReach = weapon.system.reach ?? 0;
  const defenderReach = target ? getEquippedMeleeReach(target) : 0;
  const reachModifier = computeReachModifier(attackerReach, defenderReach);
  const totalDice = Math.max(1, dice + reachModifier);

  const params = createDialogParameters(actor, totalDice, weapon);
  params.malus -= actor.system.modifiers.attackModifier ?? 0;
  const skill = actor.getSkill(skillName);
  const content = await renderTemplate(meleeAttackTemplatePath(), {
    ...params,
    reachModifier,
  });
  const result = await createRollDialog({
    title: `${localize('sr4.roll.rolling')} ${localize(skill.system.label)} → ${targetName}`,
    content,
    dice: totalDice,
    onRoll: (dialog) =>
      dialogActions(dialog, actor, skillName, totalDice, weapon, {
        edgeAvailableOverride: false,
      }),
  });
  if (!result || result.isGlitch) return;

  let finalSuccesses = result.successes;
  if (!result.edgeUsed) {
    finalSuccesses = await awaitEdgeDecision({
      messageId: result.messageId,
      actor,
      rollResult: {
        successes: result.successes,
        rolledDice: result.rolledDice,
        isGlitch: result.isGlitch,
      },
    });
  }
  if (finalSuccesses > 0) {
    emitDefenseTriggerForTarget(actor, weapon, finalSuccesses, targetId);
  }
}
