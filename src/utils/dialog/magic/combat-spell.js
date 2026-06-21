import {
  createDialogParameters,
  createRollDialog,
  dialogActions,
  getChecked,
  getInt,
  localize,
  renderTemplate,
} from '../dialogutility';
import { openSoakDialog } from '../actions/soak';
import { ApplyDamageFlow } from '@flows/apply-damage-flow';
import { awaitEdgeDecision } from '@utils/rolls/roll-edge-decision.js';
import { getGame } from '@utils/game/game.js';

const DIRECT_RESIST_TEMPLATE =
  'systems/shadowrun4e/templates/magic/direct-spell-resist.hbs';
const DIRECT_ALLOCATION_TEMPLATE =
  'systems/shadowrun4e/templates/magic/direct-spell-allocation.hbs';
const INDIRECT_DEFENSE_TEMPLATE =
  'systems/shadowrun4e/templates/magic/indirect-spell-defense.hbs';

const SPELL_DODGE_SKILLS = ['dodge', 'gymnastics'];

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @returns {{ value: string, label: string, rating: number }[]}
 */
function buildSpellDodgeSkills(defender) {
  return SPELL_DODGE_SKILLS.map((key) => {
    const skill = defender.getSkill(key);
    if (!skill || skill.system.rating <= 0) return null;
    return {
      value: key,
      label: skill.system.label,
      rating: skill.system.rating ?? 0,
    };
  }).filter(Boolean);
}

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {string} spellName
 * @param {number} castingHits
 * @param {number} force
 * @param {boolean} isMana
 * @param {string} casterId
 * @returns {Promise<void>}
 */
export async function openDirectSpellResistDialog(
  defender,
  spellName,
  castingHits,
  force,
  isMana,
  casterId
) {
  const attr = isMana ? 'WILLPOWER' : 'BODY';
  const resistPool = defender.getAttribute(attr) ?? 0;
  const resistAttrLabel = isMana
    ? localize('sr4.stats.WILLPOWER')
    : localize('sr4.stats.BODY');
  const params = createDialogParameters(defender, resistPool);

  const content = await renderTemplate(DIRECT_RESIST_TEMPLATE, {
    ...params,
    spellName,
    castingHits,
    force,
    resistPool,
    resistAttrLabel,
  });

  const result = await createRollDialog({
    title: `${localize('sr4.spell.combatTypes.direct')} — ${spellName}`,
    content,
    dice: resistPool,
    onRoll: (dialog) => dialogActions(dialog, defender, attr, resistPool),
  });

  getGame().socket?.emit('system.shadowrun4e', {
    action: 'directSpellResisted',
    payload: {
      casterId,
      defenderId: defender.id,
      resistHits: result?.successes ?? null,
    },
  });
}

/**
 * @param {string} spellName
 * @param {number} force
 * @param {number} netHits
 * @param {string} [defenderName]
 * @returns {Promise<number>}
 */
export async function openDirectSpellAllocationDialog(
  spellName,
  force,
  netHits,
  defenderName
) {
  const bonusHits = Math.min(force, Math.max(0, netHits - 1));

  const content = await renderTemplate(DIRECT_ALLOCATION_TEMPLATE, {
    spellName,
    force,
    netHits,
    bonusHits,
    defenderName,
  });

  const result = await foundry.applications.api.DialogV2.prompt({
    window: {
      title: `${localize('sr4.spell.combatTypes.direct')} — ${spellName}`,
    },
    content,
    ok: {
      label: localize('sr4.roll.rollButton'),
      callback: (_event, button) => {
        const dialog = button.closest('dialog');
        if (!dialog) return 0;
        return Math.min(
          bonusHits,
          Math.max(
            0,
            parseInt(dialog.querySelector('#applyHits')?.value ?? '0') || 0
          )
        );
      },
    },
  });

  return result ?? 0;
}

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {import('@documents/index').SR4Actor} attacker
 * @param {import('@models/index').SR4Spell} spell
 * @param {number} castingHits
 * @param {number} force
 * @returns {Promise<void>}
 */
