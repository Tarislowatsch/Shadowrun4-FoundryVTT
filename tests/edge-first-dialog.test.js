import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promptEdgeFirst } from '../src/domains/combat/dialogs/edge-first.js';

beforeEach(() => {
  globalThis.foundry.applications = {
    api: { DialogV2: { confirm: vi.fn().mockResolvedValue(true) } },
  };
});

describe('promptEdgeFirst', () => {
  it('opens a DialogV2 confirm with the edge-first localization keys', async () => {
    const result = await promptEdgeFirst();

    expect(result).toBe(true);
    const call =
      globalThis.foundry.applications.api.DialogV2.confirm.mock.calls[0][0];
    expect(call.window.title).toBe('sr4.combat.edgeFirst.title');
    expect(call.content).toContain('sr4.combat.edgeFirst.prompt');
    expect(call.yes.label).toBe('sr4.combat.edgeFirst.yes');
    expect(call.no.label).toBe('sr4.combat.edgeFirst.no');
    expect(call.defaultYes).toBe(false);
  });

  it('resolves to whatever DialogV2.confirm resolves', async () => {
    globalThis.foundry.applications.api.DialogV2.confirm.mockResolvedValue(
      false
    );
    await expect(promptEdgeFirst()).resolves.toBe(false);
  });
});
