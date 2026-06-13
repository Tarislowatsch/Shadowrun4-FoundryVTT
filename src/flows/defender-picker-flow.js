import { getGame, localize, openDefenderPickerDialog } from '@utils/index';
import { DefenseFlow } from './defense-flow';

/**
 * @param {string} attackerId
 * @param {number} successes
 * @param {import('@models/index').SR4Weapon} weapon
 * @param {number} [wideDefenseMalus]
 * @param {number} [burstDamageBonus]
 * @returns {Promise<void>}
 */
export async function startDefenderPickerFlow(
  attackerId,
  successes,
  weapon,
  wideDefenseMalus = 0,
  burstDamageBonus = 0
) {
  const attacker = getGame().actors?.get(attackerId);
  const actors = (getGame().actors?.contents ?? [])
    .filter((a) => a.type === 'character' || a.type === 'npc')
    .map((a) => ({ id: /** @type {any} */ (a).id, name: a.name }));

  if (!actors.length) {
    ui.notifications?.warn(
      localize('sr4.settings.gmDefenderPicker.noValidActors')
    );
    return;
  }

  const attackerName =
    attacker?.name ?? localize('sr4.settings.gmDefenderPicker.unknownAttacker');
  const defenderId = await openDefenderPickerDialog(
    attackerName,
    successes,
    actors
  );
  if (!defenderId) return;

  const defender = getGame().actors?.get(defenderId);
  if (!defender) return;

  await DefenseFlow.start(
    defender,
    attackerId,
    successes,
    weapon,
    wideDefenseMalus,
    burstDamageBonus
  );
}
