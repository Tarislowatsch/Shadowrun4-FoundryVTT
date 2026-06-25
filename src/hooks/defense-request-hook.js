import { DefenseFlow, startDefenderPickerFlow } from '@flows/index';
import { getGame, isResponsibleForActor, isPrimaryGM } from '@utils/index';

/**
 * @typedef {object} DefenseSocketPayload
 * @property {string} defenderId
 * @property {string} attackerId
 * @property {number} successes
 * @property {import('@models/index').SR4Weapon} weapon
 * @property {number} [wideDefenseMalus]
 * @property {number} [burstDamageBonus]
 */

/**
 * @typedef {object} SelectDefenderPayload
 * @property {string} attackerId
 * @property {number} successes
 * @property {import('@models/index').SR4Weapon} weapon
 * @property {number} [wideDefenseMalus]
 * @property {number} [burstDamageBonus]
 */

/**
 * @typedef {{ action: 'triggerDefense', payload: DefenseSocketPayload } | { action: 'selectDefender', payload: SelectDefenderPayload }} DefenseSocketMessage
 */

export class DefenseHook {
  constructor() {
    this._boundHandler = this._onSocketMessage.bind(this);
    this._registerSocketHandler();
  }

  /** @returns {void} */
  _registerSocketHandler() {
    Hooks.once('ready', () => {
      const socket = getGame().socket;
      if (!socket) {
        console.error('SR4 | DefenseHook: socket not available after ready');
        return;
      }
      socket.off('system.shadowrun4e', this._boundHandler);
      socket.on('system.shadowrun4e', this._boundHandler);
    });
  }

  /**
   * @param {DefenseSocketMessage} data
   * @returns {Promise<void>}
   */
  async _onSocketMessage(data) {
    if (data.action === 'selectDefender') {
      if (!isPrimaryGM()) return;
      const {
        attackerId,
        successes,
        weapon,
        wideDefenseMalus = 0,
        burstDamageBonus = 0,
      } = data.payload ?? {};
      await startDefenderPickerFlow(
        attackerId,
        successes,
        weapon,
        wideDefenseMalus,
        burstDamageBonus
      );
      return;
    }

    if (data.action !== 'triggerDefense') return;
    const {
      defenderId,
      attackerId,
      successes,
      weapon,
      wideDefenseMalus = 0,
      burstDamageBonus = 0,
    } = data.payload ?? {};
    /** @type {import('@documents/index').SR4Actor | undefined} */
    const defender = getGame().actors?.get(defenderId);
    if (!defender) return;

    if (!isResponsibleForActor(defenderId)) return;

    await DefenseFlow.start(
      defender,
      attackerId,
      successes,
      weapon,
      wideDefenseMalus,
      burstDamageBonus
    );
  }
}
