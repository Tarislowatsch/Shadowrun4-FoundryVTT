import {
  openDirectSpellResistDialog,
  openIndirectSpellDefenseDialog,
} from '@utils/dialog/magic/combat-spell.js';
import { openOpposedSpellResistDialog } from '@utils/dialog/magic/opposed-spell.js';
import {
  autoResolveSpellResist,
  directSpellResistAttribute,
  localizeResistAttribute,
} from '@utils/dialog/magic/resist-actions.js';
import { ApplyDamageFlow } from '@flows/apply-damage-flow';
import { sendEffectDecisionMessage } from '@flows/apply-effects-flow';
import { isResponsibleForActor } from '@utils/index';
import {
  requestReactiveDecision,
  DecisionCategory,
  DecisionKind,
  DecisionRouting,
} from '@utils/rolls/decision-provider.js';
import { BaseSocketHook } from './base-socket-hook.js';

/**
 * @typedef {object} DirectSpellResistPayload
 * @property {string} defenderUuid
 * @property {string} casterUuid
 * @property {string} spellName
 * @property {number} castingHits
 * @property {number} force
 * @property {boolean} isMana
 */

/**
 * @typedef {object} DirectSpellDamagePayload
 * @property {string} defenderUuid
 * @property {string} casterUuid
 * @property {string} spellName
 * @property {number} damage
 * @property {boolean} isPhysical
 */

/**
 * @typedef {object} IndirectSpellDefensePayload
 * @property {string} defenderUuid
 * @property {string} casterUuid
 * @property {import('@models/index').SR4Spell} spell
 * @property {number} castingHits
 * @property {number} force
 */

/**
 * @typedef {object} OpposedSpellResistPayload
 * @property {string} defenderUuid
 * @property {string} casterUuid
 * @property {string} spellName
 * @property {number} castingHits
 * @property {number} force
 * @property {string} resistAttribute
 */

export class CombatSpellHook extends BaseSocketHook {
  /**
   * @param {{ action: string, payload: DirectSpellResistPayload | DirectSpellDamagePayload | IndirectSpellDefensePayload | OpposedSpellResistPayload }} data
   * @returns {Promise<void>}
   */
  async _onSocketMessage(data) {
    if (
      data.action !== 'triggerDirectSpellResist' &&
      data.action !== 'applyDirectSpellDamage' &&
      data.action !== 'triggerIndirectSpellDefense' &&
      data.action !== 'triggerOpposedSpellResist'
    )
      return;

    const { defenderUuid } = data.payload ?? {};

    /** @type {import('@documents/index').SR4Actor | undefined} */
    const defender = /** @type {any} */ (await fromUuid(defenderUuid));
    if (!defender) return;

    if (!isResponsibleForActor(/** @type {any} */ (defender).id)) return;

    if (data.action === 'triggerDirectSpellResist') {
      const { casterUuid, spellName, castingHits, force, isMana } =
        /** @type {DirectSpellResistPayload} */ (data.payload);
      const attr = directSpellResistAttribute(isMana);
      await requestReactiveDecision({
        actor: defender,
        category: DecisionCategory.MAGIC,
        dialogKind: DecisionKind.DIRECT_SPELL_RESIST,
        routing: DecisionRouting.OWNER,
        chatModeSupported: true,
        defaultResult: () =>
          autoResolveSpellResist({
            defender,
            resistAttribute: attr,
            label: localizeResistAttribute(attr),
            castingHits,
            socketAction: 'directSpellResisted',
            casterUuid,
          }),
        openDialog: () =>
          openDirectSpellResistDialog(
            defender,
            spellName,
            castingHits,
            force,
            isMana,
            casterUuid
          ),
      });
    } else if (data.action === 'applyDirectSpellDamage') {
      const { damage, isPhysical, spellName, casterUuid, effects } =
        /** @type {DirectSpellDamagePayload} */ (data.payload);
      const caster = /** @type {any} */ (await fromUuid(casterUuid));
      await ApplyDamageFlow.sendCombatSummary(
        caster?.name ?? '?',
        defender.name,
        'directSpell',
        { spell: spellName, damage, isPhysical }
      );
      await ApplyDamageFlow.sendDecisionMessage(
        defender,
        damage,
        isPhysical,
        'spell'
      );
      if (effects?.length > 0) {
        await sendEffectDecisionMessage(defender, effects, spellName);
      }
    } else if (data.action === 'triggerIndirectSpellDefense') {
      const { casterUuid, spell, castingHits, force } =
        /** @type {IndirectSpellDefensePayload} */ (data.payload);
      /** @type {import('@documents/index').SR4Actor | undefined} */
      const attacker = /** @type {any} */ (await fromUuid(casterUuid));
      if (!attacker) return;
      await requestReactiveDecision({
        actor: defender,
        category: DecisionCategory.MAGIC,
        dialogKind: DecisionKind.INDIRECT_SPELL_DEFENSE,
        routing: DecisionRouting.OWNER,
        openDialog: () =>
          openIndirectSpellDefenseDialog(
            defender,
            attacker,
            spell,
            castingHits,
            force
          ),
      });
    } else if (data.action === 'triggerOpposedSpellResist') {
      const { casterUuid, spellName, castingHits, force, resistAttribute } =
        /** @type {OpposedSpellResistPayload} */ (data.payload);
      await requestReactiveDecision({
        actor: defender,
        category: DecisionCategory.MAGIC,
        dialogKind: DecisionKind.OPPOSED_SPELL_RESIST,
        routing: DecisionRouting.OWNER,
        chatModeSupported: true,
        defaultResult: () =>
          autoResolveSpellResist({
            defender,
            resistAttribute,
            label: localizeResistAttribute(resistAttribute),
            castingHits,
            socketAction: 'opposedSpellResisted',
            casterUuid,
          }),
        openDialog: () =>
          openOpposedSpellResistDialog(
            defender,
            spellName,
            castingHits,
            force,
            resistAttribute,
            casterUuid
          ),
      });
    }
  }
}
