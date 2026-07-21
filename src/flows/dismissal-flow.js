import { getGame } from '@utils/index.js';
import { localize, rollForcedSkill } from '@utils/dialog/dialogutility.js';
import { offerEdgeRetry } from '@utils/rolls/roll-edge-decision.js';
import { calculateSummoningDrain } from '@utils/dialog/magic/summoning-helpers.js';
import {
  resolveDrain,
  calculateSummonedEntityDrainPool,
} from '@utils/dialog/magic/drain.js';
import { awaitEntityResist } from '@utils/dialog/magic/resist-actions.js';

export class DismissalFlow {
  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {'spirit' | 'sprite'} entityType
   * @returns {Promise<void>}
   */
  static async start(actor, entityType) {
    const isSprite = entityType === 'sprite';
    const skillName = isSprite ? 'decompiling' : 'banishing';
    const statKey = isSprite ? 'RESONANCE' : 'MAGIC';

    if (!actor.getAttribute(statKey)) {
      ui?.notifications?.warn(
        getGame().i18n.localize('sr4.magic.magicStatZero')
      );
      return;
    }

    const targetActor = DismissalFlow._getValidTarget(entityType);
    const forceOrRating = targetActor
      ? isSprite
        ? targetActor.system.rating
        : targetActor.system.force
      : undefined;

    const rollResult = await rollForcedSkill(actor, skillName, forceOrRating);
    if (!rollResult) return;

    const actorHits = await offerEdgeRetry(actor, rollResult);

    if (!targetActor) return;

    const ownerBonus = await DismissalFlow._resolveOwnerBonus(
      targetActor,
      entityType
    );

    const resistHits = await awaitEntityResist({
      mode: 'dismiss',
      sourceActor: actor,
      targetActor,
      forceOrRating,
      entityType,
      ownerBonus,
    });

    const netHits = rollResult.isGlitch
      ? 0
      : Math.max(0, actorHits - resistHits);

    const serviceKey = isSprite ? 'tasks' : 'services';
    const current = targetActor.system[serviceKey] ?? 0;
    const remaining = Math.max(0, current - netHits);

    if (netHits > 0) {
      await targetActor.update({ [`system.${serviceKey}`]: remaining });
      const msgKey =
        remaining === 0
          ? isSprite
            ? 'sr4.magic.spriteDissipating'
            : 'sr4.magic.spiritDeparting'
          : isSprite
            ? 'sr4.magic.decompilingSuccess'
            : 'sr4.magic.banishingSuccess';
      ui?.notifications?.info(getGame().i18n.localize(msgKey));
    } else {
      const failKey = isSprite
        ? 'sr4.magic.decompilingFailed'
        : 'sr4.magic.banishingFailed';
      ui?.notifications?.info(getGame().i18n.localize(failKey));
    }

    await DismissalFlow._handleDrain(
      actor,
      forceOrRating,
      resistHits,
      entityType
    );
  }

  /**
   * @param {'spirit' | 'sprite'} entityType
   * @returns {import('@documents/index').SR4Actor | null}
   */
  static _getValidTarget(entityType) {
    const targets = [...(getGame().user?.targets ?? [])]
      .map((t) => t.actor)
      .filter((a) => a?.type === entityType);
    return targets[0] ?? null;
  }

  /**
   * @param {import('@documents/index').SR4Actor} targetActor
   * @param {'spirit' | 'sprite'} entityType
   * @returns {Promise<number>}
   */
  static async _resolveOwnerBonus(targetActor, entityType) {
    if (targetActor.system.bound !== true) return 0;
    const ownerUuid = targetActor.system.ownerUuid;
    if (!ownerUuid) return 0;
    const owner = await fromUuid(ownerUuid);
    if (!owner) return 0;
    const statKey = entityType === 'sprite' ? 'RESONANCE' : 'MAGIC';
    return owner.getAttribute?.(statKey) ?? 0;
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {number} force
   * @param {number} resistHits
   * @param {'spirit' | 'sprite'} entityType
   * @returns {Promise<void>}
   */
  static async _handleDrain(actor, force, resistHits, entityType) {
    const isSprite = entityType === 'sprite';
    const drainValue = calculateSummoningDrain(resistHits);

    const statKey = isSprite ? 'RESONANCE' : 'MAGIC';
    const isPhysical = force > actor.getAttribute(statKey);

    const label = isSprite
      ? localize('sr4.magic.decompilingFading')
      : localize('sr4.magic.banishingDrain');

    await resolveDrain(actor, {
      label,
      force,
      drainPool: calculateSummonedEntityDrainPool(actor, entityType),
      drainValue,
      isPhysical,
    });
  }
}
