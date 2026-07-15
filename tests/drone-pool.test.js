import { describe, it, expect } from 'vitest';
import {
  ControlModes,
  DEFAULT_RIGGER_LOOKUP,
  DroneActions,
  buildRiggerSkillOptions,
  controllingActor,
  findRiggerSkill,
  getVehicleStat,
  mergeRiggerLookup,
  resolveDronePool,
} from '@utils/rigging/drone-pool.js';

/**
 * @param {{ pilot?: number, response?: number, sensor?: number, body?: number, armor?: number, autosofts?: { type: string, rating: number, name?: string }[] }} [options]
 */
function makeVehicle({
  pilot = 2,
  response = 3,
  sensor = 4,
  body = 3,
  armor = 2,
  autosofts = [],
} = {}) {
  return {
    type: 'vehicle',
    system: {
      pilot,
      response,
      sensor,
      body,
      armor,
      effectivePilot: pilot,
      effectiveSensor: sensor,
      effectiveBody: body,
      effectiveArmor: armor,
    },
    items: autosofts.map((a) => ({
      type: 'Autosoft',
      name: a.name ?? a.type,
      system: { autosoftType: a.type, rating: a.rating },
    })),
  };
}

/**
 * @param {{ skills?: Record<string, number>, commandRating?: number|null, initiative?: number }} [options]
 */
function makeRigger({
  skills = {},
  commandRating = null,
  initiative = 9,
} = {}) {
  const items = Object.entries(skills).map(([name, rating]) => ({
    type: 'Skill',
    name,
    system: { rating, label: `sr4.skills.${name}` },
  }));
  if (commandRating !== null) {
    items.push({
      type: 'Program',
      name: 'Command',
      system: { rating: commandRating },
    });
  }
  return {
    type: 'character',
    items,
    getSkill(name) {
      return (
        items.find(
          (i) =>
            i.type === 'Skill' && i.name.toLowerCase() === name.toLowerCase()
        ) ?? null
      );
    },
    getInitiativeBase: () => initiative,
  };
}

const vehicle = makeVehicle({
  autosofts: [
    { type: 'targeting', rating: 3 },
    { type: 'defense', rating: 2 },
    { type: 'covert-ops', rating: 1 },
    { type: 'maneuvering', rating: 4 },
    { type: 'clearsight', rating: 2 },
  ],
});

const rigger = makeRigger({
  skills: {
    gunnery: 4,
    infiltration: 3,
    perception: 2,
    dodge: 3,
    unarmedcombat: 2,
    pilotgroundcraft: 5,
    pilotaircraft: 2,
  },
  commandRating: 3,
});

describe('resolveDronePool full table', () => {
  it.each([
    [DroneActions.ATTACK, 'jumped', 8],
    [DroneActions.ATTACK, 'autonomous', 5],
    [DroneActions.ATTACK, 'remote', 7],
    [DroneActions.MELEE_DEFENSE, 'jumped', 6],
    [DroneActions.MELEE_DEFENSE, 'autonomous', 4],
    [DroneActions.MELEE_DEFENSE, 'remote', 6],
    [DroneActions.RANGED_DEFENSE, 'jumped', 3],
    [DroneActions.RANGED_DEFENSE, 'autonomous', 3],
    [DroneActions.RANGED_DEFENSE, 'remote', 3],
    [DroneActions.DAMAGE_RESISTANCE, 'jumped', 5],
    [DroneActions.DAMAGE_RESISTANCE, 'autonomous', 5],
    [DroneActions.DAMAGE_RESISTANCE, 'remote', 5],
    [DroneActions.INFILTRATION, 'jumped', 6],
    [DroneActions.INFILTRATION, 'autonomous', 3],
    [DroneActions.INFILTRATION, 'remote', 6],
    [DroneActions.MANEUVERING, 'jumped', 8],
    [DroneActions.MANEUVERING, 'autonomous', 6],
    [DroneActions.MANEUVERING, 'remote', 8],
    [DroneActions.PERCEPTION, 'jumped', 6],
    [DroneActions.PERCEPTION, 'autonomous', 6],
    [DroneActions.PERCEPTION, 'remote', 6],
    [DroneActions.INITIATIVE, 'jumped', 9],
    [DroneActions.INITIATIVE, 'autonomous', 5],
    [DroneActions.INITIATIVE, 'remote', 9],
  ])('%s in %s mode yields pool %i', (action, mode, expected) => {
    const { pool, warnings } = resolveDronePool(vehicle, rigger, mode, action);
    expect(pool).toBe(expected);
    expect(warnings).toEqual([]);
  });

  it.each([
    ['jumped', 6],
    ['autonomous', 5],
    ['remote', 6],
  ])('ranged full defense in %s mode yields pool %i', (mode, expected) => {
    const { pool } = resolveDronePool(
      vehicle,
      rigger,
      mode,
      DroneActions.FULL_DEFENSE,
      { melee: false }
    );
    expect(pool).toBe(expected);
  });

  it('melee full defense adds the dodge skill on top of the melee pool', () => {
    const { pool } = resolveDronePool(
      vehicle,
      rigger,
      'jumped',
      DroneActions.FULL_DEFENSE,
      { melee: true }
    );
    expect(pool).toBe(9);
  });

  it('reports pool parts with labels and values', () => {
    const { parts } = resolveDronePool(vehicle, rigger, 'jumped', 'attack');
    expect(parts).toEqual([
      { label: 'sr4.vehicle.sensor', value: 4 },
      { label: 'sr4.skills.gunnery', value: 4 },
    ]);
  });
});

