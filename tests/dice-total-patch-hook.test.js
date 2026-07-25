import { describe, it, expect, vi, beforeEach } from 'vitest';
import { watchDiceTotalPatch } from '../src/hooks/dice-total-patch-hook.js';

let registeredHooks;

beforeEach(() => {
  registeredHooks = new Map();
  let nextId = 1;
  globalThis.Hooks = {
    once: vi.fn((event, fn) => {
      const id = nextId++;
      registeredHooks.set(id, { event, fn });
      return id;
    }),
    off: vi.fn((event, id) => {
      registeredHooks.delete(id);
    }),
  };
});

function fireRenderChatMessageHTML(chatMessage, html) {
  for (const { event, fn } of registeredHooks.values()) {
    if (event === 'renderChatMessageHTML') fn(chatMessage, html);
  }
}

function makeHtml() {
  const diceTotal = { textContent: '' };
  return { querySelector: () => diceTotal, diceTotal };
}

describe('watchDiceTotalPatch', () => {
  it('patches the dice-total element once the target message renders', () => {
    const patch = watchDiceTotalPatch(4);
    patch.resolve('message-1');

    const html = makeHtml();
    fireRenderChatMessageHTML({ id: 'message-1' }, html);

    expect(html.diceTotal.textContent).toBe('4');
  });

  it('ignores renders for other chat messages', () => {
    const patch = watchDiceTotalPatch(4);
    patch.resolve('message-1');

    const html = makeHtml();
    fireRenderChatMessageHTML({ id: 'message-2' }, html);

    expect(html.diceTotal.textContent).toBe('');
  });

  it('cancel() removes the hook so it never fires', () => {
    const patch = watchDiceTotalPatch(4);
    patch.cancel();
    patch.resolve('message-1');

    const html = makeHtml();
    fireRenderChatMessageHTML({ id: 'message-1' }, html);

    expect(html.diceTotal.textContent).toBe('');
    expect(registeredHooks.size).toBe(0);
  });
});
