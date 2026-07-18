/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} weaponId
 */
export async function reloadWeapon(actor, weaponId) {
  const weapon = actor.items.get(weaponId);
  if (!weapon || weapon.system.maxAmmo === 0) return;
  if (weapon.system.currentAmmo >= weapon.system.maxAmmo) return;
  await weapon.update({ 'system.currentAmmo': weapon.system.maxAmmo });
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {number}
 */
export function getEquippedMeleeReach(actor) {
  let maxReach = 0;
  for (const i of /** @type {any} */ (actor).items ?? []) {
    if (i.type === 'Melee Weapon' && i.system?.equipped === true) {
      maxReach = Math.max(maxReach, i.system.reach ?? 0);
    }
  }
  return maxReach;
}

/**
 * @param {number} attackerReach
 * @param {number} defenderReach
 * @returns {number}
 */
export function computeReachModifier(attackerReach, defenderReach) {
  return attackerReach - defenderReach;
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {import('@models/index').SR4Weapon & { type: 'Ranged Weapon', system: import('@models/index').SR4RangedWeaponSystem }} weapon
 * @param {number} shots
 * @returns {Promise<void>}
 */
export async function depleteAmmo(actor, weapon, shots) {
  /** @type {Record<string, Record<string, unknown>>} */
  const byId = {};
  if (weapon.system.maxAmmo > 0) {
    byId[weapon.id] = {
      'system.currentAmmo': Math.max(0, weapon.system.currentAmmo - shots),
    };
  }
  if (weapon.system.loadedAmmoId) {
    const ammo = actor.items?.get(weapon.system.loadedAmmoId);
    if (ammo) {
      const newQty = Math.max(0, ammo.system.quantity - shots);
      byId[ammo.id] = { 'system.quantity': newQty };
      if (newQty === 0) {
        byId[weapon.id] ??= {};
        byId[weapon.id]['system.loadedAmmoId'] = '';
      }
    }
  }
  const batch = Object.entries(byId).map(([id, data]) => ({
    _id: id,
    ...data,
  }));
  if (batch.length) await actor.updateEmbeddedDocuments('Item', batch);
}
