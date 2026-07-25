import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildExistingItemIndex,
  resolveExistingItemId,
  buildUpdatePayload,
  addToExistingItemIndex,
} from '@importer/pack/existing-item-match.js';

describe('buildExistingItemIndex', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('indexes entries by lowercased name and by chummerId', () => {
    const index = buildExistingItemIndex([
      { _id: 'id-1', name: 'Clothing', system: { chummerId: 'guid-1' } },
    ]);
    expect(index.byName.get('clothing')).toBe('id-1');
    expect(index.byGuid.get('guid-1')).toBe('id-1');
  });

  it('skips entries without a chummerId for the guid index', () => {
    const index = buildExistingItemIndex([
      { _id: 'id-1', name: 'Clothing', system: {} },
    ]);
    expect(index.byGuid.size).toBe(0);
    expect(index.byName.get('clothing')).toBe('id-1');
  });

  it('keeps the first match and warns on a duplicate name', () => {
    const index = buildExistingItemIndex([
      { _id: 'id-1', name: 'Clothing', system: {} },
      { _id: 'id-2', name: 'Clothing', system: {} },
    ]);
    expect(index.byName.get('clothing')).toBe('id-1');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps the first match and warns on a duplicate chummerId', () => {
    const index = buildExistingItemIndex([
      { _id: 'id-1', name: 'A', system: { chummerId: 'guid-1' } },
      { _id: 'id-2', name: 'B', system: { chummerId: 'guid-1' } },
    ]);
    expect(index.byGuid.get('guid-1')).toBe('id-1');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe('resolveExistingItemId', () => {
  it('matches by chummerId when present', () => {
    const index = {
      byGuid: new Map([['guid-1', 'id-1']]),
      byName: new Map([['clothing', 'id-2']]),
    };
    expect(resolveExistingItemId({ id: 'guid-1' }, 'Clothing', index)).toBe(
      'id-1'
    );
  });

  it('prefers the guid match over a conflicting name match', () => {
    const index = {
      byGuid: new Map([['guid-1', 'id-1']]),
      byName: new Map([['clothing', 'id-2']]),
    };
    const result = resolveExistingItemId({ id: 'guid-1' }, 'Clothing', index);
    expect(result).toBe('id-1');
    expect(result).not.toBe('id-2');
  });

  it('falls back to the name match when there is no guid match', () => {
    const index = {
      byGuid: new Map(),
      byName: new Map([['clothing', 'id-2']]),
    };
    expect(resolveExistingItemId({ id: 'guid-9' }, 'Clothing', index)).toBe(
      'id-2'
    );
  });

  it('returns null when neither the guid nor the name matches', () => {
    const index = { byGuid: new Map(), byName: new Map() };
    expect(resolveExistingItemId({ id: '' }, 'Clothing', index)).toBeNull();
  });
});

describe('addToExistingItemIndex', () => {
  it('adds a freshly created document to both maps', () => {
    const index = { byGuid: new Map(), byName: new Map() };
    addToExistingItemIndex(index, {
      id: 'id-1',
      name: 'Clothing',
      system: { chummerId: 'guid-1' },
    });
    expect(index.byName.get('clothing')).toBe('id-1');
    expect(index.byGuid.get('guid-1')).toBe('id-1');
  });

  it('accepts _id as a fallback to id', () => {
    const index = { byGuid: new Map(), byName: new Map() };
    addToExistingItemIndex(index, { _id: 'id-1', name: 'Clothing' });
    expect(index.byName.get('clothing')).toBe('id-1');
  });

  it('does nothing when the document has no id', () => {
    const index = { byGuid: new Map(), byName: new Map() };
    addToExistingItemIndex(index, { name: 'Clothing' });
    expect(index.byName.size).toBe(0);
  });

  it('does not overwrite an existing entry for the same name/guid', () => {
    const index = {
      byGuid: new Map([['guid-1', 'id-1']]),
      byName: new Map([['clothing', 'id-1']]),
    };
    addToExistingItemIndex(index, {
      id: 'id-2',
      name: 'Clothing',
      system: { chummerId: 'guid-1' },
    });
    expect(index.byName.get('clothing')).toBe('id-1');
    expect(index.byGuid.get('guid-1')).toBe('id-1');
  });
});

describe('buildUpdatePayload', () => {
  it('only carries _id and the five metadata fields, never name', () => {
    const data = {
      name: 'Kleidung',
      type: 'armor',
      system: {
        nameEn: 'Clothing',
        sourceCode: 'SR4',
        sourceBookEn: 'Shadowrun 4',
        chummerId: 'guid-1',
        label: 'clothing',
        cost: 500,
        avail: 2,
      },
    };
    const payload = buildUpdatePayload('id-1', data);
    expect(payload).toEqual({
      _id: 'id-1',
      system: {
        nameEn: 'Clothing',
        sourceCode: 'SR4',
        sourceBookEn: 'Shadowrun 4',
        chummerId: 'guid-1',
        label: 'clothing',
      },
    });
    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('type');
    expect(payload.system).not.toHaveProperty('cost');
    expect(payload.system).not.toHaveProperty('avail');
  });

  it('fills missing metadata fields with empty strings', () => {
    const payload = buildUpdatePayload('id-1', {
      name: 'Clothing',
      system: {},
    });
    expect(payload.system).toEqual({
      nameEn: '',
      sourceCode: '',
      sourceBookEn: '',
      chummerId: '',
      label: '',
    });
  });
});
