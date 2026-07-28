import { TEMPLATES, renderTemplate } from '@utils/templates';
import { ActionCategory } from '@models/index';
import { SimMode } from '@models/shared';
import { effectiveSimMode } from '@domains/matrix/derived-stats.js';
import { isJumpedIn } from '@domains/rigging/rigger-state.js';
import { DiceUtility } from '../rolls/diceutility.js';
import { localize, createRollDialog } from './roll-dialog-core.js';
import {
  createDialogParameters,
  dialogActions,
  getInt,
  getChecked,
} from './pool-math.js';

const MATRIX_ACTION_CATEGORIES = Object.freeze(Object.values(ActionCategory));

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {object} options
 * @param {number} options.numDice
 * @param {string} options.label - already-resolved display text (not an i18n key), shown as skillName in the roll result and used as the title fallback
 * @param {string} [options.title] - defaults to `${localize('sr4.roll.rolling')} ${label}`
 * @returns {Promise<void>}
 */
async function _openRollDialog(actor, { numDice, label, title }) {
  const params = createDialogParameters(actor, numDice);
  const content = await renderTemplate(TEMPLATES.ui.dialogs.roll, {
    ...params,
    skillName: label,
  });
  await createRollDialog({
    title: title ?? `${localize('sr4.roll.rolling')} ${label}`,
    content,
    dice: numDice,
    onRoll: (dialog) => dialogActions(dialog, actor, label, numDice),
  });
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} action - used both as the display label (skillName in the roll result) and, via localize()'s fallback-to-input behaviour, as an optional `sr4.action.*` i18n key for the dialog title
 * @param {number} numDice
 * @returns {Promise<void>}
 */
export async function openActionDialog(actor, action, numDice) {
  await _openRollDialog(actor, {
    numDice,
    label: action,
    title: `${localize('sr4.roll.rolling')} ${localize('sr4.action.' + action)}`,
  });
}

/**
 * Opens the roll dialog for a categorised Matrix/Rigging Action item, adding
 * Hot Sim (+2) and Control Rig (+2) checkboxes on top of the standard dialog.
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} action
 * @param {number} numDice
 * @param {string} category - 'MATRIX' or 'RIGGING'
 * @returns {Promise<void>}
 */
export async function openMatrixActionDialog(actor, action, numDice, category) {
  const hotSimAvailable = MATRIX_ACTION_CATEGORIES.includes(category);
  const controlRigAvailable = category === ActionCategory.RIGGING;
  const params = createDialogParameters(actor, numDice);
  const content = await renderTemplate(TEMPLATES.matrix.actionRollDialog, {
    ...params,
    skillName: action,
    hotSimAvailable,
    hotSimChecked:
      hotSimAvailable && effectiveSimMode(actor.system) === SimMode.HOT,
    controlRigAvailable,
    controlRigChecked: controlRigAvailable && isJumpedIn(actor),
  });
  await createRollDialog({
    title: `${localize('sr4.roll.rolling')} ${localize(`sr4.action.${action}`)}`,
    content,
    dice: numDice,
    onRoll: (dialog) => dialogActions(dialog, actor, action, numDice),
  });
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} statKey
 * @returns {Promise<void>}
 */
export async function openDerivedStatDialog(actor, statKey) {
  await _openRollDialog(actor, {
    numDice: actor.system.derivedStats?.[statKey] ?? 0,
    label: localize(`sr4.action.${statKey}`),
  });
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} attributeKey
 * @returns {Promise<void>}
 */
export async function openAttributeRollDialog(actor, attributeKey) {
  await _openRollDialog(actor, {
    numDice: actor.getAttribute(attributeKey) ?? 0,
    label: localize(`sr4.stats.${attributeKey}`),
  });
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {import('@documents/index').SR4Item} complexForm
 * @returns {Promise<void>}
 */
export async function rollComplexFormDialog(actor, complexForm) {
  const numDice =
    (complexForm.system.rating ?? 0) + (actor.getAttribute('RESONANCE') ?? 0);
  await _openRollDialog(actor, { numDice, label: complexForm.name });
}

/**
 * @returns {Promise<void>}
 */
export async function handleFreeRoll() {
  const content = await renderTemplate(TEMPLATES.ui.dialogs.rollButton, {});
  await createRollDialog({
    title: localize('sr4.roll.dialogTitle'),
    content,
    onRoll: async (dialog) => {
      const numDice = getInt(dialog, 'numDice');
      const explode = getChecked(dialog, 'explode');
      return DiceUtility.rollAndShow({ numDice, explode, edgeAvailable: true });
    },
  });
}
