import { resolveEdgeForRoll } from '@utils/rolls/roll-edge-decision.js';
import { getGame } from '@utils/game/game.js';

const RESIST_CONFIG = {
  summon: {
    spirit: {
      triggerAction: 'triggerSpiritResist',
      resistedAction: 'spiritResisted',
      titleKey: 'sr4.magic.spiritResist',
      labelKey: 'sr4.magic.spiritResistLabel',
    },
    sprite: {
      triggerAction: 'triggerSpriteResist',
      resistedAction: 'spriteResisted',
      titleKey: 'sr4.magic.spriteResist',
      labelKey: 'sr4.magic.spriteResistLabel',
    },
  },
  bind: {
    spirit: {
      triggerAction: 'triggerSpiritBindResist',
      resistedAction: 'spiritBindResisted',
      titleKey: 'sr4.magic.spiritBindResist',
      labelKey: 'sr4.magic.spiritBindResistLabel',
    },
    sprite: {
      triggerAction: 'triggerSpriteBindResist',
      resistedAction: 'spriteBindResisted',
      titleKey: 'sr4.magic.spriteBindResist',
      labelKey: 'sr4.magic.spriteBindResistLabel',
    },
  },
};

/**
 * @param {'summon' | 'bind'} mode
 * @param {'spirit' | 'sprite'} entityType
 * @returns {{ triggerAction: string, resistedAction: string, titleKey: string, labelKey: string }}
 */
export function getResistConfig(mode, entityType) {
  return RESIST_CONFIG[mode][entityType];
}

/**
 * @param {{
 *   defender: import('@documents/index').SR4Actor,
 *   result: { successes: number, isGlitch: boolean, edgeUsed: boolean, messageId: string | null } | null,
 *   rolledDice: number,
 *   castingHits: number,
 *   socketAction: string,
 *   casterId: string,
 * }} options
 * @returns {Promise<void>}
 */
export async function resolveAndEmitSpellResist({
  defender,
  result,
  rolledDice,
  castingHits,
  socketAction,
  casterId,
}) {
  let resistHits = null;
  if (result) {
    resistHits = await resolveEdgeForRoll(
      defender,
      {
        successes: result.successes,
        rolledDice,
        isGlitch: result.isGlitch,
        edgeUsed: result.edgeUsed,
        messageId: result.messageId,
      },
      castingHits
    );
  }

  getGame().socket?.emit('system.shadowrun4e', {
    action: socketAction,
    payload: {
      casterId,
      defenderId: defender.id,
      resistHits,
    },
  });
}
