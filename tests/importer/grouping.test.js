import { describe, it, expect } from 'vitest';
import { buildImportGroups, buildTypeTree } from '@importer/grouping.js';

describe('buildImportGroups', () => {
  it('groups records by typeLabel, subcategory and source', () => {
    const parsed = {
      weapon: [
        {
          name: 'Ares Predator',
          category: 'Heavy Pistols',
          type: 'Ranged',
          source: 'SR4',
        },
        {
          name: 'Streetline Special',
          category: 'Holdouts',
          type: 'Ranged',
          source: 'SR4',
        },
        {
          name: 'Colt Government',
          category: 'Heavy Pistols',
          type: 'Ranged',
          source: 'AR',
        },
      ],
    };
    const groups = buildImportGroups(parsed);

    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.typeLabel)).toEqual([
      'Ranged Weapons',
      'Ranged Weapons',
      'Ranged Weapons',
    ]);
    expect(groups.map((g) => g.subcategory)).toEqual([
      'Heavy Pistols',
      'Heavy Pistols',
      'Holdouts',
    ]);
    expect(groups.map((g) => g.source)).toEqual(['AR', 'SR4', 'SR4']);
  });

  it('uses XML category as subcategory for non-weapon types', () => {
    const parsed = {
      spell: [
        { name: 'Fireball', category: 'Combat', source: 'SR4' },
        { name: 'Heal', category: 'Health', source: 'SR4' },
      ],
      cyberware: [{ name: 'Datajack', category: 'Headware', source: 'SR4' }],
    };
    const groups = buildImportGroups(parsed);
    const labels = groups.map((g) => g.subcategory);

    expect(labels).toContain('Combat');
    expect(labels).toContain('Health');
    expect(labels).toContain('Headware');
  });

  it('falls back to type label when category is missing', () => {
    const parsed = {
      armor: [{ name: 'Vest', source: 'SR4' }],
      power: [{ name: 'Astral Perception', source: 'SR4' }],
    };
    const groups = buildImportGroups(parsed);
    const labels = groups.map((g) => g.subcategory);

    expect(labels).toContain('Armor');
    expect(labels).toContain('Adept Powers');
  });

  it('falls back to source "Unknown" when record has no source', () => {
    const parsed = {
      armor: [{ name: 'Vest' }],
    };
    const groups = buildImportGroups(parsed);

    expect(groups[0].source).toBe('Unknown');
  });

  it('generates compendium slugs without source (shared across books)', () => {
    const parsed = {
      weapon: [
        {
          name: 'Gun',
          category: 'Heavy Pistols',
          type: 'Ranged',
          source: 'SR4',
        },
      ],
      armor: [{ name: 'Vest', source: 'SR4' }],
    };
    const groups = buildImportGroups(parsed);
    const names = groups.map((g) => g.compendiumName);

    expect(names).toContain('sr4-weapon-heavy-pistols');
    expect(names).toContain('sr4-armor-armor');
  });

  it('groups gear with weaponbonus into Ammunition typeLabel', () => {
    const parsed = {
      gear: [
        { name: 'Medkit', category: 'Medical', source: 'SR4' },
        {
          name: 'Ammo: APDS',
          category: 'Ammunition',
          source: 'SR4',
          weaponbonus: { ap: '-4' },
        },
        {
          name: 'Arrowhead, Explosive',
          category: 'Arrowheads',
          source: 'AR',
          weaponbonus: { damage: '1' },
        },
      ],
    };
    const groups = buildImportGroups(parsed);

    const ammoGroups = groups.filter((g) => g.typeLabel === 'Ammunition');
    expect(ammoGroups).toHaveLength(2);
    expect(ammoGroups.map((g) => g.source).sort()).toEqual(['AR', 'SR4']);

    const medical = groups.find((g) => g.subcategory === 'Medical');
    expect(medical).toBeDefined();
    expect(medical.typeLabel).toBe('Gear');
    expect(medical.records).toHaveLength(1);
  });

  it('groups category-only ammo (no weaponbonus) into Ammunition typeLabel', () => {
    const parsed = {
      gear: [
        {
          name: 'Regular Ammo',
          category: 'Ammunition',
          source: 'SR4',
        },
      ],
    };
    const groups = buildImportGroups(parsed);
    expect(groups).toHaveLength(1);
    expect(groups[0].typeLabel).toBe('Ammunition');
    expect(groups[0].subcategory).toBe('Ammunition');
  });

  it('falls back gear without category or weaponbonus to "Gear"', () => {
    const parsed = {
      gear: [{ name: 'Mysterious Widget', source: 'SR4' }],
    };
    const groups = buildImportGroups(parsed);

    expect(groups).toHaveLength(1);
    expect(groups[0].typeLabel).toBe('Gear');
    expect(groups[0].subcategory).toBe('Gear');
  });

  it('splits weapons into Melee/Ranged typeLabels and dispatches the mapper', () => {
    const parsed = {
      weapon: [
        {
          name: 'Sword',
          category: 'Blades',
          type: 'Melee',
          damage: '(STR/2+2)P',
          source: 'SR4',
        },
        {
          name: 'Predator',
          category: 'Heavy Pistols',
          type: 'Ranged',
          damage: '5P',
          ammo: '15(c)',
          source: 'SR4',
        },
      ],
    };
    const groups = buildImportGroups(parsed);

    const melee = groups.find((g) => g.typeLabel === 'Melee Weapons');
    const ranged = groups.find((g) => g.typeLabel === 'Ranged Weapons');
    expect(melee).toBeDefined();
    expect(melee.subcategory).toBe('Blades');
    expect(ranged).toBeDefined();
    expect(ranged.subcategory).toBe('Heavy Pistols');

    expect(melee.map(melee.records[0]).type).toBe('Melee Weapon');
    expect(ranged.map(ranged.records[0]).type).toBe('Ranged Weapon');
  });

  it('places critter subcategories under a single Critters type without parentFolder', () => {
    const parsed = {
      critter: [
        { name: 'Fire Spirit', category: 'Spirits', source: 'SR4' },
        { name: 'Western Dragon', category: 'Dracoforms', source: 'SR4' },
        { name: 'Barghest', category: 'Paranormal Critters', source: 'SR4' },
      ],
    };
    const groups = buildImportGroups(parsed);

    expect(groups.every((g) => g.typeLabel === 'Critters')).toBe(true);
    expect(
      groups.every(
        (g) => g.parentFolder === null || g.parentFolder === undefined
      )
    ).toBe(true);
    expect(groups.map((g) => g.subcategory).sort()).toEqual([
      'Dracoforms',
      'Paranormal Critters',
      'Spirits',
    ]);
  });

  it('places metatype subcategories under a single Metatypes type without parentFolder', () => {
    const parsed = {
      metatype: [
        { name: 'Human', category: 'Metahuman', source: 'SR4' },
        { name: 'Nartaki', category: 'Metasapients', source: 'RC' },
      ],
    };
    const groups = buildImportGroups(parsed);

    expect(groups.every((g) => g.typeLabel === 'Metatypes')).toBe(true);
    expect(
      groups.every(
        (g) => g.parentFolder === null || g.parentFolder === undefined
      )
    ).toBe(true);
    expect(groups.map((g) => g.subcategory).sort()).toEqual([
      'Metahuman',
      'Metasapients',
    ]);
  });
});

