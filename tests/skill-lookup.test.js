import { describe, it, expect } from 'vitest';
import { findSkillIn, skillLabelFor } from '@models/actions/skill-lookup.js';
import {
  buildSkillOptions,
  ratingBySkill,
  skillDisplayLabel,
} from '@utils/dialog/skill-options.js';

function skill(name, label, rating) {
  return { type: 'Skill', name, system: { label, rating } };
}

/** Imported German character: the importer localizes the name, the label stays English. */
const imported = {
  items: [
    skill('Ausweichen', 'sr4.skills.dodge', 3),
    skill('Waffenloser Kampf', 'sr4.skills.unarmedcombat', 4),
    skill('Zauberabwehr', 'sr4.skills.counterspelling', 2),
    skill('Hausregel-Skill', '', 5),
    { type: 'Program', name: 'Dodge', system: { rating: 6 } },
  ],
};

describe('skillLabelFor', () => {
  it('builds the label from a bare key', () => {
    expect(skillLabelFor('unarmedcombat')).toBe('sr4.skills.unarmedcombat');
  });

  it('passes a full reference through untouched', () => {
    expect(skillLabelFor('sr4.skills.gunnery')).toBe('sr4.skills.gunnery');
  });

  it('normalises case and surrounding whitespace', () => {
    expect(skillLabelFor('  GUNNERY ')).toBe('sr4.skills.gunnery');
  });
});

describe('findSkillIn', () => {
  it('finds a hyphenated skill the name comparison would miss', () => {
    const items = [skill('Unarmed-Combat', 'sr4.skills.unarmedcombat', 4)];

    expect(findSkillIn(items, 'unarmedcombat').name).toBe('Unarmed-Combat');
  });

  it('finds a skill whose name was localized by the importer', () => {
    expect(findSkillIn(imported.items, 'dodge').name).toBe('Ausweichen');
    expect(findSkillIn(imported.items, 'counterspelling').name).toBe(
      'Zauberabwehr'
    );
  });

  it('accepts a full label as the reference', () => {
    expect(findSkillIn(imported.items, 'sr4.skills.dodge').name).toBe(
      'Ausweichen'
    );
  });

  it('falls back to a case-insensitive name for a skill without a label', () => {
    expect(findSkillIn(imported.items, 'hausregel-skill').name).toBe(
      'Hausregel-Skill'
    );
  });

  it('prefers the label match over a name match', () => {
    const items = [
      skill('Gunnery', '', 2),
      skill('Geschütze', 'sr4.skills.gunnery', 4),
    ];

    expect(findSkillIn(items, 'gunnery').name).toBe('Geschütze');
  });

  it('returns null when nothing matches', () => {
    expect(findSkillIn(imported.items, 'hacking')).toBeNull();
  });

  it('ignores items that are not skills', () => {
    expect(findSkillIn(imported.items, 'Dodge').name).toBe('Ausweichen');
  });
});

describe('buildSkillOptions', () => {
  it('localizes the label and keys the option by the reference', () => {
    const options = buildSkillOptions(imported, ['dodge', 'unarmedcombat']);

    expect(options).toEqual([
      { value: 'dodge', label: 'sr4.skills.dodge', rating: 3 },
      { value: 'unarmedcombat', label: 'sr4.skills.unarmedcombat', rating: 4 },
    ]);
  });

  it('offers the melee skills an imported character actually has', () => {
    const options = buildSkillOptions(imported, [
      'dodge',
      'gymnastics',
      'unarmedcombat',
      'blades',
    ]);

    expect(options.map((option) => option.value)).toEqual([
      'dodge',
      'unarmedcombat',
    ]);
  });

  it('skips unknown skills and skills at rating 0', () => {
    const actor = { items: [skill('Blades', 'sr4.skills.blades', 0)] };

    expect(buildSkillOptions(actor, ['blades', 'clubs'])).toEqual([]);
  });

  it('uses the name when the skill has no label', () => {
    const options = buildSkillOptions(imported, ['Hausregel-Skill']);

    expect(options).toEqual([
      { value: 'Hausregel-Skill', label: 'Hausregel-Skill', rating: 5 },
    ]);
  });

  it('returns nothing without an actor', () => {
    expect(buildSkillOptions(null, ['dodge'])).toEqual([]);
  });
});

describe('skillDisplayLabel', () => {
  it('falls back to the name when no label is set', () => {
    expect(skillDisplayLabel(skill('Hausregel', '', 1))).toBe('Hausregel');
  });
});

describe('ratingBySkill', () => {
  it('maps every option value to its rating', () => {
    const options = buildSkillOptions(imported, ['dodge', 'unarmedcombat']);

    expect([...ratingBySkill(options)]).toEqual([
      ['dodge', 3],
      ['unarmedcombat', 4],
    ]);
  });
});
