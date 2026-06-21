// @ts-nocheck
import { getPhysicalPassCount } from './combat.js';

// foundry.applications.ui.CombatTracker is not available at module load time.
export function createSR4CombatTracker() {
  return class SR4CombatTracker extends CONFIG.ui.combat {
    async _onRender(context, options) {
      await super._onRender(context, options);
      const combat = this.viewed;
      if (!combat?.started) return;

      const pass = combat.initiativePass;
      const maxPass = combat.combatants.reduce(
        (max, c) => Math.max(max, getPhysicalPassCount(c)),
        1
      );

      const existing = this.element.querySelector('.sr4-initiative-pass');
      if (existing) {
        existing.textContent = game.i18n.format('sr4.combat.initiativePass', {
          pass,
          maxPass,
        });
      } else {
        const header = this.element.querySelector('.combat-tracker-header');
        if (header) {
          const label = document.createElement('div');
          label.className = 'sr4-initiative-pass';
          label.textContent = game.i18n.format('sr4.combat.initiativePass', {
            pass,
            maxPass,
          });
          header.appendChild(label);
        }
      }

      this.element.querySelectorAll('[data-combatant-id]').forEach((li) => {
        const combatant = combat.combatants.get(li.dataset.combatantId);
        if (!combatant) return;
        li.classList.toggle(
          'sr4-pass-inactive',
          getPhysicalPassCount(combatant) < pass
        );
      });
    }
  };
}
