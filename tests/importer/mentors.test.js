import { describe, it, expect } from 'vitest';
import {
  parseMentorBonusEntries,
  bonusEntriesToChanges,
  mapMentor,
  isParagonRecord,
} from '@importer/mappers/mentors.js';

/**
 * Builds a minimal DOM-like node usable by parseMentorBonusEntries, which
 * only reads `tagName`, `children`, `textContent` and `attributes` — mirrors
 * the helper in tests/importer/parse-xml.test.js.
 *
 * @param {string} tagName
 * @param {string | Array} value - leaf text, or child nodes
 * @param {Record<string, string>} [attrs] - XML attributes
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

describe('parseMentorBonusEntries', () => {
  it('returns an empty array for a missing bonus element', () => {
    expect(parseMentorBonusEntries(null)).toEqual([]);
  });

  it('parses a specificskill entry with nested name/bonus', () => {
    const bonus = node('bonus', [
      node('specificskill', [node('name', 'Spellcasting'), node('bonus', '2')]),
    ]);
    expect(parseMentorBonusEntries(bonus)).toEqual([
      { kind: 'specificskill', name: 'Spellcasting', bonus: 2 },
    ]);
  });

  it('parses a spellcategory entry with nested name/val', () => {
    const bonus = node('bonus', [
      node('spellcategory', [node('name', 'Combat'), node('val', '2')]),
    ]);
    expect(parseMentorBonusEntries(bonus)).toEqual([
      { kind: 'spellcategory', name: 'Combat', val: 2 },
    ]);
  });

  it('parses a damageresistance leaf value, including negative bonuses', () => {
    const bonus = node('bonus', [node('damageresistance', '-1')]);
    expect(parseMentorBonusEntries(bonus)).toEqual([
      { kind: 'damageresistance', value: -1 },
    ]);
  });

  it('parses selectskill via its skillcategory attribute', () => {
    const bonus = node('bonus', [
      node('selectskill', [], { skillcategory: 'Social Active' }),
    ]);
    expect(parseMentorBonusEntries(bonus)).toEqual([
      { kind: 'selectskill', skillcategory: 'Social Active' },
    ]);
  });

  it('parses an empty selecttext', () => {
    const bonus = node('bonus', [node('selecttext', '')]);
    expect(parseMentorBonusEntries(bonus)).toEqual([{ kind: 'selecttext' }]);
  });

  it('captures unrecognised tags as unknown entries instead of dropping them', () => {
    const bonus = node('bonus', [node('somethingnew', 'weird', { x: '1' })]);
    expect(parseMentorBonusEntries(bonus)).toEqual([
      {
        kind: 'unknown',
        tag: 'somethingnew',
        text: 'weird',
        attrs: { x: '1' },
      },
    ]);
  });

  it('does not lose repeated same-tag bonus children to the elementToRecord array-flattening trap', () => {
    const bonus = node('bonus', [
      node('specificskill', [node('name', 'Spellcasting'), node('bonus', '2')]),
      node('specificskill', [
        node('name', 'Counterspelling'),
        node('bonus', '1'),
      ]),
    ]);
    expect(parseMentorBonusEntries(bonus)).toEqual([
      { kind: 'specificskill', name: 'Spellcasting', bonus: 2 },
      { kind: 'specificskill', name: 'Counterspelling', bonus: 1 },
    ]);
  });
});

describe('bonusEntriesToChanges', () => {
  it('maps a known specificskill to a skillBonuses change', () => {
    const { changes, textOnly } = bonusEntriesToChanges([
      { kind: 'specificskill', name: 'Spellcasting', bonus: 2 },
    ]);
    expect(changes).toEqual([
      {
        key: 'system.modifiers.skillBonuses.spellcasting',
        type: 'add',
        value: '2',
      },
    ]);
    expect(textOnly).toBe(false);
  });

  it('falls back to text-only for an unrecognised skill name', () => {
    const { changes, textOnly } = bonusEntriesToChanges([
      { kind: 'specificskill', name: 'Nonexistent Skill', bonus: 2 },
    ]);
    expect(changes).toEqual([]);
    expect(textOnly).toBe(true);
  });

  it('maps a spellcategory to an uppercase spellCategoryBonuses change', () => {
    const { changes } = bonusEntriesToChanges([
      { kind: 'spellcategory', name: 'Combat', val: 2 },
    ]);
    expect(changes).toEqual([
      {
        key: 'system.modifiers.spellCategoryBonuses.COMBAT',
        type: 'add',
        value: '2',
      },
    ]);
  });

  it('maps damageresistance to soakBonus', () => {
    const { changes } = bonusEntriesToChanges([
      { kind: 'damageresistance', value: -1 },
    ]);
    expect(changes).toEqual([
      { key: 'system.modifiers.soakBonus', type: 'add', value: '-1' },
    ]);
  });

  it('treats selectskill and selecttext as text-only with no changes', () => {
    const { changes, textOnly } = bonusEntriesToChanges([
      { kind: 'selectskill', skillcategory: 'Social Active' },
      { kind: 'selecttext' },
    ]);
    expect(changes).toEqual([]);
    expect(textOnly).toBe(true);
  });
});

describe('isParagonRecord', () => {
  it.each([
    ['Resonance', true],
    ['Disonance', true],
    ['Animal', false],
    ['Other', false],
    ['Toxic', false],
    ['Dissonance', true],
  ])('category "%s" -> isParagon %s', (category, expected) => {
    expect(isParagonRecord({ category })).toBe(expected);
  });
});

describe('mentor category normalization', () => {
  it.each([
    ['animal', 'Animal'],
    ['Dissonance', 'Disonance'],
    ['Schatten', 'Other'],
    ['', 'Other'],
    [undefined, 'Other'],
  ])('category "%s" -> "%s"', (raw, expected) => {
    const result = mapMentor({ name: 'X', category: raw });
    expect(result.system.category).toBe(expected);
  });
});

describe('mapMentor', () => {
  it('maps base fields and creates an enabled transfer effect from the base bonus', () => {
    const record = {
      name: 'Sun',
      category: 'Other',
      advantage: '+2 dice for Combat spells cast to harm',
      disadvantage: '-2 dice to resist Drain from Combat spells that harm',
      source: 'SM',
      page: '60',
      _bonus: [{ kind: 'spellcategory', name: 'Combat', val: 2 }],
      _choices: [],
    };
    const result = mapMentor(record);

    expect(result.name).toBe('Sun');
    expect(result.type).toBe('Mentor');
    expect(result.system).toMatchObject({
      category: 'Other',
      advantage: '+2 dice for Combat spells cast to harm',
      disadvantage: '-2 dice to resist Drain from Combat spells that harm',
      choices: [],
      selectedChoices: {},
      source: 'SM p. 60',
    });
    expect(result.effects).toEqual([
      {
        name: 'Sun',
        img: 'icons/svg/aura.svg',
        changes: [
          {
            key: 'system.modifiers.spellCategoryBonuses.COMBAT',
            type: 'add',
            value: '2',
          },
        ],
        disabled: false,
        transfer: true,
      },
    ]);
  });

  it('creates a disabled, flagged effect per choice with a mechanical bonus, at their own set', () => {
    const record = {
      name: 'Dragonslayer',
      category: 'Other',
      _bonus: [],
      _choices: [
        {
          set: '1',
          name: 'Great dragons',
          bonus: [{ kind: 'specificskill', name: 'Spellcasting', bonus: 2 }],
        },
        {
          set: '2',
          name: 'Great dragons (opposed)',
          bonus: [{ kind: 'selectskill', skillcategory: 'Social Active' }],
        },
      ],
    };
    const result = mapMentor(record);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]).toMatchObject({
      name: 'Great dragons',
      disabled: true,
      transfer: true,
      flags: { sr4: { mentorChoice: { set: '1', name: 'Great dragons' } } },
    });
    expect(result.system.choices).toEqual([
      { set: 1, name: 'Great dragons', description: '', hasBonus: true },
      {
        set: 2,
        name: 'Great dragons (opposed)',
        description: '',
        hasBonus: false,
      },
    ]);
  });

  it('records a selecttext-only choice without creating an effect', () => {
    const record = {
      name: 'Fire',
      category: 'Other',
      _bonus: [],
      _choices: [
        {
          set: '1',
          name: '+2 for Fire spirits',
          bonus: [{ kind: 'selecttext' }],
        },
      ],
    };
    const result = mapMentor(record);

    expect(result.effects).toEqual([]);
    expect(result.system.choices).toEqual([
      { set: 1, name: '+2 for Fire spirits', description: '', hasBonus: false },
    ]);
  });

  it('detects a Paragon by category', () => {
    const result = mapMentor({
      name: 'Shooter',
      category: 'Resonance',
      _bonus: [],
      _choices: [],
    });
    expect(result.system.category).toBe('Resonance');
    expect(isParagonRecord({ category: result.system.category })).toBe(true);
  });
});
