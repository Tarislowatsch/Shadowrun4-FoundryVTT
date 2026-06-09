import { DiceUtility, showEdgeDialog } from '@utils/index';

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
    });
  }

  static async appendEdgeButton(chatMessage, html) {
    const flags = chatMessage.flags?.sr4;
    if (!flags) return;

    const actor = flags.actorId ? game.actors.get(flags.actorId) : null;

    const isOwner = actor
      ? actor.testUserPermission(game.user, 'OWNER')
      : false;

    if (!isOwner) return;

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
      extBtn.textContent = 'Extend Test';
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
        edgeExBtn.textContent = 'Extend + Edge';
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
      edgeBtn.textContent = 'Edge verwenden';
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
}
