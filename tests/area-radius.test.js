import { describe, it, expect } from 'vitest';
import {
  areaRadius,
  clampRadiusAdjust,
  radiusAdjustCost,
} from '../src/domains/magic/area-radius.js';

describe('areaRadius', () => {
  it('uses the force in meters as base radius', () => {
    expect(areaRadius(5, 0)).toBe(5);
  });

  it.each([
    [5, 3, 8],
    [5, -2, 3],
  ])('force %i adjusted by %i meters -> %i', (force, adjust, expected) => {
    expect(areaRadius(force, adjust)).toBe(expected);
  });
});

describe('radiusAdjustCost', () => {
  it.each([
    [0, 0],
    [3, 3],
    [-2, 2],
  ])('adjusting by %i meters withholds %i dice', (adjust, expected) => {
    expect(radiusAdjustCost(adjust)).toBe(expected);
  });
});

describe('clampRadiusAdjust', () => {
  it('keeps a valid adjustment unchanged', () => {
    expect(clampRadiusAdjust(2, 5, 10)).toBe(2);
  });

  it('never shrinks the radius below one meter', () => {
    expect(clampRadiusAdjust(-6, 5, 10)).toBe(-4);
  });

  it('keeps at least one die for the spellcasting test', () => {
    expect(clampRadiusAdjust(12, 5, 10)).toBe(9);
    expect(clampRadiusAdjust(-4, 8, 3)).toBe(-2);
  });

  it('truncates fractional input towards zero', () => {
    expect(clampRadiusAdjust(2.7, 5, 10)).toBe(2);
    expect(clampRadiusAdjust(-1.5, 5, 10)).toBe(-1);
  });

  it('allows no adjustment at all with an empty pool', () => {
    expect(clampRadiusAdjust(3, 5, 0)).toBe(0);
    expect(clampRadiusAdjust(-3, 5, 0)).toBe(0);
  });

  it('treats non-numeric input as no adjustment', () => {
    expect(clampRadiusAdjust(Number.NaN, 5, 10)).toBe(0);
  });
});
