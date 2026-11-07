import { describe, it, expect } from 'vitest';
import {
  parseSpellForceChoice,
  syncAreaFields,
} from '../src/domains/magic/dialogs/spellcasting.js';

const options = { max: 10, area: true, pool: 12, template: false };

describe('parseSpellForceChoice', () => {
  it('clamps the force between 1 and the maximum', () => {
    expect(parseSpellForceChoice('0', '', options).force).toBe(1);
    expect(parseSpellForceChoice('15', '', options).force).toBe(10);
    expect(parseSpellForceChoice('abc', '', options).force).toBe(1);
    expect(parseSpellForceChoice('-3', '', options).force).toBe(1);
  });

  it('reads the radius adjustment for area spells', () => {
    expect(parseSpellForceChoice('5', '3', options)).toEqual({
      force: 5,
      radiusAdjust: 3,
      placeTemplate: false,
    });
  });

  it('clamps the radius adjustment against the clamped force', () => {
    expect(parseSpellForceChoice('15', '-12', options).radiusAdjust).toBe(-9);
  });

  it('ignores a radius adjustment for non-area spells', () => {
    expect(
      parseSpellForceChoice('5', '3', { ...options, area: false })
    ).toEqual({ force: 5, radiusAdjust: 0, placeTemplate: false });
  });

  it('treats an empty radius field as no adjustment', () => {
    expect(parseSpellForceChoice('5', '', options).radiusAdjust).toBe(0);
  });

  it('places a template when it is offered and checked', () => {
    const offered = { ...options, template: true };
    expect(parseSpellForceChoice('5', '', offered, true).placeTemplate).toBe(
      true
    );
  });

  it('skips the template when the box is unchecked', () => {
    const offered = { ...options, template: true };
    expect(parseSpellForceChoice('5', '', offered, false).placeTemplate).toBe(
      false
    );
  });

  it('skips an offered template when no checkbox value is passed', () => {
    const offered = { ...options, template: true };
    expect(parseSpellForceChoice('5', '', offered).placeTemplate).toBe(false);
  });

  it('never places a template that is not offered', () => {
    expect(parseSpellForceChoice('5', '', options, true).placeTemplate).toBe(
      false
    );
  });
});

function makeRoot(force, adjust) {
  const fields = {
    '#force': { value: force },
    '#radiusAdjust': { value: adjust },
    '[data-area-radius]': { textContent: '' },
    '[data-area-withheld]': { textContent: '' },
  };
  return { fields, querySelector: (selector) => fields[selector] ?? null };
}

describe('syncAreaFields', () => {
  it('shows the clamped radius and withheld dice', () => {
    const root = makeRoot('5', '-20');

    syncAreaFields(root, options, { writeBack: false });

    expect(root.fields['[data-area-radius]'].textContent).toBe('1');
    expect(root.fields['[data-area-withheld]'].textContent).toBe('4');
  });

  it('keeps the typed value while the user is still typing', () => {
    const root = makeRoot('5', '-');

    syncAreaFields(root, options, { writeBack: false });

    expect(root.fields['#radiusAdjust'].value).toBe('-');
  });

  it('writes the clamped adjustment back into the input', () => {
    const root = makeRoot('5', '-20');

    syncAreaFields(root, options, { writeBack: true });

    expect(root.fields['#radiusAdjust'].value).toBe('-4');
  });
});
