import { describe, it, expect } from 'vitest';
import {
  mapCharacterSystem,
  mapCharacterSkill,
} from '@importer/mappers/index.js';
import { buildActorData } from '@importer/build-character.js';

const baseCharacter = {
  name: 'Daryl Higgins',
  metatype: 'Dwarf',
  sex: 'M',
  height: '1,23m',
  weight: '58kg',
  eyes: 'Braun',
  hair: 'Braun',
  skin: 'Weiss',
  background: 'A quiet dwarf.',
  gamenotes: '30% discount.',
  nuyen: '25711',
  karma: '17',
  totalkarma: '33',
  totalstreetcred: '7',
  totalnotoriety: '4',
  totalpublicawareness: '3',
  age: '42',
  magician: 'True',
  adept: 'False',
  technomancer: 'False',
  tradition: 'Shamanic',
  drain: 'WIL + CHA (11)',
  physicalcmfilled: '0',
  stuncmfilled: '2',
  attributes: {
    BOD: '3',
    AGI: '2',
    REA: '2',
    STR: '3',
    CHA: '5',
    INT: '3',
    LOG: '1',
    WIL: '5',
    EDG: '3',
    MAG: '5',
    ESS: '6',
  },
};

describe('mapCharacterSystem', () => {
  it('maps attributes into sheetStats with CURRENTEDGE mirroring EDGE', () => {
    const { system } = mapCharacterSystem(baseCharacter);
    expect(system.sheetStats).toMatchObject({
      BODY: 3,
      AGILITY: 2,
      CHARISMA: 5,
      WILLPOWER: 5,
      MAGIC: 5,
      EDGE: 3,
      CURRENTEDGE: 3,
      ESSENCE: 6,
    });
  });

  it('resolves shamanic tradition and charisma drain', () => {
    const { system } = mapCharacterSystem(baseCharacter);
    expect(system.magic).toEqual({
      magician: true,
      adept: false,
      tradition: 'SHAMAN',
      drainAttribute: 'CHARISMA',
    });
  });

  it('maps metadata, description and condition damage', () => {
    const { name, system } = mapCharacterSystem(baseCharacter);
    expect(name).toBe('Daryl Higgins');
    expect(system.metaData).toMatchObject({
      nuyen: 25711,
      karma: 17,
      totalKarma: 33,
      streetCred: 7,
      notoriety: 4,
      publicAwareness: 3,
      age: 42,
    });
    expect(system.descriptionAndNotes.metatype).toBe('Dwarf');
    expect(system.descriptionAndNotes.gender).toBe('M');
    expect(system.descriptionAndNotes.bio).toBe('A quiet dwarf.');
    expect(system.conditionMonitor.stun.value).toBe(2);
    expect(system.conditionMonitor.physical.value).toBe(0);
  });

  it('builds a data-url portrait from mugshot and omits it otherwise', () => {
    expect(mapCharacterSystem(baseCharacter).img).toBeNull();
    const withMug = mapCharacterSystem({
      ...baseCharacter,
      mugshotbase64: 'QUJD',
    });
    expect(withMug.img).toBe('data:image/jpeg;base64,QUJD');
  });

  it('resolves hermetic drain to logic', () => {
    const { system } = mapCharacterSystem({
      ...baseCharacter,
      tradition: 'Hermetic',
      drain: 'WIL + LOG (10)',
    });
    expect(system.magic.tradition).toBe('HERMETIC');
    expect(system.magic.drainAttribute).toBe('LOGIC');
  });
});

describe('mapCharacterSkill', () => {
  it('maps a knowledge skill with rating and category', () => {
    const skill = mapCharacterSkill({
      name: 'Moonshine',
      knowledge: 'True',
      skillcategory: 'Interest',
      attribute: 'INT',
      rating: '2',
      spec: '',
    });
    expect(skill).toEqual({
      name: 'Moonshine',
      type: 'Skill',
      system: {
        attribute: 'INTUITION',
        category: 'hobby',
        group: '',
        type: 'knowledge',
        rating: 2,
        specialization: '',
        source: '',
      },
    });
  });
});

describe('buildActorData', () => {
  const canonicalSkills = [
    {
      name: 'Spellcasting',
      type: 'Skill',
      system: {
        label: 'sr4.skills.spellcasting',
        rating: 0,
        attribute: 'MAGIC',
      },
    },
    {
      name: 'Longarms',
      type: 'Skill',
      system: { label: 'sr4.skills.longarms', rating: 0, attribute: 'AGILITY' },
    },
  ];

  const parsed = {
    character: baseCharacter,
    items: {
      weapon: [
        {
          name: 'Remington 990',
          type: 'Ranged',
          category: 'Shotguns',
          damage: '9P(f)',
          ammo: '8(m)',
          mode: 'SA',
        },
      ],
      spell: [{ name: 'Manabolt', category: 'Combat', type: 'M' }],
    },
    skills: [
      { name: 'Spellcasting', knowledge: 'False', rating: '5', spec: '' },
      { name: 'Longarms', knowledge: 'False', rating: '2', spec: 'Shotguns' },
      {
        name: 'Moonshine',
        knowledge: 'True',
        skillcategory: 'Interest',
        attribute: 'INT',
        rating: '2',
      },
    ],
  };

  it('produces a character actor with merged skills and mapped items', () => {
    const data = buildActorData(parsed, canonicalSkills);
    expect(data.type).toBe('character');
    expect(data.name).toBe('Daryl Higgins');

    const weapon = data.items.find((i) => i.name === 'Remington 990');
    expect(weapon.type).toBe('Ranged Weapon');
    expect(
      data.items.some((i) => i.name === 'Manabolt' && i.type === 'Spell')
    ).toBe(true);

    const spellcasting = data.items.find(
      (i) => i.type === 'Skill' && i.name === 'Spellcasting'
    );
    expect(spellcasting.system.rating).toBe(5);
    expect(spellcasting.system.label).toBe('sr4.skills.spellcasting');

    const longarms = data.items.find(
      (i) => i.type === 'Skill' && i.name === 'Longarms'
    );
    expect(longarms.system.rating).toBe(2);
    expect(longarms.system.specialization).toBe('Shotguns');

    const moonshine = data.items.find((i) => i.name === 'Moonshine');
    expect(moonshine.type).toBe('Skill');
    expect(moonshine.system.type).toBe('knowledge');
    expect(moonshine.system.rating).toBe(2);
  });

  it('does not mutate the canonical skill input', () => {
    buildActorData(parsed, canonicalSkills);
    expect(canonicalSkills[0].system.rating).toBe(0);
  });
});
