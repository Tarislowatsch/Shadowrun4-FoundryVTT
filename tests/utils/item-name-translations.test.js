import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseItemNameTranslations,
  stringifyItemNameTranslations,
  mergeItemNameTranslationEntries,
  lookupItemNameTranslation,
  getItemNameTranslations,
  invalidateItemNameTranslationsCache,
  registerItemNameTranslations,
  resolveItemNameTranslation,
} from '@utils/item-name-translations.js';

describe('parseItemNameTranslations', () => {
  it('reads labels from a versioned dictionary', () => {
    const json = JSON.stringify({
      _version: 1,
      labels: { clothing: { en: 'Clothing', de: 'Kleidung' } },
    });
    expect(parseItemNameTranslations(json)).toEqual({
      clothing: { en: 'Clothing', de: 'Kleidung' },
    });
  });

  it('returns an empty object for the default empty setting', () => {
    expect(parseItemNameTranslations('{}')).toEqual({});
  });

  it('returns an empty object for malformed JSON', () => {
    expect(parseItemNameTranslations('not json')).toEqual({});
  });

  it('returns an empty object when the version does not match', () => {
    const json = JSON.stringify({ _version: 99, labels: { a: {} } });
    expect(parseItemNameTranslations(json)).toEqual({});
  });
});

describe('stringifyItemNameTranslations', () => {
  it('round-trips through parseItemNameTranslations', () => {
    const labels = { clothing: { en: 'Clothing', de: 'Kleidung' } };
    expect(
      parseItemNameTranslations(stringifyItemNameTranslations(labels))
    ).toEqual(labels);
  });
});

describe('mergeItemNameTranslationEntries', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds a new label', () => {
    const result = mergeItemNameTranslationEntries({}, [
      { label: 'clothing', translations: { en: 'Clothing', de: 'Kleidung' } },
    ]);
    expect(result).toEqual({ clothing: { en: 'Clothing', de: 'Kleidung' } });
  });

  it('additively merges a new language into an existing label', () => {
    const existing = { clothing: { en: 'Clothing', de: 'Kleidung' } };
    const result = mergeItemNameTranslationEntries(existing, [
      { label: 'clothing', translations: { en: 'Clothing', fr: 'Vêtements' } },
    ]);
    expect(result).toEqual({
      clothing: { en: 'Clothing', de: 'Kleidung', fr: 'Vêtements' },
    });
  });

  it('warns and keeps the existing en on a label collision, but still merges other languages', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const existing = {
      ares_predator: { en: 'Ares Predator', de: 'Ares Predator' },
    };
    const result = mergeItemNameTranslationEntries(existing, [
      {
        label: 'ares_predator',
        translations: { en: 'Ares Predator II', fr: 'Ares Predator II' },
      },
    ]);
    expect(result.ares_predator.en).toBe('Ares Predator');
    expect(result.ares_predator.fr).toBe('Ares Predator II');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does not mutate the input dictionary', () => {
    const existing = { clothing: { en: 'Clothing' } };
    mergeItemNameTranslationEntries(existing, [
      { label: 'clothing', translations: { de: 'Kleidung' } },
    ]);
    expect(existing).toEqual({ clothing: { en: 'Clothing' } });
  });

  it('skips entries with no label or translations', () => {
    const result = mergeItemNameTranslationEntries({}, [
      { label: '', translations: { en: 'x' } },
      { label: 'a', translations: null },
    ]);
    expect(result).toEqual({});
  });

  it('merging two colliding entries in one call is equivalent to merging them one at a time', () => {
    const base = { jacket: { en: 'Jacket', de: 'Jacke' } };
    const a = { label: 'clothing', translations: { en: 'Clothing' } };
    const b = {
      label: 'clothing',
      translations: { en: 'Overcoat', fr: 'Manteau' },
    };
    const expected = {
      jacket: { en: 'Jacket', de: 'Jacke' },
      clothing: { en: 'Clothing', fr: 'Manteau' },
    };

    const batchWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const batched = mergeItemNameTranslationEntries(base, [a, b]);
    expect(batchWarnSpy).toHaveBeenCalledTimes(1);
    expect(batched).toEqual(expected);
    vi.restoreAllMocks();

    const sequentialWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});
    const sequential = mergeItemNameTranslationEntries(
      mergeItemNameTranslationEntries(base, [a]),
      [b]
    );
    expect(sequentialWarnSpy).toHaveBeenCalledTimes(1);
    expect(sequential).toEqual(expected);
  });
});

describe('lookupItemNameTranslation', () => {
  const labels = { clothing: { en: 'Clothing', de: 'Kleidung' } };

  it('returns the requested language when present', () => {
    expect(lookupItemNameTranslation(labels, 'clothing', 'de')).toBe(
      'Kleidung'
    );
  });

  it('falls back to en when the requested language is absent', () => {
    expect(lookupItemNameTranslation(labels, 'clothing', 'fr')).toBe(
      'Clothing'
    );
  });

  it('returns undefined when the label is unknown', () => {
    expect(lookupItemNameTranslation(labels, 'unknown', 'de')).toBeUndefined();
  });
});

describe('game.settings-backed helpers', () => {
  let store;

  beforeEach(() => {
    store = '{}';
    global.game = {
      settings: {
        get: vi.fn(() => store),
        set: vi.fn(async (_scope, _key, value) => {
          store = value;
        }),
      },
    };
    invalidateItemNameTranslationsCache();
  });

  afterEach(() => {
    delete global.game;
  });

  it('getItemNameTranslations reads and caches the parsed setting', () => {
    store = stringifyItemNameTranslations({
      clothing: { en: 'Clothing', de: 'Kleidung' },
    });
    expect(getItemNameTranslations()).toEqual({
      clothing: { en: 'Clothing', de: 'Kleidung' },
    });
    store = '{}';
    expect(getItemNameTranslations()).toEqual({
      clothing: { en: 'Clothing', de: 'Kleidung' },
    });
    expect(game.settings.get).toHaveBeenCalledTimes(1);
  });

  it('invalidateItemNameTranslationsCache forces a re-read', () => {
    store = stringifyItemNameTranslations({ a: { en: 'A' } });
    getItemNameTranslations();
    store = stringifyItemNameTranslations({ b: { en: 'B' } });
    invalidateItemNameTranslationsCache();
    expect(getItemNameTranslations()).toEqual({ b: { en: 'B' } });
  });

  it('registerItemNameTranslations merges and persists once, then invalidates the cache', async () => {
    await registerItemNameTranslations([
      { label: 'clothing', translations: { en: 'Clothing', de: 'Kleidung' } },
    ]);
    expect(game.settings.set).toHaveBeenCalledTimes(1);
    expect(getItemNameTranslations()).toEqual({
      clothing: { en: 'Clothing', de: 'Kleidung' },
    });
  });

  it('registerItemNameTranslations does nothing for an empty entry list', async () => {
    await registerItemNameTranslations([]);
    expect(game.settings.set).not.toHaveBeenCalled();
  });

  it('resolveItemNameTranslation looks up against the current cached dictionary', async () => {
    await registerItemNameTranslations([
      { label: 'clothing', translations: { en: 'Clothing', de: 'Kleidung' } },
    ]);
    expect(resolveItemNameTranslation('clothing', 'de')).toBe('Kleidung');
    expect(resolveItemNameTranslation('clothing', 'fr')).toBe('Clothing');
    expect(resolveItemNameTranslation('unknown', 'de')).toBeUndefined();
  });
});
