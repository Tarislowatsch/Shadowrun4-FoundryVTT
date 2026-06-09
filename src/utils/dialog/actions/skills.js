import {
  createDialogParameters,
  createRollDialog,
  dialogActions,
  getSkillDicePool,
  localize,
  renderTemplate,
  standardTemplatePath,
} from '../dialogutility';

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
  await createRollDialog({
    title: `${localize('sr4.roll.rolling')} ${localize(skill.system.label)} ${skill.system.specialization ?? ''}`,
    content,
    dice: dice,
    onRoll: (dialog) =>
      dialogActions(dialog, actor, skillName, dice ?? 0, weapon),
  });
}
