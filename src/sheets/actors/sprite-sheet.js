import { SR4SummonedEntitySheet } from './sr4-summoned-entity-sheet.js';

export default class SR4SpriteSheet extends SR4SummonedEntitySheet {
  static DEFAULT_OPTIONS = {
    classes: ['shadowrun4e', 'sheet', 'actor', 'sprite'],
    position: { width: 700, height: 700 },
    actions: {
      createComplexForm: SR4SpriteSheet.#onCreateComplexForm,
    },
  };

  static PARTS = {
    sheet: {
      template: 'systems/shadowrun4e/templates/sheets/actors/sprite.sheet.hbs',
      scrollable: [''],
    },
  };

  async _prepareContext(options) {
    const ctx = await this._prepareSummonedEntityContext('ownerUuid');
    const ss = ctx.system.sheetStats;
    const src = ctx.sourceStats;
    const passesMatrix =
      ctx.system.derivedStats?.passesString?.split('/')[2] ?? '0';

    ctx.matrixStats = [
      {
        label: 'sr4.sprite.pilot',
        name: 'system.sheetStats.CHARISMA',
        value: ss.CHARISMA,
        sourceValue: src.CHARISMA,
        rollLabel: 'Pilot',
      },
      {
        label: 'sr4.sprite.response',
        name: 'system.sheetStats.INTUITION',
        value: ss.INTUITION,
        sourceValue: src.INTUITION,
        rollLabel: 'Response',
      },
      {
        label: 'sr4.sprite.firewall',
        name: 'system.sheetStats.LOGIC',
        value: ss.LOGIC,
        sourceValue: src.LOGIC,
        rollLabel: 'Firewall',
      },
      {
        label: 'sr4.sprite.signal',
        name: 'system.sheetStats.RESONANCE',
        value: ss.RESONANCE,
        sourceValue: src.RESONANCE,
        rollLabel: 'Signal',
      },
      {
        label: 'sr4.sprite.matrixInit',
        name: 'system.sheetStats.MATRIXINITIATIVE',
        value: ss.MATRIXINITIATIVE,
        sourceValue: src.MATRIXINITIATIVE,
      },
      { label: 'sr4.sprite.ip', value: passesMatrix },
      {
        label: 'sr4.stats.EDGE',
        name: 'system.sheetStats.EDGE',
        value: ss.EDGE,
        sourceValue: src.EDGE,
      },
    ];

    const items = this.document.toObject(false).items || [];
    ctx.complexForms = items
      .filter((i) => i.type === 'Program' && i.system.complexform)
      .sort((a, b) => a.name.localeCompare(b.name));

    return ctx;
  }

  static async #onCreateComplexForm() {
    const [item] = await this.actor.createEmbeddedDocuments('Item', [
      {
        name: game.i18n.localize('sr4.sprite.complexForms'),
        type: 'Program',
        system: { complexform: true },
      },
    ]);
    item?.sheet?.render(true);
  }
}
