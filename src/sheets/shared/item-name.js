/**
 * @param {string} value
 * @returns {{ name: string, 'system.hasCustomName': true } | null}
 */
export function buildCustomNamePayload(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return null;
  return { name: trimmed, 'system.hasCustomName': true };
}

/**
 * @param {{ name: string, system?: { nameEn?: string } }} item
 * @returns {{ payload: { name: string, 'system.hasCustomName': false }, restoredCanonicalName: boolean }}
 */
export function buildResetNamePayload(item) {
  const nameEn = item.system?.nameEn;
  return {
    payload: { name: nameEn || item.name, 'system.hasCustomName': false },
    restoredCanonicalName: Boolean(nameEn),
  };
}

export function editItemName(target) {
  const row = target.closest('.item-sheet-name-row');
  const input = row?.querySelector('.item-sheet-name-input');
  if (!row || !input) return;
  input.dataset.originalValue = input.value;
  setNameEditMode(row, true);
  input.focus();
  input.select();
}

export async function confirmItemName(target, item) {
  const row = target.closest('.item-sheet-name-row');
  const input = row?.querySelector('.item-sheet-name-input');
  if (!row || !input) return;
  const payload = buildCustomNamePayload(input.value);
  if (!payload) {
    ui.notifications.warn(game.i18n.localize('sr4.item.nameOverrideEmpty'));
    return;
  }
  try {
    await item.update(payload);
  } catch (err) {
    console.error(err);
    ui.notifications.error(
      game.i18n.localize('sr4.item.nameOverrideSaveFailed')
    );
  }
}

export function cancelItemName(target) {
  const row = target.closest('.item-sheet-name-row');
  const input = row?.querySelector('.item-sheet-name-input');
  if (!row || !input) return;
  input.value = input.dataset.originalValue ?? input.value;
  setNameEditMode(row, false);
}

export async function resetItemName(item) {
  const { payload, restoredCanonicalName } = buildResetNamePayload(item);
  try {
    await item.update(payload);
  } catch (err) {
    console.error(err);
    ui.notifications.error(
      game.i18n.localize('sr4.item.nameOverrideSaveFailed')
    );
    return;
  }
  if (!restoredCanonicalName) {
    ui.notifications.warn(
      game.i18n.localize('sr4.item.nameOverrideResetIncomplete')
    );
  }
}

/**
 * @param {HTMLElement} row
 * @param {boolean} editing
 */
function setNameEditMode(row, editing) {
  row
    .querySelector('.item-sheet-name-value')
    ?.classList.toggle('hidden', editing);
  row
    .querySelector('.item-sheet-name-edit')
    ?.classList.toggle('hidden', editing);
  row
    .querySelector('.item-sheet-name-input')
    ?.classList.toggle('hidden', !editing);
  row
    .querySelector('.item-sheet-name-confirm')
    ?.classList.toggle('hidden', !editing);
  row
    .querySelector('.item-sheet-name-cancel')
    ?.classList.toggle('hidden', !editing);
}
