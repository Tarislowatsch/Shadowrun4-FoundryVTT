import { getGame, getValidTargetActors } from '@utils/index.js';
import {
  getSpellEffectData,
  sendEffectDecisionMessage,
} from './apply-effects-flow';

/**
 * @param {string} category
 * @param {string} spellType
 * @returns {string}
 */
function getOpposedResistAttribute(category, spellType) {
  if (category === 'ILLUSION' && spellType === 'PHYSICAL') return 'INTUITION';
  if (category === 'HEALTH') return 'BODY';
  return 'WILLPOWER';
}

export class OpposedSpellFlow {
  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @returns {Promise<void>}
   */
  static async start(caster, spell, castingHits, force) {
    const targets = OpposedSpellFlow.getTargetsOrWarn(spell);
    if (targets.length === 0) return;

    const effectData = getSpellEffectData(spell);
    const category = spell.system?.category ?? '';
    const spellType = spell.system?.type ?? 'PHYSICAL';
    const resistAttribute = getOpposedResistAttribute(category, spellType);

    for (const target of targets) {
      if (!target.id) continue;
      await OpposedSpellFlow.opposedVsTarget(
        caster,
        spell,
        castingHits,
        force,
        target,
        resistAttribute,
        effectData
      );
    }
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @param {import('@documents/index').SR4Actor} target
   * @param {string} resistAttribute
   * @param {object[]} effectData
   * @returns {Promise<void>}
   */
  static async opposedVsTarget(
    caster,
    spell,
    castingHits,
    force,
    target,
    resistAttribute,
    effectData
  ) {
    const socket = getGame().socket;
    if (!socket) return;

    const defenderId = target.id;

    const netHits = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        socket.off('system.shadowrun4e', handler);
        resolve(0);
      }, 300_000);
      const handler = (data) => {
        if (
          data.action !== 'opposedSpellResisted' ||
          data.payload?.casterId !== caster.id ||
          data.payload?.defenderId !== defenderId
        )
          return;
        clearTimeout(timeout);
        socket.off('system.shadowrun4e', handler);
        const resistHits = data.payload.resistHits;
        resolve(
          resistHits === null ? 0 : Math.max(0, castingHits - resistHits)
        );
      };
      socket.on('system.shadowrun4e', handler);
      socket.emit('system.shadowrun4e', {
        action: 'triggerOpposedSpellResist',
        payload: {
          defenderId,
          casterId: caster.id,
          spellName: spell.name,
          castingHits,
          force,
          resistAttribute,
        },
      });
    });

    if (netHits < 1) {
      ui?.notifications?.info(
        `${spell.name}: ${getGame().i18n?.localize('sr4.spell.noEffect')}`
      );
      return;
    }

    if (effectData.length > 0) {
      await sendEffectDecisionMessage(target, effectData, spell.name);
    }
  }

  /**
   * @param {import('@models/index').SR4Spell} spell
   * @returns {string}
   */
  static getResistAttribute(spell) {
    return getOpposedResistAttribute(
      spell.system?.category ?? '',
      spell.system?.type ?? 'PHYSICAL'
    );
  }

  /**
   * @param {import('@models/index').SR4Spell} spell
   * @returns {import('@documents/index').SR4Actor[]}
   */
  static getTargetsOrWarn(spell) {
    const targets = getValidTargetActors();
    if (targets.length === 0) {
      ui?.notifications?.warn(
        `${spell.name}: ${getGame().i18n?.localize('sr4.spell.noTargets')}`
      );
    }
    return targets;
  }
}
