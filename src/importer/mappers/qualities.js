import { SR4Attributes } from '@models/attribute.enum.js';
import { ATTRIBUTE_ABBR_TO_KEY } from './constants.js';
import {
  englishOr,
  mappedName,
  parseNumber,
  sourceOf,
  upper,
} from './helpers.js';

const EXCEPTIONAL_ATTRIBUTE_NAME =
  /^(?:Exceptional Attribute|Außergewöhnliches Attribut)\s*\((.+)\)\s*$/i;

/**
 * @param {Record<string, string | string[]>} record
 * @returns {string | null}
 */
function exceptionalAttributeKey(record) {
  const match =
    EXCEPTIONAL_ATTRIBUTE_NAME.exec(String(record.name ?? '').trim()) ??
    EXCEPTIONAL_ATTRIBUTE_NAME.exec(englishOr(record, 'name'));
  if (!match) return null;
  const token = upper(match[1]);
  return (
    ATTRIBUTE_ABBR_TO_KEY[token] ?? (token in SR4Attributes ? token : null)
  );
}

/**
 * @param {Record<string, string | string[]>} record
 * @returns {{ name: string, type: string, system: object, effects?: object[] }}
 */
export function mapQuality(record) {
  const category =
    englishOr(record, 'qualitytype') || englishOr(record, 'category');
  const name = mappedName(record, 'Unnamed Quality');
  const attribute = exceptionalAttributeKey(record);
  const effects = attribute
    ? [
        {
          name,
          img: 'icons/svg/upgrade.svg',
          changes: [
            {
              key: `system.modifiers.attributeMaximum.${attribute}`,
              type: 'add',
              value: '1',
            },
          ],
          disabled: false,
          transfer: true,
        },
      ]
    : [];
  return {
    name,
    type: 'Quality',
    system: {
      category: category === 'Negative' ? 'Negative' : 'Positive',
      bp: parseNumber(record.bp, 0),
      limit: null,
      source: sourceOf(record),
    },
    ...(effects.length ? { effects } : {}),
  };
}
