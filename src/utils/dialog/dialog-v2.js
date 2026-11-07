/**
 * @param {object} config
 * @returns {Promise<any>}
 */
export async function promptDialog(config) {
  return foundry.applications.api.DialogV2.prompt({
    rejectClose: false,
    ...config,
  });
}

/**
 * @param {object} config
 * @returns {Promise<any>}
 */
export async function waitDialog(config) {
  return foundry.applications.api.DialogV2.wait({
    rejectClose: false,
    ...config,
  });
}

/**
 * @param {{ title: string, okLabel: string, options: { value: string, label: string }[] }} config
 * @returns {Promise<string | null>}
 */
export async function promptSelectDialog({ title, okLabel, options }) {
  const escape = foundry.utils.escapeHTML;
  const optionHtml = options
    .map(
      ({ value, label }) =>
        `<option value="${escape(value)}">${escape(label)}</option>`
    )
    .join('');
  const result = await promptDialog({
    window: { title },
    content: `<fieldset><select name="selection" style="width:100%">${optionHtml}</select></fieldset>`,
    ok: {
      label: okLabel,
      callback: (_event, button) => button.form.elements.selection.value,
    },
  });
  return result || null;
}

/**
 * @param {object} config
 * @returns {Promise<any>}
 */
export async function confirmDialog(config) {
  return foundry.applications.api.DialogV2.confirm({
    rejectClose: false,
    ...config,
  });
}
