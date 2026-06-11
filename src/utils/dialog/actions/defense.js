import {
  createDialogParameters,
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
 * @returns {Promise<{ successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean } | null>}
 */
export async function openDefenseDialog(
  defender,
  attacker,
  attackSuccesses,
  weapon
) {
  const isMelee = weapon.type.toLowerCase().includes('melee');
  const reaction = defender.getAttribute('REACTION') ?? 0;
  const params = createDialogParameters(defender);
  const meleeSkills = buildSkillOptions(defender, MELEE_DEFENSE_SKILLS);
  const rangedSkills = buildSkillOptions(defender, RANGED_DEFENSE_SKILLS);

  const content = await renderTemplate(
    'systems/shadowrun4e/templates/dicerolls/defense-dialog.hbs',
    {
      ...params,
      isMelee,
      reaction,
      meleeSkills,
      rangedSkills,
      attackSuccesses,
      attackerName: attacker.name,
      weaponName: weapon.name,
      hideSuccesses: false,
    }
  );

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
    if (!fullDefense && !isMelee) return reaction;
    // ranged full: dodge + reaction | melee normal: skill + reaction | melee full: s1 + s2 + reaction
    return s1 + s2 + reaction;
  };

  const maxEdge = defender.getAttribute('EDGE') ?? 0;

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
        callback: async (_event, button) => {
          const dialog = button.closest('dialog');
          const edgeUsed = getChecked(dialog, 'edge');
          const skillName = dialog.querySelector('#skill1')?.value;
          const numDice = resolvePool(dialog, false);
          const { successes, isGlitch } = await dialogActions(
            dialog,
            defender,
            skillName,
            numDice,
            weapon,
            { emitDefense: false }
          );
          return { successes, isGlitch, rolledDice: numDice, edgeUsed };
        },
      },
      {
        label: localize('sr4.defense.fullDefense'),
        action: 'fullDefense',
        callback: async (_event, button) => {
          const dialog = button.closest('dialog');
          const edgeUsed = getChecked(dialog, 'edge');
          const skillName = dialog.querySelector('#skill1')?.value;
          const numDice = resolvePool(dialog, true);
          const { successes, isGlitch } = await dialogActions(
            dialog,
            defender,
            skillName,
            numDice,
            weapon,
            { emitDefense: false }
          );
          return { successes, isGlitch, rolledDice: numDice, edgeUsed };
        },
      },
    ],
  });
}
