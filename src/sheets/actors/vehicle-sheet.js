import {
  ControlModes,
  DEFAULT_RIGGER_LOOKUP,
  localize,
  mergeRiggerLookup,
  openActionDialog,
  openDroneAttackDialog,
  openDroneRollDialog,
  resolveRiggerSync,
} from '@utils/index';
import { SR4SummonedEntitySheet } from './sr4-summoned-entity-sheet.js';

const RIGGER_CONFIG_ROLES = [
  { key: 'attackSkill', itemType: 'Skill' },
  { key: 'fullDefenseSkill', itemType: 'Skill' },
  { key: 'perceptionSkill', itemType: 'Skill' },
  { key: 'infiltrationSkill', itemType: 'Skill' },
  { key: 'commandProgram', itemType: 'Program' },
];

export default class SR4VehicleSheet extends SR4SummonedEntitySheet {
  static DEFAULT_OPTIONS = {
    classes: ['shadowrun4e', 'sheet', 'actor', 'vehicle'],
    position: { width: 750, height: 700 },
    actions: {
      monitorBox: SR4VehicleSheet.#onMonitorBox,
      rollAutonomous: SR4VehicleSheet.#onRollAutonomous,
      attackRoll: SR4VehicleSheet.#onAttackRoll,
      droneAction: SR4VehicleSheet.#onDroneAction,
      clearRigger: SR4VehicleSheet.#onClearRigger,
      createVehicleMod: SR4VehicleSheet.#onCreateVehicleMod,
    },
  };

  static PARTS = {
    header: {
      template:
        'systems/shadowrun4e/templates/sheets/actors/vehicle-header.hbs',
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
    },
    main: {
      template:
        'systems/shadowrun4e/templates/sheets/actors/vehicle-main.tab.hbs',
      scrollable: [''],
    },
    config: {
      template:
        'systems/shadowrun4e/templates/sheets/actors/vehicle-config.tab.hbs',
      scrollable: [''],
    },
  };

  static TABS = {
    primary: {
      tabs: [
        { id: 'main', icon: 'fas fa-car', label: 'sr4.tab.main' },
        {
          id: 'config',
          icon: 'fas fa-sliders-h',
          label: 'sr4.vehicle.configTab',
        },
      ],
      initial: 'main',
    },
  };

  // ---------------------------------------------------------------------------
  // Context
  // ---------------------------------------------------------------------------

  async _prepareContext(_options) {
    const actorData = this.document.toObject(false);
    const sourceSystem = this.document.toObject().system;
    const items = actorData.items || [];

    /** @type {any} */
    const live = this.document.system;
    const vehicleStats = [
      {
        label: 'sr4.vehicle.body',
        name: 'system.body',
        value: live.effectiveBody,
        sourceValue: sourceSystem.body,
        effective: live.effectiveBody,
      },
      {
        label: 'sr4.vehicle.pilot',
        name: 'system.pilot',
        value: live.effectivePilot,
        sourceValue: sourceSystem.pilot,
        effective: live.effectivePilot,
      },
      {
        label: 'sr4.vehicle.armor',
        name: 'system.armor',
        value: live.effectiveArmor,
        sourceValue: sourceSystem.armor,
        effective: live.effectiveArmor,
      },
      {
        label: 'sr4.vehicle.sensor',
        name: 'system.sensor',
        value: live.effectiveSensor,
        sourceValue: sourceSystem.sensor,
        effective: live.effectiveSensor,
      },
      {
        label: 'sr4.vehicle.handling',
        name: 'system.handling',
        value: live.effectiveHandling,
        sourceValue: sourceSystem.handling,
        effective: live.effectiveHandling,
      },
      {
        label: 'sr4.vehicle.speed',
        name: 'system.speed',
        value: live.effectiveSpeed,
        sourceValue: sourceSystem.speed,
        effective: live.effectiveSpeed,
      },
      {
        label: 'sr4.vehicle.accel',
        name: 'system.accel',
        value: live.effectiveAccel,
        sourceValue: sourceSystem.accel,
        effective: live.effectiveAccel,
      },
    ];

    const vehicleMods = items
      .filter((i) => i.type === 'Vehicle Mod')
      .map((i) => ({ id: i._id, name: i.name, system: i.system }));

    return {
      editMode: this.editMode,
      tabs: this._prepareTabs('primary'),
      actor: {
        img: actorData.img,
        name: actorData.name,
        uuid: this.document.uuid,
      },
      system: actorData.system,
      flags: actorData.flags,
      riggerName: await this._resolveLinkedActorName(
        actorData.system.riggerUuid
      ),
      autosofts: items.filter((i) => i.type === 'Autosoft'),
      weapons: items.filter(
        (i) => i.type === 'Ranged Weapon' || i.type === 'Melee Weapon'
      ),
      vehicleStats,
      vehicleMods,
      controlModes: Object.values(ControlModes).map((mode) => ({
        value: mode,
        label: localize(`sr4.vehicle.controlModes.${mode}`),
        selected: mode === actorData.system.controlMode,
      })),
      riggerConfig: this.#buildRiggerConfig(actorData.system.riggerOverrides),
      usedSlots: live.usedSlots ?? 0,
      slotWarning: live.slotWarning ?? false,
      totalModCost: live.totalModCost ?? 0,
    };
  }

