import { describe, it, expect } from 'vitest';
import {
  mapCharacterSystem,
  mapCharacterSkill,
  mapConnections,
  parseConnectionRating,
} from '@importer/mappers/index.js';
import { buildActorData } from '@importer/character/build-character.js';

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
    });
    expect(system.sheetStats.ESSENCE).toBeUndefined();
  });

  it('resolves shamanic tradition and charisma drain', () => {
    const { system } = mapCharacterSystem(baseCharacter);
    expect(system.magic).toEqual({
      magician: true,
      adept: false,
      tradition: 'SHAMAN',
      drainAttribute: 'CHARISMA',
      spellpower: 5,
      powerPoints: 0,
    });
  });

  it('gives a pure adept the full Magic attribute as power points', () => {
    const { system } = mapCharacterSystem({
      ...baseCharacter,
      magician: 'False',
      adept: 'True',
    });
    expect(system.magic).toMatchObject({ spellpower: 0, powerPoints: 5 });
  });

  it('splits Magic for a mystic adept using the Chummer power points', () => {
    const { system } = mapCharacterSystem({
      ...baseCharacter,
      adept: 'True',
      powerpoints: '2',
    });
    expect(system.magic).toMatchObject({ spellpower: 3, powerPoints: 2 });
  });

  it('leaves a mystic adept unallocated when Chummer reports no power points', () => {
    const { system } = mapCharacterSystem({
      ...baseCharacter,
      adept: 'True',
    });
    expect(system.magic).toMatchObject({ spellpower: 5, powerPoints: 0 });
  });

  it('clamps an over-allocated import to the Magic attribute', () => {
    const { system } = mapCharacterSystem({
      ...baseCharacter,
      adept: 'True',
      powerpoints: '9',
    });
    expect(system.magic).toMatchObject({ spellpower: 0, powerPoints: 5 });
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

  it('omits img when no mugshot is present', () => {
    expect(mapCharacterSystem(baseCharacter).img).toBeNull();
  });

  it('builds a data-url portrait from mugshot', () => {
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

  it.each([
    ['Hermetisch', 'HERMETIC'],
    ['Schamanisch', 'SHAMAN'],
    ['Wicca (Gardner)', 'WICCA'],
    ['Wicca (Göttlich)', 'WICCA'],
    ['Chaosmagie', 'CHAOS'],
  ])('resolves the German tradition name %j to %j', (tradition, expected) => {
    const { system } = mapCharacterSystem({
      ...baseCharacter,
      tradition,
    });
    expect(system.magic.tradition).toBe(expected);
  });

  it('prefers the alias as the actor name and falls back to the real name', () => {
    expect(
      mapCharacterSystem({ ...baseCharacter, alias: 'Jenkins' }).name
    ).toBe('Jenkins');
    expect(mapCharacterSystem({ ...baseCharacter, alias: '   ' }).name).toBe(
      'Daryl Higgins'
    );
  });

  it('applies passed essence modifiers to the system fields', () => {
    const { system } = mapCharacterSystem(baseCharacter, {
      biocompatibility: 'CYBERWARE',
      sensitiveSystem: true,
    });
    expect(system.biocompatibility).toBe('CYBERWARE');
    expect(system.sensitiveSystem).toBe(true);
  });

  it('defaults essence modifiers to neutral', () => {
    const { system } = mapCharacterSystem(baseCharacter);
    expect(system.biocompatibility).toBe('');
    expect(system.sensitiveSystem).toBe(false);
  });
});

describe('parseConnectionRating', () => {
  it('splits "1 (3)" into connection and group connection', () => {
    expect(parseConnectionRating('1 (3)')).toEqual({
      connection: 1,
      groupConnection: 3,
    });
  });

  it('handles a bare rating without a group value', () => {
    expect(parseConnectionRating('4')).toEqual({
      connection: 4,
      groupConnection: 0,
    });
  });
});

describe('mapConnections', () => {
  it('maps contacts into a keyed object with archetype split and type mapping', () => {
    const connections = mapConnections([
      {
        name: 'One Guy (Schieber)',
        connection: '1 (3)',
        loyalty: '1',
        type: 'Contact',
      },
      { name: 'Silver Vixen', connection: '1', loyalty: '1', type: 'Enemy' },
    ]);

    expect(connections.c0).toEqual({
      name: 'One Guy',
      archetype: 'Schieber',
      connection: 1,
      groupConnection: 3,
      loyalty: 1,
      type: 'Contact',
      notes: '',
    });
    expect(connections.c1).toMatchObject({
      name: 'Silver Vixen',
      archetype: '',
      type: 'Enemy',
    });
  });

  it('returns an empty object when there are no contacts', () => {
    expect(mapConnections(undefined)).toEqual({});
    expect(mapConnections([])).toEqual({});
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

  it('ports ratings for German and cognate skill names alike by resolving each to its canonical English skill', () => {
    const germanParsed = {
      character: baseCharacter,
      items: {},
      skills: [
        {
          name: 'Schnellfeuerwaffen',
          knowledge: 'False',
          rating: '6',
          spec: 'Sturmgewehre',
        },
        { name: 'Klingenwaffen', knowledge: 'False', rating: '3', spec: '' },
        { name: 'Computer', knowledge: 'False', rating: '2', spec: '' },
        {
          name: 'Mafiastrukturen',
          knowledge: 'True',
          rating: '5',
          attribute: 'INT',
          skillcategory: 'Straßenwissen',
          skillcategory_english: 'Street',
        },
      ],
    };
    const canonicalWithMatches = [
      ...canonicalSkills,
      {
        name: 'Automatics',
        type: 'Skill',
        system: {
          label: 'sr4.skills.automatics',
          attribute: 'AGILITY',
          category: 'combat',
          type: 'active',
          rating: 0,
        },
      },
      {
        name: 'Blades',
        type: 'Skill',
        system: {
          label: 'sr4.skills.blades',
          attribute: 'AGILITY',
          category: 'combat',
          type: 'active',
          rating: 0,
        },
      },
      {
        name: 'Computer',
        type: 'Skill',
        system: {
          label: 'sr4.skills.computer',
          attribute: 'LOGIC',
          category: 'technical',
          type: 'active',
          rating: 0,
        },
      },
    ];

    const data = buildActorData(germanParsed, canonicalWithMatches);

    const automatics = data.items.find(
      (i) => i.type === 'Skill' && i.name === 'Schnellfeuerwaffen'
    );
    expect(automatics.system.rating).toBe(6);
    expect(automatics.system.label).toBe('sr4.skills.automatics');
    expect(automatics.system.specialization).toBe('Sturmgewehre');

    const blades = data.items.find(
      (i) => i.type === 'Skill' && i.name === 'Klingenwaffen'
    );
    expect(blades.system.rating).toBe(3);
    expect(blades.system.label).toBe('sr4.skills.blades');

    const computer = data.items.find(
      (i) => i.type === 'Skill' && i.name === 'Computer'
    );
    expect(computer.system.rating).toBe(2);
    expect(computer.system.label).toBe('sr4.skills.computer');

    const mafiastrukturen = data.items.find(
      (i) => i.name === 'Mafiastrukturen'
    );
    expect(mafiastrukturen.system.rating).toBe(5);
    expect(mafiastrukturen.system.type).toBe('knowledge');

    const longarms = data.items.find((i) => i.name === 'Longarms');
    expect(longarms.system.rating).toBe(0);
  });

  it('drops the rating for an active skill name with no translation and no compendium match', () => {
    const withUnknownSkill = {
      character: baseCharacter,
      items: {},
      skills: [
        { name: 'Bogenschützerei', knowledge: 'False', rating: '4', spec: '' },
      ],
    };

    const data = buildActorData(withUnknownSkill, canonicalSkills);

    expect(data.items.some((i) => i.name === 'Bogenschützerei')).toBe(false);
    expect(
      data.items.every((i) => i.type !== 'Skill' || i.system.rating === 0)
    ).toBe(true);
  });

  it('maps biocompatibility and reverses it on imported cyberware essence', () => {
    const withBiocompat = {
      character: baseCharacter,
      items: {
        quality: [{ name: 'Biokompatibilität (Cyberware)' }],
        cyberware: [
          {
            name: 'Wired Reflexes',
            ess: '1.8',
            grade: 'Standard',
            improvementsource: 'Cyberware',
          },
        ],
      },
      skills: [],
    };
    const data = buildActorData(withBiocompat, []);
    expect(data.system.biocompatibility).toBe('CYBERWARE');
    const wired = data.items.find((i) => i.name === 'Wired Reflexes');
    expect(wired.system.type).toBe('CYBERWARE');
    expect(wired.system.essence).toBe(2);
  });

  it('builds ammoLinks from weapon clips and gear GUIDs', () => {
    const withAmmo = {
      character: baseCharacter,
      items: {
        weapon: [
          {
            name: 'Ares Predator IV',
            type: 'Ranged',
            category: 'Heavy Pistols',
            damage: '5P',
            ammo: '15(c)',
            mode: 'SA',
            _clips: [{ gearGuid: 'guid-123', count: 15 }],
          },
        ],
        gear: [
          {
            name: 'Regular Ammo',
            category: 'Ammunition',
            guid: 'guid-123',
          },
        ],
      },
      skills: [],
    };
    const data = buildActorData(withAmmo, []);
    expect(data.ammoLinks).toEqual([
      {
        weaponName: 'Ares Predator IV',
        ammoName: 'Regular Ammo',
        currentAmmo: 15,
      },
    ]);
  });

  it('returns empty ammoLinks when no clips are present', () => {
    const data = buildActorData(parsed, canonicalSkills);
    expect(data.ammoLinks).toEqual([]);
  });

  it('builds weaponModLinks and creates mod items from _weaponMods', () => {
    const withMods = {
      character: baseCharacter,
      items: {
        weapon: [
          {
            name: 'AK-97',
            type: 'Ranged',
            category: 'Assault Rifles',
            damage: '6P',
            ammo: '38(c)',
            mode: 'SA/BF/FA',
            _weaponMods: [
              {
                name: 'Gas Vent 2',
                slots: '1',
                rc: '2',
                source: 'SR4',
                page: '322',
              },
              {
                name: 'Foregrip',
                rc: '1',
                mount: 'Under',
                conceal: '0',
                source: 'AR',
                page: '34',
              },
            ],
          },
          {
            name: 'Ares Crusader',
            type: 'Ranged',
            category: 'Machine Pistols',
            damage: '4P',
            ammo: '40(c)',
            mode: 'SA/BF',
            _weaponMods: [
              {
                name: 'Gas Vent 2',
                slots: '1',
                rc: '2',
                source: 'SR4',
                page: '322',
              },
            ],
          },
        ],
      },
      skills: [],
    };
    const data = buildActorData(withMods, []);

    const modItems = data.items.filter((i) => i.type === 'Weapon Mod');
    expect(modItems).toHaveLength(3);
    expect(modItems.map((m) => m.name).sort()).toEqual([
      'Foregrip',
      'Gas Vent 2',
      'Gas Vent 2',
    ]);

    const gasVent = modItems.find((m) => m.name === 'Gas Vent 2');
    expect(gasVent.system.slotCost).toBe(1);
    const foregrip = modItems.find((m) => m.name === 'Foregrip');
    expect(foregrip.system.slotCost).toBe(0);

    expect(data.weaponModLinks).toEqual([
      { weaponName: 'AK-97', modName: 'Gas Vent 2' },
      { weaponName: 'AK-97', modName: 'Foregrip' },
      { weaponName: 'Ares Crusader', modName: 'Gas Vent 2' },
    ]);
  });

  it('returns empty weaponModLinks when no mods are present', () => {
    const data = buildActorData(parsed, canonicalSkills);
    expect(data.weaponModLinks).toEqual([]);
  });

  it('matches hyphenated canonical names to space-separated Chummer names', () => {
    const canonical = [
      {
        name: 'Pilot-Ground-Craft',
        type: 'Skill',
        system: {
          label: 'sr4.skills.pilotgroundcraft',
          rating: 0,
          attribute: 'REACTION',
        },
      },
      {
        name: 'Unarmed-Combat',
        type: 'Skill',
        system: {
          label: 'sr4.skills.unarmedcombat',
          rating: 0,
          attribute: 'AGILITY',
        },
      },
    ];
    const data = buildActorData(
      {
        character: baseCharacter,
        items: {},
        skills: [
          {
            name: 'Pilot Ground Craft',
            knowledge: 'False',
            rating: '4',
            spec: 'Wheeled',
          },
          { name: 'Unarmed Combat', knowledge: 'False', rating: '3', spec: '' },
        ],
      },
      canonical
    );

    const pilot = data.items.find((i) => i.name === 'Pilot-Ground-Craft');
    expect(pilot.system.rating).toBe(4);
    expect(pilot.system.specialization).toBe('Wheeled');

    const unarmed = data.items.find((i) => i.name === 'Unarmed-Combat');
    expect(unarmed.system.rating).toBe(3);
  });
});

describe('buildActorData mentor spirits', () => {
  it('maps a <mentorspirit> collection entry to a Mentor item', () => {
    const parsed = {
      character: baseCharacter,
      items: {
        mentorspirit: [
          {
            name: 'Sun',
            category: 'Other',
            advantage: '+2 dice for Combat spells',
            _bonus: [{ kind: 'spellcategory', name: 'Combat', val: 2 }],
            _choices: [],
          },
        ],
      },
      skills: [],
    };
    const data = buildActorData(parsed, []);

    const mentor = data.items.find((i) => i.type === 'Mentor');
    expect(mentor).toBeDefined();
    expect(mentor.name).toBe('Sun');
    expect(mentor.system.advantage).toBe('+2 dice for Combat spells');
    expect(mentor.effects).toHaveLength(1);
  });

  it('falls back to a minimal Mentor item from a leaf character.mentorspirit string', () => {
    const parsed = {
      character: { ...baseCharacter, mentorspirit: 'Cat' },
      items: {},
      skills: [],
    };
    const data = buildActorData(parsed, []);

    const mentor = data.items.find((i) => i.type === 'Mentor');
    expect(mentor).toBeDefined();
    expect(mentor.name).toBe('Cat');
    expect(mentor.effects).toEqual([]);
  });

  it('falls back to a minimal Mentor item derived from a "Mentor Spirit (Name)" Quality', () => {
    const parsed = {
      character: baseCharacter,
      items: {
        quality: [{ name: 'Mentor Spirit (Bear)', qualitytype: 'Positive' }],
      },
      skills: [],
    };
    const data = buildActorData(parsed, []);

    const mentor = data.items.find((i) => i.type === 'Mentor');
    expect(mentor).toBeDefined();
    expect(mentor.name).toBe('Bear');
    expect(mentor.system.category).toBe('Other');
    expect(
      data.items.some(
        (i) => i.type === 'Quality' && i.name === 'Mentor Spirit (Bear)'
      )
    ).toBe(true);
  });

  it('derives the Resonance category from a "Paragon (Name)" Quality', () => {
    const parsed = {
      character: baseCharacter,
      items: {
        quality: [{ name: 'Paragon (Shooter)', qualitytype: 'Positive' }],
      },
      skills: [],
    };
    const data = buildActorData(parsed, []);

    const mentor = data.items.find((i) => i.type === 'Mentor');
    expect(mentor.name).toBe('Shooter');
    expect(mentor.system.category).toBe('Resonance');
  });

  it('falls back to a minimal Mentor item from the German "Schutzpatron (Name)" Quality', () => {
    const parsed = {
      character: baseCharacter,
      items: {
        quality: [{ name: 'Schutzpatron (Bär)', qualitytype: 'Positive' }],
      },
      skills: [],
    };
    const data = buildActorData(parsed, []);

    const mentor = data.items.find((i) => i.type === 'Mentor');
    expect(mentor).toBeDefined();
    expect(mentor.name).toBe('Bär');
    expect(mentor.system.category).toBe('Other');
  });

  it('resolves German mentorspirit categories (Tier, Andere, Toxisch, Resonanz)', () => {
    const parsed = {
      character: baseCharacter,
      items: {
        mentorspirit: [
          { name: 'Wolf', category: 'Tier', _bonus: [], _choices: [] },
        ],
      },
      skills: [],
    };
    const data = buildActorData(parsed, []);

    const mentor = data.items.find((i) => i.type === 'Mentor');
    expect(mentor.system.category).toBe('Animal');
  });

  it('skips both fallbacks when a <mentorspirit> item is already present', () => {
    const parsed = {
      character: { ...baseCharacter, mentorspirit: 'Cat' },
      items: {
        mentorspirit: [
          { name: 'Sun', category: 'Other', _bonus: [], _choices: [] },
        ],
      },
      skills: [],
    };
    const data = buildActorData(parsed, []);

    const mentors = data.items.filter((i) => i.type === 'Mentor');
    expect(mentors).toHaveLength(1);
    expect(mentors[0].name).toBe('Sun');
  });

  it('does not create a Mentor item when there is no fallback source', () => {
    const parsed = { character: baseCharacter, items: {}, skills: [] };
    const data = buildActorData(parsed, []);
    expect(data.items.some((i) => i.type === 'Mentor')).toBe(false);
  });
});
