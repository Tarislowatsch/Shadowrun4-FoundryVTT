import { SR4SummonedEntitySheet } from './sr4-summoned-entity-sheet.js';

export default class SR4SpiritSheet extends SR4SummonedEntitySheet {
  static DEFAULT_OPTIONS = {
    classes: ['shadowrun4e', 'sheet', 'actor', 'spirit'],
    position: { width: 700, height: 700 },
  };

  static PARTS = {
    sheet: {
      template: 'systems/shadowrun4e/templates/sheets/actors/spirit.sheet.hbs',
      scrollable: [''],
    },
  };

  async _prepareContext(options) {
    const ctx = await this._prepareSummonedEntityContext('ownerUuid');
    ctx.sheetStats = this._buildSheetStats(
      ctx.system.sheetStats,
      {
        label: 'sr4.stats.MAGIC',
        name: 'system.sheetStats.MAGIC',
        key: 'MAGIC',
        rollLabel: 'MAG',
      },
      {
        label: 'sr4.stats.ASTRALINITIATIVE',
        name: 'system.sheetStats.ASTRALINITIATIVE',
        key: 'ASTRALINITIATIVE',
      }
    );
    return ctx;
  }
}
