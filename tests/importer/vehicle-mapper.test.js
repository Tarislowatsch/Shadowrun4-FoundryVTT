import { describe, it, expect } from 'vitest';
import {
  mapVehicle,
  mapVehicleModFromCharacter,
} from '@importer/mappers/vehicle.js';

describe('mapVehicle', () => {
  it('maps a vehicle record to system data', () => {
    const { name, type, system } = mapVehicle({
      name: 'Ares Roadmaster',
      category: 'Car',
      body: '12',
      pilot: '2',
      handling: '4',
      speed: '4',
      armor: '6',
      avail: '8R',
      cost: '35000',
    });
    expect(type).toBe('vehicle');
    expect(name).toBe('Ares Roadmaster');
    expect(system.body).toBe(12);
    expect(system.handling).toBe(4);
    expect(system.availability).toBe('8R');
    expect(system.cost).toBe(35000);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['whitespace-only', '   '],
  ])('falls back to "Unnamed Vehicle" for a %s name', (_label, name) => {
    expect(mapVehicle({ name }).name).toBe('Unnamed Vehicle');
  });
});

describe('mapVehicleModFromCharacter', () => {
  it('maps a mod record to item data', () => {
    const { name, type, system } = mapVehicleModFromCharacter({
      name: 'Run-Flat Tires',
      rating: '2',
      slots: '3',
      cost: '1000',
    });
    expect(type).toBe('Vehicle Mod');
    expect(name).toBe('Run-Flat Tires');
    expect(system.rating).toBe(2);
    expect(system.slotCost).toBe(3);
    expect(system.cost).toBe(1000);
  });

  it('falls back to "Unnamed Vehicle Mod" for an empty name', () => {
    expect(mapVehicleModFromCharacter({ name: '' }).name).toBe(
      'Unnamed Vehicle Mod'
    );
  });
});
