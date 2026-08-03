import { isPrimaryGM } from '@utils/actor-ownership.js';
import { SYSTEM_ID } from '@utils/game/system-id.js';
import { BaseSocketHook } from './base-socket-hook.js';
import {
  appendEdgeButton,
  renderInitiativeEdgeCard,
} from './edge-offer-cards.js';
import {
  renderDamageDecisionCard,
  renderMatrixDamageDecisionCard,
  renderEffectDecisionCard,
  renderPendingDialogCard,
} from './decision-cards.js';

export class DieChatHook extends BaseSocketHook {
  constructor() {
    super();
    Hooks.on('renderChatMessageHTML', (chatMessage, html) => {
      appendEdgeButton(chatMessage, html);
      renderInitiativeEdgeCard(chatMessage, html);
      renderDamageDecisionCard(chatMessage, html);
      renderMatrixDamageDecisionCard(chatMessage, html);
      renderEffectDecisionCard(chatMessage, html);
      renderPendingDialogCard(chatMessage, html);
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
    const info = message?.getFlag(SYSTEM_ID, 'initiativeEdge');
    if (!info || info.resolved) return;
    await message.setFlag(SYSTEM_ID, 'initiativeEdge', {
      ...info,
      resolved: true,
    });
  }
}
