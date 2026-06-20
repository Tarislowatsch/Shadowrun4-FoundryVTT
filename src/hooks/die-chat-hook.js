import {
  DiceUtility,
  showEdgeDialog,
  openModifyDamageDialog,
} from '@utils/index';
import {
  getEdgeOfferEntry,
  resolveEdgeOffer,
} from '@utils/rolls/edge-offer-card.js';
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
      DieChatHook.renderEdgeOfferCard(chatMessage, html);
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
    } = flags;

    const container = html.querySelector('.roll-results') ?? html;

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
   * Renders Edge offer card buttons for non-blocking edge prompts.
   * Only the responsible player sees active buttons; resolved cards
   * show no buttons. After reload the registry is empty so no stale
   * buttons appear.
   *
   * @param {ChatMessage} chatMessage
   * @param {HTMLElement} html
   */
  static renderEdgeOfferCard(chatMessage, html) {
    const offer = chatMessage.flags?.sr4?.edgeOffer;
    if (!offer) return;
    if (offer.resolved) return;
    if (!isResponsibleForActor(offer.actorId)) return;

    const entry = getEdgeOfferEntry(chatMessage.id);
    if (!entry) return;
    if (entry.actor.getAttribute('CURRENTEDGE') <= 0) return;

    const container = html.querySelector('.edge-offer-card') ?? html;
    const btnWrap = document.createElement('div');
    btnWrap.className = 'edge-offer-buttons';

    const cleanup = () => btnWrap.remove();

    if (offer.isCriticalGlitch || offer.isGlitch) {
      const glitchBtn = document.createElement('button');
      glitchBtn.className = 'glitch';
      glitchBtn.textContent = game.i18n.localize(
        offer.isCriticalGlitch
          ? 'sr4.roll.edge.criticalGlitch'
          : 'sr4.roll.edge.glitch'
      );
      glitchBtn.addEventListener(
        'click',
        async () => {
          if (entry.actor.getAttribute('CURRENTEDGE') <= 0) {
            cleanup();
            await resolveEdgeOffer(chatMessage.id);
            return;
          }
          cleanup();
          await entry.actor.useEdge();
          await resolveEdgeOffer(chatMessage.id);
          await entry.onReroll(0);
        },
        { once: true }
      );
      btnWrap.appendChild(glitchBtn);
    } else {
      const rerollBtn = document.createElement('button');
      rerollBtn.className = 'reroll-failure';
      rerollBtn.textContent = game.i18n.localize('sr4.roll.edge.reroll');
      rerollBtn.addEventListener(
        'click',
        async () => {
          if (entry.actor.getAttribute('CURRENTEDGE') <= 0) {
            cleanup();
            await resolveEdgeOffer(chatMessage.id);
            return;
          }
          cleanup();
          const failedDice = offer.rolledDice - offer.successes;
          if (failedDice <= 0) {
            await entry.actor.useEdge();
            await resolveEdgeOffer(chatMessage.id);
            await entry.onReroll(offer.successes);
            return;
          }
          const result = await DiceUtility.followUpRoll({
            numDice: failedDice,
            explode: false,
            reroll: true,
            edgeAvailable: false,
            prevSuccesses: offer.successes,
          });
          await entry.actor.useEdge();
          await resolveEdgeOffer(chatMessage.id);
          await entry.onReroll(result ?? offer.successes);
        },
        { once: true }
      );
      btnWrap.appendChild(rerollBtn);

      const addDiceBtn = document.createElement('button');
      addDiceBtn.className = 'add-edge-dice';
      addDiceBtn.textContent = game.i18n.localize('sr4.roll.edge.add-dice');
      addDiceBtn.addEventListener(
        'click',
        async () => {
          if (entry.actor.getAttribute('CURRENTEDGE') <= 0) {
            cleanup();
            await resolveEdgeOffer(chatMessage.id);
            return;
          }
          cleanup();
          const result = await DiceUtility.followUpRoll({
            numDice: entry.actor.getAttribute('EDGE') ?? 6,
            explode: true,
            reroll: true,
            edgeAvailable: false,
            prevSuccesses: offer.successes,
          });
          await entry.actor.useEdge();
          await resolveEdgeOffer(chatMessage.id);
          await entry.onReroll(result ?? offer.successes);
        },
        { once: true }
      );
      btnWrap.appendChild(addDiceBtn);
    }

    const skipBtn = document.createElement('button');
    skipBtn.className = 'abort';
    skipBtn.textContent = game.i18n.localize('sr4.roll.edge.skip');
    skipBtn.addEventListener(
      'click',
      async () => {
        cleanup();
        await resolveEdgeOffer(chatMessage.id);
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