describe('buildTypeTree', () => {
  it('nests groups under type and subcategory, sorted alphabetically', () => {
    const groups = buildImportGroups({
      weapon: [
        {
          name: 'Predator',
          category: 'Heavy Pistols',
          type: 'Ranged',
          source: 'SR4',
        },
        {
          name: 'Streetline',
          category: 'Holdouts',
          type: 'Ranged',
          source: 'SR4',
        },
      ],
    });
    const tree = buildTypeTree(groups);

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('Ranged Weapons');
    expect(tree[0].typeId).toBe('ranged-weapons');
    expect(tree[0].subcategories.map((s) => s.name)).toEqual([
      'Heavy Pistols',
      'Holdouts',
    ]);
  });

  it('shows a subcategory header and indents groups two levels', () => {
    const groups = buildImportGroups({
      weapon: [
        {
          name: 'Predator',
          category: 'Heavy Pistols',
          type: 'Ranged',
          source: 'SR4',
        },
      ],
    });
    const [subcat] = buildTypeTree(groups)[0].subcategories;

    expect(subcat.showHeader).toBe(true);
    expect(subcat.subcategoryId).toBe('ranged-weapons--heavy-pistols');
    expect(subcat.groups[0]).toMatchObject({
      typeId: 'ranged-weapons',
      subcategoryId: 'ranged-weapons--heavy-pistols',
      indent: 48,
      source: 'SR4',
      count: 1,
    });
  });

  it('flattens a subcategory equal to its type (no header, single indent)', () => {
    const groups = buildImportGroups({
      armor: [{ name: 'Vest', source: 'SR4' }],
    });
    const [subcat] = buildTypeTree(groups)[0].subcategories;

    expect(subcat.name).toBe('Armor');
    expect(subcat.showHeader).toBe(false);
    expect(subcat.groups[0]).toMatchObject({ subcategoryId: null, indent: 24 });
  });
});
