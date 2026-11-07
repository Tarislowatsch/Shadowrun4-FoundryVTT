import {
  VISIBILITY_LABEL_PREFIXES,
  VISION_FLAGS,
  visionFromMetatype,
} from '@models/shared/visibility-rules.js';
import { promptSelectDialog } from '@utils/dialog';

/**
 * @typedef {object} VisionModeRow
 * @property {string} mode
 * @property {string} label
 * @property {boolean} fromMetatype
 * @property {boolean} removable
 * @property {boolean} active
 */

/**
 * @typedef {object} VisionModesContext
 * @property {VisionModeRow[]} rows
 * @property {string[]} available
 * @property {boolean} complete
 */

/**
 * @param {string} mode
 * @returns {string}
 */
export function visionModeLabel(mode) {
  return `${VISIBILITY_LABEL_PREFIXES.vision}${mode}`;
}

/**
 * @param {{ _source?: { system?: { vision?: Record<string, boolean>, visionDisabled?: Record<string, boolean> } }, items?: Iterable<any> }} actor
 * @returns {VisionModesContext}
 */
export function buildVisionModesContext(actor) {
  const source = actor?._source?.system ?? {};
  const manual = source.vision ?? {};
  const disabled = source.visionDisabled ?? {};
  const metatype = visionFromMetatype(actor?.items);
  const rows = [];
  const available = [];
  for (const mode of VISION_FLAGS) {
    const fromMetatype = metatype[mode] === true;
    const removable = manual[mode] === true;
    if (fromMetatype || removable) {
      rows.push({
        mode,
        label: visionModeLabel(mode),
        fromMetatype,
        removable,
        active: disabled[mode] !== true,
      });
    } else {
      available.push(mode);
    }
  }
  return { rows, available, complete: available.length === 0 };
}

/**
 * @param {HTMLElement} target
 * @returns {string | null}
 */
function targetMode(target) {
  const mode = target.dataset.visionMode;
  return mode && VISION_FLAGS.includes(mode) ? mode : null;
}

/**
 * @this {{ actor: any }}
 * @returns {Promise<void>}
 */
export async function onAddVisionMode() {
  const { available } = buildVisionModesContext(this.actor);
  if (available.length === 0) return;
  const mode = await promptSelectDialog({
    title: game.i18n.localize('sr4.visibility.modes.add'),
    okLabel: game.i18n.localize('sr4.visibility.modes.add'),
    options: available.map((value) => ({
      value,
      label: game.i18n.localize(visionModeLabel(value)),
    })),
  });
  if (!mode || !VISION_FLAGS.includes(mode)) return;
  await this.actor.update({
    [`system.vision.${mode}`]: true,
    [`system.visionDisabled.${mode}`]: false,
  });
}

/**
 * @this {{ actor: any }}
 * @param {Event} _event
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
export async function onRemoveVisionMode(_event, target) {
  const mode = targetMode(target);
  if (!mode) return;
  await this.actor.update({
    [`system.vision.${mode}`]: false,
    [`system.visionDisabled.${mode}`]: false,
  });
}

/**
 * @this {{ actor: any }}
 * @param {Event} _event
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
export async function onToggleVisionMode(_event, target) {
  const mode = targetMode(target);
  if (!mode) return;
  const disabled = this.actor._source?.system?.visionDisabled?.[mode] === true;
  await this.actor.update({ [`system.visionDisabled.${mode}`]: !disabled });
}
