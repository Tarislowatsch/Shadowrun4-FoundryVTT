import { EFFECT_TEMPLATES } from './effect.templates.js';

export class SR4ActiveEffect extends foundry.documents.ActiveEffect {
  /**
   * Creates an ActiveEffect on `parent` from a named template.
   * @param {string} key - Key into EFFECT_TEMPLATES
   * @param {foundry.documents.Actor} parent
   * @returns {Promise<SR4ActiveEffect>}
   */
  static fromTemplate(key, parent) {
    const template = EFFECT_TEMPLATES[key];
    if (!template) throw new Error(`Unknown SR4 effect template: ${key}`);
    const data = foundry.utils.deepClone(template);
    data.name = game.i18n.localize(data.name);
    return this.create(data, { parent });
  }
}
