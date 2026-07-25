import { getGame } from '@utils/index.js';
import { awaitEntityResist } from '@domains/magic/dialogs/resist-actions.js';
import {
  resolveSpiritDrain,
  resolveSpiritServiceRoll,
} from '../dialogs/index.js';

export class DismissalFlow {
  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {'spirit' | 'sprite'} entityType
   * @returns {Promise<void>}
   */
  static async start(actor, entityType) {
    const isSprite = entityType === 'sprite';
    const skillName = isSprite ? 'decompiling' : 'banishing';
    const magicRating = isSprite
      ? actor.getAttribute('RESONANCE')
      : actor.getSpellpower();

    if (!magicRating) {
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

    const result = await resolveSpiritServiceRoll(
      actor,
      skillName,
      forceOrRating,
      async () => {
        if (!targetActor) return null;
        const ownerBonus = await DismissalFlow._resolveOwnerBonus(
          targetActor,
          entityType
        );
        return awaitEntityResist({
          mode: 'dismiss',
          sourceActor: actor,
          targetActor,
          forceOrRating,
          entityType,
          ownerBonus,
        });
      }
    );
    if (!result) return;
    const { resistHits, netHits } = result;

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

    await resolveSpiritDrain(actor, forceOrRating, resistHits, entityType, {
      spiritLabelKey: 'sr4.magic.banishingDrain',
      spriteLabelKey: 'sr4.magic.decompilingFading',
    });
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
    return (
      (entityType === 'sprite'
        ? owner.getAttribute?.('RESONANCE')
        : owner.getSpellpower?.()) ?? 0
    );
  }
}
