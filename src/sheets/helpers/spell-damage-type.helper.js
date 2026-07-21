import { resolveIndirectSpellDamageType } from '@models/index';

/**
 * @returns {void}
 */
export function spellDamageTypeHelper() {
  Handlebars.registerHelper('spellDamageType', (system) =>
    system?.combatType === 'INDIRECT'
      ? resolveIndirectSpellDamageType(system)
      : system?.damageType
  );
}
