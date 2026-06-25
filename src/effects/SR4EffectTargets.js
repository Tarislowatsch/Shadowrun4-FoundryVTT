import { SR4Attributes } from '@models/index';
import { SR4SkillGroupKeys } from '@models/actions/skills.model';

/** @type {readonly string[]} */
const SKILL_KEYS = [
  'aeronauticsmechanic',
  'arcana',
  'archery',
  'armorer',
  'artisan',
  'assensing',
  'astralcombat',
  'automatics',
  'automotivemechanic',
  'banishing',
  'binding',
  'blades',
  'chemistry',
  'climbing',
  'clubs',
  'compiling',
  'computer',
  'con',
  'counterspelling',
  'cybercombat',
  'cybertechnology',
  'datasearch',
  'decompiling',
  'demolitions',
  'disguise',
  'diving',
  'dodge',
  'electronicwarfare',
  'enchanting',
  'escapeartist',
  'etiquette',
  'exoticmeleeweapon',
  'exoticrangedweapon',
  'firstaid',
  'forgery',
  'gunnery',
  'gymnastics',
  'hacking',
  'hardware',
  'heavyweapons',
  'industrialmechanic',
  'infiltration',
  'instruction',
  'intimidation',
  'leadership',
  'locksmith',
  'longarms',
  'medicine',
  'nauticalmechanic',
  'navigation',
  'negotiation',
  'palming',
  'parachuting',
  'perception',
  'pilotaerospace',
  'pilotaircraft',
  'pilotanthroform',
  'pilotexoticvehicle',
  'pilotgroundcraft',
  'pilotwatercraft',
  'pistols',
  'registering',
  'ritualspellcasting',
  'running',
  'shadowing',
  'software',
  'spellcasting',
  'summoning',
  'survival',
  'swimming',
  'throwingweapons',
  'tracking',
  'unarmedcombat',
];

/**
 * @type {Readonly<Record<string, string>>}
 */
export const SR4EffectTargets = Object.freeze({
  ...Object.fromEntries(
    Object.entries(SR4Attributes).map(([key, i18nKey]) => [
      `system.sheetStats.${key}`,
      i18nKey,
    ])
  ),
  'system.modifiers.generalModifier': 'sr4.effectTarget.generalModifier',
  'system.modifiers.attackModifier': 'sr4.effectTarget.attackModifier',
  'system.modifiers.defenseModifier': 'sr4.effectTarget.defenseModifier',
  'system.modifiers.meleeDefenseModifier': 'sr4.modifiers.meleeDefenseModifier',
  'system.modifiers.rangedDefenseModifier':
    'sr4.modifiers.rangedDefenseModifier',
  'system.modifiers.dodgeModifier': 'sr4.modifiers.dodgeModifier',
  'system.modifiers.blockModifier': 'sr4.modifiers.blockModifier',
  'system.modifiers.parryModifier': 'sr4.modifiers.parryModifier',
  'system.modifiers.meleeDamageModifier': 'sr4.modifiers.meleeDamageModifier',
  'system.modifiers.unarmedDamageModifier':
    'sr4.modifiers.unarmedDamageModifier',
  'system.modifiers.initiative.bonuses.physical':
    'sr4.modifiers.initiative.physicalBonus',
  'system.modifiers.initiative.bonuses.astral':
    'sr4.modifiers.initiative.astralBonus',
  'system.modifiers.initiative.bonuses.matrix':
    'sr4.modifiers.initiative.matrixBonus',
  'system.modifiers.initiative.passes.physical':
    'sr4.modifiers.initiative.physicalPasses',
  'system.modifiers.initiative.passes.astral':
    'sr4.modifiers.initiative.astralPasses',
  'system.modifiers.initiative.passes.matrix':
    'sr4.modifiers.initiative.matrixPasses',
  'system.armor.ballistic': 'sr4.armor.ballisticarmor',
  'system.armor.impact': 'sr4.armor.impactarmor',
  ...Object.fromEntries(
    Object.keys(SR4SkillGroupKeys).map((key) => [
      `system.modifiers.skillGroupBonuses.${key}`,
      `sr4.effectTarget.skillGroup.${key}`,
    ])
  ),
  ...Object.fromEntries(
    SKILL_KEYS.map((key) => [
      `system.modifiers.skillBonuses.${key}`,
      `sr4.effectTarget.skill.${key}`,
    ])
  ),
});
