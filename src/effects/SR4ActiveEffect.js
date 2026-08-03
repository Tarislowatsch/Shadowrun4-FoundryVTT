import { SYSTEM_ID } from '@utils/game/system-id.js';
import { LEGACY_FLAG_SCOPE, mergeLegacyFlags } from './flag-namespace.js';
import { resolveEffectTemplate } from './world-effect-templates.js';

export class SR4ActiveEffect extends foundry.documents.ActiveEffect {
  /**
   * @param {Record<string, any>} source
   * @returns {Record<string, any>}
   */
  static migrateData(source) {
    if (source?.flags?.[LEGACY_FLAG_SCOPE]) {
      source.flags[SYSTEM_ID] = mergeLegacyFlags(source.flags);
    }
    return super.migrateData(source);
  }

  get isTemporary() {
    return (
      this.statuses.size > 0 ||
      !!this.getFlag(SYSTEM_ID, 'showOnToken') ||
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
