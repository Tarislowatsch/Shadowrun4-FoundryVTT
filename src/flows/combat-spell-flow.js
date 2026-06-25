import { getGame, getValidTargetActors } from '@utils/index.js';
import { openDirectSpellAllocationDialog } from '@utils/dialog/magic/combat-spell.js';
import { getSpellEffectData } from './apply-effects-flow';

export class CombatSpellFlow {
  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @returns {Promise<number>}
   */
  static async start(caster, spell, castingHits, force) {
    if (!game.settings.get('shadowrun4e', 'spellWorkflow')) return 0;

    const combatType = spell.system?.combatType ?? 'DIRECT';

    if (combatType === 'DIRECT') {
      return CombatSpellFlow._handleDirect(caster, spell, castingHits, force);
    }
    return CombatSpellFlow._handleIndirect(caster, spell, castingHits, force);
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @returns {Promise<number>}
   */
  static async _handleDirect(caster, spell, castingHits, force) {
    const targets = CombatSpellFlow._getTargetsOrWarn(spell);
    if (targets.length === 0) return 0;

    let maxAppliedHits = 0;
    for (const target of targets) {
      if (!target.id) continue;
      const applied = await CombatSpellFlow._directSpellVsTarget(
        caster,
        spell,
        castingHits,
        force,
        target
      );
      maxAppliedHits = Math.max(maxAppliedHits, applied);
    }
    return maxAppliedHits;
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @param {import('@documents/index').SR4Actor} target
   * @returns {Promise<number>}
   */
  static async _directSpellVsTarget(caster, spell, castingHits, force, target) {
    const socket = getGame().socket;
    if (!socket) return 0;

    const defenderId = target.id;
    const isMana = spell.system?.type === 'MANA';

    const netHits = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        socket.off('system.shadowrun4e', handler);
        resolve(0);
      }, 300_000);
      const handler = (data) => {
        if (
          data.action !== 'directSpellResisted' ||
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
        action: 'triggerDirectSpellResist',
        payload: {
          defenderId,
          casterId: caster.id,
          spellName: spell.name,
          castingHits,
          force,
          isMana,
        },
      });
    });

    if (netHits < 1) {
      ui?.notifications?.info(
        `${spell.name}: ${getGame().i18n?.localize('sr4.spell.noEffect')}`
      );
      return 0;
    }

    const appliedHits = await openDirectSpellAllocationDialog(
      spell.name,
      force,
      netHits,
      target.name ?? ''
    );

    const isPhysical = spell.system?.damageType !== 'STUN';
    const effects = getSpellEffectData(spell);
    socket.emit('system.shadowrun4e', {
      action: 'applyDirectSpellDamage',
      payload: {
        defenderId,
        casterId: caster.id,
        spellName: spell.name,
        damage: force + appliedHits,
        isPhysical,
        effects,
      },
    });

    return appliedHits;
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @returns {Promise<number>}
   */
  static async _handleIndirect(caster, spell, castingHits, force) {
    const targets = CombatSpellFlow._getTargetsOrWarn(spell);
    if (targets.length === 0) return 0;

    const spellSnapshot = spell.toObject();
    for (const target of targets) {
      const defenderId = target.id;
      if (!defenderId) continue;
      getGame().socket?.emit('system.shadowrun4e', {
        action: 'triggerIndirectSpellDefense',
        payload: {
          defenderId,
          casterId: caster.id,
          spell: spellSnapshot,
          castingHits,
          force,
        },
      });
    }

    return 0;
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {{ target: import('@documents/index').SR4Actor, hits: number }[]} perTargetHits
   * @param {number} force
   * @returns {Promise<number>}
   */
  static async startPerTarget(caster, spell, perTargetHits, force) {
    if (!game.settings.get('shadowrun4e', 'spellWorkflow')) return 0;
    const combatType = spell.system?.combatType ?? 'DIRECT';

    if (combatType === 'DIRECT') {
      let maxAppliedHits = 0;
      for (const { target, hits } of perTargetHits) {
        if (!target.id) continue;
        const applied = await CombatSpellFlow._directSpellVsTarget(
          caster,
          spell,
          hits,
          force,
          target
        );
        maxAppliedHits = Math.max(maxAppliedHits, applied);
      }
      return maxAppliedHits;
    }

    const spellSnapshot = spell.toObject();
    for (const { target, hits } of perTargetHits) {
      const defenderId = target.id;
      if (!defenderId) continue;
      getGame().socket?.emit('system.shadowrun4e', {
        action: 'triggerIndirectSpellDefense',
        payload: {
          defenderId,
          casterId: caster.id,
          spell: spellSnapshot,
          castingHits: hits,
          force,
        },
      });
    }
    return 0;
  }

  /**
   * @param {import('@models/index').SR4Spell} spell
   * @returns {import('@documents/index').SR4Actor[]}
   */
  static _getTargetsOrWarn(spell) {
    const targets = getValidTargetActors();
    if (targets.length === 0) {
      ui?.notifications?.warn(
        `${spell.name}: ${getGame().i18n?.localize('sr4.spell.noTargets')}`
      );
    }
    return targets;
  }
}
