import { describe, it, expect, vi, beforeEach } from 'vitest';

const getValidTargetActorsMock = vi.fn();
const getSpellcastingDicePoolMock = vi.fn();
const rollSkillDialogMock = vi.fn();
const openDicePoolSplitDialogMock = vi.fn();
const resolveEdgeForRollMock = vi.fn();
const askSpellForceMock = vi.fn();
const openSpellcastingDialogMock = vi.fn();
const resolveDrainMock = vi.fn();
const getEffectiveDrainModifierMock = vi.fn();
const calculateWillpowerResistancePoolMock = vi.fn();
const combatSpellResolveMock = vi.fn();
const opposedSpellResolveMock = vi.fn();
const requestEffectDecisionMock = vi.fn();
const getSpellEffectDataMock = vi.fn();
const applyEffectTemplateMock = vi.fn();
const sendResistSummaryMock = vi.fn();
const placeSpellAreaMock = vi.fn();
const createSpellAreaMock = vi.fn();
const confirmAreaTargetsMock = vi.fn();

vi.mock('@utils/index', () => ({
  getEffectiveDrainModifier: (...args) =>
    getEffectiveDrainModifierMock(...args),
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
  calculateWillpowerResistancePool: (...args) =>
    calculateWillpowerResistancePoolMock(...args),
  resolveDrain: (...args) => resolveDrainMock(...args),
}));

vi.mock('@domains/magic/dialogs/index.js', () => ({
  askSpellForce: (...args) => askSpellForceMock(...args),
  openSpellcastingDialog: (...args) => openSpellcastingDialogMock(...args),
  confirmAreaTargets: (...args) => confirmAreaTargetsMock(...args),
}));

vi.mock('@domains/magic/area-placement.js', () => ({
  placeSpellArea: (...args) => placeSpellAreaMock(...args),
  createSpellArea: (...args) => createSpellAreaMock(...args),
  AREA_DISMISSED: 'dismissed',
}));

vi.mock('@domains/magic/flow/combat-spell-flow', () => ({
  CombatSpellFlow: {
    resolve: (...args) => combatSpellResolveMock(...args),
  },
}));

vi.mock('@domains/magic/flow/opposed-spell-flow', () => ({
  OpposedSpellFlow: {
    resolve: (...args) => opposedSpellResolveMock(...args),
  },
}));

