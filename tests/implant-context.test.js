import { describe, it, expect } from 'vitest';
import { buildImplantContext } from '../src/sheets/characters/implant-context.js';

function makeImplant(id, overrides = {}) {
  return {
    _id: id,
    name: `Implant ${id}`,
    type: 'Implant',
    system: { type: 'CYBERWARE', grade: 'STANDARD', ...overrides },
  };
}

describe('buildImplantContext', () => {
  it('groups implants by type and drops empty groups', () => {
    const implants = [makeImplant('i1', { type: 'CYBERWARE' })];
    const ctx = buildImplantContext(implants, {
      derivedStats: {},
      sheetStats: {},
    });
    expect(ctx.implantsByType).toHaveLength(1);
    expect(ctx.implantsByType[0].items).toHaveLength(1);
  });

  it('sets displayType/displayGrade on each implant', () => {
    const implants = [makeImplant('i1', { type: 'CYBERWARE', grade: 'ALPHA' })];
    buildImplantContext(implants, { derivedStats: {}, sheetStats: {} });
    expect(implants[0].displayType).toBe('sr4.implant.type.cyberware');
    expect(implants[0].displayGrade).toBe('sr4.implant.grade.alpha');
  });

  it('computes essence loss when bio dominates', () => {
    const sys = {
      derivedStats: { essenceLossCyber: 1, essenceLossBio: 2 },
      sheetStats: { ESSENCE: 6 },
    };
    const ctx = buildImplantContext([], sys);
    expect(ctx.essenceLoss).toBe('2.50');
    expect(ctx.essenceHalvedLabel).toBe('cyber');
    expect(ctx.essenceHalved).toBe('0.50');
    expect(ctx.currentEssence).toBe('3.50');
  });

  it('computes essence loss when cyber dominates', () => {
    const sys = {
      derivedStats: { essenceLossCyber: 3, essenceLossBio: 1 },
      sheetStats: { ESSENCE: 6 },
    };
    const ctx = buildImplantContext([], sys);
    expect(ctx.essenceLoss).toBe('3.50');
    expect(ctx.essenceHalvedLabel).toBe('bio');
    expect(ctx.essenceHalved).toBe('0.50');
  });

  it('defaults ESSENCE to 6 when sheetStats is missing it', () => {
    const sys = { derivedStats: {}, sheetStats: {} };
    const ctx = buildImplantContext([], sys);
    expect(ctx.currentEssence).toBe('6.00');
  });
});
