import { describe, it, expect, vi, beforeEach } from 'vitest';

const resolveDrainMock = vi.fn();
const calculateSummonedEntityDrainPoolMock = vi.fn();
const getEffectiveDrainModifierMock = vi.fn(() => 0);
const resolveSpiritDrainMock = vi.fn();
const rollSkillDialogMock = vi.fn();
const resolveEdgeForRollMock = vi.fn();
const openSummoningDialogMock = vi.fn();
const awaitOpposedSocketResponseMock = vi.fn();

vi.mock('@utils/index', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getGame: () => globalThis.game,
    awaitOpposedSocketResponse: (...args) =>
      awaitOpposedSocketResponseMock(...args),
    getEffectiveDrainModifier: (...args) =>
      getEffectiveDrainModifierMock(...args),
  };
});

vi.mock('@domains/summoned-entity/dialogs/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    resolveDrain: (...args) => resolveDrainMock(...args),
    resolveSpiritDrain: (...args) => resolveSpiritDrainMock(...args),
    calculateSummonedEntityDrainPool: (...args) =>
      calculateSummonedEntityDrainPoolMock(...args),
    openSummoningDialog: (...args) => openSummoningDialogMock(...args),
    loadCompendiumTemplates: vi.fn(),
  };
});

vi.mock('@utils/dialog/roll-dialog-core.js', () => ({
  localize: (key) => key,
}));

vi.mock('@utils/dialog/skill-dice.js', () => ({
  rollSkillDialog: (...args) => rollSkillDialogMock(...args),
  rollForcedSkill: async (actor, skillName, force) => {
    return rollSkillDialogMock(actor, skillName, force);
  },
}));

vi.mock('@utils/rolls/roll-edge-decision.js', () => ({
  ALWAYS_OFFER_EDGE: Infinity,
  resolveEdgeForRoll: (...args) => resolveEdgeForRollMock(...args),
}));

const { SummoningFlow } = await import(
  '../src/domains/summoned-entity/flow/summoning-flow.js'
);

function makeActor({ attributes = {} } = {}) {
  return {
    id: 'Actor.summoner1',
    uuid: 'Actor.summoner1',
    getAttribute: (key) => attributes[key] ?? 6,
    getSpellpower: () => attributes.MAGIC ?? 6,
    getEffectiveMagic: () => attributes.MAGIC ?? 6,
    getMagicTradition: () => '',
  };
}

function mockRoll({ successes, isGlitch = false, summonerHits, spiritHits }) {
  rollSkillDialogMock.mockResolvedValue({
    successes,
    isGlitch,
    rolledDice: 6,
    edgeUsed: false,
    messageId: null,
  });
  resolveEdgeForRollMock.mockResolvedValue(summonerHits);
  awaitOpposedSocketResponseMock.mockResolvedValue(spiritHits);
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.ui = { notifications: { error: vi.fn(), info: vi.fn() } };
  globalThis.game.socket = { emit: vi.fn() };
  globalThis.game.scenes = { active: null };
  calculateSummonedEntityDrainPoolMock.mockReturnValue(8);
  openSummoningDialogMock.mockResolvedValue({
    spiritType: 'COMBAT',
    force: 4,
    templateItem: null,
  });
});

describe('SummoningFlow.start — drain wiring', () => {
  it('resolves spirit drain with the summoning label keys', async () => {
    mockRoll({ successes: 4, summonerHits: 4, spiritHits: 3 });

    await SummoningFlow.start(makeActor(), 'spirit');

    expect(resolveSpiritDrainMock).toHaveBeenCalledWith(
      expect.anything(),
      4,
      3,
      'spirit',
      {
        spiritLabelKey: 'sr4.magic.summoningDrain',
        spriteLabelKey: 'sr4.magic.compilingFading',
      }
    );
  });

  it('resolves sprite drain with the compiling label keys', async () => {
    openSummoningDialogMock.mockResolvedValue({
      spiritType: 'COURIER',
      force: 4,
      templateItem: null,
    });
    mockRoll({ successes: 4, summonerHits: 4, spiritHits: 3 });

    await SummoningFlow.start(makeActor(), 'sprite');

    expect(resolveSpiritDrainMock).toHaveBeenCalledWith(
      expect.anything(),
      4,
      3,
      'sprite',
      {
        spiritLabelKey: 'sr4.magic.summoningDrain',
        spriteLabelKey: 'sr4.magic.compilingFading',
      }
    );
  });

  it('always resolves drain, even when summoning fails', async () => {
    mockRoll({ successes: 1, summonerHits: 1, spiritHits: 5 });

    await SummoningFlow.start(makeActor(), 'spirit');

    expect(resolveSpiritDrainMock).toHaveBeenCalled();
  });
});

