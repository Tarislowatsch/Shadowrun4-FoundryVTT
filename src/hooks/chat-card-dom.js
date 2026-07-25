/**
 * @typedef {object} ButtonConfig
 * @property {string} className
 * @property {string} label
 * @property {(event: MouseEvent) => void | Promise<void>} onClick
 * @property {boolean} [once]
 */

/**
 * @param {HTMLElement} container
 * @param {ButtonConfig} config
 * @returns {HTMLButtonElement}
 */
export function appendButton(
  container,
  { className, label, onClick, once = true }
) {
  const btn = document.createElement('button');
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener('click', onClick, once ? { once: true } : undefined);
  container.appendChild(btn);
  return btn;
}
