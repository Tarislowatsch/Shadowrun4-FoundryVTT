import { SR4 } from '@config';
import {
  getCombatantRealm,
  getInitiativeBase,
  edgeFirstInitiative,
  glitchInitiative,
} from '../initiative.js';
import { promptEdgeFirst } from '../dialogs/edge-first.js';

/**
 * @param {import('@documents/index').SR4Combat} combat
 * @param {import('@documents/index').SR4Combatant} combatant
 * @returns {Promise<void>}
 */
export async function rollInitiativeForCombatant(combat, combatant) {
  const actor = combatant.actor;
  if (!actor) return;

  const realm = getCombatantRealm(combatant);
  const base = getInitiativeBase(actor, realm);
  const hasEdge = (actor.getAttribute?.('CURRENTEDGE') ?? 0) > 0;

  if (hasEdge && (await promptEdgeFirst())) {
    await actor.useEdge();
    await combatant.update({ initiative: edgeFirstInitiative(base) });
    return;
  }

  const malus = actor.getMalus?.() ?? 0;
  const numDice = Math.max(1, base - malus);
  const roll = await new Roll(
    `${numDice}d6cs>=${SR4.rules.successThreshold}`
  ).evaluate();

  const results = (roll.dice[0]?.results ?? []).map((r) => r.result);
  const successes = results.filter(
    (v) => v >= SR4.rules.successThreshold
  ).length;
  const failures = results.filter((v) => v === 1).length;
  const glitch = failures >= results.length / 2;

  const score = base + successes;
  const initiative = glitch ? glitchInitiative(score) : score;

  await combatant.update({ initiative });

  let flavor = `${game.i18n.localize('sr4.roll.rolling')} — ${game.i18n.localize(
    `sr4.combat.realm.${realm}`
  )}`;
  if (glitch) flavor += ` (${game.i18n.localize('sr4.combat.glitch')})`;

  const canEdge = hasEdge && !glitch;
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor,
    flags: {
      sr4: {
        actorId: actor.id,
        initiativeEdge: canEdge
          ? {
              combatId: combat.id,
              combatantId: combatant.id,
              base,
              successes,
            }
          : undefined,
      },
    },
  });
}
