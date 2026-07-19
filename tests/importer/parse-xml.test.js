import { describe, it, expect } from 'vitest';
import { elementToRecord } from '@importer/parse-xml.js';

/**
 * Builds a minimal DOM-like node usable by elementToRecord, which only reads
 * `tagName`, `children`, `textContent` and `attributes`.
 *
 * @param {string} tagName
 * @param {string | Array} value - leaf text, or child nodes
 * @param {Record<string, string>} [attrs] - XML attributes
 * @returns {{ tagName: string, children: any[], textContent: string, attributes: Array<{ name: string, value: string }> }}
 */
function node(tagName, value, attrs = {}) {
  const attributes = Object.entries(attrs).map(([name, val]) => ({
    name,
    value: val,
  }));
  if (Array.isArray(value)) {
    return { tagName, children: value, textContent: '', attributes };
  }
  return { tagName, children: [], textContent: value, attributes };
}

describe('elementToRecord', () => {
  it('reads leaf children as strings', () => {
    const el = node('weapon', [
      node('name', 'Ares Predator'),
      node('ap', '-1'),
    ]);
    expect(elementToRecord(el)).toEqual({ name: 'Ares Predator', ap: '-1' });
  });

  it('reads repeated same-tag children as an array', () => {
    const el = node('skill', [
      node('specs', [node('spec', 'Pistols'), node('spec', 'Rifles')]),
    ]);
    expect(elementToRecord(el)).toEqual({ specs: ['Pistols', 'Rifles'] });
  });

  it('reads a single-child block as a nested object, not an array', () => {
    const el = node('gear', [
      node('name', 'Ammo: APDS'),
      node('weaponbonus', [node('ap', '-4')]),
    ]);
    expect(elementToRecord(el)).toEqual({
      name: 'Ammo: APDS',
      weaponbonus: { ap: '-4' },
    });
  });

  it('reads a multi-child block with distinct tags as a nested object', () => {
    const el = node('gear', [
      node('weaponbonus', [
        node('ap', '2'),
        node('damage', '-1'),
        node('damagetype', 'S'),
      ]),
    ]);
    expect(elementToRecord(el)).toEqual({
      weaponbonus: { ap: '2', damage: '-1', damagetype: 'S' },
    });
  });

  it('keeps XML attributes on leaf children as #text objects', () => {
    const el = node('critter', [
      node('skills', [
        node('skill', 'Assensing', { rating: 'F' }),
        node('skill', 'Unarmed Combat', { rating: 'F', spec: 'Grapple' }),
      ]),
    ]);
    expect(elementToRecord(el)).toEqual({
      skills: [
        { '#text': 'Assensing', rating: 'F' },
        { '#text': 'Unarmed Combat', rating: 'F', spec: 'Grapple' },
      ],
    });
  });

  it('accumulates repeated tags among mixed siblings into arrays', () => {
    const el = node('critter', [
      node('skills', [
        node('skill', 'Assensing'),
        node('skill', 'Dodge'),
        node('group', 'Influence'),
      ]),
    ]);
    expect(elementToRecord(el)).toEqual({
      skills: { skill: ['Assensing', 'Dodge'], group: 'Influence' },
    });
  });
});
