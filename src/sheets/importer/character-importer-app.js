// @ts-nocheck
import { TEMPLATES } from '@utils/templates';
import { extractCharacter } from '@importer/character/parse-character.js';
import { buildActorData } from '@importer/character/build-character.js';
import { buildSummonedActorData } from '@importer/character/build-summoned.js';
import { buildVehicleActorData } from '@importer/character/build-vehicle.js';
import { createIsolated } from '@importer/character/create-isolated.js';
import {
  planGenericItemSync,
  planSkillSync,
} from '@importer/character/sync-character.js';
import { SR4Actor } from '@documents/actor.js';
import { setButtonBusy } from '@sheets/shared/busy-state.js';

const MOD_LINK_WEAPON_TYPES = ['Ranged Weapon', 'Melee Weapon'];
const AMMO_LINK_WEAPON_TYPES = ['Ranged Weapon'];

/**
 * GM-facing tool that reads a single Chummer character XML export and either
 * creates a full SR4 `character` actor — attributes, skills (with ratings),
 * magic, qualities, gear, weapons, armor, spells, powers and implants — or,
 * when opened with an existing `actor`, idempotently syncs that actor to the
 * XML: stats are overwritten, matched items are left untouched, missing
 * items are added and items no longer present in the XML are removed.
 * Separate from the compendium-oriented {@link XmlImporterApp}.
 */
