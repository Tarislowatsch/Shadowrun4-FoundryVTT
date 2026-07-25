import { describe, it, expect, vi, beforeEach } from 'vitest';

const getPassCountMock = vi.fn();
const combatantPassesMock = vi.fn();

vi.mock('../src/domains/combat/initiative.js', () => ({
  getPassCount: (...args) => getPassCountMock(...args),
  combatantPasses: (...args) => combatantPassesMock(...args),
}));

const { advanceTurn, refreshPassLocks } = await import(
  '../src/domains/combat/flow/turn-order-flow.js'
);

function makeCombat({
  initiativePass = 1,
  turn = 0,
  combatants = [],
  turns = combatants,
  updateMock = vi.fn(),
  updateEmbeddedDocumentsMock = vi.fn(),
  nextRoundMock = vi.fn(),
} = {}) {
  return {
    initiativePass,
    turn,
    combatants,
    turns,
    update: updateMock,
    updateEmbeddedDocuments: updateEmbeddedDocumentsMock,
    nextRound: nextRoundMock,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('refreshPassLocks', () => {
  it('locks each combatant pass count onto a flag', async () => {
    const updateEmbeddedDocumentsMock = vi.fn();
    getPassCountMock.mockImplementation((c) => c.passes);
    const combatants = [
      { id: 'a', passes: 2 },
      { id: 'b', passes: 1 },
    ];
    const combat = makeCombat({ combatants, updateEmbeddedDocumentsMock });

    await refreshPassLocks(combat);

    expect(updateEmbeddedDocumentsMock).toHaveBeenCalledWith('Combatant', [
      { _id: 'a', 'flags.shadowrun4e.passLock': 2 },
      { _id: 'b', 'flags.shadowrun4e.passLock': 1 },
    ]);
  });

  it('does nothing when there are no combatants', async () => {
    const updateEmbeddedDocumentsMock = vi.fn();
    const combat = makeCombat({ combatants: [], updateEmbeddedDocumentsMock });

    await refreshPassLocks(combat);

    expect(updateEmbeddedDocumentsMock).not.toHaveBeenCalled();
  });
});

describe('advanceTurn', () => {
  it('advances to the next combatant eligible for the current pass', async () => {
    const updateMock = vi.fn();
    combatantPassesMock.mockImplementation((c) => c.passes);
    const turns = [
      { id: 'a', passes: 2 },
      { id: 'b', passes: 1 },
      { id: 'c', passes: 2 },
    ];
    const combat = makeCombat({
      initiativePass: 2,
      turn: 0,
      turns,
      updateMock,
    });

    await advanceTurn(combat);

    expect(updateMock).toHaveBeenCalledWith({ turn: 2 });
  });

  it('opens the next pass when no combatant remains in the current one', async () => {
    const updateMock = vi.fn();
    combatantPassesMock.mockImplementation((c) => c.passes);
    const turns = [
      { id: 'a', passes: 1 },
      { id: 'b', passes: 2 },
    ];
    const combat = makeCombat({
      initiativePass: 1,
      turn: 1,
      turns,
      updateMock,
    });

    await advanceTurn(combat);

    expect(updateMock).toHaveBeenCalledWith({
      turn: 1,
      'flags.shadowrun4e.initiativePass': 2,
    });
  });

  it('rolls over to the next round when no combatant has any further pass', async () => {
    const nextRoundMock = vi.fn();
    combatantPassesMock.mockImplementation((c) => c.passes);
    const turns = [
      { id: 'a', passes: 1 },
      { id: 'b', passes: 1 },
    ];
    const combat = makeCombat({
      initiativePass: 1,
      turn: 1,
      turns,
      nextRoundMock,
    });

    await advanceTurn(combat);

    expect(nextRoundMock).toHaveBeenCalledOnce();
  });
});
