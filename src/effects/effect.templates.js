/**
 * Predefined ActiveEffect templates for common SR4 situations.
 * Each entry matches the data shape expected by ActiveEffect.create().
 */
export const EFFECT_TEMPLATES = Object.freeze({
  /** Sustaining a spell: -2 to all dice pools */
  sustain: {
    name: 'sr4.effect.templates.sustain',
    img: 'icons/svg/aura.svg',
    changes: [
      {
        key: 'system.modifiers.generalModifier',
        mode: 2,
        value: '-2',
      },
    ],
    disabled: false,
  },
});
