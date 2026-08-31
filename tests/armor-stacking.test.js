import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@utils/game/game', () => ({
  getGame: () => globalThis.game,
}));

import { computeArmorStacking } from '../src/models/actor/armor-stacking.js';

let settings;

beforeEach(() => {
  settings = {
    changeEncumbranceToStrength: false,
    ignoreEncumbranceSingleArmorItem: false,
  };

  globalThis.game = {
    settings: {
      get: vi.fn((namespace, key) => {
        if (namespace !== 'shadowrun4e') return undefined;
        return settings[key];
      }),
    },
  };
});

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
        10,
        10
      );

      expect(result.ballistic).toBe(8);
      expect(result.impact).toBe(8);
    });

    it('adds accessory values on top of highest standard', () => {
      const equipped = [
        makeItem({ ballistic: 8, impact: 6 }),
        makeItem({
          ballistic: 2,
          impact: 2,
          stackingType: 'accessory',
        }),
      ];

      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10,
        10
      );

      expect(result.ballistic).toBe(10);
      expect(result.impact).toBe(8);
    });

    it('adds form-fitting values on top of highest standard', () => {
      const equipped = [
        makeItem({ ballistic: 8, impact: 6 }),
        makeItem({
          ballistic: 4,
          impact: 4,
          stackingType: 'formFitting',
        }),
      ];

      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10,
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
        10,
        10
      );

      expect(result.ballistic).toBe(8);
      expect(result.impact).toBe(5);
    });

    it('returns zeros with no equipped armor', () => {
      const result = computeArmorStacking(
        [],
        { ballistic: 0, impact: 0 },
        3,
        3
      );

      expect(result.ballistic).toBe(0);
      expect(result.impact).toBe(0);
      expect(result.encumbrance).toBe(0);
    });

    it('works with only accessories (no standard)', () => {
      const equipped = [
        makeItem({
          ballistic: 2,
          impact: 2,
          stackingType: 'accessory',
        }),
      ];

      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10,
        10
      );

      expect(result.ballistic).toBe(2);
      expect(result.impact).toBe(2);
    });

    it('works with only form-fitting armor (no standard)', () => {
      const equipped = [
        makeItem({
          ballistic: 4,
          impact: 6,
          stackingType: 'formFitting',
        }),
      ];

      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10,
        10
      );

      expect(result.ballistic).toBe(4);
      expect(result.impact).toBe(6);
    });

    it('works with only actor bonus (no equipped armor)', () => {
      const result = computeArmorStacking(
        [],
        { ballistic: 3, impact: 4 },
        10,
        10
      );

      expect(result.ballistic).toBe(3);
      expect(result.impact).toBe(4);
      expect(result.encumbrance).toBe(0);
    });

    it('defaults missing stackingType to standard', () => {
      const equipped = [
        {
          system: {
            effectiveBallistic: 6,
            effectiveImpact: 4,
          },
        },
      ];

      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10,
        10
      );

      expect(result.ballistic).toBe(6);
      expect(result.impact).toBe(4);
    });

    it('uses zero when armor values are missing', () => {
      const equipped = [
        {
          system: {
            stackingType: 'standard',
          },
        },
      ];

      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10,
        10
      );

      expect(result.ballistic).toBe(0);
      expect(result.impact).toBe(0);
      expect(result.encumbrance).toBe(0);
    });

    it('uses legacy armor field names as fallback', () => {
      const equipped = [
        {
          system: {
            ballisticarmor: 7,
            impactarmor: 5,
          },
        },
      ];

      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10,
        10
      );

      expect(result.ballistic).toBe(7);
      expect(result.impact).toBe(5);
    });

    it('prefers effective armor values over legacy armor values', () => {
      const equipped = [
        {
          system: {
            effectiveBallistic: 8,
            effectiveImpact: 6,
            ballisticarmor: 4,
            impactarmor: 3,
          },
        },
      ];

      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10,
        10
      );

      expect(result.ballistic).toBe(8);
      expect(result.impact).toBe(6);
    });
  });

  describe('encumbrance', () => {
    it('returns 0 when armor does not exceed Body × 2', () => {
      const equipped = [makeItem({ ballistic: 8, impact: 6 })];

      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        5,
        10
      );

      expect(result.encumbrance).toBe(0);
    });

    it('returns 0 when armor exactly equals Body × 2', () => {
      const equipped = [makeItem({ ballistic: 10, impact: 6 })];

      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        5,
        10
      );

      expect(result.encumbrance).toBe(0);
    });

    it.each([
      [1, 11, 1],
      [2, 12, 1],
      [3, 13, 2],
      [4, 14, 2],
      [5, 15, 3],
    ])(
      'calculates penalty for %i point(s) over (ballistic=%i -> %i)',
      (pointsOver, ballistic, expectedEncumbrance) => {
        const equipped = [makeItem({ ballistic, impact: 6 })];

        const result = computeArmorStacking(
          equipped,
          { ballistic: 0, impact: 0 },
          5,
          10
        );

        expect(result.encumbrance).toBe(expectedEncumbrance);
      }
    );

    it('sums ALL standard armors for encumbrance, not just highest', () => {
      const equipped = [
        makeItem({ ballistic: 8, impact: 6 }),
        makeItem({ ballistic: 6, impact: 4 }),
      ];

      // Encumbrance ballistic = 8 + 6 = 14
      // Body × 2 = 6
      // excess = 8
      // ceil(8 / 2) = 4
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        3,
        10
      );

      expect(result.encumbrance).toBe(4);
    });

    it('uses half rounded down for form-fitting armor', () => {
      const equipped = [
        makeItem({ ballistic: 8, impact: 6 }),
        makeItem({
          ballistic: 5,
          impact: 3,
          stackingType: 'formFitting',
        }),
      ];

      // Ballistic encumbrance = 8 + floor(5 / 2) = 10
      // Impact encumbrance = 6 + floor(3 / 2) = 7
      // Body × 2 = 10
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        5,
        10
      );

      expect(result.encumbrance).toBe(0);
    });

    it('form-fitting half rounding causes encumbrance when close', () => {
      const equipped = [
        makeItem({ ballistic: 10, impact: 6 }),
        makeItem({
          ballistic: 6,
          impact: 4,
          stackingType: 'formFitting',
        }),
      ];

      // Ballistic encumbrance = 10 + floor(6 / 2) = 13
      // Body × 2 = 10
      // excess = 3
      // ceil(3 / 2) = 2
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        5,
        10
      );

      expect(result.encumbrance).toBe(2);
    });

    it('rounds form-fitting armor down before adding it to encumbrance', () => {
      const equipped = [
        makeItem({ ballistic: 10, impact: 6 }),
        makeItem({
          ballistic: 5,
          impact: 5,
          stackingType: 'formFitting',
        }),
      ];

      // Ballistic: 10 + floor(5 / 2) = 12
      // Impact:    6 + floor(5 / 2) = 8
      // Body × 2 = 10
      // excess = 2
      // encumbrance = 1
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        5,
        10
      );

      expect(result.encumbrance).toBe(1);
    });

    it('includes accessories at full value in encumbrance', () => {
      const equipped = [
        makeItem({ ballistic: 8, impact: 6 }),
        makeItem({
          ballistic: 2,
          impact: 2,
          stackingType: 'accessory',
        }),
      ];

      // Ballistic = 8 + 2 = 10
      // Body × 2 = 8
      // excess = 2
      // ceil(2 / 2) = 1
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        4,
        10
      );

      expect(result.encumbrance).toBe(1);
    });

    it('uses impact when it exceeds Body × 2 but ballistic does not', () => {
      const equipped = [makeItem({ ballistic: 4, impact: 12 })];

      // Body × 2 = 8
      // Impact excess = 4
      // ceil(4 / 2) = 2
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        4,
        10
      );

      expect(result.encumbrance).toBe(2);
    });

    it('uses ballistic when it exceeds impact', () => {
      const equipped = [makeItem({ ballistic: 14, impact: 8 })];

      // Body × 2 = 10
      // Ballistic excess = 4
      // ceil(4 / 2) = 2
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        5,
        10
      );

      expect(result.encumbrance).toBe(2);
    });

    it('uses the higher of ballistic and impact encumbrance', () => {
      const equipped = [makeItem({ ballistic: 11, impact: 15 })];

      // Body × 2 = 10
      // Ballistic excess = 1
      // Impact excess = 5
      // max excess = 5
      // ceil(5 / 2) = 3
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        5,
        10
      );

      expect(result.encumbrance).toBe(3);
    });

    it('includes actor ballistic bonus in encumbrance', () => {
      const equipped = [makeItem({ ballistic: 8, impact: 6 })];

      const result = computeArmorStacking(
        equipped,
        { ballistic: 4, impact: 0 },
        5,
        10
      );

      // 8 + 4 bonus = 12
      // Body × 2 = 10
      // excess = 2
      // encumbrance = 1
      expect(result.encumbrance).toBe(1);
    });

    it('includes actor impact bonus in encumbrance', () => {
      const equipped = [makeItem({ ballistic: 6, impact: 8 })];

      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 4 },
        5,
        10
      );

      // 8 + 4 bonus = 12
      // Body × 2 = 10
      // excess = 2
      // encumbrance = 1
      expect(result.encumbrance).toBe(1);
    });

    it('combines all three stacking types correctly', () => {
      const equipped = [
        makeItem({ ballistic: 12, impact: 6 }),
        makeItem({ ballistic: 8, impact: 10 }),
        makeItem({
          ballistic: 4,
          impact: 2,
          stackingType: 'formFitting',
        }),
        makeItem({
          ballistic: 2,
          impact: 1,
          stackingType: 'accessory',
        }),
      ];

      // Worn:
      // ballistic = max(12, 8) + 4 + 2 = 18
      // impact = max(6, 10) + 2 + 1 = 13
      //
      // Encumbrance:
      // ballistic = 12 + 8 + floor(4 / 2) + 2 = 24
      // impact = 6 + 10 + floor(2 / 2) + 1 = 18
      //
      // Body × 2 = 20
      // excess = 4
      // ceil(4 / 2) = 2
      const result = computeArmorStacking(
        equipped,
        { ballistic: 0, impact: 0 },
        10,
        10
      );

      expect(result.ballistic).toBe(18);
      expect(result.impact).toBe(13);
      expect(result.encumbrance).toBe(2);
    });

    describe('changeEncumbranceToStrength setting', () => {
      it('uses Body × 2 when the setting is disabled', () => {
        settings.changeEncumbranceToStrength = false;

        const equipped = [makeItem({ ballistic: 13, impact: 6 })];

        const result = computeArmorStacking(
          equipped,
          { ballistic: 0, impact: 0 },
          5,
          7
        );

        // Body × 2 = 10
        // excess = 3
        // ceil(3 / 2) = 2
        expect(result.encumbrance).toBe(2);
      });

      it('uses Strength + Body when the setting is enabled', () => {
        settings.changeEncumbranceToStrength = true;

        const equipped = [makeItem({ ballistic: 13, impact: 6 })];

        const result = computeArmorStacking(
          equipped,
          { ballistic: 0, impact: 0 },
          5,
          7
        );

        // Strength + Body = 12
        // excess = 1
        // ceil(1 / 2) = 1
        expect(result.encumbrance).toBe(1);
      });

      it('returns no encumbrance when Strength + Body exactly matches armor', () => {
        settings.changeEncumbranceToStrength = true;

        const equipped = [makeItem({ ballistic: 12, impact: 6 })];

        const result = computeArmorStacking(
          equipped,
          { ballistic: 0, impact: 0 },
          5,
          7
        );

        expect(result.encumbrance).toBe(0);
      });

      it('uses Strength + Body even when Strength is lower than Body', () => {
        settings.changeEncumbranceToStrength = true;

        const equipped = [makeItem({ ballistic: 11, impact: 6 })];

        const result = computeArmorStacking(
          equipped,
          { ballistic: 0, impact: 0 },
          8,
          2
        );

        // Strength + Body = 10
        // excess = 1
        // ceil(1 / 2) = 1
        expect(result.encumbrance).toBe(1);
      });
    });

    describe('ignoreEncumbranceSingleArmorItem setting', () => {
      it('applies encumbrance to a single item when the setting is disabled', () => {
        settings.ignoreEncumbranceSingleArmorItem = false;

        const equipped = [makeItem({ ballistic: 20, impact: 20 })];

        const result = computeArmorStacking(
          equipped,
          { ballistic: 0, impact: 0 },
          5,
          1
        );

        // Body × 2 = 10
        // excess = 10
        // ceil(10 / 2) = 5
        expect(result.encumbrance).toBe(5);
      });

      it('ignores encumbrance for a single armor item when the setting is enabled', () => {
        settings.ignoreEncumbranceSingleArmorItem = true;

        const equipped = [makeItem({ ballistic: 20, impact: 20 })];

        const result = computeArmorStacking(
          equipped,
          { ballistic: 0, impact: 0 },
          5,
          1
        );

        expect(result.encumbrance).toBe(0);
      });

      it('does not ignore encumbrance when multiple armor items are equipped', () => {
        settings.ignoreEncumbranceSingleArmorItem = true;

        const equipped = [
          makeItem({ ballistic: 10, impact: 10 }),
          makeItem({ ballistic: 10, impact: 10 }),
        ];

        const result = computeArmorStacking(
          equipped,
          { ballistic: 0, impact: 0 },
          5,
          2
        );

        // Encumbrance = 20
        // Body × 2 = 10
        // excess = 10
        // ceil(10 / 2) = 5
        expect(result.encumbrance).toBe(5);
      });

      it('ignores encumbrance based on equipped item count, not armor value', () => {
        settings.ignoreEncumbranceSingleArmorItem = true;

        const equipped = [makeItem({ ballistic: 100, impact: 100 })];

        const result = computeArmorStacking(
          equipped,
          { ballistic: 50, impact: 50 },
          1,
          1
        );

        expect(result.encumbrance).toBe(0);
      });
    });

    describe('setting interaction', () => {
      it('ignores single-item encumbrance even when Strength + Body mode is enabled', () => {
        settings.changeEncumbranceToStrength = true;
        settings.ignoreEncumbranceSingleArmorItem = true;

        const equipped = [makeItem({ ballistic: 100, impact: 100 })];

        const result = computeArmorStacking(
          equipped,
          { ballistic: 0, impact: 0 },
          1,
          1
        );

        expect(result.encumbrance).toBe(0);
      });

      it('uses Strength + Body for multiple items when both settings are enabled', () => {
        settings.changeEncumbranceToStrength = true;
        settings.ignoreEncumbranceSingleArmorItem = true;

        const equipped = [
          makeItem({ ballistic: 15, impact: 10 }),
          makeItem({ ballistic: 10, impact: 10 }),
        ];

        // Strength + Body = 12
        // Encumbrance ballistic = 25
        // excess = 13
        // ceil(13 / 2) = 7
        const result = computeArmorStacking(
          equipped,
          { ballistic: 0, impact: 0 },
          5,
          7
        );

        expect(result.encumbrance).toBe(7);
      });
    });
  });

  describe('game settings access', () => {
    it('reads encumbrance settings from the sr4 game namespace', () => {
      computeArmorStacking(
        [makeItem({ ballistic: 1, impact: 1 })],
        { ballistic: 0, impact: 0 },
        5,
        1
      );

      expect(globalThis.game.settings.get).toHaveBeenCalledWith(
        'shadowrun4e',
        'ignoreEncumbranceSingleArmorItem'
      );

      expect(globalThis.game.settings.get).toHaveBeenCalledWith(
        'shadowrun4e',
        'changeEncumbranceToStrength'
      );
    });
  });
});
