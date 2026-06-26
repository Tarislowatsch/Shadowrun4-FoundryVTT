import { openActionDialog } from '@utils/index';
import { SR4SummonedEntitySheet } from './sr4-summoned-entity-sheet.js';

export default class SR4VehicleSheet extends SR4SummonedEntitySheet {
  static DEFAULT_OPTIONS = {
    classes: ['shadowrun4e', 'sheet', 'actor', 'vehicle'],
    position: { width: 750, height: 700 },
    actions: {
      monitorBox: SR4VehicleSheet.#onMonitorBox,
      rollAutonomous: SR4VehicleSheet.#onRollAutonomous,
      attackRoll: SR4VehicleSheet.#onAttackRoll,
      clearRigger: SR4VehicleSheet.#onClearRigger,
      createVehicleMod: SR4VehicleSheet.#onCreateVehicleMod,
    },
  };

  static PARTS = {
    sheet: {
      template: 'systems/shadowrun4e/templates/sheets/actors/vehicle.sheet.hbs',
      scrollable: [''],
    },
  };

  // ---------------------------------------------------------------------------
  // Context
  // ---------------------------------------------------------------------------

  async _prepareContext(options) {
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
      usedSlots: live.usedSlots ?? 0,
      slotWarning: live.slotWarning ?? false,
      totalModCost: live.totalModCost ?? 0,
    };
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
    const pilot = this.actor.system.pilot ?? 0;
    const label = `${game.i18n.localize('sr4.vehicle.autonomous')}: ${weapon?.name ?? ''}`;
    openActionDialog(this.actor, label, pilot);
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
