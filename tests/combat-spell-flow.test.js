import { describe, it, expect, vi, beforeEach } from 'vitest';

const getValidTargetActorsOrWarnMock = vi.fn();
const awaitOpposedSocketResponseMock = vi.fn();
const openDirectSpellAllocationDialogMock = vi.fn();
const getSpellEffectDataMock = vi.fn();

vi.mock('@utils/index.js', () => ({
  getGame: () => globalThis.game,
  getValidTargetActorsOrWarn: (...args) =>
    getValidTargetActorsOrWarnMock(...args),
  awaitOpposedSocketResponse: (...args) =>
    awaitOpposedSocketResponseMock(...args),
}));

vi.mock('@utils/dialog/magic/combat-spell.js', () => ({
  openDirectSpellAllocationDialog: (...args) =>
    openDirectSpellAllocationDialogMock(...args),
}));

vi.mock('./apply-effects-flow', () => ({
  getSpellEffectData: (...args) => getSpellEffectDataMock(...args),
}));

const { CombatSpellFlow } = await import('../src/flows/combat-spell-flow.js');

function makeCaster(uuid = 'Actor.caster1') {
  return { uuid };
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
