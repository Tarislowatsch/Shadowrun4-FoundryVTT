import { describe, it, expect } from 'vitest';
import {
  evaluateForceFormula,
  resolveAttribute,
  isForceFormula,
} from '@utils/force-formula.js';

describe('isForceFormula', () => {
  it.each([
    ['F', true],
    ['F+2', true],
    ['F-3', true],
    ['(F*2)+3', true],
    ['(F/2)+1', true],
    ['3', false],
    ['12', false],
    ['', false],
    [undefined, false],
    [42, false],
  ])('%s -> %s', (input, expected) => {
    expect(isForceFormula(input)).toBe(expected);
  });
});

describe('evaluateForceFormula', () => {
  it.each([
    ['F', 5, 5],
    ['F+2', 5, 7],
    ['F-3', 5, 2],
    ['F-3', 1, 0],
    ['(F*2)+3', 5, 13],
    ['(F/2)+1', 5, 3],
    ['F+0', 3, 3],
    ['F*2', 4, 8],
    ['F', 1, 1],
  ])('%s at Force %i = %i', (formula, force, expected) => {
    expect(evaluateForceFormula(formula, force)).toBe(expected);
  });

  it('returns 0 for empty formula', () => {
    expect(evaluateForceFormula('', 5)).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(evaluateForceFormula(null, 5)).toBe(0);
  });

  it('floors fractional results', () => {
    expect(evaluateForceFormula('F/2', 5)).toBe(2);
  });

  it('clamps negative results to 0', () => {
    expect(evaluateForceFormula('F-10', 3)).toBe(0);
  });
});

describe('resolveAttribute', () => {
  it('uses formula when present', () => {
    expect(resolveAttribute({ value: 0, formula: 'F+2' }, 5)).toBe(7);
  });

  it('uses value when no formula', () => {
    expect(resolveAttribute({ value: 4, formula: '' }, 5)).toBe(4);
  });

  it('returns 0 for missing value and empty formula', () => {
    expect(resolveAttribute({ value: 0, formula: '' }, 5)).toBe(0);
  });
});
