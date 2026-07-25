import { describe, it, expect } from 'vitest';
import { planGroupImport } from '@importer/pack/plan-group-import.js';

/**
 * @param {Array<Record<string, unknown>>} records
 * @returns {import('@importer/pack/grouping.js').ImportGroup}
 */
function group(records) {
  return {
    id: 'g',
    typeLabel: 'Armor',
    source: 'SR4',
    subcategory: 'armor',
    compendiumName: 'sr4-armor',
    compendiumLabel: 'Armor',
    records,
    map: (record) => ({
      name: record.name,
      type: 'armor',
      system: {},
    }),
  };
}

const baseOptions = {
  translationData: null,
  lang: null,
  guidMap: null,
  existingIndex: null,
  skipDuplicates: true,
  known: new Set(),
};

describe('planGroupImport', () => {
  it('creates a doc for each record when nothing is known or matched', () => {
    const records = [{ id: 'guid-1', name: 'Clothing', source: 'SR4' }];
    const result = planGroupImport(group(records), baseOptions);
    expect(result.docs).toHaveLength(1);
    expect(result.docs[0].name).toBe('Clothing');
    expect(result.updates).toEqual([]);
    expect(result.skippedCount).toBe(0);
    expect(result.addedKnownNames).toEqual(['clothing']);
  });

  it('does not mutate the known set passed in', () => {
    const known = new Set(['existing']);
    const records = [{ id: 'guid-1', name: 'Clothing', source: 'SR4' }];
    planGroupImport(group(records), { ...baseOptions, known });
    expect(known.has('clothing')).toBe(false);
    expect(known.size).toBe(1);
  });

  it('skips a record whose name is already known when skipDuplicates is on', () => {
    const known = new Set(['clothing']);
    const records = [{ id: 'guid-1', name: 'Clothing', source: 'SR4' }];
    const result = planGroupImport(group(records), { ...baseOptions, known });
    expect(result.docs).toEqual([]);
    expect(result.skippedCount).toBe(1);
  });

  it('deduplicates records within the same batch', () => {
    const records = [
      { id: 'guid-1', name: 'Clothing', source: 'SR4' },
      { id: 'guid-2', name: 'Clothing', source: 'SR4' },
    ];
    const result = planGroupImport(group(records), baseOptions);
    expect(result.docs).toHaveLength(1);
    expect(result.skippedCount).toBe(1);
    expect(result.addedKnownNames).toEqual(['clothing']);
  });

  it('routes a record to updates instead of docs when it matches the existing index', () => {
    const existingIndex = {
      byGuid: new Map([['guid-1', 'id-1']]),
      byName: new Map(),
    };
    const records = [{ id: 'guid-1', name: 'Clothing', source: 'SR4' }];
    const result = planGroupImport(group(records), {
      ...baseOptions,
      existingIndex,
    });
    expect(result.docs).toEqual([]);
    expect(result.updates).toEqual([
      { _id: 'id-1', system: expect.any(Object) },
    ]);
  });

  it('does not count an existing-index match as a skip or a newly known name', () => {
    const existingIndex = {
      byGuid: new Map([['guid-1', 'id-1']]),
      byName: new Map(),
    };
    const known = new Set(['clothing']);
    const records = [{ id: 'guid-1', name: 'Clothing', source: 'SR4' }];
    const result = planGroupImport(group(records), {
      ...baseOptions,
      existingIndex,
      known,
    });
    expect(result.updates).toHaveLength(1);
    expect(result.skippedCount).toBe(0);
    expect(result.addedKnownNames).toEqual([]);
  });

  it('creates a doc for every record, including same-named ones, when skipDuplicates is off', () => {
    const records = [
      { id: 'guid-1', name: 'Clothing', source: 'SR4' },
      { id: 'guid-2', name: 'Clothing', source: 'SR4' },
    ];
    const result = planGroupImport(group(records), {
      ...baseOptions,
      skipDuplicates: false,
    });
    expect(result.docs).toHaveLength(2);
    expect(result.skippedCount).toBe(0);
  });

  it('prefers an existing-index match over the skip-duplicate check', () => {
    const existingIndex = {
      byGuid: new Map([['guid-1', 'id-1']]),
      byName: new Map(),
    };
    const known = new Set(['clothing']);
    const records = [{ id: 'guid-1', name: 'Clothing', source: 'SR4' }];
    const result = planGroupImport(group(records), {
      ...baseOptions,
      existingIndex,
      known,
    });
    expect(result.updates).toHaveLength(1);
    expect(result.docs).toEqual([]);
    expect(result.skippedCount).toBe(0);
  });

  it('applies the guid fallback name when no local name is mapped', () => {
    const guidMap = new Map([
      ['guid-1', { name: 'Clothing', nameEn: 'Clothing', label: 'clothing' }],
    ]);
    const g = group([{ id: 'guid-1', name: '', source: 'SR4' }]);
    const result = planGroupImport(g, { ...baseOptions, guidMap });
    expect(result.docs[0].name).toBe('Clothing');
    expect(result.docs[0].system.nameEn).toBe('Clothing');
  });

  it('returns a translation entry for a record with a matched translation', () => {
    const translationData = {
      names: new Map([['Clothing', 'Kleidung']]),
      books: new Map(),
    };
    const records = [{ id: 'guid-1', name: 'Clothing', source: 'SR4' }];
    const result = planGroupImport(group(records), {
      ...baseOptions,
      translationData,
      lang: 'de',
    });
    expect(result.translationEntries).toEqual([
      { label: 'clothing', translations: { en: 'Clothing', de: 'Kleidung' } },
    ]);
  });

  it('returns translation entries in record order', () => {
    const translationData = {
      names: new Map([
        ['Clothing', 'Kleidung'],
        ['Jacket', 'Jacke'],
      ]),
      books: new Map(),
    };
    const records = [
      { id: 'guid-1', name: 'Clothing', source: 'SR4' },
      { id: 'guid-2', name: 'Jacket', source: 'SR4' },
    ];
    const result = planGroupImport(group(records), {
      ...baseOptions,
      translationData,
      lang: 'de',
    });
    expect(result.translationEntries.map((e) => e.label)).toEqual([
      'clothing',
      'jacket',
    ]);
  });
});