describe('resolveDronePool fallbacks', () => {
  it('uses pilot alone with a warning when the autosoft is missing', () => {
    const bare = makeVehicle();
    const { pool, warnings } = resolveDronePool(
      bare,
      null,
      'autonomous',
      'attack'
    );
    expect(pool).toBe(2);
    expect(warnings).toContain('sr4.vehicle.missingAutosoft');
  });

  it('defaults a missing rigger skill at -1', () => {
    const unskilled = makeRigger({ commandRating: 3 });
    const { pool } = resolveDronePool(vehicle, unskilled, 'jumped', 'attack');
    expect(pool).toBe(3);
  });

  it('treats a missing Command program as 0 with a warning', () => {
    const noCommand = makeRigger({ skills: { gunnery: 4 } });
    const { pool, warnings } = resolveDronePool(
      vehicle,
      noCommand,
      'remote',
      'rangedDefense'
    );
    expect(pool).toBe(0);
    expect(warnings).toContain('sr4.vehicle.noCommandProgram');
  });

  it('warns when a rigger mode is requested without a linked rigger', () => {
    const { pool, warnings } = resolveDronePool(
      vehicle,
      null,
      'jumped',
      'attack'
    );
    expect(pool).toBe(4);
    expect(warnings).toContain('sr4.vehicle.noRigger');
  });

  it('honors a maneuvering skill override', () => {
    const { pool, parts } = resolveDronePool(
      vehicle,
      rigger,
      'remote',
      'maneuvering',
      { skillOverride: 'pilotaircraft' }
    );
    expect(pool).toBe(5);
    expect(parts[1]).toEqual({ label: 'sr4.skills.pilotaircraft', value: 2 });
  });

  it('never returns a negative pool', () => {
    const weak = makeVehicle({ sensor: 0 });
    const unskilled = makeRigger({ commandRating: 0 });
    const { pool } = resolveDronePool(weak, unskilled, 'jumped', 'attack');
    expect(pool).toBe(0);
  });
});

describe('buildRiggerSkillOptions', () => {
  it('lists only pilot skills for maneuvering', () => {
    const options = buildRiggerSkillOptions(rigger, DroneActions.MANEUVERING);
    expect(options.map((o) => o.value).sort()).toEqual([
      'pilotaircraft',
      'pilotgroundcraft',
    ]);
  });

  it('lists rated melee defense skills for melee defense', () => {
    const options = buildRiggerSkillOptions(rigger, DroneActions.MELEE_DEFENSE);
    expect(options.map((o) => o.value).sort()).toEqual([
      'dodge',
      'unarmedcombat',
    ]);
  });

  it('returns no options without a rigger', () => {
    expect(buildRiggerSkillOptions(null, DroneActions.MANEUVERING)).toEqual([]);
  });
});

describe('controllingActor', () => {
  it.each([
    ['autonomous', 'vehicle'],
    ['jumped', 'character'],
    ['remote', 'character'],
  ])('in %s mode the %s acts', (mode, expectedType) => {
    expect(controllingActor(vehicle, rigger, mode).type).toBe(expectedType);
  });

  it('falls back to the vehicle when no rigger is linked', () => {
    expect(controllingActor(vehicle, null, 'jumped').type).toBe('vehicle');
  });
});

describe('getVehicleStat', () => {
  it('prefers effective values over base values', () => {
    const modded = makeVehicle();
    modded.system.effectiveArmor = 4;
    expect(getVehicleStat(modded, 'armor')).toBe(4);
  });

  it('falls back to the base value when no effective value exists', () => {
    const raw = { system: { response: 3 } };
    expect(getVehicleStat(raw, 'response')).toBe(3);
  });
});

describe('ControlModes', () => {
  it('covers the three SR4 control modes', () => {
    expect(Object.values(ControlModes).sort()).toEqual([
      'autonomous',
      'jumped',
      'remote',
    ]);
  });
});