describe('SummoningFlow.startWatcher — drain', () => {
  it('resolves drain directly with the watcher label, adding the Background Count modifier', async () => {
    getEffectiveDrainModifierMock.mockReturnValue(3);
    mockRoll({ successes: 4, summonerHits: 4 });

    await SummoningFlow.startWatcher(makeActor());

    expect(resolveDrainMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        label: 'sr4.magic.watcherDrain',
        drainValue: 7,
      })
    );
  });

  it('rolls at the Force the watcher is actually created with', async () => {
    mockRoll({ successes: 4, summonerHits: 4 });

    await SummoningFlow.startWatcher(makeActor());

    expect(rollSkillDialogMock).toHaveBeenCalledWith(
      expect.anything(),
      'summoning',
      1
    );
  });
});

describe('SummoningFlow.createEntity', () => {
  let created;

  beforeEach(() => {
    created = { id: 'Actor.spirit1', update: vi.fn() };
    globalThis.Actor = { create: vi.fn().mockResolvedValue([created]) };
    globalThis.fromUuid = vi.fn().mockResolvedValue({ id: 'Actor.summoner1' });
    globalThis.game.users = [];
  });

  it('grants ownership to a user who owns the summoner without having it assigned', async () => {
    globalThis.game.users = [
      { id: 'user1', isGM: false, character: { id: 'Actor.other' } },
    ];
    globalThis.fromUuid.mockResolvedValue({
      id: 'Actor.summoner1',
      ownership: { user1: 3 },
    });

    await SummoningFlow.createEntity({
      ownerUuid: 'Actor.summoner1',
      entityType: 'spirit',
      spiritType: 'COMBAT',
      force: 4,
      services: 2,
      templateSystem: null,
    });

    expect(created.update).toHaveBeenCalledWith({
      ownership: { user1: 3 },
    });
  });

  it('ignores a permissive world default so not every player owns the summon', async () => {
    globalThis.game.users = [
      { id: 'user1', isGM: false, character: { id: 'Actor.other' } },
      { id: 'user2', isGM: false, character: null },
    ];
    globalThis.fromUuid.mockResolvedValue({
      id: 'Actor.summoner1',
      ownership: { default: 3 },
    });

    await SummoningFlow.createEntity({
      ownerUuid: 'Actor.summoner1',
      entityType: 'spirit',
      spiritType: 'COMBAT',
      force: 4,
      services: 2,
      templateSystem: null,
    });

    expect(created.update).not.toHaveBeenCalled();
  });

  it('leaves ownership untouched when no player controls the summoner', async () => {
    globalThis.game.users = [{ id: 'gm', isGM: true }];

    await SummoningFlow.createEntity({
      ownerUuid: 'Actor.summoner1',
      entityType: 'spirit',
      spiritType: 'COMBAT',
      force: 4,
      services: 2,
      templateSystem: null,
    });

    expect(created.update).not.toHaveBeenCalled();
  });

  it('builds a sprite statblock with Resonance but no Magic', async () => {
    await SummoningFlow.createEntity({
      ownerUuid: 'Actor.summoner1',
      entityType: 'sprite',
      spiritType: 'COURIER',
      force: 4,
      services: 2,
      templateSystem: null,
    });

    const [[[actorData]]] = globalThis.Actor.create.mock.calls;
    expect(actorData.system.sheetStats).toMatchObject({
      MAGIC: 0,
      RESONANCE: 4,
      MATRIXINITIATIVE: 8,
    });
    expect(actorData.system.tasks).toBe(2);
  });

  it('builds a spirit statblock with Magic but no Resonance', async () => {
    await SummoningFlow.createEntity({
      ownerUuid: 'Actor.summoner1',
      entityType: 'spirit',
      spiritType: 'COMBAT',
      force: 4,
      services: 2,
      templateSystem: null,
    });

    const [[[actorData]]] = globalThis.Actor.create.mock.calls;
    expect(actorData.system.sheetStats).toMatchObject({
      MAGIC: 4,
      RESONANCE: 0,
    });
    expect(actorData.system.services).toBe(2);
  });

  it('keeps the statblock shape the hand-rolled default block produced', async () => {
    await SummoningFlow.createEntity({
      ownerUuid: 'Actor.summoner1',
      entityType: 'spirit',
      spiritType: 'COMBAT',
      force: 4,
      services: 2,
      templateSystem: null,
    });

    const [[[actorData]]] = globalThis.Actor.create.mock.calls;
    const stats = actorData.system.sheetStats;
    expect(stats).toMatchObject({
      BODY: 4,
      AGILITY: 4,
      REACTION: 4,
      STRENGTH: 4,
      CHARISMA: 4,
      INTUITION: 4,
      LOGIC: 4,
      WILLPOWER: 4,
      EDGE: 4,
      ESSENCE: 6,
      INITIATIVE: 8,
      ASTRALINITIATIVE: 8,
    });
    expect(stats.CURRENTEDGE).toBe(stats.EDGE);
  });
});
