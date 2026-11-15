import { describe, it, expect } from 'vitest';
import {
  mapMeleeWeapon,
  mapRangedWeapon,
  mapArmor,
  mapGear,
  mapSpell,
  mapProgram,
  mapQuality,
  mapSkill,
  mapCyberware,
  mapBioware,
  mapPower,
  mapWeaponMod,
  mapMod,
  mapCritter,
  parseMount,
  isAmmunition,
  isCommlink,
  resolveEssenceModifiers,
  XML_CATEGORY_TO_ENUM,
  CATEGORY_TO_ATTACKSKILL,
  CATEGORY_TO_DAMAGETYPE,
  ATTRIBUTE_ABBR_TO_KEY,
} from '@importer/mappers/index.js';
import {
  WeaponCategory,
  Attackskill,
  DamageTypes,
} from '@models/items/weapon.enums.js';
import { SR4Attributes } from '@models/attribute.enum.js';

describe('simple mappers', () => {
  it.each([
    {
      label: 'power: leveled -> rated with per-level cost',
      map: mapPower,
      input: {
        name: 'Test Leveled Power',
        points: '1.25',
        levels: 'yes',
        source: 'TST',
        page: '1',
      },
      type: 'Power',
      system: { cost: 1.25, ratingMode: 'rated', rating: 1, geas: false },
    },
    {
      label: 'power: flat -> none with fractional cost',
      map: mapPower,
      input: { name: 'Test Flat Power', points: '.25', levels: 'no' },
      type: 'Power',
      system: { cost: 0.25, ratingMode: 'none' },
    },
    {
      label: 'cyberware: essence, grade and resolved cost',
      map: mapCyberware,
      input: {
        name: 'Test Headware',
        category: 'Headware',
        rating: '2',
        ess: '0.4',
        capacity: '0',
        avail: '6',
        cost: 'Rating * 2500',
        source: 'TST',
        page: '2',
      },
      type: 'Implant',
      system: {
        essence: 0.4,
        grade: 'STANDARD',
        type: 'CYBERWARE',
        rating: 2,
        cost: 2500,
        avail: 6,
      },
    },
    {
      label: 'bioware: implant type bioware',
      map: mapBioware,
      input: {
        name: 'Test Bioware',
        category: 'Basic',
        ess: 'Rating * 0.3',
        source: 'TST',
        page: '3',
      },
      type: 'Implant',
      system: { type: 'BIOWARE', essence: 0.3 },
    },
    {
      label: 'bioware: essence formula resolved with rating',
      map: mapBioware,
      input: {
        name: 'Test Bioware',
        category: 'Basic',
        rating: '3',
        ess: 'Rating * 0.3',
        source: 'TST',
        page: '3',
      },
      type: 'Implant',
      system: { type: 'BIOWARE', essence: 0.9, rating: 3 },
    },
    {
      label: 'armor: ballistic and impact values',
      map: mapArmor,
      input: {
        name: 'Test Vest',
        b: '5',
        i: '3',
        armorcapacity: '0',
        avail: '3',
        cost: '550',
        source: 'TST',
        page: '4',
      },
      type: 'Armor',
      system: {
        ballisticarmor: 5,
        impactarmor: 3,
        stackingType: 'standard',
        cost: 550,
        avail: 3,
      },
    },
    {
      label: 'armor: helmet maps to accessory stackingType',
      map: mapArmor,
      input: {
        name: 'Test Helmet',
        b: '0',
        i: '1',
        category: 'Helmets',
        cost: '100',
      },
      type: 'Armor',
      system: { stackingType: 'accessory' },
    },
    {
      label: 'armor: shield maps to accessory stackingType',
      map: mapArmor,
      input: {
        name: 'Test Shield',
        b: '6',
        i: '4',
        category: 'Shields',
        cost: '800',
      },
      type: 'Armor',
      system: { stackingType: 'accessory' },
    },
    {
      label: 'armor: form-fitting maps to formFitting stackingType',
      map: mapArmor,
      input: {
        name: 'Test Form-Fitting Suit',
        b: '6',
        i: '4',
        cost: '1600',
      },
      type: 'Armor',
      system: { stackingType: 'formFitting' },
    },
    {
      label: 'program: complex form flag',
      map: mapProgram,
      input: {
        name: 'Test Program',
        category: 'Common Use',
        complexform: 'yes',
        source: 'TST',
        page: '5',
      },
      type: 'Program',
      system: { category: 'Common Use', complexform: true },
    },
    {
      label: 'quality: category, bp and source',
      map: mapQuality,
      input: {
        name: 'Test Quality',
        bp: '7',
        category: 'Positive',
        source: 'TST',
        page: '9',
      },
      type: 'Quality',
      system: { category: 'Positive', bp: 7, limit: null, source: 'TST p. 9' },
    },
    {
      label: 'quality: unknown category defaults to Positive',
      map: mapQuality,
      input: { name: 'Mystery', bp: '0' },
      type: 'Quality',
      system: { category: 'Positive' },
    },
    {
      label: 'quality: keeps Negative category',
      map: mapQuality,
      input: { name: 'Test Negative Quality', bp: '10', category: 'Negative' },
      type: 'Quality',
      system: { category: 'Negative' },
    },
    {
      label: 'quality: reads Chummer qualitytype field',
      map: mapQuality,
      input: {
        name: 'Test Unlucky Quality',
        bp: '20',
        qualitytype: 'Negative',
      },
      type: 'Quality',
      system: { category: 'Negative' },
    },
    {
      label: 'skill: active attribute and category',
      map: mapSkill,
      input: {
        name: 'Pistols',
        attribute: 'AGI',
        category: 'Combat Active',
        skillgroup: 'Firearms',
        source: 'TST',
        page: '6',
      },
      type: 'Skill',
      system: {
        attribute: 'AGILITY',
        category: 'combat',
        group: 'Firearms',
        type: 'active',
      },
    },
    {
      label: 'skill: knowledge type',
      map: mapSkill,
      input: { name: 'History', attribute: 'LOG', category: 'Academic' },
      type: 'Skill',
      system: { type: 'knowledge', category: 'academic' },
    },
  ])('$label', ({ map, input, type, system }) => {
    const item = map(input);
    expect(item.type).toBe(type);
    expect(item.system).toMatchObject(system);
  });
});

