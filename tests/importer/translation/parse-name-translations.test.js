import { describe, it, expect } from 'vitest';
import {
  collectTranslations,
  applyTranslation,
} from '@importer/translation/parse-name-translations.js';

/**
 * Builds a minimal DOM-like node usable by collectTranslations, which only
 * reads `tagName`, `children` and `textContent`.
 *
 * @param {string} tagName
 * @param {string | Array} value - leaf text, or child nodes
 * @returns {{ tagName: string, children: any[], textContent: string }}
 */
function node(tagName, value) {
  if (Array.isArray(value)) {
    return { tagName, children: value, textContent: '' };
  }
  return { tagName, children: [], textContent: value };
}

describe('collectTranslations', () => {
  it('pairs a name with its sibling translate element', () => {
    const root = node('chummer', [
      node('armors', [
        node('armor', [
          node('name', 'Clothing'),
          node('page', '371'),
          node('translate', 'Kleidung'),
        ]),
      ]),
    ]);
    const names = new Map();
    const books = new Map();
    collectTranslations(root, names, books);
    expect(names.get('Clothing')).toBe('Kleidung');
    expect(books.size).toBe(0);
  });

  it('walks multiple sections and collects all pairs', () => {
    const root = node('chummer', [
      node('armors', [
        node('armor', [
          node('name', 'Clothing'),
          node('translate', 'Kleidung'),
        ]),
      ]),
      node('biowares', [
        node('bioware', [
          node('name', 'Adrenaline Pump'),
          node('translate', 'Adrenalinpumpe'),
        ]),
      ]),
    ]);
    const names = new Map();
    const books = new Map();
    collectTranslations(root, names, books);
    expect(names).toEqual(
      new Map([
        ['Clothing', 'Kleidung'],
        ['Adrenaline Pump', 'Adrenalinpumpe'],
      ])
    );
  });

  it('skips entries with an empty translate value', () => {
    const root = node('armors', [
      node('armor', [node('name', 'Ross Seal'), node('translate', '')]),
    ]);
    const names = new Map();
    const books = new Map();
    collectTranslations(root, names, books);
    expect(names.has('Ross Seal')).toBe(false);
  });

  it('falls through to a later valid entry when the first duplicate was empty', () => {
    const root = node('armors', [
      node('armor', [node('name', 'Ross Seal'), node('translate', '')]),
      node('armor', [
        node('name', 'Ross Seal'),
        node('translate', 'Rossrobbe'),
      ]),
    ]);
    const names = new Map();
    const books = new Map();
    collectTranslations(root, names, books);
    expect(names.get('Ross Seal')).toBe('Rossrobbe');
  });

  it('keeps the first match when both duplicates are valid', () => {
    const root = node('armors', [
      node('armor', [node('name', 'Full-Body Armor'), node('translate', 'A')]),
      node('armor', [node('name', 'Full-Body Armor'), node('translate', 'B')]),
    ]);
    const names = new Map();
    const books = new Map();
    collectTranslations(root, names, books);
    expect(names.get('Full-Body Armor')).toBe('A');
  });

  it('ignores name elements without a translate sibling', () => {
    const root = node('armors', [
      node('armor', [node('name', 'Untranslated Item'), node('page', '1')]),
    ]);
    const names = new Map();
    const books = new Map();
    collectTranslations(root, names, books);
    expect(names.size).toBe(0);
  });

  it('collects <book> entries into books, keyed by code, separate from names', () => {
    const root = node('chummer', [
      node('books', [
        node('book', [
          node('name', 'Street Legends'),
          node('translate', 'Straßenlegenden'),
          node('code', 'SL'),
        ]),
      ]),
    ]);
    const names = new Map();
    const books = new Map();
    collectTranslations(root, names, books);
    expect(names.size).toBe(0);
    expect(books.get('SL')).toEqual({
      en: 'Street Legends',
      translated: 'Straßenlegenden',
    });
  });

  it('falls back to the English title when a book has no translate', () => {
    const root = node('books', [
      node('book', [node('name', 'Street Legends'), node('code', 'SL')]),
    ]);
    const names = new Map();
    const books = new Map();
    collectTranslations(root, names, books);
    expect(books.get('SL')).toEqual({
      en: 'Street Legends',
      translated: 'Street Legends',
    });
  });

  it('does not misclassify a non-<book> element that happens to have name/code children', () => {
    const root = node('somethingElse', [
      node('name', 'Not A Book'),
      node('code', 'XX'),
    ]);
    const names = new Map();
    const books = new Map();
    collectTranslations(root, names, books);
    expect(books.size).toBe(0);
  });
});

describe('applyTranslation', () => {
  const data = { name: 'Clothing', type: 'armor', system: {} };

  it('stamps chummerId, sourceCode and label from the record even without a translation match', () => {
    const record = { id: 'guid-1', source: 'SR4' };
    const { data: result, translationEntry } = applyTranslation(
      data,
      record,
      null
    );
    expect(result.name).toBe('Clothing');
    expect(result.system.chummerId).toBe('guid-1');
    expect(result.system.sourceCode).toBe('SR4');
    expect(result.system.label).toBe('clothing');
    expect(result.system.nameEn).toBeUndefined();
    expect(translationEntry).toBeNull();
  });

  it('resolves sourceBookEn from the books dictionary via the record source code', () => {
    const record = { id: 'guid-1', source: 'SL' };
    const translations = {
      names: new Map(),
      books: new Map([
        ['SL', { en: 'Street Legends', translated: 'Straßenlegenden' }],
      ]),
    };
    const { data: result } = applyTranslation(data, record, translations);
    expect(result.system.sourceBookEn).toBe('Street Legends');
  });

  it('never overwrites data.name, but sets nameEn and returns a translation entry when a name matches', () => {
    const record = { id: 'guid-1', source: 'SR4' };
    const translations = {
      names: new Map([['Clothing', 'Kleidung']]),
      books: new Map(),
    };
    const { data: result, translationEntry } = applyTranslation(
      data,
      record,
      translations,
      'de'
    );
    expect(result.name).toBe('Clothing');
    expect(result.system.nameEn).toBe('Clothing');
    expect(result.system.label).toBe('clothing');
    expect(translationEntry).toEqual({
      label: 'clothing',
      translations: { en: 'Clothing', de: 'Kleidung' },
    });
  });

  it('returns no translation entry when a name matches but no language code is given', () => {
    const record = { id: 'guid-1', source: 'SR4' };
    const translations = {
      names: new Map([['Clothing', 'Kleidung']]),
      books: new Map(),
    };
    const { translationEntry } = applyTranslation(data, record, translations);
    expect(translationEntry).toBeNull();
  });

  it('leaves the name unchanged when no translation matches, without setting nameEn', () => {
    const record = { id: 'guid-1', source: 'SR4' };
    const translations = {
      names: new Map([['Other', 'Anderes']]),
      books: new Map(),
    };
    const { data: result, translationEntry } = applyTranslation(
      data,
      record,
      translations,
      'de'
    );
    expect(result.name).toBe('Clothing');
    expect(result.system.nameEn).toBeUndefined();
    expect(translationEntry).toBeNull();
  });

  it('leaves the name unchanged when translations is null', () => {
    const { data: result } = applyTranslation(
      data,
      { id: '', source: '' },
      null
    );
    expect(result.name).toBe('Clothing');
  });
});
