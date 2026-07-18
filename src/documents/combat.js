// @ts-nocheck
import { SR4 } from '../config.js';
import {
  getPassCount,
  getCombatantRealm,
  getInitiativeBase,
  edgeFirstInitiative,
  glitchInitiative,
  effectivePassCount,
} from './initiative.js';

/**
 * @param {import('@documents/index').SR4Combatant} combatant
 * @returns {number}
 */
export function combatantPasses(combatant) {
  return effectivePassCount(
    combatant.getFlag('shadowrun4e', 'passLock'),
    getPassCount(combatant)
  );
}

export class SR4Combat extends Combat {
  get initiativePass() {
    return this.getFlag('shadowrun4e', 'initiativePass') ?? 1;
  }

  async _preUpdate(changed, options, userId) {
    await super._preUpdate(changed, options, userId);
    if ('round' in changed) {
      foundry.utils.setProperty(changed, 'flags.shadowrun4e.initiativePass', 1);
    }
  }

  async _onUpdate(changed, options, userId) {
    await super._onUpdate(changed, options, userId);
    if (userId !== game.user?.id) return;
    if (!('round' in changed)) return;
    await this.#refreshPassLocks();
  }

  async #refreshPassLocks() {
    const updates = this.combatants.map((c) => ({
      _id: c.id,
      'flags.shadowrun4e.passLock': getPassCount(c),
    }));
    if (updates.length)
      await this.updateEmbeddedDocuments('Combatant', updates);
  }

  /** @override */
  async rollInitiative(ids, _options = {}) {
    const idList = Array.isArray(ids) ? ids : [ids];
    const currentId = this.combatant?.id;

    for (const id of idList) {
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner) continue;
      await this.#rollInitiativeForCombatant(combatant);
    }

    if (currentId) {
      const turn = this.turns.findIndex((t) => t.id === currentId);
      if (turn !== -1 && turn !== this.turn) await this.update({ turn });
    }
    return this;
  }

  async #rollInitiativeForCombatant(combatant) {
    const actor = combatant.actor;
    if (!actor) return;

    const realm = getCombatantRealm(combatant);
    const base = getInitiativeBase(actor, realm);
    const hasEdge = (actor.getAttribute?.('CURRENTEDGE') ?? 0) > 0;

    if (hasEdge && (await this.#promptEdgeFirst())) {
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
                combatId: this.id,
                combatantId: combatant.id,
                base,
                successes,
              }
            : undefined,
        },
      },
    });
  }

  async #promptEdgeFirst() {
    return foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('sr4.combat.edgeFirst.title') },
      content: `<p>${game.i18n.localize('sr4.combat.edgeFirst.prompt')}</p>`,
      yes: { label: game.i18n.localize('sr4.combat.edgeFirst.yes') },
      no: { label: game.i18n.localize('sr4.combat.edgeFirst.no') },
      defaultYes: false,
    });
  }

  async nextTurn() {
    const pass = this.initiativePass;
    const turns = this.turns;
    const currentTurn = this.turn ?? -1;

    const nextIdx = turns.findIndex(
      (c, i) => i > currentTurn && combatantPasses(c) >= pass
    );
    if (nextIdx !== -1) {
      return this.update({ turn: nextIdx });
    }

    const nextPass = pass + 1;
    const firstInNextPass = turns.findIndex(
      (c) => combatantPasses(c) >= nextPass
    );
    if (firstInNextPass !== -1) {
      return this.update({
        turn: firstInNextPass,
        [`flags.shadowrun4e.initiativePass`]: nextPass,
      });
    }

    return this.nextRound();
  }
}
