import {
  SR4CharacterData,
  SR4NpcData,
  SR4VehicleData,
  SR4SpiritData,
  SR4AmmoData,
  SR4RangedWeaponData,
  SR4MeleeWeaponData,
  SR4ArmorData,
  SR4ImplantData,
  SR4SkillData,
  SR4SpellData,
  SR4CommlinkData,
  SR4ActionData,
  SR4GenericItemData,
  SR4AutosoftData,
  SR4CritterPowerData,
} from '@models/index';

/**
 * Hooks into Foundry VTT's `init` event to register all SR4 DataModels
 * with CONFIG.Actor.dataModels and CONFIG.Item.dataModels.
 * Instantiated once at module load time.
 */
export class DataModelRegistrationHook {
  constructor() {
    Hooks.once('init', this.onInit.bind(this));
  }

  /**
   * Registers all SR4 Actor and Item DataModels with Foundry.
   * Must run during `init` — before any documents are loaded.
   *
   * @returns {void}
   */
  onInit() {
    Object.assign(CONFIG.Actor.dataModels, {
      character: SR4CharacterData,
      npc: SR4NpcData,
      vehicle: SR4VehicleData,
      spirit: SR4SpiritData,
    });

    Object.assign(CONFIG.Item.dataModels, {
      Ammo: SR4AmmoData,
      'Ranged Weapon': SR4RangedWeaponData,
      'Melee Weapon': SR4MeleeWeaponData,
      Armor: SR4ArmorData,
      Implant: SR4ImplantData,
      Skill: SR4SkillData,
      Spell: SR4SpellData,
      Commlink: SR4CommlinkData,
      Action: SR4ActionData,
      Autosoft: SR4AutosoftData,
      Gear: SR4GenericItemData,
      Program: SR4GenericItemData,
      Focus: SR4GenericItemData,
      Fetish: SR4GenericItemData,
      Item: SR4GenericItemData,
      CritterPower: SR4CritterPowerData,
    });
  }
}
