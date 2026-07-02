import { openSpiritResistDialog } from '@utils/dialog/magic/spirit-resist.js';
import { getGame, isPrimaryGM } from '@utils/index';
import { SummoningFlow } from '@flows/summoning-flow.js';

/**
 * @typedef {object} SummoningResistPayload
 * @property {string} summonerId
 * @property {number} force
 * @property {string} spiritType
 * @property {'spirit' | 'sprite'} entityType
 */

export class SummoningHook {
  constructor() {
    this._boundHandler = this._onSocketMessage.bind(this);
    this._registerSocketHandler();
  }

  _registerSocketHandler() {
    Hooks.once('ready', () => {
      const socket = getGame().socket;
      if (!socket) return;
      socket.off('system.shadowrun4e', this._boundHandler);
      socket.on('system.shadowrun4e', this._boundHandler);
    });
  }

  /**
   * @param {{ action: string, payload: SummoningResistPayload | object }} data
   * @returns {Promise<void>}
   */
  async _onSocketMessage(data) {
    if (!isPrimaryGM()) return;

    if (
      data.action === 'triggerSpiritResist' ||
      data.action === 'triggerSpriteResist'
    ) {
      const { summonerId, force, spiritType, entityType } = data.payload ?? {};
      await openSpiritResistDialog(force, spiritType, entityType, summonerId);
      return;
    }

    if (
      data.action === 'triggerSpiritBindResist' ||
      data.action === 'triggerSpriteBindResist'
    ) {
      const { summonerId, force, spiritType, entityType } = data.payload ?? {};
      await openSpiritResistDialog(
        force,
        spiritType,
        entityType,
        summonerId,
        'bind'
      );
      return;
    }

    if (data.action === 'createSummonedEntity') {
      await SummoningFlow.createEntity(data.payload);
    }
  }
}
