// @ts-nocheck
import { rollInitiativeForCombatant } from '@domains/combat/flow/roll-initiative-flow.js';
import {
  advanceTurn,
  refreshPassLocks,
} from '@domains/combat/flow/turn-order-flow.js';
import { SYSTEM_ID } from '@utils/game/system-id.js';

export class SR4Combat extends Combat {
  get initiativePass() {
    return this.getFlag(SYSTEM_ID, 'initiativePass') ?? 1;
  }

  async _preUpdate(changed, options, userId) {
    await super._preUpdate(changed, options, userId);
    if ('round' in changed) {
      foundry.utils.setProperty(
        changed,
        `flags.${SYSTEM_ID}.initiativePass`,
        1
      );
    }
  }

  async _onUpdate(changed, options, userId) {
    await super._onUpdate(changed, options, userId);
    if (userId !== game.user?.id) return;
    if (!('round' in changed)) return;
    await refreshPassLocks(this);
  }

  /** @override */
  async rollInitiative(ids, _options = {}) {
    const idList = Array.isArray(ids) ? ids : [ids];
    const currentId = this.combatant?.id;

    for (const id of idList) {
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner) continue;
      await rollInitiativeForCombatant(this, combatant);
    }

    if (currentId) {
      const turn = this.turns.findIndex((t) => t.id === currentId);
      if (turn !== -1 && turn !== this.turn) await this.update({ turn });
    }
    return this;
  }

  /** @override */
  async nextTurn() {
    return advanceTurn(this);
  }
}
