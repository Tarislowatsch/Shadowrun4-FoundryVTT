import { getGame } from '@utils/index';
import { resolveEdgeOffer } from '@utils/rolls/edge-offer-card.js';

/**
 * @typedef {object} DamageDecisionEntry
 * @property {import('@documents/index').SR4Actor} actor
 * @property {number} amount
 * @property {boolean} isPhysical
 * @property {string} context
 * @property {string[]} edgeOfferIds
 * @property {string | undefined} hint
 * @property {(() => Promise<void>) | undefined} onApply
 */

/** @type {Map<string, DamageDecisionEntry>} */
const damageDecisionRegistry = new Map();

/**
 * @param {string} messageId
 * @returns {DamageDecisionEntry | undefined}
 */
export function getDamageDecisionEntry(messageId) {
  return damageDecisionRegistry.get(messageId);
}

/**
 * @param {string} messageId
 * @returns {Promise<void>}
 */
export async function resolveDamageDecision(messageId) {
  const entry = damageDecisionRegistry.get(messageId);
  if (entry) {
    for (const eid of entry.edgeOfferIds) {
      await resolveEdgeOffer(eid);
    }
    damageDecisionRegistry.delete(messageId);
  }
  const message = game.messages?.get(messageId);
  if (
    message &&
    !message.flags?.sr4?.damageDecision?.resolved &&
    message.isAuthor
  ) {
    await message.setFlag('sr4', 'damageDecision.resolved', true);
  }
}

/**
 * @param {boolean} isPhysical
 * @returns {string}
 */
function localizeDamageType(isPhysical) {
  const i18n = getGame().i18n;
  return isPhysical
    ? i18n.localize('sr4.damage.physical')
    : i18n.localize('sr4.damage.stun');
}

/**
 * Handles the application of physical and stun damage
 * to a Shadowrun 4 condition monitor.
 */
export class ApplyDamageFlow {
  /**
   * @param {number} unresisted The amount of unresisted damage.
   * @param {boolean} isPhysical Whether the damage is physical (`true`) or stun (`false`).
   * @param {import('@documents/index').SR4Actor} actor The actor receiving the damage.
   * @param {string} reason Reason for the damage, used in generated messages.
   * @returns {Promise<Array<{ type: string, content: string }>>}
   */
  static async apply(unresisted, isPhysical, actor, reason) {
    const actorName =
      foundry.utils.getProperty(actor, 'name') ?? 'Unknown Actor';
    /** @type {import('@models/index').SR4BaseCharacterSystem} */
    const sys = /** @type {any} */ (actor).system;
    const effectiveIsPhysical = sys.simpleHp ? true : isPhysical;
    if (unresisted > 0) {
      const cm = foundry.utils.deepClone(sys.conditionMonitor);
      const overflow = foundry.utils.deepClone(sys.derivedStats.overflow);
      const { conditionMonitor: updatedMonitor, messages } =
        ApplyDamageFlow.applyDamage(
          cm,
          unresisted,
          effectiveIsPhysical,
          actorName,
          overflow,
          reason
        );
      await actor.update({ 'system.conditionMonitor': updatedMonitor });
      return messages;
    }
    return [
      {
        type: 'EMOTE',
        content: getGame().i18n.format('sr4.damage.resisted', {
          name: actorName,
        }),
      },
    ];
  }

  /**
   * @param {import('@models/index').SR4ConditionMonitor} conditionMonitor
   * @param {number} unresisted
   * @param {boolean} isPhysical
   * @param {string} actorName
   * @param {number} overflow
   * @param {string} reason
   * @returns {{
   *   conditionMonitor: import('@models/index').SR4ConditionMonitor,
   *   messages: Array<{ type: string, content: string }>
   * }}
   */
  static applyDamage(
    conditionMonitor,
    unresisted,
    isPhysical,
    actorName,
    overflow,
    reason
  ) {
    const messages = [];
    if (isPhysical) {
      ApplyDamageFlow.applyPhysicalDamage(
        conditionMonitor,
        unresisted,
        messages,
        actorName,
        overflow,
        reason
      );
    } else {
      ApplyDamageFlow.applyStunDamage(
        conditionMonitor,
        unresisted,
        messages,
        actorName,
        overflow,
        reason
      );
    }
    return { conditionMonitor, messages };
  }

  /**
   * @param {import('@models/index').SR4ConditionMonitor} cm
   * @param {number} damage
   * @param {Array<{ type: string, content: string }>} messages
   * @param {string} actorName
   * @param {number} overflow
   * @param {string} reason
   * @returns {void}
   */
  static applyPhysicalDamage(
    cm,
    damage,
    messages,
    actorName,
    overflow,
    reason
  ) {
    const phys = cm.physical;
    const afterPhys = phys.value + damage;
    const max = phys.max;
    const cap = phys.max + (overflow ?? 0);

    phys.value = Math.min(afterPhys, cap);

    if (afterPhys >= cap) {
      messages.push({
        type: 'EMOTE',
        content: getGame().i18n.format('sr4.damage.actordead', {
          name: actorName,
        }),
      });
    } else if (afterPhys >= max) {
      messages.push({
        type: 'EMOTE',
        content: getGame().i18n.format('sr4.damage.actoroverflow', {
          name: actorName,
        }),
      });
    }

    messages.push(
      ApplyDamageFlow.createDamageMessage(actorName, damage, true, reason)
    );
  }

