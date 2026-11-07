import { describe, it, expect, vi } from 'vitest';
import {
  offersAreaTemplate,
  metersToPixels,
  tokensInArea,
  canCreateRegionDirectly,
  buildAreaRegionData,
  sanitizeSpellAreaData,
} from '../src/domains/magic/area-template.js';

const spell = (system) => ({ system: { range: 'LOS', area: true, ...system } });

describe('offersAreaTemplate', () => {
  it.each(['COMBAT', 'ILLUSION'])(
    'offers a template for %s area spells',
    (category) => {
      expect(offersAreaTemplate(spell({ category }))).toBe(true);
    }
  );

  it.each(['DETECTION', 'HEALTH', 'MANIPULATION'])(
    'offers no template for %s area spells',
    (category) => {
      expect(offersAreaTemplate(spell({ category }))).toBe(false);
    }
  );

  it('offers no template for spells without area', () => {
    expect(offersAreaTemplate(spell({ category: 'COMBAT', area: false }))).toBe(
      false
    );
  });

  it('offers no template when the range is SELF', () => {
    expect(
      offersAreaTemplate(spell({ category: 'COMBAT', range: 'SELF' }))
    ).toBe(false);
  });

  it('offers no template for missing spell data', () => {
    expect(offersAreaTemplate({})).toBe(false);
  });
});

describe('metersToPixels', () => {
  it('scales meters by the scene distance factor', () => {
    expect(metersToPixels(5, { distancePixels: 20, units: 'm' })).toBe(100);
  });

  it.each(['m', 'M', ' meter ', 'Meter', 'meters', 'metre', 'metres'])(
    'reads %j as meters',
    (units) => {
      expect(metersToPixels(5, { distancePixels: 20, units })).toBe(100);
    }
  );

  it.each(['ft', 'ft.', 'feet', 'foot', 'Fuß'])(
    'converts meters to %j',
    (units) => {
      expect(metersToPixels(3, { distancePixels: 10, units })).toBeCloseTo(
        (3 / 0.3048) * 10
      );
    }
  );

  it('converts meters to kilometers', () => {
    expect(metersToPixels(500, { distancePixels: 100, units: 'km' })).toBe(50);
  });

  it('converts meters to miles', () => {
    expect(
      metersToPixels(1609.344, { distancePixels: 100, units: 'mi' })
    ).toBeCloseTo(100);
  });

  it.each(['', undefined, 'hexes'])(
    'treats unknown units %j as meters',
    (units) => {
      expect(metersToPixels(5, { distancePixels: 20, units })).toBe(100);
    }
  );
});

describe('tokensInArea', () => {
  const at = (id, x, y, elevation) => ({
    id,
    center: { x, y },
    document: elevation === undefined ? {} : { elevation },
  });

  it('keeps tokens whose center the area contains', () => {
    const tokens = [at('in', 10, 10), at('out', 90, 90)];
    const contains = ({ x }) => x < 50;
    expect(tokensInArea(tokens, contains).map((t) => t.id)).toEqual(['in']);
  });

  it('tests the token center together with its elevation', () => {
    const contains = vi.fn().mockReturnValue(true);
    tokensInArea([at('flying', 10, 20, 5)], contains);
    expect(contains).toHaveBeenCalledWith({ x: 10, y: 20, elevation: 5 });
  });

  it('treats a token without elevation as standing on the ground', () => {
    const contains = vi.fn().mockReturnValue(true);
    tokensInArea([at('ground', 10, 20)], contains);
    expect(contains).toHaveBeenCalledWith({ x: 10, y: 20, elevation: 0 });
  });
});

describe('canCreateRegionDirectly', () => {
  it('lets a GM create regions even while paused', () => {
    expect(
      canCreateRegionDirectly({ isGM: true, canCreate: false, paused: true })
    ).toBe(true);
  });

  it('lets a player with REGION_CREATE create regions', () => {
    expect(
      canCreateRegionDirectly({ isGM: false, canCreate: true, paused: false })
    ).toBe(true);
  });

  it('routes a player without REGION_CREATE to the GM', () => {
    expect(
      canCreateRegionDirectly({ isGM: false, canCreate: false, paused: false })
    ).toBe(false);
  });

  it('routes a permitted player to the GM while the game is paused', () => {
    expect(
      canCreateRegionDirectly({ isGM: false, canCreate: true, paused: true })
    ).toBe(false);
  });
});