vi.mock('@domains/magic/resist-summary.js', async (importOriginal) => ({
  ...(await importOriginal()),
  sendResistSummary: (...args) => sendResistSummaryMock(...args),
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
  range = 'LOS',
} = {}) {
  return {
    name: 'Fireball',
    system: {
      category,
      duration,
      opposed,
      area,
      range,
      dv: 2,
      combatType: 'DIRECT',
    },
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
  askSpellForceMock.mockResolvedValue({ force: 4, radiusAdjust: 0 });
  getSpellcastingDicePoolMock.mockReturnValue(9);
  getValidTargetActorsMock.mockReturnValue([makeTarget()]);
  openSpellcastingDialogMock.mockResolvedValue(makeRoll());
  resolveEdgeForRollMock.mockResolvedValue(1);
  getSpellEffectDataMock.mockReturnValue([{ name: 'Effect' }]);
  combatSpellResolveMock.mockResolvedValue({ drainModifier: 0, outcomes: [] });
  getEffectiveDrainModifierMock.mockReturnValue(0);
  calculateWillpowerResistancePoolMock.mockReturnValue(8);
});

describe('SpellcastingFlow.start — spellWorkflow disabled', () => {
  it('falls back to a plain spellcasting roll without force, targeting or drain', async () => {
    settings.spellWorkflow = false;
    const actor = makeActor();

    await SpellcastingFlow.start(actor, makeSpell());

    expect(rollSkillDialogMock).toHaveBeenCalledWith(actor, 'spellcasting', {
      dice: 9,
      titleSuffix: ' Fireball',
      visibility: true,
      visualOnly: true,
    });
    expect(askSpellForceMock).not.toHaveBeenCalled();
    expect(openSpellcastingDialogMock).not.toHaveBeenCalled();
    expect(resolveDrainMock).not.toHaveBeenCalled();
    expect(combatSpellResolveMock).not.toHaveBeenCalled();
  });

  it.each(['SELF', 'TOUCH'])(
    'skips the visibility modifier for %s spells',
    async (range) => {
      settings.spellWorkflow = false;
      const actor = makeActor();

      await SpellcastingFlow.start(actor, makeSpell({ range }));

      expect(rollSkillDialogMock).toHaveBeenCalledWith(
        actor,
        'spellcasting',
        expect.objectContaining({ visibility: false })
      );
    }
  );
});

describe('SpellcastingFlow — Edge on the spellcasting roll', () => {
  it('offers Edge with an unreachable threshold and forwards the final hits', async () => {
    const actor = makeActor();
    const roll = makeRoll({ successes: 1 });
    openSpellcastingDialogMock.mockResolvedValue(roll);
    resolveEdgeForRollMock.mockResolvedValue(4);

    await SpellcastingFlow.start(actor, makeSpell({ opposed: true }));

    expect(resolveEdgeForRollMock).toHaveBeenCalledWith(actor, roll, Infinity);
    expect(opposedSpellResolveMock).toHaveBeenCalledWith(
      actor,
      expect.anything(),
      4,
      [{ target: expect.anything(), hits: 4 }],
      { quiet: false }
    );
  });

  it('forwards the post-Edge hits to the combat spell flow', async () => {
    const actor = makeActor();
    openSpellcastingDialogMock.mockResolvedValue(makeRoll({ successes: 0 }));
    resolveEdgeForRollMock.mockResolvedValue(3);

    await SpellcastingFlow.start(actor, makeSpell({ category: 'COMBAT' }));

    expect(combatSpellResolveMock).toHaveBeenCalledWith(
      actor,
      expect.anything(),
      4,
      [{ target: expect.anything(), hits: 3 }],
      { quiet: false }
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

    expect(combatSpellResolveMock).not.toHaveBeenCalled();
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

    expect(combatSpellResolveMock).toHaveBeenCalled();
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

    expect(opposedSpellResolveMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      4,
      [{ target, hits: 2 }],
      { quiet: false }
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

describe('SpellcastingFlow — area spells', () => {
  it('rolls once and resolves every target with the same hits', async () => {
    const first = makeTarget('Target A', 'Actor.targetA');
    const second = makeTarget('Target B', 'Actor.targetB');
    getValidTargetActorsMock.mockReturnValue([first, second]);
    resolveEdgeForRollMock.mockResolvedValue(3);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'COMBAT', area: true })
    );

    expect(openDicePoolSplitDialogMock).not.toHaveBeenCalled();
    expect(openSpellcastingDialogMock).toHaveBeenCalledTimes(1);
    expect(combatSpellResolveMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      4,
      [
        { target: first, hits: 3 },
        { target: second, hits: 3 },
      ],
      { quiet: true }
    );
    expect(resolveDrainMock).toHaveBeenCalledTimes(1);
  });
});

describe('SpellcastingFlow — area templates', () => {
  const marked = makeTarget('Marked', 'Actor.marked');
  const inside = makeTarget('Inside', 'Actor.inside');
  const regionData = { name: 'Fireball' };
  const areaSpell = () => makeSpell({ category: 'COMBAT', area: true });

  beforeEach(() => {
    getValidTargetActorsMock.mockReturnValue([marked]);
    askSpellForceMock.mockResolvedValue({
      force: 4,
      radiusAdjust: 2,
      placeTemplate: true,
    });
    placeSpellAreaMock.mockResolvedValue({ actors: [inside], regionData });
    confirmAreaTargetsMock.mockImplementation(async (actors) => actors);
  });

  it('keeps the marked targets when no template is placed', async () => {
    askSpellForceMock.mockResolvedValue({
      force: 4,
      radiusAdjust: 0,
      placeTemplate: false,
    });

    await SpellcastingFlow.start(makeActor(), areaSpell());

    expect(placeSpellAreaMock).not.toHaveBeenCalled();
    expect(combatSpellResolveMock.mock.calls[0][3]).toEqual([
      { target: marked, hits: 1 },
    ]);
  });

  it('places the area with the adjusted radius', async () => {
    const actor = makeActor();
    const spell = areaSpell();

    await SpellcastingFlow.start(actor, spell);

    expect(placeSpellAreaMock).toHaveBeenCalledWith(actor, spell, 6);
  });

  it('targets the confirmed tokens inside the area instead of the marked ones', async () => {
    await SpellcastingFlow.start(makeActor(), areaSpell());

    expect(confirmAreaTargetsMock).toHaveBeenCalledWith([inside]);
    expect(combatSpellResolveMock.mock.calls[0][3]).toEqual([
      { target: inside, hits: 1 },
    ]);
  });

  it('creates the region after the spellcasting roll, before resolving it', async () => {
    await SpellcastingFlow.start(makeActor(), areaSpell());

    expect(createSpellAreaMock).toHaveBeenCalledWith(regionData);
    expect(createSpellAreaMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      openSpellcastingDialogMock.mock.invocationCallOrder[0]
    );
    expect(createSpellAreaMock.mock.invocationCallOrder[0]).toBeLessThan(
      combatSpellResolveMock.mock.invocationCallOrder[0]
    );
  });

  it('leaves no region behind when the spellcasting roll is cancelled', async () => {
    openSpellcastingDialogMock.mockResolvedValue(null);

    await SpellcastingFlow.start(makeActor(), areaSpell());

    expect(createSpellAreaMock).not.toHaveBeenCalled();
  });

  it('uses the marked targets without asking when no region can be placed', async () => {
    placeSpellAreaMock.mockResolvedValue(null);

    await SpellcastingFlow.start(makeActor(), areaSpell());

    expect(confirmAreaTargetsMock).not.toHaveBeenCalled();
    expect(createSpellAreaMock).not.toHaveBeenCalled();
    expect(combatSpellResolveMock.mock.calls[0][3]).toEqual([
      { target: marked, hits: 1 },
    ]);
  });

  it('asks to confirm the marked targets when the placement is dismissed', async () => {
    placeSpellAreaMock.mockResolvedValue('dismissed');

    await SpellcastingFlow.start(makeActor(), areaSpell());

    expect(confirmAreaTargetsMock).toHaveBeenCalledWith([marked], {
      fallback: true,
    });
    expect(createSpellAreaMock).not.toHaveBeenCalled();
    expect(combatSpellResolveMock.mock.calls[0][3]).toEqual([
      { target: marked, hits: 1 },
    ]);
  });

  it('aborts the cast when the marked fallback is cancelled', async () => {
    placeSpellAreaMock.mockResolvedValue('dismissed');
    confirmAreaTargetsMock.mockResolvedValue(null);

    await SpellcastingFlow.start(makeActor(), areaSpell());

    expect(openSpellcastingDialogMock).not.toHaveBeenCalled();
    expect(resolveDrainMock).not.toHaveBeenCalled();
  });

  it('aborts a dismissed placement without marked targets', async () => {
    placeSpellAreaMock.mockResolvedValue('dismissed');
    getValidTargetActorsMock.mockReturnValue([]);

    await SpellcastingFlow.start(makeActor(), areaSpell());

    expect(confirmAreaTargetsMock).not.toHaveBeenCalled();
    expect(openSpellcastingDialogMock).not.toHaveBeenCalled();
    expect(resolveDrainMock).not.toHaveBeenCalled();
  });

  it('aborts the cast without region, roll or drain when the confirmation is cancelled', async () => {
    confirmAreaTargetsMock.mockResolvedValue(null);

    await SpellcastingFlow.start(makeActor(), areaSpell());

    expect(createSpellAreaMock).not.toHaveBeenCalled();
    expect(openSpellcastingDialogMock).not.toHaveBeenCalled();
    expect(resolveDrainMock).not.toHaveBeenCalled();
  });

  it('skips the confirmation and still creates the region for an empty area', async () => {
    placeSpellAreaMock.mockResolvedValue({ actors: [], regionData });

    await SpellcastingFlow.start(makeActor(), areaSpell());

    expect(confirmAreaTargetsMock).not.toHaveBeenCalled();
    expect(createSpellAreaMock).toHaveBeenCalledWith(regionData);
    expect(combatSpellResolveMock).not.toHaveBeenCalled();
  });
});

describe('SpellcastingFlow — area radius', () => {
  it('withholds the dice spent on the radius from the spellcasting pool', async () => {
    askSpellForceMock.mockResolvedValue({ force: 4, radiusAdjust: -2 });
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'COMBAT', area: true })
    );

    expect(openSpellcastingDialogMock).toHaveBeenCalledWith(
      expect.anything(),
      'spellcasting',
      9,
      expect.anything(),
      4,
      {
        poolModifier: -2,
        details:
          'sr4.spell.areaDetails:' + JSON.stringify({ force: 4, radius: 2 }),
      }
    );
  });

  it('casts with the full pool when the radius is not changed', async () => {
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'COMBAT', area: true })
    );

    expect(openSpellcastingDialogMock).toHaveBeenCalledWith(
      expect.anything(),
      'spellcasting',
      9,
      expect.anything(),
      4,
      {
        poolModifier: 0,
        details:
          'sr4.spell.areaDetails:' + JSON.stringify({ force: 4, radius: 4 }),
      }
    );
  });

  it('cancels the cast when the force dialog is closed', async () => {
    askSpellForceMock.mockResolvedValue(null);

    await SpellcastingFlow.start(makeActor(), makeSpell({ area: true }));

    expect(openSpellcastingDialogMock).not.toHaveBeenCalled();
    expect(resolveDrainMock).not.toHaveBeenCalled();
  });
});

