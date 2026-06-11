import {
  getGame,
  openDefenseDialog,
  openSoakDialog,
  showEdgeDialog,
} from '@utils/index';
import { ApplyDamageFlow } from './apply-damage-flow';
import { createEdgeRerollHandler } from './util/edge-reroll.handler';

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {import('@models/index').SR4Weapon} weapon
 * @param {number} successes
 * @returns {void}
 */
export function emitDefenseTrigger(actor, weapon, successes) {
  if (!weapon?.type || !getGame().user?.targets) return;
  for (const target of getGame().user.targets) {
    const defenderId = target.actor?.id;
    if (!defenderId) continue;
    getGame().socket?.emit('system.shadowrun4e', {
      action: 'triggerDefense',
      payload: {
        defenderId,
        attackerId: actor.id,
        successes,
        weapon,
      },
    });
  }
}

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {import('@models/index').SR4Weapon} weapon
 * @returns {number}
 */
function getEffectiveArmor(defender, weapon) {
  /** @type {import('@models/index').SR4BaseCharacterSystem} */
  const sys = /** @type {any} */ (defender).system;
  const base =
    weapon.system.armorType === 'impact'
      ? (sys.armor?.impact ?? 0)
      : (sys.armor?.ballistic ?? 0);
  if (weapon.system.apHalf) return Math.max(Math.floor(base / 2), 0);
  return Math.max(base + (weapon.system.ap ?? 0), 0);
}

export class DefenseFlow {
  /**
   * @param {import('@documents/index').SR4Actor} defender
   * @param {string} attackerId
   * @param {number} successes
   * @param {import('@models/index').SR4Weapon} weapon
   * @returns {Promise<void>}
   */
  static async start(defender, attackerId, successes, weapon) {
    await new DefenseFlow().handleDefenseRequest(
      defender.id,
      attackerId,
      successes,
      weapon
    );
  }

  /**
   * @param {string} defenderId
   * @param {string} attackerId
   * @param {number} successes
   * @param {import('@models/index').SR4Weapon} weapon
   * @returns {Promise<void>}
   */
  async handleDefenseRequest(defenderId, attackerId, successes, weapon) {
    if (!game.settings.get('shadowrun4e', 'combatDefenseWorkflow')) return;

    /** @type {import('@documents/index').SR4Actor | undefined} */
    const defender = getGame().actors?.get(defenderId);
    /** @type {import('@documents/index').SR4Actor | undefined} */
    const attacker = getGame().actors?.get(attackerId);
    if (!defender || !attacker) return;

    const {
      successes: rawDefenseHits,
      isGlitch,
      rolledDice,
      edgeUsed: defenseRollEdgeUsed,
    } = await openDefenseDialog(defender, attacker, successes, weapon);
    if (rawDefenseHits === null) return;

    // Offer defense Edge reroll if Edge wasn't spent in the roll and actor still has Edge
    let defenseHits = rawDefenseHits;
    if (!defenseRollEdgeUsed && defender.getAttribute('CURRENTEDGE') > 0) {
      await showEdgeDialog({
        isCriticalGlitch: false,
        isGlitch,
        successes: rawDefenseHits,
        rolledDice,
        actor: defender,
        onCompleteWithResult: (newHits) => {
          defenseHits = newHits;
        },
      });
    }

    /**
     * @param {number} resolvedDefenseHits
     * @returns {Promise<void>}
     */
    const applyAfterDefense = async (resolvedDefenseHits) => {
      const netSuccesses = Math.max(successes - resolvedDefenseHits, 0);
      if (netSuccesses === 0) return;

      const baseDamage = weapon.system.damage + netSuccesses;
      const effectiveArmor = getEffectiveArmor(defender, weapon);
      let isPhysical = weapon.system.damageType === 'physical';
      if (isPhysical && baseDamage <= effectiveArmor) isPhysical = false;

      if (!game.settings.get('shadowrun4e', 'combatSoakWorkflow')) {
        await ApplyDamageFlow.sendDecisionMessage(
          defender,
          baseDamage,
          isPhysical,
          'combat'
        );
        return;
      }

      const soakResult = await openSoakDialog(
        defender,
        baseDamage,
        isPhysical,
        effectiveArmor
      );
      if (!soakResult) return;

      const finalDamage = Math.max(baseDamage - soakResult.hits, 0);
      if (finalDamage === 0) {
        const msgs = await ApplyDamageFlow.apply(
          0,
          isPhysical,
          defender,
          'combat'
        );
        if (msgs.length > 0) await ApplyDamageFlow.sendMessages(msgs, defender);
        return;
      }

      const onReroll = soakResult.edgeUsed
        ? undefined
        : createEdgeRerollHandler(
            defender,
            {
              successes: soakResult.hits,
              rolledDice: soakResult.rolledDice,
              isGlitch: soakResult.isGlitch,
            },
            async (newSoakHits) => {
              const rerolledDamage = Math.max(baseDamage - newSoakHits, 0);
              if (rerolledDamage === 0) {
                const msgs = await ApplyDamageFlow.apply(
                  0,
                  isPhysical,
                  defender,
                  'combat'
                );
                if (msgs.length > 0)
                  await ApplyDamageFlow.sendMessages(msgs, defender);
                return;
              }
              const msgs = await ApplyDamageFlow.apply(
                rerolledDamage,
                isPhysical,
                defender,
                'combat'
              );
              if (msgs.length > 0)
                await ApplyDamageFlow.sendMessages(msgs, defender);
            }
          );

      await ApplyDamageFlow.sendDecisionMessage(
        defender,
        finalDamage,
        isPhysical,
        'combat',
        { onReroll, edgeUsed: soakResult.edgeUsed }
      );
    };

    await applyAfterDefense(defenseHits);
  }
}
