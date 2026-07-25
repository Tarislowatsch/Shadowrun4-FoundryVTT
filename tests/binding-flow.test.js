import { describe, it, expect, vi, beforeEach } from 'vitest';

const rollSkillDialogMock = vi.fn();
const offerEdgeRetryMock = vi.fn();
const awaitEntityResistMock = vi.fn();
const getSkillDicePoolMock = vi.fn();
const resolveSpiritDrainMock = vi.fn();

vi.mock('@utils/dialog/roll-dialog-core.js', () => ({
  localize: (key) => key,
}));

vi.mock('@utils/dialog/skill-dice.js', () => ({
  rollSkillDialog: (...args) => rollSkillDialogMock(...args),
  rollForcedSkill: async (actor, skillName, force) => {
    const numDice = getSkillDicePoolMock(actor, skillName);
    if (numDice === undefined) return null;
    return rollSkillDialogMock(actor, skillName, numDice, {
      titleSuffix: ` (sr4.spell.force: ${force})`,
      force,
    });
  },
}));

vi.mock('@utils/rolls/roll-edge-decision.js', () => ({
  offerEdgeRetry: (...args) => offerEdgeRetryMock(...args),
}));

vi.mock('@utils/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getGame: () => globalThis.game,
    getSkillDicePool: (...args) => getSkillDicePoolMock(...args),
  };
});

vi.mock('@domains/summoned-entity/dialogs/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    resolveSpiritDrain: (...args) => resolveSpiritDrainMock(...args),
  };
});

vi.mock('@domains/magic/dialogs/resist-actions.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    awaitEntityResist: (...args) => awaitEntityResistMock(...args),
  };
});

const { BindingFlow } = await import(
  '../src/domains/summoned-entity/flow/binding-flow.js'
);

function makeActor({ id = 'Actor.summoner1', attributes = {} } = {}) {
  return {
    id,
    uuid: id,
    system: {
      magic: { drainAttribute: 'LOGIC' },
      technomancy: { fadingAttribute: 'WILLPOWER' },
    },
    getAttribute: (key) => attributes[key] ?? 6,
    getSpellpower: () => attributes.MAGIC ?? 6,
  };
}

function makeTarget(type, overrides = {}) {
  const base =
    type === 'sprite'
      ? { rating: 4, spriteType: 'COURIER', tasks: 1 }
      : { force: 4, spiritType: 'COMBAT', services: 2 };
  return {
    type,
    id: `Actor.${type}1`,
    name: `Test ${type}`,
    system: {
      bound: false,
      ownerUuid: 'Actor.summoner1',
      ...base,
      ...overrides,
    },
    update: vi.fn(),
  };
}

function mockRoll({ successes, isGlitch = false, summonerHits, resistHits }) {
  rollSkillDialogMock.mockResolvedValue({
    successes,
    isGlitch,
    rolledDice: 6,
    edgeUsed: false,
    messageId: null,
  });
  offerEdgeRetryMock.mockResolvedValue(summonerHits);
  awaitEntityResistMock.mockResolvedValue(resistHits);
}

function setTargets(actors) {
  globalThis.game.user.targets = actors.map((actor) => ({ actor }));
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.ui = { notifications: { warn: vi.fn(), info: vi.fn() } };
  globalThis.game.actors = [];
  globalThis.game.user = { targets: [] };
  getSkillDicePoolMock.mockReturnValue(6);
});

