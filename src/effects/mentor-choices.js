import { isParagonCategory } from '@models/items/mentor.model.js';

/**
 * @typedef {object} MentorChoiceEffectLike
 * @property {string} id
 * @property {boolean} disabled
 * @property {{ sr4?: { mentorChoice?: { set: string, name: string } } }} [flags]
 */

/**
 * Pure planning function: for every embedded ActiveEffect flagged with
 * `flags.sr4.mentorChoice`, decides whether it should be enabled — true iff
 * its `name` matches the selection for its `set`. Effects without the flag
 * are left untouched.
 *
 * @param {MentorChoiceEffectLike[]} effects
 * @param {Record<string, string>} selectedChoices - Map of `set` (as string) to the selected choice's name.
 * @returns {Array<{ _id: string, disabled: boolean }>}
 */
export function planMentorChoiceEffectStates(effects, selectedChoices) {
  /** @type {Array<{ _id: string, disabled: boolean }>} */
  const plan = [];
  for (const effect of effects) {
    const mentorChoice = effect.flags?.sr4?.mentorChoice;
    if (!mentorChoice) continue;
    const selected = selectedChoices?.[String(mentorChoice.set)];
    const disabled = selected !== mentorChoice.name;
    if (effect.disabled !== disabled) {
      plan.push({ _id: effect.id, disabled });
    }
  }
  return plan;
}

/**
 * Records the chosen option for a mentor/paragon choice `set` on the item,
 * then enables/disables the matching embedded ActiveEffects. Transferred
 * effects (`transfer: true`) then take effect on the parent actor automatically.
 *
 * @param {import('@documents/index').SR4Item} item
 * @param {string | number} set
 * @param {string} name
 * @returns {Promise<void>}
 */
export async function selectMentorChoice(item, set, name) {
  const selectedChoices = {
    ...(item.system.selectedChoices ?? {}),
    [String(set)]: name,
  };
  const effects = item.effects.contents.map((e) => ({
    id: e.id,
    disabled: e.disabled,
    flags: e.flags,
  }));
  const plan = planMentorChoiceEffectStates(effects, selectedChoices);
  await item.update({
    'system.selectedChoices': selectedChoices,
    ...(plan.length > 0 ? { effects: plan } : {}),
  });
}

/**
 * @typedef {object} MentorChoiceOptionContext
 * @property {string} name
 * @property {boolean} selected
 * @property {boolean} hasBonus
 */

/**
 * @typedef {object} MentorChoiceSetContext
 * @property {string} set
 * @property {MentorChoiceOptionContext[]} options
 */

/**
 * Plain-data context for rendering a mentor/paragon's choices, shared by the
 * item sheet and the character sheet (both render against a live Item).
 *
 * @param {import('@documents/index').SR4Item} item
 * @returns {{ name: string, category: string, isParagon: boolean, advantage: string, disadvantage: string, sets: MentorChoiceSetContext[] }}
 */
export function buildMentorContext(item) {
  const sys = item.system;
  const selectedChoices = sys.selectedChoices ?? {};

  /** @type {Map<string, MentorChoiceOptionContext[]>} */
  const bySet = new Map();
  for (const choice of sys.choices ?? []) {
    const set = String(choice.set ?? 1);
    if (!bySet.has(set)) bySet.set(set, []);
    bySet.get(set).push({
      name: choice.name,
      selected: selectedChoices[set] === choice.name,
      hasBonus: choice.hasBonus,
    });
  }

  return {
    name: item.name,
    category: sys.category,
    isParagon: isParagonCategory(sys.category),
    advantage: sys.advantage,
    disadvantage: sys.disadvantage,
    sets: [...bySet.entries()].map(([set, options]) => ({ set, options })),
  };
}
