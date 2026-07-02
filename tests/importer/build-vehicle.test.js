import { describe, it, expect } from 'vitest';
import { buildVehicleActorData } from '@importer/build-vehicle.js';

describe('buildVehicleActorData', () => {
  it('builds vehicle actor data with the rigger link and mapped mods', () => {
    const data = buildVehicleActorData(
      {
        name: 'Ares Roadmaster',
        category: 'Car',
        body: '12',
        _mods: [{ name: 'Run-Flat Tires', rating: '2', slots: '3' }],
      },
      'Actor.rigger1'
    );
    expect(data.type).toBe('vehicle');
    expect(data.name).toBe('Ares Roadmaster');
    expect(data.system.riggerUuid).toBe('Actor.rigger1');
    expect(data.system.body).toBe(12);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].type).toBe('Vehicle Mod');
    expect(data.items[0].name).toBe('Run-Flat Tires');
  });

  it('produces no items when the record has no _mods', () => {
    const data = buildVehicleActorData({ name: 'Bike' }, 'Actor.rigger1');
    expect(data.items).toEqual([]);
  });
});
