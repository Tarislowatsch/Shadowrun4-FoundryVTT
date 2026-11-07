import { describe, it, expect } from 'vitest';
import {
  ASTRAL_PERCEPTION_STATUS,
  VISIBILITY_TABLE,
  availableVisionModes,
  bestVisionMode,
  computeVisibilityModifier,
  hasActiveVisibility,
  isVisibilityApplicable,
  labelledValues,
  resolveVision,
  visionFromMetatype,
  visionFromNames,
} from '@models/shared/visibility-rules.js';

describe('VISIBILITY_TABLE', () => {
  it.each([
    ['fullDarkness', [-6, -6, -3, -3]],
    ['partialLight', [-2, 0, -2, -1]],
    ['glare', [-1, -1, -1, 0]],
    ['lightFog', [-2, -1, 0, -1]],
    ['heavyFog', [-4, -2, -2, -2]],
    ['thermalSmoke', [-4, -2, -6, -2]],
  ])('matches the rulebook row for %s', (condition, values) => {
    const row = VISIBILITY_TABLE[condition];
    expect([
      row.normal,
      row.lowLight,
      row.thermographic,
      row.ultrasound,
    ]).toEqual(values);
  });
});

describe('computeVisibilityModifier', () => {
  it('is zero under normal conditions', () => {
    expect(
      computeVisibilityModifier(
        { light: 'normal', obscurant: 'none' },
        'normal'
      )
    ).toBe(0);
  });

  it('adds light and obscurant modifiers', () => {
    expect(
      computeVisibilityModifier(
        { light: 'partialLight', obscurant: 'heavyFog' },
        'normal'
      )
    ).toBe(-6);
  });

  it('uses the column of the given vision mode', () => {
    expect(
      computeVisibilityModifier(
        { light: 'fullDarkness', obscurant: 'thermalSmoke' },
        'thermographic'
      )
    ).toBe(-9);
  });

  it('ignores glare with flare compensation', () => {
    expect(
      computeVisibilityModifier(
        { light: 'glare', obscurant: 'lightFog' },
        'normal',
        { flareCompensation: true }
      )
    ).toBe(-2);
  });

  it('treats unknown conditions as zero', () => {
    expect(
      computeVisibilityModifier({ light: 'bogus', obscurant: '' }, 'normal')
    ).toBe(0);
  });
});

describe('availableVisionModes', () => {
  it('always includes normal vision', () => {
    expect(availableVisionModes(undefined)).toEqual(['normal']);
  });

  it('adds enabled enhanced modes', () => {
    expect(
      availableVisionModes({
        lowLight: true,
        thermographic: false,
        ultrasound: true,
        flareCompensation: true,
      })
    ).toEqual(['normal', 'lowLight', 'ultrasound']);
  });

  it('drops ultrasound when visual sight is required', () => {
    expect(
      availableVisionModes(
        { lowLight: true, ultrasound: true },
        { visualOnly: true }
      )
    ).toEqual(['normal', 'lowLight']);
  });
});

describe('resolveVision', () => {
  it('combines manual and metatype modes and honours disabled ones', () => {
    expect(
      resolveVision(
        { thermographic: true },
        { lowLight: true, flareCompensation: true },
        { flareCompensation: true }
      )
    ).toEqual({
      lowLight: true,
      thermographic: true,
      ultrasound: false,
      flareCompensation: false,
    });
  });
});

describe('labelledValues', () => {
  it('pairs every value with its label key', () => {
    expect(labelledValues({ A: 'a', B: 'b' }, 'x.')).toEqual([
      { value: 'a', label: 'x.a' },
      { value: 'b', label: 'x.b' },
    ]);
  });
});

