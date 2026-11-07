import { SYSTEM_ID } from '@utils/game/system-id.js';

const TEMPLATE_CATEGORIES = Object.freeze(['COMBAT', 'ILLUSION']);

const REGION_VISIBILITY_ALWAYS = 2;

const TEMPLATE_DISPLAY = Object.freeze({
  visibility: REGION_VISIBILITY_ALWAYS,
  highlightMode: 'coverage',
  displayMeasurements: true,
});

/**
 * @typedef {object} AreaRegionInput
 * @property {string} name
 * @property {number} radiusPx
 * @property {string} casterUuid
 * @property {string} spellUuid
 */

/**
 * @param {{ system?: { area?: boolean, category?: string, range?: string } }} spell
 * @returns {boolean}
 */
export function offersAreaTemplate(spell) {
  const system = spell?.system;
  if (!system?.area || system.range === 'SELF') return false;
  return TEMPLATE_CATEGORIES.includes(system.category ?? '');
}

const METERS_PER_UNIT = Object.freeze({
  m: 1,
  meter: 1,
  meters: 1,
  metre: 1,
  metres: 1,
  ft: 0.3048,
  'ft.': 0.3048,
  feet: 0.3048,
  foot: 0.3048,
  fuß: 0.3048,
  km: 1000,
  mi: 1609.344,
});

/**
 * @param {number} meters
 * @param {{ distancePixels: number, units?: string }} scene
 * @returns {number}
 */
export function metersToPixels(meters, { distancePixels, units }) {
  const key = (units ?? '').trim().toLowerCase();
  const metersPerUnit = METERS_PER_UNIT[key] ?? 1;
  return (meters / metersPerUnit) * distancePixels;
}

/**
 * @template {{ center: { x: number, y: number }, document?: { elevation?: number } }} T
 * @param {T[]} tokens
 * @param {(point: { x: number, y: number, elevation: number }) => boolean} contains
 * @returns {T[]}
 */
export function tokensInArea(tokens, contains) {
  return tokens.filter((token) =>
    contains({
      x: token.center.x,
      y: token.center.y,
      elevation: token.document?.elevation ?? 0,
    })
  );
}

/**
 * @param {{ isGM: boolean, canCreate: boolean, paused: boolean }} user
 * @returns {boolean}
 */
export function canCreateRegionDirectly({ isGM, canCreate, paused }) {
  return isGM || (canCreate && !paused);
}

/**
 * @param {AreaRegionInput} input
 * @returns {{ name: string, shapes: object[], visibility: number, highlightMode: string, displayMeasurements: boolean, flags: Record<string, object> }}
 */
export function buildAreaRegionData({ name, radiusPx, casterUuid, spellUuid }) {
  return {
    name,
    shapes: [{ type: 'circle', x: 0, y: 0, radius: radiusPx }],
    ...TEMPLATE_DISPLAY,
    flags: { [SYSTEM_ID]: { spellArea: { casterUuid, spellUuid } } },
  };
}

/**
 * @param {any} data
 * @returns {{ name: string, shapes: object[], visibility: number, highlightMode: string, displayMeasurements: boolean, flags: Record<string, object> } | null}
 */
export function sanitizeSpellAreaData(data) {
  const shape = data?.shapes?.[0];
  const spellArea = data?.flags?.[SYSTEM_ID]?.spellArea;
  if (typeof data?.name !== 'string') return null;
  if (shape?.type !== 'circle') return null;
  if (!Number.isFinite(shape.x) || !Number.isFinite(shape.y)) return null;
  if (!Number.isFinite(shape.radius) || shape.radius <= 0) return null;
  if (typeof spellArea?.casterUuid !== 'string') return null;
  if (typeof spellArea?.spellUuid !== 'string') return null;
  return {
    name: data.name,
    shapes: [{ type: 'circle', x: shape.x, y: shape.y, radius: shape.radius }],
    ...TEMPLATE_DISPLAY,
    flags: {
      [SYSTEM_ID]: {
        spellArea: {
          casterUuid: spellArea.casterUuid,
          spellUuid: spellArea.spellUuid,
        },
      },
    },
  };
}
