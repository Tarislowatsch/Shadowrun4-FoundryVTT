import {
  getGame,
  isResponsibleForActor,
  getMatrixPersona,
  computeBiofeedbackDamage,
} from '@utils/index';
import {
  requestReactiveDecision,
  DecisionCategory,
  DecisionKind,
  DecisionRouting,
} from '@utils/rolls/decision-provider.js';
import {
  openMatrixDefenseDialog,
  openMatrixResistDialog,
  defaultMatrixDefenseHits,
  defaultMatrixResistHits,
} from '@utils/dialog/matrix/cybercombat.js';
import { MatrixDamageFlow } from '@flows/matrix-damage-flow.js';
import { ApplyDamageFlow } from '@flows/apply-damage-flow.js';
import { DumpshockFlow } from '@flows/dumpshock-flow.js';
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
        return this.#handleDefense(defender, data.payload);
      case 'triggerMatrixResist':
        return this.#handleMatrixResist(defender, data.payload);
      case 'triggerBiofeedbackResist':
        return this.#handleBiofeedbackResist(defender, data.payload);
      case 'applyMatrixJam':
        return this.#handleJam(defender, data.payload);
      case 'triggerDumpshock':
        return DumpshockFlow.start(defender);
    }
  }

  /**
   * @param {import('@documents/index').SR4Actor} defender
   * @param {{ attackerUuid: string, programName: string, attackHits: number }} payload
   */
  async #handleDefense(defender, payload) {
    const attacker = /** @type {any} */ (await fromUuid(payload.attackerUuid));
    const defenseHits = await requestReactiveDecision({
      actor: defender,
      category: DecisionCategory.MATRIX,
      dialogKind: DecisionKind.MATRIX_DEFENSE,
      routing: DecisionRouting.OWNER,
      chatModeSupported: true,
      defaultResult: () => defaultMatrixDefenseHits(defender),
      openDialog: () =>
        openMatrixDefenseDialog(defender, {
          attackerName: attacker?.name ?? '?',
          programName: payload.programName,
          attackHits: payload.attackHits,
        }),
    });

    getGame().socket?.emit('system.shadowrun4e', {
      action: 'matrixDefenseRolled',
      payload: {
        attackerUuid: payload.attackerUuid,
        defenderUuid: /** @type {any} */ (defender).uuid,
        defenseHits,
      },
    });
  }

  /**
   * @param {import('@documents/index').SR4Actor} defender
   * @param {{ dv: number, programName: string }} payload
   */
  async #handleMatrixResist(defender, payload) {
    const label = getGame().i18n.localize('sr4.matrix.cybercombat.resistTitle');
    const hits = await requestReactiveDecision({
      actor: defender,
      category: DecisionCategory.MATRIX,
      dialogKind: DecisionKind.MATRIX_RESIST,
      routing: DecisionRouting.OWNER,
      chatModeSupported: true,
      defaultResult: () =>
        defaultMatrixResistHits(defender, { label, biofeedback: false }),
      openDialog: () =>
        openMatrixResistDialog(defender, {
          dv: payload.dv,
          label,
          biofeedback: false,
        }),
    });
    const unresisted = Math.max(payload.dv - (hits ?? 0), 0);
    await MatrixDamageFlow.sendDecisionMessage(
      defender,
      unresisted,
      'cybercombat'
    );
  }

  /**
   * @param {import('@documents/index').SR4Actor} defender
   * @param {{ dv: number, programCategory: string }} payload
   */
  async #handleBiofeedbackResist(defender, payload) {
    const persona = getMatrixPersona(defender);
    if (!persona.inVR) {
      await ChatMessage.create({
        content: getGame().i18n.format('sr4.matrix.cybercombat.noEffectAr', {
          defender: defender.name,
        }),
      });
      return;
    }

    const label = getGame().i18n.localize(
      'sr4.matrix.cybercombat.biofeedbackResistTitle'
    );
    const hits = await requestReactiveDecision({
      actor: defender,
      category: DecisionCategory.MATRIX,
      dialogKind: DecisionKind.BIOFEEDBACK_RESIST,
      routing: DecisionRouting.OWNER,
      chatModeSupported: true,
      defaultResult: () =>
        defaultMatrixResistHits(defender, { label, biofeedback: true }),
      openDialog: () =>
        openMatrixResistDialog(defender, {
          dv: payload.dv,
          label,
          biofeedback: true,
        }),
    });

    /** @type {any} */
    const stun = defender.system.conditionMonitor?.stun;
    const { amount, isPhysical } = computeBiofeedbackDamage(
      payload.programCategory,
      payload.dv,
      hits ?? 0,
      {
        simMode: persona.simMode,
        inVR: persona.inVR,
        stunValue: stun?.value ?? 0,
        stunMax: stun?.max ?? 0,
      }
    );

    if (amount > 0) {
      await ApplyDamageFlow.sendDecisionMessage(
        defender,
        amount,
        isPhysical,
        'blackIc'
      );
    }
  }

  /**
   * @param {import('@documents/index').SR4Actor} defender
   * @param {{ attackerUuid: string }} payload
   */
  async #handleJam(defender, payload) {
    if (!getMatrixPersona(defender).inVR) return;
    await defender.update({ 'system.matrix.jammedBy': payload.attackerUuid });
    await ChatMessage.create({
      content: getGame().i18n.format('sr4.matrix.cybercombat.jammed', {
        name: defender.name,
      }),
    });
  }
}
