import {
  createDialogParameters,
  defenseTemplatePath,
  dialogActions,
  getChecked,
  getInt,
  localize,
  renderTemplate,
} from '../dialogutility';

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

const MELEE_DEFENSE_KEYS = Object.keys(DEFENSE_SKILLS);
const RANGED_DEFENSE_KEYS = Object.keys(DEFENSE_SKILLS).filter(
  (k) => DEFENSE_SKILLS[k] === DefenseType.DODGE
);

/** @typedef {import('@models/index').SR4Modifiers} SR4Modifiers */

/**
 * Defense pool modifier that applies based on the incoming attack's range.
 * Bonus convention: positive = bonus, negative = malus.
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
 * Attack-range-independent defender modifier: the generic defenseModifier plus
 * the range-specific one. Skill-specific modifiers are resolved separately once
 * a defense skill is chosen.
 * @param {SR4Modifiers} mods
 * @param {boolean} isMelee
 * @returns {number}
 */
export function baseDefenseModifier(mods, isMelee) {
  return (mods.defenseModifier ?? 0) + rangeDefenseModifier(mods, isMelee);
}

/**
 * Defense pool modifier for the selected defense skill (dodge/block/parry).
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
 * @param {string[]} skillKeys
 * @returns {{ options: { value: string, label: string, rating: number }[], ratingBySkill: Map<string, number> }}
 */
function buildSkillOptions(defender, skillKeys) {
  /** @type {Map<string, number>} */
  const ratingBySkill = new Map();
  const options = skillKeys
    .map((key) => {
      const skill = defender.getSkill(key);
      if (!skill || skill.system.rating <= 0) return null;
      const rating = skill.system.rating ?? 0;
      ratingBySkill.set(key, rating);
      return { value: key, label: skill.system.label, rating };
    })
    .filter(Boolean);
  return { options, ratingBySkill };
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
  const isMelee = weapon.type.toLowerCase().includes('melee');
  const reaction = defender.getAttribute('REACTION') ?? 0;
  const params = createDialogParameters(defender);
  const mods = defender.system.modifiers;
  params.malus -= baseDefenseModifier(mods, isMelee);

  const { options: skillOptions, ratingBySkill } = buildSkillOptions(
    defender,
    isMelee ? MELEE_DEFENSE_KEYS : RANGED_DEFENSE_KEYS
  );

  const content = await renderTemplate(defenseTemplatePath(), {
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
    const s1 = ratingBySkill.get(s1Key) ?? 0;
    const s2Key =
      isMelee && fullDefense
        ? /** @type {HTMLSelectElement|null} */ (
            dialog.querySelector('#skill2')
          )?.value
        : undefined;
    const s2 = s2Key ? (ratingBySkill.get(s2Key) ?? 0) : 0;
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

  return await foundry.applications.api.DialogV2.wait({
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
