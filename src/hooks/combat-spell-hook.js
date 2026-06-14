import {
  openDirectSpellResistDialog,
  openIndirectSpellDefenseDialog,
} from '@utils/dialog/magic/combat-spell.js';
import { ApplyDamageFlow } from '@flows/apply-damage-flow';
import { getGame, isResponsibleForActor } from '@utils/index';

/**
 * @typedef {object} DirectSpellResistPayload
 * @property {string} defenderId
 * @property {string} casterId
 * @property {string} spellName
 * @property {number} castingHits
 * @property {number} force
 * @property {boolean} isMana
 */

/**
 * @typedef {object} DirectSpellDamagePayload
 * @property {string} defenderId
 * @property {string} casterId
 * @property {string} spellName
 * @property {number} damage
 * @property {boolean} isPhysical
 */

/**
 * @typedef {object} IndirectSpellDefensePayload
 * @property {string} defenderId
 * @property {string} casterId
 * @property {import('@models/index').SR4Spell} spell
 * @property {number} castingHits
 * @property {number} force
 */

/**
 * Listens on the system socket for incoming combat spell triggers and runs the
 * appropriate damage/defense flow on the defender's client.
 */
export class CombatSpellHook {
  constructor() {
    this._boundHandler = this._onSocketMessage.bind(this);
    this._registerSocketHandler();
  }

  /** @returns {void} */
  _registerSocketHandler() {
    Hooks.once('ready', () => {
      const socket = getGame().socket;
      if (!socket) return;
      socket.off('system.shadowrun4e', this._boundHandler);
      socket.on('system.shadowrun4e', this._boundHandler);
    });
  }

  /**
   * @param {{ action: string, payload: DirectSpellResistPayload | DirectSpellDamagePayload | IndirectSpellDefensePayload }} data
   * @returns {Promise<void>}
   */
  async _onSocketMessage(data) {
    if (
      data.action !== 'triggerDirectSpellResist' &&
      data.action !== 'applyDirectSpellDamage' &&
      data.action !== 'triggerIndirectSpellDefense'
    )
      return;

    const { defenderId } = data.payload ?? {};

    /** @type {import('@documents/index').SR4Actor | undefined} */
    const defender = getGame().actors?.get(defenderId);
    if (!defender) return;

    if (!isResponsibleForActor(defenderId)) return;

    if (data.action === 'triggerDirectSpellResist') {
      const { casterId, spellName, castingHits, force, isMana } =
        /** @type {DirectSpellResistPayload} */ (data.payload);
      await openDirectSpellResistDialog(
        defender,
        spellName,
        castingHits,
        force,
        isMana,
        casterId
      );
    } else if (data.action === 'applyDirectSpellDamage') {
      const { damage, isPhysical, spellName, casterId } =
        /** @type {DirectSpellDamagePayload} */ (data.payload);
      const caster = getGame().actors?.get(casterId);
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
    } else {
      const { casterId, spell, castingHits, force } =
        /** @type {IndirectSpellDefensePayload} */ (data.payload);
      /** @type {import('@documents/index').SR4Actor | undefined} */
      const attacker = getGame().actors?.get(casterId);
      if (!attacker) return;
      await openIndirectSpellDefenseDialog(
        defender,
        attacker,
        spell,
        castingHits,
        force
      );
    }
  }
}
