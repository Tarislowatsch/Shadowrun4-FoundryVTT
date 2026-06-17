import { handleSkillRoll, openActionDialog } from '@utils/index';
import SR4BaseActorSheet from '@sheets/characters/sr4-base-actor-sheet';

export class SR4SummonedEntitySheet extends SR4BaseActorSheet {
  static DEFAULT_OPTIONS = {
    window: { resizable: true },
    actions: {
      rollAttribute: SR4SummonedEntitySheet._onRollAttribute,
      rollSkill: SR4SummonedEntitySheet._onRollSkill,
      clearOwner: SR4SummonedEntitySheet._onClearOwner,
    },
  };

  static async _onRollSkill(event, target) {
    const skillName = target.dataset.skillName;
    if (skillName) await handleSkillRoll(this.actor, skillName);
  }

  static _onRollAttribute(event, target) {
    const label = target.dataset.label ?? 'Attribute';
    const value = Number(target.dataset.value ?? 0);
    if (value < 1) return;
    openActionDialog(this.actor, label, value);
  }

  static async _onClearOwner() {
    await this.actor.update({ 'system.ownerUuid': '' });
  }

  /**
   * @param {object} ss - sheetStats
   * @param {{ label: string, name: string, key: string, rollLabel: string }} powerStat
   * @param {{ label: string, name: string, key: string }} initiativeStat
   * @returns {object[]}
   */
  _buildSheetStats(ss, powerStat, initiativeStat) {
    return [
      {
        label: 'sr4.stats.BODY',
        name: 'system.sheetStats.BODY',
        value: ss.BODY,
        rollLabel: 'BOD',
      },
      {
        label: 'sr4.stats.AGILITY',
        name: 'system.sheetStats.AGILITY',
        value: ss.AGILITY,
        rollLabel: 'AGI',
      },
      {
        label: 'sr4.stats.REACTION',
        name: 'system.sheetStats.REACTION',
        value: ss.REACTION,
        rollLabel: 'REA',
      },
      {
        label: 'sr4.stats.STRENGTH',
        name: 'system.sheetStats.STRENGTH',
        value: ss.STRENGTH,
        rollLabel: 'STR',
      },
      {
        label: 'sr4.stats.CHARISMA',
        name: 'system.sheetStats.CHARISMA',
        value: ss.CHARISMA,
        rollLabel: 'CHA',
      },
      {
        label: 'sr4.stats.INTUITION',
        name: 'system.sheetStats.INTUITION',
        value: ss.INTUITION,
        rollLabel: 'INT',
      },
      {
        label: 'sr4.stats.LOGIC',
        name: 'system.sheetStats.LOGIC',
        value: ss.LOGIC,
        rollLabel: 'LOG',
      },
      {
        label: 'sr4.stats.WILLPOWER',
        name: 'system.sheetStats.WILLPOWER',
        value: ss.WILLPOWER,
        rollLabel: 'WIL',
      },
      {
        label: powerStat.label,
        name: powerStat.name,
        value: ss[powerStat.key],
        rollLabel: powerStat.rollLabel,
      },
      {
        label: 'sr4.stats.EDGE',
        name: 'system.sheetStats.EDGE',
        value: ss.EDGE,
      },
      {
        label: 'sr4.stats.CURRENTEDGE',
        name: 'system.sheetStats.CURRENTEDGE',
        value: ss.CURRENTEDGE,
      },
      {
        label: 'sr4.stats.ESSENCE',
        name: 'system.sheetStats.ESSENCE',
        value: ss.ESSENCE,
      },
      {
        label: 'sr4.stats.INITIATIVE',
        name: 'system.sheetStats.INITIATIVE',
        value: ss.INITIATIVE,
      },
      {
        label: initiativeStat.label,
        name: initiativeStat.name,
        value: ss[initiativeStat.key],
      },
    ];
  }

  /**
   * @param {string} ownerUuidField - system field name holding the owner UUID
   * @returns {Promise<object>}
   */
  async _prepareSummonedEntityContext(ownerUuidField) {
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
      ownerName: await this._resolveLinkedActorName(
        actorData.system[ownerUuidField]
      ),
      critterPowers: this._enrichItemContext(items, 'CritterPower'),
      skills: items
        .filter((i) => i.type === 'Skill')
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  /** @param {string} uuid @returns {Promise<string | null>} */
  async _resolveLinkedActorName(uuid) {
    if (!uuid) return null;
    try {
      // @ts-ignore — fromUuid is a Foundry VTT global
      const actor = await fromUuid(uuid);
      return actor?.name ?? uuid;
    } catch {
      return uuid;
    }
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const { signal } = this._listenerAbort;

    this.element.querySelectorAll('.actor-drop-zone').forEach((zone) => {
      zone.addEventListener(
        'dragover',
        (e) => {
          e.preventDefault();
          zone.classList.add('dragover');
        },
        { signal }
      );
      zone.addEventListener(
        'dragleave',
        () => zone.classList.remove('dragover'),
        { signal }
      );
      zone.addEventListener(
        'drop',
        async (e) => {
          e.preventDefault();
          zone.classList.remove('dragover');
          // @ts-ignore — TextEditor is a Foundry VTT global
          const data = TextEditor.getDragEventData(e);
          if (data?.type === 'Actor') {
            const field = zone.dataset.dropType;
            if (field)
              await this.actor.update({ [`system.${field}`]: data.uuid });
          }
        },
        { signal }
      );
    });
  }
}
