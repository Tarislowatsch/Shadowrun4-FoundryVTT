import { describe, it, expect, vi, beforeEach } from 'vitest';

const requestReactiveDecisionMock = vi.fn();
const resolveEdgeForRollMock = vi.fn();
const openSoakDialogMock = vi.fn();
const defaultSoakPoolMock = vi.fn();
const openDefenseDialogMock = vi.fn();
const defaultDefensePoolMock = vi.fn();
const openDroneDefenseDialogMock = vi.fn();
const sendDecisionMessageMock = vi.fn();
const sendCombatSummaryMock = vi.fn();
const applyAndSendMock = vi.fn();

vi.mock('@utils/index', () => ({
  getGame: () => globalThis.game,
  getValidTargetActors: vi.fn(),
  openDefenseDialog: (...args) => openDefenseDialogMock(...args),
  defaultDefensePool: (...args) => defaultDefensePoolMock(...args),
  openSoakDialog: (...args) => openSoakDialogMock(...args),
  defaultSoakPool: (...args) => defaultSoakPoolMock(...args),
}));

vi.mock('@utils/rolls/decision-provider.js', () => ({
  requestReactiveDecision: (...args) => requestReactiveDecisionMock(...args),
  DecisionCategory: { COMBAT: 'COMBAT' },
  DecisionKind: { DEFENSE: 'DEFENSE', SOAK: 'SOAK' },
  DecisionRouting: { OWNER: 'OWNER' },
}));

vi.mock('@utils/rolls/roll-edge-decision.js', () => ({
  resolveEdgeForRoll: (...args) => resolveEdgeForRollMock(...args),
}));

vi.mock('@utils/rigging/drone-defense.js', () => ({
  openDroneDefenseDialog: (...args) => openDroneDefenseDialogMock(...args),
}));

vi.mock('./apply-damage-flow', () => ({
  ApplyDamageFlow: {
    sendDecisionMessage: (...args) => sendDecisionMessageMock(...args),
    sendCombatSummary: (...args) => sendCombatSummaryMock(...args),
    applyAndSend: (...args) => applyAndSendMock(...args),
  },
}));

const { DefenseFlow } = await import('../src/flows/defense-flow.js');

function makeDefender({ impact = 5, ballistic = 3 } = {}) {
  return {
    id: 'Actor.defender1',
    uuid: 'Actor.defender1',
    type: 'character',
    name: 'Defender',
    system: { armor: { impact, ballistic } },
  };
}

function makeWeapon({ damageType, damage = 6, ap = -2, apHalf = false } = {}) {
  return {
    system: { damage, damageType, ap, apHalf, armorType: 'impact' },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.game = {
    settings: {
      get: (_scope, key) =>
        key === 'combatDefenseWorkflow' || key === 'combatSoakWorkflow'
          ? true
          : false,
    },
  };
  globalThis.fromUuid = vi.fn(async () => ({
    id: 'Actor.attacker1',
    uuid: 'Actor.attacker1',
    name: 'Attacker',
  }));
  globalThis.fromUuid = globalThis.fromUuid;
  // successes=3, defenseHits=0 -> netSuccesses=3
  requestReactiveDecisionMock.mockImplementation(async (opts) => {
    if (opts.dialogKind === 'DEFENSE') return { successes: 3 };
    if (opts.dialogKind === 'SOAK') {
      await opts.openDialog();
      return null;
    }
    return null;
  });
  resolveEdgeForRollMock.mockResolvedValue(0);
});

// weapon.system.damage=6, netSuccesses=3, burstDamageBonus=0
// baseDamage (no dvBonus) = 6 + (3-1) + 0 = 8
// apEffectiveArmor (impact=5, ap=-2, apHalf=false) = max(5-2, 0) = 3

describe('DefenseFlow.start — existing damage types (no behavior change)', () => {
  it.each([
    'PHYSICAL',
    'STUN',
    'ELECTRICITY',
    'FIRE',
    'LASER',
    'BLAST',
    'LIGHT',
    'STUN_HALF',
  ])('%s keeps baseDamage=8 and AP-derived effectiveArmor=3', async (dt) => {
    const defender = makeDefender();
    const weapon = makeWeapon({ damageType: dt });

    await DefenseFlow.start(defender, 'Actor.attacker1', 3, weapon);

    expect(openSoakDialogMock).toHaveBeenCalledTimes(1);
    const [, baseDamage, , effectiveArmor] = openSoakDialogMock.mock.calls[0];
    expect(baseDamage).toBe(8);
    expect(effectiveArmor).toBe(3);
    expect(defaultSoakPoolMock).toHaveBeenCalledWith(
      defender,
      3,
      expect.any(Number)
    );
  });
});

describe('DefenseFlow.start — element rules plumbing', () => {
  it('METAL adds dvBonus to baseDamage and uses full raw impact armor', async () => {
    const defender = makeDefender();
    const weapon = makeWeapon({ damageType: 'METAL' });

    await DefenseFlow.start(defender, 'Actor.attacker1', 3, weapon);

    const [, baseDamage, , effectiveArmor] = openSoakDialogMock.mock.calls[0];
    expect(baseDamage).toBe(10); // 8 + dvBonus(2)
    expect(effectiveArmor).toBe(5); // raw impact armor, AP ignored
  });

  it('a noArmor element (TOXIN) zeroes out effectiveArmor', async () => {
    const defender = makeDefender();
    const weapon = makeWeapon({ damageType: 'TOXIN' });

    await DefenseFlow.start(defender, 'Actor.attacker1', 3, weapon);

    const [, baseDamage, , effectiveArmor] = openSoakDialogMock.mock.calls[0];
    expect(baseDamage).toBe(8); // dvBonus(0)
    expect(effectiveArmor).toBe(0);
  });

  it.each(['RADIATION', 'SMOKE', 'SOUND'])(
    '%s ignores armor entirely (effectiveArmor=0)',
    async (dt) => {
      const defender = makeDefender();
      const weapon = makeWeapon({ damageType: dt });

      await DefenseFlow.start(defender, 'Actor.attacker1', 3, weapon);

      const [, baseDamage, , effectiveArmor] = openSoakDialogMock.mock.calls[0];
      expect(baseDamage).toBe(8); // dvBonus(0)
      expect(effectiveArmor).toBe(0);
    }
  );
});
