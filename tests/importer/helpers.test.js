import { describe, it, expect } from 'vitest';
import {
  parseDamage,
  parseAmmo,
  parseNumber,
  parseDecimal,
  formatSource,
  sourceOf,
  commerceFields,
  upper,
  normalizeSkillName,
  normalizeItemLabel,
  canonicalItemName,
} from '@importer/mappers/helpers.js';

describe('parseNumber', () => {
  it.each([
    ['-1', 0, -1],
    ['+2', 0, 2],
    ['4R', 0, 4],
    ['-', 0, 0],
    ['-half', 0, 0],
    ['Variable(20-100000)', 0, 20],
    [undefined, 3, 3],
  ])('parseNumber(%j, %i) -> %i', (input, fallback, expected) => {
    expect(parseNumber(input, fallback)).toBe(expected);
  });
});

describe('parseDecimal', () => {
  it.each([
    ['0.3', 0, 0.3],
    ['Rating * 0.01', 0, 0.01],
    ['.25', 0, 0.25],
    ['0', 0, 0],
    ['-', 1, 1],
  ])('parseDecimal(%j, %i) -> %f', (input, fallback, expected) => {
    expect(parseDecimal(input, fallback)).toBe(expected);
  });
});

describe('parseAmmo', () => {
  it.each([
    ['30(c)', { capacity: 30, feed: 'c' }],
    ['1(m)', { capacity: 1, feed: 'm' }],
    ['6(cy)', { capacity: 6, feed: 'cy' }],
    ['10(c) or external source', { capacity: 10, feed: 'c' }],
    ['2x50(d)', { capacity: 100, feed: 'd' }],
    ['2x50(d) or 2x100(d)', { capacity: 100, feed: 'd' }],
    ['4x10(ml)', { capacity: 40, feed: 'ml' }],
    ['2x12(c)', { capacity: 24, feed: 'c' }],
    ['0', { capacity: 0, feed: '' }],
  ])('parseAmmo(%j) splits capacity and feed', (input, expected) => {
    expect(parseAmmo(input)).toEqual(expected);
  });
});

describe('parseDamage', () => {
  it.each([
    ['6P', { damage: 6, damageType: 'PHYSICAL', strengthBased: false }],
    ['5S', { damage: 5, damageType: 'STUN', strengthBased: false }],
    ['5S(e)', { damage: 5, damageType: 'ELECTRICITY', strengthBased: false }],
    ['(STR/2+1)P', { damage: 1, damageType: 'PHYSICAL', strengthBased: true }],
    ['(STR/2)P', { damage: 0, damageType: 'PHYSICAL', strengthBased: true }],
  ])('parseDamage(%j) reads value, type and scaling', (input, expected) => {
    expect(parseDamage(input)).toEqual(expected);
  });
});

describe('formatSource', () => {
  it.each([
    ['SR4', '315', 'SR4 p. 315'],
    ['ARG', '0', 'ARG'],
    ['SR4', '', 'SR4'],
  ])('formatSource(%j, %j) -> %j', (source, page, expected) => {
    expect(formatSource(source, page)).toBe(expected);
  });
});

describe('sourceOf', () => {
  it('reads the citation from a record', () => {
    expect(sourceOf({ source: 'SR4', page: '90' })).toBe('SR4 p. 90');
  });

  it('drops the page when it is the "0" placeholder', () => {
    expect(sourceOf({ source: 'ARG', page: '0' })).toBe('ARG');
  });

  it('returns an empty string when no source is present', () => {
    expect(sourceOf({})).toBe('');
  });
});

describe('commerceFields', () => {
  it('extracts cost, avail and the raw availability string', () => {
    expect(commerceFields({ cost: '600', avail: '4R' })).toEqual({
      cost: 600,
      avail: 4,
      availability: '4R',
    });
  });

  it('falls back to zero and empty string when fields are missing', () => {
    expect(commerceFields({})).toEqual({
      cost: 0,
      avail: 0,
      availability: '',
    });
  });
});

describe('normalizeSkillName', () => {
  it.each([
    ['Automatics', 'automatics'],
    ['Pilot-Ground-Craft', 'pilot ground craft'],
    ['  Blades  ', 'blades'],
    [undefined, ''],
  ])('normalizeSkillName(%j) -> %j', (input, expected) => {
    expect(normalizeSkillName(input)).toBe(expected);
  });

  it('normalizes precomposed and decomposed Unicode umlauts to the same key', () => {
    const precomposed = 'Knüppel';
    const decomposed = 'Knüppel';
    expect(normalizeSkillName(precomposed)).toBe(
      normalizeSkillName(decomposed)
    );
  });
});

describe('normalizeItemLabel', () => {
  it.each([
    ['Ares Predator IV', 'ares_predator_iv'],
    ['Clothing', 'clothing'],
    ['  Full-Body Armor  ', 'full_body_armor'],
    ["Y'know, a Katana", 'y_know_a_katana'],
    [undefined, ''],
    ['', ''],
  ])('normalizeItemLabel(%j) -> %j', (input, expected) => {
    expect(normalizeItemLabel(input)).toBe(expected);
  });

  it('normalizes precomposed and decomposed Unicode umlauts to the same slug', () => {
    expect(normalizeItemLabel('Knüppel')).toBe(normalizeItemLabel('Knüppel'));
  });

  it('trims stray underscores produced by leading/trailing punctuation', () => {
    expect(normalizeItemLabel('(Special) Item!')).toBe('special_item');
  });
});

describe('canonicalItemName', () => {
  it('prefers system.nameEn when present', () => {
    expect(
      canonicalItemName({ name: 'Kleidung', system: { nameEn: 'Clothing' } })
    ).toBe('Clothing');
  });

  it('falls back to name when nameEn is absent or blank', () => {
    expect(canonicalItemName({ name: 'Clothing', system: {} })).toBe(
      'Clothing'
    );
    expect(
      canonicalItemName({ name: 'Clothing', system: { nameEn: '' } })
    ).toBe('Clothing');
  });

  it('falls back to name when system is absent', () => {
    expect(canonicalItemName({ name: 'Clothing' })).toBe('Clothing');
  });
});

describe('upper', () => {
  it.each([
    ['yes', 'YES'],
    ['  Combat  ', 'COMBAT'],
    [undefined, ''],
    [null, ''],
  ])('upper(%j) -> %j', (input, expected) => {
    expect(upper(input)).toBe(expected);
  });
});
