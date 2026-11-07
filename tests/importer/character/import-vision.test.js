import { describe, it, expect } from 'vitest';
import {
  mapCharacterMetatype,
  metatypeLookupNames,
} from '@importer/mappers/index.js';
import {
  buildActorData,
  buildCyberwareVision,
} from '@importer/character/build-character.js';
import { findMetatypeTemplate } from '@importer/character/metatype-template.js';

const elfTemplate = {
  type: 'Metatype',
  name: 'Elf',
  system: {
    qualities: { positive: ['Low-Light Vision'], negative: [] },
    powers: [],
    optionalPowers: [],
  },
};

describe('metatypeLookupNames', () => {
  it('prefers the metavariant over the base metatype', () => {
    expect(
      metatypeLookupNames({ metatype: 'Elf', metavariant: 'Night One' })
    ).toEqual(['Night One', 'Elf']);
  });

  it('tries the English export name before the localized one', () => {
    expect(
      metatypeLookupNames({ metatype: 'Zwerg', metatype_english: 'Dwarf' })
    ).toEqual(['Dwarf', 'Zwerg']);
  });

  it('maps German base metatypes without an English export name', () => {
    expect(metatypeLookupNames({ metatype: 'Zwerg' })).toEqual([
      'Dwarf',
      'Zwerg',
    ]);
  });

  it('skips empty names', () => {
    expect(metatypeLookupNames({ metatype: 'Troll', metavariant: '' })).toEqual(
      ['Troll']
    );
  });
});

describe('mapCharacterMetatype', () => {
  it('keeps empty qualities and powers without a template', () => {
    const item = mapCharacterMetatype({ metatype: 'Elf' });
    expect(item.system.qualities).toEqual({ positive: [], negative: [] });
    expect(item.system.powers).toEqual([]);
  });

  it('copies qualities and powers from the template', () => {
    const item = mapCharacterMetatype({ metatype: 'Elf' }, elfTemplate);
    expect(item.system.qualities.positive).toEqual(['Low-Light Vision']);
  });
});

describe('buildCyberwareVision', () => {
  it('reads vision modes from cyberware and its options', () => {
    expect(
      buildCyberwareVision({
        cyberware: [
          {
            name: 'Cybereyes Basic System Rating 2',
            _childNames: [
              'Image Link',
              'Flare Compensation',
              'Thermographic Vision',
            ],
          },
          { name: 'Wired Reflexes Rating 1' },
        ],
      })
    ).toEqual({ flareCompensation: true, thermographic: true });
  });

  it('reads low-light vision from cat eyes exported as cyberware', () => {
    expect(
      buildCyberwareVision({
        cyberware: [{ name: "Cat's Eyes", category: 'Basic' }],
      })
    ).toEqual({ lowLight: true });
  });

  it('recognises German cyberware names', () => {
    expect(
      buildCyberwareVision({
        cyberware: [
          {
            name: 'Cyberaugen Stufe 2',
            _childNames: ['Infrarotsicht', 'Blitzkompensation'],
          },
        ],
      })
    ).toEqual({ thermographic: true, flareCompensation: true });
  });

  it('returns no modes without cyberware', () => {
    expect(buildCyberwareVision(undefined)).toEqual({});
  });
});

describe('buildActorData vision', () => {
  const parsed = {
    character: { name: 'Bodyguard', metatype: 'Elf' },
    items: {
      cyberware: [
        { name: 'Cybereyes Rating 1', _childNames: ['Ultrasound Sensor'] },
      ],
    },
    skills: [],
  };

  it('stores only detected vision modes on the actor', () => {
    const data = buildActorData(parsed, []);
    expect(data.system.vision).toEqual({ ultrasound: true });
  });

  it('fills the metatype item from the template', () => {
    const data = buildActorData(parsed, [], { metatypeTemplate: elfTemplate });
    const metatype = data.items.find((item) => item.type === 'Metatype');
    expect(metatype.system.qualities.positive).toEqual(['Low-Light Vision']);
  });
});

describe('findMetatypeTemplate', () => {
  /**
   * @param {object[]} entries
   * @param {string} [packageType]
   * @param {string} [packageName]
   * @returns {object}
   */
  function makePack(
    entries,
    packageType = 'system',
    packageName = 'shadowrun4e'
  ) {
    return {
      documentName: 'Item',
      metadata: { packageType, packageName },
      getIndex: async () => entries,
      getDocument: async (id) => ({ ...entries.find((e) => e._id === id) }),
    };
  }

  it('prefers a world item with a matching name', async () => {
    const pack = makePack([{ _id: 'p1', type: 'Metatype', name: 'Elf' }]);
    const result = await findMetatypeTemplate(['Elf'], {
      items: [elfTemplate],
      packs: [pack],
    });
    expect(result).toBe(elfTemplate);
  });

  it('falls back to item compendia and checks names in order', async () => {
    const pack = makePack([
      { _id: 'p1', type: 'Metatype', name: 'Elf' },
      { _id: 'p2', type: 'Metatype', name: 'Night One' },
    ]);
    const result = await findMetatypeTemplate(['Night One', 'Elf'], {
      items: [],
      packs: [pack],
    });
    expect(result._id).toBe('p2');
  });

  it('ignores non-metatype entries and other document packs', async () => {
    const actorPack = { ...makePack([]), documentName: 'Actor' };
    const pack = makePack([{ _id: 'p1', type: 'Quality', name: 'Elf' }]);
    const result = await findMetatypeTemplate(['Elf'], {
      items: [],
      packs: [actorPack, pack],
    });
    expect(result).toBeNull();
  });

  it('ignores packs from other modules', async () => {
    const modulePack = makePack(
      [{ _id: 'm1', type: 'Metatype', name: 'Elf' }],
      'module',
      'some-module'
    );
    const result = await findMetatypeTemplate(['Elf'], {
      items: [],
      packs: [modulePack],
    });
    expect(result).toBeNull();
  });

  it('prefers world packs over the system pack', async () => {
    const systemPack = makePack([{ _id: 's1', type: 'Metatype', name: 'Elf' }]);
    const worldPack = makePack(
      [{ _id: 'w1', type: 'Metatype', name: 'Elf' }],
      'world',
      'my-world'
    );
    const result = await findMetatypeTemplate(['Elf'], {
      items: [],
      packs: [systemPack, worldPack],
    });
    expect(result._id).toBe('w1');
  });
});
