/**
 * @typedef {object} PowerEffectLike
 * @property {string} id
 * @property {boolean} disabled
 * @property {{ sr4?: { suppressedByPower?: boolean } }} [flags]
 */

/**
 * SM p. 118: a suppressed power is nullified, so its transferred effects have
 * to stop applying. `flags.sr4.suppressedByPower` is the only marker for who
 * turned an effect off, so effects disabled by anything else stay untouched
 * and are never re-enabled here.
 *
 * @param {PowerEffectLike[]} effects
 * @param {boolean} suppressed
 * @returns {Array<{ _id: string, disabled: boolean, 'flags.sr4.suppressedByPower': boolean }>}
 */
export function planPowerEffectStates(effects, suppressed) {
  const plan = [];
  for (const effect of effects) {
    const marked = effect.flags?.sr4?.suppressedByPower === true;
    if (suppressed) {
      if (effect.disabled) continue;
      plan.push({
        _id: effect.id,
        disabled: true,
        'flags.sr4.suppressedByPower': true,
      });
    } else if (marked) {
      plan.push({
        _id: effect.id,
        disabled: false,
        'flags.sr4.suppressedByPower': false,
      });
    }
  }
  return plan;
}

/**
 * @param {import('@documents/index').SR4Item} item
 * @param {boolean} suppressed
 * @returns {Promise<void>}
 */
export async function setPowerSuppressed(item, suppressed) {
  const effects = item.effects.contents.map((e) => ({
    id: e.id,
    disabled: e.disabled,
    flags: e.flags,
  }));
  const plan = planPowerEffectStates(effects, suppressed);
  if (plan.length === 0 && item.system?.suppressed === suppressed) return;
  await item.update({
    'system.suppressed': suppressed,
    ...(plan.length > 0 ? { effects: plan } : {}),
  });
}
