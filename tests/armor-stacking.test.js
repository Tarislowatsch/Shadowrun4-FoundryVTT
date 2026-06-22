import { describe, it, expect } from 'vitest';
import { computeArmorStacking } from '../src/models/actor/basecharacter.model.js';

function makeItem({
  ballistic = 0,
  impact = 0,
  stackingType = 'standard',
} = {}) {
  return {
    system: {
      effectiveBallistic: ballistic,
      effectiveImpact: impact,
      ballisticarmor: ballistic,
      impactarmor: impact,
      stackingType,
    },
  };
}

describe('computeArmorStacking', () => {
  describe('stacking rules', () => {
    it('uses highest standard armor values', () => {
      const equipped = [
        makeItem({ ballistic: 8, impact: 6 }),
        makeItem({ ballistic: 6, impact: 8 }),
      ];
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10
      );
      expect(result.ballistic).toBe(8);
      expect(result.impact).toBe(8);
    });

    it('adds accessory values on top of highest standard', () => {
      const equipped = [
        makeItem({ ballistic: 8, impact: 6 }),
        makeItem({ ballistic: 2, impact: 2, stackingType: 'accessory' }),
      ];
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10
      );
      expect(result.ballistic).toBe(10);
      expect(result.impact).toBe(8);
    });

    it('adds form-fitting values on top of highest standard', () => {
      const equipped = [
        makeItem({ ballistic: 8, impact: 6 }),
        makeItem({ ballistic: 4, impact: 4, stackingType: 'formFitting' }),
      ];
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10
      );
      expect(result.ballistic).toBe(12);
      expect(result.impact).toBe(10);
    });

    it('adds actor bonus to total', () => {
      const equipped = [makeItem({ ballistic: 6, impact: 4 })];
      const result = computeArmorStacking(
        equipped,
        { ballistic: 2, impact: 1 },
        10
      );
      expect(result.ballistic).toBe(8);
      expect(result.impact).toBe(5);
    });

    it('returns zeros with no equipped armor', () => {
      const result = computeArmorStacking([], { ballistic: 0, impact: 0 }, 3);
      expect(result.ballistic).toBe(0);
      expect(result.impact).toBe(0);
      expect(result.encumbrance).toBe(0);
    });

    it('works with only accessories (no standard)', () => {
      const equipped = [
        makeItem({ ballistic: 2, impact: 2, stackingType: 'accessory' }),
      ];
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10
      );
      expect(result.ballistic).toBe(2);
      expect(result.impact).toBe(2);
    });

    it('defaults missing stackingType to standard', () => {
      const equipped = [
        { system: { effectiveBallistic: 6, effectiveImpact: 4 } },
      ];
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10
      );
      expect(result.ballistic).toBe(6);
      expect(result.impact).toBe(4);
    });
  });

  describe('encumbrance', () => {
    it('returns 0 when armor does not exceed Body × 2', () => {
      const equipped = [makeItem({ ballistic: 8, impact: 6 })];
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        5
      );
      expect(result.encumbrance).toBe(0);
    });

    it('returns 0 when armor exactly equals Body × 2', () => {
      const equipped = [makeItem({ ballistic: 10, impact: 6 })];
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        5
      );
      expect(result.encumbrance).toBe(0);
    });

    it('calculates penalty for 1 point over (ceil(1/2) = 1)', () => {
      const equipped = [makeItem({ ballistic: 11, impact: 6 })];
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        5
      );
      expect(result.encumbrance).toBe(1);
    });

    it('calculates penalty for 2 points over (ceil(2/2) = 1)', () => {
      const equipped = [makeItem({ ballistic: 12, impact: 6 })];
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        5
      );
      expect(result.encumbrance).toBe(1);
    });

    it('calculates penalty for 3 points over (ceil(3/2) = 2)', () => {
      const equipped = [makeItem({ ballistic: 13, impact: 6 })];
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        5
      );
      expect(result.encumbrance).toBe(2);
    });

    it('sums ALL standard armors for encumbrance (not just highest)', () => {
      const equipped = [
        makeItem({ ballistic: 8, impact: 6 }),
        makeItem({ ballistic: 6, impact: 4 }),
      ];
      // Encumbrance ballistic = 8 + 6 = 14, Body*2 = 6, excess = 8, ceil(8/2) = 4
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        3
      );
      expect(result.encumbrance).toBe(4);
    });

    it('uses half (rounded down) for form-fitting in encumbrance check', () => {
      const equipped = [
        makeItem({ ballistic: 8, impact: 6 }),
        makeItem({ ballistic: 5, impact: 3, stackingType: 'formFitting' }),
      ];
      // Worn: 8+5=13 ballistic, 6+3=9 impact
      // Encumbrance ballistic: 8 + floor(5/2)=2 = 10, impact: 6 + floor(3/2)=1 = 7
      // Body*2 = 10, excess = max(0, max(10,7)-10) = 0
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        5
      );
      expect(result.encumbrance).toBe(0);
      expect(result.ballistic).toBe(13);
    });

    it('form-fitting half rounding causes encumbrance when close', () => {
      const equipped = [
        makeItem({ ballistic: 10, impact: 6 }),
        makeItem({ ballistic: 6, impact: 4, stackingType: 'formFitting' }),
      ];
      // Encumbrance ballistic: 10 + floor(6/2)=3 = 13, Body*2 = 10
      // excess = 3, ceil(3/2) = 2
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        5
      );
      expect(result.encumbrance).toBe(2);
    });

    it('includes accessories at full value in encumbrance', () => {
      const equipped = [
        makeItem({ ballistic: 8, impact: 6 }),
        makeItem({ ballistic: 2, impact: 2, stackingType: 'accessory' }),
      ];
      // Encumbrance ballistic: 8+2 = 10, Body*2 = 8, excess = 2, ceil(2/2) = 1
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        4
      );
      expect(result.encumbrance).toBe(1);
    });

    it('uses impact when it exceeds Body × 2 but ballistic does not', () => {
      const equipped = [makeItem({ ballistic: 4, impact: 12 })];
      // Encumbrance: ballistic 4, impact 12, Body*2 = 8, excess = 4, ceil(4/2) = 2
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        4
      );
      expect(result.encumbrance).toBe(2);
    });

    it('combines all three stacking types correctly', () => {
      const equipped = [
        makeItem({ ballistic: 12, impact: 6 }),
        makeItem({ ballistic: 8, impact: 10 }),
        makeItem({ ballistic: 4, impact: 2, stackingType: 'formFitting' }),
        makeItem({ ballistic: 2, impact: 1, stackingType: 'accessory' }),
      ];
      // Worn: max(12,8)=12 + 4 + 2 = 18 ballistic, max(6,10)=10 + 2 + 1 = 13 impact
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10
      );
      expect(result.ballistic).toBe(18);
      expect(result.impact).toBe(13);

      // Encumbrance: (12+8) + 2 + floor(4/2) = 24 ballistic, (6+10) + 1 + floor(2/2) = 18 impact
      // Body*2 = 20, excess = max(24,18)-20 = 4, ceil(4/2) = 2
      expect(result.encumbrance).toBe(2);
    });
  });
});
