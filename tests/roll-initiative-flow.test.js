import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SR4 } from '@config';
const promptEdgeFirstMock = vi.fn();

vi.mock('../src/domains/combat/dialogs/edge-first.js', () => ({
  promptEdgeFirst: (...args) => promptEdgeFirstMock(...args),
}));

const { rollInitiativeForCombatant } = await import(
  '../src/domains/combat/flow/roll-initiative-flow.js'
);

let rollResults = [];
let rollFormula;

const toMessageMock = vi.fn();

class FakeRoll {
  constructor(formula) {
    this.formula = formula;
    rollFormula = formula;
  }

  async evaluate() {
    this.dice = [
      {
        results: rollResults.map((result) => ({ result })),
      },
    ];

    return this;
  }

  async toMessage(data) {
    toMessageMock(data);
  }
}

function makeActor({
  base = 6,
  malus = 0,
  currentEdge = 0,
  useEdgeMock = vi.fn(),
} = {}) {
  return {
    id: 'actor-1',
    system: {
      derivedStats: {
        initiative: {
          matrix: 0,
          astral: 0,
        },
      },
    },
    getInitiativeBase: () => base,
    getAttribute: (key) => (key === 'CURRENTEDGE' ? currentEdge : 0),
    getMalus: () => malus,
    useEdge: useEdgeMock,
  };
}

function makeCombatant(
  actor,
  { id = 'combatant-1', updateMock = vi.fn() } = {}
) {
  return {
    id,
    actor,
    getFlag: () => undefined,
    update: updateMock,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  rollResults = [];
  rollFormula = undefined;

  globalThis.Roll = FakeRoll;

  globalThis.ChatMessage = {
    getSpeaker: () => ({}),
  };

  promptEdgeFirstMock.mockResolvedValue(false);
});

describe('rollInitiativeForCombatant', () => {
  it('does nothing when the combatant has no actor', async () => {
    const combatant = makeCombatant(null);

    await rollInitiativeForCombatant({ id: 'combat-1' }, combatant);

    expect(combatant.update).not.toHaveBeenCalled();
  });

  it('rolls dice and sets initiative when no edge is available', async () => {
    rollResults = [5, 6, 2];

    const updateMock = vi.fn();

    const actor = makeActor({
      base: 6,
      currentEdge: 0,
    });

    const combatant = makeCombatant(actor, {
      updateMock,
    });

    await rollInitiativeForCombatant({ id: 'combat-1' }, combatant);

    // 2 successes (>=5) out of 3 dice
    // base 6 -> initiative 8
    expect(updateMock).toHaveBeenCalledWith({
      initiative: 8,
    });

    expect(toMessageMock).toHaveBeenCalledOnce();
  });

  it('applies a negative malus to the number of dice', async () => {
    rollResults = [5, 6, 2];

    const updateMock = vi.fn();

    const actor = makeActor({
      base: 6,
      malus: -2,
      currentEdge: 0,
    });

    const combatant = makeCombatant(actor, {
      updateMock,
    });

    await rollInitiativeForCombatant({ id: 'combat-1' }, combatant);

    // base 6 - abs(-2) = 4 dice
    expect(rollFormula).toBe(`4d6cs>=${SR4.rules.successThreshold}`);

    // 2 successes -> base 6 + 2 = 8
    expect(updateMock).toHaveBeenCalledWith({
      initiative: 8,
    });

    expect(toMessageMock).toHaveBeenCalledOnce();
  });

  it('applies a positive malus to the number of dice', async () => {
    rollResults = [5, 6, 2];

    const updateMock = vi.fn();

    const actor = makeActor({
      base: 6,
      malus: 2,
      currentEdge: 0,
    });

    const combatant = makeCombatant(actor, {
      updateMock,
    });

    await rollInitiativeForCombatant({ id: 'combat-1' }, combatant);

    // base 6 - abs(2) = 4 dice
    expect(rollFormula).toBe(`4d6cs>=${SR4.rules.successThreshold}`);

    expect(updateMock).toHaveBeenCalledWith({
      initiative: 8,
    });

    expect(toMessageMock).toHaveBeenCalledOnce();
  });

  it('never rolls fewer than one die', async () => {
    rollResults = [6];

    const updateMock = vi.fn();

    const actor = makeActor({
      base: 6,
      malus: -10,
      currentEdge: 0,
    });

    const combatant = makeCombatant(actor, {
      updateMock,
    });

    await rollInitiativeForCombatant({ id: 'combat-1' }, combatant);

    // Math.max(1, 6 - abs(-10)) = 1
    expect(rollFormula).toBe(`1d6cs>=${SR4.rules.successThreshold}`);

    // One success -> base 6 + 1 = 7
    expect(updateMock).toHaveBeenCalledWith({
      initiative: 7,
    });
  });

  it('marks a glitch when at least half the dice are 1s', async () => {
    rollResults = [1, 1, 6];

    const updateMock = vi.fn();

    const actor = makeActor({
      base: 6,
      currentEdge: 0,
    });

    const combatant = makeCombatant(actor, {
      updateMock,
    });

    await rollInitiativeForCombatant({ id: 'combat-1' }, combatant);

    // 1 success, score 7, glitch
    // -> glitchInitiative(7) = 7 - tiebreak
    const [{ initiative }] = updateMock.mock.calls[0];

    expect(initiative).toBeLessThan(7);

    const [flavorArgs] = toMessageMock.mock.calls[0];

    expect(flavorArgs.flavor).toMatch(/glitch/i);
  });

  it('uses edge-first initiative when the player confirms the prompt', async () => {
    promptEdgeFirstMock.mockResolvedValue(true);

    const useEdgeMock = vi.fn();
    const updateMock = vi.fn();

    const actor = makeActor({
      base: 6,
      currentEdge: 1,
      useEdgeMock,
    });

    const combatant = makeCombatant(actor, {
      updateMock,
    });

    await rollInitiativeForCombatant({ id: 'combat-1' }, combatant);

    expect(useEdgeMock).toHaveBeenCalledOnce();

    expect(updateMock).toHaveBeenCalledOnce();

    const [{ initiative }] = updateMock.mock.calls[0];

    expect(initiative).toBeCloseTo(99.06);

    // Edge-first does not perform a normal dice roll.
    expect(toMessageMock).not.toHaveBeenCalled();
  });

  it('does not use edge when the player declines the prompt', async () => {
    promptEdgeFirstMock.mockResolvedValue(false);

    rollResults = [4, 3];

    const useEdgeMock = vi.fn();
    const updateMock = vi.fn();

    const actor = makeActor({
      base: 6,
      currentEdge: 1,
      useEdgeMock,
    });

    const combatant = makeCombatant(actor, {
      updateMock,
    });

    await rollInitiativeForCombatant({ id: 'combat-1' }, combatant);

    expect(useEdgeMock).not.toHaveBeenCalled();

    expect(updateMock).toHaveBeenCalledWith({
      initiative: 6,
    });
  });
});
