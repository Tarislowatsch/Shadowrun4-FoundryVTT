import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TEMPLATES, PARTIAL_MANIFEST, templatePath } from '@utils/templates';

const TEMPLATE_ROOT = 'src/templates';
const PREFIX = templatePath('');

const INLINE_PARTIAL_PATTERN = /\{\{#\*inline\s+"([^"]+)"/g;
const PARTIAL_CALL_PATTERN = /\{\{#?>\s*"?([@a-zA-Z0-9_./-]+)"?/g;
const DYNAMIC_PARTIAL_PATTERN = /\bcard\s*=\s*["']([a-zA-Z0-9_-]+)["']/g;

function walk(dir, predicate) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) found.push(...walk(full, predicate));
    else if (predicate(full)) found.push(full);
  }
  return found;
}

function flatten(node, keys = []) {
  const entries = [];
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string') entries.push([[...keys, key], value]);
    else entries.push(...flatten(value, [...keys, key]));
  }
  return entries;
}

function matchAll(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

const templateFiles = walk(TEMPLATE_ROOT, (f) => f.endsWith('.hbs'));
const sourceFiles = walk('src', (f) => f.endsWith('.js'));

const templateEntries = flatten(TEMPLATES);
const declaredPaths = [
  ...templateEntries.map(([, value]) => value),
  ...Object.values(PARTIAL_MANIFEST),
];

const partialCalls = new Set();
const inlinePartials = new Set();
for (const file of templateFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const name of matchAll(content, PARTIAL_CALL_PATTERN))
    partialCalls.add(name);
  for (const name of matchAll(content, DYNAMIC_PARTIAL_PATTERN))
    partialCalls.add(name);
  for (const name of matchAll(content, INLINE_PARTIAL_PATTERN))
    inlinePartials.add(name);
}

describe('template paths', () => {
  it('resolves every declared path to a file on disk', () => {
    const missing = declaredPaths.filter(
      (declared) =>
        !fs.existsSync(path.join(TEMPLATE_ROOT, declared.replace(PREFIX, '')))
    );
    expect(missing).toEqual([]);
  });

  it('declares every template file exactly once', () => {
    const declared = new Set(
      declaredPaths.map((p) => `${TEMPLATE_ROOT}/${p.replace(PREFIX, '')}`)
    );
    expect(templateFiles.filter((f) => !declared.has(f))).toEqual([]);
    expect(declaredPaths.length).toBe(new Set(declaredPaths).size);
  });

  it('references every TEMPLATES entry from JavaScript', () => {
    const sources = sourceFiles
      .filter((f) => !f.startsWith('src/utils/templates/'))
      .map((f) => fs.readFileSync(f, 'utf8'))
      .join('\n');
    const unused = templateEntries
      .map(([keys]) => ['TEMPLATES', ...keys].join('.'))
      .filter((reference) => !sources.includes(reference));
    expect(unused).toEqual([]);
  });
});

describe('partial manifest', () => {
  it('registers only partials that are invoked from a template', () => {
    const unused = Object.keys(PARTIAL_MANIFEST).filter(
      (name) => !partialCalls.has(name)
    );
    expect(unused).toEqual([]);
  });

  it('registers every partial that templates invoke', () => {
    const unregistered = [...partialCalls].filter(
      (name) =>
        name !== '@partial-block' &&
        !(name in PARTIAL_MANIFEST) &&
        !inlinePartials.has(name)
    );
    expect(unregistered).toEqual([]);
  });
});
