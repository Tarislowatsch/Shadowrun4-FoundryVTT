import { OWNER_LINK_FIELDS } from '@domains/summoned-entity/owner-link.js';

const PREVIOUS_OWNER_OPTION = 'sr4PreviousOwnerUuid';

export class LinkedActorRefreshHook {
  constructor() {
    Hooks.on('preUpdateActor', this.#onPreUpdateActor.bind(this));
    Hooks.on('updateActor', this.#onUpdateActor.bind(this));
    Hooks.on('createActor', this.#onCreateOrDeleteActor.bind(this));
    Hooks.on('deleteActor', this.#onCreateOrDeleteActor.bind(this));
  }

  /**
   * @param {Actor} actor
   * @param {object} changes
   * @param {Record<string, unknown>} options
   * @returns {void}
   */
  #onPreUpdateActor(actor, changes, options) {
    const fieldName = OWNER_LINK_FIELDS[actor.type];
    if (!fieldName || !touchesLink(changes, fieldName)) return;
    options[PREVIOUS_OWNER_OPTION] = actor.system?.[fieldName] ?? '';
  }

  /**
   * @param {Actor} actor
   * @param {object} changes
   * @param {Record<string, unknown>} options
   * @returns {void}
   */
  #onUpdateActor(actor, changes, options) {
    const fieldName = OWNER_LINK_FIELDS[actor.type];
    if (!fieldName || !touchesLink(changes, fieldName)) return;
    redrawOwners([options?.[PREVIOUS_OWNER_OPTION], actor.system?.[fieldName]]);
  }

  /**
   * @param {Actor} actor
   * @returns {void}
   */
  #onCreateOrDeleteActor(actor) {
    const fieldName = OWNER_LINK_FIELDS[actor.type];
    if (!fieldName) return;
    redrawOwners([actor.system?.[fieldName]]);
  }
}

/**
 * @param {object} changes
 * @param {string} fieldName
 * @returns {boolean}
 */
function touchesLink(changes, fieldName) {
  const system = changes?.system ?? {};
  return fieldName in system || 'bound' in system;
}

/**
 * @param {Array<string | undefined>} ownerUuids
 * @returns {void}
 */
function redrawOwners(ownerUuids) {
  for (const uuid of new Set(ownerUuids.filter(Boolean))) {
    const sheet = fromUuidSync(uuid)?.sheet;
    if (sheet?.rendered) sheet.render();
  }
}