describe('weapon mappers', () => {
  describe('weapon damage types', () => {
    it.each([
      {
        label: 'electric suffix (test glove) -> ELECTRICITY, -half ap ignored',
        map: mapMeleeWeapon,
        input: {
          name: 'Test Shock Glove',
          category: 'Unarmed',
          type: 'Melee',
          damage: '4S(e)',
          ap: '-half',
        },
        expected: { damage: 4, damageType: 'ELECTRICITY', ap: 0 },
      },
      {
        label: 'Laser Weapons category -> LASER',
        map: mapRangedWeapon,
        input: {
          name: 'Test Laser',
          category: 'Laser Weapons',
          type: 'Ranged',
          damage: '6P',
          ap: '-half',
          ammo: '2x4(c) or external source',
        },
        expected: { damage: 6, damageType: 'LASER', category: 'LASER_WEAPONS' },
      },
      {
        label: 'Flamethrowers category -> FIRE',
        map: mapRangedWeapon,
        input: {
          name: 'Test Flamer',
          category: 'Flamethrowers',
          type: 'Ranged',
          damage: '7P',
        },
        expected: { damage: 7, damageType: 'FIRE' },
      },
      {
        label: 'flechette (f) stays PHYSICAL and keeps AP',
        map: mapRangedWeapon,
        input: {
          name: 'Test Shotgun',
          category: 'Shotguns',
          type: 'Ranged',
          damage: '8P(f)',
          ap: '+4',
        },
        expected: { damage: 8, damageType: 'PHYSICAL', ap: 4 },
      },
      {
        label: 'flechette with blast falloff parses damage only',
        map: mapRangedWeapon,
        input: {
          name: 'Grenade: Test Frag',
          category: 'Gear',
          type: 'Ranged',
          damage: '10P(f) (-1/m)',
          ap: '+4',
        },
        expected: { damage: 10, damageType: 'PHYSICAL', ap: 4 },
      },
      {
        label: 'explicit suffix wins over category mapping',
        map: mapRangedWeapon,
        input: {
          name: 'Odd Laser',
          category: 'Laser Weapons',
          type: 'Ranged',
          damage: '7P(e)',
        },
        expected: { damageType: 'ELECTRICITY' },
      },
      {
        label: '(fire) suffix -> FIRE',
        map: mapRangedWeapon,
        input: { name: 'X', category: 'Special Weapons', damage: '6P(fire)' },
        expected: { damageType: 'FIRE' },
      },
      {
        label: '(acid) suffix -> ACID',
        map: mapRangedWeapon,
        input: { name: 'X', category: 'Special Weapons', damage: '6P(acid)' },
        expected: { damageType: 'ACID' },
      },
      {
        label: '(cold) suffix -> ICE',
        map: mapRangedWeapon,
        input: { name: 'X', category: 'Special Weapons', damage: '6P(cold)' },
        expected: { damageType: 'ICE' },
      },
      {
        label: 'plain S damage -> STUN',
        map: mapRangedWeapon,
        input: { name: 'Test Taser', category: 'Tasers', damage: '5S' },
        expected: { damage: 5, damageType: 'STUN' },
      },
      {
        label: 'launcher damage text without number -> 0',
        map: mapRangedWeapon,
        input: {
          name: 'Test Launcher',
          category: 'Grenade Launchers',
          damage: 'Grenade',
        },
        expected: { damage: 0, damageType: 'PHYSICAL' },
      },
      {
        label: 'strength-based melee damage keeps offset',
        map: mapMeleeWeapon,
        input: {
          name: 'Test Blade',
          category: 'Blades',
          type: 'Melee',
          damage: '(STR/2+2)P',
          ap: '-2',
        },
        expected: {
          damage: 2,
          damageType: 'PHYSICAL',
          ap: -2,
          noStrengthBonus: false,
        },
      },
    ])('$label', ({ map, input, expected }) => {
      expect(map(input).system).toMatchObject(expected);
    });
  });
  it('maps a melee weapon with attack skill and reach', () => {
    const item = mapMeleeWeapon({
      name: 'Test Axe',
      category: 'Blades',
      type: 'Melee',
      reach: '2',
      damage: '(STR/2+4)P',
      ap: '-3',
      source: 'TST',
      page: '7',
    });
    expect(item.type).toBe('Melee Weapon');
    expect(item.system).toMatchObject({
      attackSkill: 'BLADES',
      category: 'BLADES',
      reach: 2,
      ap: -3,
      damage: 4,
      damageType: 'PHYSICAL',
      noStrengthBonus: false,
    });
  });

  it('maps a ranged weapon with ammo and mode', () => {
    const item = mapRangedWeapon({
      name: 'Test Pistol',
      category: 'Heavy Pistols',
      type: 'Ranged',
      damage: '6P',
      ap: '-2',
      mode: 'SA',
      rc: '0',
      ammo: '12(c)',
      source: 'TST',
      page: '8',
    });
    expect(item.type).toBe('Ranged Weapon');
    expect(item.system).toMatchObject({
      attackSkill: 'PISTOLS',
      category: 'HEAVY_PISTOLS',
      damage: 6,
      ap: -2,
      mode: 'SEMI_AUTOMATIC',
      maxAmmo: 12,
      currentAmmo: 12,
      ammoFeed: 'c',
      smartlink: false,
    });
  });

  it('falls back to NONE for unknown categories', () => {
    expect(
      mapMeleeWeapon({ name: 'X', category: 'Mystery' }).system.attackSkill
    ).toBe('NONE');
  });
});

