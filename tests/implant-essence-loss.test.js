import { describe, it, expect } from 'vitest';
import {
  computeImplantEssenceLoss,
  implantEssenceMultiplier,
} from '../src/models/actor/basecharacter.model.js';
import { essenceAfterGrade } from '../src/models/items/implant.model.js';
import { truncate2 } from '../src/sheets/characters/actor-context.js';

function implant(type, essenceActual) {
  return { system: { type, essenceActual } };
}

describe('computeImplantEssenceLoss', () => {
  const implants = [
    implant('CYBERWARE', 2),
    implant('BIOWARE', 1),
    implant('GENEWARE', 0.5),
    implant('NANOWARE', 0.5),
  ];

  it('matches raw sums when no options are set (regression guard)', () => {
    const result = computeImplantEssenceLoss(implants);
    expect(result.cyber).toBeCloseTo(3, 10);
    expect(result.bio).toBeCloseTo(1, 10);
  });

  it('reduces only CYBERWARE by 10% for biocompatibility cyberware', () => {
    const result = computeImplantEssenceLoss(implants, {
      biocompatibility: 'CYBERWARE',
    });
    expect(result.cyber).toBeCloseTo(2 * 0.9 + 0.5 + 0.5, 10);
    expect(result.bio).toBeCloseTo(1, 10);
  });

  it('reduces only BIOWARE by 10% for biocompatibility bioware', () => {
    const result = computeImplantEssenceLoss(implants, {
      biocompatibility: 'BIOWARE',
    });
    expect(result.cyber).toBeCloseTo(3, 10);
    expect(result.bio).toBeCloseTo(1 * 0.9, 10);
  });

  it('never reduces genetech (geneware/nanoware)', () => {
    const genetech = [implant('GENEWARE', 1), implant('NANOWARE', 1)];
    const result = computeImplantEssenceLoss(genetech, {
      biocompatibility: 'CYBERWARE',
    });
    expect(result.cyber).toBeCloseTo(2, 10);
  });

  it('doubles only CYBERWARE for sensitive system, not bioware or geneware', () => {
    const result = computeImplantEssenceLoss(implants, {
      sensitiveSystem: true,
    });
    expect(result.cyber).toBeCloseTo(2 * 2 + 0.5 + 0.5, 10);
    expect(result.bio).toBeCloseTo(1, 10);
  });

  it('stacks biocompatibility and sensitive system multiplicatively on cyberware', () => {
    const result = computeImplantEssenceLoss([implant('CYBERWARE', 2)], {
      biocompatibility: 'CYBERWARE',
      sensitiveSystem: true,
    });
    expect(result.cyber).toBeCloseTo(2 * 0.9 * 2, 10);
  });
});

describe('implantEssenceMultiplier', () => {
  it('reduces the chosen type by 10%', () => {
    expect(
      implantEssenceMultiplier('CYBERWARE', { biocompatibility: 'CYBERWARE' })
    ).toBeCloseTo(0.9, 10);
    expect(
      implantEssenceMultiplier('BIOWARE', { biocompatibility: 'CYBERWARE' })
    ).toBe(1);
  });

  it('doubles cyberware for sensitive system only', () => {
    expect(
      implantEssenceMultiplier('CYBERWARE', { sensitiveSystem: true })
    ).toBe(2);
    expect(implantEssenceMultiplier('BIOWARE', { sensitiveSystem: true })).toBe(
      1
    );
  });

  it('stacks both multiplicatively', () => {
    expect(
      implantEssenceMultiplier('CYBERWARE', {
        biocompatibility: 'CYBERWARE',
        sensitiveSystem: true,
      })
    ).toBeCloseTo(1.8, 10);
  });

  it('never touches genetech and defaults to 1', () => {
    expect(
      implantEssenceMultiplier('GENEWARE', {
        biocompatibility: 'CYBERWARE',
        sensitiveSystem: true,
      })
    ).toBe(1);
    expect(implantEssenceMultiplier('CYBERWARE')).toBe(1);
  });
});

describe('essenceAfterGrade', () => {
  it('leaves standard grade unchanged', () => {
    expect(essenceAfterGrade(0.3, 'STANDARD')).toBeCloseTo(0.3, 10);
  });

  it('applies alpha, beta, delta and second-hand factors', () => {
    expect(essenceAfterGrade(1, 'ALPHA')).toBeCloseTo(0.8, 10);
    expect(essenceAfterGrade(1, 'BETA')).toBeCloseTo(0.7, 10);
    expect(essenceAfterGrade(1, 'DELTA')).toBeCloseTo(0.5, 10);
    expect(essenceAfterGrade(1, 'SECOND_HAND')).toBeCloseTo(1.25, 10);
  });

  it('rounds to three decimals', () => {
    expect(essenceAfterGrade(0.3333, 'STANDARD')).toBe(0.333);
    expect(essenceAfterGrade(0.9, 'BETA')).toBe(0.63);
  });

  it('uses factor 1 for unknown or empty grade (regression)', () => {
    expect(essenceAfterGrade(0.4, '')).toBeCloseTo(0.4, 10);
    expect(essenceAfterGrade(0.4, undefined)).toBeCloseTo(0.4, 10);
    expect(essenceAfterGrade(0.4, 'FOO')).toBeCloseTo(0.4, 10);
  });
});

describe('truncate2', () => {
  it('truncates to two decimals without rounding', () => {
    expect(truncate2(0.078)).toBe(0.07);
    expect(truncate2(0.089)).toBe(0.08);
  });

  it('does not drop a digit due to float error', () => {
    expect(truncate2(0.29)).toBe(0.29);
    expect(truncate2(1.8)).toBe(1.8);
  });

  it('defaults nullish to 0', () => {
    expect(truncate2(undefined)).toBe(0);
  });
});
