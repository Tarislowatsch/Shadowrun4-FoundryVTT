import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeDerivedStats } from '../src/models/actor/character-derived-stats.js';
import { SR4BaseCharacterData } from '../src/models/actor/basecharacter.model.js';

vi.mock('@utils/game/game', () => ({
  getGame: () => globalThis.game,
}));

let settings;

beforeEach(() => {
  settings = {
    changeEncumbranceToStrength: false,
    ignoreEncumbranceSingleArmorItem: false,
  };

  globalThis.game = {
    settings: {
      get: vi.fn((namespace, key) => {
        if (namespace !== 'shadowrun4e') return undefined;
        return settings[key];
      }),
    },
  };
});

function makeActorData({
  BODY = 4,
  WILLPOWER = 4,
  INTUITION = 4,
  REACTION = 3,
  STRENGTH = 3,
  LOGIC = 3,
  CHARISMA = 3,
  physDmg = 0,
  stunDmg = 0,
  generalModifier = 0,
  woundModBonus = 0,
  overflowBonus = 0,
  physPasses = 0,
  astralPasses = 0,
  matrixPasses = 0,
  physBonus = 0,
  astralBonus = 0,
  matrixBonus = 0,
  magician = false,
  adept = false,
  matrixSimMode = 'cold',
  technomancer = false,
  RESONANCE = 6,
} = {}) {
  return {
    sheetStats: {
      BODY,
      WILLPOWER,
      INTUITION,
      REACTION,
      STRENGTH,
      LOGIC,
      CHARISMA,
      AGILITY: 3,
      EDGE: 3,
      CURRENTEDGE: 3,
      MAGIC: 0,
      RESONANCE,
      ESSENCE: 6,
      INITIATIVE: 0,
      MATRIXINITIATIVE: 0,
      ASTRALINITIATIVE: 0,
    },
    modifiers: {
      generalModifier,
      woundModBonus,
      overflowBonus,
      attackModifier: 0,
      defenseModifier: 0,
      soakBonus: 0,
      initiative: {
        passes: {
          physical: physPasses,
          astral: astralPasses,
          matrix: matrixPasses,
        },
        bonuses: {
          physical: physBonus,
          astral: astralBonus,
          matrix: matrixBonus,
        },
      },
    },
    conditionMonitor: {
      physical: { value: physDmg, max: 0 },
      stun: { value: stunDmg, max: 0 },
    },
    derivedStats: {
      woundModifier: 0,
      dicePoolModifier: 0,
      overflow: 0,
      passesString: '',
      initiative: { physical: 0, astral: 0, matrix: 0 },
      judgeIntentions: 0,
      liftCarry: 0,
      memory: 0,
      composure: 0,
    },
    magic: { magician, adept },
    matrixSimMode,
    technomancy: { technomancer },
  };
}

