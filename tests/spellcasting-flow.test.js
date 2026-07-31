import { describe, it, expect, vi, beforeEach } from 'vitest';

const getValidTargetActorsMock = vi.fn();
const getSpellcastingDicePoolMock = vi.fn();
const rollSkillDialogMock = vi.fn();
const openDicePoolSplitDialogMock = vi.fn();
const resolveEdgeForRollMock = vi.fn();
const askSpellForceMock = vi.fn();
const openSpellcastingDialogMock = vi.fn();
const resolveDrainMock = vi.fn();
const combatSpellStartMock = vi.fn();
const combatSpellStartPerTargetMock = vi.fn();
const opposedSpellStartMock = vi.fn();
const opposedVsTargetMock = vi.fn();
const requestEffectDecisionMock = vi.fn();
const getSpellEffectDataMock = vi.fn();
const applyEffectTemplateMock = vi.fn();

vi.mock('@utils/index', () => ({
  getEffectiveDrainModifier: () => 0,
  getGame: () => globalThis.game,
  getSpellcastingDicePool: (...args) => getSpellcastingDicePoolMock(...args),
  getValidTargetActors: (...args) => getValidTargetActorsMock(...args),
  openDicePoolSplitDialog: (...args) => openDicePoolSplitDialogMock(...args),
  rollSkillDialog: (...args) => rollSkillDialogMock(...args),
}));

vi.mock('@utils/rolls/roll-edge-decision.js', () => ({
  ALWAYS_OFFER_EDGE: Infinity,
  resolveEdgeForRoll: (...args) => resolveEdgeForRollMock(...args),
}));

vi.mock('@domains/summoned-entity/dialogs/index.js', () => ({
  calculateWillpowerResistancePool: () => 8,
  resolveDrain: (...args) => resolveDrainMock(...args),
}));

vi.mock('@domains/magic/dialogs/index.js', () => ({
  askSpellForce: (...args) => askSpellForceMock(...args),
  openSpellcastingDialog: (...args) => openSpellcastingDialogMock(...args),
}));

vi.mock('@domains/magic/flow/combat-spell-flow', () => ({
  CombatSpellFlow: {
    start: (...args) => combatSpellStartMock(...args),
    startPerTarget: (...args) => combatSpellStartPerTargetMock(...args),
  },
}));

vi.mock('@domains/magic/flow/opposed-spell-flow', () => ({
  OpposedSpellFlow: {
    start: (...args) => opposedSpellStartMock(...args),
    opposedVsTarget: (...args) => opposedVsTargetMock(...args),
    getResistAttribute: () => 'WILLPOWER',
  },
}));

vi.mock('@domains/magic/flow/apply-effects-flow', () => ({
  getSpellEffectData: (...args) => getSpellEffectDataMock(...args),
  requestEffectDecision: (...args) => requestEffectDecisionMock(...args),
}));

const { SpellcastingFlow } = await import(
  '../src/domains/magic/flow/spellcasting-flow.js'
);

/** @type {Record<string, boolean>} */
let settings;

function makeActor() {
  return {
    id: 'Actor.caster',
    uuid: 'Actor.caster',
    name: 'Caster',
    system: { magic: { drainAttribute: 'WILLPOWER' } },
    getAttribute: () => 4,
    getEffectiveMagic: () => 5,
    applyEffectTemplate: (...args) => applyEffectTemplateMock(...args),
  };
}

function makeTarget(name = 'Target A', uuid = 'Actor.targetA') {
  return { name, uuid, getAttribute: () => 6 };
}

function makeSpell({
  category = 'MANIPULATION',
  duration = 'INSTANT',
  opposed = false,
  area = false,
} = {}) {
  return {
    name: 'Fireball',
    system: { category, duration, opposed, area, dv: 2, combatType: 'DIRECT' },
  };
}

function makeRoll({ successes = 1, isGlitch = false } = {}) {
  return {
    successes,
    isGlitch,
    rolledDice: 8,
    edgeUsed: false,
    messageId: 'Message.1',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  settings = { spellWorkflow: true, autoSustainEffect: true };
  globalThis.ui = { notifications: { error: vi.fn(), warn: vi.fn() } };
  globalThis.game.settings = { get: (_scope, key) => settings[key] };
  askSpellForceMock.mockResolvedValue(4);
  getSpellcastingDicePoolMock.mockReturnValue(9);
  getValidTargetActorsMock.mockReturnValue([makeTarget()]);
  openSpellcastingDialogMock.mockResolvedValue(makeRoll());
  resolveEdgeForRollMock.mockResolvedValue(1);
  getSpellEffectDataMock.mockReturnValue([{ name: 'Effect' }]);
  combatSpellStartMock.mockResolvedValue(0);
  combatSpellStartPerTargetMock.mockResolvedValue(0);
});

describe('SpellcastingFlow.start — spellWorkflow disabled', () => {
  it('falls back to a plain spellcasting roll without force, targeting or drain', async () => {
    settings.spellWorkflow = false;
    const actor = makeActor();

    await SpellcastingFlow.start(actor, makeSpell());

    expect(rollSkillDialogMock).toHaveBeenCalledWith(actor, 'spellcasting', {
      dice: 9,
      titleSuffix: ' Fireball',
    });
    expect(askSpellForceMock).not.toHaveBeenCalled();
    expect(openSpellcastingDialogMock).not.toHaveBeenCalled();
    expect(resolveDrainMock).not.toHaveBeenCalled();
    expect(combatSpellStartMock).not.toHaveBeenCalled();
  });
});

