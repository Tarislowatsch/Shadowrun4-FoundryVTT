import { getGame } from '@utils/index';
import {
  requestReactiveDecision,
  DecisionCategory,
  DecisionKind,
  DecisionRouting,
} from '@utils/rolls/decision-provider.js';
import { getMatrixPersona } from '../matrix-persona.js';
import { computeBiofeedbackDamage } from '../matrix-rules.js';
import {
  openMatrixDefenseDialog,
  openMatrixResistDialog,
  defaultMatrixDefenseHits,
  defaultMatrixResistHits,
} from '../dialogs/cybercombat.js';
import { MatrixDamageFlow } from './matrix-damage-flow.js';
import { ApplyDamageFlow } from '@domains/combat/flow/apply-damage-flow.js';

export class MatrixDefenseFlow {
  /**
   * @param {import('@documents/index').SR4Actor} defender
   * @param {{ attackerUuid: string, programName: string, attackHits: number }} payload
   * @returns {Promise<void>}
   */
  static async handleDefense(defender, payload) {
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
   * @returns {Promise<void>}
   */
  static async handleMatrixResist(defender, payload) {
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
   * @returns {Promise<void>}
   */
  static async handleBiofeedbackResist(defender, payload) {
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
   * @returns {Promise<void>}
   */
  static async handleJam(defender, payload) {
    if (!getMatrixPersona(defender).inVR) return;
    await defender.update({ 'system.matrix.jammedBy': payload.attackerUuid });
    await ChatMessage.create({
      content: getGame().i18n.format('sr4.matrix.cybercombat.jammed', {
        name: defender.name,
      }),
    });
  }
}
