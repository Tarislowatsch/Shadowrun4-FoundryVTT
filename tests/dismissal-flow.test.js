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

const { DismissalFlow } = await import('../src/flows/dismissal-flow.js');

function makeActor({ id = 'Actor.caster1', attributes = {} } = {}) {
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
      ? { rating: 4, spriteType: 'COURIER', tasks: 3 }
      : { force: 4, spiritType: 'COMBAT', services: 3 };
  return {
    type,
    id: `Actor.${type}1`,
    name: `Test ${type}`,
    system: {
      bound: false,
      ownerUuid: 'Actor.owner1',
      ...base,
      ...overrides,
    },
    update: vi.fn(),
  };
}

function setTargets(actors) {
  globalThis.game.user.targets = actors.map((actor) => ({ actor }));
}

function mockRoll({ successes, isGlitch = false, actorHits, resistHits }) {
  rollSkillDialogMock.mockResolvedValue({
    successes,
    isGlitch,
    rolledDice: 6,
    edgeUsed: false,
    messageId: null,
  });
  offerEdgeRetryMock.mockResolvedValue(actorHits);
  awaitEntityResistMock.mockResolvedValue(resistHits);
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.ui = { notifications: { warn: vi.fn(), info: vi.fn() } };
  globalThis.game.user = { targets: [] };
  globalThis.fromUuid = vi.fn().mockResolvedValue(null);
  getSkillDicePoolMock.mockReturnValue(6);
  calculateSummonedEntityDrainPoolMock.mockReturnValue(8);
});

describe('DismissalFlow.start — targeting', () => {
  it('still rolls the skill when no target is set, but never opens the resist flow', async () => {
    mockRoll({ successes: 3, actorHits: 3, resistHits: 0 });

    await DismissalFlow.start(makeActor(), 'sprite');

    expect(rollSkillDialogMock).toHaveBeenCalled();
    expect(awaitEntityResistMock).not.toHaveBeenCalled();
    expect(resolveDrainMock).not.toHaveBeenCalled();
  });

  it('still rolls the skill when the target is the wrong actor type, but never opens the resist flow', async () => {
    setTargets([makeTarget('character', { type: 'character' })]);
    mockRoll({ successes: 3, actorHits: 3, resistHits: 0 });

    await DismissalFlow.start(makeActor(), 'sprite');

    expect(rollSkillDialogMock).toHaveBeenCalled();
    expect(awaitEntityResistMock).not.toHaveBeenCalled();
    expect(resolveDrainMock).not.toHaveBeenCalled();
  });

  it('uses the decompiling skill against a sprite', async () => {
    setTargets([makeTarget('sprite')]);
    mockRoll({ successes: 3, actorHits: 3, resistHits: 0 });

    await DismissalFlow.start(makeActor(), 'sprite');

    expect(getSkillDicePoolMock).toHaveBeenCalledWith(
      expect.anything(),
      'decompiling'
    );
  });

  it('uses the banishing skill against a spirit', async () => {
    setTargets([makeTarget('spirit')]);
    mockRoll({ successes: 3, actorHits: 3, resistHits: 0 });

    await DismissalFlow.start(makeActor(), 'spirit');

    expect(getSkillDicePoolMock).toHaveBeenCalledWith(
      expect.anything(),
      'banishing'
    );
  });
});

describe('DismissalFlow — reducing tasks/services', () => {
  it('reduces sprite tasks by net hits on a win', async () => {
    setTargets([makeTarget('sprite', { tasks: 3 })]);
    mockRoll({ successes: 5, actorHits: 5, resistHits: 2 });

    await DismissalFlow.start(makeActor(), 'sprite');

    expect(awaitEntityResistMock).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'dismiss', entityType: 'sprite' })
    );
    expect(resolveDrainMock).toHaveBeenCalled();
  });

  it('reduces spirit services by net hits on a win', async () => {
    const target = makeTarget('spirit', { services: 5 });
    setTargets([target]);
    mockRoll({ successes: 5, actorHits: 5, resistHits: 2 });

    await DismissalFlow.start(makeActor(), 'spirit');

    expect(target.update).toHaveBeenCalledWith({ 'system.services': 2 });
  });

  it('clamps the remaining services/tasks at 0', async () => {
    const target = makeTarget('sprite', { tasks: 1 });
    setTargets([target]);
    mockRoll({ successes: 6, actorHits: 6, resistHits: 0 });

    await DismissalFlow.start(makeActor(), 'sprite');

    expect(target.update).toHaveBeenCalledWith({ 'system.tasks': 0 });
    expect(globalThis.ui.notifications.info).toHaveBeenCalledWith(
      'sr4.magic.spriteDissipating'
    );
  });

  it('shows a departing notification when a spirit is reduced to 0 services', async () => {
    const target = makeTarget('spirit', { services: 2 });
    setTargets([target]);
    mockRoll({ successes: 5, actorHits: 5, resistHits: 0 });

    await DismissalFlow.start(makeActor(), 'spirit');

    expect(target.update).toHaveBeenCalledWith({ 'system.services': 0 });
    expect(globalThis.ui.notifications.info).toHaveBeenCalledWith(
      'sr4.magic.spiritDeparting'
    );
  });

  it('does not update the target and reports failure when net hits are zero', async () => {
    const target = makeTarget('spirit', { services: 3 });
    setTargets([target]);
    mockRoll({ successes: 2, actorHits: 2, resistHits: 3 });

    await DismissalFlow.start(makeActor(), 'spirit');

    expect(target.update).not.toHaveBeenCalled();
    expect(globalThis.ui.notifications.info).toHaveBeenCalledWith(
      'sr4.magic.banishingFailed'
    );
    expect(resolveDrainMock).toHaveBeenCalled();
  });

  it('treats a glitch as zero net hits but still resolves drain', async () => {
    const target = makeTarget('sprite', { tasks: 3 });
    setTargets([target]);
    mockRoll({ successes: 5, isGlitch: true, actorHits: 5, resistHits: 0 });

    await DismissalFlow.start(makeActor(), 'sprite');

    expect(target.update).not.toHaveBeenCalled();
    expect(resolveDrainMock).toHaveBeenCalled();
  });
});

