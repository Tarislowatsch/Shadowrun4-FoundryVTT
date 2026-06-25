// @ts-nocheck
import { buildCritterActorData } from '@importer/build-critter.js';
import { resolveAttribute } from '@utils/force-formula.js';
import { ATTRIBUTE_MAP } from '@importer/mappers/helpers.js';

const PREVIEW_ATTRIBUTES = ATTRIBUTE_MAP.filter(
  ([, key]) => key !== 'initiative' && key !== 'essence'
).map(([, key]) => ({ key, label: `sr4.stats.${key.toUpperCase()}` }));

const WATCHER_PATTERN = /^Watcher/i;

/**
 * @param {object} templateSystem
 * @param {string} templateName
 * @param {number|null} force
 */
async function createActorDirectly(templateSystem, templateName, force) {
  const data = buildCritterActorData(templateSystem, templateName, force);
  await Actor.create(data, { renderSheet: true });
}

export class CritterCreationDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /** @type {object} */
  #templateData;

  /** @type {string} */
  #templateName;

  /** @type {number} */
  #force = 3;

  /**
   * @param {object} templateSystem
   * @param {string} templateName
   * @param {object} [options]
   */
  constructor(templateSystem, templateName, options = {}) {
    super(options);
    this.#templateData = templateSystem;
    this.#templateName = templateName;
    if (WATCHER_PATTERN.test(templateName)) {
      this.#force = 1;
    }
  }

  static DEFAULT_OPTIONS = {
    id: 'sr4-critter-creation',
    window: {
      title: 'sr4.critter.createActor',
      icon: 'fas fa-paw',
    },
    position: { width: 420, height: 'auto' },
    actions: {
      create: CritterCreationDialog.#onCreate,
    },
  };

  static PARTS = {
    form: {
      template:
        'systems/shadowrun4e/templates/importer/critter-creation-dialog.hbs',
    },
  };

  /** @override */
  async _prepareContext() {
    const attrs = this.#templateData.attributes ?? {};
    const preview = PREVIEW_ATTRIBUTES.map(({ key, label }) => {
      const attr = attrs[key];
      return {
        label,
        value: attr ? resolveAttribute(attr, this.#force) : 0,
      };
    });

    return {
      name: this.#templateName,
      category: this.#templateData.category,
      forceBased: this.#templateData.forceBased,
      force: this.#force,
      isWatcher: WATCHER_PATTERN.test(this.#templateName),
      preview,
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    const forceInput = this.element.querySelector('[name="force"]');
    if (forceInput) {
      forceInput.addEventListener('input', (e) => {
        this.#force = Math.max(1, parseInt(e.target.value, 10) || 1);
        this.render();
      });
    }
  }

  /**
   * @this {CritterCreationDialog}
   */
  static async #onCreate() {
    const data = buildCritterActorData(
      this.#templateData,
      this.#templateName,
      this.#force
    );
    await Actor.create(data, { renderSheet: true });
    this.close();
  }

  /**
   * @param {object} templateSystem
   * @param {string} templateName
   */
  static async createFromTemplate(templateSystem, templateName) {
    if (!templateSystem.forceBased || WATCHER_PATTERN.test(templateName)) {
      await createActorDirectly(
        templateSystem,
        templateName,
        templateSystem.forceBased ? 1 : null
      );
      return;
    }

    const dialog = new CritterCreationDialog(templateSystem, templateName);
    dialog.render(true);
  }
}
