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
  parseMount,
} from '@importer/mappers/index.js';

describe('simple mappers', () => {
  it.each([
    {
      label: 'power: leveled -> rated with per-level cost',
      map: mapPower,
      input: {
        name: 'Improved Reflexes',
        points: '1.5',
        levels: 'yes',
        source: 'SR4',
        page: '195',
      },
      type: 'Power',
      system: { cost: 1.5, ratingMode: 'rated', rating: 1, geas: false },
    },
    {
      label: 'power: flat -> none with fractional cost',
      map: mapPower,
      input: { name: 'Analytics', points: '.25', levels: 'no' },
      type: 'Power',
      system: { cost: 0.25, ratingMode: 'none' },
    },
    {
      label: 'cyberware: essence, grade and resolved cost',
      map: mapCyberware,
      input: {
        name: 'Attention Coprocessor',
        category: 'Headware',
        rating: '3',
        ess: '0.3',
        capacity: '0',
        avail: '8',
        cost: 'Rating * 3000',
        source: 'AU',
        page: '36',
      },
      type: 'Implant',
      system: {
        essence: 0.3,
        essenceActual: 0.3,
        grade: 'standard',
        type: 'cyberware',
        rating: 3,
        cost: 3000,
        avail: 8,
      },
    },
    {
      label: 'bioware: implant type bioware',
      map: mapBioware,
      input: {
        name: 'Muscle Augmentation',
        category: 'Basic',
        ess: 'Rating * 0.2',
        source: 'SR4',
        page: '342',
      },
      type: 'Implant',
      system: { type: 'bioware', essence: 0.2 },
    },
    {
      label: 'armor: ballistic and impact values',
      map: mapArmor,
      input: {
        name: 'Armor Vest',
        b: '6',
        i: '4',
        armorcapacity: '0',
        avail: '4',
        cost: '600',
        source: 'SR4',
        page: '326',
      },
      type: 'Armor',
      system: {
        ballisticarmor: 6,
        impactarmor: 4,
        stackingType: 'standard',
        cost: 600,
        avail: 4,
      },
    },
    {
      label: 'armor: helmet maps to accessory stackingType',
      map: mapArmor,
      input: {
        name: 'Helmet',
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
        name: 'Riot Shield',
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
        name: 'Form-Fitting Body Armor Full Suit',
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
        name: 'Analyze',
        category: 'Common Use',
        complexform: 'yes',
        source: 'SR4',
        page: '232',
      },
      type: 'Program',
      system: { category: 'Common Use', complexform: true },
    },
    {
      label: 'quality: category, bp and source',
      map: mapQuality,
      input: {
        name: 'Ambidextrous',
        bp: '5',
        category: 'Positive',
        source: 'SR4',
        page: '90',
      },
      type: 'Quality',
      system: { category: 'Positive', bp: 5, limit: null, source: 'SR4 p. 90' },
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
      input: { name: 'Allergy', bp: '10', category: 'Negative' },
      type: 'Quality',
      system: { category: 'Negative' },
    },
    {
      label: 'quality: reads Chummer qualitytype field',
      map: mapQuality,
      input: { name: 'Bad Luck', bp: '20', qualitytype: 'Negative' },
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
        source: 'SR4',
        page: '125',
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
  it('maps a melee weapon with attack skill and reach', () => {
    const item = mapMeleeWeapon({
      name: 'Combat Axe',
      category: 'Blades',
      type: 'Melee',
      reach: '2',
      damage: '(STR/2+5)P',
      ap: '-4',
      source: 'AR',
      page: '16',
    });
    expect(item.type).toBe('Melee Weapon');
    expect(item.system).toMatchObject({
      attackSkill: 'BLADES',
      reach: 2,
      ap: -4,
      damage: 5,
      damageType: 'PHYSICAL',
      noStrengthBonus: false,
    });
  });

  it('maps a ranged weapon with ammo and mode', () => {
    const item = mapRangedWeapon({
      name: 'Ares Predator',
      category: 'Heavy Pistols',
      type: 'Ranged',
      damage: '5P',
      ap: '-1',
      mode: 'SA',
      rc: '0',
      ammo: '15(c)',
      source: 'SR4',
      page: '316',
    });
    expect(item.type).toBe('Ranged Weapon');
    expect(item.system).toMatchObject({
      attackSkill: 'PISTOLS',
      damage: 5,
      ap: -1,
      mode: 'SA',
      maxAmmo: 15,
      currentAmmo: 15,
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

  it('maps APDS (ap bonus) as Ammo with correct sign', () => {
    const item = mapGear({
      name: 'Ammo: APDS',
      category: 'Ammunition',
      weaponbonus: { ap: '-4' },
    });
    expect(item.type).toBe('Ammo');
    expect(item.system).toMatchObject({
      apBonus: -4,
      damageBonus: 0,
      damageOverride: null,
      damageTypeOverride: '',
    });
  });

  it('maps Gel Rounds (damage/ap/type) as Ammo', () => {
    const item = mapGear({
      name: 'Ammo: Gel Rounds',
      category: 'Ammunition',
      weaponbonus: { ap: '2', damage: '-1', damagetype: 'S' },
    });
    expect(item.system).toMatchObject({
      apBonus: 2,
      damageBonus: -1,
      damageTypeOverride: 'STUN',
    });
  });

  it('maps Flechette (P(f) stays physical) as Ammo', () => {
    const item = mapGear({
      name: 'Ammo: Flechette Rounds',
      category: 'Ammunition',
      weaponbonus: { ap: '5', damage: '2', damagetype: 'P(f)' },
    });
    expect(item.system.damageTypeOverride).toBe('PHYSICAL');
  });

  it('maps Stick-n-Shock damagereplace as absolute override', () => {
    const item = mapGear({
      name: 'Ammo: Stick-n-Shock',
      category: 'Ammunition',
      weaponbonus: { apreplace: '-half', damagereplace: '6S(e)' },
    });
    expect(item.system).toMatchObject({
      damageOverride: 6,
      damageTypeOverride: 'ELECTRICITY',
    });
  });
});

describe('spell mapper', () => {
  it('maps combat type, range area and drain', () => {
    const item = mapSpell({
      name: 'Ball Lightning',
      descriptor: 'Indirect, Elemental, Area',
      category: 'Combat',
      type: 'P',
      range: 'LOS (A)',
      damage: 'P',
      duration: 'I',
      dv: '(F/2)+5',
      source: 'SR4',
      page: '205',
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
      dv: 5,
      damageType: 'PHYSICAL',
    });
  });

  it('maps mana touch spells without element', () => {
    const item = mapSpell({
      name: 'Heal',
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
  it('maps an accessory with mount and recoil compensation', () => {
    const item = mapWeaponMod({
      name: 'Bipod',
      mount: 'Under',
      rc: '(2)',
      avail: '2',
      cost: '100',
      source: 'SR4',
      page: '322',
    });
    expect(item.type).toBe('Weapon Mod');
    expect(item.system).toMatchObject({
      mount: 'under',
      rcBonus: 2,
      slotCost: 1,
      cost: 100,
      avail: 2,
    });
  });

  it('maps a weapon mod with slots and category', () => {
    const item = mapWeaponMod({
      name: 'Electronic Firing',
      category: 'Weapon Mod',
      rating: '0',
      slots: '2',
      rc: '1',
      avail: '10R',
      cost: '1000',
    });
    expect(item.system).toMatchObject({
      mount: 'internal',
      rcBonus: 1,
      slotCost: 2,
      availability: '10R',
    });
  });

  it('flags smartgun accessories as granting smartlink', () => {
    expect(
      mapWeaponMod({ name: 'Smartgun System, Internal' }).system.grantsSmartlink
    ).toBe(true);
    expect(mapWeaponMod({ name: 'Bipod' }).system.grantsSmartlink).toBe(false);
  });
});

describe('mod dispatch', () => {
  it('routes armor mods by armorcapacity', () => {
    const item = mapMod({
      name: 'Auto-Injector',
      category: 'General',
      b: '0',
      i: '0',
      maxrating: '1',
      armorcapacity: '[2]',
      avail: '4',
      cost: '1500',
    });
    expect(item.type).toBe('Armor Mod');
    expect(item.system).toMatchObject({
      capacityCost: 2,
      ballisticBonus: 0,
      impactBonus: 0,
      rating: 1,
    });
  });

  it('routes "Weapon Mod" category to weapon mods', () => {
    const item = mapMod({
      name: 'Gas-Vent 3 System',
      category: 'Weapon Mod',
      slots: '3',
      rc: '3',
      avail: '9F',
      cost: '600',
    });
    expect(item.type).toBe('Weapon Mod');
    expect(item.system.rcBonus).toBe(3);
  });

  it('routes remaining mods to vehicle mods and resolves rating bonuses', () => {
    const item = mapMod({
      name: 'Armor, Normal',
      category: 'All',
      rating: '20',
      slots: '1',
      avail: '6R',
      cost: 'Rating * 200',
      bonus: { armor: 'Rating' },
    });
    expect(item.type).toBe('Vehicle Mod');
    expect(item.system).toMatchObject({
      armorBonus: 20,
      slotCost: 1,
      rating: 20,
    });
  });

  it('reads a flat vehicle handling bonus from the bonus block', () => {
    const item = mapMod({
      name: 'Off-Road Suspension',
      category: 'Standard',
      rating: '0',
      slots: '1',
      bonus: { handling: '1' },
    });
    expect(item.type).toBe('Vehicle Mod');
    expect(item.system.handlingBonus).toBe(1);
  });
});
