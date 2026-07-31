import { DiceUtility, emitSystemSocket, showEdgeDialog } from '@utils/index';
import {
  getEdgeDecisionEntry,
  resolveEdgeDecision,
} from '@utils/rolls/roll-edge-decision.js';
import { isResponsibleForActor } from '@utils/actor-ownership.js';
import { appendButton } from './chat-card-dom.js';

const EDGE_BUTTON_LIFETIME_MS = 1000 * 60 * 30;

/**
 * @param {ChatMessage} chatMessage
 * @param {HTMLElement} html
 */
export function appendEdgeButton(chatMessage, html) {
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
    renderFlowEdgeDecision(chatMessage, container, actor, {
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
    fallbackTimer = setTimeout(() => edgeBtn.remove(), EDGE_BUTTON_LIFETIME_MS);
  }
}

/**
 * @param {ChatMessage} chatMessage
 * @param {HTMLElement} html
 */
export function renderInitiativeEdgeCard(chatMessage, html) {
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
        await emitSystemSocket({
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
function renderFlowEdgeDecision(chatMessage, container, actor, data) {
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
