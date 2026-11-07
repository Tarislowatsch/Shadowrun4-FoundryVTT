import { describe, it, expect } from 'vitest';
import { EFFECT_TEMPLATES, SR4_STATUS_EFFECTS } from '@effects/index.js';
import {
  KNOCKED_DOWN_STATUS,
  KNOCKED_DOWN_TEMPLATE,
} from '@models/shared/knockdown-rules.js';
import {
  ASTRAL_PERCEPTION_STATUS,
  ASTRAL_PERCEPTION_TEMPLATE,
} from '@models/shared/visibility-rules.js';

describe.each([
  ['knockdown', KNOCKED_DOWN_TEMPLATE, KNOCKED_DOWN_STATUS],
  ['astral perception', ASTRAL_PERCEPTION_TEMPLATE, ASTRAL_PERCEPTION_STATUS],
])('%s effect binding', (_label, template, status) => {
  it('resolves to an existing effect template', () => {
    expect(EFFECT_TEMPLATES[template]).toBeDefined();
  });

  it('carries the status id the rules look for', () => {
    expect(EFFECT_TEMPLATES[template]?.statuses).toContain(status);
  });

  it('is registered as a status effect on the token HUD', () => {
    expect(SR4_STATUS_EFFECTS.map((effect) => effect.id)).toContain(status);
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