describe('ranged weapon mapper fallback', () => {
  it('falls back to NONE for unknown categories', () => {
    expect(
      mapRangedWeapon({ name: 'X', category: 'Mystery' }).system.attackSkill
    ).toBe('NONE');
  });
});

describe('gear mapper', () => {
  it('maps plain gear as Item', () => {
    const item = mapGear({ name: 'Medkit', category: 'Medical', rating: '3' });
    expect(item.type).toBe('Item');
    expect(item.system.rating).toBe(3);
  });

  it('keeps ammo accessories without weapon stats as Item', () => {
    const item = mapGear({ name: 'Spare Clip', category: 'Ammunition' });
    expect(item.type).toBe('Item');
  });

  it('does not misclassify gear whose name merely contains "round"', () => {
    const item = mapGear({
      name: 'Surround Sound System',
      category: 'Electronics',
    });
    expect(item.type).toBe('Item');
  });

  it('maps piercing ammo (ap bonus) as Ammo with correct sign', () => {
    const item = mapGear({
      name: 'Ammo: Test Piercing',
      category: 'Ammunition',
      extra: 'Heavy Pistols',
      weaponbonus: { ap: '-3' },
    });
    expect(item.type).toBe('Ammo');
    expect(item.system).toMatchObject({
      apBonus: -3,
      damageBonus: 0,
      damageOverride: null,
      damageTypeOverride: '',
      category: 'HEAVY_PISTOLS',
    });
  });

  it('maps Gel Rounds (damage/ap/type) as Ammo', () => {
    const item = mapGear({
      name: 'Ammo: Test Gel Rounds',
      category: 'Ammunition',
      weaponbonus: { ap: '2', damage: '-1', damagetype: 'S' },
    });
    expect(item.system).toMatchObject({
      apBonus: 2,
      damageBonus: -1,
      damageTypeOverride: 'STUN',
      gelRounds: true,
    });
  });

  it('flags the "G" damage code of older data sets as gel rounds', () => {
    const item = mapGear({
      name: 'Ammo: Test Impact Rounds',
      category: 'Ammunition',
      weaponbonus: { ap: '2', damage: '-1', damagetype: 'G' },
    });
    expect(item.system.gelRounds).toBe(true);
  });

  it.each([
    ['Ammo: Test Piercing', { ap: '-3' }],
    ['Ammo: Test Regular', {}],
    ['Ammo: Test Shock', { damage: '-1', damagetype: '(e)' }],
    ['Ammo: Test Gelatin Rounds', { damage: '-1', damagetype: 'S' }],
  ])('does not flag %s as gel rounds', (name, weaponbonus) => {
    const item = mapGear({ name, category: 'Ammunition', weaponbonus });
    expect(item.system.gelRounds).toBe(false);
  });

  it.each([
    ['a G damage code', '-1G', true],
    ['an S damage code', '-1S', false],
  ])(
    'reads %s off the flat weaponbonus path without help from the name',
    (_label, weaponbonusdamage, expected) => {
      const item = mapGear({
        name: 'Ammo: Test Impact Rounds',
        category: 'Ammunition',
        extra: 'Heavy Pistols',
        weaponbonusdamage,
        weaponbonusap: '+2',
      });
      expect(item.system.gelRounds).toBe(expected);
    }
  );

  it('does not leak gelRounds into weapon mods', () => {
    expect(
      mapWeaponMod({ name: 'Test Gel-Filled Grip' }).system.gelRounds
    ).toBeUndefined();
  });

  it('maps flechette (P(f) stays physical) as Ammo', () => {
    const item = mapGear({
      name: 'Ammo: Test Flechette',
      category: 'Ammunition',
      weaponbonus: { ap: '4', damage: '1', damagetype: 'P(f)' },
    });
    expect(item.system.damageTypeOverride).toBe('PHYSICAL');
  });

  it('parses flat weaponbonusdamage/weaponbonusap from character export', () => {
    const item = mapGear({
      name: 'Ammo: Test Flechette',
      category: 'Ammunition',
      extra: 'Shotguns',
      weaponbonusdamage: '+1P(f)',
      weaponbonusap: '+4',
      qty: '24',
    });
    expect(item.type).toBe('Ammo');
    expect(item.system).toMatchObject({
      damageBonus: 1,
      apBonus: 4,
      damageTypeOverride: 'PHYSICAL',
      damageOverride: null,
      category: 'SHOTGUNS',
      quantity: 24,
    });
  });

  it('falls back to zero bonus when flat weaponbonusdamage has no number', () => {
    const item = mapGear({
      name: 'Test Weird Ammo',
      category: 'Ammunition',
      weaponbonusdamage: 'S',
      weaponbonusap: '+3',
    });
    expect(item.type).toBe('Ammo');
    expect(item.system).toMatchObject({
      damageBonus: 0,
      apBonus: 3,
      damageTypeOverride: '',
    });
  });

  it('maps shock ammo damagereplace as absolute override', () => {
    const item = mapGear({
      name: 'Ammo: Test Shock',
      category: 'Ammunition',
      weaponbonus: { apreplace: '-half', damagereplace: '5S(e)' },
    });
    expect(item.system).toMatchObject({
      damageOverride: 5,
      damageTypeOverride: 'ELECTRICITY',
    });
  });

  it('maps plain ammo (category only, no weaponbonus) as Ammo', () => {
    const item = mapGear({
      name: 'Test Regular Ammo',
      category: 'Ammunition',
      qty: '100',
    });
    expect(item.type).toBe('Ammo');
    expect(item.system).toMatchObject({
      damageBonus: 0,
      apBonus: 0,
      damageTypeOverride: '',
      damageOverride: null,
      quantity: 100,
      category: '',
    });
  });

  it('keeps Speed Loader as Item despite Ammunition category', () => {
    expect(mapGear({ name: 'Speed Loader', category: 'Ammunition' }).type).toBe(
      'Item'
    );
  });

  it('maps qty field to quantity', () => {
    const item = mapGear({
      name: 'Ammo: Test Piercing',
      category: 'Ammunition',
      weaponbonus: { ap: '-3' },
      qty: '50',
    });
    expect(item.system.quantity).toBe(50);
  });

  it('maps Foci category as Focus item with equipped', () => {
    const item = mapGear({
      name: 'Test Focus',
      category: 'Foci',
      rating: '2',
      equipped: 'True',
      cost: '10000',
      avail: '8R',
    });
    expect(item.type).toBe('Focus');
    expect(item.name).toBe('Test Focus');
    expect(item.system.rating).toBe(2);
    expect(item.system.equipped).toBe(true);
  });

  it('maps unequipped Focus', () => {
    const item = mapGear({
      name: 'Test Other Focus',
      category: 'Foci',
      rating: '3',
      equipped: 'False',
    });
    expect(item.type).toBe('Focus');
    expect(item.system.equipped).toBe(false);
  });

  it('maps Fetishes category as Fetish item', () => {
    const item = mapGear({
      name: 'Test Fetish',
      category: 'Fetishes',
      rating: '0',
      cost: '200',
    });
    expect(item.type).toBe('Fetish');
    expect(item.name).toBe('Test Fetish');
    expect(item.system.rating).toBe(0);
  });
});

