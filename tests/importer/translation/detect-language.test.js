import { describe, it, expect } from 'vitest';
import {
  detectLanguageFromFilename,
  normalizeLangCode,
} from '@importer/translation/detect-language.js';

describe('detectLanguageFromFilename', () => {
  it.each([
    ['de.xml', 'de'],
    ['de_data.xml', 'de'],
    ['fr.xml', 'fr'],
    ['FR_DATA.XML', 'fr'],
    ['de-data.xml', 'de'],
  ])('detectLanguageFromFilename(%j) -> %j', (input, expected) => {
    expect(detectLanguageFromFilename(input)).toBe(expected);
  });

  it.each([['translations.xml'], ['data.xml'], [''], [undefined]])(
    'returns null when no language code can be inferred from %j',
    (input) => {
      expect(detectLanguageFromFilename(input)).toBeNull();
    }
  );
});

describe('normalizeLangCode', () => {
  it.each([
    ['  DE ', 'de'],
    ['Fr', 'fr'],
    ['de', 'de'],
  ])('normalizeLangCode(%j) -> %j', (input, expected) => {
    expect(normalizeLangCode(input)).toBe(expected);
  });

  it.each([[undefined], [null], [''], ['   ']])(
    'returns null for %j',
    (input) => {
      expect(normalizeLangCode(input)).toBeNull();
    }
  );
});
