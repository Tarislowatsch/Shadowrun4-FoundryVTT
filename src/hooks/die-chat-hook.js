import {
  DiceUtility,
  showEdgeDialog,
  openModifyDamageDialog,
} from '@utils/index';
import {
  getEdgeDecisionEntry,
  resolveEdgeDecision,
} from '@utils/rolls/roll-edge-decision.js';
import {
  ApplyDamageFlow,
  getDamageDecisionEntry,
  resolveDamageDecision,
} from '@flows/apply-damage-flow.js';
import {
  getEffectDecisionEntry,
  resolveEffectDecision,
  applySpellEffects,
} from '@flows/apply-effects-flow.js';
import {
  MatrixDamageFlow,
  getMatrixDamageDecisionEntry,
  resolveMatrixDamageDecision,
} from '@flows/matrix-damage-flow.js';
import { isResponsibleForActor, isPrimaryGM } from '@utils/actor-ownership.js';
import {
  getPendingDialogEntry,
  resolvePendingDialog,
} from '@utils/rolls/decision-provider.js';
import { BaseSocketHook } from './base-socket-hook.js';

const EDGE_BUTTON_LIFETIME_MS = 1000 * 60 * 30;

/**
 * @param {HTMLElement} container
 * @param {{ className: string, label: string, onClick: (event: MouseEvent) => void | Promise<void>, once?: boolean }} config
 * @returns {HTMLButtonElement}
 */
function appendButton(container, { className, label, onClick, once = true }) {
  const btn = document.createElement('button');
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener('click', onClick, once ? { once: true } : undefined);
  container.appendChild(btn);
  return btn;
}

export class DieChatHook extends BaseSocketHook {
  constructor() {
    super();
    Hooks.on('renderChatMessageHTML', (chatMessage, html) => {
      DieChatHook.appendEdgeButton(chatMessage, html);
      DieChatHook.renderInitiativeEdgeCard(chatMessage, html);
      DieChatHook.renderDamageDecisionCard(chatMessage, html);
      DieChatHook.renderMatrixDamageDecisionCard(chatMessage, html);
      DieChatHook.renderEffectDecisionCard(chatMessage, html);
      DieChatHook.renderPendingDialogCard(chatMessage, html);
    });
  }

  /**
   * @param {{ action: string, payload: { messageId: string } }} data
   * @returns {Promise<void>}
   */
  async _onSocketMessage(data) {
    if (data.action !== 'resolveInitiativeEdge') return;
    if (!isPrimaryGM()) return;
    const message = game.messages?.get(data.payload?.messageId);
    if (!message || message.flags?.sr4?.initiativeEdge?.resolved) return;
    await message.update({ 'flags.sr4.initiativeEdge.resolved': true });
  }

  static async appendEdgeButton(chatMessage, html) {
    const flags = chatMessage.flags?.sr4;
    if (!flags) return;

    if (!flags.actorId || !isResponsibleForActor(flags.actorId)) return;

    const actor = game.actors.get(flags.actorId);

    const {
      edgeAvailable,
      extended,
      reroll,
      isCriticalGlitch,
      isGlitch,
      successes,
      rolledDice,
      options,
      edgeDecision,
    } = flags;

    const container = html.querySelector('.roll-results') ?? html;

    if (edgeDecision) {
      DieChatHook.renderFlowEdgeDecision(chatMessage, container, actor, {
        isCriticalGlitch,
        isGlitch,
        successes,
        rolledDice,
        edgeDecision,
      });
      return;
    }

    let edgeBtn = null;
    const canExtend =
      extended && rolledDice > 1 && !isGlitch && !isCriticalGlitch && !reroll;

    if (canExtend) {
      let extBtn = null;
      let edgeExBtn = null;

      const cleanup = () => {
        extBtn?.remove();
        edgeExBtn?.remove();
        edgeBtn?.remove();
      };

      extBtn = appendButton(container, {
        className: 'extended-test-button',
        label: game.i18n.localize('sr4.roll.extendTest'),
        onClick: async () => {
          cleanup();
          await DiceUtility.followUpRoll({
            ...options,
            numDice: rolledDice - 1,
            prevSuccesses: successes,
            reroll: false,
          });
        },
      });

      if (edgeAvailable) {
        edgeExBtn = appendButton(container, {
          className: 'extended-edge-button',
          label: game.i18n.localize('sr4.roll.extendEdge'),
          onClick: async () => {
            cleanup();
            await DiceUtility.followUpRoll({
              ...options,
              numDice: rolledDice - 1 + (actor?.sheetStats.EDGE ?? 0),
              explode: true,
              prevSuccesses: successes,
              reroll: false,
            });
          },
        });
      }
    }

    if (edgeAvailable && !extended) {
      let fallbackTimer = null;
      edgeBtn = appendButton(container, {
        className: 'edge-use-button',
        label: game.i18n.localize('sr4.roll.edge.use'),
        onClick: async () => {
          clearTimeout(fallbackTimer);
          edgeBtn.remove();
          await showEdgeDialog({
            isCriticalGlitch,
            isGlitch,
            successes,
            rolledDice,
            actor,
            onComplete: () => {},
          });
        },
      });
      fallbackTimer = setTimeout(
        () => edgeBtn.remove(),
        EDGE_BUTTON_LIFETIME_MS
      );
    }
  }