describe('BindingFlow.start — first binding', () => {
  it('uses the binding skill for spirits', async () => {
    mockRoll({ successes: 3, summonerHits: 3, resistHits: 0 });

    await BindingFlow.start(makeActor(), makeTarget('spirit'));
    expect(getSkillDicePoolMock).toHaveBeenCalledWith(
      expect.anything(),
      'binding'
    );
  });

  it('uses the registering skill for sprites', async () => {
    mockRoll({ successes: 3, summonerHits: 3, resistHits: 0 });

    await BindingFlow.start(makeActor(), makeTarget('sprite'));
    expect(getSkillDicePoolMock).toHaveBeenCalledWith(
      expect.anything(),
      'registering'
    );
  });

  it('binds with exactly 1 net hit and adds no extra services', async () => {
    mockRoll({ successes: 3, summonerHits: 3, resistHits: 2 });

    const target = makeTarget('spirit');
    await BindingFlow.start(makeActor(), target);

    expect(target.update).toHaveBeenCalledWith({
      'system.bound': true,
      'system.services': 2,
    });
    expect(globalThis.ui.notifications.info).toHaveBeenCalledWith(
      'sr4.magic.spiritBound'
    );
  });

  it('uses the first net hit to form the bond, remainder goes to services', async () => {
    mockRoll({ successes: 4, summonerHits: 4, resistHits: 1 });

    const target = makeTarget('spirit');
    await BindingFlow.start(makeActor(), target);

    // netHits = 3, first hit forms the bond -> 2 services gained (2 + 2 = 4)
    expect(target.update).toHaveBeenCalledWith({
      'system.bound': true,
      'system.services': 4,
    });
  });

  it('binds a sprite and adds remaining net hits to tasks', async () => {
    mockRoll({ successes: 5, summonerHits: 5, resistHits: 2 });

    const target = makeTarget('sprite');
    await BindingFlow.start(makeActor(), target);

    // netHits = 3, first hit forms the bond -> 2 tasks gained (1 + 2 = 3)
    expect(target.update).toHaveBeenCalledWith({
      'system.bound': true,
      'system.tasks': 3,
    });
    expect(globalThis.ui.notifications.info).toHaveBeenCalledWith(
      'sr4.magic.spriteRegistered'
    );
  });

  it('fails and does not bind when net hits are zero', async () => {
    mockRoll({ successes: 2, summonerHits: 2, resistHits: 3 });

    const target = makeTarget('sprite');
    await BindingFlow.start(makeActor(), target);

    expect(target.update).not.toHaveBeenCalled();
    expect(globalThis.ui.notifications.info).toHaveBeenCalledWith(
      'sr4.magic.registeringFailed'
    );
  });

  it('treats a glitch as zero net hits even with more summoner successes', async () => {
    mockRoll({ successes: 5, isGlitch: true, summonerHits: 5, resistHits: 0 });

    const target = makeTarget('spirit');
    await BindingFlow.start(makeActor(), target);

    expect(target.update).not.toHaveBeenCalled();
    expect(globalThis.ui.notifications.info).toHaveBeenCalledWith(
      'sr4.magic.bindingFailed'
    );
  });

  it('does nothing further when the skill roll dialog is cancelled', async () => {
    rollSkillDialogMock.mockResolvedValue(null);

    const target = makeTarget('spirit');
    await BindingFlow.start(makeActor(), target);

    expect(offerEdgeRetryMock).not.toHaveBeenCalled();
    expect(target.update).not.toHaveBeenCalled();
    expect(resolveSpiritDrainMock).not.toHaveBeenCalled();
  });

  it('blocks binding once the summoner has Charisma-many bound spirits already', async () => {
    globalThis.game.actors = [
      makeTarget('spirit', { bound: true }),
      makeTarget('spirit', { bound: true }),
    ];
    const summoner = makeActor({ attributes: { CHARISMA: 2 } });

    await BindingFlow.start(summoner, makeTarget('spirit'));

    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(
      'sr4.magic.bindLimitReached'
    );
    expect(rollSkillDialogMock).not.toHaveBeenCalled();
  });

  it('does not count unbound spirits toward the Charisma limit', async () => {
    globalThis.game.actors = [makeTarget('spirit', { bound: false })];
    const summoner = makeActor({ attributes: { CHARISMA: 1 } });
    mockRoll({ successes: 3, summonerHits: 3, resistHits: 0 });

    await BindingFlow.start(summoner, makeTarget('spirit'));

    expect(globalThis.ui.notifications.warn).not.toHaveBeenCalled();
    expect(rollSkillDialogMock).toHaveBeenCalled();
  });
});

