import { describe, it, expect } from 'vitest';
import { computeElementArmorRules } from '../src/models/shared/element-rules.js';

describe('computeElementArmorRules', () => {
  it.each(['RADIATION', 'SMOKE', 'SOUND'])(
    '%s ignores armor entirely (noArmor)',
    (element) => {
      const result = computeElementArmorRules(element, 6);
      expect(result.noArmor).toBe(true);
      expect(result.effectiveArmor).toBe(0);
      expect(result.apHalf).toBe(false);
      expect(result.dvBonus).toBe(0);
    }
  );

  it('METAL keeps full impact armor and DV+2 (regression vs. Plan 2)', () => {
    const result = computeElementArmorRules('METAL', 6);
    expect(result.effectiveArmor).toBe(6);
    expect(result.apHalf).toBe(false);
    expect(result.dvBonus).toBe(2);
    expect(result.noArmor).toBe(false);
  });

  it.each(['ACID', 'SAND', 'WATER'])(
    '%s halves impact armor like the generic fallback',
    (element) => {
      const result = computeElementArmorRules(element, 5);
      expect(result.effectiveArmor).toBe(3); // ceil(5/2)
      expect(result.apHalf).toBe(true);
      expect(result.dvBonus).toBe(0);
      expect(result.noArmor).toBe(false);
    }
  );

  it('ICE remaps to the COLD hint via ELEMENT_RESISTANCE_MAP', () => {
    const result = computeElementArmorRules('ICE', 4);
    expect(result.hint).toBe('sr4.damage.coldHint');
  });
});
