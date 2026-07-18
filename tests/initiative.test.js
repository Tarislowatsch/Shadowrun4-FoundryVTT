import { describe, it, expect } from 'vitest';
import {
  REALMS,
  getInitiativeBase,
  getPassCount,
  getAvailableRealms,
  getCombatantRealm,
  edgeFirstInitiative,
  glitchInitiative,
  effectivePassCount,
} from '@documents/initiative.js';
import {
  computeMatrixResponse,
  hasMatrixAccess,
} from '@documents/derivedStats.mapper.js';
import { SR4 } from '../src/config.js';

/**
 * @param {object} [options]
 */
function makeActor({
  type = 'character',
  intuition = 4,
  reaction = 4,
  physicalBase = 8,
  astral = 8,
  magician = false,
  adept = false,
  technomancer = false,
  responseBonus = 0,
  simMode = 'cold',
  realm = 'physical',
  matrixInitiative = 0,
  passesString,
  passes = { physical: 0, astral: 0, matrix: 0 },
  bonuses = { physical: 0, astral: 0, matrix: 0 },
  commlinks = [],
} = {}) {
  return {
    type,
    getInitiativeBase: () => physicalBase,
    items: commlinks.map((c) => ({
      type: 'Commlink',
      system: { equipped: c.equipped ?? true, response: c.response },
    })),
    system: {
      realm,
      matrixSimMode: simMode,
      sheetStats: { INTUITION: intuition, REACTION: reaction },
      derivedStats: {
        initiative: { astral, matrix: matrixInitiative },
        passesString,
      },
      magic: { magician, adept },
      technomancy: { technomancer },
      livingPersona: { responseBonus },
      modifiers: { initiative: { passes, bonuses } },
    },
  };
}

const combatantFor = (actor) => ({ actor });

describe('computeMatrixResponse', () => {
  it('uses INTUITION + responseBonus for technomancers', () => {
    const actor = makeActor({
      technomancer: true,
      intuition: 5,
      responseBonus: 1,
    });
    expect(computeMatrixResponse(actor.system, actor.items)).toBe(6);
  });

  it('picks the highest equipped commlink response otherwise', () => {
    const actor = makeActor({
      commlinks: [
        { response: 3, equipped: true },
        { response: 5, equipped: true },
        { response: 9, equipped: false },
      ],
    });
    expect(computeMatrixResponse(actor.system, actor.items)).toBe(5);
  });

  it('returns 0 without a technomancer or equipped commlink', () => {
    const actor = makeActor();
    expect(computeMatrixResponse(actor.system, actor.items)).toBe(0);
  });
});

describe('hasMatrixAccess', () => {
  it('is true for technomancers and equipped commlinks, false otherwise', () => {
    const techno = makeActor({ technomancer: true });
    const decker = makeActor({ commlinks: [{ response: 3 }] });
    const mundane = makeActor();
    expect(hasMatrixAccess(techno.system, techno.items)).toBe(true);
    expect(hasMatrixAccess(decker.system, decker.items)).toBe(true);
    expect(hasMatrixAccess(mundane.system, mundane.items)).toBe(false);
  });
});

describe('getInitiativeBase', () => {
  it('returns physical base for physical', () => {
    const actor = makeActor({ physicalBase: 8 });
    expect(getInitiativeBase(actor, 'physical')).toBe(8);
  });

  it('matrix uses the derived matrix initiative', () => {
    const actor = makeActor({ matrixInitiative: 8 });
    expect(getInitiativeBase(actor, 'matrix')).toBe(8);
  });

  it('astral uses the derived astral initiative', () => {
    const actor = makeActor({ astral: 10, magician: true });
    expect(getInitiativeBase(actor, 'astral')).toBe(10);
  });
});

