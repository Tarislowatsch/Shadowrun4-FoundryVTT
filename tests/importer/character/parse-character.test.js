import { describe, it, expect, afterEach } from 'vitest';
import { extractCharacter } from '@importer/character/parse-character.js';

/**
 * @param {object} root
 * @param {string} selector
 * @returns {object[]}
 */
function queryAll(root, selector) {
  if (selector.startsWith(':scope')) {
    const chain = selector
      .replace(/^:scope\s*>\s*/, '')
      .split('>')
      .map((s) => s.trim());
    let level = root.children;
    for (let i = 0; i < chain.length; i++) {
      const matched = level.filter((n) => n.tagName === chain[i]);
      if (i === chain.length - 1) return matched;
      level = matched.flatMap((n) => n.children);
    }
    return [];
  }
  const out = [];
  const walk = (n) => {
    for (const c of n.children) {
      if (c.tagName === selector) out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
}

/**
 * @param {string} tagName
 * @param {{ text?: string, attrs?: Record<string, string>, children?: object[] }} [opts]
 * @returns {object}
 */
function el(tagName, { text = '', attrs = {}, children = [] } = {}) {
  const node = {
    tagName,
    textContent: text,
    attributes: Object.entries(attrs).map(([name, value]) => ({ name, value })),
    children,
    parent: null,
    getAttribute(name) {
      return this.attributes.find((a) => a.name === name)?.value ?? null;
    },
    remove() {
      const siblings = this.parent?.children;
      if (siblings) siblings.splice(siblings.indexOf(this), 1);
    },
    querySelectorAll(selector) {
      return queryAll(this, selector);
    },
    querySelector(selector) {
      return queryAll(this, selector)[0] ?? null;
    },
  };
  for (const child of children) child.parent = node;
  return node;
}

/**
 * @param {object} characterEl
 * @returns {import('@importer/character/parse-character.js').ParsedCharacter}
 */
function parse(characterEl) {
  const doc = el('#document', { children: [characterEl] });
  globalThis.DOMParser = class {
    parseFromString() {
      return doc;
    }
  };
  return extractCharacter('<unused/>');
}

/**
 * @returns {object}
 */
function sampleCharacter() {
  return el('character', {
    children: [
      el('alias', { text: 'Razor' }),
      el('name', { text: 'John Doe' }),
      el('nuyen', { text: '5000' }),
      el('metatype', { text: 'Human' }),
      el('attributes', {
        children: [
          el('attribute', {
            children: [
              el('name', { text: 'BOD' }),
              el('base', { text: '3' }),
              el('total', { text: '4' }),
              el('min', { text: '1' }),
              el('max', { text: '6' }),
              el('aug', { text: '9' }),
            ],
          }),
          el('attribute', {
            children: [el('name', { text: 'AGI' }), el('total', { text: '5' })],
          }),
        ],
      }),
      el('weapons', {
        children: [
          el('weapon', { children: [el('name', { text: 'Unarmed' })] }),
          el('weapon', {
            children: [
              el('name', { text: 'Ares Predator' }),
              el('clips', {
                children: [
                  el('clip', {
                    children: [
                      el('id', { text: 'ammo-guid-1' }),
                      el('count', { text: '15' }),
                    ],
                  }),
                ],
              }),
              el('mods', {
                children: [
                  el('weaponmod', {
                    children: [el('name', { text: 'Smartgun' })],
                  }),
                ],
              }),
              el('accessories', {
                children: [
                  el('accessory', {
                    children: [el('name', { text: 'Silencer' })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      el('gears', {
        children: [
          el('gear', {
            children: [
              el('name', { text: 'Commlink' }),
              el('children', {
                children: [
                  el('gear', {
                    children: [el('name', { text: 'Sim Module' })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      el('mentorspirits', {
        children: [
          el('mentorspirit', {
            children: [
              el('name', { text: 'Bear' }),
              el('bonus', {
                children: [el('damageresistance', { text: '2' })],
              }),
            ],
          }),
        ],
      }),
      el('skills', {
        children: [
          el('skill', {
            children: [
              el('name', { text: 'Pistols' }),
              el('rating', { text: '4' }),
            ],
          }),
        ],
      }),
      el('contacts', {
        children: [
          el('contact', {
            children: [
              el('name', { text: 'Fixer' }),
              el('connection', { text: '3' }),
            ],
          }),
        ],
      }),
      el('spirits', {
        children: [
          el('spirit', {
            children: [
              el('name', { text: 'City Spirit' }),
              el('type', { text: 'spirit' }),
            ],
          }),
        ],
      }),
      el('vehicles', {
        children: [
          el('vehicle', {
            children: [
              el('name', { text: 'Bike' }),
              el('mods', {
                children: [
                  el('mod', { children: [el('name', { text: 'Nitro' })] }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

describe('extractCharacter', () => {
  afterEach(() => {
    delete globalThis.DOMParser;
  });

  it('throws when there is no <character> element', () => {
    const doc = el('#document', { children: [] });
    globalThis.DOMParser = class {
      parseFromString() {
        return doc;
      }
    };
    expect(() => extractCharacter('<unused/>')).toThrow(/No <character>/);
  });

  it('reads leaf fields off the character element', () => {
    const { character } = parse(sampleCharacter());
    expect(character.alias).toBe('Razor');
    expect(character.name).toBe('John Doe');
    expect(character.nuyen).toBe('5000');
    expect(character.metatype).toBe('Human');
  });

  it('parses attributes (base preferred, total fallback) and limits', () => {
    const { character } = parse(sampleCharacter());
    expect(character.attributes).toEqual({ BOD: '3', AGI: '5' });
    expect(character.attributeLimits).toEqual({
      BOD: { min: '1', max: '6', aug: '9' },
    });
  });

  it('flattens nested <children> gear into items.gear', () => {
    const { items } = parse(sampleCharacter());
    const names = items.gear.map((g) => g.name);
    expect(names).toEqual(['Commlink', 'Sim Module']);
  });

  it('attaches clips and mods to the correct weapon record', () => {
    const { items } = parse(sampleCharacter());
    expect(items.weapon).toHaveLength(2);

    expect(items.weapon[0].name).toBe('Unarmed');
    expect(items.weapon[0]._clips).toBeUndefined();
    expect(items.weapon[0]._weaponMods).toBeUndefined();

    expect(items.weapon[1].name).toBe('Ares Predator');
    expect(items.weapon[1]._clips).toEqual([
      { gearGuid: 'ammo-guid-1', count: 15 },
    ]);
    expect(items.weapon[1]._weaponMods.map((m) => m.name)).toEqual([
      'Smartgun',
      'Silencer',
    ]);
  });

  it('detaches mentor bonus into _bonus/_choices', () => {
    const { items } = parse(sampleCharacter());
    expect(items.mentorspirit).toHaveLength(1);
    expect(items.mentorspirit[0].name).toBe('Bear');
    expect(items.mentorspirit[0]._bonus).toEqual([
      { kind: 'damageresistance', value: 2 },
    ]);
    expect(items.mentorspirit[0]._choices).toEqual([]);
  });

  it('parses skills, contacts, spirits and vehicle mods', () => {
    const { character, skills, spirits, vehicles } = parse(sampleCharacter());
    expect(skills.map((s) => s.name)).toEqual(['Pistols']);
    expect(character.contacts.map((c) => c.name)).toEqual(['Fixer']);
    expect(spirits.map((s) => s.name)).toEqual(['City Spirit']);
    expect(vehicles).toHaveLength(1);
    expect(vehicles[0]._mods.map((m) => m.name)).toEqual(['Nitro']);
  });
});
