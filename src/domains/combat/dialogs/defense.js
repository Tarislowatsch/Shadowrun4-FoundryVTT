import { TEMPLATES, renderTemplate } from '@utils/templates';
import {
  localize,
  buildSkillOptions,
  createDialogParameters,
  dialogActions,
  getChecked,
  getInt,
  ratingBySkill,
  waitDialog,
} from '@utils/dialog';
import { isMeleeWeapon } from '@models/index';

/** @enum {string} */
const DefenseType = { DODGE: 'dodge', BLOCK: 'block', PARRY: 'parry' };

/** @type {Record<string, string>} */
const DEFENSE_SKILLS = {
  dodge: DefenseType.DODGE,
  gymnastics: DefenseType.DODGE,
  unarmedcombat: DefenseType.BLOCK,
  blades: DefenseType.PARRY,
  clubs: DefenseType.PARRY,
  exoticmeleeweapon: DefenseType.PARRY,
};

/** @type {Record<string, string>} */
const MODIFIER_BY_TYPE = {
  [DefenseType.DODGE]: 'dodgeModifier',
  [DefenseType.BLOCK]: 'blockModifier',
  [DefenseType.PARRY]: 'parryModifier',
};

export const MELEE_DEFENSE_KEYS = Object.keys(DEFENSE_SKILLS);
export const RANGED_DEFENSE_KEYS = Object.keys(DEFENSE_SKILLS).filter(
  (k) => DEFENSE_SKILLS[k] === DefenseType.DODGE
);

/** @typedef {import('@models/index').SR4Modifiers} SR4Modifiers */

/**
 * @param {SR4Modifiers} mods
 * @param {boolean} isMelee
 * @returns {number}
 */
export function rangeDefenseModifier(mods, isMelee) {
  return isMelee
    ? (mods.meleeDefenseModifier ?? 0)
    : (mods.rangedDefenseModifier ?? 0);
}

/**
 * @param {SR4Modifiers} mods
 * @param {boolean} isMelee
 * @returns {number}
 */
export function baseDefenseModifier(mods, isMelee) {
  return (mods.defenseModifier ?? 0) + rangeDefenseModifier(mods, isMelee);
}

/**
 * @param {SR4Modifiers} mods
 * @param {string} [skillKey]
 * @returns {number}
 */
export function skillDefenseModifier(mods, skillKey) {
  const defType = skillKey ? DEFENSE_SKILLS[skillKey] : undefined;
  return defType ? (mods[MODIFIER_BY_TYPE[defType]] ?? 0) : 0;
}

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {import('@models/index').SR4Weapon} weapon
 * @param {number} [wideDefenseMalus]
 * @returns {number}
 */
export function defaultDefensePool(defender, weapon, wideDefenseMalus = 0) {
  const isMelee = isMeleeWeapon(weapon);
  const reaction = defender.getAttribute('REACTION') ?? 0;
  const params = createDialogParameters(defender);
  const mods = defender.system.modifiers;
  const defenseMod = baseDefenseModifier(mods, isMelee);
  const skillOptions = buildSkillOptions(
    defender,
    isMelee ? MELEE_DEFENSE_KEYS : RANGED_DEFENSE_KEYS
  );
  const bestSkill = isMelee
    ? skillOptions.reduce(
        (best, o) => (o.rating > (best?.rating ?? -1) ? o : best),
        null
      )
    : null;
  const skillRating = bestSkill?.rating ?? 0;
  const skillMod = bestSkill ? skillDefenseModifier(mods, bestSkill.value) : 0;
  return Math.max(
    0,
    reaction +
      skillRating +
      defenseMod +
      skillMod -
      wideDefenseMalus -
      params.malus
  );
}

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {import('@documents/index').SR4Actor} attacker
 * @param {number} attackSuccesses
 * @param {import('@models/index').SR4Weapon} weapon
 * @param {number} [wideDefenseMalus]
 * @returns {Promise<{ successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null } | null>}
 */
