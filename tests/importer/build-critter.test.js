import { describe, it, expect } from 'vitest';
import { buildCritterActorData } from '@importer/build-critter.js';

describe('buildCritterActorData', () => {
  it('builds a spirit actor from a force-based template', () => {
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

    const data = buildCritterActorData(template, 'Spirit of Fire', 5);

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

  it('builds a sprite actor from a force-based template', () => {
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

    const data = buildCritterActorData(template, 'Fault Sprite', 4);

    expect(data.type).toBe('sprite');
    expect(data.system.rating).toBe(4);
    expect(data.system.spriteType).toBe('Sprites');
    expect(data.system.sheetStats.INTUITION).toBe(6);
    expect(data.system.sheetStats.LOGIC).toBe(5);
  });

  it('builds an npc actor from a fixed-stat template', () => {
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

    const data = buildCritterActorData(template, 'Dog', null);

    expect(data.type).toBe('npc');
    expect(data.system.sheetStats.BODY).toBe(2);
    expect(data.system.sheetStats.AGILITY).toBe(3);
    expect(data.items).toHaveLength(2);
  });

  it('Watcher Spirit uses Force 1', () => {
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

    const data = buildCritterActorData(template, 'Watcher Spirit', 1);

    expect(data.type).toBe('spirit');
    expect(data.system.force).toBe(1);
  });
});
