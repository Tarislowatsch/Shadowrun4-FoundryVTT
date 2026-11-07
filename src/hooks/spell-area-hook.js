import { isPrimaryGM } from '@utils/actor-ownership.js';
import { getGame } from '@utils/game/game.js';
import { SYSTEM_ID } from '@utils/game/system-id.js';
import { sanitizeSpellAreaData } from '@domains/magic/area-template.js';
import { BaseSocketHook } from './base-socket-hook.js';

/**
 * @typedef {object} CreateSpellAreaPayload
 * @property {string} sceneId
 * @property {object} regionData
 */

export class SpellAreaHook extends BaseSocketHook {
  /**
   * @param {{ action: string, payload: CreateSpellAreaPayload }} data
   * @returns {Promise<void>}
   */
  async _onSocketMessage(data) {
    if (data.action !== 'createSpellArea' || !isPrimaryGM()) return;
    const { sceneId, regionData } = data.payload ?? {};
    const sanitized = sanitizeSpellAreaData(regionData);
    if (!sanitized) return;
    const { casterUuid, spellUuid } = sanitized.flags[SYSTEM_ID].spellArea;
    const spell = await fromUuid(spellUuid);
    if (spell?.parent?.uuid !== casterUuid) return;
    const scene = getGame().scenes?.get(sceneId);
    await scene?.createEmbeddedDocuments('Region', [sanitized]);
  }
}
