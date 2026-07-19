import { describe, it, expect } from 'vitest';
import { SR4DeviceData } from '@models/actor/device.model.js';

/**
 * @param {{ pilot?: number, response?: number, system?: number }} [over]
 */
function makeDevice({ pilot = 4, response = 4, system = 4 } = {}) {
  return {
    pilot,
    response,
    system,
    derivedStats: {
      initiative: { physical: 0, astral: 0, matrix: 0 },
      passesString: '',
    },
    conditionMonitor: {
      physical: { value: 0, max: 0 },
      stun: { value: 0, max: 0 },
      matrix: { value: 0, max: 0 },
    },
  };
}

describe('SR4DeviceData.prepareDerivedData', () => {
  it('matrix initiative = pilot + response', () => {
    const self = makeDevice({ pilot: 4, response: 4 });
    SR4DeviceData.prototype.prepareDerivedData.call(self);
    expect(self.derivedStats.initiative.matrix).toBe(8);
  });

  it('passesString is 0/3/0', () => {
    const self = makeDevice();
    SR4DeviceData.prototype.prepareDerivedData.call(self);
    expect(self.derivedStats.passesString).toBe('0/3/0');
  });

  it('matrix CM max = 8 + ceil(system/2)', () => {
    const self = makeDevice({ system: 4 });
    SR4DeviceData.prototype.prepareDerivedData.call(self);
    expect(self.conditionMonitor.matrix.max).toBe(10);
  });

  it('rounds up matrix CM max for odd system', () => {
    const self = makeDevice({ system: 5 });
    SR4DeviceData.prototype.prepareDerivedData.call(self);
    expect(self.conditionMonitor.matrix.max).toBe(11);
  });
});
