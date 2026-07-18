import {
  createDialogParameters,
  createRollDialog,
  dialogActions,
  localize,
  renderTemplate,
} from '../dialogutility';
import { resolveAndEmitSpellResist } from './resist-actions.js';

const OPPOSED_RESIST_TEMPLATE =
  'systems/shadowrun4e/templates/magic/opposed-spell-resist.hbs';

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {string} spellName
 * @param {number} castingHits
 * @param {number} force
 * @param {string} resistAttribute
 * @param {string} casterUuid
 * @returns {Promise<void>}
 */
export async function openOpposedSpellResistDialog(
  defender,
  spellName,
  castingHits,
  force,
  resistAttribute,
  casterUuid
) {
  const baseResist = defender.getAttribute(resistAttribute) ?? 0;
  const counterspelling =
    defender.getSkill('counterspelling')?.system?.rating ?? 0;
  const resistPool = baseResist + counterspelling;
  const resistAttrLabel = localize(`sr4.stats.${resistAttribute}`);
  const params = createDialogParameters(defender, resistPool);

  const content = await renderTemplate(OPPOSED_RESIST_TEMPLATE, {
    ...params,
    spellName,
    castingHits,
    force,
    baseResist,
    resistAttrLabel,
    counterspelling,
  });

  const result = await createRollDialog({
    title: `${localize('sr4.spell.opposedResist')} — ${spellName}`,
    content,
    dice: resistPool,
    onRoll: (dialog) =>
      dialogActions(dialog, defender, resistAttribute, resistPool),
    autoRoll: true,
  });

  await resolveAndEmitSpellResist({
    defender,
    result,
    rolledDice: resistPool,
    castingHits,
    socketAction: 'opposedSpellResisted',
    casterUuid,
  });
}
