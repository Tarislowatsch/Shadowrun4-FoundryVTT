import { localize, renderTemplate } from '../dialogutility';

const TEMPLATE_PATH =
  'systems/shadowrun4e/templates/dicerolls/defender-picker-dialog.hbs';

/**
 * @typedef {object} DefenderPickerActor
 * @property {string} id
 * @property {string} name
 */

/**
 * Renders a dialog for the GM to pick a defender from a list of actors.
 * Returns the selected actor id, or null if cancelled.
 *
 * @param {string} attackerName
 * @param {number} successes
 * @param {DefenderPickerActor[]} actors
 * @returns {Promise<string | null>}
 */
export async function openDefenderPickerDialog(
  attackerName,
  successes,
  actors
) {
  const content = await renderTemplate(TEMPLATE_PATH, {
    attackerName,
    successes,
    actors,
  });

  return foundry.applications.api.DialogV2.prompt({
    window: {
      title: localize('sr4.settings.gmDefenderPicker.dialogTitle'),
    },
    content,
    ok: {
      label: localize('sr4.settings.gmDefenderPicker.confirm'),
      callback: (
        /** @type {Event} */ _event,
        /** @type {HTMLButtonElement} */ button
      ) => {
        const html = /** @type {HTMLElement} */ (button.closest('dialog'));
        return (
          /** @type {HTMLSelectElement|null} */ (
            html.querySelector('#defenderId')
          )?.value ?? null
        );
      },
    },
  });
}
