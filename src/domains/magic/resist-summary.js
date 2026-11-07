import { getGame } from '@utils/game/game.js';
import { TEMPLATES, renderTemplate } from '@utils/templates';

export const ResistOutcome = Object.freeze({
  NO_HITS: 'noHits',
  RESISTED: 'resisted',
  AFFECTED: 'affected',
  DEFENSE_REQUESTED: 'defenseRequested',
});

/**
 * @typedef {object} SpellResistOutcome
 * @property {import('@documents/index').SR4Actor} target
 * @property {'noHits' | 'resisted' | 'affected' | 'defenseRequested'} kind
 * @property {number} hits
 */

/**
 * @param {import('@documents/index').SR4Actor} target
 * @param {number} netHits
 * @returns {SpellResistOutcome}
 */
export function resistOutcome(target, netHits) {
  return netHits < 1
    ? { target, kind: ResistOutcome.RESISTED, hits: 0 }
    : { target, kind: ResistOutcome.AFFECTED, hits: netHits };
}

/**
 * @param {import('./spell-targeting.js').SpellTargetHits[]} perTarget
 * @param {SpellResistOutcome[]} outcomes
 * @returns {SpellResistOutcome[]}
 */
export function mergeCastOutcomes(perTarget, outcomes) {
  return perTarget.flatMap(({ target, hits }) => {
    if (hits < 1) return [{ target, kind: ResistOutcome.NO_HITS, hits: 0 }];
    return outcomes.filter((outcome) => outcome.target === target);
  });
}

const COUNTED_OUTCOMES = new Set([
  ResistOutcome.AFFECTED,
  ResistOutcome.DEFENSE_REQUESTED,
]);

/**
 * @param {string} kind
 * @param {number} hits
 * @param {Intl.PluralRules} plural
 * @returns {string}
 */
function outcomeKey(kind, hits, plural) {
  const base = `sr4.spell.resistSummary.${kind}`;
  if (!COUNTED_OUTCOMES.has(kind)) return base;
  return plural.select(hits) === 'one' ? `${base}.one` : `${base}.other`;
}

/**
 * @param {SpellResistOutcome[]} outcomes
 * @returns {{ name: string, text: string }[]}
 */
export function buildResistSummaryRows(outcomes) {
  const i18n = getGame().i18n;
  const plural = new Intl.PluralRules(i18n.lang ?? 'en');
  return outcomes.map(({ target, kind, hits }) => ({
    name: target.name ?? '',
    text: i18n.format(outcomeKey(kind, hits, plural), { hits }),
  }));
}

/**
 * @param {import('@documents/index').SR4Actor} caster
 * @param {string} title
 * @param {string} details
 * @param {SpellResistOutcome[]} outcomes
 * @returns {Promise<void>}
 */
export async function sendResistSummary(caster, title, details, outcomes) {
  if (outcomes.length === 0) return;
  const content = await renderTemplate(TEMPLATES.magic.resistSummary, {
    title,
    details,
    rows: buildResistSummaryRows(outcomes),
  });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: caster }),
    content,
  });
}
