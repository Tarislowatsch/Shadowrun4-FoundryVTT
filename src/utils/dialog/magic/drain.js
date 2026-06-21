import { DiceUtility } from '../../rolls';
import {
  createDialogParameters,
  createRollDialog,
  getChecked,
  getInt,
  localize,
  renderTemplate,
  standardTemplatePath,
} from '../dialogutility';

/**
 * @param {HTMLElement} dialog
 * @param {import('@documents/index').SR4Actor} actor
 * @param {number} drainPool - Base drain resistance pool.
 * @returns {Promise<{successes: number, isGlitch: boolean, edgeUsed: boolean, messageId: string | null}>}
 */
async function drainDialogActions(dialog, actor, drainPool) {
  const useEdge = getChecked(dialog, 'edge');
  const bonus = getInt(dialog, 'bonus');
  const malus = getInt(dialog, 'malus');

  const edgeBonus = useEdge ? actor.getAttribute('EDGE') : 0;
  const finalPool = drainPool + bonus - malus + edgeBonus;

  if (useEdge) actor.useEdge();

  const result = await DiceUtility.rollAndShow({
    numDice: finalPool,
    explode: useEdge,
    edgeAvailable: false,
    actor,
    skillName: localize('sr4.roll.drainResistanceTest'),
    extended: false,
  });
  return { ...result, edgeUsed: useEdge };
}

/**
 *
 * @param {import('@documents/index').SR4Actor} actor
 * @param {import('@models/index').SR4Spell} spell
 * @param {number} force
 * @param {number} drainPool
 * @param {number} drainValue
 * @returns {Promise<{successes: number, isGlitch: boolean, edgeUsed: boolean, messageId: string | null} | null>}
 */
export async function openDrainDialog(
  actor,
  spell,
  force,
  drainPool,
  drainValue
) {
  const params = createDialogParameters(actor, drainPool, undefined, {
    ignoreModifiers: true,
  });
  const content = await renderTemplate(standardTemplatePath(), {
    spell,
    force,
    drainValue,
    ...params,
    skillName: localize('sr4.roll.drainResistanceTest'),
  });
  return createRollDialog({
    title: `${localize('sr4.spell.draindialogtitle')} ${spell.name} (${localize('sr4.spell.force')}: ${force})`,
    content,
    dice: drainPool,
    onRoll: (dialog) => drainDialogActions(dialog, actor, drainPool),
  });
}
