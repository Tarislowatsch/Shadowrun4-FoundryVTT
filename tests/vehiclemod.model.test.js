import { describe, it, expect } from 'vitest';
import { SR4VehicleData } from '../src/models/actor/vehicle.model.js';

function makeMod(overrides = {}) {
  return {
    type: 'Vehicle Mod',
    system: {
      handlingBonus: 0,
      speedBonus: 0,
      accelBonus: 0,
      armorBonus: 0,
      sensorBonus: 0,
      bodyBonus: 0,
      pilotBonus: 0,
      slotCost: 1,
      cost: 0,
      ...overrides,
    },
  };
}

function prepareVehicle(vehicleFields = {}, mods = []) {
  const self = Object.assign(Object.create(SR4VehicleData.prototype), {
    handling: 3,
    speed: 4,
    accel: 2,
    armor: 6,
    sensor: 2,
    body: 8,
    pilot: 1,
    response: 1,
    modifiers: { generalModifier: 0 },
    conditionMonitor: { physical: { value: 0, max: 0 } },
    derivedStats: {
      woundModifier: 0,
      dicePoolModifier: 0,
      passesString: '',
      initiative: { physical: 0, astral: 0, matrix: 0 },
    },
    parent: { items: mods },
    ...vehicleFields,
  });
  self.prepareDerivedData();
  return self;
}

describe('SR4VehicleData with mods', () => {
  it('computes effective stats from base + mods', () => {
    const mods = [makeMod({ handlingBonus: 1, speedBonus: 2, armorBonus: 3 })];
    const v = prepareVehicle({}, mods);
    expect(v.effectiveHandling).toBe(4);
    expect(v.effectiveSpeed).toBe(6);
    expect(v.effectiveArmor).toBe(9);
  });

  it('sums bonuses from multiple mods', () => {
    const mods = [makeMod({ sensorBonus: 1 }), makeMod({ sensorBonus: 2 })];
    const v = prepareVehicle({}, mods);
    expect(v.effectiveSensor).toBe(5);
  });

  it('computes usedSlots from mod slotCosts', () => {
    const mods = [makeMod({ slotCost: 2 }), makeMod({ slotCost: 3 })];
    const v = prepareVehicle({ body: 8 }, mods);
    expect(v.usedSlots).toBe(5);
  });

  it('sets slotWarning when usedSlots > body', () => {
    const mods = [makeMod({ slotCost: 5 }), makeMod({ slotCost: 5 })];
    const v = prepareVehicle({ body: 8 }, mods);
    expect(v.slotWarning).toBe(true);
  });

  it('no slotWarning when within body capacity', () => {
    const mods = [makeMod({ slotCost: 3 })];
    const v = prepareVehicle({ body: 8 }, mods);
    expect(v.slotWarning).toBe(false);
  });

  it('computes totalModCost', () => {
    const mods = [makeMod({ cost: 1000 }), makeMod({ cost: 500 })];
    const v = prepareVehicle({}, mods);
    expect(v.totalModCost).toBe(1500);
  });

  it('works with no mods', () => {
    const v = prepareVehicle({});
    expect(v.effectiveHandling).toBe(3);
    expect(v.effectiveSpeed).toBe(4);
    expect(v.effectiveAccel).toBe(2);
    expect(v.effectiveArmor).toBe(6);
    expect(v.effectiveSensor).toBe(2);
    expect(v.effectiveBody).toBe(8);
    expect(v.effectivePilot).toBe(1);
    expect(v.usedSlots).toBe(0);
    expect(v.slotWarning).toBe(false);
    expect(v.totalModCost).toBe(0);
  });

  it('ignores non-Vehicle Mod items', () => {
    const items = [
      makeMod({ armorBonus: 5 }),
      { type: 'Ranged Weapon', system: { armorBonus: 99 } },
    ];
    const v = prepareVehicle({}, items);
    expect(v.effectiveArmor).toBe(11);
  });
});
