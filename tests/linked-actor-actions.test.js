import { describe, it, expect, beforeEach, vi } from 'vitest';

const bindingFlowStartMock = vi.fn();

vi.mock('@domains/summoned-entity/flow/binding-flow.js', () => ({
  BindingFlow: { start: (...args) => bindingFlowStartMock(...args) },
}));

const confirmDialogMock = vi.fn();

vi.mock('@utils/dialog', () => ({
  confirmDialog: (...args) => confirmDialogMock(...args),
}));

const { onOpenLinkedActor, onBindLinkedActor, onUnlinkLinkedActor } =
  await import('../src/sheets/characters/linked-actor-actions.js');

beforeEach(() => {
  globalThis.ui = { notifications: { warn: vi.fn() } };
  globalThis.game = {
    i18n: { localize: (key) => key, format: (key) => key },
  };
  globalThis.foundry = {
    ...globalThis.foundry,
    utils: { ...globalThis.foundry?.utils, escapeHTML: (s) => s },
  };
  bindingFlowStartMock.mockClear();
  confirmDialogMock.mockReset();
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

describe('onUnlinkLinkedActor', () => {
  it('clears owner and bound state after confirmation', async () => {
    const update = vi.fn();
    globalThis.fromUuid = vi
      .fn()
      .mockResolvedValue({ name: 'Fire Spirit', update });
    confirmDialogMock.mockResolvedValue(true);

    await onUnlinkLinkedActor(undefined, makeTarget('Actor.spirit1'));

    expect(confirmDialogMock).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith({
      'system.ownerUuid': '',
      'system.bound': false,
    });
  });

  it('keeps the link when the confirmation is declined', async () => {
    const update = vi.fn();
    globalThis.fromUuid = vi
      .fn()
      .mockResolvedValue({ name: 'Fire Spirit', update });
    confirmDialogMock.mockResolvedValue(false);

    await onUnlinkLinkedActor(undefined, makeTarget('Actor.spirit1'));

    expect(update).not.toHaveBeenCalled();
  });

  it('warns instead of throwing when the linked actor no longer exists', async () => {
    globalThis.fromUuid = vi.fn().mockResolvedValue(null);

    await onUnlinkLinkedActor(undefined, makeTarget('Actor.deleted1'));

    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(
      'sr4.ui.linkedActorNotFound'
    );
    expect(confirmDialogMock).not.toHaveBeenCalled();
  });

  it('does nothing when the target has no uuid', async () => {
    globalThis.fromUuid = vi.fn();

    await onUnlinkLinkedActor(undefined, makeTarget(undefined));

    expect(globalThis.fromUuid).not.toHaveBeenCalled();
    expect(confirmDialogMock).not.toHaveBeenCalled();
  });
});
