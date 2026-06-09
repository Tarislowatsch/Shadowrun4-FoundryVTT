import { DefenseFlow } from '@flows/index';
import { getGame } from '@utils/index';

export class DefenseHook {
  constructor() {
    this._boundHandler = this._onSocketMessage.bind(this);
    this._registerSocketHandler();
  }

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

  async _onSocketMessage(data) {
    if (data.action !== 'triggerDefense') return;
    const { defenderId, attackerId, successes, weapon } = data.payload ?? {};
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

export function initDefenseHook() {
  return new DefenseHook();
}