describe('SpellcastingFlow._castArea', () => {
  it('reports the chosen radius with the cast result', async () => {
    resolveEdgeForRollMock.mockResolvedValue(2);
    const target = makeTarget();

    const cast = await SpellcastingFlow._castArea(
      makeActor(),
      makeSpell({ category: 'COMBAT', area: true }),
      4,
      [target],
      3
    );

    expect(cast).toEqual({
      maxHits: 2,
      perTarget: [{ target, hits: 2 }],
      radius: 7,
    });
  });
});

describe('SpellcastingFlow — no targets', () => {
  it('warns and still drains when a resisted spell has no targets', async () => {
    getValidTargetActorsMock.mockReturnValue([]);
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'COMBAT' })
    );

    expect(globalThis.ui.notifications.warn).toHaveBeenCalled();
    expect(combatSpellResolveMock).not.toHaveBeenCalled();
    expect(resolveDrainMock).toHaveBeenCalled();
  });

  it('does not sustain an opposed spell that has no targets', async () => {
    getValidTargetActorsMock.mockReturnValue([]);
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ opposed: true, duration: 'SUSTAINED' })
    );

    expect(globalThis.ui.notifications.warn).toHaveBeenCalled();
    expect(applyEffectTemplateMock).not.toHaveBeenCalled();
    expect(opposedSpellResolveMock).not.toHaveBeenCalled();
  });

  it('warns when an opposed spell without effects has no targets', async () => {
    getValidTargetActorsMock.mockReturnValue([]);
    getSpellEffectDataMock.mockReturnValue([]);
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(makeActor(), makeSpell({ opposed: true }));

    expect(globalThis.ui.notifications.warn).toHaveBeenCalled();
  });

  it('warns when an unresisted spell with effects has no targets', async () => {
    getValidTargetActorsMock.mockReturnValue([]);
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(makeActor(), makeSpell());

    expect(globalThis.ui.notifications.warn).toHaveBeenCalled();
    expect(requestEffectDecisionMock).not.toHaveBeenCalled();
  });

  it('sustains an unresisted spell without effects even without targets', async () => {
    getValidTargetActorsMock.mockReturnValue([]);
    getSpellEffectDataMock.mockReturnValue([]);
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ duration: 'SUSTAINED' })
    );

    expect(globalThis.ui.notifications.warn).not.toHaveBeenCalled();
    expect(applyEffectTemplateMock).toHaveBeenCalledWith('sustain');
  });
});

