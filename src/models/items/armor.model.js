import { genericItemSchema } from '@models/shared';
import { computeArmorDerived } from '@models/shared/weapon-armor-derived';

const fields = foundry.data.fields;

/**
 * @typedef {object} SR4ArmorSystem
 * @property {number} ballisticarmor
 * @property {number} impactarmor
 * @property {'standard'|'accessory'|'formFitting'} stackingType
 * @property {string[]} installedModIds
 * @property {number} effectiveBallistic
 * @property {number} effectiveImpact
 * @property {number} maxCapacity
 * @property {number} usedCapacity
 * @property {boolean} capacityWarning
 * @property {number} totalCost
 */
export class SR4ArmorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...genericItemSchema(),
      ballisticarmor: new fields.NumberField({ initial: 0, integer: true }),
      impactarmor: new fields.NumberField({ initial: 0, integer: true }),
      stackingType: new fields.StringField({
        initial: 'standard',
        choices: ['standard', 'accessory', 'formFitting'],
        blank: false,
      }),
      installedModIds: new fields.ArrayField(new fields.StringField()),
    };
  }

  prepareDerivedData() {
    const self = /** @type {any} */ (this);
    const actor = this.parent?.parent ?? null;
    const mods = (self.installedModIds ?? [])
      .map((id) => actor?.items?.get(id))
      .filter((m) => m?.type === 'Armor Mod');

    Object.assign(self, computeArmorDerived(self, mods));
  }
}