describe('DismissalFlow — owner bonus', () => {
  it('adds no owner bonus when the target is not bound/registered', async () => {
    setTargets([makeTarget('spirit', { bound: false })]);
    mockRoll({ successes: 5, actorHits: 5, resistHits: 1 });

    await DismissalFlow.start(makeActor(), 'spirit');

    expect(awaitEntityResistMock).toHaveBeenCalledWith(
      expect.objectContaining({ ownerBonus: 0 })
    );
  });

  it("adds the owner's Magic as a bonus when the spirit is bound", async () => {
    globalThis.fromUuid.mockResolvedValue({
      getAttribute: (key) => (key === 'MAGIC' ? 5 : 0),
    });
    setTargets([
      makeTarget('spirit', { bound: true, ownerUuid: 'Actor.owner1' }),
    ]);
    mockRoll({ successes: 5, actorHits: 5, resistHits: 1 });

    await DismissalFlow.start(makeActor(), 'spirit');

    expect(globalThis.fromUuid).toHaveBeenCalledWith('Actor.owner1');
    expect(awaitEntityResistMock).toHaveBeenCalledWith(
      expect.objectContaining({ ownerBonus: 5 })
    );
  });

  it("adds the compiler's Resonance as a bonus when the sprite is registered", async () => {
    globalThis.fromUuid.mockResolvedValue({
      getAttribute: (key) => (key === 'RESONANCE' ? 6 : 0),
    });
    setTargets([
      makeTarget('sprite', { bound: true, ownerUuid: 'Actor.owner1' }),
    ]);
    mockRoll({ successes: 5, actorHits: 5, resistHits: 1 });

    await DismissalFlow.start(makeActor(), 'sprite');

    expect(awaitEntityResistMock).toHaveBeenCalledWith(
      expect.objectContaining({ ownerBonus: 6 })
    );
  });
});

describe('DismissalFlow — drain', () => {
  it('resolves drain with DV = 2x the resist hits (min 2)', async () => {
    setTargets([makeTarget('spirit')]);
    mockRoll({ successes: 5, actorHits: 5, resistHits: 3 });
    const actor = makeActor({ attributes: { MAGIC: 5 } });

    await DismissalFlow.start(actor, 'spirit');

    expect(resolveDrainMock).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ drainValue: 6, isPhysical: false })
    );
  });

  it('is Physical drain when Force/Rating exceeds the resisting stat', async () => {
    setTargets([makeTarget('spirit', { force: 6 })]);
    mockRoll({ successes: 5, actorHits: 5, resistHits: 1 });
    const actor = makeActor({ attributes: { MAGIC: 3 } });

    await DismissalFlow.start(actor, 'spirit');

    expect(resolveDrainMock).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ isPhysical: true })
    );
  });

  it('calculates the drain pool for the entity type being dismissed', async () => {
    setTargets([makeTarget('sprite')]);
    mockRoll({ successes: 5, actorHits: 5, resistHits: 1 });
    const actor = makeActor({ attributes: { RESONANCE: 5 } });

    await DismissalFlow.start(actor, 'sprite');

    expect(calculateSummonedEntityDrainPoolMock).toHaveBeenCalledWith(
      actor,
      'sprite'
    );
  });
});

describe('DismissalFlow — stat guard', () => {
  it('warns and does nothing when the actor has no Resonance/Magic', async () => {
    const actor = makeActor({ attributes: { RESONANCE: 0 } });

    await DismissalFlow.start(actor, 'sprite');

    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(
      'sr4.magic.magicStatZero'
    );
    expect(rollSkillDialogMock).not.toHaveBeenCalled();
  });
});
