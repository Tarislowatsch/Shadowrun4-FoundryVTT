import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const DATA_DIRS = ['utility/packs', 'utility/examples'];

const PROSE_FIELDS = ['description', 'notes', 'text', 'summary', 'effect'];

const ID_FIELDS = ['uuid', '_id', 'id'];

const MAX_STRING_LENGTH = 60;

function jsonFiles(dir) {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(dir, f));
}

function readEntries(file) {
  const parsed = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  return Array.isArray(parsed) ? parsed : [parsed];
}

function collectStrings(value, keyPath, out) {
  if (typeof value === 'string') {
    out.push([keyPath, value]);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collectStrings(v, `${keyPath}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      collectStrings(v, keyPath ? `${keyPath}.${k}` : k, out);
    }
  }
}

const files = DATA_DIRS.flatMap(jsonFiles);

describe('shipped data carries no rulebook text', () => {
  it('finds data files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s leaves prose fields empty', (file) => {
    const offenders = [];
    for (const entry of readEntries(file)) {
      const strings = [];
      collectStrings(entry, '', strings);
      for (const [keyPath, value] of strings) {
        const field = keyPath.split('.').pop();
        if (PROSE_FIELDS.includes(field) && value.trim() !== '') {
          offenders.push(`${keyPath}: ${JSON.stringify(value)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it.each(files)(
    '%s keeps every value short enough to be a name or reference',
    (file) => {
      const offenders = [];
      for (const entry of readEntries(file)) {
        const strings = [];
        collectStrings(entry, '', strings);
        for (const [keyPath, value] of strings) {
          const field = keyPath.split('.').pop();
          if (ID_FIELDS.includes(field)) continue;
          if (value.length > MAX_STRING_LENGTH) {
            offenders.push(`${keyPath}: ${value.length} chars`);
          }
        }
      }
      expect(offenders).toEqual([]);
    }
  );
});