  /**
   * @param {import('@models/index').SR4ConditionMonitor} cm
   * @param {number} damage
   * @param {Array<{ type: string, content: string }>} messages
   * @param {string} name
   * @param {number} overflow
   * @param {string} reason
   * @returns {void}
   */
  static applyStunDamage(cm, damage, messages, name, overflow, reason) {
    const stun = cm.stun;
    const afterStun = stun.value + damage;
    const spillover = afterStun - stun.max;
    if (spillover > 0) {
      damage = damage - spillover;
    }

    messages.push(
      ApplyDamageFlow.createDamageMessage(name, damage, false, reason)
    );

    if (afterStun < stun.max) {
      stun.value = afterStun;
      return;
    }

    stun.value = stun.max;

    messages.push({
      type: 'unconscious',
      content: getGame().i18n.format('sr4.damage.actorunconscious', { name }),
    });

    if (spillover > 0) {
      ApplyDamageFlow.applyPhysicalDamage(
        cm,
        spillover,
        messages,
        name,
        overflow,
        reason
      );
    }
  }

  /**
   * @param {string} actorName
   * @param {number} damage
   * @param {boolean} isPhysical
   * @param {string} reason
   * @returns {{ type: string, content: string }}
   */
  static createDamageMessage(actorName, damage, isPhysical, reason) {
    const damageReason = getGame().i18n.localize(`sr4.damage.reason.${reason}`);
    const damageType = localizeDamageType(isPhysical);

    return {
      content: getGame().i18n.format('sr4.damage.damagesummary', {
        name: actorName,
        amount: damage,
        type: damageType,
        reason: damageReason,
      }),
      type: 'EMOTE',
    };
  }

  /**
   * Posts a non-blocking damage decision chat card. Buttons are rendered
   * per-client via the renderChatMessageHTML hook in DieChatHook.
   *
   * @param {import('@documents/index').SR4Actor} actor
   * @param {number} amount
   * @param {boolean} isPhysical
   * @param {string} context
   * @param {{ edgeOfferIds?: string[], hint?: string, onApply?: () => Promise<void> }} [options]
   * @returns {Promise<string | null>} the ChatMessage id, or null when the workflow is disabled
   */
  static async sendDecisionMessage(
    actor,
    amount,
    isPhysical,
    context,
    { edgeOfferIds = [], hint, onApply } = {}
  ) {
    if (!game.settings.get('shadowrun4e', 'applyDamageWorkflow')) {
      await ApplyDamageFlow.applyAndSend(
        amount,
        isPhysical,
        actor,
        context,
        onApply
      );
      for (const eid of edgeOfferIds) await resolveEdgeOffer(eid);
      return null;
    }

    const damageType = localizeDamageType(isPhysical);
    const hintHtml = hint ? `<p><em>${hint}</em></p>` : '';
    const content = `<div class="damage-decision-card"><p>${getGame().i18n.format(
      'sr4.damage.pendingChat',
      {
        name: actor.name,
        amount,
        type: damageType,
      }
    )}</p>${hintHtml}</div>`;

    const message = await ChatMessage.create({
      content,
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: {
        sr4: {
          damageDecision: {
            actorId: actor.id,
            amount,
            isPhysical,
            context,
            resolved: false,
          },
        },
      },
    });

    damageDecisionRegistry.set(message.id, {
      actor,
      amount,
      isPhysical,
      context,
      edgeOfferIds,
      hint,
      onApply,
    });

    return message.id;
  }

  /**
   * @param {number} amount
   * @param {boolean} isPhysical
   * @param {import('@documents/index').SR4Actor} actor
   * @param {string} context
   * @param {(() => Promise<void>) | undefined} [onApply]
   * @returns {Promise<void>}
   */
  static async applyAndSend(amount, isPhysical, actor, context, onApply) {
    const messages = await ApplyDamageFlow.apply(
      amount,
      isPhysical,
      actor,
      context
    );
    if (messages.length > 0)
      await ApplyDamageFlow.sendMessages(messages, actor);
    if (onApply) await onApply();
  }

  /**
   * Sends a public chat message summarising a combat or spell outcome.
   *
   * @param {string} attackerName
   * @param {string} defenderName
   * @param {'potential'|'result'|'directSpell'} mode
   * @param {{ hits?: number, damage?: number, base?: number, soaked?: number, final?: number, spell?: string, isPhysical: boolean }} params
   */
  static async sendCombatSummary(attackerName, defenderName, mode, params) {
    const i18n = getGame().i18n;
    const type = localizeDamageType(params.isPhysical);

    let content;
    if (mode === 'potential') {
      content = i18n.format('sr4.damage.chatPotential', {
        attacker: attackerName,
        defender: defenderName,
        hits: params.hits,
        damage: params.damage,
        type,
      });
    } else if (mode === 'result') {
      content = i18n.format('sr4.damage.chatResult', {
        attacker: attackerName,
        defender: defenderName,
        base: params.base,
        soaked: params.soaked,
        final: params.final,
        type,
      });
    } else {
      content = i18n.format('sr4.damage.chatDirectSpell', {
        attacker: attackerName,
        defender: defenderName,
        spell: params.spell,
        damage: params.damage,
        type,
      });
    }
    if (content) await ChatMessage.create({ content });
  }

  /**
   * @param {Array<{ type: string, content: string }>} messages
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
