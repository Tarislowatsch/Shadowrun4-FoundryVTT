import { describe, it, expect, vi } from 'vitest';
import {
  planMentorChoiceEffectStates,
  selectMentorChoice,
  buildMentorContext,
} from '@effects/mentor-choices.js';

describe('planMentorChoiceEffectStates', () => {
  it('enables the effect matching the selected choice for its set and disables the rest', () => {
    const effects = [
      {
        id: 'e1',
        disabled: true,
        flags: { sr4: { mentorChoice: { set: '1', name: 'Combat spells' } } },
      },
      {
        id: 'e2',
        disabled: false,
        flags: {
          sr4: { mentorChoice: { set: '1', name: 'Detection spells' } },
        },
      },
    ];
    const plan = planMentorChoiceEffectStates(effects, { 1: 'Combat spells' });

    expect(plan).toEqual(
      expect.arrayContaining([
        { _id: 'e1', disabled: false },
        { _id: 'e2', disabled: true },
      ])
    );
  });

  it('supports two independent choice sets at once', () => {
    const effects = [
      {
        id: 'a',
        disabled: true,
        flags: { sr4: { mentorChoice: { set: '1', name: 'Great dragons' } } },
      },
      {
        id: 'b',
        disabled: true,
        flags: { sr4: { mentorChoice: { set: '2', name: 'Opposed' } } },
      },
    ];
    const plan = planMentorChoiceEffectStates(effects, {
      1: 'Great dragons',
      2: 'Opposed',
    });

    expect(plan).toEqual(
      expect.arrayContaining([
        { _id: 'a', disabled: false },
        { _id: 'b', disabled: false },
      ])
    );
  });

  it('ignores effects without the mentorChoice flag', () => {
    const effects = [{ id: 'x', disabled: false, flags: {} }];
    expect(planMentorChoiceEffectStates(effects, {})).toEqual([]);
  });

  it('omits effects whose state already matches the plan', () => {
    const effects = [
      {
        id: 'e1',
        disabled: false,
        flags: { sr4: { mentorChoice: { set: '1', name: 'Combat spells' } } },
      },
    ];
    expect(
      planMentorChoiceEffectStates(effects, { 1: 'Combat spells' })
    ).toEqual([]);
  });
});

describe('selectMentorChoice', () => {
  it('updates system.selectedChoices and syncs matching embedded effects in one update', async () => {
    const item = {
      system: { selectedChoices: {} },
      update: vi.fn(),
      effects: {
        contents: [
          {
            id: 'e1',
            disabled: true,
            flags: {
              sr4: { mentorChoice: { set: '1', name: 'Combat spells' } },
            },
          },
        ],
      },
    };

    await selectMentorChoice(item, '1', 'Combat spells');

    expect(item.update).toHaveBeenCalledWith({
      'system.selectedChoices': { 1: 'Combat spells' },
      effects: [{ _id: 'e1', disabled: false }],
    });
  });

  it('omits the effects key when no effect state changes', async () => {
    const item = {
      system: { selectedChoices: { 1: 'Combat spells' } },
      update: vi.fn(),
      effects: {
        contents: [
          {
            id: 'e1',
            disabled: false,
            flags: {
              sr4: { mentorChoice: { set: '1', name: 'Combat spells' } },
            },
          },
        ],
      },
    };

    await selectMentorChoice(item, '1', 'Combat spells');

    expect(item.update).toHaveBeenCalledWith({
      'system.selectedChoices': { 1: 'Combat spells' },
    });
  });
});

describe('buildMentorContext', () => {
  it('groups choices by set and flags the selected option', () => {
    const item = {
      name: 'Sun',
      system: {
        category: 'Other',
        advantage: 'Adv',
        disadvantage: 'Disadv',
        selectedChoices: { 1: 'Combat spells' },
        choices: [
          { set: 1, name: 'Combat spells', hasBonus: true },
          { set: 1, name: 'Detection spells', hasBonus: true },
          { set: 2, name: 'Opposed', hasBonus: false },
        ],
      },
    };

    const context = buildMentorContext(item);

    expect(context).toMatchObject({
      name: 'Sun',
      category: 'Other',
      isParagon: false,
      advantage: 'Adv',
      disadvantage: 'Disadv',
    });
    expect(context.sets).toEqual([
      {
        set: '1',
        options: [
          { name: 'Combat spells', selected: true, hasBonus: true },
          { name: 'Detection spells', selected: false, hasBonus: true },
        ],
      },
      {
        set: '2',
        options: [{ name: 'Opposed', selected: false, hasBonus: false }],
      },
    ]);
  });

  it('flags isParagon for Resonance/Disonance categories', () => {
    const item = {
      name: 'Shooter',
      system: {
        category: 'Resonance',
        advantage: '',
        disadvantage: '',
        selectedChoices: {},
        choices: [],
      },
    };
    expect(buildMentorContext(item).isParagon).toBe(true);
  });
});
