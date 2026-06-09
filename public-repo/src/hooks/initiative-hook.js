export class InitiativeHook {
  constructor() {
    Hooks.once('init', () => {
      console.log('SR4 | Init Initiative Override');

      CONFIG.Combat.initiative = {
        decimals: 0,
      };

      /**
       * SR4 Initiative:
       * base + hits(d6 >= 5)
       */
      Combatant.prototype._getInitiativeFormula = function () {
        const actor = this.actor;
        if (!actor) return '0';

        const base = actor.system?.derivedStats?.initiative?.physical ?? 0;
        const malus = actor.system?.derivedStats.malus ?? 0;
        const initiative = base - malus;
        return `${initiative} + ${initiative}d6cs>=5`;
      };
    });
  }
}
