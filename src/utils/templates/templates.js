import { templatePath } from './system-path.js';

export const TEMPLATES = {
  combat: {
    attackRollDialog: templatePath(
      'domains/combat/dialogs/attack-roll-dialog.hbs'
    ),
    meleeAttackDialog: templatePath(
      'domains/combat/dialogs/melee-attack-dialog.hbs'
    ),
    defenseDialog: templatePath('domains/combat/dialogs/defense-dialog.hbs'),
    soakDialog: templatePath('domains/combat/dialogs/soak-dialog.hbs'),
    defenderPickerDialog: templatePath(
      'domains/combat/dialogs/defender-picker-dialog.hbs'
    ),
    modifyDamageDialog: templatePath(
      'domains/combat/dialogs/modify-damage-dialog.hbs'
    ),
  },
  magic: {
    spellForce: templatePath('domains/magic/dialogs/spell-force.hbs'),
    spellResist: templatePath('domains/magic/dialogs/spell-resist.hbs'),
    directSpellAllocation: templatePath(
      'domains/magic/dialogs/direct-spell-allocation.hbs'
    ),
    indirectSpellDefense: templatePath(
      'domains/magic/dialogs/indirect-spell-defense.hbs'
    ),
  },
  matrix: {
    cybercombatAttack: templatePath(
      'domains/matrix/dialogs/cybercombat-attack.hbs'
    ),
    cybercombatDefense: templatePath(
      'domains/matrix/dialogs/matrix-defense.hbs'
    ),
    actionRollDialog: templatePath(
      'domains/matrix/dialogs/matrix-action-roll-dialog.hbs'
    ),
  },
  resonance: {
    threadingDialog: templatePath(
      'domains/resonance/dialogs/threading-dialog.hbs'
    ),
  },
  rigging: {
    droneAttackDialog: templatePath(
      'domains/rigging/dialogs/drone-attack-dialog.hbs'
    ),
    droneDefenseDialog: templatePath(
      'domains/rigging/dialogs/drone-defense-dialog.hbs'
    ),
    droneRollDialog: templatePath(
      'domains/rigging/dialogs/drone-roll-dialog.hbs'
    ),
  },
  summonedEntity: {
    summoningDialog: templatePath(
      'domains/summoned-entity/dialogs/summoning-dialog.hbs'
    ),
    spiritResist: templatePath(
      'domains/summoned-entity/dialogs/spirit-resist.hbs'
    ),
  },
  sheets: {
    actors: {
      device: templatePath('sheets/actors/device.sheet.hbs'),
      spirit: templatePath('sheets/actors/spirit.sheet.hbs'),
      sprite: templatePath('sheets/actors/sprite.sheet.hbs'),
      vehicleHeader: templatePath('sheets/actors/tabs/vehicle-header.hbs'),
      vehicleMain: templatePath('sheets/actors/tabs/vehicle-main.tab.hbs'),
      vehicleConfig: templatePath('sheets/actors/tabs/vehicle-config.tab.hbs'),
    },
    characters: {
      npc: templatePath('sheets/characters/npc.sheet.hbs'),
      tabs: {
        main: templatePath('sheets/characters/tabs/main.tab.hbs'),
        bio: templatePath('sheets/characters/tabs/bio.tab.hbs'),
        weapons: templatePath('sheets/characters/tabs/weapons.tab.hbs'),
        defense: templatePath('sheets/characters/tabs/defense.tab.hbs'),
        inventory: templatePath('sheets/characters/tabs/inventory.tab.hbs'),
        implants: templatePath('sheets/characters/tabs/implants.tab.hbs'),
        magic: templatePath('sheets/characters/tabs/magic.tab.hbs'),
        matrix: templatePath('sheets/characters/tabs/matrix.tab.hbs'),
        actions: templatePath('sheets/characters/tabs/actions.tab.hbs'),
        modifiers: templatePath('sheets/characters/tabs/modifiers.tab.hbs'),
        effects: templatePath('sheets/characters/tabs/effects.tab.hbs'),
      },
    },
    items: {
      action: templatePath('sheets/items/action.sheet.hbs'),
      ammo: templatePath('sheets/items/ammo.sheet.hbs'),
      armor: templatePath('sheets/items/armor.sheet.hbs'),
      armormod: templatePath('sheets/items/armormod.sheet.hbs'),
      autosoft: templatePath('sheets/items/autosoft.sheet.hbs'),
      commlink: templatePath('sheets/items/commlink.sheet.hbs'),
      critterpower: templatePath('sheets/items/critterpower.sheet.hbs'),
      crittertemplate: templatePath('sheets/items/crittertemplate.sheet.hbs'),
      implant: templatePath('sheets/items/implant.sheet.hbs'),
      item: templatePath('sheets/items/item.sheet.hbs'),
      meleeweapon: templatePath('sheets/items/meleeweapon.sheet.hbs'),
      mentor: templatePath('sheets/items/mentor.sheet.hbs'),
      metatype: templatePath('sheets/items/metatype.sheet.hbs'),
      power: templatePath('sheets/items/power.sheet.hbs'),
      program: templatePath('sheets/items/program.sheet.hbs'),
      quality: templatePath('sheets/items/quality.sheet.hbs'),
      rangedweapon: templatePath('sheets/items/rangedweapon.sheet.hbs'),
      spell: templatePath('sheets/items/spell.sheet.hbs'),
      vehiclemod: templatePath('sheets/items/vehiclemod.sheet.hbs'),
      weaponmod: templatePath('sheets/items/weaponmod.sheet.hbs'),
    },
    effects: {
      config: templatePath('sheets/effects/effect-config.hbs'),
    },
    skills: {
      skill: templatePath('sheets/skills/skill.sheet.hbs'),
    },
    importer: {
      importer: templatePath('sheets/importer/importer.hbs'),
      characterImporter: templatePath('sheets/importer/character-importer.hbs'),
      critterCreationDialog: templatePath(
        'sheets/importer/critter-creation-dialog.hbs'
      ),
    },
    settings: {
      flow: templatePath('sheets/settings/flow-settings-menu.hbs'),
      npcSkills: templatePath('sheets/settings/npc-skills-menu.hbs'),
      riggerLookup: templatePath('sheets/settings/rigger-lookup-menu.hbs'),
      sourceBooks: templatePath('sheets/settings/source-books-menu.hbs'),
    },
    scene: {
      modifiersMenu: templatePath('sheets/scene/scene-modifiers-menu.hbs'),
    },
  },
  ui: {
    dialogs: {
      roll: templatePath('ui/dialogs/roll-dialog.hbs'),
      rollButton: templatePath('ui/dialogs/roll-button.hbs'),
      rollResults: templatePath('ui/dialogs/roll-results.hbs'),
      edge: templatePath('ui/dialogs/edge-dialog.hbs'),
      dicePoolSplit: templatePath('ui/dialogs/dice-pool-split.hbs'),
    },
    editModeToggle: templatePath('ui/edit-mode-toggle.hbs'),
    importUpdateButton: templatePath('ui/import-update-button.hbs'),
  },
};
