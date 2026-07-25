// @ts-nocheck

/**
 * Patches the `.dice-total` text of a roll's chat message once it renders,
 * so it shows the SR4 success count instead of Foundry's raw dice total.
 *
 * This is a transient, self-removing hook registered per-roll rather than a
 * persistent listener wired up in hooks/index.js's registerHooks() -- the
 * chat message doesn't exist yet when the hook must be attached (to avoid a
 * race with the render), so the caller resolves the target message id once
 * it's known.
 *
 * @param {number} successes
 * @returns {{ resolve(messageId: string): void, cancel(): void }}
 */
export function watchDiceTotalPatch(successes) {
  let targetId = /** @type {string | null} */ (null);
  const hookId = Hooks.once('renderChatMessageHTML', (chatMessage, html) => {
    if (chatMessage.id !== targetId) return;
    html.querySelector('.dice-total').textContent = String(successes);
  });

  return {
    resolve(messageId) {
      targetId = messageId;
    },
    cancel() {
      Hooks.off('renderChatMessageHTML', hookId);
    },
  };
}
