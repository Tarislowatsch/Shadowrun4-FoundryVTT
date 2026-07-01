import { describe, it, expect, beforeEach } from 'vitest';
import {
  clampRating,
  calculateFadingValue,
  calculateThreadingCap,
} from '../src/utils/dialog/magic/threading-helpers.js';
import { loadAvailableComplexForms } from '../src/utils/dialog/magic/threading.js';

// ─── threading-helpers ───────────────────────────────────────────────────────

describe('clampRating', () => {
  it('returns 0 for negative input', () => {
    expect(clampRating(-1, 8)).toBe(0);
  });

  it('passes through values within cap', () => {
    expect(clampRating(3, 8)).toBe(3);
    expect(clampRating(0, 8)).toBe(0);
    expect(clampRating(8, 8)).toBe(8);
  });

  it('clamps to cap when rating exceeds it', () => {
    expect(clampRating(10, 8)).toBe(8);
    expect(clampRating(100, 4)).toBe(4);
  });
});

describe('calculateFadingValue', () => {
  it('returns minimum of 2 for 0 hits', () => {
    expect(calculateFadingValue(0)).toBe(2);
  });

  it('returns minimum of 2 for 1 hit', () => {
    expect(calculateFadingValue(1)).toBe(2);
  });

  it('returns hits when hits exceed minimum', () => {
    expect(calculateFadingValue(3)).toBe(3);
    expect(calculateFadingValue(10)).toBe(10);
  });
});

describe('calculateThreadingCap', () => {
  it('returns 2 × resonance', () => {
    expect(calculateThreadingCap(4)).toBe(8);
    expect(calculateThreadingCap(1)).toBe(2);
    expect(calculateThreadingCap(6)).toBe(12);
  });

  it('returns 0 for resonance 0', () => {
    expect(calculateThreadingCap(0)).toBe(0);
  });
});

// ─── loadAvailableComplexForms ────────────────────────────────────────────────

function makeForm(name, extra = {}) {
  return {
    name,
    uuid: `uuid-${name}`,
    type: 'Program',
    system: { complexform: true, ...extra },
    testUserPermission: () => true,
  };
}

function makeActor(forms) {
  return { items: forms.map((f) => ({ ...f, type: 'Program' })) };
}

beforeEach(() => {
  globalThis.CONST = {
    DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2 },
  };
  globalThis.game.items = [];
  globalThis.game.packs = [];
});

describe('loadAvailableComplexForms', () => {
  it('returns empty map when no forms exist anywhere', async () => {
    const result = await loadAvailableComplexForms(makeActor([]));
    expect(result.size).toBe(0);
  });

  it('returns actor forms', async () => {
    const actor = makeActor([makeForm('Analyze')]);
    const result = await loadAvailableComplexForms(actor);
    expect(result.size).toBe(1);
    expect(result.get('analyze').source).toBe('actor');
  });

  it('returns world forms when actor has none', async () => {
    globalThis.game.items = [makeForm('Stealth')];
    const result = await loadAvailableComplexForms(makeActor([]));
    expect(result.size).toBe(1);
    expect(result.get('stealth').source).toBe('world');
  });

  it('actor form wins over world form with same name', async () => {
    globalThis.game.items = [makeForm('Analyze')];
    const actor = makeActor([makeForm('Analyze')]);
    const result = await loadAvailableComplexForms(actor);
    expect(result.size).toBe(1);
    expect(result.get('analyze').source).toBe('actor');
  });

  it('actor form wins over compendium form with same name', async () => {
    const packDoc = makeForm('Analyze');
    globalThis.game.packs = [
      {
        documentName: 'Item',
        getDocuments: async () => [packDoc],
      },
    ];
    const actor = makeActor([makeForm('Analyze')]);
    const result = await loadAvailableComplexForms(actor);
    expect(result.size).toBe(1);
    expect(result.get('analyze').source).toBe('actor');
  });

  it('deduplicates case-insensitively', async () => {
    globalThis.game.items = [makeForm('ANALYZE')];
    const actor = makeActor([makeForm('Analyze')]);
    const result = await loadAvailableComplexForms(actor);
    expect(result.size).toBe(1);
    expect(result.get('analyze').source).toBe('actor');
  });

  it('skips world forms without observer permission', async () => {
    const form = { ...makeForm('Restricted'), testUserPermission: () => false };
    globalThis.game.items = [form];
    const result = await loadAvailableComplexForms(makeActor([]));
    expect(result.size).toBe(0);
  });

  it('skips non-complexform programs on actor', async () => {
    const actor = makeActor([
      { ...makeForm('Regular'), system: { complexform: false } },
    ]);
    const result = await loadAvailableComplexForms(actor);
    expect(result.size).toBe(0);
  });

  it('merges distinct forms from all sources', async () => {
    const packDoc = makeForm('Exploit');
    globalThis.game.packs = [
      { documentName: 'Item', getDocuments: async () => [packDoc] },
    ];
    globalThis.game.items = [makeForm('Stealth')];
    const actor = makeActor([makeForm('Analyze')]);
    const result = await loadAvailableComplexForms(actor);
    expect(result.size).toBe(3);
    expect(result.get('analyze').source).toBe('actor');
    expect(result.get('stealth').source).toBe('world');
    expect(result.get('exploit').source).toBe('compendium');
  });

  it('ignores packs that are not Item packs', async () => {
    globalThis.game.packs = [
      {
        documentName: 'Actor',
        getDocuments: async () => [makeForm('Analyze')],
      },
    ];
    const result = await loadAvailableComplexForms(makeActor([]));
    expect(result.size).toBe(0);
  });
});
