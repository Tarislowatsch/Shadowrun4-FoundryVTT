import {
  createDialogParameters,
  createRollDialog,
  dialogActions,
  getSkillDicePool,
  localize,
  renderTemplate,
  standardTemplatePath,
} from '../dialogutility';
import { emitDefenseTrigger } from '@flows/defense-flow.js';
import { awaitEdgeDecision } from '@utils/rolls/roll-edge-decision.js';

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @param {SR4Weapon} [weapon]
 * @returns {Promise<void>}
 */
export async function handleSkillRoll(actor, skillName, weapon) {
  const dice = getSkillDicePool(actor, skillName);
  if (dice === undefined) return;
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
  const params = createDialogParameters(actor, dice, weapon);
  const skill = actor.getSkill(skillName);
  const content = await renderTemplate(standardTemplatePath(), {
    ...params,
    skillName,
    weapon,
  });
  const result = await createRollDialog({
    title: `${localize('sr4.roll.rolling')} ${localize(skill.system.label)} ${skill.system.specialization ?? ''}`,
    content,
    dice: dice,
    onRoll: (dialog) =>
      dialogActions(dialog, actor, skillName, dice ?? 0, weapon, {
        edgeAvailableOverride: weapon ? false : undefined,
      }),
  });

  if (!weapon || !result || result.isGlitch) return;

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
