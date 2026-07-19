import {
  awaitOpposedSocketResponse,
  getGame,
  getValidMatrixTargetActorsOrWarn,
  getOffensivePrograms,
  getMatrixPersona,
} from '@utils/index.js';
import { DiceUtility } from '@utils/rolls';
import { resolveEdgeForRoll } from '@utils/rolls/roll-edge-decision.js';
import {
  openCybercombatAttackDialog,
  openMatrixResistDialog,
} from '@utils/dialog/matrix/cybercombat.js';
import { DumpshockFlow } from './dumpshock-flow.js';

export class CybercombatFlow {
  /**
   * @param {import('@documents/index').SR4Actor} attacker
   * @returns {Promise<void>}
   */
  static async start(attacker) {
    if (!getGame().settings.get('shadowrun4e', 'cybercombatWorkflow')) return;

    const programs = getOffensivePrograms(attacker);
    if (programs.length === 0) {
      ui?.notifications?.warn(
        getGame().i18n.localize('sr4.matrix.cybercombat.noPrograms')
      );
      return;
    }

    const targets = getValidMatrixTargetActorsOrWarn(
      getGame().i18n.localize('sr4.matrix.cybercombat.attackTitle')
    );
    if (targets.length === 0) return;

    const rollResult = await openCybercombatAttackDialog(attacker, programs);
    if (!rollResult) return;

    const attackHits = await resolveEdgeForRoll(
      attacker,
      {
        successes: rollResult.successes,
        rolledDice: rollResult.rolledDice,
        isGlitch: rollResult.isGlitch,
        edgeUsed: rollResult.edgeUsed,
        messageId: rollResult.messageId,
      },
      Infinity
    );

    for (const target of targets) {
      if (!target.uuid) continue;
      await CybercombatFlow._attackVsTarget(
        attacker,
        target,
        rollResult.program,
        attackHits
      );
    }
  }

  /**
   * @param {import('@documents/index').SR4Actor} attacker
   * @param {import('@documents/index').SR4Actor} target
   * @param {{ category: string, rating: number, name: string }} program
   * @param {number} attackHits
   * @returns {Promise<void>}
   */
  static async _attackVsTarget(attacker, target, program, attackHits) {
    const defenderUuid = target.uuid;
    const attackerUuid = attacker.uuid;
    const i18n = getGame().i18n;

    const defenseHits = await awaitOpposedSocketResponse({
      triggerAction: 'triggerMatrixDefense',
      triggerPayload: {
        defenderUuid,
        attackerUuid,
        programName: program.name,
        programCategory: program.category,
        programRating: program.rating,
        attackHits,
      },
      matchAction: 'matrixDefenseRolled',
      matches: (payload) =>
        payload?.attackerUuid === attackerUuid &&
        payload?.defenderUuid === defenderUuid,
      onMatch: (payload) => payload.defenseHits ?? 0,
      fallback: 0,
    });

    const netHits = attackHits - defenseHits;
    if (netHits < 1) {
      await ChatMessage.create({
        content: i18n.format('sr4.matrix.cybercombat.miss', {
          attacker: attacker.name,
          defender: target.name,
        }),
      });
      return;
    }

    const dv = program.rating + netHits;

    if (program.category === 'attack') {
      getGame().socket?.emit('system.shadowrun4e', {
        action: 'triggerMatrixResist',
        payload: {
          defenderUuid,
          attackerUuid,
          dv,
          programName: program.name,
        },
      });
      return;
    }

    if (target.type === 'device' || target.type === 'sprite') {
      await ChatMessage.create({
        content: i18n.format('sr4.matrix.cybercombat.noEffect', {
          defender: target.name,
        }),
      });
      return;
    }

    getGame().socket?.emit('system.shadowrun4e', {
      action: 'triggerBiofeedbackResist',
      payload: {
        defenderUuid,
        attackerUuid,
        programCategory: program.category,
        dv,
      },
    });
    getGame().socket?.emit('system.shadowrun4e', {
      action: 'applyMatrixJam',
      payload: { defenderUuid, attackerUuid },
    });
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @returns {Promise<void>}
   */
  static async jackOut(actor) {
    /** @type {any} */
    const sys = actor.system;
    const jammedBy = sys.matrix?.jammedBy;
    const i18n = getGame().i18n;
    if (!jammedBy) return;

    const ic = /** @type {import('@documents/index').SR4Actor} */ (
      /** @type {any} */ (await fromUuid(jammedBy))
    );
    let icHits = 0;
    if (ic) {
      const persona = getMatrixPersona(ic);
      const icPool = Math.max(persona.rating + persona.response, 1);
      const icRoll = await DiceUtility.rollAndShow({
        numDice: icPool,
        edgeAvailable: false,
        skillName: i18n.localize('sr4.matrix.cybercombat.jackOutIc'),
      });
      icHits = icRoll.successes;
    }

    const userHits = await openMatrixResistDialog(actor, {
      dv: icHits,
      label: i18n.localize('sr4.matrix.cybercombat.jackOutTitle'),
      biofeedback: true,
    });
    if (userHits === null) return;

    if (userHits > icHits) {
      await actor.update({
        'system.matrix.jammedBy': '',
        'system.realm': 'physical',
      });
      await ChatMessage.create({
        content: i18n.format('sr4.matrix.cybercombat.jackOutSuccess', {
          name: actor.name,
        }),
      });
      await DumpshockFlow.start(actor);
    } else {
      await ChatMessage.create({
        content: i18n.format('sr4.matrix.cybercombat.jackOutFail', {
          name: actor.name,
        }),
      });
    }
  }
}
