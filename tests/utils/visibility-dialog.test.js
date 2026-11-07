import { describe, it, expect, vi } from 'vitest';
import {
  buildSenseContext,
  buildVisibilityContext,
  getVisibilityMalus,
  wireVisibilityControls,
} from '@utils/dialog/visibility.js';
import { previewDialogPool } from '@utils/dialog/pool-math.js';

/**
 * @param {object} flags
 * @returns {{ getFlag: () => object }}
 */
function makeScene(flags) {
  return { getFlag: () => flags };
}

/**
 * @param {object} [props]
 * @returns {any}
 */
function makeElement(props = {}) {
  const listeners = {};
  return {
    value: '',
    disabled: false,
    hidden: false,
    dataset: {},
    ...props,
    addEventListener: (type, fn) => {
      (listeners[type] ??= []).push(fn);
    },
    fire: (type) => (listeners[type] ?? []).forEach((fn) => fn()),
  };
}

/**
 * @param {Record<string, any>} elements
 * @returns {any}
 */
function makeHtml(elements) {
  return { querySelector: (selector) => elements[selector] ?? null };
}

describe('buildVisibilityContext', () => {
  const darkScene = makeScene({ light: 'fullDarkness', obscurant: 'none' });

  it('stays available but inactive in a normally lit scene', () => {
    const context = buildVisibilityContext(
      { system: {} },
      { scene: makeScene({}) }
    );
    expect(context).toMatchObject({ active: false, malus: 0 });
  });

  it('returns null for astral actors', () => {
    expect(
      buildVisibilityContext(
        { system: { realm: 'astral' } },
        { scene: darkScene }
      )
    ).toBeNull();
  });

  it('presets the best vision mode and a positive malus', () => {
    const actor = { system: { vision: { thermographic: true } } };
    const context = buildVisibilityContext(actor, { scene: darkScene });
    expect(context).toMatchObject({
      light: 'fullDarkness',
      obscurant: 'none',
      mode: 'thermographic',
      malus: 3,
      flareCompensation: false,
    });
    expect(context.modeOptions.find((o) => o.selected).value).toBe(
      'thermographic'
    );
  });

  it('offers only the vision modes the actor has', () => {
    const actor = { system: { vision: { lowLight: true } } };
    const context = buildVisibilityContext(actor, { scene: darkScene });
    expect(context.modeOptions.map((o) => o.value)).toEqual([
      'normal',
      'lowLight',
    ]);
  });

  it('skips ultrasound when the test needs visual sight', () => {
    const actor = { system: { vision: { ultrasound: true } } };
    const context = buildVisibilityContext(actor, {
      scene: darkScene,
      visualOnly: true,
    });
    expect(context.mode).toBe('normal');
    expect(context.modeOptions.map((o) => o.value)).toEqual(['normal']);
  });

  it('applies flare compensation to glare', () => {
    const actor = { system: { vision: { flareCompensation: true } } };
    const context = buildVisibilityContext(actor, {
      scene: makeScene({ light: 'glare' }),
    });
    expect(context.malus).toBe(0);
  });
});

describe('buildSenseContext', () => {
  it('lists all senses with their bonuses and preselects sight', () => {
    const actor = {
      system: { modifiers: { senseBonuses: { sight: 1, hearing: 3 } } },
    };
    const context = buildSenseContext(actor);
    expect(context.bonus).toBe(1);
    expect(context.options.map((o) => [o.value, o.bonus])).toEqual([
      ['sight', 1],
      ['hearing', 3],
      ['smell', 0],
      ['touch', 0],
    ]);
  });
});

