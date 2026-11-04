import { describe, it, expect, vi, beforeEach } from 'vitest';

const fromTemplate = vi.fn().mockResolvedValue({});

vi.mock('@effects/index', () => ({
  SR4ActiveEffect: { fromTemplate },
}));

const { applyKnockdown } = await import(
  '../src/models/shared/knockdown-rules.js'
);

const SETTINGS = {
  knockdownRule: 'always',
  knockdownAutoThreshold: 10,
  knockdownBodyModifier: 0,
};

function makeActor(overrides = {}) {
  return {
    id: 'actor1',
    name: 'Runner',
    type: 'character',
    statuses: new Set(),
    getAttribute: () => 3,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.game.settings = {
    get: vi.fn((_scope, key) => SETTINGS[key]),
  };
  globalThis.game.i18n.format = vi.fn((key, params) => `${key}:${params.name}`);
  globalThis.ChatMessage = {
    create: vi.fn().mockResolvedValue({ id: 'msg1' }),
    getSpeaker: vi.fn().mockReturnValue({}),
  };
});

describe('applyKnockdown', () => {
  it('applies the knockedDown effect and announces it', async () => {
    const actor = makeActor();

    const result = await applyKnockdown(actor, 4);

    expect(fromTemplate).toHaveBeenCalledWith('knockedDown', actor);
    expect(result).toEqual({ knocked: true, threshold: 3, reason: 'body' });
    expect(globalThis.game.i18n.format).toHaveBeenCalledWith(
      'sr4.damage.knockdown',
      { name: 'Runner', damage: 4, threshold: 3 }
    );
  });

  it('announces the automatic threshold with its own wording', async () => {
    await applyKnockdown(makeActor({ getAttribute: () => 12 }), 10);

    expect(globalThis.game.i18n.format).toHaveBeenCalledWith(
      'sr4.damage.knockdownAuto',
      { name: 'Runner', damage: 10, threshold: 10 }
    );
  });

  it.each([
    ['an actor without getAttribute', undefined],
    ['an actor whose Body is 0', () => 0],
    ['a non-numeric Body', () => undefined],
  ])('does not knock down %s', async (_label, getAttribute) => {
    const actor = makeActor({ getAttribute });

    await applyKnockdown(actor, 12);

    expect(fromTemplate).not.toHaveBeenCalled();
    expect(globalThis.ChatMessage.create).not.toHaveBeenCalled();
  });

  it('does nothing when the damage stays below the threshold', async () => {
    await applyKnockdown(makeActor({ getAttribute: () => 5 }), 4);

    expect(fromTemplate).not.toHaveBeenCalled();
    expect(globalThis.ChatMessage.create).not.toHaveBeenCalled();
  });

  it('ignores fully resisted damage', async () => {
    await applyKnockdown(makeActor(), 0);

    expect(fromTemplate).not.toHaveBeenCalled();
  });

  it('does not knock down vehicles', async () => {
    await applyKnockdown(makeActor({ type: 'vehicle' }), 12);

    expect(fromTemplate).not.toHaveBeenCalled();
  });

  it('does not stack on an already downed actor', async () => {
    const actor = makeActor({ statuses: new Set(['sr4-knocked-down']) });

    await applyKnockdown(actor, 12);

    expect(fromTemplate).not.toHaveBeenCalled();
  });

  it('respects the off mode', async () => {
    globalThis.game.settings.get = vi.fn((_scope, key) =>
      key === 'knockdownRule' ? 'off' : SETTINGS[key]
    );

    await applyKnockdown(makeActor(), 12);

    expect(fromTemplate).not.toHaveBeenCalled();
  });

  it('only fires for gel rounds in gelOnly mode', async () => {
    globalThis.game.settings.get = vi.fn((_scope, key) =>
      key === 'knockdownRule' ? 'gelOnly' : SETTINGS[key]
    );

    await applyKnockdown(makeActor(), 4);
    expect(fromTemplate).not.toHaveBeenCalled();

    await applyKnockdown(makeActor(), 4, { gelRounds: true });
    expect(fromTemplate).toHaveBeenCalledWith(
      'knockedDown',
      expect.objectContaining({ id: 'actor1' })
    );
  });
});