describe('SpellcastingFlow — split combat spell', () => {
  it('resolves only the targets that scored hits with their own hits', async () => {
    const first = makeTarget('Target A', 'Actor.targetA');
    const second = makeTarget('Target B', 'Actor.targetB');
    getValidTargetActorsMock.mockReturnValue([first, second]);
    openDicePoolSplitDialogMock.mockResolvedValue({
      allocations: [
        { targetId: 'Actor.targetA', allocatedDice: 4, edgePayment: null },
        { targetId: 'Actor.targetB', allocatedDice: 5, edgePayment: null },
      ],
    });
    resolveEdgeForRollMock.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    combatSpellResolveMock.mockResolvedValue({
      drainModifier: 1,
      outcomes: [],
    });

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'COMBAT' })
    );

    expect(combatSpellResolveMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      4,
      [{ target: second, hits: 2 }],
      { quiet: true }
    );
    expect(resolveDrainMock).toHaveBeenCalledTimes(1);
  });

  it('skips drain when every split roll is cancelled', async () => {
    getValidTargetActorsMock.mockReturnValue([
      makeTarget('Target A', 'Actor.targetA'),
      makeTarget('Target B', 'Actor.targetB'),
    ]);
    openDicePoolSplitDialogMock.mockResolvedValue({
      allocations: [
        { targetId: 'Actor.targetA', allocatedDice: 4, edgePayment: null },
      ],
    });
    openSpellcastingDialogMock.mockResolvedValue(null);

    await SpellcastingFlow.start(makeActor(), makeSpell());

    expect(resolveDrainMock).not.toHaveBeenCalled();
  });
});

