import { createAwaitableDecision } from './awaitable-decision.js';
import { DiceUtility } from './diceutility.js';

export const DecisionCategory = Object.freeze({
  COMBAT: 'combat',
  MAGIC: 'magic',
  MATRIX: 'matrix',
});

export const DecisionRouting = Object.freeze({
  OWNER: 'owner',
  GM: 'gm',
});

export const DecisionKind = Object.freeze({
  DEFENSE: 'defense',
  SOAK: 'soak',
  MATRIX_DEFENSE: 'matrixDefense',
  MATRIX_RESIST: 'matrixResist',
  BIOFEEDBACK_RESIST: 'biofeedbackResist',
  DIRECT_SPELL_RESIST: 'directSpellResist',
  INDIRECT_SPELL_DEFENSE: 'indirectSpellDefense',
  OPPOSED_SPELL_RESIST: 'opposedSpellResist',
  SPIRIT_RESIST: 'spiritResist',
  SPIRIT_BIND_RESIST: 'spiritBindResist',
  DUMPSHOCK: 'dumpshock',
});

/**
 * @typedef {(typeof DecisionCategory)[keyof typeof DecisionCategory]} DecisionCategoryValue
 */

/**
 * @typedef {(typeof DecisionRouting)[keyof typeof DecisionRouting]} DecisionRoutingValue
 */

/**
 * @typedef {(typeof DecisionKind)[keyof typeof DecisionKind]} DecisionKindValue
 */

/**
 * @typedef {{ successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null, hits?: number }} ReactiveRollResult
 */

/** @type {Record<DecisionKindValue, string>} */
const OPEN_LABEL_KEY = {
  [DecisionKind.DEFENSE]: 'sr4.decision.open.defense',
  [DecisionKind.SOAK]: 'sr4.decision.open.soak',
  [DecisionKind.MATRIX_DEFENSE]: 'sr4.decision.open.matrixDefense',
  [DecisionKind.MATRIX_RESIST]: 'sr4.decision.open.matrixResist',
  [DecisionKind.BIOFEEDBACK_RESIST]: 'sr4.decision.open.matrixResist',
  [DecisionKind.DIRECT_SPELL_RESIST]: 'sr4.decision.open.spellResist',
  [DecisionKind.INDIRECT_SPELL_DEFENSE]: 'sr4.decision.open.defense',
  [DecisionKind.OPPOSED_SPELL_RESIST]: 'sr4.decision.open.spellResist',
  [DecisionKind.SPIRIT_RESIST]: 'sr4.decision.open.spiritResist',
  [DecisionKind.SPIRIT_BIND_RESIST]: 'sr4.decision.open.spiritResist',
  [DecisionKind.DUMPSHOCK]: 'sr4.decision.open.dumpshock',
};

/**
 * @param {DecisionKindValue} dialogKind
 * @returns {string}
 */
function labelForKind(dialogKind) {
  return game.i18n.localize(
    OPEN_LABEL_KEY[dialogKind] ?? OPEN_LABEL_KEY[DecisionKind.DEFENSE]
  );
}

/**
 * @param {DecisionCategoryValue} category
 * @returns {'dialog' | 'chat'}
 */
