import { describe, it, expect } from 'vitest';
import {
  buildCustomNamePayload,
  buildResetNamePayload,
} from '@sheets/shared/item-name.js';

describe('buildCustomNamePayload', () => {
  it('trims and accepts a non-empty value', () => {
    expect(buildCustomNamePayload('  Custom Name  ')).toEqual({
      name: 'Custom Name',
      'system.hasCustomName': true,
    });
  });

  it('returns null for an empty or whitespace-only value', () => {
    expect(buildCustomNamePayload('')).toBeNull();
    expect(buildCustomNamePayload('   ')).toBeNull();
    expect(buildCustomNamePayload(undefined)).toBeNull();
  });
});

describe('buildResetNamePayload', () => {
  it('restores the canonical English name when nameEn is present', () => {
    const item = {
      name: 'Custom Name',
      system: { nameEn: 'Ares Predator IV' },
    };
    expect(buildResetNamePayload(item)).toEqual({
      payload: { name: 'Ares Predator IV', 'system.hasCustomName': false },
      restoredCanonicalName: true,
    });
  });

  it('falls back to the current name when nameEn is missing, without losing data', () => {
    const item = { name: 'Custom Name', system: { nameEn: '' } };
    expect(buildResetNamePayload(item)).toEqual({
      payload: { name: 'Custom Name', 'system.hasCustomName': false },
      restoredCanonicalName: false,
    });
  });
});
