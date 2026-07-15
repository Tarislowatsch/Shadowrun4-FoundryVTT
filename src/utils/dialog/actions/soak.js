import {
  createDialogParameters,
  createRollDialog,
  dialogActions,
  getChecked,
  localize,
  renderTemplate,
  soakTemplatePath,
} from '../dialogutility';

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {number} incomingDamage
 * @param {boolean} isPhysical
 * @param {number} effectiveArmor
 * @param {{ rawArmor?: number, ap?: number | null, apHalf?: boolean, elementResistance?: number }} [breakdown]
 * @returns {Promise<{ hits: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null } | null>}
 */
export async function openSoakDialog(
  defender,
  incomingDamage,
  isPhysical,
  effectiveArmor,
  { rawArmor, ap, apHalf, elementResistance = 0 } = {}
) {
  const sys = /** @type {any} */ (defender).system;
  const body =
    defender.type === 'vehicle'
      ? (sys?.effectiveBody ?? sys?.body ?? 0)
      : (defender.getAttribute('BODY') ?? 0);
  const soakBonus =
    /** @type {any} */ (defender).system?.modifiers?.soakBonus ?? 0;
  const soakPool = body + effectiveArmor + soakBonus + elementResistance;
  // Wound modifiers do not apply to Damage Resistance tests (SR4 p.163)
  const params = createDialogParameters(defender, soakPool, undefined, {
    ignoreModifiers: true,
  });
  const damageType = isPhysical
    ? localize('sr4.damage.physical')
    : localize('sr4.damage.stun');

  const content = await renderTemplate(soakTemplatePath(), {
    ...params,
    incomingDamage,
    damageType,
    body,
    effectiveArmor,
    soakBonus,
    rawArmor,
    ap,
    apHalf,
    elementResistance,
  });

  let edgeUsed = false;
  const result = await createRollDialog({
    title: localize('sr4.soak.title'),
    content,
    dice: soakPool,
    onRoll: async (dialog) => {
      edgeUsed = getChecked(dialog, 'edge');
      return dialogActions(
        dialog,
        defender,
        localize('sr4.soak.title'),
        soakPool
      );
    },
  });

  if (!result) return null;
  return {
    hits: result.successes,
    isGlitch: result.isGlitch,
    rolledDice: soakPool,
    edgeUsed,
    messageId: result.messageId,
  };
}