describe('isAmmunition', () => {
  it('returns true for gear with weaponbonus', () => {
    expect(isAmmunition({ weaponbonus: { ap: '-4' } })).toBe(true);
  });

  it('returns true for Ammunition category without weaponbonus', () => {
    expect(
      isAmmunition({ name: 'Test Regular Ammo', category: 'Ammunition' })
    ).toBe(true);
  });

  it('returns false for Spare Clip', () => {
    expect(isAmmunition({ name: 'Spare Clip', category: 'Ammunition' })).toBe(
      false
    );
  });

  it('returns false for non-Ammunition category', () => {
    expect(isAmmunition({ name: 'Medkit', category: 'Medical' })).toBe(false);
  });
});

describe('commlink mapper', () => {
  it.each([
    {
      label: 'maps commlink with matrix stats',
      input: {
        name: 'Test Link',
        iscommlink: 'True',
        response: '1',
        signal: '2',
        firewall: '0',
        system: '0',
        cost: '100',
      },
      system: { response: 1, signal: 2, firewall: 0, os: 0, cost: 100 },
    },
    {
      label: 'defaults matrix stats to 1 when fields are missing',
      input: { name: 'Unknown Link', iscommlink: 'True' },
      system: { response: 1, signal: 1, firewall: 1, os: 1 },
    },
  ])('$label', ({ input, system }) => {
    const item = mapGear(input);
    expect(item.type).toBe('Commlink');
    expect(item.system).toMatchObject(system);
  });

  it('keeps non-commlink gear as Item', () => {
    const item = mapGear({
      name: 'Medkit',
      iscommlink: 'False',
      category: 'Medical',
    });
    expect(item.type).toBe('Item');
  });

  it('treats missing iscommlink as non-commlink', () => {
    expect(mapGear({ name: 'Medkit', category: 'Medical' }).type).toBe('Item');
  });
});

