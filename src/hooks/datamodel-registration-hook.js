import {
  SR4CharacterData,
  SR4NpcData,
  SR4VehicleData,
  SR4SpiritData,
  SR4SpriteData,
  SR4AmmoData,
  SR4ArmorModData,
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
  SR4PowerData,
  SR4ProgramData,
  SR4QualityData,
  SR4VehicleModData,
  SR4WeaponModData,
  SR4MetatypeData,
  SR4CritterTemplateData,
} from '@models/index';

export class DataModelRegistrationHook {
  constructor() {
    Hooks.once('init', this.onInit.bind(this));
  }

  /** @returns {void} */
  onInit() {
    Object.assign(CONFIG.Actor.dataModels, {
      character: SR4CharacterData,
      npc: SR4NpcData,
      vehicle: SR4VehicleData,
      spirit: SR4SpiritData,
      sprite: SR4SpriteData,
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
      Program: SR4ProgramData,
      Quality: SR4QualityData,
      Focus: SR4GenericItemData,
      Fetish: SR4GenericItemData,
      Item: SR4GenericItemData,
      CritterPower: SR4CritterPowerData,
      Power: SR4PowerData,
      'Weapon Mod': SR4WeaponModData,
      'Armor Mod': SR4ArmorModData,
      'Vehicle Mod': SR4VehicleModData,
      Metatype: SR4MetatypeData,
      CritterTemplate: SR4CritterTemplateData,
    });
  }
}
