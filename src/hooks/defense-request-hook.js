import { DefenseFlow, startDefenderPickerFlow } from '@flows/index';
import { isResponsibleForActor, isPrimaryGM } from '@utils/index';
import { BaseSocketHook } from './base-socket-hook.js';

/**
 * @typedef {object} DefenseSocketPayload
 * @property {string} defenderUuid
 * @property {string} attackerUuid
 * @property {number} successes
 * @property {import('@models/index').SR4Weapon} weapon
 * @property {number} [wideDefenseMalus]
 * @property {number} [burstDamageBonus]
 */

/**
 * @typedef {object} SelectDefenderPayload
 * @property {string} attackerUuid
 * @property {number} successes
 * @property {import('@models/index').SR4Weapon} weapon
 * @property {number} [wideDefenseMalus]
 * @property {number} [burstDamageBonus]
 */

/**
 * @typedef {{ action: 'triggerDefense', payload: DefenseSocketPayload } | { action: 'selectDefender', payload: SelectDefenderPayload }} DefenseSocketMessage
 */

export class DefenseHook extends BaseSocketHook {
  /**
   * @param {DefenseSocketMessage} data
   * @returns {Promise<void>}
   */
  async _onSocketMessage(data) {
    if (data.action === 'selectDefender') {
      if (!isPrimaryGM()) return;
      const {
        attackerUuid,
        successes,
        weapon,
        wideDefenseMalus = 0,
        burstDamageBonus = 0,
      } = data.payload ?? {};
      await startDefenderPickerFlow(
        attackerUuid,
        successes,
        weapon,
        wideDefenseMalus,
        burstDamageBonus
      );
      return;
    }

    if (data.action !== 'triggerDefense') return;
    const {
      defenderUuid,
      attackerUuid,
      successes,
      weapon,
      wideDefenseMalus = 0,
      burstDamageBonus = 0,
    } = data.payload ?? {};
    /** @type {import('@documents/index').SR4Actor | undefined} */
    const defender = /** @type {any} */ (await fromUuid(defenderUuid));
    if (!defender) return;

    if (!isResponsibleForActor(/** @type {any} */ (defender).id)) return;

    await DefenseFlow.start(
      defender,
      attackerUuid,
      successes,
      weapon,
      wideDefenseMalus,
      burstDamageBonus
    );
  }
}
