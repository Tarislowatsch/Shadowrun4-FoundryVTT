import { awaitOpposedSocketResponse, getGame } from '@utils/index.js';
import { localize, rollForcedSkill } from '@utils/dialog/dialogutility.js';
import { offerEdgeRetry } from '@utils/rolls/roll-edge-decision.js';
import { calculateSummoningDrain } from '@utils/dialog/magic/summoning-helpers.js';
import {
  resolveDrain,
  calculateSummonedEntityDrainPool,
} from '@utils/dialog/magic/drain.js';
import { getResistConfig } from '@utils/dialog/magic/resist-actions.js';

export class BindingFlow {
  /**
   * @param {import('@documents/index').SR4Actor} summonerActor
   * @param {import('@documents/index').SR4Actor} targetActor
   * @returns {Promise<void>}
   */
  static async start(summonerActor, targetActor) {
    const entityType = targetActor.type;
    const isSprite = entityType === 'sprite';
    const isRebind = targetActor.system.bound === true;

    if (
      !isRebind &&
      BindingFlow._boundCount(summonerActor, entityType) >=
        (summonerActor.getAttribute('CHARISMA') ?? 0)
    ) {
      ui?.notifications?.warn(
        getGame().i18n.localize('sr4.magic.bindLimitReached')
      );
      return;
    }

    const forceOrRating = isSprite
      ? targetActor.system.rating
      : targetActor.system.force;
    const skillName = isSprite ? 'registering' : 'binding';

    const rollResult = await rollForcedSkill(
      summonerActor,
      skillName,
      forceOrRating
    );
    if (!rollResult) return;

    const summonerHits = await offerEdgeRetry(summonerActor, rollResult);

    const resistHits = await BindingFlow._awaitTargetResist(
      summonerActor,
      targetActor,
      forceOrRating,
      entityType
    );

    const netHits = rollResult.isGlitch
      ? 0
      : Math.max(0, summonerHits - resistHits);

    if (netHits > 0) {
      const serviceKey = isSprite ? 'tasks' : 'services';
      const currentServices = targetActor.system[serviceKey] ?? 0;
      // The first net hit forms the bond itself and only counts toward
      // services on a rebind, where the bond already exists.
      const servicesGained = isRebind ? netHits : netHits - 1;
      await targetActor.update({
        'system.bound': true,
        [`system.${serviceKey}`]: currentServices + servicesGained,
      });
      const msgKey = isSprite
        ? 'sr4.magic.spriteRegistered'
        : 'sr4.magic.spiritBound';
      ui?.notifications?.info(getGame().i18n.localize(msgKey));
    } else {
      const failKey = isSprite
        ? 'sr4.magic.registeringFailed'
        : 'sr4.magic.bindingFailed';
      ui?.notifications?.info(getGame().i18n.localize(failKey));
    }

    await BindingFlow._handleDrain(
      summonerActor,
      forceOrRating,
      resistHits,
      entityType
    );
  }

  /**
   * @param {import('@documents/index').SR4Actor} summonerActor
   * @param {import('@documents/index').SR4Actor} targetActor
   * @param {number} forceOrRating
   * @param {'spirit' | 'sprite'} entityType
   * @returns {Promise<number>}
   */
  static async _awaitTargetResist(
    summonerActor,
    targetActor,
    forceOrRating,
    entityType
  ) {
    const { triggerAction, resistedAction } = getResistConfig(
      'bind',
      entityType
    );

    return awaitOpposedSocketResponse({
      triggerAction,
      triggerPayload: {
        summonerId: summonerActor.id,
        force: forceOrRating,
        spiritType: targetActor.name,
        entityType,
      },
      matchAction: resistedAction,
      matches: (payload) => payload?.summonerId === summonerActor.id,
      onMatch: (payload) => payload.resistHits ?? 0,
      fallback: 0,
    });
  }

  /**
   * @param {import('@documents/index').SR4Actor} summonerActor
   * @param {'spirit' | 'sprite'} entityType
   * @returns {number}
   */
  static _boundCount(summonerActor, entityType) {
    return (
      getGame().actors?.filter(
        (a) =>
          a.type === entityType &&
          a.system?.ownerUuid === summonerActor.uuid &&
          a.system?.bound === true
      ).length ?? 0
    );
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {number} force
   * @param {number} spiritHits
   * @param {'spirit' | 'sprite'} entityType
   * @returns {Promise<void>}
   */
  static async _handleDrain(actor, force, spiritHits, entityType) {
    const isSprite = entityType === 'sprite';
    const drainValue = calculateSummoningDrain(spiritHits);

    const statKey = isSprite ? 'RESONANCE' : 'MAGIC';
    const isPhysical = force > actor.getAttribute(statKey);

    const label = isSprite
      ? localize('sr4.magic.registeringFading')
      : localize('sr4.magic.bindingDrain');

    await resolveDrain(actor, {
      label,
      force,
      drainPool: calculateSummonedEntityDrainPool(actor, entityType),
      drainValue,
      isPhysical,
    });
  }
}
