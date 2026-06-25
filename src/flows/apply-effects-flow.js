import { getGame } from '@utils/index';

/**
 * @typedef {object} EffectDecisionEntry
 * @property {import('@documents/index').SR4Actor} target
 * @property {object[]} effectData
 * @property {string} spellName
 */

/** @type {Map<string, EffectDecisionEntry>} */
const effectDecisionRegistry = new Map();

/**
 * @param {string} messageId
 * @returns {EffectDecisionEntry | undefined}
 */
export function getEffectDecisionEntry(messageId) {
  return effectDecisionRegistry.get(messageId);
}

/**
 * @param {string} messageId
 * @returns {Promise<void>}
 */
export async function resolveEffectDecision(messageId) {
  effectDecisionRegistry.delete(messageId);
  const message = game.messages?.get(messageId);
  if (
    message &&
    !message.flags?.sr4?.effectDecision?.resolved &&
    message.isAuthor
  ) {
    await message.update({ 'flags.sr4.effectDecision.resolved': true });
  }
}

/**
 * @param {import('@models/index').SR4Spell | object} spell
 * @returns {object[]}
 */
export function getSpellEffectData(spell) {
  const effects = spell.effects?.contents ?? spell.effects ?? [];
  return effects.map((e) => {
    const d = typeof e.toObject === 'function' ? e.toObject() : { ...e };
    delete d._id;
    d.disabled = false;
    d.transfer = true;
    return d;
  });
}

/**
 * @param {object[]} effectData
 * @param {import('@documents/index').SR4Actor} target
 * @returns {Promise<void>}
 */
export async function applySpellEffects(effectData, target) {
  for (const data of effectData) {
    await ActiveEffect.create(data, { parent: target });
  }
}

/**
 * @param {import('@documents/index').SR4Actor} target
 * @param {object[]} effectData
 * @param {string} spellName
 * @returns {Promise<string | null>}
 */
export async function sendEffectDecisionMessage(target, effectData, spellName) {
  if (effectData.length === 0) return null;

  const i18n = getGame().i18n;
  const effectNames = effectData.map((e) => e.name).join(', ');
  const text = i18n.format('sr4.effect.pendingEffects', {
    name: target.name,
    spell: spellName,
  });
  const content = `<div class="effect-decision-card"><p>${text}</p><p><em>${effectNames}</em></p></div>`;

  const message = await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor: target }),
    flags: {
      sr4: {
        effectDecision: {
          actorId: target.id,
          spellName,
          resolved: false,
        },
      },
    },
  });

  effectDecisionRegistry.set(message.id, {
    target,
    effectData,
    spellName,
  });

  return message.id;
}