  /**
   * @param {ChatMessage} chatMessage
   * @param {HTMLElement} html
   */
  static async renderInitiativeEdgeCard(chatMessage, html) {
    const info = chatMessage.flags?.sr4?.initiativeEdge;
    if (!info || info.resolved) return;
    if (!isResponsibleForActor(chatMessage.flags?.sr4?.actorId)) return;

    const actor = game.actors.get(chatMessage.flags.sr4.actorId);
    if (!actor || actor.getAttribute('CURRENTEDGE') <= 0) return;

    const combatant = game.combats
      ?.get(info.combatId)
      ?.combatants.get(info.combatantId);
    if (!combatant) return;

    const container = html.querySelector('.roll-results') ?? html;
    let fallbackTimer = null;
    const edgeBtn = appendButton(container, {
      className: 'edge-use-button',
      label: game.i18n.localize('sr4.roll.edge.use'),
      onClick: async () => {
        clearTimeout(fallbackTimer);
        edgeBtn.remove();
        if (chatMessage.isAuthor || game.user?.isGM) {
          await chatMessage.update({
            'flags.sr4.initiativeEdge.resolved': true,
          });
        } else {
          game.socket?.emit('system.shadowrun4e', {
            action: 'resolveInitiativeEdge',
            payload: { messageId: chatMessage.id },
          });
        }
        const total = await DiceUtility.followUpRoll({
          numDice: actor.getAttribute('EDGE') ?? 6,
          explode: true,
          reroll: false,
          edgeAvailable: false,
          prevSuccesses: info.successes,
          actor,
        });
        await combatant.update({
          initiative: info.base + (total ?? info.successes),
        });
      },
    });
    fallbackTimer = setTimeout(() => edgeBtn.remove(), EDGE_BUTTON_LIFETIME_MS);
  }

  /**
   * @param {ChatMessage} chatMessage
   * @param {HTMLElement} container
   * @param {import('@documents/index').SR4Actor} actor
   * @param {{ isCriticalGlitch: boolean, isGlitch: boolean, successes: number, rolledDice: number, edgeDecision: { resolved?: boolean } }} data
   */
  static renderFlowEdgeDecision(chatMessage, container, actor, data) {
    const { isCriticalGlitch, isGlitch, successes, rolledDice, edgeDecision } =
      data;
    if (edgeDecision.resolved) return;

    const entry = getEdgeDecisionEntry(chatMessage.id);
    if (!entry) return;
    if (actor.getAttribute('CURRENTEDGE') <= 0) return;

    const btnWrap = document.createElement('div');
    btnWrap.className = 'edge-offer-buttons';
    const cleanup = () => btnWrap.remove();

    appendButton(btnWrap, {
      className: 'edge-use-button',
      label: game.i18n.localize('sr4.roll.edge.use'),
      onClick: async () => {
        cleanup();
        await showEdgeDialog({
          isCriticalGlitch,
          isGlitch,
          successes,
          rolledDice,
          actor,
          onCompleteWithResult: (newSuccesses) =>
            resolveEdgeDecision(chatMessage.id, newSuccesses),
        });
        if (getEdgeDecisionEntry(chatMessage.id)) {
          await resolveEdgeDecision(chatMessage.id);
        }
      },
    });

    appendButton(btnWrap, {
      className: 'abort',
      label: game.i18n.localize('sr4.roll.edge.skip'),
      onClick: async () => {
        cleanup();
        await resolveEdgeDecision(chatMessage.id);
      },
    });

    container.appendChild(btnWrap);
  }

