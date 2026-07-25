import { describe, it, expect } from 'vitest';
import {
  resolveTranslationForItem,
  translateExistingPack,
} from '@importer/translation/translate-existing-pack.js';

describe('resolveTranslationForItem', () => {
  it('backfills the label and returns a translation entry when the current name matches', () => {
    const item = { _id: 'id-1', name: 'Clothing', system: {} };
    const translations = {
      names: new Map([['Clothing', 'Kleidung']]),
      books: new Map(),
    };
    expect(resolveTranslationForItem(item, translations, 'de')).toEqual({
      update: { _id: 'id-1', system: { label: 'clothing' } },
      translationEntry: {
        label: 'clothing',
        translations: { en: 'Clothing', de: 'Kleidung' },
      },
    });
  });

  it('derives the canonical name from nameEn when already translated in-place', () => {
    const item = {
      _id: 'id-1',
      name: 'Kleidung',
      system: { nameEn: 'Clothing' },
    };
    const translations = {
      names: new Map([['Clothing', 'Vêtements']]),
      books: new Map(),
    };
    expect(resolveTranslationForItem(item, translations, 'fr')).toEqual({
      update: { _id: 'id-1', system: { label: 'clothing' } },
      translationEntry: {
        label: 'clothing',
        translations: { en: 'Clothing', fr: 'Vêtements' },
      },
    });
  });

  it('returns no update when the item already has a label, but still returns the entry', () => {
    const item = {
      _id: 'id-1',
      name: 'Kleidung',
      system: { nameEn: 'Clothing', label: 'clothing' },
    };
    const translations = {
      names: new Map([['Clothing', 'Vêtements']]),
      books: new Map(),
    };
    const result = resolveTranslationForItem(item, translations, 'fr');
    expect(result.update).toBeNull();
    expect(result.translationEntry).toEqual({
      label: 'clothing',
      translations: { en: 'Clothing', fr: 'Vêtements' },
    });
  });

  it('returns null when the name has no translation', () => {
    const item = { _id: 'id-1', name: 'Clothing', system: {} };
    const translations = {
      names: new Map([['Other', 'Anderes']]),
      books: new Map(),
    };
    expect(resolveTranslationForItem(item, translations, 'de')).toBeNull();
  });

  it('returns null when neither _id nor id is present', () => {
    const item = { name: 'Clothing', system: {} };
    const translations = {
      names: new Map([['Clothing', 'Kleidung']]),
      books: new Map(),
    };
    expect(resolveTranslationForItem(item, translations, 'de')).toBeNull();
  });

  it('accepts id as a fallback to _id', () => {
    const item = { id: 'id-1', name: 'Clothing', system: {} };
    const translations = {
      names: new Map([['Clothing', 'Kleidung']]),
      books: new Map(),
    };
    expect(resolveTranslationForItem(item, translations, 'de').update._id).toBe(
      'id-1'
    );
  });
});

describe('translateExistingPack', () => {
  it('updates only items missing a label, in one chunked call, and returns all matched entries', async () => {
    const updateCalls = [];

    const pack = {
      collection: 'world.sr4-gear-ammunition',
      documentClass: {
        updateDocuments: async (updates, options) => {
          updateCalls.push({ updates, options });
          return updates;
        },
      },
      getIndex: async () => [
        { _id: 'id-1', name: 'Clothing', system: {} },
        { _id: 'id-2', name: 'Unrelated', system: {} },
        {
          _id: 'id-3',
          name: 'Knife',
          system: { nameEn: 'Knife', label: 'knife' },
        },
      ],
    };
    const translations = {
      names: new Map([
        ['Clothing', 'Kleidung'],
        ['Knife', 'Messer'],
      ]),
      books: new Map(),
    };

    const entries = await translateExistingPack(pack, translations, 'de');

    expect(entries).toEqual([
      { label: 'clothing', translations: { en: 'Clothing', de: 'Kleidung' } },
      { label: 'knife', translations: { en: 'Knife', de: 'Messer' } },
    ]);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].updates).toEqual([
      { _id: 'id-1', system: { label: 'clothing' } },
    ]);
    expect(updateCalls[0].options).toEqual({
      pack: 'world.sr4-gear-ammunition',
    });
  });

  it('does not call updateDocuments when nothing matches', async () => {
    let called = false;

    const pack = {
      collection: 'world.sr4-gear-ammunition',
      documentClass: {
        updateDocuments: async () => {
          called = true;
          return [];
        },
      },
      getIndex: async () => [{ _id: 'id-1', name: 'Unrelated', system: {} }],
    };
    const translations = { names: new Map(), books: new Map() };

    const entries = await translateExistingPack(pack, translations, 'de');

    expect(entries).toEqual([]);
    expect(called).toBe(false);
  });
});
