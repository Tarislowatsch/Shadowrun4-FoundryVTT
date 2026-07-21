import { resolveEdgeForRoll } from '@utils/rolls/roll-edge-decision.js';
import { getGame } from '@utils/game/game.js';
import { awaitOpposedSocketResponse } from '@utils/game/opposed-socket-wait.js';
import { DiceUtility } from '@utils/rolls/diceutility.js';
import { standardAutoRollPool, localize } from '../dialogutility';

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
  dismiss: {
    spirit: {
      triggerAction: 'triggerSpiritBanishResist',
      resistedAction: 'spiritBanishResisted',
      titleKey: 'sr4.magic.spiritBanishResist',
      labelKey: 'sr4.magic.spiritBanishResistLabel',
    },
    sprite: {
      triggerAction: 'triggerSpriteDecompileResist',
      resistedAction: 'spriteDecompileResisted',
      titleKey: 'sr4.magic.spriteDecompileResist',
      labelKey: 'sr4.magic.spriteDecompileResistLabel',
    },
  },
};

/**
 * @param {'summon' | 'bind' | 'dismiss'} mode
 * @param {'spirit' | 'sprite'} entityType
 * @returns {{ triggerAction: string, resistedAction: string, titleKey: string, labelKey: string }}
 */
export function getResistConfig(mode, entityType) {
  return RESIST_CONFIG[mode][entityType];
}

/**
 * @param {{
 *   mode: 'summon' | 'bind' | 'dismiss',
 *   sourceActor: import('@documents/index').SR4Actor,
 *   targetActor: import('@documents/index').SR4Actor,
 *   forceOrRating: number,
 *   entityType: 'spirit' | 'sprite',
 *   ownerBonus?: number,
 * }} opts
 * @returns {Promise<number>}
 */
export async function awaitEntityResist({
  mode,
  sourceActor,
  targetActor,
  forceOrRating,
  entityType,
  ownerBonus = 0,
}) {
  const { triggerAction, resistedAction } = getResistConfig(mode, entityType);
  return awaitOpposedSocketResponse({
    triggerAction,
    triggerPayload: {
      summonerId: sourceActor.id,
      force: forceOrRating,
      spiritType: targetActor.name,
      entityType,
      ownerBonus,
    },
    matchAction: resistedAction,
    matches: (payload) => payload?.summonerId === sourceActor.id,
    onMatch: (payload) => payload.resistHits ?? 0,
    fallback: 0,
  });
}

/**
 * @param {boolean} isMana
 * @returns {'WILLPOWER' | 'BODY'}
 */
export function directSpellResistAttribute(isMana) {
  return isMana ? 'WILLPOWER' : 'BODY';
}

/**
 * @param {string} resistAttribute
 * @returns {string}
 */
export function localizeResistAttribute(resistAttribute) {
  return localize(`sr4.stats.${resistAttribute}`);
}

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {string} resistAttribute
 * @returns {number}
 */
export function spellResistPool(defender, resistAttribute) {
  const base = defender.getAttribute(resistAttribute) ?? 0;
  const counterspelling =
    defender.getSkill('counterspelling')?.system?.rating ?? 0;
  return base + counterspelling;
}

/**
 * @param {{
 *   defender: import('@documents/index').SR4Actor,
 *   resistAttribute: string,
 *   label: string,
 *   castingHits: number,
 *   socketAction: string,
 *   casterUuid: string,
 * }} options
 * @returns {Promise<void>}
 */
export async function autoResolveSpellResist({
  defender,
  resistAttribute,
  label,
  castingHits,
  socketAction,
  casterUuid,
}) {
  const resistPool = spellResistPool(defender, resistAttribute);
  const numDice = standardAutoRollPool(defender, resistPool);
  const { successes, isGlitch, messageId } = await DiceUtility.rollAndShow({
    numDice,
    explode: false,
    edgeAvailable: false,
    actor: defender,
    skillName: label,
  });
  await resolveAndEmitSpellResist({
    defender,
    result: { successes, isGlitch, edgeUsed: false, messageId },
    rolledDice: numDice,
    castingHits,
    socketAction,
    casterUuid,
  });
}

/**
 * @param {{
 *   defender: import('@documents/index').SR4Actor,
 *   result: { successes: number, isGlitch: boolean, edgeUsed: boolean, messageId: string | null } | null,
 *   rolledDice: number,
 *   castingHits: number,
 *   socketAction: string,
 *   casterUuid: string,
 * }} options
 * @returns {Promise<void>}
 */
export async function resolveAndEmitSpellResist({
  defender,
  result,
  rolledDice,
  castingHits,
  socketAction,
  casterUuid,
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
      casterUuid,
      defenderUuid: /** @type {any} */ (defender).uuid,
      resistHits,
    },
  });
}