describe('SpellcastingFlow — self spells', () => {
  it('applies the effects to the caster without a marked target', async () => {
    const actor = makeActor();
    getValidTargetActorsMock.mockReturnValue([]);
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(actor, makeSpell({ range: 'SELF' }));

    expect(globalThis.ui.notifications.warn).not.toHaveBeenCalled();
    expect(requestEffectDecisionMock).toHaveBeenCalledWith(
      actor,
      [{ name: 'Effect' }],
      'Fireball'
    );
  });

  it('ignores marked tokens and never splits the pool', async () => {
    const actor = makeActor();
    getValidTargetActorsMock.mockReturnValue([
      makeTarget('Target A', 'Actor.targetA'),
      makeTarget('Target B', 'Actor.targetB'),
    ]);
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(actor, makeSpell({ range: 'SELF' }));

    expect(openDicePoolSplitDialogMock).not.toHaveBeenCalled();
    expect(requestEffectDecisionMock).toHaveBeenCalledTimes(1);
    expect(requestEffectDecisionMock).toHaveBeenCalledWith(
      actor,
      [{ name: 'Effect' }],
      'Fireball'
    );
  });
});

describe('SpellcastingFlow — force on the roll card', () => {
  const forceDetails = (force) =>
    'sr4.spell.forceDetails:' + JSON.stringify({ force });

  it('shows the force for a single target cast', async () => {
    resolveEdgeForRollMock.mockResolvedValue(1);

    await SpellcastingFlow.start(makeActor(), makeSpell());

    expect(openSpellcastingDialogMock).toHaveBeenCalledWith(
      expect.anything(),
      'spellcasting',
      9,
      expect.anything(),
      4,
      { poolModifier: 0, details: forceDetails(4) }
    );
  });

  it('shows the force on every roll of a split cast', async () => {
    getValidTargetActorsMock.mockReturnValue([
      makeTarget('Target A', 'Actor.targetA'),
      makeTarget('Target B', 'Actor.targetB'),
    ]);
    openDicePoolSplitDialogMock.mockResolvedValue({
      allocations: [
        { targetId: 'Actor.targetA', allocatedDice: 4, edgePayment: null },
        { targetId: 'Actor.targetB', allocatedDice: 5, edgePayment: null },
      ],
    });

    await SpellcastingFlow.start(makeActor(), makeSpell());

    const options = openSpellcastingDialogMock.mock.calls.map(
      (call) => call[5]
    );
    expect(options).toEqual([
      { poolModifier: 0, edgePayment: null, details: forceDetails(4) },
      { poolModifier: 0, edgePayment: null, details: forceDetails(4) },
    ]);
  });

  it('keeps the area details instead of the plain force for area spells', async () => {
    await SpellcastingFlow.start(makeActor(), makeSpell({ area: true }));

    const [, , , , , options] = openSpellcastingDialogMock.mock.calls[0];
    expect(options.details).not.toBe(forceDetails(4));
    expect(options.details).toContain('sr4.spell.areaDetails');
  });
});

describe('SpellcastingFlow.handleDrain', () => {
  it.each([
    [5, 2, 0, 0, 4],
    [4, 3, 0, 0, 5],
    [5, 2, 1, 0, 5],
    [5, 2, 1, 2, 7],
    [5, 2, 0, -1, 3],
  ])(
    'force %i, dv %i, hit modifier %i, actor modifier %i -> drain %i',
    async (force, dv, drainModifier, actorModifier, expected) => {
      getEffectiveDrainModifierMock.mockReturnValue(actorModifier);
      const spell = { ...makeSpell(), system: { ...makeSpell().system, dv } };

      await SpellcastingFlow.handleDrain(
        makeActor(),
        spell,
        force,
        drainModifier
      );

      expect(resolveDrainMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ drainValue: expected, force })
      );
    }
  );

  it.each([
    [5, false],
    [6, true],
  ])(
    'force %i against Magic 5 -> physical drain %s',
    async (force, expected) => {
      await SpellcastingFlow.handleDrain(makeActor(), makeSpell(), force);

      expect(resolveDrainMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ isPhysical: expected })
      );
    }
  );

  it('resists with the drain attribute pool and labels the spell', async () => {
    const actor = makeActor();

    await SpellcastingFlow.handleDrain(actor, makeSpell(), 4);

    expect(calculateWillpowerResistancePoolMock).toHaveBeenCalledWith(
      actor,
      'WILLPOWER'
    );
    expect(resolveDrainMock).toHaveBeenCalledWith(actor, {
      label: 'Fireball',
      force: 4,
      drainPool: 8,
      drainValue: 4,
      isPhysical: false,
    });
  });

  it('feeds the applied combat hits into the drain', async () => {
    resolveEdgeForRollMock.mockResolvedValue(3);
    combatSpellResolveMock.mockResolvedValue({
      drainModifier: 2,
      outcomes: [],
    });

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'COMBAT' })
    );

    expect(resolveDrainMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ drainValue: 6 })
    );
  });
});