describe('buildAreaRegionData', () => {
  const data = buildAreaRegionData({
    name: 'Manaball',
    radiusPx: 500,
    casterUuid: 'Actor.a',
    spellUuid: 'Actor.a.Item.s',
  });

  it('describes a single circle with the radius in pixels', () => {
    expect(data.shapes).toEqual([{ type: 'circle', x: 0, y: 0, radius: 500 }]);
  });

  it('shows the area to everyone like a measured template', () => {
    expect(data).toMatchObject({
      visibility: 2,
      highlightMode: 'coverage',
      displayMeasurements: true,
    });
  });

  it('names the region after the spell', () => {
    expect(data.name).toBe('Manaball');
  });

  it('flags the region with caster and spell', () => {
    expect(data.flags.shadowrun4e.spellArea).toEqual({
      casterUuid: 'Actor.a',
      spellUuid: 'Actor.a.Item.s',
    });
  });
});

describe('sanitizeSpellAreaData', () => {
  const valid = () => ({
    name: 'Fireball',
    shapes: [{ type: 'circle', x: 300, y: 400, radius: 80, hole: false }],
    flags: {
      shadowrun4e: {
        spellArea: { casterUuid: 'Actor.a', spellUuid: 'Actor.a.Item.s' },
      },
    },
  });

  it('keeps name, circle and spell flag', () => {
    expect(sanitizeSpellAreaData(valid())).toEqual({
      name: 'Fireball',
      shapes: [{ type: 'circle', x: 300, y: 400, radius: 80 }],
      visibility: 2,
      highlightMode: 'coverage',
      displayMeasurements: true,
      flags: {
        shadowrun4e: {
          spellArea: { casterUuid: 'Actor.a', spellUuid: 'Actor.a.Item.s' },
        },
      },
    });
  });

  it('drops injected behaviors and other fields', () => {
    const data = {
      ...valid(),
      behaviors: [{ type: 'executeScript', system: { source: 'evil()' } }],
      ownership: { default: 3 },
      _id: 'x',
    };
    data.flags.core = { sheetClass: 'evil' };
    data.flags.shadowrun4e.other = 'evil';

    const sanitized = sanitizeSpellAreaData(data);

    expect(Object.keys(sanitized).sort()).toEqual([
      'displayMeasurements',
      'flags',
      'highlightMode',
      'name',
      'shapes',
      'visibility',
    ]);
    expect(sanitized.flags).toEqual(valid().flags);
  });

  it('forces the template display regardless of the sent values', () => {
    const sanitized = sanitizeSpellAreaData({
      ...valid(),
      visibility: 1,
      highlightMode: 'shapes',
      displayMeasurements: false,
    });
    expect(sanitized).toMatchObject({
      visibility: 2,
      highlightMode: 'coverage',
      displayMeasurements: true,
    });
  });

  it('keeps only the first shape', () => {
    const data = valid();
    data.shapes.push({ type: 'circle', x: 0, y: 0, radius: 9999 });
    expect(sanitizeSpellAreaData(data).shapes).toHaveLength(1);
  });

  it.each([
    ['a non-circle shape', { type: 'polygon', x: 1, y: 1, radius: 5 }],
    ['a non-numeric radius', { type: 'circle', x: 1, y: 1, radius: '5' }],
    ['a zero radius', { type: 'circle', x: 1, y: 1, radius: 0 }],
    [
      'an infinite coordinate',
      { type: 'circle', x: Infinity, y: 1, radius: 5 },
    ],
    ['a missing coordinate', { type: 'circle', x: 1, radius: 5 }],
  ])('rejects %s', (_label, shape) => {
    expect(sanitizeSpellAreaData({ ...valid(), shapes: [shape] })).toBeNull();
  });

  it('rejects data without shapes', () => {
    expect(sanitizeSpellAreaData({ ...valid(), shapes: [] })).toBeNull();
  });

  it('rejects data without caster', () => {
    const data = valid();
    data.flags.shadowrun4e.spellArea = { spellUuid: 'Actor.a.Item.s' };
    expect(sanitizeSpellAreaData(data)).toBeNull();
  });

  it('rejects data without caster or spell', () => {
    const data = valid();
    data.flags.shadowrun4e.spellArea = { casterUuid: 'Actor.a' };
    expect(sanitizeSpellAreaData(data)).toBeNull();
  });

  it('rejects a non-string name', () => {
    expect(sanitizeSpellAreaData({ ...valid(), name: { evil: 1 } })).toBeNull();
  });

  it('rejects missing data', () => {
    expect(sanitizeSpellAreaData(null)).toBeNull();
  });
});