describe('findRiggerSkill', () => {
  const skills = [
    {
      type: 'Skill',
      name: 'Geschütze',
      system: { rating: 4, label: 'sr4.skills.gunnery' },
    },
    { type: 'Skill', name: 'Gunnery', system: { rating: 2, label: '' } },
    {
      type: 'Skill',
      name: 'Dodge',
      system: { rating: 3, label: 'sr4.skills.dodge' },
    },
  ];
  const rigger = { items: skills };

  it('prefers a label match over a name match', () => {
    expect(findRiggerSkill(rigger, 'sr4.skills.gunnery').name).toBe(
      'Geschütze'
    );
  });

  it('falls back to a case-insensitive name match', () => {
    expect(findRiggerSkill(rigger, 'GUNNERY').name).toBe('Gunnery');
  });

  it('returns null when neither label nor name matches', () => {
    expect(findRiggerSkill(rigger, 'sr4.skills.hacking')).toBeNull();
  });

  it('ignores non-skill items', () => {
    const actor = { items: [{ type: 'Program', name: 'Dodge', system: {} }] };
    expect(findRiggerSkill(actor, 'dodge')).toBeNull();
  });
});

describe('mergeRiggerLookup', () => {
  it('returns defaults when setting and overrides are empty', () => {
    expect(mergeRiggerLookup(DEFAULT_RIGGER_LOOKUP, '{}')).toEqual(
      DEFAULT_RIGGER_LOOKUP
    );
  });

  it('lets the setting override the default', () => {
    const merged = mergeRiggerLookup(
      DEFAULT_RIGGER_LOOKUP,
      '{"attackSkill":"sr4.skills.exoticranged"}'
    );
    expect(merged.attackSkill).toBe('sr4.skills.exoticranged');
    expect(merged.fullDefenseSkill).toBe('sr4.skills.dodge');
  });

  it('lets the vehicle override beat the setting', () => {
    const merged = mergeRiggerLookup(
      DEFAULT_RIGGER_LOOKUP,
      '{"attackSkill":"sr4.skills.exoticranged"}',
      { attackSkill: 'sr4.skills.heavyweapons' }
    );
    expect(merged.attackSkill).toBe('sr4.skills.heavyweapons');
  });

  it('treats empty-string overrides as unset', () => {
    const merged = mergeRiggerLookup(
      DEFAULT_RIGGER_LOOKUP,
      '{"commandProgram":"Befehl"}',
      { commandProgram: '' }
    );
    expect(merged.commandProgram).toBe('Befehl');
  });

  it('falls back to defaults on invalid JSON', () => {
    expect(mergeRiggerLookup(DEFAULT_RIGGER_LOOKUP, 'not-json')).toEqual(
      DEFAULT_RIGGER_LOOKUP
    );
  });

  it('drops unknown keys from the setting', () => {
    const merged = mergeRiggerLookup(DEFAULT_RIGGER_LOOKUP, '{"bogus":"x"}');
    expect(merged.bogus).toBeUndefined();
  });
});

describe('resolveDronePool with custom lookup', () => {
  it('uses a configured attack skill', () => {
    const custom = makeRigger({
      skills: { heavyweapons: 5 },
      commandRating: 3,
    });
    const { pool, parts } = resolveDronePool(
      vehicle,
      custom,
      'jumped',
      'attack',
      {
        lookup: { ...DEFAULT_RIGGER_LOOKUP, attackSkill: 'heavyweapons' },
      }
    );
    expect(pool).toBe(9);
    expect(parts[1]).toEqual({ label: 'sr4.skills.heavyweapons', value: 5 });
  });

  it('matches a configured command program name', () => {
    const custom = makeRigger({ skills: { gunnery: 4 } });
    custom.items.push({
      type: 'Program',
      name: 'Befehl',
      system: { rating: 4 },
    });
    const { pool, warnings } = resolveDronePool(
      vehicle,
      custom,
      'remote',
      'rangedDefense',
      {
        lookup: { ...DEFAULT_RIGGER_LOOKUP, commandProgram: 'Befehl' },
      }
    );
    expect(pool).toBe(4);
    expect(warnings).toEqual([]);
  });

  it('labels a missing command program with the configured name', () => {
    const custom = makeRigger({ skills: { gunnery: 4 } });
    const { parts, warnings } = resolveDronePool(
      vehicle,
      custom,
      'remote',
      'rangedDefense',
      {
        lookup: { ...DEFAULT_RIGGER_LOOKUP, commandProgram: 'Befehl' },
      }
    );
    expect(parts[0]).toEqual({ label: 'Befehl', value: 0 });
    expect(warnings).toContain('sr4.vehicle.noCommandProgram');
  });
});

describe('buildRiggerSkillOptions by category', () => {
  it('includes vehicle-category skills without a pilot prefix', () => {
    const custom = makeRigger({ skills: {} });
    custom.items.push({
      type: 'Skill',
      name: 'Fahrzeugkunst',
      system: {
        rating: 3,
        label: 'sr4.skills.fahrzeugkunst',
        category: 'vehicle',
      },
    });
    const options = buildRiggerSkillOptions(custom, DroneActions.MANEUVERING);
    expect(options.map((o) => o.value)).toEqual(['fahrzeugkunst']);
  });

  it('still includes pilot-prefixed skills without a category', () => {
    const options = buildRiggerSkillOptions(rigger, DroneActions.MANEUVERING);
    expect(options.map((o) => o.value).sort()).toEqual([
      'pilotaircraft',
      'pilotgroundcraft',
    ]);
  });
});