describe('SpellcastingFlow — Edge on the spellcasting roll', () => {
  it('offers Edge with an unreachable threshold and forwards the final hits', async () => {
    const actor = makeActor();
    const roll = makeRoll({ successes: 1 });
    openSpellcastingDialogMock.mockResolvedValue(roll);
    resolveEdgeForRollMock.mockResolvedValue(4);

    await SpellcastingFlow.start(actor, makeSpell({ opposed: true }));

    expect(resolveEdgeForRollMock).toHaveBeenCalledWith(actor, roll, Infinity);
    expect(opposedSpellStartMock).toHaveBeenCalledWith(
      actor,
      expect.anything(),
      4,
      4,
      expect.any(Array)
    );
  });

  it('forwards the post-Edge hits to the combat spell flow', async () => {
    const actor = makeActor();
    openSpellcastingDialogMock.mockResolvedValue(makeRoll({ successes: 0 }));
    resolveEdgeForRollMock.mockResolvedValue(3);

    await SpellcastingFlow.start(actor, makeSpell({ category: 'COMBAT' }));

    expect(combatSpellStartMock).toHaveBeenCalledWith(
      actor,
      expect.anything(),
      3,
      4,
      expect.any(Array)
    );
  });
});

describe('SpellcastingFlow — failed casts', () => {
  it('does not apply the sustain effect when the cast scores no hits', async () => {
    resolveEdgeForRollMock.mockResolvedValue(0);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ duration: 'SUSTAINED' })
    );

    expect(applyEffectTemplateMock).not.toHaveBeenCalled();
    expect(requestEffectDecisionMock).not.toHaveBeenCalled();
    expect(resolveDrainMock).toHaveBeenCalled();
  });

  it('applies the sustain effect on a successful cast', async () => {
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ duration: 'SUSTAINED' })
    );

    expect(applyEffectTemplateMock).toHaveBeenCalledWith('sustain');
  });

  it('does not start the combat spell flow for a zero-hit cast', async () => {
    resolveEdgeForRollMock.mockResolvedValue(0);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'COMBAT' })
    );

    expect(combatSpellStartMock).not.toHaveBeenCalled();
    expect(resolveDrainMock).toHaveBeenCalled();
  });
});

describe('SpellcastingFlow — normal glitch', () => {
  it('still resolves a glitched cast that scored hits', async () => {
    const target = makeTarget();
    getValidTargetActorsMock.mockReturnValue([target]);
    openSpellcastingDialogMock.mockResolvedValue(
      makeRoll({ successes: 3, isGlitch: true })
    );
    resolveEdgeForRollMock.mockResolvedValue(3);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ duration: 'SUSTAINED' })
    );

    expect(requestEffectDecisionMock).toHaveBeenCalledWith(
      target,
      [{ name: 'Effect' }],
      'Fireball'
    );
    expect(applyEffectTemplateMock).toHaveBeenCalledWith('sustain');
  });

  it('still applies a glitched combat spell that scored hits', async () => {
    openSpellcastingDialogMock.mockResolvedValue(
      makeRoll({ successes: 2, isGlitch: true })
    );
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'COMBAT' })
    );

    expect(combatSpellStartMock).toHaveBeenCalled();
  });
});

describe('SpellcastingFlow — target resolution', () => {
  it('reads the target list once and reuses it after the awaited dialogs', async () => {
    const first = makeTarget('Target A', 'Actor.targetA');
    const second = makeTarget('Target B', 'Actor.targetB');
    getValidTargetActorsMock
      .mockReturnValueOnce([first])
      .mockReturnValue([second]);
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(makeActor(), makeSpell());

    expect(getValidTargetActorsMock).toHaveBeenCalledTimes(1);
    expect(requestEffectDecisionMock).toHaveBeenCalledWith(
      first,
      [{ name: 'Effect' }],
      'Fireball'
    );
  });

  it('passes the resolved targets on to the opposed spell flow', async () => {
    const target = makeTarget();
    getValidTargetActorsMock.mockReturnValue([target]);
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(makeActor(), makeSpell({ opposed: true }));

    expect(opposedSpellStartMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      2,
      4,
      [target]
    );
  });
});

describe('SpellcastingFlow — multi target', () => {
  it('skips failed targets, sustains once and keeps glitched hits', async () => {
    const first = makeTarget('Target A', 'Actor.targetA');
    const second = makeTarget('Target B', 'Actor.targetB');
    getValidTargetActorsMock.mockReturnValue([first, second]);
    openDicePoolSplitDialogMock.mockResolvedValue({
      allocations: [
        { targetId: 'Actor.targetA', allocatedDice: 4, edgePayment: null },
        { targetId: 'Actor.targetB', allocatedDice: 5, edgePayment: null },
      ],
    });
    openSpellcastingDialogMock
      .mockResolvedValueOnce(makeRoll({ successes: 0 }))
      .mockResolvedValueOnce(makeRoll({ successes: 2, isGlitch: true }));
    resolveEdgeForRollMock.mockResolvedValueOnce(0).mockResolvedValueOnce(2);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ duration: 'SUSTAINED' })
    );

    expect(requestEffectDecisionMock).toHaveBeenCalledTimes(1);
    expect(requestEffectDecisionMock).toHaveBeenCalledWith(
      second,
      [{ name: 'Effect' }],
      'Fireball'
    );
    expect(applyEffectTemplateMock).toHaveBeenCalledTimes(1);
  });
});
