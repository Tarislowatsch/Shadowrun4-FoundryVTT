import { describe, it, expect, vi, beforeEach } from 'vitest';

const resolveDrainMock = vi.fn();
const calculateSummonedEntityDrainPoolMock = vi.fn();
const getEffectiveDrainModifierMock = vi.fn(() => 0);
const resolveSpiritDrainMock = vi.fn();
const rollSkillDialogMock = vi.fn();
const offerEdgeRetryMock = vi.fn();
const openSummoningDialogMock = vi.fn();
const awaitOpposedSocketResponseMock = vi.fn();

vi.mock('@utils/index.js', async (importOriginal) => {
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
  offerEdgeRetry: (...args) => offerEdgeRetryMock(...args),
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
  offerEdgeRetryMock.mockResolvedValue(summonerHits);
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
});
