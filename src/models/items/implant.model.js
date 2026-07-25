import { genericItemSchema, migrateLegacyValue } from '@models/shared';

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

/**
 * @enum {number}
 * @readonly
 */
export const GradeEssenceMultipliers = Object.freeze({
  /** @type {number} */ SECOND_HAND: 1.25,
  /** @type {number} */ STANDARD: 1,
  /** @type {number} */ ALPHA: 0.8,
  /** @type {number} */ BETA: 0.7,
  /** @type {number} */ DELTA: 0.5,
});

/**
 * @param {number} essence
 * @param {string} grade
 * @returns {number}
 */
export function essenceAfterGrade(essence, grade) {
  const mult = GradeEssenceMultipliers[grade] ?? 1;
  return Math.round((essence ?? 0) * mult * 1000) / 1000;
}

export class SR4ImplantData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    migrateLegacyValue(source, 'type', LEGACY_TYPE_MAP);
    migrateLegacyValue(source, 'grade', LEGACY_GRADE_MAP);
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

  prepareDerivedData() {
    this.essenceActual = essenceAfterGrade(this.essence, this.grade);
  }
}

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

/**
 * @enum {string}
 * @readonly
 */
export const BiocompatibilityTypes = Object.freeze({
  /** @type {string} */ '': 'sr4.implant.biocompatibility.none',
  /** @type {string} */ CYBERWARE: 'sr4.implant.type.cyberware',
  /** @type {string} */ BIOWARE: 'sr4.implant.type.bioware',
});
