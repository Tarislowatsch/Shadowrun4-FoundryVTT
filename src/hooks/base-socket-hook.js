import { getGame } from '@utils/index';

export class BaseSocketHook {
  constructor() {
    this._boundHandler = this._onSocketMessage.bind(this);
    Hooks.once('ready', () => {
      const socket = getGame().socket;
      if (!socket) {
        console.error(
          `SR4 | ${this.constructor.name}: socket not available after ready`
        );
        return;
      }
      socket.off('system.shadowrun4e', this._boundHandler);
      socket.on('system.shadowrun4e', this._boundHandler);
    });
  }

  /**
   * @param {{ action: string, payload: object }} _data
   * @returns {Promise<void>}
   */
  async _onSocketMessage(_data) {}
}