  /**
   * @param {ChatMessage} chatMessage
   * @param {HTMLElement} html
   */
  static renderDamageDecisionCard(chatMessage, html) {
    const decision = chatMessage.flags?.sr4?.damageDecision;
    if (!decision) return;
    if (decision.resolved) return;
    if (!isResponsibleForActor(decision.actorId)) return;

    const entry = getDamageDecisionEntry(chatMessage.id);
    if (!entry) return;

    const container = html.querySelector('.damage-decision-card') ?? html;
    const btnWrap = document.createElement('div');
    btnWrap.className = 'damage-decision-buttons';

    const cleanup = () => btnWrap.remove();

    const damageType = entry.isPhysical
      ? game.i18n.localize('sr4.damage.physical')
      : game.i18n.localize('sr4.damage.stun');

    appendButton(btnWrap, {
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
    });

    appendButton(btnWrap, {
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
    });

    container.appendChild(btnWrap);
  }

  /**
   * @param {ChatMessage} chatMessage
   * @param {HTMLElement} html
   */
  static renderMatrixDamageDecisionCard(chatMessage, html) {
    const decision = chatMessage.flags?.sr4?.matrixDamageDecision;
    if (!decision) return;
    if (decision.resolved) return;
    if (!isResponsibleForActor(decision.actorId)) return;

    const entry = getMatrixDamageDecisionEntry(chatMessage.id);
    if (!entry) return;

    const container =
      html.querySelector('.matrix-damage-decision-card') ?? html;
    const btnWrap = document.createElement('div');
    btnWrap.className = 'matrix-damage-decision-buttons';

    const cleanup = () => btnWrap.remove();

    appendButton(btnWrap, {
      className: 'apply-damage',
      label: `${game.i18n.localize('sr4.damage.apply')} (${entry.amount})`,
      onClick: async () => {
        cleanup();
        await resolveMatrixDamageDecision(chatMessage.id);
        await MatrixDamageFlow.apply(entry.amount, entry.actor, entry.context);
      },
    });

    container.appendChild(btnWrap);
  }

  /**
   * @param {ChatMessage} chatMessage
   * @param {HTMLElement} html
   */
  static renderEffectDecisionCard(chatMessage, html) {
    const decision = chatMessage.flags?.sr4?.effectDecision;
    if (!decision) return;
    if (decision.resolved) return;
    if (!isResponsibleForActor(decision.actorId)) return;

    const entry = getEffectDecisionEntry(chatMessage.id);
    if (!entry) return;

    const container = html.querySelector('.effect-decision-card') ?? html;
    const btnWrap = document.createElement('div');
    btnWrap.className = 'effect-decision-buttons';

    const cleanup = () => btnWrap.remove();

    appendButton(btnWrap, {
      className: 'apply-effects',
      label: game.i18n.localize('sr4.effect.applyToTarget'),
      onClick: async () => {
        cleanup();
        await resolveEffectDecision(chatMessage.id);
        await applySpellEffects(entry.effectData, entry.target);
      },
    });

    container.appendChild(btnWrap);
  }

  /**
   * @param {ChatMessage} chatMessage
   * @param {HTMLElement} html
   */
  static renderPendingDialogCard(chatMessage, html) {
    const decision = chatMessage.flags?.sr4?.pendingDialog;
    if (!decision) return;
    if (decision.resolved) return;
    if (!isResponsibleForActor(decision.actorId)) return;

    const entry = getPendingDialogEntry(chatMessage.id);
    if (!entry) return;

    const container = html.querySelector('.pending-dialog-card') ?? html;
    const btnWrap = document.createElement('div');
    btnWrap.className = 'pending-dialog-buttons';

    appendButton(btnWrap, {
      className: 'open-dialog',
      label: entry.i18nLabel,
      onClick: async () => {
        btnWrap.remove();
        await resolvePendingDialog(chatMessage.id);
      },
    });

    container.appendChild(btnWrap);
  }
}
