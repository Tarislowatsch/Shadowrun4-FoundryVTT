import { getGame } from '@utils/index';
import {
  requestReactiveDecision,
  DecisionCategory,
  DecisionKind,
  DecisionRouting,
} from '@utils/rolls/decision-provider.js';
import { SR4 } from '../config.js';
import { SR4ActiveEffect } from '@effects/index';
import { getMatrixPersona } from '@utils/matrix/matrix-persona.js';
import {
  openMatrixResistDialog,
  defaultMatrixResistHits,
} from '@utils/dialog/matrix/cybercombat.js';
import { ApplyDamageFlow } from './apply-damage-flow.js';

/**
 * @param {'cold'|'hot'} simMode
 * @param {number} willpower
 * @returns {{ dv: number, isPhysical: boolean, disorientSeconds: number }}
 */
export function computeDumpshockParams(simMode, willpower) {
  return {
    dv: SR4.rules.matrix.dumpshockDv,
    isPhysical: simMode === 'hot',
    disorientSeconds: Math.max(0, (10 - (willpower ?? 0)) * 60),
  };
}

export class DumpshockFlow {
  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @returns {Promise<void>}
   */
  static async start(actor) {
    const persona = getMatrixPersona(actor);
    if (persona.isDevice || persona.isSprite) return;

    const willpower = actor.getAttribute?.('WILLPOWER') ?? 0;
    const { dv, isPhysical, disorientSeconds } = computeDumpshockParams(
      persona.simMode,
      willpower
    );

    const label = getGame().i18n.localize('sr4.matrix.dumpshock.resistTitle');
    const resistHits = await requestReactiveDecision({
      actor,
      category: DecisionCategory.MATRIX,
      dialogKind: DecisionKind.DUMPSHOCK,
      routing: DecisionRouting.OWNER,
      chatModeSupported: true,
      defaultResult: () =>
        defaultMatrixResistHits(actor, { label, biofeedback: true }),
      openDialog: () =>
        openMatrixResistDialog(actor, {
          dv,
          label,
          biofeedback: true,
        }),
    });

    const unresisted = Math.max(dv - (resistHits ?? 0), 0);
    if (unresisted > 0) {
      await ApplyDamageFlow.sendDecisionMessage(
        actor,
        unresisted,
        isPhysical,
        'dumpshock'
      );
    }

    if (disorientSeconds > 0) {
      await SR4ActiveEffect.fromTemplate(
        'dumpshocked',
        /** @type {any} */ (actor),
        {
          duration: { seconds: disorientSeconds },
        }
      );
    }
  }
}
