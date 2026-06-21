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
import { isResponsibleForActor } from '@utils/actor-ownership.js';

/**
 * Registers the renderChatMessageHTML hook that injects Edge / extended-test
 * buttons into SR4 roll messages — only for the owning user.
 *
 * Call once during system initialisation:
 *   import { registerDiceChatHooks } from './dice-chat-hooks.js';
 *   registerDiceChatHooks();
 *
 * @returns {void}
 */
export class DieChatHook {
  constructor() {
    Hooks.on('renderChatMessageHTML', (chatMessage, html) => {
      DieChatHook.appendEdgeButton(chatMessage, html);
      DieChatHook.renderDamageDecisionCard(chatMessage, html);
    });
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

    const canExtend =
      extended && rolledDice > 1 && !isGlitch && !isCriticalGlitch && !reroll;

    if (canExtend) {
      const extBtn = document.createElement('button');
      extBtn.className = 'extended-test-button';
      extBtn.textContent = game.i18n.localize('sr4.roll.extendTest');
      container.appendChild(extBtn);

      let edgeExBtn = null;

      const cleanup = () => {
        extBtn.remove();
        edgeExBtn?.remove();
        edgeBtn?.remove();
      };

      extBtn.addEventListener(
        'click',
        async () => {
          cleanup();
          await DiceUtility.followUpRoll({
            ...options,
            numDice: rolledDice - 1,
            prevSuccesses: successes,
            reroll: false,
          });
        },
        { once: true }
      );

      if (edgeAvailable) {
        edgeExBtn = document.createElement('button');
        edgeExBtn.className = 'extended-edge-button';
        edgeExBtn.textContent = game.i18n.localize('sr4.roll.extendEdge');
        container.appendChild(edgeExBtn);

        edgeExBtn.addEventListener(
          'click',
          async () => {
            cleanup();
            await DiceUtility.followUpRoll({
              ...options,
              numDice: rolledDice - 1 + (actor?.sheetStats.EDGE ?? 0),
              explode: true,
              prevSuccesses: successes,
              reroll: false,
            });
          },
          { once: true }
        );
      }
    }

    let edgeBtn = null;

    if (edgeAvailable && !extended) {
      edgeBtn = document.createElement('button');
      edgeBtn.className = 'edge-use-button';
      edgeBtn.textContent = game.i18n.localize('sr4.roll.edge.use');
      container.appendChild(edgeBtn);

      const fallbackTimer = setTimeout(() => edgeBtn.remove(), 1000 * 60 * 30);

      edgeBtn.addEventListener(
        'click',
        async () => {
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
        { once: true }
      );
    }
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

    const edgeBtn = document.createElement('button');
    edgeBtn.className = 'edge-use-button';
    edgeBtn.textContent = game.i18n.localize('sr4.roll.edge.use');
    edgeBtn.addEventListener(
      'click',
      async () => {
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
        // Modal aborted without spending Edge → continue with the original hits.
        if (getEdgeDecisionEntry(chatMessage.id)) {
          await resolveEdgeDecision(chatMessage.id);
        }
      },
      { once: true }
    );
    btnWrap.appendChild(edgeBtn);

    const skipBtn = document.createElement('button');
    skipBtn.className = 'abort';
    skipBtn.textContent = game.i18n.localize('sr4.roll.edge.skip');
    skipBtn.addEventListener(
      'click',
      async () => {
        cleanup();
        await resolveEdgeDecision(chatMessage.id);
      },
      { once: true }
    );
    btnWrap.appendChild(skipBtn);

    container.appendChild(btnWrap);
  }

  /**
   * Renders Apply / Modify buttons on damage decision chat cards.
   *
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

    const applyBtn = document.createElement('button');
    applyBtn.className = 'apply-damage';
    applyBtn.textContent = `${game.i18n.localize('sr4.damage.apply')} (${entry.amount} ${damageType})`;
    applyBtn.addEventListener(
      'click',
      async () => {
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
      { once: true }
    );
    btnWrap.appendChild(applyBtn);

    const modifyBtn = document.createElement('button');
    modifyBtn.className = 'modify-damage';
    modifyBtn.textContent = game.i18n.localize('sr4.damage.modify');
    modifyBtn.addEventListener('click', async () => {
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
    });
    btnWrap.appendChild(modifyBtn);

    container.appendChild(btnWrap);
  }
}
