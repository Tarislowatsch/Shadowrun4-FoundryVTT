import { resolveEffectTemplate } from './world-effect-templates.js';

export class SR4ActiveEffect extends foundry.documents.ActiveEffect {
  get isTemporary() {
    return (
      this.statuses.size > 0 ||
      !!this.flags?.sr4?.showOnToken ||
      super.isTemporary
    );
  }

  /**
   * @param {string} key
   * @param {foundry.documents.Actor} parent
   * @param {Record<string, unknown>} [overrides]
   * @returns {Promise<SR4ActiveEffect>}
   */
  static fromTemplate(key, parent, overrides = {}) {
    const template = resolveEffectTemplate(key);
    if (!template) throw new Error(`Unknown SR4 effect template: ${key}`);
    return this.create({ ...template, ...overrides }, { parent });
  }
}
