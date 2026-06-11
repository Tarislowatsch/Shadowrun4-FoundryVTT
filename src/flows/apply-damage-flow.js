import { getGame, openModifyDamageDialog } from '@utils/index';

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
    const afterPhys = phys.current + damage;
    const max = phys.max;
    const cap = phys.max + (overflow ?? 0);

    phys.current = Math.min(afterPhys, cap);

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
    const afterStun = stun.current + damage;
    const spillover = afterStun - stun.max;
    if (spillover > 0) {
      damage = damage - spillover;
    }

    messages.push(
      ApplyDamageFlow.createDamageMessage(name, damage, false, reason)
    );

    if (afterStun < stun.max) {
      stun.current = afterStun;
      return;
    }

    stun.current = stun.max;

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
    const damageType = isPhysical
      ? getGame().i18n.localize('sr4.damage.physical')
      : getGame().i18n.localize('sr4.damage.stun');

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
   * Shows a dialog asking the user to either apply damage as-is, modify it,
   * or trigger an edge reroll (if available).
   *
   * @param {import('@documents/index').SR4Actor} actor
   * @param {number} amount
   * @param {boolean} isPhysical
   * @param {string} context
   * @param {{ onReroll?: () => Promise<void>, edgeUsed?: boolean }} [options]
   * @returns {Promise<void>}
   */
  static async sendDecisionMessage(
    actor,
    amount,
    isPhysical,
    context,
    { onReroll, edgeUsed = false } = {}
  ) {
    const damageType = isPhysical
      ? getGame().i18n.localize('sr4.damage.physical')
      : getGame().i18n.localize('sr4.damage.stun');

    const buttons = [
      {
        label: `${getGame().i18n.localize('sr4.damage.apply')} (${amount} ${damageType})`,
        action: 'apply',
      },
      {
        label: getGame().i18n.localize('sr4.damage.modify'),
        action: 'modify',
      },
    ];

    const canUseEdge =
      onReroll && !edgeUsed && actor.getAttribute('CURRENTEDGE') > 0;
    if (canUseEdge) {
      buttons.push({
        label: getGame().i18n.localize('sr4.roll.edge.useEdgePrompt'),
        action: 'reroll',
      });
    }

    const action = await foundry.applications.api.DialogV2.wait({
      window: { title: getGame().i18n.localize('sr4.damage.decisiontitle') },
      content: `<p>${getGame().i18n.format('sr4.damage.pending', {
        name: actor.name,
        amount,
        type: damageType,
      })}</p>`,
      buttons,
    });

    if (action === 'apply') {
      const messages = await ApplyDamageFlow.apply(
        amount,
        isPhysical,
        actor,
        context
      );
      if (messages.length > 0)
        await ApplyDamageFlow.sendMessages(messages, actor);
    } else if (action === 'modify') {
      const finalAmount = await openModifyDamageDialog(
        actor,
        amount,
        isPhysical
      );
      if (finalAmount === null) return;
      const messages = await ApplyDamageFlow.apply(
        finalAmount,
        isPhysical,
        actor,
        context
      );
      if (messages.length > 0)
        await ApplyDamageFlow.sendMessages(messages, actor);
    } else if (action === 'reroll' && onReroll) {
      await onReroll();
    }
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