describe('SpellcastingFlow — health essence penalty', () => {
  const healthTarget = (
    essence,
    name = 'Target A',
    uuid = 'Actor.targetA'
  ) => ({
    name,
    uuid,
    getAttribute: (key) => (key === 'ESSENCE' ? essence : 6),
  });

  it.each([
    [6, 0],
    [5.5, 0],
    [4.5, -1],
    [2, -4],
    [7, 0],
    [undefined, 0],
  ])('target essence %s -> pool modifier %i', async (essence, expected) => {
    getValidTargetActorsMock.mockReturnValue([healthTarget(essence)]);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'HEALTH' })
    );

    expect(openSpellcastingDialogMock.mock.calls[0][5].poolModifier).toBe(
      expected
    );
  });

  it('ignores the essence penalty for other categories', async () => {
    getValidTargetActorsMock.mockReturnValue([healthTarget(2)]);

    await SpellcastingFlow.start(makeActor(), makeSpell());

    expect(openSpellcastingDialogMock.mock.calls[0][5].poolModifier).toBe(0);
  });

  it('casts a health spell without targets with the full pool', async () => {
    getValidTargetActorsMock.mockReturnValue([]);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'HEALTH' })
    );

    expect(openSpellcastingDialogMock.mock.calls[0][5].poolModifier).toBe(0);
  });

  it('applies each split target its own essence penalty', async () => {
    getValidTargetActorsMock.mockReturnValue([
      healthTarget(4.5, 'Target A', 'Actor.targetA'),
      healthTarget(3, 'Target B', 'Actor.targetB'),
    ]);
    openDicePoolSplitDialogMock.mockResolvedValue({
      allocations: [
        { targetId: 'Actor.targetA', allocatedDice: 4, edgePayment: null },
        { targetId: 'Actor.targetB', allocatedDice: 5, edgePayment: null },
      ],
    });

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'HEALTH' })
    );

    expect(openDicePoolSplitDialogMock).toHaveBeenCalledWith(
      expect.anything(),
      9,
      [
        { id: 'Actor.targetA', name: 'Target A', essencePenalty: 1 },
        { id: 'Actor.targetB', name: 'Target B', essencePenalty: 3 },
      ],
      'Fireball'
    );
    expect(
      openSpellcastingDialogMock.mock.calls.map((call) => call[5].poolModifier)
    ).toEqual([-1, -3]);
  });

  it('skips split allocations whose target is no longer known', async () => {
    getValidTargetActorsMock.mockReturnValue([
      makeTarget('Target A', 'Actor.targetA'),
      makeTarget('Target B', 'Actor.targetB'),
    ]);
    openDicePoolSplitDialogMock.mockResolvedValue({
      allocations: [
        { targetId: 'Actor.gone', allocatedDice: 4, edgePayment: null },
        { targetId: 'Actor.targetB', allocatedDice: 5, edgePayment: null },
      ],
    });

    await SpellcastingFlow.start(makeActor(), makeSpell());

    expect(openSpellcastingDialogMock).toHaveBeenCalledTimes(1);
    expect(openSpellcastingDialogMock.mock.calls[0][2]).toBe(5);
  });
});

