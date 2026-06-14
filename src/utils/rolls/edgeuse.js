import { getGame } from '../game/game.js';
import { DiceUtility } from './diceutility.js';

/** @typedef {import('@documents/actor').SR4Actor} SR4Actor */

const EDGE_DIALOG_TEMPLATE =
  'systems/shadowrun4e/templates/dicerolls/edge-dialog.hbs';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Consumes one Edge point from the actor, closes the dialog, and fires the
 * completion callbacks.
 *
 * @param {SR4Actor | undefined} actor
 * @param {foundry.applications.api.DialogV2} dialog
 * @param {(() => void) | undefined} onComplete
 * @param {((newSuccesses: number) => void) | undefined} onCompleteWithResult
 * @param {number} newSuccesses
 * @returns {void}
 */
function consumeEdge(
  actor,
  dialog,
  onComplete,
  onCompleteWithResult,
  newSuccesses
) {
  actor?.useEdge();
  dialog.close();
  onComplete?.();
  onCompleteWithResult?.(newSuccesses);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {object} EdgeUseOptions
 * @property {boolean} isCriticalGlitch - Whether the triggering roll was a critical glitch.
 * @property {boolean} isGlitch - Whether the triggering roll was a glitch.
 * @property {number} successes - Number of successes from the triggering roll.
 * @property {number} rolledDice - Total number of dice rolled.
 * @property {SR4Actor} [actor] - The actor spending Edge, if any.
 * @property {() => void} [onComplete] - Callback fired after Edge is spent and the dialog closes.
 * @property {(newSuccesses: number) => void} [onCompleteWithResult] - Callback fired with the new
 *   success count after Edge is spent. For glitch-removal 0 is passed (glitch converted to
 *   non-glitch with no hits); for rerolls the new total is passed.
 */

/**
 * Renders and opens the Edge use dialog, allowing the player to choose how to
 * spend Edge after a roll. Handles unglitching, rerolling failures, and adding
 * bonus Edge dice.
 *
 * @param {EdgeUseOptions} options
 * @returns {Promise<void>}
 */
export async function showEdgeDialog(options) {
  const {
    isCriticalGlitch,
    isGlitch,
    successes,
    rolledDice,
    actor,
    onComplete,
    onCompleteWithResult,
  } = options;

  const content = await foundry.applications.handlebars.renderTemplate(
    EDGE_DIALOG_TEMPLATE,
    {
      message: getGame().i18n?.localize('sr4.roll.edge.useEdgePrompt'),
      isCriticalGlitch,
      isGlitch,
    }
  );

  await new Promise((resolve) => {
    const dialog = new foundry.applications.api.DialogV2({
      window: {
        title: getGame().i18n?.localize('sr4.roll.edge.dialogTitle') ?? '',
      },
      position: { width: 480 },
      content,
      buttons: [
        {
          label: '',
          action: '_dummy',
          class: 'edge-dummy-btn',
          callback: () => {},
        },
      ],
    });

    dialog.addEventListener('render', (event) => {
      const html = event.target.element;
      html
        .querySelector('.edge-dummy-btn')
        ?.style.setProperty('display', 'none');

      // Glitch → normaler Misserfolg: Erfolge auf 0 setzen
      html.querySelector('.glitch')?.addEventListener('click', () => {
        consumeEdge(actor, dialog, onComplete, onCompleteWithResult, 0);
        resolve();
      });

      // Misserfolge neu würfeln
      html
        .querySelector('.reroll-failure')
        ?.addEventListener('click', async () => {
          const result = await DiceUtility.followUpRoll({
            numDice: rolledDice - successes,
            explode: false,
            reroll: true,
            edgeAvailable: false,
            prevSuccesses: successes,
          });
          consumeEdge(
            actor,
            dialog,
            onComplete,
            onCompleteWithResult,
            result ?? successes
          );
          resolve();
        });

      // Edge-Würfel hinzufügen
      html
        .querySelector('.add-edge-dice')
        ?.addEventListener('click', async () => {
          const result = await DiceUtility.followUpRoll({
            numDice: actor?.getAttribute('EDGE') ?? 6,
            explode: true,
            reroll: true,
            edgeAvailable: false,
            prevSuccesses: successes,
          });
          consumeEdge(
            actor,
            dialog,
            onComplete,
            onCompleteWithResult,
            result ?? successes
          );
          resolve();
        });

      html.querySelector('.abort')?.addEventListener('click', () => {
        dialog.close();
        resolve();
      });
    });

    dialog.render(true);
  });
}
