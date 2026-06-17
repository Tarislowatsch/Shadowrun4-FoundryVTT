import { SR4SummonedEntitySheet } from './sr4-summoned-entity-sheet.js';

export default class SR4SpriteSheet extends SR4SummonedEntitySheet {
  static DEFAULT_OPTIONS = {
    classes: ['shadowrun4e', 'sheet', 'actor', 'sprite'],
    position: { width: 700, height: 700 },
  };

  static PARTS = {
    sheet: {
      template: 'systems/shadowrun4e/templates/sheets/actors/sprite.sheet.hbs',
      scrollable: [''],
    },
  };

  async _prepareContext(options) {
    const ctx = await this._prepareSummonedEntityContext('ownerUuid');
    ctx.sheetStats = this._buildSheetStats(
      ctx.system.sheetStats,
      {
        label: 'sr4.stats.RESONANCE',
        name: 'system.sheetStats.RESONANCE',
        key: 'RESONANCE',
        rollLabel: 'RES',
      },
      {
        label: 'sr4.stats.MATRIXINITIATIVE',
        name: 'system.sheetStats.MATRIXINITIATIVE',
        key: 'MATRIXINITIATIVE',
      }
    );
    return ctx;
  }
}
