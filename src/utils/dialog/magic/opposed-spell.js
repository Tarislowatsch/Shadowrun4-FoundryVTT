import {
  createDialogParameters,
  createRollDialog,
  dialogActions,
  localize,
  renderTemplate,
} from '../dialogutility';
import { awaitEdgeDecision } from '@utils/rolls/roll-edge-decision.js';
import { getGame } from '@utils/game/game.js';

const OPPOSED_RESIST_TEMPLATE =
  'systems/shadowrun4e/templates/magic/opposed-spell-resist.hbs';

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {string} spellName
 * @param {number} castingHits
 * @param {number} force
 * @param {string} resistAttribute
 * @param {string} casterId
 * @returns {Promise<void>}
 */
export async function openOpposedSpellResistDialog(
  defender,
  spellName,
  castingHits,
  force,
  resistAttribute,
  casterId
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
  });

  let resistHits = result?.successes ?? null;
  if (result && !result.edgeUsed && result.successes < castingHits) {
    resistHits = await awaitEdgeDecision({
      messageId: result.messageId,
      actor: defender,
      rollResult: {
        successes: result.successes,
        rolledDice: resistPool,
        isGlitch: result.isGlitch,
      },
    });
  }

  getGame().socket?.emit('system.shadowrun4e', {
    action: 'opposedSpellResisted',
    payload: {
      casterId,
      defenderId: defender.id,
      resistHits,
    },
  });
}
