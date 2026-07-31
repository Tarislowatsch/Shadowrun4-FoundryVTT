import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  promptDialog,
  waitDialog,
  confirmDialog,
} from '../src/utils/dialog/dialog-v2.js';

const promptMock = vi.fn();
const waitMock = vi.fn();
const confirmMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.foundry.applications = {
    api: {
      DialogV2: {
        prompt: (...args) => promptMock(...args),
        wait: (...args) => waitMock(...args),
        confirm: (...args) => confirmMock(...args),
      },
    },
  };
});

describe.each([
  ['promptDialog', () => promptDialog, () => promptMock],
  ['waitDialog', () => waitDialog, () => waitMock],
  ['confirmDialog', () => confirmDialog, () => confirmMock],
])('%s', (_name, getFn, getMock) => {
  it('resolves a dismissed dialog to null instead of rejecting', async () => {
    await getFn()({ content: 'x' });

    expect(getMock()).toHaveBeenCalledWith(
      expect.objectContaining({ rejectClose: false, content: 'x' })
    );
  });

  it('lets a caller opt back into rejecting', async () => {
    await getFn()({ content: 'x', rejectClose: true });

    expect(getMock()).toHaveBeenCalledWith(
      expect.objectContaining({ rejectClose: true })
    );
  });
});
