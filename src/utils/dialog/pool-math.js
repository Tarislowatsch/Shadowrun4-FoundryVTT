import { isRangedWeapon } from '@models/index';
import { DiceUtility } from '../rolls/diceutility.js';
import {
  buildSenseContext,
  buildVisibilityContext,
  getSenseBonus,
  getVisibilityMalus,
} from './visibility.js';

/** @typedef {import('@models/index').RollParameters} RollParameters */
/** @typedef {import('@models/index').SR4Weapon} SR4Weapon */

/** @typedef {{ pending: boolean }} EdgePayment */

/** @returns {EdgePayment} */
export function createEdgePayment() {
  return { pending: true };
}

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
    ...readDialogModifiers(dialog, {
      maxEdge: actor.getAttribute('EDGE'),
      smartlinkOverride,
    }),
  };
}

/**
 * @param {HTMLElement} dialog
 * @param {{ maxEdge?: number, smartlinkOverride?: boolean }} [options]
 * @returns {Omit<RollParameters, 'edgeAvailable'>}
 */
export function readDialogModifiers(
  dialog,
  { maxEdge = 0, smartlinkOverride = false } = {}
) {
  return {
    maxEdge,
    explode: getChecked(dialog, 'edge'),
    bonus: getInt(dialog, 'bonus'),
    malus: getInt(dialog, 'malus'),
    smartlink: getChecked(dialog, 'smartlink') || smartlinkOverride,
    extended: getChecked(dialog, 'extended'),
    specialization: getChecked(dialog, 'specialization'),
    hotSim: getChecked(dialog, 'hotSim'),
    controlRig: getChecked(dialog, 'controlRig'),
    visibilityMalus: getVisibilityMalus(dialog),
    senseBonus: getSenseBonus(dialog),
  };
}

/**
 * @param {HTMLElement} dialog
 * @param {number} baseDice
 * @param {number} maxEdge
 * @returns {number}
 */
export function previewDialogPool(dialog, baseDice, maxEdge) {
  return Math.max(
    1,
    computeFinalPool(
      baseDice,
      /** @type {RollParameters} */ (readDialogModifiers(dialog, { maxEdge })),
      getInt(dialog, 'recoilMalus')
    )
  );
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
    (rollParameters.hotSim ? 2 : 0) +
    (rollParameters.controlRig ? 2 : 0) +
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
    recoilMalus -
    (rollParameters.visibilityMalus ?? 0) +
    (rollParameters.senseBonus ?? 0) +
    determineBoni(rollParameters)
  );
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {number} baseDice
 * @param {{ ignoreModifiers?: boolean }} [options]
 * @returns {number}
 */
export function standardAutoRollPool(
  actor,
  baseDice,
  { ignoreModifiers } = {}
) {
  const { malus } = createDialogParameters(actor, baseDice, undefined, {
    ignoreModifiers,
  });
  return Math.max(
    1,
    computeFinalPool(baseDice, {
      bonus: 0,
      malus,
      explode: false,
      specialization: false,
      smartlink: false,
      maxEdge: 0,
    })
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

/**
 * @param {HTMLElement} dialog
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} rollLabel
 * @param {number} numDice
 * @param {import('@models/index').SR4Weapon} [weapon]
 * @param {{ edgeAvailableOverride?: boolean, edgePayment?: EdgePayment | null, details?: string }} [options]
 * @returns {Promise<{successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null}>}
 */
export async function dialogActions(
  dialog,
  actor,
  rollLabel,
  numDice,
  weapon,
  { edgeAvailableOverride, edgePayment = null, details } = {}
) {
  const smartlink = resolveSmartlink(weapon);
  const rollParameters = getRollParameters(actor, dialog, smartlink);
  const recoilMalus = getInt(dialog, 'recoilMalus');
  const finalRoll = computeFinalPool(numDice, rollParameters, recoilMalus);
  if (!edgePayment && rollParameters.explode) {
    await actor.useEdge();
  } else if (edgePayment?.pending) {
    edgePayment.pending = false;
    await actor.useEdge();
  }
  const explode = rollParameters.explode || edgePayment !== null;
  const edgeFlag =
    edgeAvailableOverride ?? (!edgePayment && rollParameters.edgeAvailable);
  const { successes, isGlitch, messageId } = await DiceUtility.rollAndShow({
    numDice: finalRoll,
    explode,
    edgeAvailable: edgeFlag,
    actor,
    skillName: rollLabel,
    extended: rollParameters.extended,
    details,
  });

  return {
    successes,
    isGlitch,
    rolledDice: finalRoll,
    edgeUsed: explode,
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
 * @property {import('./visibility.js').VisibilityContext | null} visibility
 * @property {import('./visibility.js').SenseContext | null} senses
 */

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {number} [numDice]
 * @param {import('@models/index').SR4Weapon} [weapon]
 * @param {{ ignoreModifiers?: boolean, isAttack?: boolean, edgePayment?: EdgePayment | null, visibility?: boolean, visualOnly?: boolean, perception?: boolean, visionActor?: import('@documents/index').SR4Actor }} [options]
 * @returns {DialogParameters}
 */
export function createDialogParameters(
  actor,
  numDice = 0,
  weapon = undefined,
  {
    ignoreModifiers = false,
    isAttack = false,
    edgePayment = null,
    visibility = false,
    visualOnly = false,
    perception = false,
    visionActor = actor,
  } = {}
) {
  const hasSmartlink = weapon ? resolveSmartlink(weapon) : false;
  const attackMalus = isAttack
    ? (actor.system.modifiers.attackModifier ?? 0)
    : 0;
  const malus = ignoreModifiers
    ? 0
    : -(actor.system.derivedStats.dicePoolModifier ?? 0) - attackMalus;
  return {
    currentEdge: actor.getAttribute('CURRENTEDGE'),
    edgeAvailable: !edgePayment && actor.getAttribute('CURRENTEDGE') > 0,
    maxEdge: actor.getAttribute('EDGE'),
    smartlinkAvailable: weapon ? isRangedWeapon(weapon) : false,
    smartlinkChecked: hasSmartlink,
    numDice,
    malus,
    visibility:
      visibility || perception
        ? buildVisibilityContext(visionActor, { visualOnly })
        : null,
    senses: perception ? buildSenseContext(actor) : null,
  };
}
