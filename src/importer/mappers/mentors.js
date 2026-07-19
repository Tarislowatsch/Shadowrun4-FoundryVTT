import { parseNumber, sourceOf } from './helpers.js';
import { SKILL_KEYS } from '@effects/SR4EffectTargets.js';
import {
  MENTOR_CATEGORIES,
  isParagonCategory,
} from '@models/items/mentor.model.js';

/** @type {Readonly<Record<string, string>>} */
const CATEGORY_ALIASES = Object.freeze({ dissonance: 'Disonance' });

/**
 * @param {unknown} raw
 * @returns {string}
 */
function normalizeMentorCategory(raw) {
  const lower = String(raw ?? '')
    .trim()
    .toLowerCase();
  return (
    MENTOR_CATEGORIES.find((c) => c.toLowerCase() === lower) ??
    CATEGORY_ALIASES[lower] ??
    'Other'
  );
}

/**
 * @param {Element} element
 * @returns {Record<string, string>}
 */
function attrsOf(element) {
  /** @type {Record<string, string>} */
  const attrs = {};
  for (const attr of Array.from(element.attributes ?? [])) {
    attrs[attr.name] = attr.value;
  }
  return attrs;
}

/**
 * @param {Element} element
 * @param {string} tag
 * @returns {string | undefined}
 */
function childText(element, tag) {
  const child = [...(element.children ?? [])].find(
    (c) => c.tagName.toLowerCase() === tag
  );
  return child ? (child.textContent?.trim() ?? '') : undefined;
}

/**
 * @typedef {{ kind: 'spellcategory', name: string, val: number }
 *   | { kind: 'specificskill', name: string, bonus: number }
 *   | { kind: 'damageresistance', value: number }
 *   | { kind: 'selectskill', skillcategory: string }
 *   | { kind: 'selecttext' }
 *   | { kind: 'unknown', tag: string, text: string, attrs: Record<string, string> }} MentorBonusEntry
 */

/**
 * Walks the children of a `<bonus>` element (mentors/paragons XML), producing
 * normalised bonus entries. Only reads `tagName`, `children`, `textContent`
 * and `attributes` so it also works against the fake DOM nodes used in tests.
 *
 * @param {Element | undefined | null} bonusElement
 * @returns {MentorBonusEntry[]}
 */
export function parseMentorBonusEntries(bonusElement) {
  /** @type {MentorBonusEntry[]} */
  const entries = [];
  if (!bonusElement) return entries;

  for (const child of bonusElement.children ?? []) {
    const tag = child.tagName.toLowerCase();
    const attrs = attrsOf(child);

    switch (tag) {
      case 'spellcategory': {
        const name = childText(child, 'name') ?? attrs.name ?? '';
        const valText =
          childText(child, 'val') ??
          attrs.val ??
          child.textContent?.trim() ??
          '0';
        entries.push({
          kind: 'spellcategory',
          name: name.trim(),
          val: parseNumber(valText, 0),
        });
        break;
      }
      case 'specificskill': {
        const name = childText(child, 'name') ?? attrs.name ?? '';
        const bonusText =
          childText(child, 'bonus') ??
          attrs.bonus ??
          child.textContent?.trim() ??
          '0';
        entries.push({
          kind: 'specificskill',
          name: name.trim(),
          bonus: parseNumber(bonusText, 0),
        });
        break;
      }
      case 'damageresistance': {
        const valueText = child.textContent?.trim() || attrs.val || '0';
        entries.push({
          kind: 'damageresistance',
          value: parseNumber(valueText, 0),
        });
        break;
      }
      case 'selectskill': {
        entries.push({
          kind: 'selectskill',
          skillcategory: attrs.skillcategory ?? '',
        });
        break;
      }
      case 'selecttext': {
        entries.push({ kind: 'selecttext' });
        break;
      }
      default: {
        entries.push({
          kind: 'unknown',
          tag,
          text: child.textContent?.trim() ?? '',
          attrs,
        });
      }
    }
  }
  return entries;
}

/**
 * @param {string} name
 * @returns {string}
 */
function normalizeSkillKey(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]/g, '');
}

/**
 * @param {MentorBonusEntry[]} entries
 * @returns {{ changes: Array<{ key: string, type: string, value: string }>, textOnly: boolean }}
 */
