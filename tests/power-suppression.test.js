import { describe, it, expect, vi } from 'vitest';
import {
  planPowerEffectStates,
  setPowerSuppressed,
} from '@effects/power-suppression.js';

describe('planPowerEffectStates', () => {
  it('disables and marks every active effect when suppressing', () => {
    const effects = [
      { id: 'e1', disabled: false },
      { id: 'e2', disabled: false },
    ];

    expect(planPowerEffectStates(effects, true)).toEqual([
      { _id: 'e1', disabled: true, 'flags.sr4.suppressedByPower': true },
      { _id: 'e2', disabled: true, 'flags.sr4.suppressedByPower': true },
    ]);
  });

  it('leaves a manually disabled effect alone when suppressing', () => {
    const effects = [{ id: 'e1', disabled: true }];
    expect(planPowerEffectStates(effects, true)).toEqual([]);
  });

  it('plans nothing when suppressing an already suppressed power', () => {
    const effects = [
      { id: 'e1', disabled: true, flags: { sr4: { suppressedByPower: true } } },
    ];
    expect(planPowerEffectStates(effects, true)).toEqual([]);
  });

  it('plans nothing when restoring a power it never suppressed', () => {
    const effects = [{ id: 'e1', disabled: false }];
    expect(planPowerEffectStates(effects, false)).toEqual([]);
  });

  it('restores only the effects it disabled itself', () => {
    const effects = [
      {
        id: 'e1',
        disabled: true,
        flags: { sr4: { suppressedByPower: true } },
      },
      { id: 'e2', disabled: true },
    ];

    expect(planPowerEffectStates(effects, false)).toEqual([
      { _id: 'e1', disabled: false, 'flags.sr4.suppressedByPower': false },
    ]);
  });
});

describe('setPowerSuppressed', () => {
  it('writes the flag and the effect states in one update', async () => {
    const item = {
      system: { suppressed: false },
      update: vi.fn(),
      effects: { contents: [{ id: 'e1', disabled: false }] },
    };

    await setPowerSuppressed(item, true);

    expect(item.update).toHaveBeenCalledWith({
      'system.suppressed': true,
      effects: [
        { _id: 'e1', disabled: true, 'flags.sr4.suppressedByPower': true },
      ],
    });
  });

  it('skips the update when the state and the effects already match', async () => {
    const item = {
      system: { suppressed: true },
      update: vi.fn(),
      effects: {
        contents: [
          {
            id: 'e1',
            disabled: true,
            flags: { sr4: { suppressedByPower: true } },
          },
        ],
      },
    };

    await setPowerSuppressed(item, true);

    expect(item.update).not.toHaveBeenCalled();
  });

  it('still disables an effect added while the power was suppressed', async () => {
    const item = {
      system: { suppressed: true },
      update: vi.fn(),
      effects: { contents: [{ id: 'late', disabled: false }] },
    };

    await setPowerSuppressed(item, true);

    expect(item.update).toHaveBeenCalledWith({
      'system.suppressed': true,
      effects: [
        { _id: 'late', disabled: true, 'flags.sr4.suppressedByPower': true },
      ],
    });
  });

  it('omits the effects key for a power without effects', async () => {
    const item = {
      system: { suppressed: false },
      update: vi.fn(),
      effects: { contents: [] },
    };

    await setPowerSuppressed(item, true);

    expect(item.update).toHaveBeenCalledWith({ 'system.suppressed': true });
  });
});