export function resolveDecisionMode(category) {
  const mode = game.settings.get('shadowrun4e', 'decisionMode') ?? 'dialog';
  if (mode !== 'custom') return mode;
  const key = {
    [DecisionCategory.COMBAT]: 'decisionModeCombat',
    [DecisionCategory.MAGIC]: 'decisionModeMagic',
    [DecisionCategory.MATRIX]: 'decisionModeMatrix',
  }[category];
  return (key && game.settings.get('shadowrun4e', key)) || 'dialog';
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {number} standardPool
 * @param {DecisionKindValue} dialogKind
 * @returns {Promise<ReactiveRollResult>}
 */
export async function defaultReactiveRoll(actor, standardPool, dialogKind) {
  const numDice = Math.max(1, standardPool);
  const { successes, isGlitch, messageId } = await DiceUtility.rollAndShow({
    numDice,
    explode: false,
    edgeAvailable: false,
    actor,
    skillName: labelForKind(dialogKind),
  });
  const result = {
    successes,
    isGlitch,
    rolledDice: numDice,
    edgeUsed: false,
    messageId,
  };
  return dialogKind === DecisionKind.SOAK
    ? { ...result, hits: successes }
    : result;
}

/**
 * @typedef {object} PendingDialogExtra
 * @property {() => Promise<ReactiveRollResult | null>} openDialog
 * @property {string} actorId
 * @property {string} i18nLabel
 */

/** @type {import('./awaitable-decision.js').AwaitableDecisionApi<ReactiveRollResult | null, PendingDialogExtra>} */
const pendingDialogs = createAwaitableDecision();

/**
 * @param {string} messageId
 * @returns {ReturnType<typeof pendingDialogs.get>}
 */
export function getPendingDialogEntry(messageId) {
  return pendingDialogs.get(messageId);
}

/**
 * @param {string} messageId
 * @returns {Promise<void>}
 */
async function markPendingResolved(messageId) {
  const message = game.messages?.get(messageId);
  if (
    message &&
    !message.flags?.sr4?.pendingDialog?.resolved &&
    message.isAuthor
  ) {
    await message.update({ 'flags.sr4.pendingDialog.resolved': true });
  }
}

/**
 * @param {string} messageId
 * @returns {Promise<void>}
 */
export async function resolvePendingDialog(messageId) {
  const entry = pendingDialogs.get(messageId);
  if (entry) {
    pendingDialogs.settle(messageId, /** @type {any} */ (entry.openDialog()));
  }
  await markPendingResolved(messageId);
}

/**
 * @template {ReactiveRollResult | null} T
 * @param {{
 *   actor?: import('@documents/index').SR4Actor,
 *   category: DecisionCategoryValue,
 *   dialogKind: DecisionKindValue,
 *   routing: DecisionRoutingValue,
 *   openDialog: () => Promise<T>,
 *   chatModeSupported?: boolean,
 *   standardPool?: number,
 *   defaultResult?: () => Promise<T>,
 * }} opts
 * @returns {Promise<T>}
 */
export async function requestReactiveDecision(opts) {
  const {
    actor,
    category,
    dialogKind,
    routing,
    openDialog,
    chatModeSupported = false,
    standardPool,
    defaultResult,
  } = opts;

  const actorId = actor?.id;
  const canChat =
    chatModeSupported &&
    routing === DecisionRouting.OWNER &&
    !!actorId &&
    (standardPool !== undefined || typeof defaultResult === 'function') &&
    resolveDecisionMode(category) === 'chat';

  if (!canChat) return openDialog();

  const label = labelForKind(dialogKind);
  const name = foundry.utils.escapeHTML?.(actor.name) ?? actor.name;
  const content = `<div class="pending-dialog-card"><p>${game.i18n.format(
    'sr4.decision.pendingCard',
    { name, action: label }
  )}</p></div>`;

  const message = await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: {
      sr4: {
        pendingDialog: {
          actorId,
          dialogKind,
          label,
          resolved: false,
        },
      },
    },
  });

  const timeoutSeconds =
    game.settings.get('shadowrun4e', 'flowOpposedRollTimeout') ?? 30;

  return /** @type {Promise<T>} */ (
    pendingDialogs.park({
      messageId: message.id,
      timeoutMs: timeoutSeconds * 1000,
      getDefault: /** @type {any} */ (
        defaultResult ??
          (() => defaultReactiveRoll(actor, standardPool, dialogKind))
      ),
      onTimeout: () => resolvePendingDialog(message.id),
      extra: { openDialog, actorId, i18nLabel: label },
    })
  );
}
