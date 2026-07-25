import { openModifyDamageDialog } from '@domains/combat/dialogs/damage.js';
import {
  ApplyDamageFlow,
  getDamageDecisionEntry,
  resolveDamageDecision,
} from '@domains/combat/flow/apply-damage-flow.js';
import {
  getEffectDecisionEntry,
  resolveEffectDecision,
  applySpellEffects,
} from '@domains/magic/flow/apply-effects-flow.js';
import {
  MatrixDamageFlow,
  getMatrixDamageDecisionEntry,
  resolveMatrixDamageDecision,
} from '@domains/matrix/flow/matrix-damage-flow.js';
import { isResponsibleForActor } from '@utils/actor-ownership.js';
import {
  getPendingDialogEntry,
  resolvePendingDialog,
} from '@utils/rolls/decision-provider.js';
import { appendButton } from './chat-card-dom.js';

/**
 * @template Entry
 * @param {ChatMessage} chatMessage
 * @param {HTMLElement} html
 * @param {{
 *   flagKey: string,
 *   getEntry: (messageId: string) => Entry | undefined,
 *   cardSelector: string,
 *   buttonWrapperClass: string,
 *   buildButtons: (entry: Entry, cleanup: () => void) => import('./chat-card-dom.js').ButtonConfig[],
 * }} config
 */
export function renderDecisionCard(
  chatMessage,
  html,
  { flagKey, getEntry, cardSelector, buttonWrapperClass, buildButtons }
) {
  const decision = chatMessage.flags?.sr4?.[flagKey];
  if (!decision) return;
  if (decision.resolved) return;
  if (!isResponsibleForActor(decision.actorId)) return;

  const entry = getEntry(chatMessage.id);
  if (!entry) return;

  const container = html.querySelector(cardSelector) ?? html;
  if (container.querySelector(`.${buttonWrapperClass}`)) return;

  const btnWrap = document.createElement('div');
  btnWrap.className = buttonWrapperClass;

  const cleanup = () => btnWrap.remove();

  for (const button of buildButtons(entry, cleanup)) {
    appendButton(btnWrap, button);
  }

  container.appendChild(btnWrap);
}

/**
 * @param {ChatMessage} chatMessage
 * @param {HTMLElement} html
 */
export function renderDamageDecisionCard(chatMessage, html) {
  renderDecisionCard(chatMessage, html, {
    flagKey: 'damageDecision',
    getEntry: getDamageDecisionEntry,
    cardSelector: '.damage-decision-card',
    buttonWrapperClass: 'damage-decision-buttons',
    /**
     * @param {import('@domains/combat/flow/apply-damage-flow.js').DamageDecisionEntry} entry
     * @param {() => void} cleanup
     */
    buildButtons: (entry, cleanup) => {
      const damageType = entry.isPhysical
        ? game.i18n.localize('sr4.damage.physical')
        : game.i18n.localize('sr4.damage.stun');

      return [
        {
          className: 'apply-damage',
          label: `${game.i18n.localize('sr4.damage.apply')} (${entry.amount} ${damageType})`,
          onClick: async () => {
            cleanup();
            await resolveDamageDecision(chatMessage.id);
            await ApplyDamageFlow.applyAndSend(
              entry.amount,
              entry.isPhysical,
              entry.actor,
              entry.context,
              entry.onApply
            );
          },
        },
        {
          className: 'modify-damage',
          label: game.i18n.localize('sr4.damage.modify'),
          once: false,
          onClick: async () => {
            const finalAmount = await openModifyDamageDialog(
              entry.actor,
              entry.amount,
              entry.isPhysical
            );
            if (finalAmount === null) return;
            cleanup();
            await resolveDamageDecision(chatMessage.id);
            await ApplyDamageFlow.applyAndSend(
              finalAmount,
              entry.isPhysical,
              entry.actor,
              entry.context,
              entry.onApply
            );
          },
        },
      ];
    },
  });
}

/**
 * @param {ChatMessage} chatMessage
 * @param {HTMLElement} html
 */
export function renderMatrixDamageDecisionCard(chatMessage, html) {
  renderDecisionCard(chatMessage, html, {
    flagKey: 'matrixDamageDecision',
    getEntry: getMatrixDamageDecisionEntry,
    cardSelector: '.matrix-damage-decision-card',
    buttonWrapperClass: 'matrix-damage-decision-buttons',
    /**
     * @param {import('@domains/matrix/flow/matrix-damage-flow.js').MatrixDamageDecisionEntry} entry
     * @param {() => void} cleanup
     */
    buildButtons: (entry, cleanup) => [
      {
        className: 'apply-damage',
        label: `${game.i18n.localize('sr4.damage.apply')} (${entry.amount})`,
        onClick: async () => {
          cleanup();
          await resolveMatrixDamageDecision(chatMessage.id);
          await MatrixDamageFlow.apply(
            entry.amount,
            entry.actor,
            entry.context
          );
        },
      },
    ],
  });
}

/**
 * @param {ChatMessage} chatMessage
 * @param {HTMLElement} html
 */
export function renderEffectDecisionCard(chatMessage, html) {
  renderDecisionCard(chatMessage, html, {
    flagKey: 'effectDecision',
    getEntry: getEffectDecisionEntry,
    cardSelector: '.effect-decision-card',
    buttonWrapperClass: 'effect-decision-buttons',
    /**
     * @param {import('@domains/magic/flow/apply-effects-flow.js').EffectDecisionEntry} entry
     * @param {() => void} cleanup
     */
    buildButtons: (entry, cleanup) => [
      {
        className: 'apply-effects',
        label: game.i18n.localize('sr4.effect.applyToTarget'),
        onClick: async () => {
          cleanup();
          await resolveEffectDecision(chatMessage.id);
          await applySpellEffects(entry.effectData, entry.target);
        },
      },
    ],
  });
}

/**
 * @param {ChatMessage} chatMessage
 * @param {HTMLElement} html
 */
export function renderPendingDialogCard(chatMessage, html) {
  renderDecisionCard(chatMessage, html, {
    flagKey: 'pendingDialog',
    getEntry: getPendingDialogEntry,
    cardSelector: '.pending-dialog-card',
    buttonWrapperClass: 'pending-dialog-buttons',
    /**
     * @param {import('@utils/rolls/decision-provider.js').PendingDialogExtra} entry
     * @param {() => void} cleanup
     */
    buildButtons: (entry, cleanup) => [
      {
        className: 'open-dialog',
        label: entry.i18nLabel,
        onClick: async () => {
          cleanup();
          await resolvePendingDialog(chatMessage.id);
        },
      },
    ],
  });
}
