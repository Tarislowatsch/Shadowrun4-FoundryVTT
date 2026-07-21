import { DiceUtility } from '../../rolls';
import {
  createDialogParameters,
  createRollDialog,
  getChecked,
  getInt,
  localize,
  renderTemplate,
  standardAutoRollPool,
  standardTemplatePath,
} from '../dialogutility';
import { resolveEdgeForRoll } from '@utils/rolls/roll-edge-decision.js';
import {
  getMatrixAttackPool,
  getMatrixDefensePool,
  getMatrixResistPool,
} from '@utils/matrix/matrix-persona.js';

const ATTACK_TEMPLATE =
  'systems/shadowrun4e/templates/dicerolls/cybercombat-attack.hbs';
const DEFENSE_TEMPLATE =
  'systems/shadowrun4e/templates/dicerolls/matrix-defense.hbs';

/**
 * @param {HTMLElement} dialog
 * @param {import('@documents/index').SR4Actor} actor
 * @param {number} basePool
 * @param {string} label
 * @returns {Promise<{successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null}>}
 */
async function rollMatrixPool(dialog, actor, basePool, label) {
  const useEdge = getChecked(dialog, 'edge');
  const bonus = getInt(dialog, 'bonus');
  const malus = getInt(dialog, 'malus');
  const edgeBonus = useEdge ? (actor.getAttribute('EDGE') ?? 0) : 0;
  const finalPool = Math.max(basePool + bonus - malus + edgeBonus, 1);
  if (useEdge) await actor.useEdge();
  const result = await DiceUtility.rollAndShow({
    numDice: finalPool,
    explode: useEdge,
    edgeAvailable: false,
    actor,
    skillName: label,
    extended: false,
  });
  return { ...result, rolledDice: finalPool, edgeUsed: useEdge };
}

/**
 * @param {import('@documents/index').SR4Actor} attacker
 * @param {{ id: string|null, name: string, category: string, rating: number }[]} programs
 * @returns {Promise<{ program: { category: string, rating: number, name: string }, successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null } | null>}
 */
export async function openCybercombatAttackDialog(attacker, programs) {
  const label = localize('sr4.matrix.cybercombat.attackTitle');
  const firstRating = programs[0]?.rating ?? 0;
  const basePool = getMatrixAttackPool(attacker, firstRating);
  const params = createDialogParameters(attacker, basePool);
  const content = await renderTemplate(ATTACK_TEMPLATE, {
    ...params,
    programs,
  });

  const result = await createRollDialog({
    title: label,
    content,
    dice: basePool,
    onRoll: async (dialog) => {
      const sel = /** @type {HTMLSelectElement} */ (
        dialog.querySelector('#matrixProgram')
      )?.selectedOptions?.[0];
      const category = sel?.value ?? programs[0]?.category ?? 'attack';
      const rating = parseInt(sel?.dataset.rating ?? '') || 0;
      const name = sel?.dataset.name ?? programs[0]?.name ?? '';
      const pool = getMatrixAttackPool(attacker, rating);
      const roll = await rollMatrixPool(dialog, attacker, pool, label);
      return { ...roll, program: { category, rating, name } };
    },
  });

  return result ?? null;
}

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {{ attackerName: string, programName: string, attackHits: number }} info
 * @returns {Promise<number | null>}
 */
export async function openMatrixDefenseDialog(
  defender,
  { attackerName, programName, attackHits }
) {
  const label = localize('sr4.matrix.cybercombat.defenseTitle');
  const basePool = getMatrixDefensePool(defender, false);
  const params = createDialogParameters(defender, basePool);
  const content = await renderTemplate(DEFENSE_TEMPLATE, {
    ...params,
    attackerName,
    programName,
    attackHits,
  });

  const result = await createRollDialog({
    title: label,
    content,
    dice: basePool,
    autoRoll: true,
    onRoll: async (dialog) => {
      const full = getChecked(dialog, 'fullDefense');
      const pool = getMatrixDefensePool(defender, full);
      return rollMatrixPool(dialog, defender, pool, label);
    },
  });

  if (!result) return null;
  return resolveEdgeForRoll(defender, result, attackHits);
}

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @returns {Promise<number>}
 */
export async function defaultMatrixDefenseHits(defender) {
  const pool = getMatrixDefensePool(defender, false);
  const { successes } = await DiceUtility.rollAndShow({
    numDice: standardAutoRollPool(defender, pool),
    explode: false,
    edgeAvailable: false,
    actor: defender,
    skillName: localize('sr4.matrix.cybercombat.defenseTitle'),
  });
  return successes;
}

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {{ label: string, biofeedback?: boolean }} info
 * @returns {Promise<number>}
 */
export async function defaultMatrixResistHits(
  defender,
  { label, biofeedback = false }
) {
  const pool = getMatrixResistPool(defender, { biofeedback });
  const { successes } = await DiceUtility.rollAndShow({
    numDice: standardAutoRollPool(defender, pool, { ignoreModifiers: true }),
    explode: false,
    edgeAvailable: false,
    actor: defender,
    skillName: label,
  });
  return successes;
}

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {{ dv: number, label: string, biofeedback?: boolean }} info
 * @returns {Promise<number | null>}
 */
export async function openMatrixResistDialog(
  defender,
  { dv, label, biofeedback = false }
) {
  const pool = getMatrixResistPool(defender, { biofeedback });
  const params = createDialogParameters(defender, pool, undefined, {
    ignoreModifiers: true,
  });
  const content = await renderTemplate(standardTemplatePath(), {
    ...params,
    skillName: label,
  });

  const result = await createRollDialog({
    title: label,
    content,
    dice: pool,
    autoRoll: true,
    onRoll: (dialog) => rollMatrixPool(dialog, defender, pool, label),
  });

  if (!result) return null;
  return resolveEdgeForRoll(defender, result, dv);
}
