import { openActionDialog } from '@utils/index';
import { SR4NpcBaseSheet } from './sr4-npc-base-sheet.js';

export default class SR4SpiritSheet extends SR4NpcBaseSheet {
  static DEFAULT_OPTIONS = {
    classes: ['shadowrun4e', 'sheet', 'actor', 'spirit'],
    position: { width: 700, height: 700 },
    actions: {
      monitorBox: SR4SpiritSheet.#onMonitorBox,
      rollAttribute: SR4SpiritSheet.#onRollAttribute,
      clearOwner: SR4SpiritSheet.#onClearOwner,
    },
  };

  static PARTS = {
    sheet: {
      template: 'systems/shadowrun4e/templates/sheets/actors/spirit.sheet.hbs',
      scrollable: [''],
    },
  };

  // ---------------------------------------------------------------------------
  // Context
  // ---------------------------------------------------------------------------

  async _prepareContext(options) {
    const actorData = this.document.toObject(false);
    const items = actorData.items || [];

    return {
      editMode: this.editMode,
      actor: {
        img: actorData.img,
        name: actorData.name,
        uuid: this.document.uuid,
      },
      system: actorData.system,
      flags: actorData.flags,
      ownerName: await this._resolveLinkedActorName(actorData.system.ownerUuid),
      critterPowers: items.filter((i) => i.type === 'CritterPower'),
      skills: items
        .filter((i) => i.type === 'Skill')
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  static async #onMonitorBox(event, target) {
    const index = Number(target.dataset.index);
    const type =
      target.dataset.type ?? target.closest('.monitor-track')?.dataset.type;
    if (!type) return;
    const path = `system.conditionMonitor.${type}.current`;
    const current = foundry.utils.getProperty(this.actor, path);
    const newValue = index + 1 === current ? index : index + 1;
    await this.actor.update({ [path]: newValue });
  }

  static #onRollAttribute(event, target) {
    const label = target.dataset.label ?? 'Attribute';
    const value = Number(target.dataset.value ?? 0);
    if (value < 1) return;
    openActionDialog(this.actor, label, value);
  }

  static async #onClearOwner() {
    await this.actor.update({ 'system.ownerUuid': '' });
  }
}
