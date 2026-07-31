import {
  awaitOpposedSocketResponse,
  emitSystemSocket,
  getEffectiveDrainModifier,
  getGame,
  localize,
} from '@utils/index';
import { getResistConfig } from '@domains/magic/dialogs/resist-actions.js';
import {
  resolveDrain,
  resolveSpiritDrain,
  calculateSummonedEntityDrainPool,
  openSummoningDialog,
  loadCompendiumTemplates,
  resolveSpiritServiceRoll,
} from '../dialogs/index.js';
import {
  buildCritterActorData,
  buildDefaultSheetStats,
} from '@importer/character/build-critter.js';

const WATCHER_FORCE = 1;

export class SummoningFlow {
  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {'spirit' | 'sprite'} entityType
   * @returns {Promise<void>}
   */
  static async start(actor, entityType) {
    const isSprite = entityType === 'sprite';

    const statValue = isSprite
      ? actor.getAttribute('RESONANCE')
      : actor.getEffectiveMagic();
    if (!statValue) {
      ui?.notifications?.error(
        getGame().i18n?.localize('sr4.magic.magicStatZero')
      );
      return;
    }

    const selection = await openSummoningDialog(actor, entityType);
    if (!selection) return;

    const { spiritType, force, templateItem } = selection;

    const skillName = isSprite ? 'compiling' : 'summoning';
    const result = await resolveSpiritServiceRoll(actor, skillName, force, () =>
      SummoningFlow._awaitSpiritResist(actor, force, spiritType, entityType)
    );
    if (!result) return;
    const { resistHits: spiritHits, netHits } = result;

    if (netHits > 0) {
      await SummoningFlow._requestEntityCreation(
        actor,
        entityType,
        spiritType,
        force,
        netHits,
        templateItem
      );
      const msgKey = isSprite
        ? 'sr4.magic.spriteCompiled'
        : 'sr4.magic.spiritSummoned';
      const msgParam = isSprite ? '{tasks}' : '{services}';
      ui?.notifications?.info(
        getGame().i18n.localize(msgKey).replace(msgParam, String(netHits))
      );
    } else {
      const failKey = isSprite
        ? 'sr4.magic.compilingFailed'
        : 'sr4.magic.summoningFailed';
      ui?.notifications?.info(getGame().i18n.localize(failKey));
    }

    await resolveSpiritDrain(actor, force, spiritHits, entityType, {
      spiritLabelKey: 'sr4.magic.summoningDrain',
      spriteLabelKey: 'sr4.magic.compilingFading',
    });
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @returns {Promise<void>}
   */
  static async startWatcher(actor) {
    if (!actor.getEffectiveMagic()) {
      ui?.notifications?.error(
        getGame().i18n?.localize('sr4.magic.magicStatZero')
      );
      return;
    }

    const result = await resolveSpiritServiceRoll(
      actor,
      'summoning',
      WATCHER_FORCE,
      () => 0
    );
    if (!result || result.netHits < 1) {
      ui?.notifications?.info(
        getGame().i18n.localize('sr4.magic.summoningFailed')
      );
      return;
    }
    const { netHits: hours } = result;

    const templateMap = await loadCompendiumTemplates('spirit');
    const templateItem = templateMap?.get('Watcher') ?? null;

    await SummoningFlow._requestEntityCreation(
      actor,
      'spirit',
      'Watcher',
      WATCHER_FORCE,
      hours,
      templateItem
    );

    ui?.notifications?.info(
      getGame()
        .i18n.localize('sr4.magic.watcherSummoned')
        .replace('{hours}', String(hours))
    );

    await resolveDrain(actor, {
      label: localize('sr4.magic.watcherDrain'),
      force: WATCHER_FORCE,
      drainPool: calculateSummonedEntityDrainPool(actor, 'spirit'),
      drainValue: hours + getEffectiveDrainModifier(actor),
      isPhysical: false,
    });
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {number} force
   * @param {string} spiritType
   * @param {'spirit' | 'sprite'} entityType
   * @returns {Promise<number>}
   */
  static async _awaitSpiritResist(actor, force, spiritType, entityType) {
    const { triggerAction, resistedAction } = getResistConfig(
      'summon',
      entityType
    );

    return awaitOpposedSocketResponse({
      triggerAction,
      triggerPayload: { summonerId: actor.id, force, spiritType, entityType },
      matchAction: resistedAction,
      matches: (payload) => payload?.summonerId === actor.id,
      onMatch: (payload) => payload.resistHits ?? 0,
      fallback: 0,
    });
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {'spirit' | 'sprite'} entityType
   * @param {string} spiritType
   * @param {number} force
   * @param {number} services
   * @param {object | null} templateItem
   * @returns {Promise<void>}
   */
  static async _requestEntityCreation(
    actor,
    entityType,
    spiritType,
    force,
    services,
    templateItem
  ) {
    await emitSystemSocket({
      action: 'createSummonedEntity',
      payload: {
        ownerUuid: actor.uuid,
        entityType,
        spiritType,
        force,
        services,
        templateSystem: templateItem?.system ?? null,
        templateImg: templateItem?.img ?? null,
      },
    });
  }

  /**
   * @param {{ ownerUuid: string, entityType: 'spirit' | 'sprite', spiritType: string, force: number, services: number, templateSystem: object | null }} payload
   * @returns {Promise<void>}
   */
  static async createEntity({
    ownerUuid,
    entityType,
    spiritType,
    force,
    services,
    templateSystem,
    templateImg,
  }) {
    const isSprite = entityType === 'sprite';

    let actorData;
    if (templateSystem) {
      actorData = await buildCritterActorData(
        templateSystem,
        spiritType,
        force
      );
      if (templateImg) actorData.img = templateImg;
    } else {
      const defaultStats = buildDefaultSheetStats(force || 1, entityType);

      actorData = {
        name: spiritType,
        type: entityType,
        system: isSprite
          ? {
              rating: force,
              spriteType: spiritType,
              tasks: 0,
              sheetStats: defaultStats,
            }
          : { force, spiritType, services: 0, sheetStats: defaultStats },
      };
    }

    actorData.system.ownerUuid = ownerUuid;
    if (isSprite) {
      actorData.system.tasks = services;
    } else {
      actorData.system.services = services;
    }

    const [created] = await Actor.create([actorData], { renderSheet: false });
    if (!created) return;

    const owner = await fromUuid(ownerUuid);
    const ownership = SummoningFlow._buildOwnership(owner);
    if (Object.keys(ownership).length > 0) {
      await created.update({ ownership });
    }

    const scene = getGame().scenes?.active;
    if (!scene) return;

    const tokenData = (await created.getTokenDocument()).toObject();
    const ownerToken = scene.tokens.find(
      (t) => t.actor?.uuid === ownerUuid || t.actorId === owner?.id
    );
    if (ownerToken) {
      const grid = scene.grid?.size ?? canvas.grid?.size ?? 100;
      tokenData.x = ownerToken.x + grid;
      tokenData.y = ownerToken.y;
    }
    await scene.createEmbeddedDocuments('Token', [tokenData]);
  }

  /**
   * @param {import('@documents/index').SR4Actor | null} owner
   * @returns {Record<string, number>}
   */
  static _buildOwnership(owner) {
    /** @type {Record<string, number>} */
    const ownership = {};
    if (!owner) return ownership;
    const ownerLevel = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
    for (const user of getGame().users ?? []) {
      if (user.isGM) continue;
      const controlsOwner =
        user.character?.id === owner.id ||
        owner.ownership?.[user.id] === ownerLevel;
      if (controlsOwner) ownership[user.id] = ownerLevel;
    }
    return ownership;
  }
}