describe('bestVisionMode', () => {
  it('picks the mode with the smallest penalty', () => {
    expect(
      bestVisionMode({ light: 'fullDarkness', obscurant: 'none' }, [
        'normal',
        'lowLight',
        'thermographic',
      ])
    ).toBe('thermographic');
  });

  it('keeps normal vision on a tie', () => {
    expect(
      bestVisionMode({ light: 'glare', obscurant: 'none' }, [
        'normal',
        'lowLight',
      ])
    ).toBe('normal');
  });

  it('avoids thermographic vision in thermal smoke', () => {
    expect(
      bestVisionMode({ light: 'normal', obscurant: 'thermalSmoke' }, [
        'normal',
        'thermographic',
        'ultrasound',
      ])
    ).toBe('ultrasound');
  });
});

describe('hasActiveVisibility', () => {
  it.each([
    [{ light: 'normal', obscurant: 'none' }, false],
    [undefined, false],
    [{ light: 'glare', obscurant: 'none' }, true],
    [{ light: 'normal', obscurant: 'lightFog' }, true],
  ])('returns the expected flag for %o', (conditions, expected) => {
    expect(hasActiveVisibility(conditions)).toBe(expected);
  });
});

describe('visionFromNames', () => {
  it('derives vision modes from metatype powers', () => {
    expect(
      visionFromNames(['Low-Light Vision', 'Thermographic Vision', 'Toxin'])
    ).toEqual({ lowLight: true, thermographic: true });
  });

  it('returns no modes for missing powers', () => {
    expect(visionFromNames(undefined)).toEqual({});
  });

  it('recognises cyberware option names', () => {
    expect(
      visionFromNames([
        'Flare Compensation',
        'Ultrasound Sensor',
        'Low-Light (2050)',
        'Image Link',
      ])
    ).toEqual({ flareCompensation: true, ultrasound: true, lowLight: true });
  });

  it('treats cat eyes bioware as low-light vision', () => {
    expect(visionFromNames(["Cat's Eyes"])).toEqual({ lowLight: true });
    expect(visionFromNames(['Katzenaugen'])).toEqual({ lowLight: true });
  });

  it('accepts both German spellings of thermographic vision', () => {
    expect(visionFromNames(['Thermografie'])).toEqual({ thermographic: true });
    expect(visionFromNames(['Thermographische Sicht'])).toEqual({
      thermographic: true,
    });
  });

  it('recognises German Chummer names', () => {
    expect(
      visionFromNames([
        'Restlichtverstärkung',
        'Infrarotsicht',
        'Ultraschallsensor',
        'Blitzkompensation',
      ])
    ).toEqual({
      lowLight: true,
      thermographic: true,
      ultrasound: true,
      flareCompensation: true,
    });
  });
});

describe('visionFromMetatype', () => {
  it('reads the powers of the embedded metatype item', () => {
    expect(
      visionFromMetatype([
        { type: 'Skill', system: {} },
        { type: 'Metatype', system: { powers: ['Low-Light Vision'] } },
      ])
    ).toEqual({ lowLight: true });
  });

  it('reads vision qualities of the metatype item', () => {
    expect(
      visionFromMetatype([
        {
          type: 'Metatype',
          system: {
            powers: [],
            qualities: { positive: ['Thermographic Vision'], negative: [] },
          },
        },
      ])
    ).toEqual({ thermographic: true });
  });

  it('returns no modes without a metatype item', () => {
    expect(visionFromMetatype([{ type: 'Skill', system: {} }])).toEqual({});
  });
});

describe('isVisibilityApplicable', () => {
  it('applies in the physical realm', () => {
    expect(isVisibilityApplicable({ system: { realm: 'physical' } })).toBe(
      true
    );
  });

  it('does not apply while astrally perceiving from the physical world', () => {
    expect(
      isVisibilityApplicable({
        system: { realm: 'physical' },
        statuses: new Set([ASTRAL_PERCEPTION_STATUS]),
      })
    ).toBe(false);
  });

  it('does not apply to astral projection', () => {
    expect(isVisibilityApplicable({ system: { realm: 'astral' } })).toBe(false);
  });
});