describe('mapGear resolves records that match more than one gear kind', () => {
  it('ammo weaponbonus fields take precedence over the iscommlink flag', () => {
    const item = mapGear({
      name: 'Weird Hybrid Record',
      iscommlink: 'True',
      weaponbonus: { damage: '2', ap: '-1' },
    });
    expect(item.type).toBe('Ammo');
  });

  it('the iscommlink flag takes precedence over the isprogram flag', () => {
    const item = mapGear({
      name: 'Weird Hybrid Record',
      iscommlink: 'True',
      isprogram: 'True',
    });
    expect(item.type).toBe('Commlink');
  });

  it('the isprogram flag takes precedence over Foci category', () => {
    const item = mapGear({
      name: 'Weird Hybrid Record',
      isprogram: 'True',
      category: 'Foci',
    });
    expect(item.type).toBe('Program');
  });
});

describe('isCommlink', () => {
  it('returns true for iscommlink True', () => {
    expect(isCommlink({ iscommlink: 'True' })).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isCommlink({ iscommlink: 'true' })).toBe(true);
    expect(isCommlink({ iscommlink: 'TRUE' })).toBe(true);
  });

  it('returns false for False', () => {
    expect(isCommlink({ iscommlink: 'False' })).toBe(false);
  });

  it('returns false when missing', () => {
    expect(isCommlink({})).toBe(false);
  });
});

describe('enum consistency', () => {
  it('XML_CATEGORY_TO_ENUM values are valid WeaponCategory keys', () => {
    const validKeys = new Set(Object.keys(WeaponCategory));
    for (const [xmlName, key] of Object.entries(XML_CATEGORY_TO_ENUM)) {
      expect(validKeys.has(key), `${xmlName} → ${key}`).toBe(true);
    }
  });

  it('CATEGORY_TO_DAMAGETYPE values are valid DamageTypes keys', () => {
    const validKeys = new Set(Object.keys(DamageTypes));
    for (const [xmlName, key] of Object.entries(CATEGORY_TO_DAMAGETYPE)) {
      expect(validKeys.has(key), `${xmlName} → ${key}`).toBe(true);
    }
  });

  it('CATEGORY_TO_DAMAGETYPE only uses known weapon categories', () => {
    for (const xmlName of Object.keys(CATEGORY_TO_DAMAGETYPE)) {
      expect(XML_CATEGORY_TO_ENUM[xmlName], xmlName).toBeDefined();
    }
  });

  it('CATEGORY_TO_ATTACKSKILL values are valid Attackskill keys', () => {
    const validKeys = new Set(Object.keys(Attackskill));
    for (const [xmlName, key] of Object.entries(CATEGORY_TO_ATTACKSKILL)) {
      expect(validKeys.has(key), `${xmlName} → ${key}`).toBe(true);
    }
  });

  it('ATTRIBUTE_ABBR_TO_KEY values are valid SR4Attributes keys', () => {
    const validKeys = new Set(Object.keys(SR4Attributes));
    for (const [abbr, key] of Object.entries(ATTRIBUTE_ABBR_TO_KEY)) {
      expect(validKeys.has(key), `${abbr} → ${key}`).toBe(true);
    }
  });
});