export class CharacterImporterApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /** @type {import('@importer/character/parse-character.js').ParsedCharacter | null} */
  #parsed = null;

  /** @type {Actor | null} */
  #targetActor = null;

  /** @type {boolean} */
  #busy = false;

  /**
   * @param {object} [options]
   * @param {Actor} [options.actor]
   */
  constructor(options = {}) {
    super(options);
    this.#targetActor = options.actor ?? null;
  }

  static DEFAULT_OPTIONS = {
    id: 'sr4-character-importer',
    window: {
      title: 'sr4.characterImporter.title',
      icon: 'fas fa-user-plus',
      resizable: true,
    },
    position: { width: 460, height: 'auto' },
    actions: {
      import: CharacterImporterApp.#onImport,
    },
  };

  /** @override */
  get title() {
    return this.#targetActor
      ? game.i18n.localize('sr4.characterImporter.updateTitle')
      : super.title;
  }

  static PARTS = {
    form: {
      template: TEMPLATES.sheets.importer.characterImporter,
    },
  };

  /** @override */
  async _prepareContext() {
    const c = this.#parsed?.character;
    const isUpdate = Boolean(this.#targetActor);
    const hint = isUpdate
      ? game.i18n.format('sr4.characterImporter.updateHint', {
          name: this.#targetActor.name,
        })
      : game.i18n.localize('sr4.characterImporter.hint');
    const importLabel = game.i18n.localize(
      isUpdate
        ? 'sr4.characterImporter.updateButton'
        : 'sr4.characterImporter.import'
    );

    if (!c) return { hasData: false, hint, importLabel };

    const attributes = c.attributes ?? {};
    return {
      hasData: true,
      hint,
      importLabel,
      name: c.name,
      metatype: c.metatype,
      attributes: Object.entries(attributes).map(([key, value]) => ({
        key,
        value,
      })),
      itemCount: Object.values(this.#parsed.items ?? {}).reduce(
        (sum, list) => sum + list.length,
        0
      ),
      skillCount: (this.#parsed.skills ?? []).length,
      portrait: String(c.mugshotbase64 ?? '').trim()
        ? `data:image/jpeg;base64,${c.mugshotbase64}`
        : null,
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    this.element
      .querySelector('[data-file]')
      ?.addEventListener('change', this.#onFileSelected.bind(this));
  }

  /**
   * @param {Event} event
   * @returns {Promise<void>}
   */
  async #onFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      this.#parsed = extractCharacter(await file.text());
    } catch (err) {
      this.#parsed = null;
      ui.notifications.error(
        game.i18n.format('sr4.characterImporter.parseError', {
          file: file.name,
          error: err.message,
        })
      );
    }
    await this.render();
  }

  /**
   * @this {CharacterImporterApp}
   * @returns {Promise<void>}
   */
  static async #onImport(event, target) {
    if (!this.#parsed || this.#busy) return;
    this.#busy = true;
    setButtonBusy(target, true);

    try {
      if (this.#targetActor) {
        await this.#onUpdate();
        return;
      }

      const canonicalSkills = await SR4Actor.buildCompendiumSkillData(false);
      const { ammoLinks, weaponModLinks, ...data } = buildActorData(
        this.#parsed,
        canonicalSkills
      );
      if (!data.img) delete data.img;

      /** @type {Actor|null} */
      let actor;
      try {
        actor = await Actor.create(data, { renderSheet: true });
      } catch (err) {
        ui.notifications.error(
          game.i18n.format('sr4.characterImporter.createError', {
            error: err.message,
          })
        );
        return;
      }
      if (!actor) return;

      if (ammoLinks?.length) {
        try {
          await CharacterImporterApp.#linkAmmo(actor, ammoLinks);
        } catch {
          ui.notifications.warn(
            game.i18n.format('sr4.characterImporter.ammoLinkError', {
              name: actor.name,
            })
          );
        }
      }

      if (weaponModLinks?.length) {
        try {
          await CharacterImporterApp.#linkWeaponMods(actor, weaponModLinks);
        } catch {
          ui.notifications.warn(
            game.i18n.format('sr4.characterImporter.modLinkError', {
              name: actor.name,
            })
          );
        }
      }

      await CharacterImporterApp.#importLinkedActors(actor, this.#parsed);

      ui.notifications.info(
        game.i18n.format('sr4.characterImporter.success', {
          name: actor.name,
        })
      );
      this.close();
    } finally {
      this.#busy = false;
      setButtonBusy(target, false);
    }
  }

  /**
   * Idempotently syncs `this.#targetActor` to the parsed XML: stats are
   * overwritten, embedded items are diffed (matched items untouched, missing
   * ones created, extra ones deleted), skills are always updated in place,
   * and linked spirits/sprites/vehicles are synced by name.
   *
   * @this {CharacterImporterApp}
   * @returns {Promise<void>}
   */
  async #onUpdate() {
    const actor = this.#targetActor;
    const canonicalSkills = await SR4Actor.buildCompendiumSkillData(false);
    const { ammoLinks, weaponModLinks, items, ...data } = buildActorData(
      this.#parsed,
      canonicalSkills
    );

    try {
      await actor.update({
        name: data.name,
        ...(data.img ? { img: data.img } : {}),
        system: data.system,
      });
    } catch (err) {
      ui.notifications.error(
        game.i18n.format('sr4.characterImporter.createError', {
          error: err.message,
        })
      );
      return;
    }

    const importedSkills = items.filter((i) => i.type === 'Skill');
    const importedRest = items.filter((i) => i.type !== 'Skill');
    const existingRest = actor.items.contents.filter((i) => i.type !== 'Skill');

    const skillPlan = planSkillSync(actor.items.contents, importedSkills);
    const itemPlan = planGenericItemSync(existingRest, importedRest);

    const toCreate = [...skillPlan.toCreate, ...itemPlan.toCreate];
    const toUpdate = [...skillPlan.toUpdate, ...itemPlan.toUpdate];
    const toDeleteIds = [...skillPlan.toDeleteIds, ...itemPlan.toDeleteIds];

    let createdItems = [];
    if (toDeleteIds.length) {
      await actor.deleteEmbeddedDocuments('Item', toDeleteIds);
    }
    if (toUpdate.length) {
      await actor.updateEmbeddedDocuments('Item', toUpdate);
    }
    if (toCreate.length) {
      createdItems = await actor.createEmbeddedDocuments('Item', toCreate);
    }

    const newWeaponIds = new Set(
      createdItems
        .filter((i) => i.type === 'Ranged Weapon' || i.type === 'Melee Weapon')
        .map((i) => i.id)
    );

    if (ammoLinks?.length) {
      try {
        await CharacterImporterApp.#linkAmmo(actor, ammoLinks, newWeaponIds);
      } catch {
        ui.notifications.warn(
          game.i18n.format('sr4.characterImporter.ammoLinkError', {
            name: actor.name,
          })
        );
      }
    }

    if (weaponModLinks?.length) {
      try {
        await CharacterImporterApp.#linkWeaponMods(
          actor,
          weaponModLinks,
          newWeaponIds
        );
      } catch {
        ui.notifications.warn(
          game.i18n.format('sr4.characterImporter.modLinkError', {
            name: actor.name,
          })
        );
      }
    }

    await CharacterImporterApp.#syncLinkedActors(actor, this.#parsed);

    ui.notifications.info(
      game.i18n.format('sr4.characterImporter.updateSuccess', {
        name: actor.name,
      })
    );
    this.close();
  }

  /**
   * @param {Actor} actor
   * @param {import('@importer/character/parse-character.js').ParsedCharacter} parsed
   * @returns {Promise<void>}
   */
  static async #importLinkedActors(actor, parsed) {
    const spiritData = await Promise.all(
      (parsed.spirits ?? []).map((record) =>
        buildSummonedActorData(record, actor.uuid)
      )
    );
    const vehicleData = (parsed.vehicles ?? []).map((record) =>
      buildVehicleActorData(record, actor.uuid)
    );
    const toCreate = [...spiritData, ...vehicleData];
    if (!toCreate.length) return;

    const { failures } = await createIsolated(toCreate, (data) =>
      CharacterImporterApp.#createLinkedActor(data)
    );
    CharacterImporterApp.#notifyLinkedActorFailures(actor, failures);
  }

  /**
   * @param {Actor} actor
   * @param {Array<{ error: unknown }>} failures
   */
  static #notifyLinkedActorFailures(actor, failures) {
    for (const failure of failures) {
      ui.notifications.warn(
        game.i18n.format('sr4.characterImporter.linkedActorError', {
          name: actor.name,
          error: failure.error?.message ?? String(failure.error),
        })
      );
    }
  }

  /**
   * Creates a linked spirit/sprite/vehicle actor and, if the owning
   * character is assigned to a player, grants that player ownership of the
   * new actor — mirroring `SummoningFlow`'s ownership assignment.
   *
   * @param {object} data
   * @returns {Promise<Actor|undefined>}
   */
  static async #createLinkedActor(data) {
    const created = await Actor.create(data, { renderSheet: false });
    if (!created) return created;

    const ownerUuid = data.system?.ownerUuid ?? data.system?.riggerUuid;
    if (!ownerUuid) return created;

    const owner = await fromUuid(ownerUuid);
    const ownerUser = game.users?.find((u) => u.character?.id === owner?.id);
    if (ownerUser) {
      await created.update({
        ownership: { [ownerUser.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
      });
    }
    return created;
  }

  /**
   * Syncs spirits/sprites/vehicles linked to `actor` by name: missing ones
   * are created, extras (no longer present in the XML) are deleted, matched
   * ones are left untouched.
   *
   * @param {Actor} actor
   * @param {import('@importer/character/parse-character.js').ParsedCharacter} parsed
   * @returns {Promise<void>}
   */
  static async #syncLinkedActors(actor, parsed) {
    const existing = game.actors.filter(
      (a) =>
        a.system.ownerUuid === actor.uuid || a.system.riggerUuid === actor.uuid
    );

    const spiritData = await Promise.all(
      (parsed.spirits ?? []).map((record) =>
        buildSummonedActorData(record, actor.uuid)
      )
    );
    const vehicleData = (parsed.vehicles ?? []).map((record) =>
      buildVehicleActorData(record, actor.uuid)
    );
    const imported = [...spiritData, ...vehicleData];

    const importedByKey = new Map();
    for (const data of imported) {
      const key = `${data.type}::${data.name}`;
      if (!importedByKey.has(key)) importedByKey.set(key, []);
      importedByKey.get(key).push(data);
    }

    const existingByKey = new Map();
    for (const a of existing) {
      const key = `${a.type}::${a.name}`;
      if (!existingByKey.has(key)) existingByKey.set(key, []);
      existingByKey.get(key).push(a);
    }

    const toCreate = [];
    const toDeleteIds = [];
    const keys = new Set([...importedByKey.keys(), ...existingByKey.keys()]);
    for (const key of keys) {
      const importedForKey = importedByKey.get(key) ?? [];
      const existingForKey = existingByKey.get(key) ?? [];
      if (importedForKey.length > existingForKey.length) {
        toCreate.push(...importedForKey.slice(existingForKey.length));
      } else if (existingForKey.length > importedForKey.length) {
        toDeleteIds.push(
          ...existingForKey.slice(importedForKey.length).map((a) => a.id)
        );
      }
    }

    if (toDeleteIds.length) {
      await Actor.deleteDocuments(toDeleteIds);
    }
    if (!toCreate.length) return;

    const { failures } = await createIsolated(toCreate, (data) =>
      CharacterImporterApp.#createLinkedActor(data)
    );
    CharacterImporterApp.#notifyLinkedActorFailures(actor, failures);
  }

  /**
   * @param {Actor} actor
   * @param {string} weaponName
   * @param {object} options
   * @param {string[]} options.weaponTypes
   * @param {Set<string>} options.matchedWeaponIds
   * @param {Set<string>} [options.restrictToWeaponIds]
   * @returns {Item|undefined}
   */
  static #findUnmatchedWeapon(
    actor,
    weaponName,
    { weaponTypes, matchedWeaponIds, restrictToWeaponIds }
  ) {
    return actor.items.find(
      (i) =>
        weaponTypes.includes(i.type) &&
        i.name === weaponName &&
        !matchedWeaponIds.has(i.id) &&
        (!restrictToWeaponIds || restrictToWeaponIds.has(i.id))
    );
  }

  /**
   * @param {Actor} actor
   * @param {Array<{weaponName: string, modName: string}>} modLinks
   * @param {Set<string>} [restrictToWeaponIds]
   * @returns {Promise<void>}
   */
  static async #linkWeaponMods(actor, modLinks, restrictToWeaponIds) {
    const modIdsByName = new Map();
    for (const item of actor.items) {
      if (item.type === 'Weapon Mod') {
        const name = item.name;
        if (!modIdsByName.has(name)) modIdsByName.set(name, []);
        modIdsByName.get(name).push(item.id);
      }
    }

    const consumed = new Map();
    const weaponMods = new Map();
    for (const link of modLinks) {
      const ids = modIdsByName.get(link.modName);
      if (!ids) continue;
      const idx = consumed.get(link.modName) ?? 0;
      if (idx >= ids.length) continue;
      consumed.set(link.modName, idx + 1);

      if (!weaponMods.has(link.weaponName)) {
        weaponMods.set(link.weaponName, []);
      }
      weaponMods.get(link.weaponName).push(ids[idx]);
    }

    const matchedWeaponIds = new Set();
    const updates = [];
    for (const [weaponName, ids] of weaponMods) {
      const weapon = CharacterImporterApp.#findUnmatchedWeapon(
        actor,
        weaponName,
        {
          weaponTypes: MOD_LINK_WEAPON_TYPES,
          matchedWeaponIds,
          restrictToWeaponIds,
        }
      );
      if (weapon) {
        matchedWeaponIds.add(weapon.id);
        updates.push({
          _id: weapon.id,
          'system.installedModIds': ids,
        });
      }
    }
    if (updates.length) {
      await actor.updateEmbeddedDocuments('Item', updates);
    }
  }

  /**
   * @param {Actor} actor
   * @param {Array<{weaponName: string, ammoName: string, currentAmmo: number}>} ammoLinks
   * @param {Set<string>} [restrictToWeaponIds]
   * @returns {Promise<void>}
   */
  static async #linkAmmo(actor, ammoLinks, restrictToWeaponIds) {
    const matchedWeaponIds = new Set();
    const updates = [];
    for (const link of ammoLinks) {
      const weapon = CharacterImporterApp.#findUnmatchedWeapon(
        actor,
        link.weaponName,
        {
          weaponTypes: AMMO_LINK_WEAPON_TYPES,
          matchedWeaponIds,
          restrictToWeaponIds,
        }
      );
      const ammo = actor.items.find(
        (i) => i.type === 'Ammo' && i.name === link.ammoName
      );
      if (weapon && ammo) {
        matchedWeaponIds.add(weapon.id);
        updates.push({
          _id: weapon.id,
          'system.loadedAmmoId': ammo.id,
          'system.currentAmmo': link.currentAmmo,
        });
      }
    }
    if (updates.length) {
      await actor.updateEmbeddedDocuments('Item', updates);
    }
  }
}
