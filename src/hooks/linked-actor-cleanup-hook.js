import { isPrimaryGM } from '@utils/actor-ownership.js';
import {
  findLinkedActors,
  unlinkFromOwner,
} from '@domains/summoned-entity/owner-link.js';

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

    const orphaned = findLinkedActors(actor.uuid);
    if (!orphaned.length) return;

    await Promise.allSettled(orphaned.map((linked) => unlinkFromOwner(linked)));
  }
}