describe('spell mapper', () => {
  it('maps combat type, range area and drain', () => {
    const item = mapSpell({
      name: 'Test Lightning Orb',
      descriptor: 'Indirect, Elemental, Area',
      category: 'Combat',
      type: 'P',
      range: 'LOS (A)',
      damage: 'P',
      duration: 'I',
      dv: '(F/2)+4',
      source: 'TST',
      page: '10',
    });
    expect(item.type).toBe('Spell');
    expect(item.system).toMatchObject({
      category: 'COMBAT',
      type: 'PHYSICAL',
      combatType: 'INDIRECT',
      range: 'LOS',
      area: true,
      element: 'ELECTRICITY',
      duration: 'INSTANT',
      dv: 4,
      damageType: 'PHYSICAL',
    });
  });

  it('reads descriptors (plural) from character-import XML', () => {
    const item = mapSpell({
      name: 'Test Fire Orb',
      descriptors: 'Indirect, Elemental, Area',
      category: 'Combat',
      type: 'P',
      range: 'LOS (A)',
      damage: 'P',
      duration: 'I',
      dv: '(F/2)+3',
    });
    expect(item.system.combatType).toBe('INDIRECT');
    expect(item.system.element).toBe('FIRE');
    expect(item.system.area).toBe(true);
  });

  it('maps mana touch spells without element', () => {
    const item = mapSpell({
      name: 'Test Mend',
      descriptor: 'Essence',
      category: 'Health',
      type: 'M',
      range: 'T',
      damage: '0',
      duration: 'P',
      dv: '(F/2)-2',
    });
    expect(item.system).toMatchObject({
      type: 'MANA',
      combatType: 'DIRECT',
      range: 'TOUCH',
      area: false,
      element: '',
      duration: 'PERMANENT',
      dv: -2,
    });
  });

  it('detects (Limited) suffix and strips it from the name', () => {
    const item = mapSpell({
      name: 'Test Truth (Limited)',
      descriptors: 'Active, Directional',
      category: 'Detection',
      type: 'M',
      range: 'T',
      damage: '',
      duration: 'S',
      dv: '(F/2)',
    });
    expect(item.name).toBe('Test Truth');
    expect(item.system.limited).toBe(true);
  });

  it('sets limited to false for regular spells', () => {
    const item = mapSpell({
      name: 'Test Bolt',
      descriptor: 'Direct',
      category: 'Combat',
      type: 'M',
      range: 'LOS',
      damage: 'P',
      duration: 'I',
      dv: '(F/2)',
    });
    expect(item.name).toBe('Test Bolt');
    expect(item.system.limited).toBe(false);
  });

  it.each([
    ['Test Environment Area', 'Environmental, Area', false],
    ['Test Environment', 'Environmental', false],
    ['Test Mind', 'Mental', true],
    ['Test Mind Area', 'Mental, Area', true],
  ])(
    'flags manipulation spell %s (%s) as opposed=%s',
    (name, descriptor, expected) => {
      const item = mapSpell({
        name,
        descriptor,
        category: 'Manipulation',
        type: 'M',
        range: 'LOS',
        damage: '',
        duration: 'S',
        dv: '(F/2)',
      });
      expect(item.system.opposed).toBe(expected);
    }
  );
});

describe('parseMount', () => {
  it.each([
    ['Top', 'top'],
    ['Barrel', 'barrel'],
    ['Under', 'under'],
    ['Top/Under', 'top'],
    ['', 'internal'],
    [undefined, 'internal'],
  ])('%s -> %s', (raw, expected) => {
    expect(parseMount(raw)).toBe(expected);
  });
});

