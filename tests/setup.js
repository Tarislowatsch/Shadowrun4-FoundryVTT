// Minimal stubs for Foundry globals so source modules can be imported in Node.

class NoopField {
  constructor() {}
}

class SchemaField extends NoopField {
  constructor() {
    super();
  }
}

class TypeDataModel {}
class ActiveEffect {}
class FoundryGame {}

globalThis.foundry = {
  Game: FoundryGame,
  data: {
    fields: {
      NumberField: NoopField,
      StringField: NoopField,
      BooleanField: NoopField,
      HTMLField: NoopField,
      SchemaField,
      ArrayField: NoopField,
      ObjectField: NoopField,
    },
  },
  utils: {
    deepClone: (x) => JSON.parse(JSON.stringify(x)),
    getProperty: (obj, key) => key.split('.').reduce((o, k) => o?.[k], obj),
  },
  documents: { ActiveEffect },
  abstract: { TypeDataModel },
};

// Make `game instanceof foundry.Game` pass so getGame() doesn't throw.
globalThis.game = Object.assign(Object.create(FoundryGame.prototype), {
  i18n: {
    format: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
    localize: (key) => key,
  },
});

globalThis.CONST = {
  DOCUMENT_OWNERSHIP_LEVELS: {
    NONE: 0,
    LIMITED: 1,
    OBSERVER: 2,
    OWNER: 3,
  },
};
