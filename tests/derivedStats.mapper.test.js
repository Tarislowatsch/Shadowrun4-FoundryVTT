import { describe, it, expect, vi } from 'vitest';
import {
  computeDerivedStats,
  computeSpiritDerivedStats,
  computeSpriteDerivedStats,
  computeVehicleDerivedStats,
  computeMatrixSystem,
  computeMatrixFirewall,
  computeBiofeedbackFilter,
  effectiveSimMode,
} from '../src/documents/derivedStats.mapper.js';

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
    it('physical max = ceil(8 + BODY/2)', () => {
      const data = makeActorData({ BODY: 4 });
      computeDerivedStats(data);
      expect(data.conditionMonitor.physical.max).toBe(10); // 8+2
    });

    it('rounds up for odd BODY', () => {
      const data = makeActorData({ BODY: 3 });
      computeDerivedStats(data);
      expect(data.conditionMonitor.physical.max).toBe(10); // ceil(8+1.5)
    });

    it('stun max = ceil(8 + WILLPOWER/2)', () => {
      const data = makeActorData({ WILLPOWER: 6 });
      computeDerivedStats(data);
      expect(data.conditionMonitor.stun.max).toBe(11); // 8+3
    });

    it('rounds up for odd WILLPOWER', () => {
      const data = makeActorData({ WILLPOWER: 3 });
      computeDerivedStats(data);
      expect(data.conditionMonitor.stun.max).toBe(10); // ceil(8+1.5)
    });
  });

  describe('overflow', () => {
    it('equals BODY when no bonus', () => {
      const data = makeActorData({ BODY: 5 });
      const result = computeDerivedStats(data);
      expect(result.overflow).toBe(5);
    });

    it('adds overflowBonus', () => {
      const data = makeActorData({ BODY: 4, overflowBonus: 2 });
      const result = computeDerivedStats(data);
      expect(result.overflow).toBe(6);
    });
  });

  describe('wound modifier', () => {
    // woundModifier is a negative signed penalty (−1 per 3 boxes).
    it('is 0 with no damage', () => {
      const data = makeActorData();
      const result = computeDerivedStats(data);
      expect(result.woundModifier).toBe(0);
    });

    it('is -1 per 3 boxes of physical damage', () => {
      const data = makeActorData({ physDmg: 3 });
      const result = computeDerivedStats(data);
      expect(result.woundModifier).toBe(-1);
    });

    it('stacks physical and stun damage', () => {
      const data = makeActorData({ physDmg: 3, stunDmg: 3 });
      const result = computeDerivedStats(data);
      expect(result.woundModifier).toBe(-2);
    });

    it('floors partial brackets', () => {
      const data = makeActorData({ physDmg: 5 }); // floor(5/3) = 1
      const result = computeDerivedStats(data);
      expect(result.woundModifier).toBe(-1);
    });

    it('woundModBonus increases divisor, raising threshold', () => {
      // divisor becomes 3+1=4; 4 boxes / 4 = 1
      const data = makeActorData({ physDmg: 4, woundModBonus: 1 });
      const result = computeDerivedStats(data);
      expect(result.woundModifier).toBe(-1);
    });

    it('woundModBonus=1 suppresses penalty below new threshold', () => {
      // divisor=4; floor(3/4) = 0 (would be -1 without bonus)
      const data = makeActorData({ physDmg: 3, woundModBonus: 1 });
      const result = computeDerivedStats(data);
      expect(result.woundModifier).toBe(0);
    });
  });

  describe('dicePoolModifier', () => {
    it('is woundModifier + generalModifier', () => {
      // woundModifier=-1 (negative penalty) + generalModifier=-2 → -3
      const data = makeActorData({ physDmg: 3, generalModifier: -2 });
      const result = computeDerivedStats(data);
      expect(result.dicePoolModifier).toBe(-3);
    });
  });

  describe('initiative', () => {
    it('physical = INTUITION + REACTION', () => {
      const data = makeActorData({ INTUITION: 4, REACTION: 3 });
      const result = computeDerivedStats(data);
      expect(result.initiative.physical).toBe(7);
    });

    it('physical adds initiative bonus', () => {
      const data = makeActorData({ INTUITION: 4, REACTION: 3, physBonus: 2 });
      const result = computeDerivedStats(data);
      expect(result.initiative.physical).toBe(9);
    });

    it('matrix = 0 without technomancer or equipped commlink', () => {
      const data = makeActorData({ INTUITION: 5, matrixBonus: 1 });
      const result = computeDerivedStats(data);
      expect(result.initiative.matrix).toBe(0);
    });

    it('matrix = Response + INTUITION + matrix bonus + hot sim bonus for technomancers', () => {
      const data = makeActorData({
        INTUITION: 5,
        matrixBonus: 1,
        technomancer: true,
      });
      const result = computeDerivedStats(data);
      expect(result.initiative.matrix).toBe(5 + 5 + 1 + 1);
    });

    it('technomancers always run hot sim, even with cold sim selected', () => {
      const data = makeActorData({
        INTUITION: 4,
        technomancer: true,
        matrixSimMode: 'cold',
      });
      const result = computeDerivedStats(data);
      expect(result.initiative.matrix).toBe(4 + 4 + 1);
    });

    it('living persona Response is capped at RESONANCE', () => {
      const data = makeActorData({
        INTUITION: 5,
        technomancer: true,
        RESONANCE: 3,
      });
      const result = computeDerivedStats(data);
      expect(result.initiative.matrix).toBe(3 + 5 + 1);
    });

    it('astral = 0 for non-magicians', () => {
      const data = makeActorData({ magician: false, INTUITION: 6 });
      const result = computeDerivedStats(data);
      expect(result.initiative.astral).toBe(0);
    });

    it('astral = INTUITION * 2 for magicians', () => {
      const data = makeActorData({ magician: true, INTUITION: 4 });
      const result = computeDerivedStats(data);
      expect(result.initiative.astral).toBe(8);
    });

    it('astral adds astral bonus for magicians', () => {
      const data = makeActorData({
        magician: true,
        INTUITION: 4,
        astralBonus: 2,
      });
      const result = computeDerivedStats(data);
      expect(result.initiative.astral).toBe(10);
    });

    it('astral = 0 for mystic adepts (magician + adept)', () => {
      const data = makeActorData({ magician: true, adept: true, INTUITION: 6 });
      const result = computeDerivedStats(data);
      expect(result.initiative.astral).toBe(0);
    });
  });

  describe('passesString', () => {
    it('mundane without matrix access defaults to "1/0/0"', () => {
      const data = makeActorData({ magician: false });
      const result = computeDerivedStats(data);
      expect(result.passesString).toBe('1/0/0');
    });

    it('magician defaults to "1/0/3" (physical/matrix/astral)', () => {
      const data = makeActorData({ magician: true });
      const result = computeDerivedStats(data);
      expect(result.passesString).toBe('1/0/3');
    });

    it('mystic adept (magician + adept) has 0 astral passes', () => {
      const data = makeActorData({ magician: true, adept: true });
      const result = computeDerivedStats(data);
      expect(result.passesString).toBe('1/0/0');
    });

    it('technomancer always has hotSimPasses matrix passes', () => {
      const cold = computeDerivedStats(makeActorData({ technomancer: true }));
      const hot = computeDerivedStats(
        makeActorData({ technomancer: true, matrixSimMode: 'hot' })
      );
      expect(cold.passesString).toBe('1/3/0');
      expect(hot.passesString).toBe('1/3/0');
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
      expect(result.passesString).toBe('2/4/4');
    });
  });

  describe('composite stats', () => {
    it('judgeIntentions = CHARISMA + WILLPOWER', () => {
      const data = makeActorData({ CHARISMA: 4, WILLPOWER: 3 });
      const result = computeDerivedStats(data);
      expect(result.judgeIntentions).toBe(7);
    });

    it('liftCarry = STRENGTH + BODY', () => {
      const data = makeActorData({ STRENGTH: 5, BODY: 4 });
      const result = computeDerivedStats(data);
      expect(result.liftCarry).toBe(9);
    });

    it('memory = LOGIC + INTUITION', () => {
      const data = makeActorData({ LOGIC: 4, INTUITION: 5 });
      const result = computeDerivedStats(data);
      expect(result.memory).toBe(9);
    });

    it('composure = WILLPOWER + CHARISMA', () => {
      const data = makeActorData({ WILLPOWER: 3, CHARISMA: 4 });
      const result = computeDerivedStats(data);
      expect(result.composure).toBe(7);
    });

    it.each([
      [5, 3],
      [4, 2],
      [1, 1],
      [6, 3],
    ])('meleeDamageBonus = ceil(STR/2): STR %i → %i', (strength, expected) => {
      const data = makeActorData({ STRENGTH: strength });
      const result = computeDerivedStats(data);
      expect(result.meleeDamageBonus).toBe(expected);
    });
  });

  describe('sheetStats side-effects', () => {
    it('writes physical initiative back to sheetStats.INITIATIVE', () => {
      const data = makeActorData({ INTUITION: 4, REACTION: 3 });
      computeDerivedStats(data);
      expect(data.sheetStats.INITIATIVE).toBe(7);
    });

    it('writes matrix initiative back to sheetStats.MATRIXINITIATIVE', () => {
      const data = makeActorData({ INTUITION: 5, technomancer: true });
      computeDerivedStats(data);
      expect(data.sheetStats.MATRIXINITIATIVE).toBe(11);
    });
  });

  describe('missing conditionMonitor guard', () => {
    it('returns unchanged derivedStats when conditionMonitor is null', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const data = makeActorData();
      data.conditionMonitor = null;
      const result = computeDerivedStats(data);
      expect(result).toEqual(data.derivedStats);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});

describe('computeSpiritDerivedStats', () => {
  function makeSpiritData({
    BODY = 4,
    WILLPOWER = 4,
    INTUITION = 4,
    REACTION = 3,
    physDmg = 0,
    stunDmg = 0,
    generalModifier = 0,
  } = {}) {
    return {
      sheetStats: {
        BODY,
        WILLPOWER,
        INTUITION,
        REACTION,
        INITIATIVE: 0,
        ASTRALINITIATIVE: 0,
        MATRIXINITIATIVE: 0,
      },
      modifiers: { generalModifier },
      conditionMonitor: {
        physical: { value: physDmg, max: 0 },
        stun: { value: stunDmg, max: 0 },
      },
      derivedStats: {
        woundModifier: 0,
        dicePoolModifier: 0,
        passesString: '',
        initiative: { physical: 0, astral: 0, matrix: 0 },
      },
    };
  }

  it('sets physical monitor max from BODY', () => {
    const data = makeSpiritData({ BODY: 4 });
    computeSpiritDerivedStats(data);
    expect(data.conditionMonitor.physical.max).toBe(10);
  });

  it('sets stun monitor max from WILLPOWER', () => {
    const data = makeSpiritData({ WILLPOWER: 6 });
    computeSpiritDerivedStats(data);
    expect(data.conditionMonitor.stun.max).toBe(11);
  });

  it('physical initiative = INTUITION + REACTION', () => {
    const data = makeSpiritData({ INTUITION: 5, REACTION: 4 });
    const result = computeSpiritDerivedStats(data);
    expect(result.initiative.physical).toBe(9);
  });

  it('astral initiative = INTUITION * 2', () => {
    const data = makeSpiritData({ INTUITION: 5 });
    const result = computeSpiritDerivedStats(data);
    expect(result.initiative.astral).toBe(10);
  });

  it('writes initiative values back to sheetStats', () => {
    const data = makeSpiritData({ INTUITION: 5, REACTION: 4 });
    computeSpiritDerivedStats(data);
    expect(data.sheetStats.INITIATIVE).toBe(9);
    expect(data.sheetStats.ASTRALINITIATIVE).toBe(10);
    expect(data.sheetStats.MATRIXINITIATIVE).toBe(0);
  });

  it('matrix initiative is always 0', () => {
    const data = makeSpiritData();
    const result = computeSpiritDerivedStats(data);
    expect(result.initiative.matrix).toBe(0);
  });

  it('has no wound modifier regardless of damage', () => {
    const data = makeSpiritData({ physDmg: 3, stunDmg: 3 });
    const result = computeSpiritDerivedStats(data);
    expect(result.woundModifier).toBe(0);
  });

  it('dicePoolModifier = generalModifier only', () => {
    const data = makeSpiritData({ physDmg: 3, generalModifier: -2 });
    const result = computeSpiritDerivedStats(data);
    expect(result.dicePoolModifier).toBe(-2);
  });

  it('passesString is always "2/0/2"', () => {
    const data = makeSpiritData();
    const result = computeSpiritDerivedStats(data);
    expect(result.passesString).toBe('2/0/2');
  });
});

describe('computeSpriteDerivedStats', () => {
  function makeSpriteData({
    BODY = 4,
    WILLPOWER = 4,
    INTUITION = 4,
    REACTION = 3,
    physDmg = 0,
    stunDmg = 0,
    generalModifier = 0,
  } = {}) {
    return {
      sheetStats: {
        BODY,
        WILLPOWER,
        INTUITION,
        REACTION,
        INITIATIVE: 0,
        ASTRALINITIATIVE: 0,
        MATRIXINITIATIVE: 0,
      },
      modifiers: { generalModifier },
      conditionMonitor: {
        physical: { value: physDmg, max: 0 },
        stun: { value: stunDmg, max: 0 },
      },
      derivedStats: {
        woundModifier: 0,
        dicePoolModifier: 0,
        passesString: '',
        initiative: { physical: 0, astral: 0, matrix: 0 },
      },
    };
  }

  it('sets physical monitor max from BODY', () => {
    const data = makeSpriteData({ BODY: 4 });
    computeSpriteDerivedStats(data);
    expect(data.conditionMonitor.physical.max).toBe(10);
  });

  it('sets stun monitor max from WILLPOWER', () => {
    const data = makeSpriteData({ WILLPOWER: 6 });
    computeSpriteDerivedStats(data);
    expect(data.conditionMonitor.stun.max).toBe(11);
  });

  it('physical initiative = INTUITION + REACTION', () => {
    const data = makeSpriteData({ INTUITION: 5, REACTION: 4 });
    const result = computeSpriteDerivedStats(data);
    expect(result.initiative.physical).toBe(9);
  });

  it('matrix initiative = INTUITION * 2', () => {
    const data = makeSpriteData({ INTUITION: 5 });
    const result = computeSpriteDerivedStats(data);
    expect(result.initiative.matrix).toBe(10);
  });

  it('astral initiative is always 0', () => {
    const data = makeSpriteData();
    const result = computeSpriteDerivedStats(data);
    expect(result.initiative.astral).toBe(0);
  });

  it('writes initiative values back to sheetStats', () => {
    const data = makeSpriteData({ INTUITION: 5, REACTION: 4 });
    computeSpriteDerivedStats(data);
    expect(data.sheetStats.INITIATIVE).toBe(9);
    expect(data.sheetStats.MATRIXINITIATIVE).toBe(10);
    expect(data.sheetStats.ASTRALINITIATIVE).toBe(0);
  });

  it('has no wound modifier regardless of damage', () => {
    const data = makeSpriteData({ physDmg: 3, stunDmg: 3 });
    const result = computeSpriteDerivedStats(data);
    expect(result.woundModifier).toBe(0);
  });

  it('dicePoolModifier = generalModifier only', () => {
    const data = makeSpriteData({ physDmg: 3, generalModifier: -2 });
    const result = computeSpriteDerivedStats(data);
    expect(result.dicePoolModifier).toBe(-2);
  });

  it('passesString is always "2/2/0"', () => {
    const data = makeSpriteData();
    const result = computeSpriteDerivedStats(data);
    expect(result.passesString).toBe('2/2/0');
  });

  it('has no separate matrix condition monitor (max 0)', () => {
    const data = makeSpriteData();
    data.conditionMonitor.matrix = { value: 0, max: 8 };
    computeSpriteDerivedStats(data);
    expect(data.conditionMonitor.matrix.max).toBe(0);
  });
});

describe('spirit vs sprite symmetry/divergence', () => {
  function makeEntityData({ INTUITION = 5, REACTION = 3 } = {}) {
    return {
      sheetStats: {
        BODY: 4,
        WILLPOWER: 4,
        INTUITION,
        REACTION,
        INITIATIVE: 0,
        ASTRALINITIATIVE: 0,
        MATRIXINITIATIVE: 0,
      },
      modifiers: { generalModifier: 0 },
      conditionMonitor: {
        physical: { value: 0, max: 0 },
        stun: { value: 0, max: 0 },
      },
      derivedStats: {
        woundModifier: 0,
        dicePoolModifier: 0,
        passesString: '',
        initiative: { physical: 0, astral: 0, matrix: 0 },
      },
    };
  }

  it('both share the same physical initiative formula', () => {
    const spirit = computeSpiritDerivedStats(makeEntityData());
    const sprite = computeSpriteDerivedStats(makeEntityData());
    expect(spirit.initiative.physical).toBe(sprite.initiative.physical);
    expect(spirit.initiative.physical).toBe(8);
  });

  it('spirit has astral initiative, sprite has matrix initiative (same value)', () => {
    const spirit = computeSpiritDerivedStats(makeEntityData({ INTUITION: 6 }));
    const sprite = computeSpriteDerivedStats(makeEntityData({ INTUITION: 6 }));
    expect(spirit.initiative.astral).toBe(12);
    expect(spirit.initiative.matrix).toBe(0);
    expect(sprite.initiative.matrix).toBe(12);
    expect(sprite.initiative.astral).toBe(0);
  });

  it('both compute identical monitors and wound modifiers', () => {
    const data1 = makeEntityData();
    const data2 = makeEntityData();
    data1.conditionMonitor.physical.value = 4;
    data2.conditionMonitor.physical.value = 4;
    const spirit = computeSpiritDerivedStats(data1);
    const sprite = computeSpriteDerivedStats(data2);
    expect(spirit.woundModifier).toBe(sprite.woundModifier);
    expect(data1.conditionMonitor.physical.max).toBe(
      data2.conditionMonitor.physical.max
    );
  });

  it('passesString mirrors matrix/astral passes (physical/matrix/astral)', () => {
    const spirit = computeSpiritDerivedStats(makeEntityData());
    const sprite = computeSpriteDerivedStats(makeEntityData());
    expect(spirit.passesString).toBe('2/0/2');
    expect(sprite.passesString).toBe('2/2/0');
  });
});

describe('computeMatrixSystem', () => {
  it('technomancer uses LOGIC + systemBonus', () => {
    const system = {
      technomancy: { technomancer: true },
      sheetStats: { LOGIC: 5, RESONANCE: 6 },
      livingPersona: { systemBonus: 1 },
    };
    expect(computeMatrixSystem(system, [])).toBe(6);
  });

  it('caps the living persona System at RESONANCE', () => {
    const system = {
      technomancy: { technomancer: true },
      sheetStats: { LOGIC: 5, RESONANCE: 4 },
      livingPersona: { systemBonus: 1 },
    };
    expect(computeMatrixSystem(system, [])).toBe(4);
  });

  it('mundane uses best equipped commlink os', () => {
    const system = { technomancy: { technomancer: false } };
    const items = [
      { type: 'Commlink', system: { equipped: true, os: 4 } },
      { type: 'Commlink', system: { equipped: true, os: 6 } },
      { type: 'Commlink', system: { equipped: false, os: 9 } },
    ];
    expect(computeMatrixSystem(system, items)).toBe(6);
  });

  it('is 0 without commlink or technomancy', () => {
    expect(computeMatrixSystem({ technomancy: {} }, [])).toBe(0);
  });
});

describe('computeBiofeedbackFilter', () => {
  it('technomancer uses CHARISMA + biofeedbackFilterBonus', () => {
    const system = {
      technomancy: { technomancer: true },
      sheetStats: { CHARISMA: 3, RESONANCE: 6 },
      livingPersona: { biofeedbackFilterBonus: 2 },
    };
    expect(computeBiofeedbackFilter(system, [])).toBe(5);
  });

  it('caps the living persona Biofeedback Filter at RESONANCE', () => {
    const system = {
      technomancy: { technomancer: true },
      sheetStats: { CHARISMA: 5, RESONANCE: 3 },
      livingPersona: { biofeedbackFilterBonus: 2 },
    };
    expect(computeBiofeedbackFilter(system, [])).toBe(3);
  });

  it('mundane uses equipped Biofeedback Filter program rating', () => {
    const items = [
      { type: 'Program', name: 'Biofeedback Filter', system: { rating: 4 } },
    ];
    expect(computeBiofeedbackFilter({ technomancy: {} }, items)).toBe(4);
  });
});

describe('character matrix condition monitor', () => {
  it('technomancers have no separate matrix CM (max 0)', () => {
    const data = makeActorData({ LOGIC: 4, technomancer: true });
    data.conditionMonitor.matrix = { value: 0, max: 0 };
    computeDerivedStats(data);
    expect(data.conditionMonitor.matrix.max).toBe(0);
  });

  it('mundane matrix CM max = 8 + ceil(System/2) from equipped commlink', () => {
    const data = makeActorData();
    data.conditionMonitor.matrix = { value: 0, max: 0 };
    data.parent = {
      items: [{ type: 'Commlink', system: { equipped: true, os: 4 } }],
    };
    computeDerivedStats(data);
    expect(data.conditionMonitor.matrix.max).toBe(10); // 8 + ceil(4/2)
  });
});

describe('computeMatrixFirewall', () => {
  it('technomancer uses WILLPOWER + firewallBonus capped at RESONANCE', () => {
    const system = {
      technomancy: { technomancer: true },
      sheetStats: { WILLPOWER: 5, RESONANCE: 4 },
      livingPersona: { firewallBonus: 1 },
    };
    expect(computeMatrixFirewall(system, [])).toBe(4);
  });

  it('mundane uses best equipped commlink firewall', () => {
    const items = [
      { type: 'Commlink', system: { equipped: true, firewall: 3 } },
      { type: 'Commlink', system: { equipped: true, firewall: 5 } },
      { type: 'Commlink', system: { equipped: false, firewall: 9 } },
    ];
    expect(computeMatrixFirewall({ technomancy: {} }, items)).toBe(5);
  });
});

describe('effectiveSimMode', () => {
  it('technomancers always run hot sim', () => {
    expect(
      effectiveSimMode({
        technomancy: { technomancer: true },
        matrixSimMode: 'cold',
      })
    ).toBe('hot');
  });

  it('others use the selected sim mode', () => {
    expect(effectiveSimMode({ matrixSimMode: 'hot' })).toBe('hot');
    expect(effectiveSimMode({ matrixSimMode: 'cold' })).toBe('cold');
    expect(effectiveSimMode({})).toBe('cold');
  });
});

describe('computeVehicleDerivedStats', () => {
  function makeVehicleData({
    body = 4,
    pilot = 3,
    response = 2,
    physDmg = 0,
    generalModifier = 0,
  } = {}) {
    return {
      body,
      pilot,
      response,
      modifiers: { generalModifier },
      conditionMonitor: {
        physical: { value: physDmg, max: 0 },
      },
      derivedStats: {
        woundModifier: 0,
        dicePoolModifier: 0,
        passesString: '',
        initiative: { physical: 0, astral: 0, matrix: 0 },
      },
    };
  }

  it('physical monitor max = ceil(8 + body/2)', () => {
    const data = makeVehicleData({ body: 6 });
    computeVehicleDerivedStats(data);
    expect(data.conditionMonitor.physical.max).toBe(11);
  });

  it('physical initiative = pilot + response', () => {
    const data = makeVehicleData({ pilot: 3, response: 2 });
    const result = computeVehicleDerivedStats(data);
    expect(result.initiative.physical).toBe(5);
  });

  it('astral and matrix initiative are 0', () => {
    const data = makeVehicleData();
    const result = computeVehicleDerivedStats(data);
    expect(result.initiative.astral).toBe(0);
    expect(result.initiative.matrix).toBe(0);
  });

  it('passesString is always "1/0/0"', () => {
    const data = makeVehicleData();
    const result = computeVehicleDerivedStats(data);
    expect(result.passesString).toBe('1/0/0');
  });

  it('has no wound modifier regardless of damage', () => {
    const data = makeVehicleData({ physDmg: 6 });
    const result = computeVehicleDerivedStats(data);
    expect(result.woundModifier).toBe(0);
    expect(result.dicePoolModifier).toBe(0);
  });
});
