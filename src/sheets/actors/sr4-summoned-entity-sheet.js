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
   * @param {object} ss - prepared sheetStats (for display / rolls)
   * @param {object} src - source sheetStats (for form inputs)
   * @param {{ label: string, name: string, key: string, rollLabel: string }} powerStat
   * @param {{ label: string, name: string, key: string }} initiativeStat
   * @returns {object[]}
   */
  _buildSheetStats(ss, src, powerStat, initiativeStat) {
    const stat = (label, name, key, rollLabel) => ({
      label,
      name,
      value: ss[key],
      sourceValue: src[key],
      ...(rollLabel ? { rollLabel } : {}),
    });
    return [
      stat('sr4.stats.BODY', 'system.sheetStats.BODY', 'BODY', 'BOD'),
      stat('sr4.stats.AGILITY', 'system.sheetStats.AGILITY', 'AGILITY', 'AGI'),
      stat(
        'sr4.stats.REACTION',
        'system.sheetStats.REACTION',
        'REACTION',
        'REA'
      ),
      stat(
        'sr4.stats.STRENGTH',
        'system.sheetStats.STRENGTH',
        'STRENGTH',
        'STR'
      ),
      stat(
        'sr4.stats.CHARISMA',
        'system.sheetStats.CHARISMA',
        'CHARISMA',
        'CHA'
      ),
      stat(
        'sr4.stats.INTUITION',
        'system.sheetStats.INTUITION',
        'INTUITION',
        'INT'
      ),
      stat('sr4.stats.LOGIC', 'system.sheetStats.LOGIC', 'LOGIC', 'LOG'),
      stat(
        'sr4.stats.WILLPOWER',
        'system.sheetStats.WILLPOWER',
        'WILLPOWER',
        'WIL'
      ),
      stat(powerStat.label, powerStat.name, powerStat.key, powerStat.rollLabel),
      stat('sr4.stats.EDGE', 'system.sheetStats.EDGE', 'EDGE'),
      stat(
        'sr4.stats.CURRENTEDGE',
        'system.sheetStats.CURRENTEDGE',
        'CURRENTEDGE'
      ),
      stat('sr4.stats.ESSENCE', 'system.sheetStats.ESSENCE', 'ESSENCE'),
      stat(
        'sr4.stats.INITIATIVE',
        'system.sheetStats.INITIATIVE',
        'INITIATIVE'
      ),
      stat(initiativeStat.label, initiativeStat.name, initiativeStat.key),
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
      ...this._getSourceContext(),
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
