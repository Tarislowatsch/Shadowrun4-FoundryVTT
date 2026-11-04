import { describe, it, expect } from 'vitest';
import { EFFECT_TEMPLATES, SR4_STATUS_EFFECTS } from '@effects/index.js';
import {
  KNOCKED_DOWN_STATUS,
  KNOCKED_DOWN_TEMPLATE,
} from '@models/shared/knockdown-rules.js';

describe('knockdown effect binding', () => {
  it('resolves to an existing effect template', () => {
    expect(EFFECT_TEMPLATES[KNOCKED_DOWN_TEMPLATE]).toBeDefined();
  });

  it('carries the status id the stacking guard looks for', () => {
    expect(EFFECT_TEMPLATES[KNOCKED_DOWN_TEMPLATE]?.statuses).toContain(
      KNOCKED_DOWN_STATUS
    );
  });

  it('is registered as a status effect on the token HUD', () => {
    expect(SR4_STATUS_EFFECTS.map((effect) => effect.id)).toContain(
      KNOCKED_DOWN_STATUS
    );
  });
});

const registeredIds = SR4_STATUS_EFFECTS.map((effect) => effect.id);
const ownAppliedStatuses = Object.values(EFFECT_TEMPLATES)
  .flatMap((template) => template.statuses ?? [])
  .filter((status) => status.startsWith('sr4-'));

describe('SR4 status effects', () => {
  it('registers every system status a built-in template applies', () => {
    expect(ownAppliedStatuses.length).toBeGreaterThan(0);
    expect(registeredIds).toEqual(expect.arrayContaining(ownAppliedStatuses));
  });

  it('has a template behind every registered status', () => {
    expect(ownAppliedStatuses).toEqual(
      expect.arrayContaining(
        registeredIds.filter((id) => id.startsWith('sr4-'))
      )
    );
  });

  it('uses unique ids', () => {
    expect(new Set(registeredIds).size).toBe(registeredIds.length);
  });
});
