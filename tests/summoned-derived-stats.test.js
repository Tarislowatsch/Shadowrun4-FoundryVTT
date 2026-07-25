import { describe, it, expect, vi } from 'vitest';
import {
  computeSpiritDerivedStats,
  computeSpriteDerivedStats,
  computeVehicleDerivedStats,
} from '../src/domains/summoned-entity/derived-stats.js';
import { SR4SpiritData } from '../src/models/actor/spirit.model.js';
import { SR4SpriteData } from '../src/models/actor/sprite.model.js';
import { SR4VehicleData } from '../src/models/actor/vehicle.model.js';

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
    const result = computeSpiritDerivedStats(data);
    expect(result.monitorMax.physical).toBe(10);
  });

  it('sets stun monitor max from WILLPOWER', () => {
    const data = makeSpiritData({ WILLPOWER: 6 });
    const result = computeSpiritDerivedStats(data);
    expect(result.monitorMax.stun).toBe(11);
  });

  it('does not mutate the input conditionMonitor', () => {
    const data = makeSpiritData({ BODY: 4 });
    computeSpiritDerivedStats(data);
    expect(data.conditionMonitor.physical.max).toBe(0);
  });

  it('physical initiative = INTUITION + REACTION', () => {
    const data = makeSpiritData({ INTUITION: 5, REACTION: 4 });
    const result = computeSpiritDerivedStats(data);
    expect(result.derivedStats.initiative.physical).toBe(9);
  });

  it('astral initiative = INTUITION * 2', () => {
    const data = makeSpiritData({ INTUITION: 5 });
    const result = computeSpiritDerivedStats(data);
    expect(result.derivedStats.initiative.astral).toBe(10);
  });

  it('returns initiative values as sheetStats without mutating the input', () => {
    const data = makeSpiritData({ INTUITION: 5, REACTION: 4 });
    const result = computeSpiritDerivedStats(data);
    expect(result.sheetStats.INITIATIVE).toBe(9);
    expect(result.sheetStats.ASTRALINITIATIVE).toBe(10);
    expect(result.sheetStats.MATRIXINITIATIVE).toBe(0);
    expect(data.sheetStats.INITIATIVE).toBe(0);
  });

  it('matrix initiative is always 0', () => {
    const data = makeSpiritData();
    const result = computeSpiritDerivedStats(data);
    expect(result.derivedStats.initiative.matrix).toBe(0);
  });

  it('has no wound modifier regardless of damage', () => {
    const data = makeSpiritData({ physDmg: 3, stunDmg: 3 });
    const result = computeSpiritDerivedStats(data);
    expect(result.derivedStats.woundModifier).toBe(0);
  });

  it('dicePoolModifier = generalModifier only', () => {
    const data = makeSpiritData({ physDmg: 3, generalModifier: -2 });
    const result = computeSpiritDerivedStats(data);
    expect(result.derivedStats.dicePoolModifier).toBe(-2);
  });

  it('passesString is always "2/0/2"', () => {
    const data = makeSpiritData();
    const result = computeSpiritDerivedStats(data);
    expect(result.derivedStats.passesString).toBe('2/0/2');
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
    const result = computeSpriteDerivedStats(data);
    expect(result.monitorMax.physical).toBe(10);
  });

  it('sets stun monitor max from WILLPOWER', () => {
    const data = makeSpriteData({ WILLPOWER: 6 });
    const result = computeSpriteDerivedStats(data);
    expect(result.monitorMax.stun).toBe(11);
  });

  it('physical initiative = INTUITION + REACTION', () => {
    const data = makeSpriteData({ INTUITION: 5, REACTION: 4 });
    const result = computeSpriteDerivedStats(data);
    expect(result.derivedStats.initiative.physical).toBe(9);
  });

  it('matrix initiative = INTUITION * 2', () => {
    const data = makeSpriteData({ INTUITION: 5 });
    const result = computeSpriteDerivedStats(data);
    expect(result.derivedStats.initiative.matrix).toBe(10);
  });

  it('astral initiative is always 0', () => {
    const data = makeSpriteData();
    const result = computeSpriteDerivedStats(data);
    expect(result.derivedStats.initiative.astral).toBe(0);
  });

  it('returns initiative values as sheetStats without mutating the input', () => {
    const data = makeSpriteData({ INTUITION: 5, REACTION: 4 });
    const result = computeSpriteDerivedStats(data);
    expect(result.sheetStats.INITIATIVE).toBe(9);
    expect(result.sheetStats.MATRIXINITIATIVE).toBe(10);
    expect(result.sheetStats.ASTRALINITIATIVE).toBe(0);
    expect(data.sheetStats.INITIATIVE).toBe(0);
  });

  it('has no wound modifier regardless of damage', () => {
    const data = makeSpriteData({ physDmg: 3, stunDmg: 3 });
    const result = computeSpriteDerivedStats(data);
    expect(result.derivedStats.woundModifier).toBe(0);
  });

  it('dicePoolModifier = generalModifier only', () => {
    const data = makeSpriteData({ physDmg: 3, generalModifier: -2 });
    const result = computeSpriteDerivedStats(data);
    expect(result.derivedStats.dicePoolModifier).toBe(-2);
  });

  it('passesString is always "2/2/0"', () => {
    const data = makeSpriteData();
    const result = computeSpriteDerivedStats(data);
    expect(result.derivedStats.passesString).toBe('2/2/0');
  });

  it('has no separate matrix condition monitor (max is undefined)', () => {
    const data = makeSpriteData();
    data.conditionMonitor.matrix = { value: 0, max: 8 };
    const result = computeSpriteDerivedStats(data);
    expect(result.monitorMax.matrix).toBe(0);
  });

  it('leaves monitorMax.matrix undefined when the actor has no matrix monitor at all', () => {
    const data = makeSpriteData();
    const result = computeSpriteDerivedStats(data);
    expect(result.monitorMax.matrix).toBeUndefined();
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
    expect(spirit.derivedStats.initiative.physical).toBe(
      sprite.derivedStats.initiative.physical
    );
    expect(spirit.derivedStats.initiative.physical).toBe(8);
  });

  it('spirit has astral initiative, sprite has matrix initiative (same value)', () => {
    const spirit = computeSpiritDerivedStats(makeEntityData({ INTUITION: 6 }));
    const sprite = computeSpriteDerivedStats(makeEntityData({ INTUITION: 6 }));
    expect(spirit.derivedStats.initiative.astral).toBe(12);
    expect(spirit.derivedStats.initiative.matrix).toBe(0);
    expect(sprite.derivedStats.initiative.matrix).toBe(12);
    expect(sprite.derivedStats.initiative.astral).toBe(0);
  });

  it('both compute identical monitors and wound modifiers', () => {
    const data1 = makeEntityData();
    const data2 = makeEntityData();
    data1.conditionMonitor.physical.value = 4;
    data2.conditionMonitor.physical.value = 4;
    const spirit = computeSpiritDerivedStats(data1);
    const sprite = computeSpriteDerivedStats(data2);
    expect(spirit.derivedStats.woundModifier).toBe(
      sprite.derivedStats.woundModifier
    );
    expect(spirit.monitorMax.physical).toBe(sprite.monitorMax.physical);
  });

  it('passesString mirrors matrix/astral passes (physical/matrix/astral)', () => {
    const spirit = computeSpiritDerivedStats(makeEntityData());
    const sprite = computeSpriteDerivedStats(makeEntityData());
    expect(spirit.derivedStats.passesString).toBe('2/0/2');
    expect(sprite.derivedStats.passesString).toBe('2/2/0');
  });
});

