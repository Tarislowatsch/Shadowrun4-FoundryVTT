const fields = foundry.data.fields;

/** @type {readonly string[]} */
export const REALM_CHOICES = Object.freeze(['physical', 'matrix', 'astral']);

/** @type {readonly string[]} */
export const SIM_MODE_CHOICES = Object.freeze(['cold', 'hot']);

/** @enum {string} */
export const SimMode = Object.freeze({ COLD: 'cold', HOT: 'hot' });

/** @returns {foundry.data.fields.StringField} */
export function realmModeField() {
  return new fields.StringField({
    initial: 'physical',
    choices: [...REALM_CHOICES],
    blank: false,
  });
}

/**
 * @readonly
 * @enum {string}
 */
export const SecondaryAttributes = Object.freeze({
  WILLPOWER: 'sr4.attributeAbr.willpower',
  LOGIC: 'sr4.attributeAbr.logic',
  INTUITION: 'sr4.attributeAbr.intuition',
  CHARISMA: 'sr4.attributeAbr.charisma',
});
