import { TEMPLATES, renderTemplate } from '@utils/templates';
import {
  createRollDialog,
  localize,
  createDialogParameters,
  dialogActions,
} from '@utils/dialog';
import {
  resolveAndEmitSpellResist,
  spellResistPool,
  localizeResistAttribute,
} from './resist-actions.js';

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
  const resistPool = spellResistPool(defender, resistAttribute);
  const resistAttrLabel = localizeResistAttribute(resistAttribute);
  const params = createDialogParameters(defender, resistPool);

  const content = await renderTemplate(TEMPLATES.magic.spellResist, {
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
      dialogActions(dialog, defender, resistAttrLabel, resistPool),
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