export async function openDefenseDialog(
  defender,
  attacker,
  attackSuccesses,
  weapon,
  wideDefenseMalus = 0
) {
  const isMelee = isMeleeWeapon(weapon);
  const reaction = defender.getAttribute('REACTION') ?? 0;
  const params = createDialogParameters(defender);
  const mods = defender.system.modifiers;
  params.malus -= baseDefenseModifier(mods, isMelee);

  const skillOptions = buildSkillOptions(
    defender,
    isMelee ? MELEE_DEFENSE_KEYS : RANGED_DEFENSE_KEYS
  );
  const ratingByKey = ratingBySkill(skillOptions);

  const content = await renderTemplate(TEMPLATES.combat.defenseDialog, {
    ...params,
    isMelee,
    reaction,
    meleeSkills: isMelee ? skillOptions : [],
    rangedSkills: isMelee ? [] : skillOptions,
    attackSuccesses,
    attackerName: attacker.name,
    weaponName: weapon.name,
    hideSuccesses: false,
    wideDefenseMalus,
  });

  /** @param {HTMLElement} dialog @param {boolean} fullDefense */
  const resolvePool = (dialog, fullDefense) => {
    const s1Key = /** @type {HTMLSelectElement|null} */ (
      dialog.querySelector('#skill1')
    )?.value;
    const s1 = ratingByKey.get(s1Key) ?? 0;
    const s2Key =
      isMelee && fullDefense
        ? /** @type {HTMLSelectElement|null} */ (
            dialog.querySelector('#skill2')
          )?.value
        : undefined;
    const s2 = s2Key ? (ratingByKey.get(s2Key) ?? 0) : 0;
    const usesSkill = fullDefense || isMelee;
    const base = usesSkill ? s1 + s2 + reaction : reaction;
    const skillMod = usesSkill ? skillDefenseModifier(mods, s1Key) : 0;
    return Math.max(0, base - wideDefenseMalus + skillMod);
  };

  const maxEdge = defender.getAttribute('EDGE') ?? 0;

  const makeCallback = (fullDefense) => async (_event, button) => {
    const dialog = button.closest('dialog');
    const edgeUsed = getChecked(dialog, 'edge');
    const skillName = dialog.querySelector('#skill1')?.value;
    const numDice = resolvePool(dialog, fullDefense);
    const { successes, isGlitch, rolledDice, messageId } = await dialogActions(
      dialog,
      defender,
      skillName,
      numDice,
      weapon,
      { edgeAvailableOverride: false }
    );
    return { successes, isGlitch, rolledDice, edgeUsed, messageId };
  };

  return await waitDialog({
    window: {
      title: `${localize('sr4.defense.title')} — ${attacker.name} (${weapon.name})`,
    },
    content,
    render: (event) => {
      const html = event.target.element;
      const updateLabels = () => {
        const baseDefend = resolvePool(html, false);
        const baseFull = resolvePool(html, true);
        const mod =
          getInt(html, 'bonus') -
          getInt(html, 'malus') +
          (getChecked(html, 'specialization') ? 2 : 0) +
          (getChecked(html, 'edge') ? maxEdge : 0);
        const defendBtn = html.querySelector('button[data-action="defend"]');
        const fullDefenseBtn = html.querySelector(
          'button[data-action="fullDefense"]'
        );
        if (defendBtn)
          defendBtn.textContent = `${localize('sr4.defense.defend')} (${baseDefend + mod})`;
        if (fullDefenseBtn)
          fullDefenseBtn.textContent = `${localize('sr4.defense.fullDefense')} (${baseFull + mod})`;
      };
      html.querySelectorAll('input, select').forEach((el) => {
        const evt =
          el.tagName === 'SELECT' ||
          /** @type {HTMLInputElement} */ (el).type === 'checkbox'
            ? 'change'
            : 'input';
        el.addEventListener(evt, updateLabels);
      });
      updateLabels();
    },
    buttons: [
      {
        label: localize('sr4.defense.defend'),
        action: 'defend',
        callback: makeCallback(false),
      },
      {
        label: localize('sr4.defense.fullDefense'),
        action: 'fullDefense',
        callback: makeCallback(true),
      },
    ],
  });
}
