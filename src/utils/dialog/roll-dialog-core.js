import { getGame } from '../game/game.js';

/**
 * Returns a localised string, optionally appended with a suffix.
 * @param {string} key
 * @param {string} [suffix]
 * @returns {string}
 */
export function localize(key, suffix) {
  const base = getGame().i18n?.localize(key) ?? key;
  return suffix ? `${base} ${suffix}` : base;
}

/** @returns {string} */
export function standardTemplatePath() {
  return 'systems/shadowrun4e/templates/dicerolls/roll-dialog.hbs';
}

/**
 * @param {object[]} docs
 * @returns {Map<string, object> | null}
 */
export function mapDocumentsByName(docs) {
  const map = new Map();
  for (const doc of docs) {
    if (doc.name) map.set(doc.name, doc);
  }
  return map.size > 0 ? map : null;
}

/** @returns {string} */
export function attackTemplatePath() {
  return 'systems/shadowrun4e/templates/dicerolls/attack-roll-dialog.hbs';
}

/** @returns {string} */
export function matrixActionTemplatePath() {
  return 'systems/shadowrun4e/templates/dicerolls/matrix-action-roll-dialog.hbs';
}

/** @returns {string} */
export function meleeAttackTemplatePath() {
  return 'systems/shadowrun4e/templates/dicerolls/melee-attack-dialog.hbs';
}

/** @returns {string} */
export function defenseTemplatePath() {
  return 'systems/shadowrun4e/templates/dicerolls/defense-dialog.hbs';
}

/** @returns {string} */
export function soakTemplatePath() {
  return 'systems/shadowrun4e/templates/dicerolls/soak-dialog.hbs';
}

/** @returns {string} */
export function freeRollTemplatePath() {
  return 'systems/shadowrun4e/templates/dicerolls/roll-button.hbs';
}

/**
 * @param {string} path
 * @param {object} data
 * @returns {Promise<string>}
 */
export async function renderTemplate(path, data) {
  return foundry.applications.handlebars.renderTemplate(path, data);
}

/**
 * @template {Record<string, unknown> & {successes: number, isGlitch: boolean}} T
 * @typedef {object} RollDialogConfig
 * @property {string} title
 * @property {string} content
 * @property {number} [dice]
 * @property {(dialog: HTMLElement) => Promise<T>} onRoll
 * @property {(html: HTMLElement, updateLabel: () => void) => void} [onRender]
 * @property {boolean} [autoRoll] Automatically trigger the roll with default options once the `flowOpposedRollTimeout` setting elapses.
 */

/**
 * @template {Record<string, unknown> & {successes: number, isGlitch: boolean}} T
 * @param {RollDialogConfig<T>} config
 * @returns {Promise<T>}
 */
export async function createRollDialog(config) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let autoRollTimer;

  return foundry.applications.api.DialogV2.prompt({
    window: { title: config.title },
    content: config.content,

    ok: {
      label: `${localize('sr4.roll.rollButton')}${config.dice ? ` (${config.dice})` : ''}`,
      callback: async (_event, button) => {
        clearTimeout(autoRollTimer);
        const html = /** @type {HTMLElement} */ (button.closest('dialog'));
        return config.onRoll(html);
      },
    },

    render: (event) => {
      const html = event.target.element;

      if (config.autoRoll) {
        const timeoutSeconds = getGame().settings.get(
          'shadowrun4e',
          'flowOpposedRollTimeout'
        );
        autoRollTimer = setTimeout(() => {
          html.querySelector('button[data-action="ok"]')?.click();
        }, timeoutSeconds * 1000);
      }

      if (config.dice === undefined) return;

      const updateLabel = () => {
        const bonus = parseInt(html.querySelector('#bonus')?.value ?? '0') || 0;
        const malus = parseInt(html.querySelector('#malus')?.value ?? '0') || 0;
        const recoilMalus =
          parseInt(html.querySelector('#recoilMalus')?.value ?? '0') || 0;
        const spec = html.querySelector('#specialization')?.checked ? 2 : 0;
        const sl = html.querySelector('#smartlink')?.checked ? 2 : 0;
        const edge = html.querySelector('#edge')?.checked
          ? parseInt(html.querySelector('#maxEdge')?.value ?? '0') || 0
          : 0;

        const total =
          config.dice + bonus - malus - recoilMalus + spec + sl + edge;
        const okBtn = html.querySelector('button[data-action="ok"]');
        if (okBtn)
          okBtn.textContent = `${localize('sr4.roll.rollButton')} (${total})`;
      };

      html
        .querySelectorAll('input:not([type="radio"])')
        .forEach((el) => el.addEventListener('input', updateLabel));
      html
        .querySelectorAll('input[type="radio"], select')
        .forEach((el) => el.addEventListener('change', updateLabel));
      if (config.onRender) config.onRender(html, updateLabel);
      updateLabel();
    },

    close: () => clearTimeout(autoRollTimer),
  });
}