describe('getPassCount', () => {
  it('physical uses 1 + physical passes', () => {
    const actor = makeActor({ passes: { physical: 2, astral: 0, matrix: 0 } });
    expect(getPassCount(combatantFor(actor), 'physical')).toBe(3);
  });

  it('matrix cold sim is coldSimPasses + matrix pass bonus', () => {
    const actor = makeActor({
      simMode: 'cold',
      passes: { physical: 0, astral: 0, matrix: 1 },
    });
    expect(getPassCount(combatantFor(actor), 'matrix')).toBe(
      SR4.rules.matrix.coldSimPasses + 1
    );
  });

  it('matrix hot sim is hotSimPasses + matrix pass bonus', () => {
    const actor = makeActor({
      simMode: 'hot',
      passes: { physical: 0, astral: 0, matrix: 0 },
    });
    expect(getPassCount(combatantFor(actor), 'matrix')).toBe(
      SR4.rules.matrix.hotSimPasses
    );
  });

  it('astral is 3 + astral passes for mages, 0 for mundanes and mystic adepts', () => {
    const mage = makeActor({
      magician: true,
      passes: { physical: 0, astral: 1, matrix: 0 },
    });
    const mysticAdept = makeActor({
      magician: true,
      adept: true,
      passes: { physical: 0, astral: 1, matrix: 0 },
    });
    const mundane = makeActor({
      magician: false,
      passes: { physical: 0, astral: 1, matrix: 0 },
    });
    expect(getPassCount(combatantFor(mage), 'astral')).toBe(4);
    expect(getPassCount(combatantFor(mysticAdept), 'astral')).toBe(0);
    expect(getPassCount(combatantFor(mundane), 'astral')).toBe(0);
  });

  it('reads passes from a summoned entity passesString (physical/matrix/astral)', () => {
    const spirit = makeActor({ type: 'spirit', passesString: '2/0/2' });
    expect(getPassCount(combatantFor(spirit), 'physical')).toBe(2);
    expect(getPassCount(combatantFor(spirit), 'astral')).toBe(2);
  });
});

describe('getAvailableRealms', () => {
  it('mundane characters only have physical', () => {
    expect(getAvailableRealms(makeActor())).toEqual(['physical']);
  });

  it('mages and spirits add astral, mystic adepts do not', () => {
    expect(getAvailableRealms(makeActor({ magician: true }))).toContain(
      'astral'
    );
    expect(getAvailableRealms(makeActor({ type: 'spirit' }))).toContain(
      'astral'
    );
    expect(
      getAvailableRealms(makeActor({ magician: true, adept: true }))
    ).not.toContain('astral');
  });

  it('deckers and technomancers add matrix', () => {
    const decker = makeActor({ commlinks: [{ response: 3 }] });
    const techno = makeActor({ technomancer: true });
    expect(getAvailableRealms(decker)).toEqual(
      expect.arrayContaining(['physical', 'matrix'])
    );
    expect(getAvailableRealms(techno)).toContain('matrix');
  });

  it('vehicles only have physical', () => {
    expect(getAvailableRealms(makeActor({ type: 'vehicle' }))).toEqual([
      'physical',
    ]);
  });
});

describe('getCombatantRealm', () => {
  it('falls back to the actor realm, defaulting to physical', () => {
    expect(getCombatantRealm({ actor: { system: { realm: 'matrix' } } })).toBe(
      'matrix'
    );
    expect(getCombatantRealm({ actor: { system: {} } })).toBe('physical');
    expect(getCombatantRealm({})).toBe('physical');
  });

  it('prefers the per-combatant flag over the actor default', () => {
    const combatant = {
      getFlag: (scope, key) =>
        scope === 'shadowrun4e' && key === 'realm' ? 'astral' : undefined,
      actor: { system: { realm: 'matrix' } },
    };
    expect(getCombatantRealm(combatant)).toBe('astral');
  });
});

describe('edgeFirstInitiative', () => {
  it('is the sentinel plus own score as a decimal tiebreaker', () => {
    expect(edgeFirstInitiative(11)).toBeCloseTo(99.11);
    expect(edgeFirstInitiative(8)).toBeCloseTo(99.08);
    expect(edgeFirstInitiative(11)).toBeGreaterThan(edgeFirstInitiative(8));
  });
});

describe('glitchInitiative', () => {
  it('nudges the score just below equal scores', () => {
    expect(glitchInitiative(11)).toBeCloseTo(10.99);
    expect(glitchInitiative(11)).toBeLessThan(11);
  });
});

describe('effectivePassCount', () => {
  it('ignores a mid-turn increase but applies a decrease immediately', () => {
    expect(effectivePassCount(3, 4)).toBe(3);
    expect(effectivePassCount(3, 1)).toBe(1);
    expect(effectivePassCount(undefined, 2)).toBe(2);
    expect(effectivePassCount(null, 2)).toBe(2);
  });
});

describe('REALMS', () => {
  it('lists every supported realm', () => {
    expect(REALMS).toEqual(['physical', 'matrix', 'astral']);
  });
});
