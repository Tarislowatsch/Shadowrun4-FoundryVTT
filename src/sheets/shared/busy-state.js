/**
 * Toggles the disabled/processing state of a button-like element, spinning
 * its `<i>` icon while an async action is in flight.
 * @param {HTMLElement|undefined} target
 * @param {boolean} busy
 */
export function setButtonBusy(target, busy) {
  if (!target) return;
  target.disabled = busy;
  target.classList.toggle('processing', busy);
  const icon = target.querySelector('i');
  if (icon) icon.classList.toggle('fa-spin', busy);
}
