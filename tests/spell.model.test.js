import { describe, it, expect } from 'vitest';
import { SR4SpellData, SpellRanges } from '@models/index.js';

describe('SR4SpellData.migrateData – legacy AREA range', () => {
  it('turns range AREA into LOS with the area flag set', () => {
    const migrated = SR4SpellData.migrateData({ range: 'AREA', area: false });
    expect(migrated.range).toBe('LOS');
    expect(migrated.area).toBe(true);
  });

  it('sets the area flag when the legacy source has none', () => {
    const migrated = SR4SpellData.migrateData({ range: 'AREA' });
    expect(migrated).toMatchObject({ range: 'LOS', area: true });
  });

  it('treats a lowercase legacy area range like AREA', () => {
    const migrated = SR4SpellData.migrateData({ range: 'area', area: false });
    expect(migrated).toMatchObject({ range: 'LOS', area: true });
  });

  it.each([
    ['touch', 'TOUCH'],
    ['los', 'LOS'],
    ['self', 'SELF'],
  ])('uppercases the legacy range %s to %s', (range, expected) => {
    const migrated = SR4SpellData.migrateData({ range, area: false });
    expect(migrated).toMatchObject({ range: expected, area: false });
  });

  it.each(['TOUCH', 'LOS', 'SELF'])(
    'leaves range %s and a cleared area flag untouched',
    (range) => {
      const migrated = SR4SpellData.migrateData({ range, area: false });
      expect(migrated).toMatchObject({ range, area: false });
    }
  );

  it('keeps an existing area flag on a regular range', () => {
    const migrated = SR4SpellData.migrateData({ range: 'LOS', area: true });
    expect(migrated).toMatchObject({ range: 'LOS', area: true });
  });

  it('does not add an area flag to partial updates without a range', () => {
    const migrated = SR4SpellData.migrateData({ dv: 3 });
    expect(migrated).not.toHaveProperty('area');
    expect(migrated).not.toHaveProperty('range');
  });
});

describe('SpellRanges', () => {
  it('no longer offers AREA as a selectable range', () => {
    expect(Object.keys(SpellRanges)).toEqual(['TOUCH', 'LOS', 'SELF']);
  });
});
