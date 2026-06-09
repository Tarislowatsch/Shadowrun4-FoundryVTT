import { isRangedWeapon } from '@models/index';
import { getGame } from '../game/game.js';
import { DiceUtility } from '../rolls/diceutility.js';
import { emitDefenseTrigger } from '@flows/index';

/** @typedef {import('@models/index').SR4RangedWeaponData} SR4RangedWeaponData */
/** @typedef {import('@models/index').SR4MeleeWeaponData} SR4MeleeWeaponData */
/** @typedef {import('@models/index').RollParameters} RollParameters */

/**
 * A Foundry Item document representing a SR4 weapon.
 * @typedef {import('@client/documents/item.mjs').default & {system: SR4RangedWeaponData | SR4MeleeWeaponData}} SR4Weapon
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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

/** @returns {string} */
function freeRollTemplatePath() {
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
 * @typedef {object} RollDialogConfig
 * @property {string} title
 * @property {string} content
 * @property {number} [dice]
 * @property {(dialog: HTMLElement) => Promise<{successes: number, isGlitch: boolean}>} onRoll
 */

/**
 * @param {RollDialogConfig} config
 * @returns {Promise<{successes: number, isGlitch: boolean}>}
 */
export async function createRollDialog(config) {
  return foundry.applications.api.DialogV2.prompt({
    window: { title: config.title },
    content: config.content,

    ok: {
      label: `${localize('sr4.roll.rollButton')}${config.dice ? ` (${config.dice})` : ''}`,
      callback: async (_event, button) => {
        const html = /** @type {HTMLElement} */ (button.closest('dialog'));
        return config.onRoll(html);
      },
    },

    render: (event) => {
      const html = event.target.element;
      if (config.dice === undefined) return;

      const updateLabel = () => {
        const bonus = parseInt(html.querySelector('#bonus')?.value ?? '0') || 0;
        const malus = parseInt(html.querySelector('#malus')?.value ?? '0') || 0;
        const spec = html.querySelector('#specialization')?.checked ? 2 : 0;
        const sl = html.querySelector('#smartlink')?.checked ? 2 : 0;
        const edge = html.querySelector('#edge')?.checked
          ? parseInt(html.querySelector('#maxEdge')?.value ?? '0') || 0
          : 0;

        const total = config.dice + bonus - malus + spec + sl + edge;
        const okBtn = html.querySelector('button[data-action="ok"]');
        if (okBtn)
          okBtn.textContent = `${localize('sr4.roll.rollButton')} (${total})`;
      };

      html
        .querySelectorAll('input')
        .forEach((el) => el.addEventListener('input', updateLabel));
      updateLabel();
    },
  });
}

// ---------------------------------------------------------------------------
// Roll parameter helpers
// ---------------------------------------------------------------------------

/**
 * @param {HTMLElement} dialog
 * @param {string} id
 * @returns {boolean}
 */
export function getChecked(dialog, id) {
  return (
    /** @type {HTMLInputElement} */ (dialog.querySelector(`#${id}`))?.checked ??
    false
  );
}

/**
 * @param {HTMLElement} dialog
 * @param {string} id
 * @returns {number}
 */
export function getInt(dialog, id) {
  const value =
    /** @type {HTMLInputElement} */ (dialog.querySelector(`#${id}`))?.value ??
    '0';
  return parseInt(value) || 0;
}

/**
 * @param {import('@documents/actor').SR4Actor} actor
 * @param {HTMLElement} dialog
 * @param {boolean} [smartlinkOverride]
 * @returns {RollParameters}
 */
function getRollParameters(actor, dialog, smartlinkOverride) {
  return {
    edgeAvailable: actor.getAttribute('CURRENTEDGE') > 0,
    maxEdge: actor.getAttribute('EDGE'),
    explode: getChecked(dialog, 'edge'),
    bonus: getInt(dialog, 'bonus'),
    malus: getInt(dialog, 'malus'),
    smartlink: getChecked(dialog, 'smartlink') || smartlinkOverride,
    extended: getChecked(dialog, 'extended'),
    specialization: getChecked(dialog, 'specialization'),
  };
}

/**
 * @param {RollParameters} rollParameters
 * @param {boolean} smartlink
 * @returns {number}
 */
function determineBoni(rollParameters, smartlink) {
  const edge = rollParameters.explode ? rollParameters.maxEdge : 0;
  return (
    (rollParameters.specialization ? 2 : 0) +
    (rollParameters.smartlink || smartlink ? 2 : 0) +
    edge
  );
}

/**
 * @param {SR4Weapon} [weapon]
 * @returns {boolean}
 */
function resolveSmartlink(weapon) {
  if (!weapon) return false;
  console.warn(weapon);
  return isRangedWeapon(weapon) && weapon.system.smartlink;
}

// ---------------------------------------------------------------------------
// Shared dialog action
// ---------------------------------------------------------------------------

/**
 * @param {HTMLElement} dialog
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} rollLabel
 * @param {number} numDice
 * @param {import('@models/index').SR4Weapon} [weapon]
 * @returns {Promise<{successes: number, isGlitch: boolean}>}
 */
export async function dialogActions(
  dialog,
  actor,
  rollLabel,
  numDice,
  weapon,
  { emitDefense = true } = {}
) {
  const rollParameters = getRollParameters(
    actor,
    dialog,
    resolveSmartlink(weapon)
  );
  const finalRoll =
    numDice +
    rollParameters.bonus -
    rollParameters.malus +
    determineBoni(rollParameters, resolveSmartlink(weapon));
  if (rollParameters.explode) await actor.useEdge();
  if (typeof finalRoll !== 'number') return { successes: 0, isGlitch: false };
  const { successes, isGlitch } = await DiceUtility.rollAndShow({
    numDice: finalRoll,
    explode: rollParameters.explode,
    edgeAvailable: rollParameters.edgeAvailable,
    actor,
    skillName: rollLabel,
    extended: rollParameters.extended,
  });
  if (weapon && emitDefense && successes > 0)
    emitDefenseTrigger(actor, weapon, successes);

  return { successes, isGlitch };
}

/**
 * @typedef {object} DialogParameters
 * @property {number} currentEdge
 * @property {boolean} edgeAvailable
 * @property {number} maxEdge
 * @property {boolean} smartlinkAvailable
 * @property {boolean} smartlinkChecked
 * @property {number} numDice
 * @property {number} dicePoolModifier
 * @property {number} malus
 */

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {number} [numDice]
 * @param {import('@models/index').SR4Weapon} [weapon]
 * @param {{ ignoreModifiers?: boolean }} [options]
 * @returns {DialogParameters}
 */
export function createDialogParameters(
  actor,
  numDice = 0,
  weapon = undefined,
  { ignoreModifiers = false } = {}
) {
  const hasSmartlink = weapon ? resolveSmartlink(weapon) : false;
  const dicePoolModifier = ignoreModifiers
    ? 0
    : (actor.system.derivedStats.dicePoolModifier ?? 0);
  return {
    currentEdge: actor.getAttribute('CURRENTEDGE'),
    edgeAvailable: actor.getAttribute('CURRENTEDGE') > 0,
    maxEdge: actor.getAttribute('EDGE'),
    smartlinkAvailable: weapon ? isRangedWeapon(weapon) : false,
    smartlinkChecked: hasSmartlink,
    numDice,
    dicePoolModifier,
    malus: dicePoolModifier,
  };
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @returns {number | undefined}
 */
export function getSkillDicePool(actor, skillName) {
  const skill = actor.getSkill(skillName);
  if (!skill) return undefined;
  const rating = skill.system.rating > 0 ? skill.system.rating : -1;
  return Math.max(actor.getAttribute(skill.system.attribute) + rating, 1);
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} action
 * @param {number} numDice
 * @returns {Promise<void>}
 */
export async function openActionDialog(actor, action, numDice) {
  const params = createDialogParameters(actor);
  const content = await renderTemplate(standardTemplatePath(), {
    ...params,
    action,
    numDice,
  });
  await createRollDialog({
    title: `${localize('sr4.roll.rolling')} ${localize('sr4.action.' + action)}`,
    content,
    dice: numDice,
    onRoll: (dialog) => dialogActions(dialog, actor, action, numDice),
  });
}

/**
 * @returns {Promise<void>}
 */
export async function handleFreeRoll() {
  const content = await renderTemplate(freeRollTemplatePath(), {});
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
