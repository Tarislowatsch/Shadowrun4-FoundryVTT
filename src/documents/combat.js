// @ts-nocheck
export function getPhysicalPassCount(combatant) {
  return (
    1 + (combatant.actor?.system?.modifiers?.initiative?.passes?.physical ?? 0)
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

  async nextTurn() {
    const pass = this.initiativePass;
    const turns = this.turns;
    const currentTurn = this.turn ?? -1;

    const nextIdx = turns.findIndex(
      (c, i) => i > currentTurn && getPhysicalPassCount(c) >= pass
    );
    if (nextIdx !== -1) {
      return this.update({ turn: nextIdx });
    }

    const nextPass = pass + 1;
    const firstInNextPass = turns.findIndex(
      (c) => getPhysicalPassCount(c) >= nextPass
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
