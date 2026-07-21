import { openSpiritResistDialog } from '@utils/dialog/magic/spirit-resist.js';
import { isPrimaryGM } from '@utils/index';
import {
  requestReactiveDecision,
  DecisionCategory,
  DecisionKind,
  DecisionRouting,
} from '@utils/rolls/decision-provider.js';
import { SummoningFlow } from '@flows/summoning-flow.js';
import { BaseSocketHook } from './base-socket-hook.js';

/**
 * @typedef {object} SummoningResistPayload
 * @property {string} summonerId
 * @property {number} force
 * @property {string} spiritType
 * @property {'spirit' | 'sprite'} entityType
 */

export class SummoningHook extends BaseSocketHook {
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
      await requestReactiveDecision({
        category: DecisionCategory.MAGIC,
        dialogKind: DecisionKind.SPIRIT_RESIST,
        routing: DecisionRouting.GM,
        openDialog: () =>
          openSpiritResistDialog(force, spiritType, entityType, summonerId),
      });
      return;
    }

    if (
      data.action === 'triggerSpiritBindResist' ||
      data.action === 'triggerSpriteBindResist'
    ) {
      const { summonerId, force, spiritType, entityType } = data.payload ?? {};
      await requestReactiveDecision({
        category: DecisionCategory.MAGIC,
        dialogKind: DecisionKind.SPIRIT_BIND_RESIST,
        routing: DecisionRouting.GM,
        openDialog: () =>
          openSpiritResistDialog(
            force,
            spiritType,
            entityType,
            summonerId,
            'bind'
          ),
      });
      return;
    }

    if (
      data.action === 'triggerSpiritBanishResist' ||
      data.action === 'triggerSpriteDecompileResist'
    ) {
      const { summonerId, force, spiritType, entityType, ownerBonus } =
        data.payload ?? {};
      await requestReactiveDecision({
        category: DecisionCategory.MAGIC,
        dialogKind: DecisionKind.SPIRIT_BIND_RESIST,
        routing: DecisionRouting.GM,
        openDialog: () =>
          openSpiritResistDialog(
            force,
            spiritType,
            entityType,
            summonerId,
            'dismiss',
            ownerBonus
          ),
      });
      return;
    }

    if (data.action === 'createSummonedEntity') {
      await SummoningFlow.createEntity(data.payload);
    }
  }
}
