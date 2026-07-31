import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const LANG_DIR = path.join(process.cwd(), 'src', 'lang');
const SRC_DIR = path.join(process.cwd(), 'src');

const LOCALIZE_CALL = /(?:localize|format)\(\s*(['"])(sr4\.[^'"]*)\1/g;
const HBS_LOCALIZE = /\{\{\s*localize\s+(['"])(sr4\.[^'"]*)\1/g;
const DYNAMIC_CALL =
  /(?:localize|format)\(\s*[`'"](sr4\.[^`'"$]*?)(?:\$\{|['"]\s*\+)/g;

/**
 * @param {object} node
 * @param {string} [prefix]
 * @returns {string[]}
 */
function flattenKeys(node, prefix = '') {
  return Object.entries(node).flatMap(([key, value]) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? flattenKeys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

/**
 * @returns {Record<string, Set<string>>}
 */
function readLanguages() {
  /** @type {Record<string, Set<string>>} */
  const languages = {};
  for (const file of fs.readdirSync(LANG_DIR)) {
    const language = file.split('.')[0];
    languages[language] ??= new Set();
    const content = JSON.parse(
      fs.readFileSync(path.join(LANG_DIR, file), 'utf8')
    );
    for (const key of flattenKeys(content)) languages[language].add(key);
  }
  return languages;
}

/**
 * @param {string} dir
 * @param {string[]} [files]
 * @returns {string[]}
 */
function collectSourceFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'lang') collectSourceFiles(full, files);
    } else if (/\.(js|hbs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

/**
 * @returns {{ keys: Map<string, string>, prefixes: Map<string, string> }}
 */
function collectReferences() {
  /** @type {Map<string, string>} */
  const keys = new Map();
  /** @type {Map<string, string>} */
  const prefixes = new Map();
  for (const file of collectSourceFiles(SRC_DIR)) {
    const text = fs.readFileSync(file, 'utf8');
    const where = path.relative(process.cwd(), file);
    for (const regex of [LOCALIZE_CALL, HBS_LOCALIZE]) {
      for (const match of text.matchAll(regex)) {
        if (!match[2].endsWith('.')) keys.set(match[2], where);
      }
    }
    for (const match of text.matchAll(DYNAMIC_CALL)) {
      prefixes.set(match[1].replace(/\.$/, ''), where);
    }
  }
  return { keys, prefixes };
}

const languages = readLanguages();
const { keys: referencedKeys, prefixes: referencedPrefixes } =
  collectReferences();

describe('i18n keys', () => {
  it('finds both the language files and the referenced keys', () => {
    expect(Object.keys(languages).sort()).toEqual(['de', 'en']);
    expect(referencedKeys.size).toBeGreaterThan(500);
    expect(referencedPrefixes.size).toBeGreaterThan(0);
  });

  it('has an English entry for every key referenced in the code', () => {
    const missing = [...referencedKeys]
      .filter(([key]) => !languages.en.has(key))
      .map(([key, file]) => `${key} (${file})`);

    expect(missing).toEqual([]);
  });

  it('has an English namespace for every dynamically built key', () => {
    const missing = [...referencedPrefixes]
      .filter(
        ([prefix]) =>
          ![...languages.en].some((key) => key.startsWith(`${prefix}.`))
      )
      .map(([prefix, file]) => `${prefix}.* (${file})`);

    expect(missing).toEqual([]);
  });

  it.each(
    Object.keys(languages)
      .filter((language) => language !== 'en')
      .map((language) => [language])
  )('keeps the %s key set identical to en', (language) => {
    const missing = [...languages.en].filter(
      (key) => !languages[language].has(key)
    );
    const extra = [...languages[language]].filter(
      (key) => !languages.en.has(key)
    );

    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });
});
