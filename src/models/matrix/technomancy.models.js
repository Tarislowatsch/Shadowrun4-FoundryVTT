import { SecondaryAttributes } from '@models/shared';

/**
 * @readonly
 * @enum {string}
 */
export const Streams = Object.freeze({
  CYBERADEPTS: 'CYBERADEPTS',
  DEFAULT: 'DEFAULT',
  DRONOMANCERS: 'DRONOMANCERS',
  ESCAPISTS: 'ESCAPISTS',
  INFO_SAVANTS: 'INFO_SAVANTS',
  NETWORKERS: 'NETWORKERS',
  SINGULARITARIANS: 'SINGULARITARIANS',
  SOURCERORS: 'SOURCERORS',
  TECHNOSHAMANS: 'TECHNOSHAMANS',
});

/**
 * @readonly
 * @enum {string}
 */
export const StreamLabels = Object.freeze({
  [Streams.CYBERADEPTS]: 'sr4.matrix.streams.CYBERADEPTS',
  [Streams.DEFAULT]: 'sr4.matrix.streams.DEFAULT',
  [Streams.DRONOMANCERS]: 'sr4.matrix.streams.DRONOMANCERS',
  [Streams.ESCAPISTS]: 'sr4.matrix.streams.ESCAPISTS',
  [Streams.INFO_SAVANTS]: 'sr4.matrix.streams.INFO_SAVANTS',
  [Streams.NETWORKERS]: 'sr4.matrix.streams.NETWORKERS',
  [Streams.SINGULARITARIANS]: 'sr4.matrix.streams.SINGULARITARIANS',
  [Streams.SOURCERORS]: 'sr4.matrix.streams.SOURCERORS',
  [Streams.TECHNOSHAMANS]: 'sr4.matrix.streams.TECHNOSHAMANS',
});

export const FadingAttributes = SecondaryAttributes;

/**
 * @readonly
 * @type {Record<string, string[]>}
 */
export const StreamSpriteTypes = Object.freeze({
  [Streams.CYBERADEPTS]: ['COURIER', 'CRACK', 'DATA', 'FAULT', 'MACHINE'],
  [Streams.DEFAULT]: ['COURIER', 'CRACK', 'DATA', 'FAULT', 'MACHINE'],
  [Streams.DRONOMANCERS]: ['CRACK', 'DATA', 'FAULT', 'MACHINE', 'TUTOR'],
  [Streams.ESCAPISTS]: ['COURIER', 'CRACK', 'DATA', 'FAULT', 'TANK'],
  [Streams.INFO_SAVANTS]: ['CODE', 'COURIER', 'DATA', 'MACHINE', 'PALADIN'],
  [Streams.NETWORKERS]: ['CODE', 'COURIER', 'CRACK', 'DATA', 'SLEUTH'],
  [Streams.SINGULARITARIANS]: ['COURIER', 'CRACK', 'DATA', 'TUTOR', 'TANK'],
  [Streams.SOURCERORS]: ['CODE', 'COURIER', 'CRACK', 'DATA', 'MACHINE'],
  [Streams.TECHNOSHAMANS]: ['CRACK', 'DATA', 'MACHINE', 'PALADIN', 'SLEUTH'],
});
