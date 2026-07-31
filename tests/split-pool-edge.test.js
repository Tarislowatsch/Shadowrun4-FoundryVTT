import { describe, it, expect, vi, beforeEach } from 'vitest';

const rollAndShowMock = vi.fn();
const dialogPromptMock = vi.fn();

vi.mock('@utils/rolls/diceutility.js', () => ({
  DiceUtility: { rollAndShow: (...args) => rollAndShowMock(...args) },
}));

vi.mock('@utils/templates', () => ({
  TEMPLATES: { ui: { dialogs: { dicePoolSplit: 'split.hbs' } } },
  renderTemplate: vi.fn().mockResolvedValue('<form></form>'),
}));

const { dialogActions, createDialogParameters, createEdgePayment } =
  await import('../src/utils/dialog/pool-math.js');
const { openDicePoolSplitDialog } = await import(
  '../src/utils/dialog/dice-pool-split.js'
);

function makeActor({ currentEdge = 3, edge = 5 } = {}) {
  return {
    getAttribute: (key) => (key === 'EDGE' ? edge : currentEdge),
    useEdge: vi.fn(),
    system: { modifiers: {}, derivedStats: {} },
  };
}

function makeDialog(fields = {}) {
  return {
    querySelector: (selector) => {
      const id = selector.replace('#', '');
      if (!(id in fields)) return null;
      const value = fields[id];
      return typeof value === 'boolean'
        ? { checked: value }
        : { value: String(value) };
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.ui = { notifications: { warn: vi.fn() } };
  globalThis.foundry.applications = {
    api: { DialogV2: { prompt: (...args) => dialogPromptMock(...args) } },
  };
  rollAndShowMock.mockResolvedValue({
    successes: 2,
    isGlitch: false,
    messageId: 'msg1',
  });
});

describe('dialogActions — Edge owed by a split pool', () => {
  it('redeems the payment on the first roll and explodes', async () => {
    const actor = makeActor();
    const edgePayment = createEdgePayment();

    const result = await dialogActions(
      makeDialog(),
      actor,
      'pistols',
      6,
      undefined,
      { edgePayment }
    );

    expect(actor.useEdge).toHaveBeenCalledTimes(1);
    expect(edgePayment.pending).toBe(false);
    expect(rollAndShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ explode: true, numDice: 6 })
    );
    expect(result.edgeUsed).toBe(true);
  });

  it('charges nothing on the follow-up rolls but still explodes', async () => {
    const actor = makeActor();
    const edgePayment = createEdgePayment();

    for (let i = 0; i < 3; i++) {
      await dialogActions(makeDialog(), actor, 'pistols', 6, undefined, {
        edgePayment,
      });
    }

    expect(actor.useEdge).toHaveBeenCalledTimes(1);
    expect(rollAndShowMock).toHaveBeenCalledTimes(3);
    for (const [args] of rollAndShowMock.mock.calls) {
      expect(args.explode).toBe(true);
      expect(args.numDice).toBe(6);
    }
  });

  it('never charges twice even if the Edge checkbox is somehow ticked', async () => {
    const actor = makeActor();
    const edgePayment = createEdgePayment();

    await dialogActions(
      makeDialog({ edge: true }),
      actor,
      'pistols',
      6,
      undefined,
      { edgePayment }
    );

    expect(actor.useEdge).toHaveBeenCalledTimes(1);
  });

  it('still charges Edge for a normal roll whose checkbox is ticked', async () => {
    const actor = makeActor();

    const result = await dialogActions(
      makeDialog({ edge: true }),
      actor,
      'pistols',
      6
    );

    expect(actor.useEdge).toHaveBeenCalledTimes(1);
    expect(rollAndShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ explode: true, numDice: 11 })
    );
    expect(result.edgeUsed).toBe(true);
  });

  it('does not add the Edge dice again for an allocation that already contains them', async () => {
    const actor = makeActor({ edge: 9 });

    await dialogActions(makeDialog(), actor, 'pistols', 12, undefined, {
      edgePayment: createEdgePayment(),
    });

    expect(rollAndShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ numDice: 12, explode: true })
    );
  });
});

describe('createDialogParameters — Edge owed by a split pool', () => {
  it('hides the Edge checkbox for the rolls of a split pool', () => {
    const params = createDialogParameters(makeActor(), 6, undefined, {
      edgePayment: createEdgePayment(),
    });
    expect(params.edgeAvailable).toBe(false);
  });

  it('offers Edge as usual otherwise', () => {
    const params = createDialogParameters(makeActor(), 6);
    expect(params.edgeAvailable).toBe(true);
  });
});

describe('openDicePoolSplitDialog', () => {
  const targets = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
  ];

  it('charges no Edge itself, so cancelling every roll costs nothing', async () => {
    const actor = makeActor();
    const edgePayment = createEdgePayment();
    dialogPromptMock.mockResolvedValue({
      allocations: [
        { targetId: 'a', allocatedDice: 6, edgePayment },
        { targetId: 'b', allocatedDice: 5, edgePayment },
      ],
    });

    const result = await openDicePoolSplitDialog(actor, 6, targets, 'Ares');

    expect(actor.useEdge).not.toHaveBeenCalled();
    expect(edgePayment.pending).toBe(true);
    expect(result.allocations).toHaveLength(2);
  });

  it('hands every allocation the same payment token', async () => {
    const actor = makeActor();
    const edgePayment = createEdgePayment();
    dialogPromptMock.mockResolvedValue({
      allocations: [
        { targetId: 'a', allocatedDice: 6, edgePayment },
        { targetId: 'b', allocatedDice: 5, edgePayment },
      ],
    });

    const result = await openDicePoolSplitDialog(actor, 6, targets, 'Ares');

    const [first, second] = result.allocations;
    expect(first.edgePayment).toBe(second.edgePayment);
  });

  it('offers the Edge dice count even when it dwarfs the base pool', async () => {
    const actor = makeActor({ edge: 9 });
    dialogPromptMock.mockResolvedValue({ allocations: [] });

    await openDicePoolSplitDialog(actor, 2, targets, 'Ares');

    const { renderTemplate } = await import('@utils/templates');
    expect(renderTemplate).toHaveBeenCalledWith(
      'split.hbs',
      expect.objectContaining({
        totalDice: 2,
        maxEdge: 9,
        edgeAvailable: true,
      })
    );
  });

  it('warns and aborts when there are fewer dice than targets', async () => {
    const actor = makeActor();

    const result = await openDicePoolSplitDialog(actor, 1, targets, 'Ares');

    expect(result).toBeNull();
    expect(dialogPromptMock).not.toHaveBeenCalled();
    expect(globalThis.ui.notifications.warn).toHaveBeenCalled();
  });
});
