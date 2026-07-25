import { describe, it, expect } from 'vitest';
import {
  buildGuidTranslationMap,
  applyGuidFallback,
} from '@importer/translation/reference-pack-translation.js';
import { applyTranslation } from '@importer/translation/parse-name-translations.js';

/**
 * @param {Array<{ name: string, system?: object }>} entries
 * @returns {{ getIndex: (options: object) => Promise<Array<object>> }}
 */
function fakePack(entries) {
  return { getIndex: async () => entries };
}

describe('buildGuidTranslationMap', () => {
  it('maps chummerId to name/nameEn/label for indexed entries', async () => {
    const pack = fakePack([
      {
        name: 'Kleidung',
        system: { chummerId: 'guid-1', nameEn: 'Clothing', label: 'clothing' },
      },
    ]);
    const map = await buildGuidTranslationMap(pack);
    expect(map.get('guid-1')).toEqual({
      name: 'Kleidung',
      nameEn: 'Clothing',
      label: 'clothing',
    });
  });

  it('falls back to name when nameEn is blank, and to an empty label when missing', async () => {
    const pack = fakePack([
      { name: 'Clothing', system: { chummerId: 'guid-1', nameEn: '' } },
    ]);
    const map = await buildGuidTranslationMap(pack);
    expect(map.get('guid-1')).toEqual({
      name: 'Clothing',
      nameEn: 'Clothing',
      label: '',
    });
  });

  it('skips entries without a chummerId', async () => {
    const pack = fakePack([{ name: 'No GUID', system: {} }]);
    const map = await buildGuidTranslationMap(pack);
    expect(map.size).toBe(0);
  });

  it('keeps the first match for a duplicate chummerId', async () => {
    const pack = fakePack([
      { name: 'First', system: { chummerId: 'guid-1', nameEn: 'First' } },
      { name: 'Second', system: { chummerId: 'guid-1', nameEn: 'Second' } },
    ]);
    const map = await buildGuidTranslationMap(pack);
    expect(map.get('guid-1').name).toBe('First');
  });
});

describe('applyGuidFallback', () => {
  it('resolves nameEn/label from the guid map when nameEn is missing, without touching name', () => {
    const data = {
      name: 'Clothing',
      type: 'armor',
      system: { chummerId: 'guid-1' },
    };
    const guidMap = new Map([
      ['guid-1', { name: 'Kleidung', nameEn: 'Clothing', label: 'clothing' }],
    ]);
    const result = applyGuidFallback(data, guidMap);
    expect(result.name).toBe('Clothing');
    expect(result.system.nameEn).toBe('Clothing');
    expect(result.system.label).toBe('clothing');
  });

  it('falls back to the reference name only when the current record has no name', () => {
    const data = { name: '', type: 'armor', system: { chummerId: 'guid-1' } };
    const guidMap = new Map([
      ['guid-1', { name: 'Kleidung', nameEn: 'Clothing', label: 'clothing' }],
    ]);
    const result = applyGuidFallback(data, guidMap);
    expect(result.name).toBe('Kleidung');
  });

  it('does nothing when no chummerId is present', () => {
    const data = { name: 'Clothing', type: 'armor', system: {} };
    const result = applyGuidFallback(data, new Map());
    expect(result).toBe(data);
  });

  it('does nothing when the guid map has no match', () => {
    const data = {
      name: 'Clothing',
      type: 'armor',
      system: { chummerId: 'guid-9' },
    };
    const result = applyGuidFallback(data, new Map());
    expect(result).toBe(data);
  });

  it('does nothing when guidMap is null', () => {
    const data = {
      name: 'Clothing',
      type: 'armor',
      system: { chummerId: 'guid-1' },
    };
    const result = applyGuidFallback(data, null);
    expect(result).toBe(data);
  });

  it('never overwrites nameEn already resolved via the translation file', () => {
    const record = { id: 'guid-1', source: 'SR4' };
    const translations = {
      names: new Map([['Clothing', 'Kleidung']]),
      books: new Map(),
    };
    const { data: translated } = applyTranslation(
      { name: 'Clothing', type: 'armor', system: {} },
      record,
      translations
    );
    const guidMap = new Map([
      ['guid-1', { name: 'WRONG', nameEn: 'WRONG', label: 'wrong' }],
    ]);
    const result = applyGuidFallback(translated, guidMap);
    expect(result.name).toBe('Clothing');
    expect(result.system.nameEn).toBe('Clothing');
  });
});
