import { describe, it, expect } from 'vitest';
import { mapCritter, mapCritterVariant } from '@importer/mappers/index.js';

describe('mapCritter', () => {
  it('maps a fixed-stat mundane critter', () => {
    const item = mapCritter({
      name: 'Dog',
      category: 'Mundane Critters',
      bp: '0',
      bodmin: '2',
      bodmax: '2',
      bodaug: '2',
      agimin: '3',
      agimax: '3',
      agiaug: '3',
      reamin: '3',
      reamax: '3',
      reaaug: '3',
      strmin: '2',
      strmax: '2',
      straug: '2',
      chamin: '3',
      chamax: '3',
      chaaug: '3',
      intmin: '3',
      intmax: '3',
      intaug: '3',
      logmin: '1',
      logmax: '1',
      logaug: '1',
      wilmin: '3',
      wilmax: '3',
      wilaug: '3',
      inimin: '2',
      inimax: '12',
      iniaug: '18',
      edgmin: '3',
      edgmax: '3',
      edgaug: '6',
      magmin: '0',
      magmax: '6',
      magaug: '6',
      resmin: '0',
      resmax: '6',
      resaug: '6',
      essmin: '0',
      essmax: '6',
      essaug: '6',
      movement: '10/45',
      source: 'SR4',
      page: '299',
    });

    expect(item.type).toBe('CritterTemplate');
    expect(item.system.category).toBe('Mundane Critters');
    expect(item.system.forceBased).toBe(false);
    expect(item.system.actorType).toBe('npc');
    expect(item.system.attributes.body).toEqual({ value: 2, formula: '' });
    expect(item.system.attributes.agility).toEqual({ value: 3, formula: '' });
    expect(item.system.movement).toBe('10/45');
  });

  it('maps a force-based spirit with formula attributes', () => {
    const item = mapCritter({
      name: 'Spirit of Fire',
      category: 'Spirits',
      bp: '0',
      bodmin: 'F+1',
      bodmax: 'F+1',
      bodaug: 'F+1',
      agimin: 'F+2',
      agimax: 'F+2',
      agiaug: 'F+2',
      reamin: 'F+3',
      reamax: 'F+3',
      reaaug: 'F+3',
      strmin: 'F-2',
      strmax: 'F-2',
      straug: 'F-2',
      chamin: 'F',
      chamax: 'F',
      chaaug: 'F',
      intmin: 'F',
      intmax: 'F',
      intaug: 'F',
      logmin: 'F',
      logmax: 'F',
      logaug: 'F',
      wilmin: 'F',
      wilmax: 'F',
      wilaug: 'F',
      inimin: '(F*2)+3',
      inimax: '(F*2)+3',
      iniaug: '(F*2)+3',
      edgmin: 'F',
      edgmax: 'F',
      edgaug: 'F',
      magmin: 'F',
      magmax: 'F',
      magaug: 'F',
      resmin: '0',
      resmax: '6',
      resaug: '6',
      essmin: '0',
      essmax: '6',
      essaug: '6',
      movement: 'Fly 15/40',
      source: 'SR4',
      page: '303',
    });

    expect(item.type).toBe('CritterTemplate');
    expect(item.system.forceBased).toBe(true);
    expect(item.system.actorType).toBe('spirit');
    expect(item.system.attributes.body).toEqual({ value: 0, formula: 'F+1' });
    expect(item.system.attributes.strength).toEqual({
      value: 0,
      formula: 'F-2',
    });
    expect(item.system.attributes.initiative).toEqual({
      value: 0,
      formula: '(F*2)+3',
    });
    expect(item.system.attributes.resonance).toEqual({
      value: 0,
      formula: '',
    });
  });

  it('maps a sprite category to sprite actorType', () => {
    const item = mapCritter({
      name: 'Fault Sprite',
      category: 'Sprites',
      bp: '0',
      bodmin: '0',
      agimin: 'F+2',
      reamin: 'F+2',
      strmin: '0',
      chamin: 'F',
      intmin: 'F+2',
      logmin: 'F+1',
      wilmin: '0',
      inimin: '(F*3)',
      edgmin: 'F',
      magmin: '0',
      resmin: 'F',
      essmin: '0',
      source: 'SR4',
      page: '242',
    });

    expect(item.system.actorType).toBe('sprite');
    expect(item.system.forceBased).toBe(true);
  });

  it('parses powers from critter record', () => {
    const item = mapCritter({
      name: 'Barghest',
      category: 'Paranormal Critters',
      bodmin: '7',
      agimin: '5',
      reamin: '6',
      strmin: '5',
      chamin: '3',
      intmin: '3',
      logmin: '1',
      wilmin: '3',
      inimin: '4',
      edgmin: '4',
      magmin: '4',
      resmin: '0',
      essmin: '0',
      powers: {
        power: ['Enhanced Senses', 'Fear', 'Natural Weapon', 'Paralyzing Howl'],
      },
      source: 'SR4',
      page: '299',
    });

    expect(item.system.powers).toEqual([
      'Enhanced Senses',
      'Fear',
      'Natural Weapon',
      'Paralyzing Howl',
    ]);
  });
});

describe('mapCritterVariant', () => {
  it('inherits parent attributes and overrides variant-specific data', () => {
    const parent = {
      name: 'Caretaker Spirit',
      category: 'Insect Spirits',
      bp: '0',
      bodmin: 'F+2',
      agimin: 'F+1',
      reamin: 'F+1',
      strmin: 'F',
      chamin: 'F',
      intmin: 'F',
      logmin: 'F',
      wilmin: 'F',
      inimin: '(F*2)+1',
      edgmin: 'F',
      magmin: 'F',
      resmin: '0',
      essmin: '0',
      movement: '10/45',
      source: 'SM',
      page: '152',
      powers: { power: ['Animal Control', 'Hive Mind'] },
    };

    const variant = {
      name: 'Ant',
      bp: '0',
      powers: { power: ['Elemental Attack', 'Hive Mind'] },
      source: 'SM',
      page: '150',
    };

    const item = mapCritterVariant(variant, parent);

    expect(item.name).toBe('Ant');
    expect(item.system.baseTemplate).toBe('Caretaker Spirit');
    expect(item.system.actorType).toBe('spirit');
    expect(item.system.forceBased).toBe(true);
    expect(item.system.attributes.body).toEqual({ value: 0, formula: 'F+2' });
    expect(item.system.powers).toEqual(['Elemental Attack', 'Hive Mind']);
  });
});
