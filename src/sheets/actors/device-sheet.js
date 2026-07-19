import { CybercombatFlow } from '@flows/cybercombat-flow.js';
import { DEVICE_TYPES } from '@models/actor/device.model.js';
import SR4BaseActorSheet from '@sheets/characters/sr4-base-actor-sheet';

export default class SR4DeviceSheet extends SR4BaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['shadowrun4e', 'sheet', 'actor', 'device'],
    position: { width: 600, height: 700 },
    window: { resizable: true },
    actions: {
      matrixAttack: SR4DeviceSheet.#onMatrixAttack,
      createProgram: SR4DeviceSheet.#onCreateProgram,
    },
  };

  static PARTS = {
    sheet: {
      template: 'systems/shadowrun4e/templates/sheets/actors/device.sheet.hbs',
      scrollable: [''],
    },
  };

  async _prepareContext(_options) {
    const actorData = this.document.toObject(false);
    const items = actorData.items || [];
    return {
      editMode: this.editMode,
      ...this._getBaseActorContext(actorData),
      deviceTypeOptions: DEVICE_TYPES.map((type) => ({
        value: type,
        label: game.i18n.localize(`sr4.device.type.${type}`),
      })),
      matrixInitiative: actorData.system.derivedStats?.initiative?.matrix ?? 0,
      matrixPasses:
        actorData.system.derivedStats?.passesString?.split('/')[1] ?? '0',
      programs: items
        .filter((i) => i.type === 'Program')
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  static async #onMatrixAttack() {
    await CybercombatFlow.start(this.actor);
  }

  static async #onCreateProgram() {
    const [item] = await this.actor.createEmbeddedDocuments('Item', [
      {
        name: game.i18n.localize('TYPES.Item.Program'),
        type: 'Program',
        system: { complexform: false },
      },
    ]);
    item?.sheet?.render(true);
  }
}
