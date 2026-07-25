/**
 * @param {string} type
 * @param {{ biocompatibility?: string, sensitiveSystem?: boolean }} [options]
 * @returns {number}
 */
export function implantEssenceMultiplier(type, options = {}) {
  const biocompatibility = options.biocompatibility ?? '';
  const sensitiveSystem = options.sensitiveSystem === true;
  let mult = 1;
  if (biocompatibility && type === biocompatibility) mult *= 0.9;
  if (sensitiveSystem && type === 'CYBERWARE') mult *= 2;
  return mult;
}

/**
 * @param {object[]} implants
 * @param {{ biocompatibility?: string, sensitiveSystem?: boolean }} [options]
 * @returns {{ cyber: number, bio: number }}
 */
export function computeImplantEssenceLoss(implants, options = {}) {
  const result = { cyber: 0, bio: 0 };
  for (const i of implants) {
    const type = i.system.type;
    const ess =
      (i.system.essenceActual ?? 0) * implantEssenceMultiplier(type, options);
    if (type === 'BIOWARE') result.bio += ess;
    else result.cyber += ess;
  }
  return result;
}
