import { describe, it, expect, vi } from 'vitest';
import {
  computeDerivedStats,
  computeSpiritDerivedStats,
  computeSpriteDerivedStats,
  computeVehicleDerivedStats,
} from '../src/documents/derivedStats.mapper.js';

// SR4 rule constants (matches src/config.js)
const BASE = 8; // conditionMonitorBase
const DIV = 3; // woundModifierDivisor

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
      RESONANCE: 0,
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
    magic: { magician },
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

    it('matrix = INTUITION + matrix bonus', () => {
      const data = makeActorData({ INTUITION: 5, matrixBonus: 1 });
      const result = computeDerivedStats(data);
      expect(result.initiative.matrix).toBe(6);
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
  });

  describe('passesString', () => {
    it('non-magician defaults to "1/0/0"', () => {
      const data = makeActorData({ magician: false });
      const result = computeDerivedStats(data);
      expect(result.passesString).toBe('1/0/0');
    });

    it('magician defaults to "1/1/0"', () => {
      const data = makeActorData({ magician: true });
      const result = computeDerivedStats(data);
      expect(result.passesString).toBe('1/1/0');
    });

    it('reflects initiative pass bonuses', () => {
      const data = makeActorData({
        magician: true,
        physPasses: 1,
        astralPasses: 1,
        matrixPasses: 1,
      });
      const result = computeDerivedStats(data);
      expect(result.passesString).toBe('2/2/1');
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
  });

  describe('sheetStats side-effects', () => {
    it('writes physical initiative back to sheetStats.INITIATIVE', () => {
      const data = makeActorData({ INTUITION: 4, REACTION: 3 });
      computeDerivedStats(data);
      expect(data.sheetStats.INITIATIVE).toBe(7);
    });

    it('writes matrix initiative back to sheetStats.MATRIXINITIATIVE', () => {
      const data = makeActorData({ INTUITION: 5 });
      computeDerivedStats(data);
      expect(data.sheetStats.MATRIXINITIATIVE).toBe(5);
    });
  });

  describe('missing conditionMonitor guard', () => {
    it('returns unchanged derivedStats when conditionMonitor is null', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const data = makeActorData();
      data.conditionMonitor = null;
      const result = computeDerivedStats(data);
      expect(result).toEqual(data.derivedStats);
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

  it('wound modifier stacks physical and stun damage', () => {
    const data = makeSpiritData({ physDmg: 3, stunDmg: 3 });
    const result = computeSpiritDerivedStats(data);
    expect(result.woundModifier).toBe(-2);
  });

  it('dicePoolModifier = woundModifier + generalModifier', () => {
    const data = makeSpiritData({ physDmg: 3, generalModifier: -2 });
    const result = computeSpiritDerivedStats(data);
    expect(result.dicePoolModifier).toBe(-3);
  });

  it('passesString is always "2/2/0"', () => {
    const data = makeSpiritData();
    const result = computeSpiritDerivedStats(data);
    expect(result.passesString).toBe('2/2/0');
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

  it('wound modifier stacks physical and stun damage', () => {
    const data = makeSpriteData({ physDmg: 3, stunDmg: 3 });
    const result = computeSpriteDerivedStats(data);
    expect(result.woundModifier).toBe(-2);
  });

  it('dicePoolModifier = woundModifier + generalModifier', () => {
    const data = makeSpriteData({ physDmg: 3, generalModifier: -2 });
    const result = computeSpriteDerivedStats(data);
    expect(result.dicePoolModifier).toBe(-3);
  });

  it('passesString is always "2/0/2"', () => {
    const data = makeSpriteData();
    const result = computeSpriteDerivedStats(data);
    expect(result.passesString).toBe('2/0/2');
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

  it('passesString mirrors astral/matrix passes', () => {
    const spirit = computeSpiritDerivedStats(makeEntityData());
    const sprite = computeSpriteDerivedStats(makeEntityData());
    expect(spirit.passesString).toBe('2/2/0');
    expect(sprite.passesString).toBe('2/0/2');
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

  it('wound modifier from physical damage only', () => {
    const data = makeVehicleData({ physDmg: 6 });
    const result = computeVehicleDerivedStats(data);
    expect(result.woundModifier).toBe(-2);
  });
});
