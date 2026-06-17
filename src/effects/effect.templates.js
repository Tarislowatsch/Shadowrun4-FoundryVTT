/**
 * Predefined ActiveEffect templates for common SR4 situations.
 * Each entry matches the data shape expected by ActiveEffect.create().
 */
export const EFFECT_TEMPLATES = Object.freeze({
  /** Sustaining a spell: -2 to all dice pools */
  sustain: {
    name: 'sr4.effect.templates.sustain',
    img: 'icons/svg/aura.svg',
    statuses: ['sr4-sustain'],
    changes: [
      {
        key: 'system.modifiers.generalModifier',
        type: 'add',
        value: '-2',
      },
    ],
    disabled: false,
  },
  /** Disoriented by electricity: -2 to all dice pools for 2 + net hits Combat Turns */
  disoriented: {
    name: 'sr4.effect.templates.disoriented',
    img: 'icons/svg/stoned.svg',
    statuses: ['sr4-disoriented'],
    changes: [
      {
        key: 'system.modifiers.generalModifier',
        type: 'add',
        value: '-2',
      },
    ],
    duration: { turns: 2 },
    disabled: false,
  },
  /** Blinded (e.g. Flash-Pak): -4 to attack rolls for net hits Combat Turns */
  blind: {
    name: 'sr4.effect.templates.blind',
    img: 'icons/svg/blind.svg',
    statuses: ['sr4-blind'],
    changes: [
      {
        key: 'system.modifiers.attackModifier',
        type: 'add',
        value: '-4',
      },
    ],
    duration: { turns: 1 },
    disabled: false,
  },
  /** Blinded with flare compensation: -2 to attack rolls for net hits Combat Turns */
  blindFlareComp: {
    name: 'sr4.effect.templates.blindFlareComp',
    img: 'icons/svg/blind.svg',
    statuses: ['sr4-blind-flare-comp'],
    changes: [
      {
        key: 'system.modifiers.attackModifier',
        type: 'add',
        value: '-2',
      },
    ],
    duration: { turns: 1 },
    disabled: false,
  },
  /** Knocked down: -2 to all dice pools until standing up */
  knockedDown: {
    name: 'sr4.effect.templates.knockedDown',
    img: 'icons/svg/falling.svg',
    statuses: ['sr4-knocked-down'],
    changes: [
      {
        key: 'system.modifiers.generalModifier',
        type: 'add',
        value: '-2',
      },
    ],
    disabled: false,
  },
});
