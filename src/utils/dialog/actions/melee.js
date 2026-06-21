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
import { emitDefenseTrigger } from '@flows/defense-flow.js';
import { awaitEdgeDecision } from '@utils/rolls/roll-edge-decision.js';

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
