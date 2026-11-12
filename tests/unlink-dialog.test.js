import { describe, it, expect, vi, beforeEach } from 'vitest';

const confirmDialogMock = vi.fn();

vi.mock('@utils/dialog', () => ({
  confirmDialog: (...args) => confirmDialogMock(...args),
}));

const { confirmAndUnlink } = await import(
  '@domains/summoned-entity/dialogs/unlink.js'
);

beforeEach(() => {
  confirmDialogMock.mockReset();
  globalThis.game.i18n = { localize: (key) => key, format: (key) => key };
  globalThis.foundry = {
    ...globalThis.foundry,
    utils: { ...globalThis.foundry?.utils, escapeHTML: (s) => s },
  };
});

describe('confirmAndUnlink', () => {
  it('unlinks after confirmation and reports it', async () => {
    const actor = { type: 'spirit', name: 'Fire Spirit', update: vi.fn() };
    confirmDialogMock.mockResolvedValue(true);

    await expect(confirmAndUnlink(actor)).resolves.toBe(true);
    expect(actor.update).toHaveBeenCalledOnce();
  });

  it('keeps the link when the confirmation is declined', async () => {
    const actor = { type: 'spirit', name: 'Fire Spirit', update: vi.fn() };
    confirmDialogMock.mockResolvedValue(false);

    await expect(confirmAndUnlink(actor)).resolves.toBe(false);
    expect(actor.update).not.toHaveBeenCalled();
  });
});
