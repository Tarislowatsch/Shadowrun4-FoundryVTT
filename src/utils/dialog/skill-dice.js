import { TEMPLATES, renderTemplate } from '@utils/templates';
import { SR4SkillGroupByName } from '@models/index';
import { localize, createRollDialog } from './roll-dialog-core.js';
import { createDialogParameters, dialogActions } from './pool-math.js';

/** @typedef {import('@models/index').SR4Weapon} SR4Weapon */

/**
 * @param {import('@documents/index').SR4Item} skill
 * @param {string} suffix
 * @returns {string}
 */
function buildSkillRollTitle(skill, suffix = '') {
  return `${localize('sr4.roll.rolling')} ${localize(skill.system.label)}${suffix}`;
}

/**
 * Rolls a skill check for `actor`. The dice pool is assembled automatically via
 * {@link getSkillDicePool} unless `options.dice` overrides it (e.g. target-split
 * allocations or non-standard pools such as Threading).
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @param {{ dice?: number, weapon?: SR4Weapon, titleSuffix?: string, force?: number, edgeAvailableOverride?: boolean, edgePayment?: import('./pool-math.js').EdgePayment | null }} [options]
 * @returns {Promise<(Record<string, unknown> & {successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null}) | undefined>}
 */
export async function rollSkillDialog(
  actor,
  skillName,
  { dice, weapon, titleSuffix, force, edgeAvailableOverride, edgePayment } = {}
) {
  const resolvedDice = dice ?? getSkillDicePool(actor, skillName);
  if (resolvedDice === undefined) return undefined;

  const skill = actor.getSkill(skillName);
  const params = createDialogParameters(actor, resolvedDice, weapon, {
    edgePayment,
  });
  const content = await renderTemplate(TEMPLATES.ui.dialogs.roll, {
    ...params,
    skillName,
    weapon,
    force,
  });
  return createRollDialog({
    title: buildSkillRollTitle(
      skill,
      titleSuffix ?? ` ${skill.system.specialization ?? ''}`
    ),
    content,
    dice: resolvedDice,
    onRoll: (dialog) =>
      dialogActions(dialog, actor, skillName, resolvedDice, weapon, {
        edgeAvailableOverride,
        edgePayment,
      }),
  });
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @param {number} force
 * @returns {Promise<(Record<string, unknown> & {successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null}) | undefined>}
 */
export async function rollForcedSkill(actor, skillName, force) {
  return rollSkillDialog(actor, skillName, {
    titleSuffix: ` (${localize('sr4.spell.force')}: ${force})`,
    force,
  });
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @returns {number | undefined}
 */
export function getSkillDicePool(actor, skillName) {
  const skill = actor.getSkill(skillName);
  if (!skill) return undefined;
  const rating = skill.system.rating > 0 ? skill.system.rating : -1;
  const attribute = skill.system.attribute;
  const attributeValue =
    attribute === 'MAGIC'
      ? actor.getEffectiveMagic()
      : actor.getAttribute(attribute);
  const base = attributeValue + rating;
  const bonus = getSkillModifier(actor, skill);
  return Math.max(base + bonus, 1);
}

/**
 * @param {Record<string, unknown> | undefined} bonuses
 * @param {string | undefined | null} key
 * @returns {number}
 */
function readModifierBonus(bonuses, key) {
  if (!bonuses || !key) return 0;
  return Number(bonuses[key]) || 0;
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {import('@models/index').SR4Skill} skill
 * @returns {number}
 */
function getSkillModifier(actor, skill) {
  const modifiers = /** @type {any} */ (actor).system?.modifiers;
  if (!modifiers) return 0;
  const label = skill.system.label ?? '';
  const match = label.match(/^sr4\.skills\.(?:categorized\.)?(.+)$/);
  const labelKey = match?.[1];
  const group = skill.system.group;
  const groupKey = group ? SR4SkillGroupByName[group] : undefined;
  return (
    readModifierBonus(modifiers.skillBonuses, labelKey) +
    readModifierBonus(modifiers.skillGroupBonuses, groupKey)
  );
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {import('@models/index').SR4Spell} spell
 * @returns {number}
 */
export function getSpellCategoryBonus(actor, spell) {
  const bonuses = /** @type {any} */ (actor).system?.modifiers
    ?.spellCategoryBonuses;
  return readModifierBonus(bonuses, spell?.system?.category);
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {import('@models/index').SR4Spell} spell
 * @returns {number | undefined}
 */
export function getSpellcastingDicePool(actor, spell) {
  const baseDice = getSkillDicePool(actor, 'spellcasting');
  if (baseDice === undefined) return undefined;
  return Math.max(baseDice + getSpellCategoryBonus(actor, spell), 1);
}
