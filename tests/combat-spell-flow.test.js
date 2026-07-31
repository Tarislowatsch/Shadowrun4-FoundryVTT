import { describe, it, expect, vi, beforeEach } from 'vitest';

const getValidTargetActorsOrWarnMock = vi.fn();
const awaitOpposedSocketResponseMock = vi.fn();
const openDirectSpellAllocationDialogMock = vi.fn();
const getSpellEffectDataMock = vi.fn();
const sendCombatSummaryMock = vi.fn();

vi.mock('@utils/index', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getGame: () => globalThis.game,
    getValidTargetActorsOrWarn: (...args) =>
      getValidTargetActorsOrWarnMock(...args),
    awaitOpposedSocketResponse: (...args) =>
      awaitOpposedSocketResponseMock(...args),
  };
});

vi.mock('@domains/magic/dialogs/combat-spell.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    openDirectSpellAllocationDialog: (...args) =>
      openDirectSpellAllocationDialogMock(...args),
  };
});

vi.mock('../src/domains/magic/flow/apply-effects-flow.js', () => ({
  getSpellEffectData: (...args) => getSpellEffectDataMock(...args),
}));

vi.mock('@domains/combat/flow/apply-damage-flow.js', () => ({
  ApplyDamageFlow: {
    sendCombatSummary: (...args) => sendCombatSummaryMock(...args),
  },
}));

const { CombatSpellFlow } = await import(
  '../src/domains/magic/flow/combat-spell-flow.js'
);

function makeCaster(uuid = 'Actor.caster1') {
  return { uuid, name: 'Caster' };
}

function makeTarget(name = 'Test Target', uuid = 'Actor.target1') {
  return { name, uuid };
}

function makeSpell(damageType, name = 'Test Spell') {
  return {
    name,
    system: { combatType: 'DIRECT', type: 'PHYSICAL', damageType },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.ui = { notifications: { warn: vi.fn(), info: vi.fn() } };
  globalThis.game.settings = { get: () => true };
  globalThis.game.socket = { emit: vi.fn() };
  getValidTargetActorsOrWarnMock.mockReturnValue([makeTarget()]);
  awaitOpposedSocketResponseMock.mockResolvedValue(2);
  openDirectSpellAllocationDialogMock.mockResolvedValue(2);
  getSpellEffectDataMock.mockReturnValue([]);
});

describe('CombatSpellFlow direct damage — isPhysical', () => {
  it.each([
    ['PHYSICAL', true],
    ['STUN', false],
    ['ELECTRICITY', false],
    ['STUN_HALF', false],
  ])('%s spell damageType -> isPhysical: %s', async (damageType, expected) => {
    await CombatSpellFlow.start(makeCaster(), makeSpell(damageType), 4, 3);

    expect(globalThis.game.socket.emit).toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.objectContaining({
        action: 'applyDirectSpellDamage',
        payload: expect.objectContaining({ isPhysical: expected }),
      })
    );
  });
});

describe('CombatSpellFlow direct damage — fully resisted', () => {
  beforeEach(() => {
    awaitOpposedSocketResponseMock.mockResolvedValue(0);
  });

  it('reports the resisted spell instead of ending it silently', async () => {
    await CombatSpellFlow.start(makeCaster(), makeSpell('PHYSICAL'), 4, 3);

    expect(sendCombatSummaryMock).toHaveBeenCalledWith(
      'Caster',
      'Test Target',
      'spellNoEffect',
      { spell: 'Test Spell' }
    );
  });

  it('neither allocates hits nor emits damage', async () => {
    await CombatSpellFlow.start(makeCaster(), makeSpell('PHYSICAL'), 4, 3);

    expect(openDirectSpellAllocationDialogMock).not.toHaveBeenCalled();
    expect(globalThis.game.socket.emit).not.toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.objectContaining({ action: 'applyDirectSpellDamage' })
    );
  });
});

describe('CombatSpellFlow.startPerTarget direct damage — isPhysical', () => {
  it.each([
    ['PHYSICAL', true],
    ['STUN', false],
    ['ELECTRICITY', false],
    ['STUN_HALF', false],
  ])('%s spell damageType -> isPhysical: %s', async (damageType, expected) => {
    await CombatSpellFlow.startPerTarget(
      makeCaster(),
      makeSpell(damageType),
      [{ target: makeTarget(), hits: 4 }],
      3
    );

    expect(globalThis.game.socket.emit).toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.objectContaining({
        action: 'applyDirectSpellDamage',
        payload: expect.objectContaining({ isPhysical: expected }),
      })
    );
  });
});
