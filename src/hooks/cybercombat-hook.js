import { isResponsibleForActor } from '@utils/index';
import { MatrixDefenseFlow } from '@domains/matrix/flow/defense-flow.js';
import { DumpshockFlow } from '@domains/matrix/flow/dumpshock-flow.js';
import { BaseSocketHook } from './base-socket-hook.js';

const CYBERCOMBAT_ACTIONS = new Set([
  'triggerMatrixDefense',
  'triggerMatrixResist',
  'triggerBiofeedbackResist',
  'applyMatrixJam',
  'triggerDumpshock',
]);

export class CybercombatHook extends BaseSocketHook {
  /**
   * @param {{ action: string, payload: any }} data
   * @returns {Promise<void>}
   */
  async _onSocketMessage(data) {
    if (!CYBERCOMBAT_ACTIONS.has(data.action)) return;

    const { defenderUuid } = data.payload ?? {};
    /** @type {import('@documents/index').SR4Actor | undefined} */
    const defender = /** @type {any} */ (await fromUuid(defenderUuid));
    if (!defender) return;
    if (!isResponsibleForActor(/** @type {any} */ (defender).id)) return;

    switch (data.action) {
      case 'triggerMatrixDefense':
        return MatrixDefenseFlow.handleDefense(defender, data.payload);
      case 'triggerMatrixResist':
        return MatrixDefenseFlow.handleMatrixResist(defender, data.payload);
      case 'triggerBiofeedbackResist':
        return MatrixDefenseFlow.handleBiofeedbackResist(
          defender,
          data.payload
        );
      case 'applyMatrixJam':
        return MatrixDefenseFlow.handleJam(defender, data.payload);
      case 'triggerDumpshock':
        return DumpshockFlow.start(defender);
    }
  }
}