describe('SR4SpiritData.prepareDerivedData integration', () => {
  it('applies computeSpiritDerivedStats onto the live instance', () => {
    const self = new SR4SpiritData();
    self.sheetStats = {
      BODY: 4,
      WILLPOWER: 4,
      INTUITION: 5,
      REACTION: 4,
      INITIATIVE: 0,
      ASTRALINITIATIVE: 0,
      MATRIXINITIATIVE: 0,
    };
    self.modifiers = { generalModifier: 0 };
    self.conditionMonitor = {
      physical: { value: 0, max: 0 },
      stun: { value: 0, max: 0 },
    };
    self.derivedStats = {
      woundModifier: 0,
      dicePoolModifier: 0,
      passesString: '',
      initiative: { physical: 0, astral: 0, matrix: 0 },
    };

    self.prepareDerivedData();

    expect(self.conditionMonitor.physical.max).toBe(10);
    expect(self.sheetStats.INITIATIVE).toBe(9); // INTUITION + REACTION
    expect(self.sheetStats.ASTRALINITIATIVE).toBe(10); // INTUITION * 2
    expect(self.derivedStats.passesString).toBe('2/0/2');
  });
});

describe('SR4SpriteData.prepareDerivedData integration', () => {
  it('applies computeSpriteDerivedStats onto the live instance', () => {
    const self = new SR4SpriteData();
    self.sheetStats = {
      BODY: 4,
      WILLPOWER: 4,
      INTUITION: 5,
      REACTION: 4,
      INITIATIVE: 0,
      ASTRALINITIATIVE: 0,
      MATRIXINITIATIVE: 0,
    };
    self.modifiers = { generalModifier: 0 };
    self.conditionMonitor = {
      physical: { value: 0, max: 0 },
      stun: { value: 0, max: 0 },
    };
    self.derivedStats = {
      woundModifier: 0,
      dicePoolModifier: 0,
      passesString: '',
      initiative: { physical: 0, astral: 0, matrix: 0 },
    };

    self.prepareDerivedData();

    expect(self.conditionMonitor.physical.max).toBe(10);
    expect(self.sheetStats.MATRIXINITIATIVE).toBe(10); // INTUITION * 2
    expect(self.derivedStats.passesString).toBe('2/2/0');
  });
});

