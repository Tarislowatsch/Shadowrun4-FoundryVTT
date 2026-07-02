import { describe, it, expect } from 'vitest';
import { ApplyDamageFlow } from '../src/flows/apply-damage-flow.js';

// setup.js installs a foundry.Game stub and a matching `game` instance so
// getGame() succeeds; i18n methods return the key unchanged.

function makeMonitor({
  physValue = 0,
  physMax = 10,
  stunValue = 0,
  stunMax = 10,
} = {}) {
  return {
    physical: { value: physValue, max: physMax },
    stun: { value: stunValue, max: stunMax },
  };
}

// ---------------------------------------------------------------------------
// Physical damage — parametrised core cases
// ---------------------------------------------------------------------------

describe('ApplyDamageFlow.applyDamage – physical', () => {
  it.each([
    // [startVal, maxVal, overflow, damage, expectedVal, overflowMsg, deadMsg]
    [0, 10, 4, 3, 3, false, false], // normal hit
    [8, 10, 4, 2, 10, true, false], // enters overflow zone (afterPhys=10, cap=14)
    [0, 10, 4, 14, 14, false, true], // exactly dead (afterPhys=14 = cap)
    [0, 10, 4, 20, 14, false, true], // past cap → capped at 14
    [0, 10, 0, 10, 10, false, true], // overflow=0: cap=max, filling monitor → dead immediately
    [8, 10, 0, 2, 10, false, true], // overflow=0: reaching max without buffer → dead, not overflow
  ])(
    'start=%i max=%i overflow=%i +%i → value=%i overflow=%s dead=%s',
    (
      startVal,
      maxVal,
      overflow,
      damage,
      expectedVal,
      wantsOverflow,
      wantsDead
    ) => {
      const cm = makeMonitor({ physValue: startVal, physMax: maxVal });
      const { conditionMonitor, messages } = ApplyDamageFlow.applyDamage(
        cm,
        damage,
        true,
        'Testee',
        overflow,
        'combat'
      );
      expect(conditionMonitor.physical.value).toBe(expectedVal);
      const hasOverflow = messages.some((m) =>
        m.content.includes('actoroverflow')
      );
      const hasDead = messages.some((m) => m.content.includes('actordead'));
      expect(hasOverflow).toBe(wantsOverflow);
      expect(hasDead).toBe(wantsDead);
    }
  );

  it('always emits an EMOTE damage message', () => {
    const { messages } = ApplyDamageFlow.applyDamage(
      makeMonitor(),
      3,
      true,
      'X',
      4,
      'combat'
    );
    expect(messages.some((m) => m.type === 'EMOTE')).toBe(true);
  });

  it('returns the same conditionMonitor reference (mutated in place)', () => {
    const cm = makeMonitor();
    expect(
      ApplyDamageFlow.applyDamage(cm, 1, true, 'X', 4, 'combat')
        .conditionMonitor
    ).toBe(cm);
  });
});

// ---------------------------------------------------------------------------
// Stun damage — parametrised core cases
// ---------------------------------------------------------------------------

describe('ApplyDamageFlow.applyDamage – stun', () => {
  it.each([
    // [stunStart, stunMax, physStart, damage, overflow, expectedStun, expectedPhys, unconscious]
    [0, 10, 0, 3, 4, 3, 0, false], // normal stun hit
    [0, 10, 0, 10, 4, 10, 0, true], // exactly fills (spillover=0)
    [8, 10, 0, 5, 4, 10, 3, true], // overflow: 2 stun + 3 into physical
  ])(
    'stun=%i/%i phys=%i +%i overflow=%i → stun=%i phys=%i unconscious=%s',
    (
      stunStart,
      stunMax,
      physStart,
      damage,
      overflow,
      expectedStun,
      expectedPhys,
      wantsUnconscious
    ) => {
      const cm = makeMonitor({
        stunValue: stunStart,
        stunMax,
        physValue: physStart,
      });
      const { conditionMonitor, messages } = ApplyDamageFlow.applyDamage(
        cm,
        damage,
        false,
        'Testee',
        overflow,
        'combat'
      );
      expect(conditionMonitor.stun.value).toBe(expectedStun);
      expect(conditionMonitor.physical.value).toBe(expectedPhys);
      const hasUnconscious = messages.some((m) => m.type === 'unconscious');
      expect(hasUnconscious).toBe(wantsUnconscious);
    }
  );

  it('stun damage message reflects only the portion that fits in stun monitor', () => {
    // stun=8/10, damage=5 → 2 boxes fit; 3 overflow to physical
    // createDamageMessage is called with the reduced damage (2), not 5
    const cm = makeMonitor({ stunValue: 8, stunMax: 10 });
    const { messages } = ApplyDamageFlow.applyDamage(
      cm,
      5,
      false,
      'Testee',
      4,
      'combat'
    );
    // First message is the stun damage summary; further messages cover physical
    expect(messages[0].type).toBe('EMOTE');
    expect(messages[0].content).toContain('"amount":2');
    expect(messages[1].type).toBe('unconscious');
  });
});

// ---------------------------------------------------------------------------
// Monitor routing
// ---------------------------------------------------------------------------
// applyDamage receives the already-resolved isPhysical boolean (the defense
// flow maps the damage type via isPhysicalDamageType, which is covered in
// weapons.model.test.js). Here we only assert that the boolean routes damage
// to the correct monitor and leaves the other untouched.

describe('ApplyDamageFlow.applyDamage – monitor routing', () => {
  it.each([
    [true, 'physical'],
    [false, 'stun'],
  ])('isPhysical=%s hits the %s monitor', (isPhysical, targetMonitor) => {
    const cm = makeMonitor();
    const { conditionMonitor } = ApplyDamageFlow.applyDamage(
      cm,
      3,
      isPhysical,
      'Testee',
      4,
      'combat'
    );
    const hit = conditionMonitor[targetMonitor].value;
    const other =
      conditionMonitor[targetMonitor === 'physical' ? 'stun' : 'physical']
        .value;
    expect(hit).toBe(3);
    expect(other).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Return-value invariants
// ---------------------------------------------------------------------------

describe('ApplyDamageFlow.applyDamage – return value', () => {
  it('returns a non-empty messages array even for 0 damage', () => {
    const { messages } = ApplyDamageFlow.applyDamage(
      makeMonitor(),
      0,
      true,
      'X',
      4,
      'combat'
    );
    // 0 physical damage: afterPhys=0, 0 < max=10 → no overflow/dead; still emits damage msg
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(1);
  });
});