export function bonusEntriesToChanges(entries) {
  /** @type {Array<{ key: string, type: string, value: string }>} */
  const changes = [];
  let textOnly = false;

  for (const entry of entries) {
    switch (entry.kind) {
      case 'specificskill': {
        const key = normalizeSkillKey(entry.name);
        if (SKILL_KEYS.includes(key)) {
          changes.push({
            key: `system.modifiers.skillBonuses.${key}`,
            type: 'add',
            value: String(entry.bonus),
          });
        } else {
          textOnly = true;
        }
        break;
      }
      case 'spellcategory': {
        const key = entry.name.trim().toUpperCase();
        if (key) {
          changes.push({
            key: `system.modifiers.spellCategoryBonuses.${key}`,
            type: 'add',
            value: String(entry.val),
          });
        } else {
          textOnly = true;
        }
        break;
      }
      case 'damageresistance': {
        changes.push({
          key: 'system.modifiers.soakBonus',
          type: 'add',
          value: String(entry.value),
        });
        break;
      }
      case 'selectskill':
      case 'selecttext':
      case 'unknown':
      default: {
        textOnly = true;
      }
    }
  }

  return { changes, textOnly };
}

/**
 * Detaches `<bonus>`/`<choices>` from a mentor/paragon element (the data-XML
 * and character-XML shapes share this schema) and returns their parsed form,
 * so a subsequent `elementToRecord` call doesn't flatten them away.
 *
 * @param {Element} mentorElement
 * @returns {{ bonus: MentorBonusEntry[], choices: MentorChoiceRecord[] }}
 */
export function detachMentorBonusAndChoices(mentorElement) {
  const bonusEl = mentorElement.querySelector(':scope > bonus');
  const choicesEl = mentorElement.querySelector(':scope > choices');

  const bonus = parseMentorBonusEntries(bonusEl);
  const choices = choicesEl
    ? [...choicesEl.querySelectorAll(':scope > choice')].map((choiceEl) => ({
        set: choiceEl.getAttribute('set') || '1',
        name:
          choiceEl.querySelector(':scope > name')?.textContent?.trim() ?? '',
        bonus: parseMentorBonusEntries(
          choiceEl.querySelector(':scope > bonus')
        ),
      }))
    : [];

  bonusEl?.remove();
  choicesEl?.remove();

  return { bonus, choices };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
export function isParagonRecord(record) {
  return isParagonCategory(normalizeMentorCategory(record.category));
}

/**
 * @typedef {object} MentorChoiceRecord
 * @property {string | number} set
 * @property {string} name
 * @property {MentorBonusEntry[]} bonus
 */

/**
 * @param {Record<string, unknown>} record - Includes `_bonus` and `_choices`, attached by `extractMentorRecords`.
 * @returns {{ name: string, type: string, system: object, effects: object[] }}
 */
export function mapMentor(record) {
  const name = String(record.name ?? '').trim() || 'Unnamed Mentor Spirit';
  const category = normalizeMentorCategory(record.category);
  const bonusEntries = /** @type {MentorBonusEntry[]} */ (record._bonus ?? []);
  const choiceEntries = /** @type {MentorChoiceRecord[]} */ (
    record._choices ?? []
  );

  /** @type {object[]} */
  const effects = [];

  const { changes: baseChanges } = bonusEntriesToChanges(bonusEntries);
  if (baseChanges.length > 0) {
    effects.push({
      name,
      img: 'icons/svg/aura.svg',
      changes: baseChanges,
      disabled: false,
      transfer: true,
    });
  }

  const choices = choiceEntries.map((choice) => {
    const { changes: choiceChanges } = bonusEntriesToChanges(
      choice.bonus ?? []
    );
    const hasBonus = choiceChanges.length > 0;
    if (hasBonus) {
      effects.push({
        name: choice.name || name,
        img: 'icons/svg/aura.svg',
        changes: choiceChanges,
        disabled: true,
        transfer: true,
        flags: {
          sr4: {
            mentorChoice: {
              set: String(choice.set ?? '1'),
              name: choice.name ?? '',
            },
          },
        },
      });
    }
    return {
      set: parseNumber(choice.set, 1),
      name: choice.name ?? '',
      description: '',
      hasBonus,
    };
  });

  return {
    name,
    type: 'Mentor',
    system: {
      category,
      advantage: String(record.advantage ?? '').trim(),
      disadvantage: String(record.disadvantage ?? '').trim(),
      choices,
      selectedChoices: {},
      source: sourceOf(record),
    },
    effects,
  };
}
