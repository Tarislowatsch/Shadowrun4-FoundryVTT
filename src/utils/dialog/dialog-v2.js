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
 * @param {object} config
 * @returns {Promise<any>}
 */
export async function confirmDialog(config) {
  return foundry.applications.api.DialogV2.confirm({
    rejectClose: false,
    ...config,
  });
}