describe('SpellcastingFlow — aborted and impossible casts', () => {
  it('refuses to cast without Magic', async () => {
    const actor = { ...makeActor(), getEffectiveMagic: () => 0 };

    await SpellcastingFlow.start(actor, makeSpell());

    expect(globalThis.ui.notifications.error).toHaveBeenCalledWith(
      'sr4.magic.magicStatZero'
    );
    expect(askSpellForceMock).not.toHaveBeenCalled();
  });

  it('offers the spellcasting pool for the radius in the force dialog', async () => {
    const actor = makeActor();
    const spell = makeSpell();

    await SpellcastingFlow.start(actor, spell);

    expect(askSpellForceMock).toHaveBeenCalledWith(spell, actor, 9);
  });

  it('offers an empty pool when none can be computed', async () => {
    getSpellcastingDicePoolMock.mockReturnValue(undefined);

    await SpellcastingFlow.start(makeActor(), makeSpell());

    expect(askSpellForceMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      0
    );
    expect(openSpellcastingDialogMock).not.toHaveBeenCalled();
    expect(resolveDrainMock).not.toHaveBeenCalled();
  });

  it('does not roll without workflow when no pool can be computed', async () => {
    settings.spellWorkflow = false;
    getSpellcastingDicePoolMock.mockReturnValue(undefined);

    await SpellcastingFlow.start(makeActor(), makeSpell());

    expect(rollSkillDialogMock).not.toHaveBeenCalled();
  });

  it.each([
    ['single', false],
    ['area', true],
  ])('skips drain when the %s roll dialog is closed', async (_mode, area) => {
    openSpellcastingDialogMock.mockResolvedValue(null);

    await SpellcastingFlow.start(makeActor(), makeSpell({ area }));

    expect(resolveEdgeForRollMock).not.toHaveBeenCalled();
    expect(resolveDrainMock).not.toHaveBeenCalled();
  });

  it.each([
    ['single', false],
    ['area', true],
  ])(
    'skips drain when the %s roll dialog yields nothing',
    async (_mode, area) => {
      openSpellcastingDialogMock.mockResolvedValue(undefined);

      await SpellcastingFlow.start(makeActor(), makeSpell({ area }));

      expect(resolveDrainMock).not.toHaveBeenCalled();
    }
  );

  describe('split casts', () => {
    beforeEach(() => {
      getValidTargetActorsMock.mockReturnValue([
        makeTarget('Target A', 'Actor.targetA'),
        makeTarget('Target B', 'Actor.targetB'),
      ]);
      openDicePoolSplitDialogMock.mockResolvedValue({
        allocations: [
          { targetId: 'Actor.targetA', allocatedDice: 4, edgePayment: null },
          { targetId: 'Actor.targetB', allocatedDice: 5, edgePayment: null },
        ],
      });
    });

    it('skips drain when the split dialog is cancelled', async () => {
      openDicePoolSplitDialogMock.mockResolvedValue(null);

      await SpellcastingFlow.start(makeActor(), makeSpell());

      expect(openSpellcastingDialogMock).not.toHaveBeenCalled();
      expect(resolveDrainMock).not.toHaveBeenCalled();
    });

    it('does not open the split dialog without a pool', async () => {
      getSpellcastingDicePoolMock.mockReturnValue(undefined);

      await SpellcastingFlow.start(makeActor(), makeSpell());

      expect(openDicePoolSplitDialogMock).not.toHaveBeenCalled();
    });

    it.each([null, undefined])(
      'keeps the rolls that were not cancelled (%s)',
      async (cancelled) => {
        const actor = makeActor();
        openSpellcastingDialogMock
          .mockResolvedValueOnce(cancelled)
          .mockResolvedValueOnce(makeRoll({ successes: 2 }));
        resolveEdgeForRollMock.mockResolvedValue(2);

        const cast = await SpellcastingFlow._castSplit(
          actor,
          makeSpell(),
          4,
          getValidTargetActorsMock()
        );

        expect(cast).toEqual({
          maxHits: 2,
          perTarget: [
            { target: expect.objectContaining({ name: 'Target B' }), hits: 2 },
          ],
        });
        expect(openSpellcastingDialogMock.mock.calls[1].slice(0, 3)).toEqual([
          actor,
          'spellcasting',
          5,
        ]);
      }
    );
  });
});

describe('SpellcastingFlow — resolution edge cases', () => {
  it('resolves a cast with a single hit', async () => {
    resolveEdgeForRollMock.mockResolvedValue(1);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'COMBAT' })
    );

    expect(combatSpellResolveMock).toHaveBeenCalled();
  });

  it('does not sustain when automatic sustaining is disabled', async () => {
    settings.autoSustainEffect = false;
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ duration: 'SUSTAINED' })
    );

    expect(applyEffectTemplateMock).not.toHaveBeenCalled();
  });

  it('does not sustain a spell with another duration', async () => {
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ duration: 'INSTANT' })
    );

    expect(applyEffectTemplateMock).not.toHaveBeenCalled();
  });

  it('warns when a combat spell without effects has no targets', async () => {
    getValidTargetActorsMock.mockReturnValue([]);
    getSpellEffectDataMock.mockReturnValue([]);
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'COMBAT' })
    );

    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(
      'Fireball: sr4.spell.noTargets'
    );
  });

  it('requests no effect decision for a spell without effects', async () => {
    getSpellEffectDataMock.mockReturnValue([]);
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(makeActor(), makeSpell());

    expect(requestEffectDecisionMock).not.toHaveBeenCalled();
    expect(opposedSpellResolveMock).not.toHaveBeenCalled();
  });

  it('drains only half the force for a spell without drain value', async () => {
    const spell = makeSpell();
    delete spell.system.dv;

    await SpellcastingFlow.handleDrain(makeActor(), spell, 5);

    expect(resolveDrainMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ drainValue: 2 })
    );
  });
});