describe('computeDerivedStats', () => {
  describe('condition monitor maxima', () => {
    it.each([
      ['BODY', 4, 10],
      ['BODY', 3, 10],
      ['WILLPOWER', 6, 11],
      ['WILLPOWER', 3, 10],
    ])('%s %i -> monitor max = %i', (stat, value, expectedMax) => {
      const data = makeActorData({ [stat]: value });
      const result = computeDerivedStats(data);
      const monitor = stat === 'BODY' ? 'physical' : 'stun';
      expect(result.monitorMax[monitor]).toBe(expectedMax);
    });

    it('does not mutate the input conditionMonitor', () => {
      const data = makeActorData({ BODY: 4, WILLPOWER: 6 });
      computeDerivedStats(data);
      expect(data.conditionMonitor.physical.max).toBe(0);
      expect(data.conditionMonitor.stun.max).toBe(0);
    });
  });

  describe('overflow', () => {
    it('equals BODY when no bonus', () => {
      const data = makeActorData({ BODY: 5 });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.overflow).toBe(5);
    });

    it('adds overflowBonus', () => {
      const data = makeActorData({ BODY: 4, overflowBonus: 2 });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.overflow).toBe(6);
    });
  });

  describe('wound modifier', () => {
    // woundModifier = -floor((physDmg + stunDmg) / (3 + woundModBonus)), a negative signed penalty.
    it.each([
      [0, 0, 0, 0],
      [3, 0, 0, -1],
      [3, 3, 0, -2],
      [5, 0, 0, -1],
      [4, 0, 1, -1],
      [3, 0, 1, 0],
    ])(
      'physDmg %i, stunDmg %i, woundModBonus %i -> %i',
      (physDmg, stunDmg, woundModBonus, expected) => {
        const data = makeActorData({ physDmg, stunDmg, woundModBonus });
        const result = computeDerivedStats(data);
        expect(result.derivedStats.woundModifier).toBe(expected);
      }
    );
  });

  describe('dicePoolModifier', () => {
    it('is woundModifier + generalModifier', () => {
      // woundModifier=-1 (negative penalty) + generalModifier=-2 → -3
      const data = makeActorData({ physDmg: 3, generalModifier: -2 });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.dicePoolModifier).toBe(-3);
    });
  });

  describe('initiative', () => {
    it('physical = INTUITION + REACTION', () => {
      const data = makeActorData({ INTUITION: 4, REACTION: 3 });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.initiative.physical).toBe(7);
    });

    it('physical adds initiative bonus', () => {
      const data = makeActorData({ INTUITION: 4, REACTION: 3, physBonus: 2 });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.initiative.physical).toBe(9);
    });

    it('matrix = 0 without technomancer or equipped commlink', () => {
      const data = makeActorData({ INTUITION: 5, matrixBonus: 1 });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.initiative.matrix).toBe(0);
    });

    it('matrix = Response + INTUITION + matrix bonus + hot sim bonus for technomancers', () => {
      const data = makeActorData({
        INTUITION: 5,
        matrixBonus: 1,
        technomancer: true,
      });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.initiative.matrix).toBe(5 + 5 + 1 + 1);
    });

    it('technomancers always run hot sim, even with cold sim selected', () => {
      const data = makeActorData({
        INTUITION: 4,
        technomancer: true,
        matrixSimMode: 'cold',
      });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.initiative.matrix).toBe(4 + 4 + 1);
    });

    it('living persona Response is capped at RESONANCE', () => {
      const data = makeActorData({
        INTUITION: 5,
        technomancer: true,
        RESONANCE: 3,
      });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.initiative.matrix).toBe(3 + 5 + 1);
    });

    it('astral = 0 for non-magicians', () => {
      const data = makeActorData({ magician: false, INTUITION: 6 });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.initiative.astral).toBe(0);
    });

    it('astral = INTUITION * 2 for magicians', () => {
      const data = makeActorData({ magician: true, INTUITION: 4 });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.initiative.astral).toBe(8);
    });

    it('astral adds astral bonus for magicians', () => {
      const data = makeActorData({
        magician: true,
        INTUITION: 4,
        astralBonus: 2,
      });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.initiative.astral).toBe(10);
    });

    it('astral = 0 for mystic adepts (magician + adept)', () => {
      const data = makeActorData({ magician: true, adept: true, INTUITION: 6 });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.initiative.astral).toBe(0);
    });
  });

  describe('passesString', () => {
    it('mundane without matrix access defaults to "1/0/0"', () => {
      const data = makeActorData({ magician: false });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.passesString).toBe('1/0/0');
    });

    it('magician defaults to "1/0/3" (physical/matrix/astral)', () => {
      const data = makeActorData({ magician: true });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.passesString).toBe('1/0/3');
    });

    it('mystic adept (magician + adept) has 0 astral passes', () => {
      const data = makeActorData({ magician: true, adept: true });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.passesString).toBe('1/0/0');
    });

    it('technomancer always has hotSimPasses matrix passes', () => {
      const cold = computeDerivedStats(makeActorData({ technomancer: true }));
      const hot = computeDerivedStats(
        makeActorData({ technomancer: true, matrixSimMode: 'hot' })
      );
      expect(cold.derivedStats.passesString).toBe('1/3/0');
      expect(hot.derivedStats.passesString).toBe('1/3/0');
    });

    it('reflects initiative pass bonuses (physical/matrix/astral)', () => {
      const data = makeActorData({
        magician: true,
        technomancer: true,
        physPasses: 1,
        astralPasses: 1,
        matrixPasses: 1,
      });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.passesString).toBe('2/4/4');
    });
  });

  describe('composite stats', () => {
    it('judgeIntentions = CHARISMA + WILLPOWER', () => {
      const data = makeActorData({ CHARISMA: 4, WILLPOWER: 3 });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.judgeIntentions).toBe(7);
    });

    it('liftCarry = STRENGTH + BODY', () => {
      const data = makeActorData({ STRENGTH: 5, BODY: 4 });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.liftCarry).toBe(9);
    });

    it('memory = LOGIC + INTUITION', () => {
      const data = makeActorData({ LOGIC: 4, INTUITION: 5 });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.memory).toBe(9);
    });

    it('composure = WILLPOWER + CHARISMA', () => {
      const data = makeActorData({ WILLPOWER: 3, CHARISMA: 4 });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.composure).toBe(7);
    });

    it.each([
      [5, 3],
      [4, 2],
      [1, 1],
      [6, 3],
    ])('meleeDamageBonus = ceil(STR/2): STR %i → %i', (strength, expected) => {
      const data = makeActorData({ STRENGTH: strength });
      const result = computeDerivedStats(data);
      expect(result.derivedStats.meleeDamageBonus).toBe(expected);
    });
  });

  describe('sheetStats result', () => {
    it('returns physical initiative as sheetStats.INITIATIVE without mutating the input', () => {
      const data = makeActorData({ INTUITION: 4, REACTION: 3 });
      const result = computeDerivedStats(data);
      expect(result.sheetStats.INITIATIVE).toBe(7);
      expect(data.sheetStats.INITIATIVE).toBe(0);
    });

    it('returns matrix initiative as sheetStats.MATRIXINITIATIVE', () => {
      const data = makeActorData({ INTUITION: 5, technomancer: true });
      const result = computeDerivedStats(data);
      expect(result.sheetStats.MATRIXINITIATIVE).toBe(11);
    });
  });

  describe('missing conditionMonitor guard', () => {
    it('returns derivedStats unchanged, and null monitorMax/sheetStats, when conditionMonitor is null', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const data = makeActorData();
      data.conditionMonitor = null;
      const result = computeDerivedStats(data);
      expect(result.derivedStats).toEqual(data.derivedStats);
      expect(result.monitorMax).toBeNull();
      expect(result.sheetStats).toBeNull();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});

describe('character matrix condition monitor', () => {
  it('technomancers have no separate matrix CM (max 0)', () => {
    const data = makeActorData({ LOGIC: 4, technomancer: true });
    data.conditionMonitor.matrix = { value: 0, max: 0 };
    const result = computeDerivedStats(data);
    expect(result.monitorMax.matrix).toBe(0);
  });

  it('mundane matrix CM max = 8 + ceil(System/2) from equipped commlink', () => {
    const data = makeActorData();
    data.conditionMonitor.matrix = { value: 0, max: 0 };
    data.parent = {
      items: [{ type: 'Commlink', system: { equipped: true, os: 4 } }],
    };
    const result = computeDerivedStats(data);
    expect(result.monitorMax.matrix).toBe(10); // 8 + ceil(4/2)
  });

  it('is undefined when the actor has no matrix condition monitor at all', () => {
    const data = makeActorData();
    const result = computeDerivedStats(data);
    expect(result.monitorMax.matrix).toBeUndefined();
  });
});

describe('SR4BaseCharacterData.prepareDerivedData integration', () => {
  function makeCharacterData() {
    const self = new SR4BaseCharacterData();
    self.parent = { items: [] };
    self.sheetStats = {
      BODY: 4,
      WILLPOWER: 4,
      INTUITION: 4,
      REACTION: 3,
      STRENGTH: 3,
      LOGIC: 3,
      CHARISMA: 3,
      AGILITY: 3,
      EDGE: 3,
      CURRENTEDGE: 3,
      MAGIC: 0,
      RESONANCE: 6,
      ESSENCE: 6,
      INITIATIVE: 0,
      MATRIXINITIATIVE: 0,
      ASTRALINITIATIVE: 0,
    };
    self.modifiers = {
      generalModifier: 0,
      woundModBonus: 0,
      overflowBonus: 0,
      attackModifier: 0,
      defenseModifier: 0,
      soakBonus: 0,
      initiative: {
        passes: { physical: 0, astral: 0, matrix: 0 },
        bonuses: { physical: 0, astral: 0, matrix: 0 },
      },
    };
    self.conditionMonitor = {
      physical: { value: 0, max: 0 },
      stun: { value: 0, max: 0 },
    };
    self.derivedStats = {
      woundModifier: 0,
      dicePoolModifier: 0,
      overflow: 0,
      passesString: '',
      initiative: { physical: 0, astral: 0, matrix: 0 },
      judgeIntentions: 0,
      liftCarry: 0,
      memory: 0,
      composure: 0,
    };
    self.magic = { magician: false, adept: false };
    self.matrixSimMode = 'cold';
    self.technomancy = { technomancer: false };
    self.armor = { ballistic: 0, impact: 0, encumbrance: 0 };
    self.biocompatibility = '';
    self.sensitiveSystem = false;
    return self;
  }

  it('applies computeDerivedStats monitorMax onto the live conditionMonitor', () => {
    const self = makeCharacterData();
    self.prepareDerivedData();
    expect(self.conditionMonitor.physical.max).toBe(10); // 8 + ceil(4/2)
    expect(self.conditionMonitor.stun.max).toBe(10);
  });

  it('applies computeDerivedStats sheetStats onto the live sheetStats', () => {
    const self = makeCharacterData();
    self.prepareDerivedData();
    expect(self.sheetStats.INITIATIVE).toBe(7); // INTUITION + REACTION
  });

  it('merges computeDerivedStats derivedStats onto the live derivedStats', () => {
    const self = makeCharacterData();
    self.prepareDerivedData();
    expect(self.derivedStats.liftCarry).toBe(7); // STRENGTH + BODY
    expect(self.derivedStats.meleeDamageBonus).toBe(2); // ceil(3/2)
  });
});
