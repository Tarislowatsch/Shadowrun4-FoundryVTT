/**
 * Wires focus-select behaviour on every number/text input under root, so
 * clicking into a field selects its full value instead of placing the caret.
 * @param {HTMLElement} root
 * @param {{ signal?: AbortSignal }} [options]
 */
export function wireFocusSelectListeners(root, { signal } = {}) {
  root
    .querySelectorAll('input[type="number"], input[type="text"]')
    .forEach((input) => {
      input.addEventListener('focus', () => input.select(), { signal });
    });
}

/**
 * Wires the standard `[data-edit="img"]` click handler that opens a
 * FilePicker and writes the chosen path back to `document.img`.
 * @param {HTMLElement} root
 * @param {{ img: string, update: (data: object) => Promise<unknown> }} doc
 * @param {{ signal?: AbortSignal }} [options]
 */
export function wireImageEditListener(root, doc, { signal } = {}) {
  root.querySelector('[data-edit="img"]')?.addEventListener(
    'click',
    () => {
      new foundry.applications.apps.FilePicker.implementation({
        type: 'image',
        current: doc.img,
        callback: (path) => doc.update({ img: path }),
      }).browse();
    },
    { signal }
  );
}
