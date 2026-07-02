import { describe, it, expect } from 'vitest';
import {
  planGenericItemSync,
  planSkillSync,
} from '@importer/sync-character.js';

describe('planGenericItemSync', () => {
  it('does not touch items that match by type and name', () => {
    const existing = [{ id: 'i1', name: 'Katana', type: 'Melee Weapon' }];
    const imported = [{ name: 'Katana', type: 'Melee Weapon', system: {} }];
    const plan = planGenericItemSync(existing, imported);
    expect(plan).toEqual({ toCreate: [], toUpdate: [], toDeleteIds: [] });
  });

  it('creates items present in the import but missing on the actor', () => {
    const existing = [];
    const imported = [{ name: 'Katana', type: 'Melee Weapon', system: {} }];
    const plan = planGenericItemSync(existing, imported);
    expect(plan.toCreate).toEqual(imported);
    expect(plan.toDeleteIds).toEqual([]);
  });

  it('deletes items present on the actor but missing from the import', () => {
    const existing = [{ id: 'i1', name: 'Katana', type: 'Melee Weapon' }];
    const imported = [];
    const plan = planGenericItemSync(existing, imported);
    expect(plan.toCreate).toEqual([]);
    expect(plan.toDeleteIds).toEqual(['i1']);
  });

  it('handles duplicate counts as a multiset, only syncing the surplus', () => {
    const existing = [
      { id: 'i1', name: 'Grenade', type: 'Gear' },
      { id: 'i2', name: 'Grenade', type: 'Gear' },
    ];
    const imported = [
      { name: 'Grenade', type: 'Gear', system: { qty: 1 } },
      { name: 'Grenade', type: 'Gear', system: { qty: 2 } },
      { name: 'Grenade', type: 'Gear', system: { qty: 3 } },
    ];
    const plan = planGenericItemSync(existing, imported);
    expect(plan.toCreate).toEqual([imported[2]]);
    expect(plan.toDeleteIds).toEqual([]);
  });

  it('does not confuse items of the same name but different type', () => {
    const existing = [{ id: 'i1', name: 'Gas Vent 2', type: 'Weapon Mod' }];
    const imported = [{ name: 'Gas Vent 2', type: 'Gear', system: {} }];
    const plan = planGenericItemSync(existing, imported);
    expect(plan.toCreate).toEqual(imported);
    expect(plan.toDeleteIds).toEqual(['i1']);
  });
});

describe('planSkillSync', () => {
  it('updates rating and specialization for matched active skills', () => {
    const existing = [
      {
        id: 's1',
        name: 'Pistols',
        type: 'Skill',
        system: { type: 'active', rating: 2, specialization: '' },
      },
    ];
    const imported = [
      {
        name: 'Pistols',
        type: 'Skill',
        system: { type: 'active', rating: 4, specialization: 'Heavy Pistols' },
      },
    ];
    const plan = planSkillSync(existing, imported);
    expect(plan.toUpdate).toEqual([
      {
        _id: 's1',
        'system.rating': 4,
        'system.specialization': 'Heavy Pistols',
      },
    ]);
    expect(plan.toCreate).toEqual([]);
    expect(plan.toDeleteIds).toEqual([]);
  });

  it('creates skills missing on the actor', () => {
    const existing = [];
    const imported = [
      {
        name: 'Pistols',
        type: 'Skill',
        system: { type: 'active', rating: 1, specialization: '' },
      },
    ];
    const plan = planSkillSync(existing, imported);
    expect(plan.toCreate).toEqual(imported);
  });

  it('never deletes active skills absent from the import', () => {
    const existing = [
      {
        id: 's1',
        name: 'Pistols',
        type: 'Skill',
        system: { type: 'active', rating: 0, specialization: '' },
      },
    ];
    const plan = planSkillSync(existing, []);
    expect(plan.toDeleteIds).toEqual([]);
  });

  it('deletes knowledge skills absent from the import', () => {
    const existing = [
      {
        id: 's1',
        name: 'Chemie',
        type: 'Skill',
        system: { type: 'knowledge', rating: 2, specialization: '' },
      },
    ];
    const plan = planSkillSync(existing, []);
    expect(plan.toDeleteIds).toEqual(['s1']);
  });

  it('ignores non-skill items on the actor', () => {
    const existing = [{ id: 'g1', name: 'Pistols', type: 'Gear' }];
    const imported = [
      {
        name: 'Pistols',
        type: 'Skill',
        system: { type: 'active', rating: 1, specialization: '' },
      },
    ];
    const plan = planSkillSync(existing, imported);
    expect(plan.toCreate).toEqual(imported);
  });
});
