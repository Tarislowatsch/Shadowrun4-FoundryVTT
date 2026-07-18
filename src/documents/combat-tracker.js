// @ts-nocheck
import { getCombatantRealm, getAvailableRealms } from './initiative.js';
import { combatantPasses } from './combat.js';

const REALM_ICONS = {
  physical: 'fa-person',
  matrix: 'fa-wifi',
  astral: 'fa-eye',
};

function realmLabel(realm) {
  return game.i18n.localize(`sr4.combat.realm.${realm}`);
}

// foundry.applications.ui.CombatTracker is not available at module load time.
export function createSR4CombatTracker() {
  return class SR4CombatTracker extends CONFIG.ui.combat {
    async _onRender(context, options) {
      await super._onRender(context, options);
      const combat = this.viewed;
      if (!combat?.started) return;

      const pass = combat.initiativePass;
      const maxPass = combat.combatants.reduce(
        (max, c) => Math.max(max, combatantPasses(c)),
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
          combatantPasses(combatant) < pass
        );
        this._renderRealmToggle(li, combatant);
      });
    }

    _renderRealmToggle(li, combatant) {
      li.querySelector('.sr4-realm-toggle')?.remove();
      const realms = getAvailableRealms(combatant.actor);
      const realm = getCombatantRealm(combatant);

      const toggle = document.createElement('a');
      toggle.className = `sr4-realm-toggle sr4-realm-${realm}`;
      toggle.dataset.realm = realm;
      toggle.innerHTML = `<i class="fa-solid ${REALM_ICONS[realm] ?? REALM_ICONS.physical}"></i>`;

      if (combatant.isOwner && realms.length > 1) {
        toggle.title = game.i18n.format('sr4.combat.realm.toggleHint', {
          realm: realmLabel(realm),
        });
        toggle.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const next = realms[(realms.indexOf(realm) + 1) % realms.length];
          await combatant.setFlag('shadowrun4e', 'realm', next);
          if (combatant.initiative !== null) {
            await this.viewed.rollInitiative([combatant.id]);
          }
        });
      } else {
        toggle.title = realmLabel(realm);
        toggle.classList.add('sr4-realm-static');
      }

      const controls = li.querySelector('.combatant-controls') ?? li;
      controls.prepend(toggle);
    }
  };
}
