import { ASTRAL_PERCEPTION_STATUS } from '@models/shared/visibility-rules.js';

export const SR4_STATUS_EFFECTS = Object.freeze([
  {
    id: 'sr4-sustain',
    label: 'sr4.effect.templates.sustain',
    img: 'icons/svg/aura.svg',
  },
  {
    id: 'sr4-disoriented',
    label: 'sr4.effect.templates.disoriented',
    img: 'icons/svg/stoned.svg',
  },
  {
    id: 'sr4-blind',
    label: 'sr4.effect.templates.blind',
    img: 'icons/svg/blind.svg',
  },
  {
    id: 'sr4-blind-flare-comp',
    label: 'sr4.effect.templates.blindFlareComp',
    img: 'icons/svg/blind.svg',
  },
  {
    id: 'sr4-knocked-down',
    label: 'sr4.effect.templates.knockedDown',
    img: 'icons/svg/falling.svg',
  },
  {
    id: 'sr4-dumpshocked',
    label: 'sr4.effect.templates.dumpshocked',
    img: 'icons/svg/stoned.svg',
  },
  {
    id: ASTRAL_PERCEPTION_STATUS,
    label: 'sr4.effect.templates.astralPerception',
    img: 'icons/svg/eye.svg',
  },
]);