describe('SpellcastingFlow — resist summary card', () => {
  const first = makeTarget('Target A', 'Actor.targetA');
  const second = makeTarget('Target B', 'Actor.targetB');
  const affected = (target, hits) => ({ target, kind: 'affected', hits });
  const resisted = (target) => ({ target, kind: 'resisted', hits: 0 });

  function splitBetweenBoth() {
    getValidTargetActorsMock.mockReturnValue([first, second]);
    openDicePoolSplitDialogMock.mockResolvedValue({
      allocations: [
        { targetId: 'Actor.targetA', allocatedDice: 4, edgePayment: null },
        { targetId: 'Actor.targetB', allocatedDice: 5, edgePayment: null },
      ],
    });
  }

  it('summarises an area combat spell on one card', async () => {
    askSpellForceMock.mockResolvedValue({ force: 4, radiusAdjust: 1 });
    getValidTargetActorsMock.mockReturnValue([first, second]);
    resolveEdgeForRollMock.mockResolvedValue(3);
    combatSpellResolveMock.mockResolvedValue({
      drainModifier: 0,
      outcomes: [affected(first, 2), resisted(second)],
    });
    const actor = makeActor();

    await SpellcastingFlow.start(
      actor,
      makeSpell({ category: 'COMBAT', area: true })
    );

    expect(sendResistSummaryMock).toHaveBeenCalledWith(
      actor,
      'Fireball',
      'sr4.spell.areaDetails:' + JSON.stringify({ force: 4, radius: 5 }),
      [affected(first, 2), resisted(second)]
    );
  });

  it('lists split targets without casting hits in target order', async () => {
    splitBetweenBoth();
    resolveEdgeForRollMock.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    combatSpellResolveMock.mockResolvedValue({
      drainModifier: 0,
      outcomes: [affected(second, 1)],
    });

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'COMBAT' })
    );

    expect(sendResistSummaryMock).toHaveBeenCalledWith(
      expect.anything(),
      'Fireball',
      'sr4.spell.forceDetails:' + JSON.stringify({ force: 4 }),
      [{ target: first, kind: 'noHits', hits: 0 }, affected(second, 1)]
    );
  });

  it('summarises an opposed split spell', async () => {
    splitBetweenBoth();
    resolveEdgeForRollMock.mockResolvedValue(2);
    opposedSpellResolveMock.mockResolvedValue([
      resisted(first),
      affected(second, 1),
    ]);

    await SpellcastingFlow.start(makeActor(), makeSpell({ opposed: true }));

    expect(opposedSpellResolveMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      4,
      expect.any(Array),
      { quiet: true }
    );
    expect(sendResistSummaryMock).toHaveBeenCalledWith(
      expect.anything(),
      'Fireball',
      expect.any(String),
      [resisted(first), affected(second, 1)]
    );
  });

  it('keeps the single message for a spell with one target', async () => {
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'COMBAT', area: true })
    );

    expect(combatSpellResolveMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      4,
      expect.any(Array),
      { quiet: false }
    );
    expect(sendResistSummaryMock).not.toHaveBeenCalled();
  });

  it('posts no card for unresisted spells with several targets', async () => {
    splitBetweenBoth();
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(makeActor(), makeSpell());

    expect(sendResistSummaryMock).not.toHaveBeenCalled();
  });

  it('posts no card when no roll scored a hit', async () => {
    splitBetweenBoth();
    resolveEdgeForRollMock.mockResolvedValue(0);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'COMBAT' })
    );

    expect(combatSpellResolveMock).not.toHaveBeenCalled();
    expect(sendResistSummaryMock).not.toHaveBeenCalled();
  });

  it('posts no card for an area spell without targets', async () => {
    getValidTargetActorsMock.mockReturnValue([]);
    resolveEdgeForRollMock.mockResolvedValue(2);

    await SpellcastingFlow.start(
      makeActor(),
      makeSpell({ category: 'COMBAT', area: true })
    );

    expect(sendResistSummaryMock).not.toHaveBeenCalled();
  });
});
