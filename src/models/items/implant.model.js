import { genericItemSchema } from '@models/shared';

const fields = foundry.data.fields;
/** @type {Record<string, string>} */
const LEGACY_TYPE_MAP = {
  cyberware: 'CYBERWARE',
  bioware: 'BIOWARE',
  nanoware: 'NANOWARE',
  geneware: 'GENEWARE',
};

/** @type {Record<string, string>} */
const LEGACY_GRADE_MAP = {
  standard: 'STANDARD',
  alpha: 'ALPHA',
  beta: 'BETA',
  delta: 'DELTA',
  'second-hand': 'SECOND_HAND',
};

/** DataModel for cyberware/bioware implants (type: "Implant"). */
export class SR4ImplantData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (typeof source.type === 'string' && source.type in LEGACY_TYPE_MAP) {
      source.type = LEGACY_TYPE_MAP[source.type];
    }
    if (typeof source.grade === 'string' && source.grade in LEGACY_GRADE_MAP) {
      source.grade = LEGACY_GRADE_MAP[source.grade];
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      ...genericItemSchema(),
      essence: new fields.NumberField({ initial: 0 }),
      essenceActual: new fields.NumberField({ initial: 0 }),
      capacity: new fields.NumberField({ initial: 0, integer: true }),
      grade: new fields.StringField({ initial: 'STANDARD' }),
      type: new fields.StringField({ initial: 'CYBERWARE' }),
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
 * @enum {string}
 * @readonly
 */
export const ImplantGrades = Object.freeze({
  /** @type {string} */ SECOND_HAND: 'sr4.implant.grade.secondHand',
  /** @type {string} */ STANDARD: 'sr4.implant.grade.standard',
  /** @type {string} */ ALPHA: 'sr4.implant.grade.alpha',
  /** @type {string} */ BETA: 'sr4.implant.grade.beta',
  /** @type {string} */ DELTA: 'sr4.implant.grade.delta',
});

/**
 * @enum {string}
 * @readonly
 */
export const ImplantTypes = Object.freeze({
  /** @type {string} */ CYBERWARE: 'sr4.implant.type.cyberware',
  /** @type {string} */ BIOWARE: 'sr4.implant.type.bioware',
  /** @type {string} */ NANOWARE: 'sr4.implant.type.nanoware',
  /** @type {string} */ GENEWARE: 'sr4.implant.type.geneware',
});
