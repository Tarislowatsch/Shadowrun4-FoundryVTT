import { describe, it, expect, beforeEach, vi } from 'vitest';

const bindingFlowStartMock = vi.fn();

vi.mock('@flows/binding-flow.js', () => ({
  BindingFlow: { start: (...args) => bindingFlowStartMock(...args) },
}));

const { onOpenLinkedActor, onBindLinkedActor } = await import(
  '../src/sheets/characters/linked-actor-actions.js'
);

beforeEach(() => {
  globalThis.ui = { notifications: { warn: vi.fn() } };
  bindingFlowStartMock.mockClear();
});

function makeTarget(uuid) {
  return { dataset: { uuid } };
}

describe('onOpenLinkedActor', () => {
  it('renders the linked actor sheet when it exists', async () => {
    const render = vi.fn();
    globalThis.fromUuid = vi.fn().mockResolvedValue({ sheet: { render } });

    await onOpenLinkedActor(undefined, makeTarget('Actor.spirit1'));

    expect(globalThis.fromUuid).toHaveBeenCalledWith('Actor.spirit1');
    expect(render).toHaveBeenCalledWith(true);
    expect(globalThis.ui.notifications.warn).not.toHaveBeenCalled();
  });

  it('warns instead of throwing when the linked actor no longer exists', async () => {
    globalThis.fromUuid = vi.fn().mockResolvedValue(null);

    await onOpenLinkedActor(undefined, makeTarget('Actor.deleted1'));

    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(
      'sr4.ui.linkedActorNotFound'
    );
  });

  it('does nothing when the target has no uuid', async () => {
    globalThis.fromUuid = vi.fn();

    await onOpenLinkedActor(undefined, makeTarget(undefined));

    expect(globalThis.fromUuid).not.toHaveBeenCalled();
  });
});

describe('onBindLinkedActor', () => {
  it('starts the binding flow with the sheet actor and resolved target', async () => {
    const target = { name: 'Fire Spirit' };
    globalThis.fromUuid = vi.fn().mockResolvedValue(target);
    const sheetActor = { id: 'Actor.summoner1' };

    await onBindLinkedActor.call(
      { actor: sheetActor },
      undefined,
      makeTarget('Actor.spirit1')
    );

    expect(globalThis.fromUuid).toHaveBeenCalledWith('Actor.spirit1');
    expect(bindingFlowStartMock).toHaveBeenCalledWith(sheetActor, target);
    expect(globalThis.ui.notifications.warn).not.toHaveBeenCalled();
  });

  it('warns instead of throwing when the linked actor no longer exists', async () => {
    globalThis.fromUuid = vi.fn().mockResolvedValue(null);

    await onBindLinkedActor.call(
      { actor: {} },
      undefined,
      makeTarget('Actor.deleted1')
    );

    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(
      'sr4.ui.linkedActorNotFound'
    );
    expect(bindingFlowStartMock).not.toHaveBeenCalled();
  });

  it('does nothing when the target has no uuid', async () => {
    globalThis.fromUuid = vi.fn();

    await onBindLinkedActor.call(
      { actor: {} },
      undefined,
      makeTarget(undefined)
    );

    expect(globalThis.fromUuid).not.toHaveBeenCalled();
    expect(bindingFlowStartMock).not.toHaveBeenCalled();
  });
});
