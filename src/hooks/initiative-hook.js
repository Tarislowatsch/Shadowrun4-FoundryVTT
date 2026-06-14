// @ts-nocheck
import { SR4 } from '../config.js';

export class InitiativeHook {
  constructor() {
    Hooks.once('init', () => {
      CONFIG.Combat.initiative = {
        decimals: 0,
      };

      Combatant.prototype._getInitiativeFormula = function () {
        const actor = this.actor;
        if (!actor) return '0';

        const base = actor.getInitiativeBase();
        const malus = actor.getMalus();
        // SR4 20A 144
        return `${base} + ${Math.max(0, base - malus)}d6cs>=${SR4.rules.successThreshold}`;
      };
    });
  }
}
