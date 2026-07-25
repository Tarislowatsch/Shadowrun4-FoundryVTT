import { RESISTANCE_ELEMENTS } from '@models/actor/basecharacter.model';
import { REALM_CHOICES, SIM_MODE_CHOICES } from '@models/shared';
import { getAvailableRealms } from '@domains/combat/initiative.js';

export async function onCreateElementResistance(_event, _target) {
  await this.actor.update({
    [`system.elementResistances.${foundry.utils.randomID()}`]: {},
  });
}

export async function onDeleteElementResistance(event, target) {
  const key =
    target.dataset.resistanceKey ??
    target.closest('[data-resistance-key]')?.dataset.resistanceKey;
  if (!key) return;
  await this.actor.update({ [`system.elementResistances.-=${key}`]: null });
}

export function buildResistanceElements() {
  return RESISTANCE_ELEMENTS.map((el) => ({
    value: el,
    label: game.i18n.localize(`sr4.resistance.${el}`),
  }));
}

export function buildRealmOptions(actor) {
  const available = getAvailableRealms(actor);
  return REALM_CHOICES.filter((realm) => available.includes(realm)).map(
    (realm) => ({
      value: realm,
      label: game.i18n.localize(`sr4.combat.realm.${realm}`),
    })
  );
}

export function buildSimModeOptions() {
  return SIM_MODE_CHOICES.map((mode) => ({
    value: mode,
    label: game.i18n.localize(`sr4.matrix.simMode.${mode}`),
  }));
}
