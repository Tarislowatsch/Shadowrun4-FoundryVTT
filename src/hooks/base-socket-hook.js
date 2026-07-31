import { getGame, offSystemSocket, onSystemSocket } from '@utils/index';

const SOCKET_BIND_RETRY_DELAY_MS = 1000;
const SOCKET_BIND_ATTEMPTS = 5;

export class BaseSocketHook {
  constructor() {
    this._boundHandler = this._onSocketMessage.bind(this);
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._retryTimer = null;
    Hooks.once('ready', () => this._bind(SOCKET_BIND_ATTEMPTS));
  }

  /**
   * @param {number} attemptsLeft
   * @returns {void}
   */
  _bind(attemptsLeft) {
    this._retryTimer = null;
    onSystemSocket(this._boundHandler);
    if (getGame().socket) return;
    if (attemptsLeft <= 0) {
      console.warn(
        `SR4 | ${this.constructor.name}: no socket available, handling messages from this client only`
      );
      return;
    }
    this._retryTimer = setTimeout(
      () => this._bind(attemptsLeft - 1),
      SOCKET_BIND_RETRY_DELAY_MS
    );
  }

  /**
   * @returns {void}
   */
  dispose() {
    if (this._retryTimer) clearTimeout(this._retryTimer);
    this._retryTimer = null;
    offSystemSocket(this._boundHandler);
  }

  /**
   * @param {{ action: string, payload: object }} _data
   * @returns {Promise<void>}
   */
  async _onSocketMessage(_data) {}
}
