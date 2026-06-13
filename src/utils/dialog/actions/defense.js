import {
  createDialogParameters,
  defenseTemplatePath,
  dialogActions,
  getChecked,
  getInt,
  localize,
  renderTemplate,
} from '../dialogutility';

const MELEE_DEFENSE_SKILLS = [
  'dodge',
  'gymnastics',
  'unarmedcombat',
  'blades',
  'clubs',
  'exoticmeleeweapon',
];
const RANGED_DEFENSE_SKILLS = ['dodge', 'gymnastics'];

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {string[]} skillKeys
 * @returns {{ value: string, label: string, rating: number }[]}
 */
function buildSkillOptions(defender, skillKeys) {
  return skillKeys
    .map((key) => {
      const skill = defender.getSkill(key);
      if (!skill || skill.system.rating <= 0) return null;
      return {
        value: key,
        label: skill.system.label,
        rating: skill.system.rating ?? 0,
      };
    })
    .filter(Boolean);
}

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {import('@documents/index').SR4Actor} attacker
 * @param {number} attackSuccesses
 * @param {import('@models/index').SR4Weapon} weapon
 * @param {number} [wideDefenseMalus]
 * @returns {Promise<{ successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean } | null>}
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
  params.malus += defender.system.modifiers.defenseModifier;
  const meleeSkills = buildSkillOptions(defender, MELEE_DEFENSE_SKILLS);
  const rangedSkills = buildSkillOptions(defender, RANGED_DEFENSE_SKILLS);

  const content = await renderTemplate(defenseTemplatePath(), {
    ...params,
    isMelee,
    reaction,
    meleeSkills,
    rangedSkills,
    attackSuccesses,
    attackerName: attacker.name,
    weaponName: weapon.name,
    hideSuccesses: false,
    wideDefenseMalus,
  });

  const resolvePool = (dialog, fullDefense) => {
    const s1 =
      parseInt(
        dialog.querySelector('#skill1')?.selectedOptions[0]?.dataset.rating
      ) || 0;
    const s2 =
      isMelee && fullDefense
        ? parseInt(
            dialog.querySelector('#skill2')?.selectedOptions[0]?.dataset.rating
          ) || 0
        : 0;
    // ranged normal: reaction only
    const base = !fullDefense && !isMelee ? reaction : s1 + s2 + reaction;
    return Math.max(0, base - wideDefenseMalus);
  };

  const maxEdge = defender.getAttribute('EDGE') ?? 0;

  const makeCallback = (fullDefense) => async (_event, button) => {
    const dialog = button.closest('dialog');
    const edgeUsed = getChecked(dialog, 'edge');
    const skillName = dialog.querySelector('#skill1')?.value;
    const numDice = resolvePool(dialog, fullDefense);
    const { successes, isGlitch, rolledDice } = await dialogActions(
      dialog,
      defender,
      skillName,
      numDice,
      weapon,
      { emitDefense: false }
    );
    return { successes, isGlitch, rolledDice, edgeUsed };
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
        const bonus = getInt(html, 'bonus');
        const malus = getInt(html, 'malus');
        const spec = getChecked(html, 'specialization') ? 2 : 0;
        const edgeDice = getChecked(html, 'edge') ? maxEdge : 0;
        const mod = bonus - malus + spec + edgeDice;
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
