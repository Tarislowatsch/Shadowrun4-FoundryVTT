const fields = foundry.data.fields;

export class SR4ActionData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      actionType: new fields.StringField({ initial: 'simple' }),
      actionPart1: new fields.StringField({ initial: '' }),
      actionPart2: new fields.StringField({ initial: '' }),
      rating1: new fields.NumberField({ initial: 0, integer: true }),
      rating2: new fields.NumberField({ initial: 0, integer: true }),
      label: new fields.StringField({ initial: '' }),
      description: new fields.StringField({ initial: '' }),
      source: new fields.StringField({ initial: '' }),
      linkedItemId: new fields.StringField({ initial: '', blank: true }),
    };
  }
}

/**
 * @enum {string}
 * @readonly
 */
export const ActionType = Object.freeze({
  /** @type {string} */ FREE: 'sr4.action.actiontype.free',
  /** @type {string} */ SIMPLE: 'sr4.action.actiontype.simple',
  /** @type {string} */ COMPLEX: 'sr4.action.actiontype.complex',
  /** @type {string} */ EXTENDED: 'sr4.action.actiontype.extended',
  /** @type {string} */ TEST: 'sr4.action.actiontype.test',
});
