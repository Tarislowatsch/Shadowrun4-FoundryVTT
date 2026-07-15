import { describe, it, expect } from 'vitest';
import { buildCritterActorData } from '@importer/build-critter.js';

describe('buildCritterActorData', () => {
  it('builds a spirit actor from a force-based template', async () => {
    const template = {
      category: 'Spirits',
      forceBased: true,
      actorType: 'spirit',
      attributes: {
        body: { value: 0, formula: 'F+1' },
        agility: { value: 0, formula: 'F+2' },
        reaction: { value: 0, formula: 'F+3' },
        strength: { value: 0, formula: 'F-2' },
        charisma: { value: 0, formula: 'F' },
        intuition: { value: 0, formula: 'F' },
        logic: { value: 0, formula: 'F' },
        willpower: { value: 0, formula: 'F' },
        initiative: { value: 0, formula: '(F*2)+3' },
        edge: { value: 0, formula: 'F' },
        magic: { value: 0, formula: 'F' },
        resonance: { value: 0, formula: '' },
        essence: { value: 0, formula: '' },
      },
      powers: ['Accident', 'Engulf', 'Materialization'],
    };

    const data = await buildCritterActorData(template, 'Spirit of Fire', 5);

    expect(data.type).toBe('spirit');
    expect(data.name).toBe('Spirit of Fire');
    expect(data.system.force).toBe(5);
    expect(data.system.spiritType).toBe('Spirits');
    expect(data.system.sheetStats.BODY).toBe(6);
    expect(data.system.sheetStats.AGILITY).toBe(7);
    expect(data.system.sheetStats.REACTION).toBe(8);
    expect(data.system.sheetStats.STRENGTH).toBe(3);
    expect(data.system.sheetStats.INITIATIVE).toBe(13);
    expect(data.items).toHaveLength(3);
    expect(data.items[0].type).toBe('CritterPower');
  });

  it('builds a sprite actor from a force-based template', async () => {
    const template = {
      category: 'Sprites',
      forceBased: true,
      actorType: 'sprite',
      attributes: {
        body: { value: 0, formula: '' },
        agility: { value: 0, formula: '' },
        reaction: { value: 0, formula: '' },
        strength: { value: 0, formula: '' },
        charisma: { value: 0, formula: 'F' },
        intuition: { value: 0, formula: 'F+2' },
        logic: { value: 0, formula: 'F+1' },
        willpower: { value: 0, formula: '' },
        initiative: { value: 0, formula: '(F*3)' },
        edge: { value: 0, formula: 'F' },
        magic: { value: 0, formula: '' },
        resonance: { value: 0, formula: 'F' },
        essence: { value: 0, formula: '' },
      },
      powers: ['Electron Storm'],
    };

    const data = await buildCritterActorData(template, 'Fault Sprite', 4);

    expect(data.type).toBe('sprite');
    expect(data.system.rating).toBe(4);
    expect(data.system.spriteType).toBe('Sprites');
    expect(data.system.sheetStats.INTUITION).toBe(6);
    expect(data.system.sheetStats.LOGIC).toBe(5);
  });

  it('builds an npc actor from a fixed-stat template', async () => {
    const template = {
      category: 'Mundane Critters',
      forceBased: false,
      actorType: 'npc',
      attributes: {
        body: { value: 2, formula: '' },
        agility: { value: 3, formula: '' },
        reaction: { value: 3, formula: '' },
        strength: { value: 2, formula: '' },
        charisma: { value: 3, formula: '' },
        intuition: { value: 3, formula: '' },
        logic: { value: 1, formula: '' },
        willpower: { value: 3, formula: '' },
        initiative: { value: 2, formula: '' },
        edge: { value: 3, formula: '' },
        magic: { value: 0, formula: '' },
        resonance: { value: 0, formula: '' },
        essence: { value: 0, formula: '' },
      },
      powers: ['Enhanced Senses', 'Natural Weapon'],
    };

    const data = await buildCritterActorData(template, 'Dog', null);

    expect(data.type).toBe('npc');
    expect(data.system.sheetStats.BODY).toBe(2);
    expect(data.system.sheetStats.AGILITY).toBe(3);
    expect(data.items).toHaveLength(2);
  });

  it('force-based critter templates use the provided force value', async () => {
    const template = {
      category: 'Spirits',
      forceBased: true,
      actorType: 'spirit',
      attributes: {
        body: { value: 0, formula: '' },
        agility: { value: 0, formula: '' },
        reaction: { value: 0, formula: '' },
        strength: { value: 0, formula: '' },
        charisma: { value: 0, formula: '' },
        intuition: { value: 0, formula: '' },
        logic: { value: 0, formula: '' },
        willpower: { value: 0, formula: '' },
        initiative: { value: 0, formula: '' },
        edge: { value: 0, formula: '' },
        magic: { value: 0, formula: '' },
        resonance: { value: 0, formula: '' },
        essence: { value: 0, formula: '' },
      },
      powers: ['Astral Form', 'Search'],
    };

    const data = await buildCritterActorData(template, 'Watcher Spirit', 1);

    expect(data.type).toBe('spirit');
    expect(data.system.force).toBe(1);
  });

  const skillTemplate = (actorType, skills) => ({
    category: actorType === 'sprite' ? 'Sprites' : 'Spirits',
    forceBased: true,
    actorType,
    attributes: {},
    powers: [],
    skills,
  });

  it('creates skill items from template skills without a compendium', async () => {
    const template = skillTemplate('spirit', [
      { name: 'Assensing', rating: 0, ratingFormula: 'F', spec: '' },
      { name: 'Unarmed Combat', rating: 0, ratingFormula: 'F+2', spec: '' },
      { name: 'Perception', rating: 3, ratingFormula: '', spec: 'Visual' },
    ]);

    const data = await buildCritterActorData(template, 'Spirit of Man', 4);

    const skills = data.items.filter((i) => i.type === 'Skill');
    expect(skills).toHaveLength(3);
    expect(skills[0]).toMatchObject({
      name: 'Assensing',
      system: { rating: 4, ratingFormula: 'F' },
    });
    expect(skills[1]).toMatchObject({
      name: 'Unarmed Combat',
      system: { rating: 6, ratingFormula: 'F+2' },
    });
    expect(skills[2]).toMatchObject({
      name: 'Perception',
      system: { rating: 3, ratingFormula: '', specialization: 'Visual' },
    });
  });

  it('creates skill items for sprites using the compile rating', async () => {
    const template = skillTemplate('sprite', [
      { name: 'Computer', rating: 0, ratingFormula: 'F', spec: '' },
    ]);

    const data = await buildCritterActorData(template, 'Data Sprite', 3);

    const skills = data.items.filter((i) => i.type === 'Skill');
    expect(skills).toHaveLength(1);
    expect(skills[0]).toMatchObject({
      name: 'Computer',
      system: { rating: 3, ratingFormula: 'F' },
    });
  });

  it('enriches skill items with compendium data and expands groups', async () => {
    const compendiumDocs = [
      {
        name: 'Assensing',
        toObject: () => ({
          name: 'Assensing',
          img: 'icons/assensing.png',
          system: {
            attribute: 'INTUITION',
            category: 'magic',
            group: '',
            label: 'sr4.skills.assensing',
          },
        }),
      },
      {
        name: 'Pistols',
        toObject: () => ({
          name: 'Pistols',
          system: { attribute: 'AGILITY', group: 'firearms' },
        }),
      },
      {
        name: 'Automatics',
        toObject: () => ({
          name: 'Automatics',
          system: { attribute: 'AGILITY', group: 'firearms' },
        }),
      },
    ];
    globalThis.game.packs = {
      get: (id) =>
        id === 'shadowrun4e.skills'
          ? { getDocuments: async () => compendiumDocs }
          : undefined,
    };

    try {
      const template = skillTemplate('spirit', [
        { name: 'Assensing', rating: 0, ratingFormula: 'F', spec: '' },
        { name: 'Firearms', rating: 0, ratingFormula: 'F', spec: '' },
      ]);

      const data = await buildCritterActorData(template, 'Spirit of Man', 5);

      const skills = data.items.filter((i) => i.type === 'Skill');
      expect(skills.map((s) => s.name)).toEqual([
        'Assensing',
        'Pistols',
        'Automatics',
      ]);
      expect(skills[0]).toMatchObject({
        img: 'icons/assensing.png',
        system: {
          attribute: 'INTUITION',
          category: 'magic',
          label: 'sr4.skills.assensing',
          rating: 5,
          ratingFormula: 'F',
        },
      });
      expect(skills[1].system).toMatchObject({
        attribute: 'AGILITY',
        rating: 5,
        ratingFormula: 'F',
      });
    } finally {
      delete globalThis.game.packs;
    }
  });
});
