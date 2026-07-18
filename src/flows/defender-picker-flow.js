import { getGame, localize, openDefenderPickerDialog } from '@utils/index';
import { DefenseFlow } from './defense-flow';

/**
 * @param {string} attackerUuid
 * @param {number} successes
 * @param {import('@models/index').SR4Weapon} weapon
 * @param {number} [wideDefenseMalus]
 * @param {number} [burstDamageBonus]
 * @returns {Promise<void>}
 */
export async function startDefenderPickerFlow(
  attackerUuid,
  successes,
  weapon,
  wideDefenseMalus = 0,
  burstDamageBonus = 0
) {
  const attacker = /** @type {any} */ (await fromUuid(attackerUuid));
  const actors = (getGame().actors?.contents ?? [])
    .filter((a) => a.type === 'character' || a.type === 'npc')
    .map((a) => ({ id: /** @type {any} */ (a).uuid, name: a.name }));

  if (!actors.length) {
    ui.notifications?.warn(
      localize('sr4.settings.gmDefenderPicker.noValidActors')
    );
    return;
  }

  const attackerName =
    attacker?.name ?? localize('sr4.settings.gmDefenderPicker.unknownAttacker');
  const defenderUuid = await openDefenderPickerDialog(
    attackerName,
    successes,
    actors
  );
  if (!defenderUuid) return;

  const defender = /** @type {any} */ (await fromUuid(defenderUuid));
  if (!defender) return;

  await DefenseFlow.start(
    defender,
    attackerUuid,
    successes,
    weapon,
    wideDefenseMalus,
    burstDamageBonus
  );
}
