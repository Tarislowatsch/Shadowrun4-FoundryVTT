import { DefenseFlow } from '@flows/index';
import { getGame } from '@utils/index';

/**
 * @typedef {object} DefenseSocketPayload
 * @property {string} defenderId
 * @property {string} attackerId
 * @property {number} successes
 * @property {import('@models/index').SR4Weapon} weapon
 */

/**
 * @typedef {object} DefenseSocketMessage
 * @property {'triggerDefense'} action
 * @property {DefenseSocketPayload} payload
 */

/**
 * Listens on the system socket for incoming defense-trigger messages and
 * launches the defense flow for the appropriate local player.
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
    if (data.action !== 'triggerDefense') return;
    const { defenderId, attackerId, successes, weapon } = data.payload ?? {};
    /** @type {import('@documents/index').SR4Actor | undefined} */
    const defender = getGame().actors?.get(defenderId);
    if (!defender) return;

    const isAssignedUser = getGame().user?.character?.id === defenderId;
    const hasAssignedUser = getGame().users?.some(
      (u) => u.character?.id === defenderId
    );
    const isGM = getGame().user?.isGM;
    if (!isAssignedUser && !(isGM && !hasAssignedUser)) return;

    await DefenseFlow.start(defender, attackerId, successes, weapon);
  }
}
