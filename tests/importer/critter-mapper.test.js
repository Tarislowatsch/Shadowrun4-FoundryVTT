import { describe, it, expect } from 'vitest';
import { mapCritter, mapCritterVariant } from '@importer/mappers/index.js';

describe('mapCritter', () => {
  it('maps a fixed-stat mundane critter', () => {
    const item = mapCritter({
      name: 'Test Beast',
      category: 'Mundane Critters',
      bp: '0',
      bodmin: '4',
      bodmax: '4',
      bodaug: '4',
      agimin: '5',
      agimax: '5',
      agiaug: '5',
      reamin: '2',
      reamax: '2',
      reaaug: '2',
      strmin: '4',
      strmax: '4',
      straug: '4',
      chamin: '2',
      chamax: '2',
      chaaug: '2',
      intmin: '4',
      intmax: '4',
      intaug: '4',
      logmin: '2',
      logmax: '2',
      logaug: '2',
      wilmin: '2',
      wilmax: '2',
      wilaug: '2',
      inimin: '3',
      inimax: '11',
      iniaug: '17',
      edgmin: '2',
      edgmax: '2',
      edgaug: '5',
      magmin: '0',
      magmax: '6',
      magaug: '6',
      resmin: '0',
      resmax: '6',
      resaug: '6',
      essmin: '0',
      essmax: '6',
      essaug: '6',
      movement: '12/40',
      source: 'TST',
      page: '1',
    });

    expect(item.type).toBe('CritterTemplate');
    expect(item.system.category).toBe('Mundane Critters');
    expect(item.system.forceBased).toBe(false);
    expect(item.system.actorType).toBe('npc');
    expect(item.system.attributes.body).toEqual({ value: 4, formula: '' });
    expect(item.system.attributes.agility).toEqual({ value: 5, formula: '' });
    expect(item.system.movement).toBe('12/40');
  });

  it('maps a force-based spirit with formula attributes', () => {
    const item = mapCritter({
      name: 'Test Spirit',
      category: 'Spirits',
      bp: '0',
      bodmin: 'F+3',
      bodmax: 'F+3',
      bodaug: 'F+3',
      agimin: 'F+1',
      agimax: 'F+1',
      agiaug: 'F+1',
      reamin: 'F+2',
      reamax: 'F+2',
      reaaug: 'F+2',
      strmin: 'F-1',
      strmax: 'F-1',
      straug: 'F-1',
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
      inimin: '(F*2)+2',
      inimax: '(F*2)+2',
      iniaug: '(F*2)+2',
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
      movement: 'Fly 12/30',
      source: 'TST',
      page: '2',
    });

    expect(item.type).toBe('CritterTemplate');
    expect(item.system.forceBased).toBe(true);
    expect(item.system.actorType).toBe('spirit');
    expect(item.system.attributes.body).toEqual({ value: 0, formula: 'F+3' });
    expect(item.system.attributes.strength).toEqual({
      value: 0,
      formula: 'F-1',
    });
    expect(item.system.attributes.initiative).toEqual({
      value: 0,
      formula: '(F*2)+2',
    });
    expect(item.system.attributes.resonance).toEqual({
      value: 0,
      formula: '',
    });
  });

  it('maps a sprite category to sprite actorType', () => {
    const item = mapCritter({
      name: 'Test Sprite',
      category: 'Sprites',
      bp: '0',
      bodmin: '0',
      agimin: 'F+1',
      reamin: 'F+3',
      strmin: '0',
      chamin: 'F',
      intmin: 'F+1',
      logmin: 'F+2',
      wilmin: '0',
      inimin: '(F*2)',
      edgmin: 'F',
      magmin: '0',
      resmin: 'F',
      essmin: '0',
      source: 'TST',
      page: '3',
    });

    expect(item.system.actorType).toBe('sprite');
    expect(item.system.forceBased).toBe(true);
  });

  it('parses powers from critter record', () => {
    const item = mapCritter({
      name: 'Test Paranormal Beast',
      category: 'Paranormal Critters',
      bodmin: '6',
      agimin: '4',
      reamin: '5',
      strmin: '6',
      chamin: '2',
      intmin: '4',
      logmin: '2',
      wilmin: '4',
      inimin: '5',
      edgmin: '3',
      magmin: '3',
      resmin: '0',
      essmin: '0',
      powers: {
        power: ['Test Power A', 'Test Power B', 'Test Power C', 'Test Power D'],
      },
      source: 'TST',
      page: '4',
    });

    expect(item.system.powers).toEqual([
      'Test Power A',
      'Test Power B',
      'Test Power C',
      'Test Power D',
    ]);
  });
});

describe('mapCritterVariant', () => {
  it('inherits parent attributes and overrides variant-specific data', () => {
    const parent = {
      name: 'Test Hive Spirit',
      category: 'Insect Spirits',
      bp: '0',
      bodmin: 'F+3',
      agimin: 'F+2',
      reamin: 'F+2',
      strmin: 'F',
      chamin: 'F',
      intmin: 'F',
      logmin: 'F',
      wilmin: 'F',
      inimin: '(F*2)+2',
      edgmin: 'F',
      magmin: 'F',
      resmin: '0',
      essmin: '0',
      movement: '12/40',
      source: 'TST',
      page: '5',
      powers: { power: ['Test Power A', 'Test Power B'] },
    };

    const variant = {
      name: 'Test Variant',
      bp: '0',
      powers: { power: ['Test Power C', 'Test Power B'] },
      source: 'TST',
      page: '6',
    };

    const item = mapCritterVariant(variant, parent);

    expect(item.name).toBe('Test Variant');
    expect(item.system.baseTemplate).toBe('Test Hive Spirit');
    expect(item.system.actorType).toBe('spirit');
    expect(item.system.forceBased).toBe(true);
    expect(item.system.attributes.body).toEqual({ value: 0, formula: 'F+3' });
    expect(item.system.powers).toEqual(['Test Power C', 'Test Power B']);
  });
});
