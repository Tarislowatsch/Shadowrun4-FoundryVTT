import { getGame, getValidTargetActors } from '@utils/index.js';
import { openDirectSpellAllocationDialog } from '@utils/dialog/magic/combat-spell.js';

export class CombatSpellFlow {
  /**
   * Handles the combat damage phase after a successful spellcasting roll.
   *
   * Direct spells: triggers a resistance roll on the defender's client, awaits
   * the result via socket, then opens an allocation dialog on the caster's client.
   * Each applied hit raises DV by 1 and Drain DV by 1 (SR4 p.183).
   * Returns the applied hits as drain modifier.
   *
   * Indirect spells: fires a socket event immediately; the dodge + soak flow
   * runs on the defender's client.
   *
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @returns {Promise<number>} drainModifier — added to base Drain DV (Direct only)
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
   * @returns {Promise<number>} total drain modifier across all targets
   */
  static async _handleDirect(caster, spell, castingHits, force) {
    const targets = CombatSpellFlow._getTargetsOrWarn(spell);
    if (targets.length === 0) return 0;
    const isMana = spell.system?.type === 'MANA';
    const isPhysical = spell.system?.damageType !== 'STUN';

    let maxAppliedHits = 0;
    for (const target of targets) {
      const defenderId = target.id;
      if (!defenderId) continue;
      const applied = await CombatSpellFlow._directSpellVsTarget(
        caster,
        spell.name,
        castingHits,
        force,
        isMana,
        isPhysical,
        defenderId,
        target.name ?? ''
      );
      maxAppliedHits = Math.max(maxAppliedHits, applied);
    }
    return maxAppliedHits;
  }

  /**
   * Runs the full direct-spell sequence against a single defender:
   * triggers resist roll → awaits result → allocation → damage.
   *
   * @param {import('@documents/index').SR4Actor} caster
   * @param {string} spellName
   * @param {number} castingHits
   * @param {number} force
   * @param {boolean} isMana
   * @param {boolean} isPhysical
   * @param {string} defenderId
   * @param {string} defenderName
   * @returns {Promise<number>} appliedHits
   */
  static async _directSpellVsTarget(
    caster,
    spellName,
    castingHits,
    force,
    isMana,
    isPhysical,
    defenderId,
    defenderName
  ) {
    const socket = getGame().socket;
    if (!socket) return 0;

    const netHits = await new Promise((resolve) => {
      const handler = (data) => {
        if (
          data.action !== 'directSpellResisted' ||
          data.payload?.casterId !== caster.id ||
          data.payload?.defenderId !== defenderId
        )
          return;
        socket.off('system.shadowrun4e', handler);
        const resistHits = data.payload.resistHits;
        // null means defender cancelled the dialog — treat as no effect
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
          spellName,
          castingHits,
          force,
          isMana,
        },
      });
    });

    if (netHits < 1) {
      ui?.notifications?.info(
        `${spellName}: ${getGame().i18n?.localize('sr4.spell.noEffect')}`
      );
      return 0;
    }

    const appliedHits = await openDirectSpellAllocationDialog(
      spellName,
      force,
      netHits,
      defenderName
    );

    const damage = force + appliedHits;
    socket.emit('system.shadowrun4e', {
      action: 'applyDirectSpellDamage',
      payload: {
        defenderId,
        casterId: caster.id,
        spellName,
        damage,
        isPhysical,
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
