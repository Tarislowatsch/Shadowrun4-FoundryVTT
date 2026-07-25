import { describe, it, expect } from 'vitest';
import {
  computeMatrixSystem,
  computeBiofeedbackFilter,
  computeMatrixFirewall,
  effectiveSimMode,
} from '../src/domains/matrix/derived-stats.js';

describe('computeMatrixSystem', () => {
  it('technomancer uses LOGIC + systemBonus', () => {
    const system = {
      technomancy: { technomancer: true },
      sheetStats: { LOGIC: 5, RESONANCE: 6 },
      livingPersona: { systemBonus: 1 },
    };
    expect(computeMatrixSystem(system, [])).toBe(6);
  });

  it('caps the living persona System at RESONANCE', () => {
    const system = {
      technomancy: { technomancer: true },
      sheetStats: { LOGIC: 5, RESONANCE: 4 },
      livingPersona: { systemBonus: 1 },
    };
    expect(computeMatrixSystem(system, [])).toBe(4);
  });

  it('mundane uses best equipped commlink os', () => {
    const system = { technomancy: { technomancer: false } };
    const items = [
      { type: 'Commlink', system: { equipped: true, os: 4 } },
      { type: 'Commlink', system: { equipped: true, os: 6 } },
      { type: 'Commlink', system: { equipped: false, os: 9 } },
    ];
    expect(computeMatrixSystem(system, items)).toBe(6);
  });

  it('is 0 without commlink or technomancy', () => {
    expect(computeMatrixSystem({ technomancy: {} }, [])).toBe(0);
  });
});

describe('computeBiofeedbackFilter', () => {
  it('technomancer uses CHARISMA + biofeedbackFilterBonus', () => {
    const system = {
      technomancy: { technomancer: true },
      sheetStats: { CHARISMA: 3, RESONANCE: 6 },
      livingPersona: { biofeedbackFilterBonus: 2 },
    };
    expect(computeBiofeedbackFilter(system, [])).toBe(5);
  });

  it('caps the living persona Biofeedback Filter at RESONANCE', () => {
    const system = {
      technomancy: { technomancer: true },
      sheetStats: { CHARISMA: 5, RESONANCE: 3 },
      livingPersona: { biofeedbackFilterBonus: 2 },
    };
    expect(computeBiofeedbackFilter(system, [])).toBe(3);
  });

  it('mundane uses equipped Biofeedback Filter program rating', () => {
    const items = [
      { type: 'Program', name: 'Biofeedback Filter', system: { rating: 4 } },
    ];
    expect(computeBiofeedbackFilter({ technomancy: {} }, items)).toBe(4);
  });
});

describe('computeMatrixFirewall', () => {
  it('technomancer uses WILLPOWER + firewallBonus capped at RESONANCE', () => {
    const system = {
      technomancy: { technomancer: true },
      sheetStats: { WILLPOWER: 5, RESONANCE: 4 },
      livingPersona: { firewallBonus: 1 },
    };
    expect(computeMatrixFirewall(system, [])).toBe(4);
  });

  it('mundane uses best equipped commlink firewall', () => {
    const items = [
      { type: 'Commlink', system: { equipped: true, firewall: 3 } },
      { type: 'Commlink', system: { equipped: true, firewall: 5 } },
      { type: 'Commlink', system: { equipped: false, firewall: 9 } },
    ];
    expect(computeMatrixFirewall({ technomancy: {} }, items)).toBe(5);
  });
});

describe('effectiveSimMode', () => {
  it('technomancers always run hot sim', () => {
    expect(
      effectiveSimMode({
        technomancy: { technomancer: true },
        matrixSimMode: 'cold',
      })
    ).toBe('hot');
  });

  it('others use the selected sim mode', () => {
    expect(effectiveSimMode({ matrixSimMode: 'hot' })).toBe('hot');
    expect(effectiveSimMode({ matrixSimMode: 'cold' })).toBe('cold');
    expect(effectiveSimMode({})).toBe('cold');
  });
});
