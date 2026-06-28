import { getGame, getSkillDicePool } from '@utils/index.js';
import {
  createDialogParameters,
  createRollDialog,
  dialogActions,
  localize,
  renderTemplate,
  standardTemplatePath,
} from '@utils/dialog/dialogutility.js';
import {
  openSummoningDialog,
  calculateSummoningDrain,
  loadCompendiumTemplates,
} from '@utils/dialog/magic/summoning.js';
import { resolveDrain } from '@utils/dialog/magic/drain.js';
import { resolveEdgeForRoll } from '@utils/rolls/roll-edge-decision.js';
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

    let summonerHits = rollResult.successes;
    if (!rollResult.edgeUsed && !rollResult.isGlitch) {
      summonerHits = await resolveEdgeForRoll(
        actor,
        {
          successes: rollResult.successes,
          rolledDice: rollResult.rolledDice,
          isGlitch: rollResult.isGlitch,
          edgeUsed: rollResult.edgeUsed,
          messageId: rollResult.messageId,
        },
        0
      );
    }

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
        game.i18n.localize(msgKey).replace(msgParam, String(netHits))
      );
    } else {
      const failKey = isSprite
        ? 'sr4.magic.compilingFailed'
        : 'sr4.magic.summoningFailed';
      ui?.notifications?.info(game.i18n.localize(failKey));
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

    let hits = rollResult.successes;
    if (!rollResult.edgeUsed && !rollResult.isGlitch) {
      hits = await resolveEdgeForRoll(
        actor,
        {
          successes: rollResult.successes,
          rolledDice: rollResult.rolledDice,
          isGlitch: rollResult.isGlitch,
          edgeUsed: rollResult.edgeUsed,
          messageId: rollResult.messageId,
        },
        0
      );
    }

    if (rollResult.isGlitch || hits < 1) {
      ui?.notifications?.info(game.i18n.localize('sr4.magic.summoningFailed'));
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
      game.i18n
        .localize('sr4.magic.watcherSummoned')
        .replace('{hours}', String(hits))
    );

    const willpower = actor.getAttribute('WILLPOWER') ?? 0;
    const drainAttribute =
      actor.getAttribute(actor.system.magic.drainAttribute) ?? 0;
    const drainBonus = actor.system.magic?.summoningDrainBonus ?? 0;
    const drainPool = willpower + drainAttribute + drainBonus;

    await resolveDrain(actor, {
      label: localize('sr4.magic.watcherDrain'),
      force: 1,
      drainPool,
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

    const params = createDialogParameters(actor, numDice);
    const skill = actor.getSkill(skillName);
    const content = await renderTemplate(standardTemplatePath(), {
      ...params,
      skillName,
      force,
    });

    return createRollDialog({
      title: `${localize('sr4.roll.rolling')} ${localize(skill.system.label)} (${localize('sr4.spell.force')}: ${force})`,
      content,
      dice: numDice,
      onRoll: (dialog) => dialogActions(dialog, actor, skillName, numDice),
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
    const socket = getGame().socket;
    if (!socket) return 0;

    const isSprite = entityType === 'sprite';
    const resistAction = isSprite ? 'spriteResisted' : 'spiritResisted';
    const triggerAction = isSprite
      ? 'triggerSpriteResist'
      : 'triggerSpiritResist';

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        socket.off('system.shadowrun4e', handler);
        resolve(0);
      }, 300_000);

      const handler = (data) => {
        if (data.action !== resistAction) return;
        if (data.payload?.summonerId !== actor.id) return;
        clearTimeout(timeout);
        socket.off('system.shadowrun4e', handler);
        resolve(data.payload.resistHits ?? 0);
      };

      socket.on('system.shadowrun4e', handler);
      socket.emit('system.shadowrun4e', {
        action: triggerAction,
        payload: {
          summonerId: actor.id,
          force,
          spiritType,
          entityType,
        },
      });
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
    const ownerUser = game.users?.find((u) => u.character?.id === owner?.id);
    if (ownerUser) {
      await created.update({
        ownership: { [ownerUser.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
      });
    }

    const scene = game.scenes?.active;
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

    const willpower = actor.getAttribute('WILLPOWER') ?? 0;
    const drainAttribute =
      actor.getAttribute(actor.system.magic.drainAttribute) ?? 0;
    const drainBonus = actor.system.magic?.summoningDrainBonus ?? 0;
    const drainPool = willpower + drainAttribute + drainBonus;

    const statKey = isSprite ? 'RESONANCE' : 'MAGIC';
    const isPhysical = force > actor.getAttribute(statKey);

    const label = isSprite
      ? localize('sr4.magic.compilingFading')
      : localize('sr4.magic.summoningDrain');

    await resolveDrain(actor, {
      label,
      force,
      drainPool,
      drainValue,
      isPhysical,
    });
  }
}
