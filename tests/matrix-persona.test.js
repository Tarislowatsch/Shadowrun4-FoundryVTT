import { describe, it, expect } from 'vitest';
import {
  getMatrixPersona,
  getOffensivePrograms,
  getMatrixAttackPool,
  getMatrixDefensePool,
  getMatrixResistPool,
  classifyMatrixProgram,
} from '@utils/matrix/matrix-persona.js';

/**
 * @param {object} [options]
 */
function makeCharacter({
  technomancer = false,
  LOGIC = 4,
  WILLPOWER = 3,
  CHARISMA = 2,
  INTUITION = 3,
  RESONANCE = 6,
  realm = 'matrix',
  simMode = 'cold',
  items = [],
  skills = {},
} = {}) {
  return {
    type: 'character',
    items,
    getSkill: (name) =>
      skills[name]
        ? { system: { rating: skills[name], attribute: 'LOGIC' } }
        : null,
    getAttribute: (key) =>
      ({ LOGIC, WILLPOWER, CHARISMA, INTUITION, EDGE: 3 })[key] ?? 0,
    system: {
      realm,
      matrixSimMode: simMode,
      sheetStats: { LOGIC, WILLPOWER, CHARISMA, INTUITION, RESONANCE },
      technomancy: { technomancer },
      livingPersona: {},
    },
  };
}

function commlink({
  equipped = true,
  response = 4,
  firewall = 3,
  os = 5,
} = {}) {
  return { type: 'Commlink', system: { equipped, response, firewall, os } };
}

function program(name, category, rating) {
  return { id: name, type: 'Program', name, system: { category, rating } };
}

describe('classifyMatrixProgram', () => {
  it('matches by category', () => {
    expect(classifyMatrixProgram('Foo', 'attack')).toBe('attack');
    expect(classifyMatrixProgram('Foo', 'blackHammer')).toBe('blackHammer');
    expect(classifyMatrixProgram('Foo', 'blackout')).toBe('blackout');
  });

  it('falls back to name matching', () => {
    expect(classifyMatrixProgram('Attack', '')).toBe('attack');
    expect(classifyMatrixProgram('Black Hammer', '')).toBe('blackHammer');
    expect(classifyMatrixProgram('Blackout', '')).toBe('blackout');
  });

  it('returns null for non-offensive programs', () => {
    expect(classifyMatrixProgram('Browse', 'utility')).toBe(null);
  });
});

describe('getMatrixPersona', () => {
  it('uses the best equipped commlink os as System for mundane hackers', () => {
    const actor = makeCharacter({ items: [commlink({ os: 5 })] });
    expect(getMatrixPersona(actor).system).toBe(5);
  });

  it('uses LOGIC as System for technomancers', () => {
    const actor = makeCharacter({ technomancer: true, LOGIC: 6 });
    expect(getMatrixPersona(actor).system).toBe(6);
  });

  it('technomancers always report hot sim', () => {
    const actor = makeCharacter({ technomancer: true, simMode: 'cold' });
    expect(getMatrixPersona(actor).simMode).toBe('hot');
  });

  it('caps living persona attributes at RESONANCE', () => {
    const actor = makeCharacter({
      technomancer: true,
      LOGIC: 6,
      WILLPOWER: 6,
      RESONANCE: 4,
    });
    const persona = getMatrixPersona(actor);
    expect(persona.system).toBe(4);
    expect(persona.firewall).toBe(4);
  });

  it('inVR reflects matrix realm', () => {
    expect(getMatrixPersona(makeCharacter({ realm: 'matrix' })).inVR).toBe(
      true
    );
    expect(getMatrixPersona(makeCharacter({ realm: 'physical' })).inVR).toBe(
      false
    );
  });

  it('maps device fields directly', () => {
    const device = {
      type: 'device',
      items: [],
      system: { pilot: 4, response: 4, firewall: 3, system: 4 },
    };
    const persona = getMatrixPersona(device);
    expect(persona).toMatchObject({
      isDevice: true,
      rating: 4,
      response: 4,
      firewall: 3,
      system: 4,
      inVR: false,
    });
  });

  it('maps sprite fields per convention', () => {
    const sprite = {
      type: 'sprite',
      items: [],
      system: { rating: 5, sheetStats: { INTUITION: 5, LOGIC: 5 } },
    };
    const persona = getMatrixPersona(sprite);
    expect(persona).toMatchObject({
      isSprite: true,
      rating: 5,
      response: 5,
      firewall: 5,
      system: 5,
    });
  });
});

describe('getOffensivePrograms', () => {
  it('discovers embedded Program items and commlink programms', () => {
    const actor = makeCharacter({
      items: [
        program('Attack', 'attack', 4),
        program('Browse', 'utility', 3),
        {
          type: 'Commlink',
          system: {
            equipped: true,
            programms: [{ name: 'Blackout', category: 'blackout', rating: 2 }],
          },
        },
      ],
    });
    const programs = getOffensivePrograms(actor);
    expect(programs).toHaveLength(2);
    expect(programs.map((p) => p.category).sort()).toEqual([
      'attack',
      'blackout',
    ]);
  });
});

describe('pool math', () => {
  it('attack pool = Cybercombat skill rating + program rating (no attribute)', () => {
    const actor = makeCharacter({ LOGIC: 4, skills: { cybercombat: 5 } });
    // rating 5 + program rating 3 (Logic attribute is replaced by the program)
    expect(getMatrixAttackPool(actor, 3)).toBe(8);
  });

  it('attack pool defaults to program rating - 1 without Cybercombat skill', () => {
    const actor = makeCharacter({ LOGIC: 4 });
    expect(getMatrixAttackPool(actor, 3)).toBe(2); // 3 - 1
  });

  it('attack pool = rating + program rating for devices', () => {
    const device = {
      type: 'device',
      items: [],
      system: { pilot: 4, response: 4, firewall: 3, system: 4 },
    };
    expect(getMatrixAttackPool(device, 3)).toBe(7);
  });

  it('defense pool = response + firewall, plus Hacking on full defense', () => {
    const actor = makeCharacter({
      items: [commlink({ response: 4, firewall: 3 })],
      skills: { hacking: 2 },
    });
    expect(getMatrixDefensePool(actor, false)).toBe(7);
    expect(getMatrixDefensePool(actor, true)).toBe(9);
  });

  it('device full defense adds rating', () => {
    const device = {
      type: 'device',
      items: [],
      system: { pilot: 4, response: 4, firewall: 3, system: 4 },
    };
    expect(getMatrixDefensePool(device, false)).toBe(7);
    expect(getMatrixDefensePool(device, true)).toBe(11);
  });

  it('resist pool = System + Armor program rating', () => {
    const actor = makeCharacter({
      items: [commlink({ os: 5 }), program('Armor', 'armor', 2)],
    });
    expect(getMatrixResistPool(actor, { biofeedback: false })).toBe(7);
  });

  it('biofeedback resist pool = Willpower + Biofeedback Filter', () => {
    const actor = makeCharacter({
      WILLPOWER: 4,
      items: [program('Biofeedback Filter', 'biofeedbackFilter', 3)],
    });
    // computeBiofeedbackFilter (non-techno) reads program rating 3; WIL 4
    expect(getMatrixResistPool(actor, { biofeedback: true })).toBe(7);
  });
});