describe('SR4VehicleData.prepareDerivedData integration', () => {
  it('applies computeVehicleDerivedStats onto the live instance', () => {
    const self = new SR4VehicleData();
    self.parent = { items: [] };
    self.body = 6;
    self.pilot = 3;
    self.response = 2;
    self.handling = 3;
    self.speed = 3;
    self.accel = 2;
    self.armor = 0;
    self.sensor = 1;
    self.modifiers = { generalModifier: 0 };
    self.conditionMonitor = { physical: { value: 0, max: 0 } };
    self.derivedStats = {
      woundModifier: 0,
      dicePoolModifier: 0,
      passesString: '',
      initiative: { physical: 0, astral: 0, matrix: 0 },
    };

    self.prepareDerivedData();

    expect(self.conditionMonitor.physical.max).toBe(11); // ceil(8 + 6/2)
    expect(self.derivedStats.initiative.physical).toBe(5); // pilot + response
    expect(self.derivedStats.passesString).toBe('1/0/0');
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
    const result = computeVehicleDerivedStats(data);
    expect(result.monitorMax.physical).toBe(11);
  });

  it('does not mutate the input conditionMonitor', () => {
    const data = makeVehicleData({ body: 6 });
    computeVehicleDerivedStats(data);
    expect(data.conditionMonitor.physical.max).toBe(0);
  });

  it('physical initiative = pilot + response', () => {
    const data = makeVehicleData({ pilot: 3, response: 2 });
    const result = computeVehicleDerivedStats(data);
    expect(result.derivedStats.initiative.physical).toBe(5);
  });

  it('astral and matrix initiative are 0', () => {
    const data = makeVehicleData();
    const result = computeVehicleDerivedStats(data);
    expect(result.derivedStats.initiative.astral).toBe(0);
    expect(result.derivedStats.initiative.matrix).toBe(0);
  });

  it('passesString is always "1/0/0"', () => {
    const data = makeVehicleData();
    const result = computeVehicleDerivedStats(data);
    expect(result.derivedStats.passesString).toBe('1/0/0');
  });

  it('has no wound modifier regardless of damage', () => {
    const data = makeVehicleData({ physDmg: 6 });
    const result = computeVehicleDerivedStats(data);
    expect(result.derivedStats.woundModifier).toBe(0);
    expect(result.derivedStats.dicePoolModifier).toBe(0);
  });

  it('returns null monitorMax when conditionMonitor is missing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const data = makeVehicleData();
    data.conditionMonitor = null;
    const result = computeVehicleDerivedStats(data);
    expect(result.monitorMax).toBeNull();
    expect(result.derivedStats).toEqual(data.derivedStats);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
