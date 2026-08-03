import { emitSystemSocket, getGame } from '@utils/index';
import { getMatrixPersona } from '../matrix-persona.js';
import { applyMatrixDamage } from '../matrix-rules.js';
import { ApplyDamageFlow } from '@domains/combat/flow/apply-damage-flow.js';
import { createDecisionRegistry } from '@utils/decision-registry.js';
import { SYSTEM_ID } from '@utils/game/system-id.js';

/**
 * @typedef {object} MatrixDamageDecisionEntry
 * @property {import('@documents/index').SR4Actor} actor
 * @property {number} amount
 * @property {string} context
 */

/** @type {ReturnType<typeof createDecisionRegistry<MatrixDamageDecisionEntry>>} */
const matrixDamageRegistry = createDecisionRegistry('matrixDamageDecision');

/**
 * @param {string} messageId
 * @returns {MatrixDamageDecisionEntry | undefined}
 */
export function getMatrixDamageDecisionEntry(messageId) {
  return matrixDamageRegistry.get(messageId);
}

/**
 * @param {string} messageId
 * @returns {Promise<void>}
 */
export async function resolveMatrixDamageDecision(messageId) {
  await matrixDamageRegistry.resolve(messageId);
}

export class MatrixDamageFlow {
  /**
   * @param {number} amount
   * @param {import('@documents/index').SR4Actor} actor
   * @param {string} reason
   * @returns {Promise<void>}
   */
  static async apply(amount, actor, reason) {
    const persona = getMatrixPersona(actor);
    if (persona.isSprite || persona.isTechnomancer) {
      await MatrixDamageFlow.applyAsStun(amount, actor, reason);
      return;
    }

    /** @type {any} */
    const sys = actor.system;
    const monitor = foundry.utils.deepClone(sys.conditionMonitor?.matrix);
    if (!monitor) return;

    const i18n = getGame().i18n;
    const messages = [];
    const wasCrashed = monitor.value >= monitor.max;

    if (amount > 0) {
      const damaged = applyMatrixDamage(monitor.value, monitor.max, amount);
      messages.push({
        content: i18n.format('sr4.matrix.damage.summary', {
          name: actor.name,
          amount,
          reason: i18n.localize(`sr4.matrix.damage.reason.${reason}`),
        }),
      });
      if (damaged.value !== monitor.value) {
        monitor.value = damaged.value;
        await actor.update({
          'system.conditionMonitor.matrix.value': monitor.value,
        });
      }
    } else {
      messages.push({
        content: i18n.format('sr4.matrix.damage.resisted', {
          name: actor.name,
        }),
      });
    }

    if (!wasCrashed && monitor.value >= monitor.max) {
      await MatrixDamageFlow.handleCrash(actor, messages);
    }

    await MatrixDamageFlow.sendMessages(messages, actor);
  }

  /**
   * @param {number} amount
   * @param {import('@documents/index').SR4Actor} actor
   * @param {string} reason
   * @returns {Promise<void>}
   */
  static async applyAsStun(amount, actor, reason) {
    const stunBefore =
      /** @type {any} */ (actor).system?.conditionMonitor?.stun?.value ?? 0;
    const messages = await ApplyDamageFlow.apply(amount, false, actor, reason);
    await ApplyDamageFlow.sendMessages(messages, actor);

    /** @type {any} */
    const stun = /** @type {any} */ (actor).system?.conditionMonitor?.stun;
    if (amount > 0 && stun && stunBefore < stun.max && stun.value >= stun.max) {
      const crashMessages = [];
      await MatrixDamageFlow.handleCrash(actor, crashMessages);
      await MatrixDamageFlow.sendMessages(crashMessages, actor);
    }
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {Array<{ content: string }>} messages
   * @returns {Promise<void>}
   */
  static async handleCrash(actor, messages) {
    const i18n = getGame().i18n;
    messages.push({
      content: i18n.format('sr4.matrix.damage.crashed', { name: actor.name }),
    });

    const persona = getMatrixPersona(actor);
    if (persona.isDevice || persona.isSprite) return;

    if (persona.inVR) {
      await actor.update({
        'system.realm': 'physical',
        'system.matrix.jammedBy': '',
      });
      await emitSystemSocket({
        action: 'triggerDumpshock',
        payload: { defenderUuid: /** @type {any} */ (actor).uuid },
      });
    }
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {number} amount
   * @param {string} context
   * @returns {Promise<string | null>}
   */
  static async sendDecisionMessage(actor, amount, context) {
    if (!getGame().settings.get('shadowrun4e', 'applyDamageWorkflow')) {
      await MatrixDamageFlow.apply(amount, actor, context);
      return null;
    }

    const persona = getMatrixPersona(actor);
    const pendingKey =
      persona.isSprite || persona.isTechnomancer
        ? 'sr4.matrix.damage.pendingStunChat'
        : 'sr4.matrix.damage.pendingChat';
    const content = `<div class="matrix-damage-decision-card"><p>${getGame().i18n.format(
      pendingKey,
      { name: actor.name, amount }
    )}</p></div>`;

    const message = await ChatMessage.create({
      content,
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: {
        [SYSTEM_ID]: {
          matrixDamageDecision: {
            actorId: actor.id,
            amount,
            context,
            resolved: false,
          },
        },
      },
    });

    if (!message) {
      console.error(
        `SR4 | matrix damage decision card could not be created for ${actor.name}, applying damage directly`
      );
      await MatrixDamageFlow.apply(amount, actor, context);
      return null;
    }

    matrixDamageRegistry.set(message.id, { actor, amount, context });
    return message.id;
  }

  /**
   * @param {Array<{ content: string }>} messages
   * @param {import('@documents/index').SR4Actor} actor
   * @returns {Promise<void>}
   */
  static async sendMessages(messages, actor) {
    const speaker = ChatMessage.getSpeaker({ actor });
    for (const msg of messages) {
      await ChatMessage.create({ content: msg.content, speaker });
    }
  }
}
