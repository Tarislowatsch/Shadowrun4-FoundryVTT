import { describe, it, expect, beforeEach } from 'vitest';
import { buildVehicleContext } from '../src/sheets/characters/vehicle-context.js';

beforeEach(() => {
  globalThis.game.user = {};
  globalThis.game.actors = [];
});

function makeVehicleActor(overrides = {}) {
  return {
    type: 'vehicle',
    uuid: 'Actor.vehicle1',
    img: 'icons/vehicle.svg',
    name: 'Ares Roadmaster',
    system: {
      vehicleType: 'Car',
      effectiveHandling: 4,
      effectiveSpeed: 5,
      effectiveBody: 6,
      effectiveArmor: 2,
      effectivePilot: 1,
      riggerUuid: 'Actor.owner1',
    },
    testUserPermission: () => true,
    ...overrides,
  };
}

describe('buildVehicleContext', () => {
  it('lists rigged vehicles linked via riggerUuid', () => {
    globalThis.game.actors = [makeVehicleActor()];
    const result = buildVehicleContext('Actor.owner1');
    expect(result).toHaveLength(1);
    expect(result[0].uuid).toBe('Actor.vehicle1');
    expect(result[0].stats.find((s) => s.value === 4)).toBeTruthy();
  });

  it('excludes vehicles rigged by a different actor', () => {
    globalThis.game.actors = [makeVehicleActor()];
    expect(buildVehicleContext('Actor.someoneElse')).toEqual([]);
  });

  it('excludes vehicles the current user lacks permission to observe', () => {
    globalThis.game.actors = [
      makeVehicleActor({ testUserPermission: () => false }),
    ];
    expect(buildVehicleContext('Actor.owner1')).toEqual([]);
  });

  it('returns no vehicles without an ownerUuid', () => {
    globalThis.game.actors = [makeVehicleActor()];
    expect(buildVehicleContext(undefined)).toEqual([]);
  });
});