export async function openIndirectSpellDefenseDialog(
  defender,
  attacker,
  spell,
  castingHits,
  force
) {
  const reaction = defender.getAttribute('REACTION') ?? 0;
  const params = createDialogParameters(defender, reaction);
  const rangedSkills = buildSpellDodgeSkills(defender);

  const elementKey = spell.system?.element
    ? localize(`sr4.spell.elements.${spell.system.element}`)
    : '';

  const content = await renderTemplate(INDIRECT_DEFENSE_TEMPLATE, {
    ...params,
    spellName: spell.name,
    force,
    castingHits,
    reaction,
    element: elementKey,
    rangedSkills,
  });

  const maxEdge = defender.getAttribute('EDGE') ?? 0;

  const resolvePool = (dialog, fullDefense) => {
    if (!fullDefense) return reaction;
    const skillRating =
      parseInt(
        dialog.querySelector('#skill1')?.selectedOptions[0]?.dataset.rating
      ) || 0;
    return reaction + skillRating;
  };

  const makeCallback = (fullDefense) => async (_event, button) => {
    const dialog = button.closest('dialog');
    if (!dialog) return null;
    const numDice = resolvePool(dialog, fullDefense);
    return dialogActions(dialog, defender, 'REACTION', numDice);
  };

  const buttons = [
    {
      label: localize('sr4.defense.defend'),
      action: 'dodge',
      callback: makeCallback(false),
    },
  ];
  if (rangedSkills.length > 0) {
    buttons.push({
      label: localize('sr4.defense.fullDefense'),
      action: 'fullDefense',
      callback: makeCallback(true),
    });
  }

  const dodgeResult = await foundry.applications.api.DialogV2.wait({
    window: {
      title: `${localize('sr4.spell.combatTypes.indirect')} — ${attacker.name}: ${spell.name}`,
    },
    content,
    render: (event) => {
      const html = event.target.element;
      const updateLabels = () => {
        const bonus = getInt(html, 'bonus');
        const malus = getInt(html, 'malus');
        const edgeDice = getChecked(html, 'edge') ? maxEdge : 0;
        const mod = bonus - malus + edgeDice;
        const dodgeBtn = html.querySelector('button[data-action="dodge"]');
        const fullDefBtn = html.querySelector(
          'button[data-action="fullDefense"]'
        );
        if (dodgeBtn)
          dodgeBtn.textContent = `${localize('sr4.defense.defend')} (${reaction + mod})`;
        if (fullDefBtn) {
          const skillRating =
            parseInt(
              html.querySelector('#skill1')?.selectedOptions[0]?.dataset.rating
            ) || 0;
          fullDefBtn.textContent = `${localize('sr4.defense.fullDefense')} (${reaction + skillRating + mod})`;
        }
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
    buttons,
  });

  if (!dodgeResult) return;

  const netHits = Math.max(0, castingHits - dodgeResult.successes);
  if (netHits < 1) {
    ui?.notifications?.info(`${spell.name}: ${localize('sr4.spell.noEffect')}`);
    return;
  }

  const baseDamage = force + Math.min(force, netHits);
  /** @type {any} */
  const sys = defender.system;
  const rawArmor = sys.armor?.impact ?? 0;
  const effectiveArmor = Math.max(Math.floor(rawArmor / 2), 0);
  let isPhysical = spell.system?.damageType !== 'STUN';
  if (isPhysical && baseDamage <= effectiveArmor) isPhysical = false;

  if (!game.settings.get('shadowrun4e', 'combatSoakWorkflow')) {
    await ApplyDamageFlow.sendDecisionMessage(
      defender,
      baseDamage,
      isPhysical,
      'spell'
    );
    return;
  }

  const soakResult = await openSoakDialog(
    defender,
    baseDamage,
    isPhysical,
    effectiveArmor,
    { rawArmor, apHalf: true }
  );
  if (!soakResult) return;

  let soakHits = soakResult.hits;
  if (!soakResult.edgeUsed && soakResult.hits < baseDamage) {
    soakHits = await awaitEdgeDecision({
      messageId: soakResult.messageId,
      actor: defender,
      rollResult: {
        successes: soakResult.hits,
        rolledDice: soakResult.rolledDice,
        isGlitch: soakResult.isGlitch,
      },
    });
  }

  const finalDamage = Math.max(baseDamage - soakHits, 0);
  await ApplyDamageFlow.sendCombatSummary(
    attacker.name,
    defender.name,
    'result',
    {
      base: baseDamage,
      soaked: soakHits,
      final: finalDamage,
      isPhysical,
    }
  );

  await ApplyDamageFlow.sendDecisionMessage(
    defender,
    finalDamage,
    isPhysical,
    'spell'
  );
}