  async _preparePartContext(partId, context) {
    if (context.tabs?.[partId]) context.tab = context.tabs[partId];
    return context;
  }

  /**
   * @param {Record<string, string>} overrides
   * @returns {{ key: string, label: string, stored: string, defaultDisplay: string, options: { value: string, name: string, selected: boolean }[], manual: boolean }[]}
   */
  #buildRiggerConfig(overrides = {}) {
    const rigger = resolveRiggerSync(this.document);
    const globalDefaults = mergeRiggerLookup(
      DEFAULT_RIGGER_LOOKUP,
      typeof game !== 'undefined' && game?.settings
        ? game.settings.get('shadowrun4e', 'riggerLookup')
        : '{}'
    );

    return RIGGER_CONFIG_ROLES.map(({ key, itemType }) => {
      const stored = overrides?.[key] ?? '';
      const items = rigger
        ? rigger.items.filter((i) => i.type === itemType)
        : [];
      const options = items
        .map((item) => ({
          value: item.system.label || item.name,
          name: item.name,
          selected: false,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const option of options) option.selected = option.value === stored;
      const manual = stored !== '' && !options.some((o) => o.selected);
      const defaultRef = globalDefaults[key];
      const defaultDisplay =
        items.find(
          (item) =>
            item.system.label === defaultRef ||
            item.name.toLowerCase() === defaultRef.toLowerCase()
        )?.name ?? defaultRef;
      return {
        key,
        label:
          key === 'commandProgram'
            ? 'sr4.settings.riggerLookupMenu.commandProgram'
            : `sr4.settings.riggerLookupMenu.roles.${key}`,
        stored,
        defaultDisplay,
        options,
        manual,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  _onRender(context, options) {
    super._onRender(context, options);

    // Inline item field updates (autosoft type/rating/target)
    this.element
      .querySelectorAll('.item-list input, .item-list select')
      .forEach((el) => {
        el.addEventListener('change', async (event) => {
          const target = /** @type {HTMLInputElement | HTMLSelectElement} */ (
            event.currentTarget
          );
          const itemEl = target.closest('[data-item-id]');
          if (!itemEl) return;
          const item = this.actor.items.get(
            /** @type {HTMLElement} */ (itemEl).dataset.itemId
          );
          if (!item) return;
          const value =
            target.dataset.dtype === 'Number'
              ? Number(target.value)
              : target.value;
          await item.update({ [target.name]: value });
        });
      });

    this.element.querySelectorAll('[data-config-select]').forEach((el) => {
      el.addEventListener('change', async (event) => {
        event.stopPropagation();
        const select = /** @type {HTMLSelectElement} */ (event.currentTarget);
        const row = select.closest('[data-role]');
        const role = /** @type {HTMLElement} */ (row).dataset.role;
        const manualInput = /** @type {HTMLInputElement} */ (
          row.querySelector('[data-config-manual]')
        );
        if (select.value === '__manual__') {
          manualInput.style.display = '';
          manualInput.focus();
          return;
        }
        manualInput.style.display = 'none';
        await this.actor.update({
          [`system.riggerOverrides.${role}`]: select.value,
        });
      });
    });

    this.element.querySelectorAll('[data-config-manual]').forEach((el) => {
      el.addEventListener('change', async (event) => {
        event.stopPropagation();
        const input = /** @type {HTMLInputElement} */ (event.currentTarget);
        const role = /** @type {HTMLElement} */ (input.closest('[data-role]'))
          .dataset.role;
        await this.actor.update({
          [`system.riggerOverrides.${role}`]: input.value.trim(),
        });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  static async #onMonitorBox(event, target) {
    const index = Number(target.dataset.index);
    const path = 'system.conditionMonitor.physical.value';
    const current = foundry.utils.getProperty(this.actor, path);
    const newValue = index + 1 === current ? index : index + 1;
    await this.actor.update({ [path]: newValue });
  }

  static async #onRollAutonomous(event, target) {
    const itemId =
      target.dataset.itemId ?? target.closest('[data-item-id]')?.dataset.itemId;
    const autosoft = this.actor.items.get(itemId);
    const pilot = this.actor.system.pilot ?? 0;
    const rating = autosoft?.system?.rating ?? 0;
    const numDice = pilot + rating;
    if (numDice < 1) {
      ui?.notifications?.warn(game.i18n.localize('sr4.vehicle.noDicePool'));
      return;
    }
    const label = autosoft
      ? `${game.i18n.localize('sr4.vehicle.autonomous')}: ${autosoft.name}`
      : game.i18n.localize('sr4.vehicle.pilotRoll');
    openActionDialog(this.actor, label, numDice);
  }

  static async #onAttackRoll(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    const weapon = this.actor.items.get(itemId);
    if (!weapon) return;
    await openDroneAttackDialog(this.actor, weapon);
  }

  static async #onDroneAction(event, target) {
    await openDroneRollDialog(this.actor, target.dataset.droneAction);
  }

  static async #onClearRigger() {
    await this.actor.update({ 'system.riggerUuid': '' });
  }

  static async #onCreateVehicleMod() {
    const [item] = await this.actor.createEmbeddedDocuments('Item', [
      {
        name: game.i18n.localize('TYPES.Item.Vehicle Mod'),
        type: 'Vehicle Mod',
      },
    ]);
    item?.sheet?.render(true);
  }
}