describe('BindingFlow.start — rebinding', () => {
  it('adds every net hit to services on rebind (no bond-forming hit needed)', async () => {
    mockRoll({ successes: 4, summonerHits: 4, resistHits: 1 });

    const target = makeTarget('spirit', { bound: true, services: 2 });
    await BindingFlow.start(makeActor(), target);

    // netHits = 3, all 3 go to services (2 + 3 = 5)
    expect(target.update).toHaveBeenCalledWith({
      'system.bound': true,
      'system.services': 5,
    });
  });

  it('is not blocked by the Charisma limit since it is already bound', async () => {
    const target = makeTarget('spirit', { bound: true, services: 0 });
    globalThis.game.actors = [target];
    const summoner = makeActor({ attributes: { CHARISMA: 1 } });
    mockRoll({ successes: 2, summonerHits: 2, resistHits: 0 });

    await BindingFlow.start(summoner, target);

    expect(globalThis.ui.notifications.warn).not.toHaveBeenCalled();
    expect(target.update).toHaveBeenCalledWith({
      'system.bound': true,
      'system.services': 2,
    });
  });
});

describe('BindingFlow.start — drain', () => {
  it('resolves spirit drain with the binding label keys and resist hits as the drain source', async () => {
    mockRoll({ successes: 4, summonerHits: 4, resistHits: 3 });
    const summoner = makeActor({ attributes: { MAGIC: 5, CHARISMA: 6 } });

    await BindingFlow.start(summoner, makeTarget('spirit', { force: 4 }));

    expect(resolveSpiritDrainMock).toHaveBeenCalledWith(
      summoner,
      4,
      3,
      'spirit',
      {
        spiritLabelKey: 'sr4.magic.bindingDrain',
        spriteLabelKey: 'sr4.magic.registeringFading',
      }
    );
  });

  it('always resolves drain, even when the binding attempt fails', async () => {
    mockRoll({ successes: 1, summonerHits: 1, resistHits: 3 });
    const summoner = makeActor({ attributes: { MAGIC: 5, CHARISMA: 6 } });

    await BindingFlow.start(summoner, makeTarget('spirit'));

    expect(resolveSpiritDrainMock).toHaveBeenCalled();
  });
});

describe('BindingFlow.startTargeted', () => {
  it('warns and never rolls when no target is set', async () => {
    const summoner = makeActor();

    await BindingFlow.startTargeted(summoner, 'spirit');

    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(
      'sr4.magic.noValidBindTarget'
    );
    expect(rollSkillDialogMock).not.toHaveBeenCalled();
  });

  it('warns and never rolls when the target is the wrong entity type', async () => {
    const summoner = makeActor();
    setTargets([makeTarget('sprite')]);

    await BindingFlow.startTargeted(summoner, 'spirit');

    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(
      'sr4.magic.noValidBindTarget'
    );
    expect(rollSkillDialogMock).not.toHaveBeenCalled();
  });

  it('warns and never rolls when the target is not owned by this actor', async () => {
    const summoner = makeActor({ id: 'Actor.summoner1' });
    setTargets([makeTarget('spirit', { ownerUuid: 'Actor.someoneElse' })]);

    await BindingFlow.startTargeted(summoner, 'spirit');

    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(
      'sr4.magic.noValidBindTarget'
    );
    expect(rollSkillDialogMock).not.toHaveBeenCalled();
  });

  it('binds the targeted, owned entity of the matching type', async () => {
    mockRoll({ successes: 3, summonerHits: 3, resistHits: 0 });
    const summoner = makeActor({ id: 'Actor.summoner1' });
    const target = makeTarget('spirit', { ownerUuid: 'Actor.summoner1' });
    setTargets([target]);

    await BindingFlow.startTargeted(summoner, 'spirit');

    expect(globalThis.ui.notifications.warn).not.toHaveBeenCalled();
    expect(target.update).toHaveBeenCalledWith(
      expect.objectContaining({ 'system.bound': true })
    );
  });
});