describe('weapon mod mapper', () => {
  it.each([
    {
      label: 'accessory with mount and recoil compensation',
      input: {
        name: 'Test Bipod',
        mount: 'Under',
        rc: '(1)',
        avail: '3',
        cost: '150',
        source: 'TST',
        page: '11',
      },
      system: { mount: 'under', rcBonus: 1, slotCost: 1, cost: 150, avail: 3 },
    },
    {
      label: 'weapon mod with slots and category',
      input: {
        name: 'Test Firing Mod',
        category: 'Weapon Mod',
        rating: '0',
        slots: '3',
        rc: '2',
        avail: '8R',
        cost: '900',
      },
      system: {
        mount: 'internal',
        rcBonus: 2,
        slotCost: 3,
        availability: '8R',
      },
    },
  ])('maps $label', ({ input, system }) => {
    const item = mapWeaponMod(input);
    expect(item.type).toBe('Weapon Mod');
    expect(item.system).toMatchObject(system);
  });

  it('flags smartgun accessories as granting smartlink', () => {
    expect(
      mapWeaponMod({ name: 'Smartgun System, Internal' }).system.grantsSmartlink
    ).toBe(true);
    expect(mapWeaponMod({ name: 'Test Bipod' }).system.grantsSmartlink).toBe(
      false
    );
  });
});

describe('mod dispatch', () => {
  it.each([
    {
      label: 'routes armor mods by armorcapacity',
      input: {
        name: 'Test Armor Mod',
        category: 'General',
        b: '0',
        i: '0',
        maxrating: '1',
        armorcapacity: '[3]',
        avail: '5',
        cost: '1200',
      },
      type: 'Armor Mod',
      system: { capacityCost: 3, ballisticBonus: 0, impactBonus: 0, rating: 1 },
    },
    {
      label: 'routes "Weapon Mod" category to weapon mods',
      input: {
        name: 'Test Vent Mod',
        category: 'Weapon Mod',
        slots: '2',
        rc: '2',
        avail: '7F',
        cost: '500',
      },
      type: 'Weapon Mod',
      system: { rcBonus: 2 },
    },
    {
      label:
        'routes remaining mods to vehicle mods and resolves rating bonuses',
      input: {
        name: 'Test Vehicle Armor',
        category: 'All',
        rating: '15',
        slots: '1',
        avail: '6R',
        cost: 'Rating * 150',
        bonus: { armor: 'Rating' },
      },
      type: 'Vehicle Mod',
      system: { armorBonus: 15, slotCost: 1, rating: 15 },
    },
    {
      label: 'reads a flat vehicle handling bonus from the bonus block',
      input: {
        name: 'Test Suspension',
        category: 'Standard',
        rating: '0',
        slots: '1',
        bonus: { handling: '2' },
      },
      type: 'Vehicle Mod',
      system: { handlingBonus: 2 },
    },
  ])('$label', ({ input, type, system }) => {
    const item = mapMod(input);
    expect(item.type).toBe(type);
    expect(item.system).toMatchObject(system);
  });
});

describe('critter skills', () => {
  it('maps a collapsed same-tag skill array with force ratings and specs', () => {
    const critter = mapCritter({
      name: 'Test Spirit',
      category: 'Spirits',
      skills: [
        { '#text': 'Assensing', rating: 'F' },
        { '#text': 'Unarmed Combat', rating: 'F', spec: 'Grapple' },
        'Dodge',
      ],
    });
    expect(critter.system.skills).toEqual([
      { name: 'Assensing', rating: 0, ratingFormula: 'F', spec: '' },
      {
        name: 'Unarmed Combat',
        rating: 0,
        ratingFormula: 'F',
        spec: 'Grapple',
      },
      { name: 'Dodge', rating: 0, ratingFormula: '', spec: '' },
    ]);
  });

  it('maps mixed skill/group containers including repeated skills', () => {
    const critter = mapCritter({
      name: 'Test Beast',
      category: 'Mundane Critters',
      skills: {
        skill: [
          { '#text': 'Infiltration', rating: '2' },
          { '#text': 'Tracking', rating: '5' },
        ],
        group: 'Athletics',
      },
    });
    expect(critter.system.skills).toEqual([
      { name: 'Infiltration', rating: 2, ratingFormula: '', spec: '' },
      { name: 'Tracking', rating: 5, ratingFormula: '', spec: '' },
      { name: 'Athletics', rating: 0, ratingFormula: '', spec: '' },
    ]);
  });

  it('ignores force formulas for non-force-based critters', () => {
    const critter = mapCritter({
      name: 'Test Paranormal Beast',
      category: 'Paranormal Critters',
      skills: [{ '#text': 'Dodge', rating: '3' }],
    });
    expect(critter.system.skills).toEqual([
      { name: 'Dodge', rating: 3, ratingFormula: '', spec: '' },
    ]);
  });
});

