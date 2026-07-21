import { describe, it, expect, vi, beforeEach } from 'vitest';

const rollSkillDialogMock = vi.fn();
const offerEdgeRetryMock = vi.fn();
const awaitEntityResistMock = vi.fn();
const getSkillDicePoolMock = vi.fn();
const resolveDrainMock = vi.fn();
const calculateSummonedEntityDrainPoolMock = vi.fn();

vi.mock('@utils/dialog/dialogutility.js', () => ({
  localize: (key) => key,
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

vi.mock('@utils/index.js', () => ({
  getGame: () => globalThis.game,
  getSkillDicePool: (...args) => getSkillDicePoolMock(...args),
}));

vi.mock('@utils/dialog/magic/resist-actions.js', () => ({
  awaitEntityResist: (...args) => awaitEntityResistMock(...args),
}));

vi.mock('@utils/dialog/magic/drain.js', () => ({
  resolveDrain: (...args) => resolveDrainMock(...args),
  calculateSummonedEntityDrainPool: (...args) =>
    calculateSummonedEntityDrainPoolMock(...args),
}));

const { BindingFlow } = await import('../src/flows/binding-flow.js');

function makeActor({ id = 'Actor.summoner1', attributes = {} } = {}) {
  return {
    id,
    uuid: id,
    system: {
      magic: { drainAttribute: 'LOGIC' },
      technomancy: { fadingAttribute: 'WILLPOWER' },
    },
    getAttribute: (key) => attributes[key] ?? 6,
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
  calculateSummonedEntityDrainPoolMock.mockReturnValue(8);
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
    expect(resolveDrainMock).not.toHaveBeenCalled();
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
  it.each([
    [
      'DV = 2x the spirit hits (min 2), Stun when Force <= Magic',
      { successes: 4, summonerHits: 4, resistHits: 3 },
      { drainValue: 6, isPhysical: false, force: 4 },
    ],
    [
      'the minimum drain value of 2 when the spirit scored no hits',
      { successes: 3, summonerHits: 3, resistHits: 0 },
      { drainValue: 2 },
    ],
  ])('resolves drain with %s', async (_label, rollValues, expectedFields) => {
    mockRoll(rollValues);
    const summoner = makeActor({ attributes: { MAGIC: 5, CHARISMA: 6 } });

    await BindingFlow.start(summoner, makeTarget('spirit'));

    expect(resolveDrainMock).toHaveBeenCalledWith(
      summoner,
      expect.objectContaining(expectedFields)
    );
  });

  it('is Physical drain when Force exceeds the magician Magic', async () => {
    mockRoll({ successes: 4, summonerHits: 4, resistHits: 1 });
    const summoner = makeActor({ attributes: { MAGIC: 3, CHARISMA: 6 } });

    await BindingFlow.start(summoner, makeTarget('spirit', { force: 5 }));

    expect(resolveDrainMock).toHaveBeenCalledWith(
      summoner,
      expect.objectContaining({ isPhysical: true })
    );
  });

  it('always resolves drain, even when the binding attempt fails', async () => {
    mockRoll({ successes: 1, summonerHits: 1, resistHits: 3 });
    const summoner = makeActor({ attributes: { MAGIC: 5, CHARISMA: 6 } });

    await BindingFlow.start(summoner, makeTarget('spirit'));

    expect(resolveDrainMock).toHaveBeenCalled();
  });

  it('calculates the drain pool for the entity type being bound', async () => {
    mockRoll({ successes: 4, summonerHits: 4, resistHits: 1 });
    const summoner = makeActor({ attributes: { RESONANCE: 5, CHARISMA: 6 } });

    await BindingFlow.start(summoner, makeTarget('sprite'));

    expect(calculateSummonedEntityDrainPoolMock).toHaveBeenCalledWith(
      summoner,
      'sprite'
    );
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
