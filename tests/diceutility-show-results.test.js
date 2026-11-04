import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@utils/templates', () => ({
  TEMPLATES: { ui: { dialogs: { rollResults: 'roll-results.hbs' } } },
  renderTemplate: vi.fn(async () => '<div></div>'),
}));

vi.mock('@hooks/dice-total-patch-hook.js', () => ({
  watchDiceTotalPatch: () => ({ resolve: vi.fn(), cancel: vi.fn() }),
}));

const { DiceUtility } = await import('../src/utils/rolls/diceutility.js');
const { SYSTEM_ID } = await import('../src/utils/game/system-id.js');

const toMessageMock = vi.fn(async () => ({ id: 'msg-1' }));
const getSpeakerMock = vi.fn(() => ({ alias: 'speaker' }));

class FakeRoll {
  async roll() {
    this.terms = [{ results: [{ result: 5 }, { result: 2 }] }];
    return this;
  }

  toMessage(data) {
    return toMessageMock(data);
  }
}

/**
 * @returns {object}
 */
function makeActor() {
  return { id: 'actor-1', name: 'Rigger', useEdge: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.Roll = FakeRoll;
  globalThis.ChatMessage = { getSpeaker: getSpeakerMock };
});

afterEach(() => {
  delete globalThis.Roll;
  delete globalThis.ChatMessage;
});

describe('DiceUtility.showResults', () => {
  it('builds the speaker from the rolling actor', async () => {
    const actor = makeActor();

    await DiceUtility.rollAndShow({ numDice: 2, actor });

    expect(getSpeakerMock).toHaveBeenCalledWith({ actor });
    expect(toMessageMock.mock.calls[0][0].speaker).toEqual({
      alias: 'speaker',
    });
  });

  it('keeps the actor document out of the stored roll options', async () => {
    const actor = makeActor();

    await DiceUtility.rollAndShow({ numDice: 2, actor, skillName: 'Pistols' });

    const flags = toMessageMock.mock.calls[0][0].flags[SYSTEM_ID];
    expect(flags.actorId).toBe('actor-1');
    expect(flags.options.actor).toBeUndefined();
    expect(flags.options.skillName).toBe('Pistols');
  });
});

describe('DiceUtility.followUpRoll', () => {
  it('leaves Edge consumption to the caller', async () => {
    const actor = makeActor();

    const total = await DiceUtility.followUpRoll({
      numDice: 2,
      explode: true,
      prevSuccesses: 3,
      actor,
    });

    expect(total).toBe(4);
    expect(actor.useEdge).not.toHaveBeenCalled();
    expect(getSpeakerMock).toHaveBeenCalledWith({ actor });
  });
});
