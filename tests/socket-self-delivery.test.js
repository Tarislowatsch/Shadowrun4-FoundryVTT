import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const isResponsibleForActorMock = vi.fn();

vi.mock('@utils/index', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getGame: () => globalThis.game,
    isResponsibleForActor: (...args) => isResponsibleForActorMock(...args),
    isPrimaryGM: () => true,
  };
});

vi.mock('@domains/magic/dialogs/index.js', () => ({
  openDirectSpellResistDialog: vi.fn(),
  openIndirectSpellDefenseDialog: vi.fn(),
  openOpposedSpellResistDialog: vi.fn(),
}));

const { offSystemSocket } = await import('../src/utils/game/system-socket.js');
const { requestEffectDecision, getEffectDecisionEntry } = await import(
  '../src/domains/magic/flow/apply-effects-flow.js'
);
const { SummoningFlow } = await import(
  '../src/domains/summoned-entity/flow/summoning-flow.js'
);
const { CombatSpellHook } = await import('../src/hooks/combat-spell-hook.js');
const { SummoningHook } = await import('../src/hooks/summoning-hook.js');

const target = { id: 'target1', name: 'Target', uuid: 'Actor.target1' };
const effectData = [{ name: 'Stunned' }];

/** @type {Array<{ _boundHandler: (data: object) => unknown }>} */
let hooks;

function registerHook(HookClass) {
  const hook = new HookClass();
  hooks.push(hook);
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks = [];
  globalThis.game.socket = undefined;
  globalThis.Hooks = { once: (_event, callback) => callback(), on: vi.fn() };
  globalThis.fromUuid = vi.fn().mockResolvedValue(target);
  globalThis.ChatMessage = {
    create: vi.fn().mockResolvedValue({ id: 'msg1' }),
    getSpeaker: vi.fn().mockReturnValue({}),
  };
  isResponsibleForActorMock.mockReturnValue(true);
});

afterEach(() => {
  for (const hook of hooks) offSystemSocket(hook._boundHandler);
  vi.restoreAllMocks();
});

describe('flow → socket → hook on a single client', () => {
  it('creates the effect card for a target the emitting client controls', async () => {
    registerHook(CombatSpellHook);

    await requestEffectDecision(target, effectData, 'Test Spell');

    expect(globalThis.ChatMessage.create).toHaveBeenCalled();
    expect(getEffectDecisionEntry('msg1')).toEqual({
      target,
      effectData,
      spellName: 'Test Spell',
    });
  });

  it('leaves the card to another client when this one is not responsible', async () => {
    isResponsibleForActorMock.mockReturnValue(false);
    registerHook(CombatSpellHook);

    await requestEffectDecision(target, effectData, 'Test Spell');

    expect(globalThis.ChatMessage.create).not.toHaveBeenCalled();
  });

  it('creates the summoned entity when the summoner is the primary GM', async () => {
    registerHook(SummoningHook);
    const createEntity = vi
      .spyOn(SummoningFlow, 'createEntity')
      .mockResolvedValue(undefined);
    const summoner = { uuid: 'Actor.summoner1' };

    await SummoningFlow._requestEntityCreation(
      summoner,
      'spirit',
      'Fire',
      4,
      3,
      null
    );

    expect(createEntity).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUuid: 'Actor.summoner1',
        entityType: 'spirit',
        spiritType: 'Fire',
        force: 4,
        services: 3,
      })
    );
  });
});
