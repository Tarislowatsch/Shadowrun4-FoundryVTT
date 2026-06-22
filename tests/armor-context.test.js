import { describe, it, expect } from 'vitest';
import { buildArmorContext } from '../src/sheets/characters/armor-context.js';

function makeArmorItem(id, overrides = {}) {
  return {
    _id: id,
    name: `Armor ${id}`,
    type: 'Armor',
    system: {
      ballisticarmor: 8,
      impactarmor: 6,
      stackingType: 'standard',
      capacity: null,
      cost: 500,
      installedModIds: [],
      equipped: false,
      ...overrides,
    },
  };
}

function makeModItem(id, overrides = {}) {
  return {
    _id: id,
    name: `ArmorMod ${id}`,
    type: 'Armor Mod',
    system: {
      ballisticBonus: 0,
      impactBonus: 0,
      capacityCost: 1,
      cost: 0,
      ...overrides,
    },
  };
}

describe('buildArmorContext', () => {
  it('computes effective values from mods', () => {
    const items = [
      makeArmorItem('a1', { installedModIds: ['m1'] }),
      makeModItem('m1', { ballisticBonus: 2, impactBonus: 1 }),
    ];
    const [a] = buildArmorContext(items);
    expect(a.system.effectiveBallistic).toBe(10);
    expect(a.system.effectiveImpact).toBe(7);
  });

  it('computes capacity from max(ballistic, impact)', () => {
    const items = [makeArmorItem('a1')];
    const [a] = buildArmorContext(items);
    expect(a.system.maxCapacity).toBe(8);
  });

  it('uses explicit capacity when set', () => {
    const items = [makeArmorItem('a1', { capacity: 12 })];
    const [a] = buildArmorContext(items);
    expect(a.system.maxCapacity).toBe(12);
  });

  it('sets capacityWarning when exceeded', () => {
    const items = [
      makeArmorItem('a1', { installedModIds: ['m1', 'm2'] }),
      makeModItem('m1', { capacityCost: 5 }),
      makeModItem('m2', { capacityCost: 5 }),
    ];
    const [a] = buildArmorContext(items);
    expect(a.system.capacityWarning).toBe(true);
  });

  it('provides availableArmorMods excluding installed', () => {
    const items = [
      makeArmorItem('a1', { installedModIds: ['m1'] }),
      makeModItem('m1'),
      makeModItem('m2'),
    ];
    const [a] = buildArmorContext(items);
    expect(a.availableArmorMods).toHaveLength(1);
    expect(a.availableArmorMods[0].id).toBe('m2');
  });

  it('computes totalCost including mods', () => {
    const items = [
      makeArmorItem('a1', { cost: 500, installedModIds: ['m1'] }),
      makeModItem('m1', { cost: 200 }),
    ];
    const [a] = buildArmorContext(items);
    expect(a.system.totalCost).toBe(700);
  });
});