describe('implant essence reverse-calc', () => {
  it('reverses grade and quality to recover the base essence', () => {
    const item = mapCyberware(
      { name: 'Test Reflex Ware', ess: '2.7', grade: 'Standard' },
      undefined,
      { biocompatibility: 'CYBERWARE' }
    );
    expect(item.system.essence).toBe(3);
    expect(item.system.grade).toBe('STANDARD');
  });

  it('recognizes the Chummer "…ware" grade suffix and reverses it', () => {
    const item = mapCyberware(
      { name: 'Test Eye Ware', ess: '0.144', grade: 'Alphaware' },
      undefined,
      { biocompatibility: 'CYBERWARE' }
    );
    expect(item.system.grade).toBe('ALPHA');
    // 0.144 / (0.8 * 0.9) = 0.2
    expect(item.system.essence).toBe(0.2);
  });

  it('does not reverse the quality for a non-matching implant type', () => {
    const item = mapBioware(
      { name: 'Test Joint Ware', ess: '0.32', grade: 'Alphaware' },
      undefined,
      { biocompatibility: 'CYBERWARE' }
    );
    // bioware unaffected by cyberware biocompatibility: 0.32 / 0.8 = 0.4
    expect(item.system.essence).toBe(0.4);
  });

  it('stays a no-op without modifiers', () => {
    const item = mapCyberware({ name: 'X', ess: '0.3', grade: 'Standard' });
    expect(item.system.essence).toBe(0.3);
  });
});

describe('resolveEssenceModifiers', () => {
  it('detects English and German biocompatibility with the type from parens', () => {
    expect(
      resolveEssenceModifiers([{ name: 'Biocompatability (Cyberware)' }])
    ).toEqual({ biocompatibility: 'CYBERWARE', sensitiveSystem: false });
    expect(
      resolveEssenceModifiers([{ name: 'Biokompatibilität (Cyberware)' }])
    ).toEqual({ biocompatibility: 'CYBERWARE', sensitiveSystem: false });
    expect(
      resolveEssenceModifiers([{ name: 'Biocompatibility (Bioware)' }])
    ).toEqual({ biocompatibility: 'BIOWARE', sensitiveSystem: false });
  });

  it('detects sensitive system in both languages', () => {
    expect(resolveEssenceModifiers([{ name: 'Sensitive System' }])).toEqual({
      biocompatibility: '',
      sensitiveSystem: true,
    });
    expect(resolveEssenceModifiers([{ name: 'Empfindliches System' }])).toEqual(
      { biocompatibility: '', sensitiveSystem: true }
    );
  });

  it('does not false-positive on unrelated qualities', () => {
    expect(
      resolveEssenceModifiers([
        { name: 'Weak Immune System' },
        { name: 'Schwaches Immunsystem' },
        { name: 'Restlichtverstärkung' },
      ])
    ).toEqual({ biocompatibility: '', sensitiveSystem: false });
    expect(resolveEssenceModifiers()).toEqual({
      biocompatibility: '',
      sensitiveSystem: false,
    });
  });
});

describe('mapQuality Exceptional Attribute', () => {
  it('embeds an attribute maximum effect for an English abbreviation', () => {
    const item = mapQuality({ name: 'Exceptional Attribute (BOD)' });
    expect(item.effects).toEqual([
      {
        name: 'Exceptional Attribute (BOD)',
        img: 'icons/svg/upgrade.svg',
        changes: [
          {
            key: 'system.modifiers.attributeMaximum.BODY',
            type: 'add',
            value: '1',
          },
        ],
        disabled: false,
        transfer: true,
      },
    ]);
  });

  it('resolves the German name and abbreviation', () => {
    const item = mapQuality({ name: 'Außergewöhnliches Attribut (KON)' });
    expect(item.effects).toHaveLength(1);
    expect(item.effects[0].changes[0].key).toBe(
      'system.modifiers.attributeMaximum.BODY'
    );
  });

  it('accepts a full attribute key in parentheses', () => {
    const item = mapQuality({ name: 'Exceptional Attribute (WILLPOWER)' });
    expect(item.effects[0].changes[0].key).toBe(
      'system.modifiers.attributeMaximum.WILLPOWER'
    );
  });

  it.each([
    { label: 'unknown token', name: 'Exceptional Attribute (XYZ)' },
    { label: 'catalog form without parens', name: 'Exceptional Attribute' },
    {
      label: 'unparenthesized suffix',
      name: 'Exceptional Attribute Something',
    },
  ])('imports the quality without effects for $label', ({ name }) => {
    const item = mapQuality({ name });
    expect(item.effects).toBeUndefined();
    expect(item.type).toBe('Quality');
  });
});
