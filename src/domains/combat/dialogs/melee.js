import { TEMPLATES, renderTemplate } from '@utils/templates';
import {
  createRollDialog,
  localize,
  createDialogParameters,
  dialogActions,
  getSkillDicePool,
  splitDiceAcrossTargets,
} from '@utils/dialog';
import { getGame } from '@utils/game/game.js';
import {
  emitDefenseTrigger,
  emitDefenseTriggerForTarget,
} from '../flow/defense-flow.js';
import { resolveFinalSuccessesAndEmit } from '@utils/rolls/roll-edge-decision.js';
import { getValidTargetActors } from '@utils/game/game.js';
import { getEquippedMeleeReach, computeReachModifier } from '../weapons.js';

/** @typedef {import('@models/index').SR4Weapon} SR4Weapon */

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @param {SR4Weapon} weapon
 * @returns {Promise<void>}
 */
export async function openMeleeAttackDialog(actor, skillName, weapon) {
  const dice = getSkillDicePool(actor, skillName);
  if (dice === undefined) return;

  const skill = actor.getSkill(skillName);
  const targets = getValidTargetActors();

  if (targets.length > 1) {
    const allocations = await splitDiceAcrossTargets(
      actor,
      dice,
      targets,
      weapon.name
    );
    if (!allocations) return;
    for (const {
      target,
      targetUuid,
      allocatedDice,
      edgePayment,
    } of allocations) {
      await rollMeleeForTarget(actor, skillName, allocatedDice, weapon, {
        target,
        titleSuffix: ` → ${target?.name ?? ''}`,
        edgePayment,
        emit: (finalSuccesses) =>
          emitDefenseTriggerForTarget(
            actor,
            weapon,
            finalSuccesses,
            targetUuid
          ),
      });
    }
    return;
  }

  const target = [...(getGame().user?.targets ?? [])][0]?.actor;
  await rollMeleeForTarget(actor, skillName, dice, weapon, {
    target,
    titleSuffix: ` ${skill.system.specialization ?? ''}`,
    emit: (finalSuccesses) => emitDefenseTrigger(actor, weapon, finalSuccesses),
  });
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @param {number} dice
 * @param {SR4Weapon} weapon
 * @param {{ target?: import('@documents/index').SR4Actor, titleSuffix: string, edgePayment?: import('@utils/dialog').EdgePayment | null, emit: (finalSuccesses: number) => void | Promise<void> }} options
 * @returns {Promise<void>}
 */
async function rollMeleeForTarget(
  actor,
  skillName,
  dice,
  weapon,
  { target, titleSuffix, edgePayment = null, emit }
) {
  const attackerReach = weapon.system.reach ?? 0;
  const defenderReach = target ? getEquippedMeleeReach(target) : 0;
  const reachModifier = computeReachModifier(attackerReach, defenderReach);
  const totalDice = Math.max(1, dice + reachModifier);

  const params = createDialogParameters(actor, totalDice, weapon, {
    isAttack: true,
    edgePayment,
  });
  const skill = actor.getSkill(skillName);
  const content = await renderTemplate(TEMPLATES.combat.meleeAttackDialog, {
    ...params,
    reachModifier,
  });

  const result = await createRollDialog({
    title: `${localize('sr4.roll.rolling')} ${localize(skill.system.label)}${titleSuffix}`,
    content,
    dice: totalDice,
    onRoll: (dialog) =>
      dialogActions(dialog, actor, skillName, totalDice, weapon, {
        edgeAvailableOverride: false,
        edgePayment,
      }),
  });

  await resolveFinalSuccessesAndEmit(actor, result, emit);
}
