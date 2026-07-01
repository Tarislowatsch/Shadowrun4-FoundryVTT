import {
  awaitOpposedSocketResponse,
  getGame,
  getSkillDicePool,
} from '@utils/index.js';
import { localize, rollSkillDialog } from '@utils/dialog/dialogutility.js';
import {
  openSummoningDialog,
  calculateSummoningDrain,
  loadCompendiumTemplates,
} from '@utils/dialog/magic/summoning.js';
import {
  resolveDrain,
  calculateWillpowerResistancePool,
  calculateResonanceFadingPool,
} from '@utils/dialog/magic/drain.js';
import { offerEdgeRetry } from '@utils/rolls/roll-edge-decision.js';
import { buildCritterActorData } from '@importer/build-critter.js';

export class SummoningFlow {
  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {'spirit' | 'sprite'} entityType
   * @returns {Promise<void>}
   */
  static async start(actor, entityType) {
    const isSprite = entityType === 'sprite';
    const statKey = isSprite ? 'RESONANCE' : 'MAGIC';

    if (!actor.getAttribute(statKey)) {
      ui?.notifications?.error(
        getGame().i18n?.localize('sr4.magic.magicStatZero')
      );
      return;
    }

    const selection = await openSummoningDialog(actor, entityType);
    if (!selection) return;

    const { spiritType, force, templateItem } = selection;

    const skillName = isSprite ? 'compiling' : 'summoning';
    const rollResult = await SummoningFlow._rollSummoning(
      actor,
      skillName,
      force
    );
    if (!rollResult) return;

    const summonerHits = await SummoningFlow._resolveSummonerHits(
      actor,
      rollResult
    );

    const spiritHits = await SummoningFlow._awaitSpiritResist(
      actor,
      force,
      spiritType,
      entityType
    );

    const netHits = rollResult.isGlitch
      ? 0
      : Math.max(0, summonerHits - spiritHits);

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

    await SummoningFlow._handleDrain(actor, force, spiritHits, entityType);
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @returns {Promise<void>}
   */
  static async startWatcher(actor) {
    if (!actor.getAttribute('MAGIC')) {
      ui?.notifications?.error(
        getGame().i18n?.localize('sr4.magic.magicStatZero')
      );
      return;
    }

    const rollResult = await SummoningFlow._rollSummoning(
      actor,
      'summoning',
      0
    );
    if (!rollResult) return;

    const hits = await SummoningFlow._resolveSummonerHits(actor, rollResult);

    if (rollResult.isGlitch || hits < 1) {
      ui?.notifications?.info(
        getGame().i18n.localize('sr4.magic.summoningFailed')
      );
      return;
    }

    const templateMap = await loadCompendiumTemplates('spirit');
    const templateItem = templateMap?.get('Watcher') ?? null;

    await SummoningFlow._requestEntityCreation(
      actor,
      'spirit',
      'Watcher',
      1,
      hits,
      templateItem
    );

    ui?.notifications?.info(
      getGame()
        .i18n.localize('sr4.magic.watcherSummoned')
        .replace('{hours}', String(hits))
    );

    await resolveDrain(actor, {
      label: localize('sr4.magic.watcherDrain'),
      force: 1,
      drainPool: SummoningFlow._calculateDrainPool(actor, 'spirit'),
      drainValue: hits,
      isPhysical: false,
    });
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {string} skillName
   * @param {number} force
   * @returns {Promise<{successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null} | null>}
   */
  static async _rollSummoning(actor, skillName, force) {
    const numDice = getSkillDicePool(actor, skillName);
    if (numDice === undefined) return null;

    return rollSkillDialog(actor, skillName, numDice, {
      titleSuffix: ` (${localize('sr4.spell.force')}: ${force})`,
      force,
    });
  }

  /**
   * Applies edge to a not-yet-edged summoning/compiling roll, otherwise
   * returns the roll's plain successes unchanged.
   * @param {import('@documents/index').SR4Actor} actor
   * @param {{successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null}} rollResult
   * @returns {Promise<number>}
   */
  static async _resolveSummonerHits(actor, rollResult) {
    return offerEdgeRetry(actor, rollResult);
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {number} force
   * @param {string} spiritType
   * @param {'spirit' | 'sprite'} entityType
   * @returns {Promise<number>}
   */
  static async _awaitSpiritResist(actor, force, spiritType, entityType) {
    const isSprite = entityType === 'sprite';
    const resistAction = isSprite ? 'spriteResisted' : 'spiritResisted';
    const triggerAction = isSprite
      ? 'triggerSpriteResist'
      : 'triggerSpiritResist';

    return awaitOpposedSocketResponse({
      triggerAction,
      triggerPayload: { summonerId: actor.id, force, spiritType, entityType },
      matchAction: resistAction,
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
    const socket = getGame().socket;
    if (!socket) return;

    socket.emit('system.shadowrun4e', {
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
      actorData = buildCritterActorData(templateSystem, spiritType, force);
      if (templateImg) actorData.img = templateImg;
    } else {
      const defaultStats = {};
      const statKeys = [
        'BODY',
        'AGILITY',
        'REACTION',
        'STRENGTH',
        'CHARISMA',
        'INTUITION',
        'LOGIC',
        'WILLPOWER',
        'MAGIC',
        'EDGE',
        'CURRENTEDGE',
        'ESSENCE',
        'INITIATIVE',
        'ASTRALINITIATIVE',
      ];
      for (const k of statKeys) defaultStats[k] = force || 1;
      defaultStats.ESSENCE = 6;
      defaultStats.INITIATIVE = (force || 1) * 2;
      defaultStats.ASTRALINITIATIVE = (force || 1) * 2;
      defaultStats.CURRENTEDGE = defaultStats.EDGE;

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
    const ownerUser = getGame().users?.find(
      (u) => u.character?.id === owner?.id
    );
    if (ownerUser) {
      await created.update({
        ownership: { [ownerUser.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
      });
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
      ? localize('sr4.magic.compilingFading')
      : localize('sr4.magic.summoningDrain');

    await resolveDrain(actor, {
      label,
      force,
      drainPool: SummoningFlow._calculateDrainPool(actor, entityType),
      drainValue,
      isPhysical,
    });
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {'spirit' | 'sprite'} entityType
   * @returns {number}
   */
  static _calculateDrainPool(actor, entityType) {
    if (entityType === 'sprite') {
      const tn = actor.system.technomancy;
      return calculateResonanceFadingPool(
        actor,
        tn?.fadingAttribute ?? 'WILLPOWER',
        tn?.compilingFadingBonus ?? 0
      );
    }
    return calculateWillpowerResistancePool(
      actor,
      actor.system.magic.drainAttribute,
      actor.system.magic?.summoningDrainBonus ?? 0
    );
  }
}
