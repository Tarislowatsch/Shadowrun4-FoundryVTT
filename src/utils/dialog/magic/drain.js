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
import { resolveEdgeForRoll } from '@utils/rolls/roll-edge-decision.js';
import { ApplyDamageFlow } from '@flows/apply-damage-flow.js';

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} primaryKey
 * @param {string} secondaryKey
 * @param {number} [bonus]
 * @returns {number}
 */
function calculateDrainPool(actor, primaryKey, secondaryKey, bonus = 0) {
  return (
    (actor.getAttribute(primaryKey) ?? 0) +
    (actor.getAttribute(secondaryKey) ?? 0) +
    bonus
  );
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} secondaryAttributeKey
 * @param {number} [bonus]
 * @returns {number}
 */
export function calculateWillpowerResistancePool(
  actor,
  secondaryAttributeKey,
  bonus = 0
) {
  return calculateDrainPool(actor, 'WILLPOWER', secondaryAttributeKey, bonus);
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} fadingAttributeKey
 * @param {number} [bonus]
 * @returns {number}
 */
export function calculateResonanceFadingPool(
  actor,
  fadingAttributeKey,
  bonus = 0
) {
  return calculateDrainPool(actor, 'RESONANCE', fadingAttributeKey, bonus);
}

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
 * @param {import('@documents/index').SR4Actor} actor
 * @param {{ label: string, force: number, drainPool: number, drainValue: number }} opts
 * @returns {Promise<{successes: number, isGlitch: boolean, edgeUsed: boolean, messageId: string | null} | null>}
 */
export async function openGenericDrainDialog(
  actor,
  { label, force, drainPool, drainValue }
) {
  const params = createDialogParameters(actor, drainPool, undefined, {
    ignoreModifiers: true,
  });
  const content = await renderTemplate(standardTemplatePath(), {
    force,
    drainValue,
    ...params,
    skillName: localize('sr4.roll.drainResistanceTest'),
  });
  return createRollDialog({
    title: `${localize('sr4.spell.draindialogtitle')} ${label} (${localize('sr4.spell.force')}: ${force})`,
    content,
    dice: drainPool,
    onRoll: (dialog) => drainDialogActions(dialog, actor, drainPool),
  });
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {{ label: string, force: number, drainPool: number, drainValue: number, isPhysical: boolean }} opts
 * @returns {Promise<void>}
 */
export async function resolveDrain(
  actor,
  { label, force, drainPool, drainValue, isPhysical }
) {
  const drainResult = await openGenericDrainDialog(actor, {
    label,
    force,
    drainPool,
    drainValue,
  });
  if (drainResult === null || drainResult === undefined) return;

  const finalDrainHits = await resolveEdgeForRoll(
    actor,
    {
      successes: drainResult.successes,
      rolledDice: drainPool,
      isGlitch: drainResult.isGlitch,
      edgeUsed: drainResult.edgeUsed,
      messageId: drainResult.messageId,
    },
    drainValue
  );

  const unresisted = Math.max(drainValue - finalDrainHits, 0);
  if (unresisted === 0) return;
  await ApplyDamageFlow.sendDecisionMessage(
    actor,
    unresisted,
    isPhysical,
    'drain'
  );
}