describe('getVisibilityMalus', () => {
  it('reads the malus field', () => {
    const html = makeHtml({ '#visibilityMalus': makeElement({ value: '4' }) });
    expect(getVisibilityMalus(html)).toBe(4);
  });

  it('ignores a disabled malus field', () => {
    const html = makeHtml({
      '#visibilityMalus': makeElement({ value: '4', disabled: true }),
    });
    expect(getVisibilityMalus(html)).toBe(0);
  });

  it('never turns a negative entry into a bonus', () => {
    const html = makeHtml({ '#visibilityMalus': makeElement({ value: '-3' }) });
    expect(getVisibilityMalus(html)).toBe(0);
  });

  it('returns zero without a visibility section', () => {
    expect(getVisibilityMalus(makeHtml({}))).toBe(0);
  });
});

describe('previewDialogPool', () => {
  it('uses the same modifiers as the actual roll', () => {
    const html = makeHtml({
      '#bonus': makeElement({ value: '1' }),
      '#recoilMalus': makeElement({ value: '2' }),
      '#hotSim': makeElement({ checked: true }),
      '#edge': makeElement({ checked: true }),
      '#visibilityMalus': makeElement({ value: '2' }),
      '#senseBonus': makeElement({ value: '3' }),
    });
    expect(previewDialogPool(html, 6, 4)).toBe(12);
  });

  it('never shows less than one die', () => {
    const html = makeHtml({ '#malus': makeElement({ value: '9' }) });
    expect(previewDialogPool(html, 3, 0)).toBe(1);
  });
});

describe('wireVisibilityControls', () => {
  /**
   * @param {{ sense?: string }} [options]
   * @returns {Record<string, any>}
   */
  function makeDialog({ sense } = {}) {
    const elements = {
      '.sr4-visibility': makeElement({
        dataset: { flareCompensation: 'false' },
      }),
      '#visibilityMalus': makeElement({ value: '6' }),
      '#visibilityLight': makeElement({ value: 'fullDarkness' }),
      '#visibilityObscurant': makeElement({ value: 'none' }),
      '#visionMode': makeElement({
        value: 'normal',
        options: [{ value: 'normal' }, { value: 'thermographic' }],
      }),
    };
    if (sense) {
      elements['#senseBonus'] = makeElement({ value: '0' });
      const senseSelect = makeElement({ value: sense });
      Object.defineProperty(senseSelect, 'selectedOptions', {
        get: () => [
          { dataset: { bonus: senseSelect.value === 'hearing' ? '2' : '0' } },
        ],
      });
      elements['#sense'] = senseSelect;
    }
    return elements;
  }

  it('recalculates the malus when the vision mode changes', () => {
    const elements = makeDialog();
    const onChange = vi.fn();
    wireVisibilityControls(makeHtml(elements), onChange);

    elements['#visionMode'].value = 'thermographic';
    elements['#visionMode'].fire('change');

    expect(elements['#visibilityMalus'].value).toBe('3');
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('reselects the best vision mode when the conditions change', () => {
    const elements = makeDialog();
    wireVisibilityControls(makeHtml(elements));

    elements['#visibilityLight'].value = 'partialLight';
    elements['#visibilityLight'].fire('change');
    expect(elements['#visionMode'].value).toBe('normal');

    elements['#visibilityObscurant'].value = 'lightFog';
    elements['#visibilityLight'].value = 'normal';
    elements['#visibilityObscurant'].fire('change');

    expect(elements['#visionMode'].value).toBe('thermographic');
    expect(elements['#visibilityMalus'].value).toBe('0');
  });

  it('disables the visibility malus for non-visual senses', () => {
    const elements = makeDialog({ sense: 'sight' });
    wireVisibilityControls(makeHtml(elements));

    elements['#sense'].value = 'hearing';
    elements['#sense'].fire('change');

    expect(elements['#senseBonus'].value).toBe('2');
    expect(elements['.sr4-visibility'].hidden).toBe(true);
    expect(elements['#visibilityMalus'].disabled).toBe(true);
  });

  it('does nothing without visibility or sense controls', () => {
    expect(() => wireVisibilityControls(makeHtml({}))).not.toThrow();
  });
});
