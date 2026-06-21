import { isRangedWeapon } from '@models/index';
import { getGame } from '../game/game.js';
import { DiceUtility } from '../rolls/diceutility.js';

/** @typedef {import('@models/index').SR4RangedWeaponData} SR4RangedWeaponData */
/** @typedef {import('@models/index').SR4MeleeWeaponData} SR4MeleeWeaponData */
/** @typedef {import('@models/index').RollParameters} RollParameters */
/** @typedef {import('@models/index').SR4Weapon} SR4Weapon */

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
export function attackTemplatePath() {
  return 'systems/shadowrun4e/templates/dicerolls/attack-roll-dialog.hbs';
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
 * @property {(dialog: HTMLElement) => Promise<Record<string, unknown> & {successes: number, isGlitch: boolean}>} onRoll
 * @property {(html: HTMLElement, updateLabel: () => void) => void} [onRender]
 */

/**
 * @param {RollDialogConfig} config
 * @returns {Promise<Record<string, unknown> & {successes: number, isGlitch: boolean}>}
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
 * @returns {number}
 */
export function determineBoni(rollParameters) {
  const edge = rollParameters.explode ? rollParameters.maxEdge : 0;
  return (
    (rollParameters.specialization ? 2 : 0) +
    (rollParameters.smartlink ? 2 : 0) +
    edge
  );
}

/**
 * @param {number} baseDice
 * @param {RollParameters} rollParameters
 * @param {number} [recoilMalus]
 * @returns {number}
 */
export function computeFinalPool(baseDice, rollParameters, recoilMalus = 0) {
  return (
    baseDice +
    rollParameters.bonus -
    rollParameters.malus -
    recoilMalus +
    determineBoni(rollParameters)
  );
}

/**
 * @param {SR4Weapon} [weapon]
 * @returns {boolean}
 */
function resolveSmartlink(weapon) {
  if (!weapon) return false;
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
 * @param {{ edgeAvailableOverride?: boolean }} [options]
 * @returns {Promise<{successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null}>}
 */
export async function dialogActions(
  dialog,
  actor,
  rollLabel,
  numDice,
  weapon,
  { edgeAvailableOverride } = {}
) {
  const smartlink = resolveSmartlink(weapon);
  const rollParameters = getRollParameters(actor, dialog, smartlink);
  const recoilMalus = getInt(dialog, 'recoilMalus');
  const finalRoll = computeFinalPool(numDice, rollParameters, recoilMalus);
  if (rollParameters.explode) await actor.useEdge();
  const edgeFlag = edgeAvailableOverride ?? rollParameters.edgeAvailable;
  const { successes, isGlitch, messageId } = await DiceUtility.rollAndShow({
    numDice: finalRoll,
    explode: rollParameters.explode,
    edgeAvailable: edgeFlag,
    actor,
    skillName: rollLabel,
    extended: rollParameters.extended,
  });

  return {
    successes,
    isGlitch,
    rolledDice: finalRoll,
    edgeUsed: rollParameters.explode,
    messageId,
  };
}

/**
 * @typedef {object} DialogParameters
 * @property {number} currentEdge
 * @property {boolean} edgeAvailable
 * @property {number} maxEdge
 * @property {boolean} smartlinkAvailable
 * @property {boolean} smartlinkChecked
 * @property {number} numDice
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
  const malus = ignoreModifiers
    ? 0
    : -(actor.system.derivedStats.dicePoolModifier ?? 0);
  return {
    currentEdge: actor.getAttribute('CURRENTEDGE'),
    edgeAvailable: actor.getAttribute('CURRENTEDGE') > 0,
    maxEdge: actor.getAttribute('EDGE'),
    smartlinkAvailable: weapon ? isRangedWeapon(weapon) : false,
    smartlinkChecked: hasSmartlink,
    numDice,
    malus,
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
