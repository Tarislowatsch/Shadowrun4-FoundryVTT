import { describe, it, expect } from 'vitest';

describe('resolveSpiritDrain — real export chain (no mocks)', () => {
  it('is exported through the @domains/summoned-entity/dialogs/index.js barrel', async () => {
    const dialogs = await import(
      '../src/domains/summoned-entity/dialogs/index.js'
    );
    expect(typeof dialogs.resolveSpiritDrain).toBe('function');
    expect(typeof dialogs.resolveDrain).toBe('function');
    expect(typeof dialogs.calculateSummonedEntityDrainPool).toBe('function');
  });

  it('flows that consume it from the barrel resolve without undefined bindings', async () => {
    const { SummoningFlow } = await import(
      '../src/domains/summoned-entity/flow/summoning-flow.js'
    );
    const { BindingFlow } = await import(
      '../src/domains/summoned-entity/flow/binding-flow.js'
    );
    const { DismissalFlow } = await import(
      '../src/domains/summoned-entity/flow/dismissal-flow.js'
    );
    expect(typeof SummoningFlow.start).toBe('function');
    expect(typeof BindingFlow.start).toBe('function');
    expect(typeof DismissalFlow.start).toBe('function');
  });
});
