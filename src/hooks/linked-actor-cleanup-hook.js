import { isPrimaryGM } from '@utils/actor-ownership.js';

const LINKED_FIELDS = [
  { type: 'spirit', fieldName: 'ownerUuid' },
  { type: 'sprite', fieldName: 'ownerUuid' },
  { type: 'vehicle', fieldName: 'riggerUuid' },
];

export class LinkedActorCleanupHook {
  constructor() {
    Hooks.on('deleteActor', this.#onDeleteActor.bind(this));
  }

  /**
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  async #onDeleteActor(actor) {
    if (!isPrimaryGM()) return;

    const orphaned = LINKED_FIELDS.flatMap(({ type, fieldName }) =>
      game.actors
        .filter((a) => a.type === type && a.system?.[fieldName] === actor.uuid)
        .map((a) => ({ actor: a, fieldName }))
    );
    if (!orphaned.length) return;

    await Promise.allSettled(
      orphaned.map(({ actor: linked, fieldName }) =>
        linked.update({ [`system.${fieldName}`]: null })
      )
    );
  }
}
