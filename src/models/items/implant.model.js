import { genericItemSchema } from '@models/shared';

const fields = foundry.data.fields;
/** DataModel for cyberware/bioware implants (type: "Implant"). */
export class SR4ImplantData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...genericItemSchema(),
      essence: new fields.NumberField({ initial: 0 }),
      essenceActual: new fields.NumberField({ initial: 0 }),
      capacity: new fields.NumberField({ initial: 0, integer: true }),
      grade: new fields.StringField({ initial: 'standard' }),
      type: new fields.StringField({ initial: 'cyberware' }),
    };
  }
}

/**
 * @fileoverview Type definitions and constants for Shadowrun 4e item data models.
 * Interfaces and declare-only classes are converted to JSDoc @typedef (documentation-only).
 * Enums are converted to frozen const objects (runtime-available).
 * The commented-out SR4BaseItemModel interface is omitted intentionally.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/**
 * Available implant grade options, determining essence cost and availability.
 *
 * @enum {string}
 * @readonly
 */
export const ImplantGrades = Object.freeze({
  /** @type {string} */ SECOND_HAND: 'second-hand',
  /** @type {string} */ STANDARD: 'standard',
  /** @type {string} */ ALPHA: 'alpha',
  /** @type {string} */ BETA: 'beta',
  /** @type {string} */ DELTA: 'delta',
});

/**
 * Available implant type categories.
 *
 * @enum {string}
 * @readonly
 */
export const ImplantTypes = Object.freeze({
  /** @type {string} */ CYBERWARE: 'cyberware',
  /** @type {string} */ BIOWARE: 'bioware',
  /** @type {string} */ NANOWARE: 'nanoware',
  /** @type {string} */ GENEWARE: 'geneware',
});
