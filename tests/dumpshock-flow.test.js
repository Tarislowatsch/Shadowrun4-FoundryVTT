import { describe, it, expect } from 'vitest';
import { computeDumpshockParams } from '@flows/dumpshock-flow.js';
import { SR4 } from '../src/config.js';

describe('computeDumpshockParams', () => {
  it('uses the configured dumpshock DV', () => {
    expect(computeDumpshockParams('cold', 3).dv).toBe(
      SR4.rules.matrix.dumpshockDv
    );
  });

  it('cold sim is stun (not physical)', () => {
    expect(computeDumpshockParams('cold', 3).isPhysical).toBe(false);
  });

  it('hot sim is physical', () => {
    expect(computeDumpshockParams('hot', 3).isPhysical).toBe(true);
  });

  it('disorientation lasts (10 - Willpower) minutes in seconds', () => {
    expect(computeDumpshockParams('cold', 3).disorientSeconds).toBe(7 * 60);
    expect(computeDumpshockParams('cold', 6).disorientSeconds).toBe(4 * 60);
  });

  it('disorientation clamps to 0 for high Willpower', () => {
    expect(computeDumpshockParams('cold', 12).disorientSeconds).toBe(0);
  });
});
