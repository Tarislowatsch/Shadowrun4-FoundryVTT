import { describe, it, expect, afterEach } from 'vitest';
import {
  LEGACY_FLAG_SCOPE,
  mergeLegacyFlags,
} from '../../src/effects/flag-namespace.js';
import { SR4ActiveEffect } from '../../src/effects/SR4ActiveEffect.js';
import { planPowerEffectStates } from '../../src/effects/power-suppression.js';
import { planMentorChoiceEffectStates } from '../../src/effects/mentor-choices.js';
import {
  getWorldEffectTemplates,
  invalidateWorldEffectTemplateCache,
} from '../../src/effects/world-effect-templates.js';
import { SYSTEM_ID } from '../../src/utils/game/system-id.js';
import { withFlagApi } from '../helpers/foundry-document.js';

/**
 * @param {object} source
 * @returns {object}
 */
function loadEffect(source) {
  SR4ActiveEffect.migrateData(source);
  return withFlagApi({ ...source });
}

describe('mergeLegacyFlags', () => {
  it('carries legacy-only flags into the system scope', () => {
    const flags = { [LEGACY_FLAG_SCOPE]: { showOnToken: true } };

    expect(mergeLegacyFlags(flags)).toEqual({ showOnToken: true });
  });

  it('lets the system scope win over the legacy scope', () => {
    const flags = {
      [LEGACY_FLAG_SCOPE]: { showOnToken: true, isEffectTemplate: true },
      [SYSTEM_ID]: { showOnToken: false },
    };

    expect(mergeLegacyFlags(flags)).toEqual({
      showOnToken: false,
      isEffectTemplate: true,
    });
  });

  it('is idempotent, so a second pass cannot resurrect a legacy value', () => {
    const flags = {
      [LEGACY_FLAG_SCOPE]: { showOnToken: true },
      [SYSTEM_ID]: { showOnToken: false },
    };

    const once = mergeLegacyFlags(flags);
    const twice = mergeLegacyFlags({ ...flags, [SYSTEM_ID]: once });

    expect(twice).toEqual(once);
  });

  it.each([[undefined], [{}], [{ core: { statusId: 'dead' } }]])(
    'yields an empty object for %j',
    (flags) => {
      expect(mergeLegacyFlags(flags)).toEqual({});
    }
  );

  it('ignores scopes it does not own', () => {
    const flags = {
      [LEGACY_FLAG_SCOPE]: { showOnToken: true },
      core: { statusId: 'dead' },
    };

    expect(mergeLegacyFlags(flags)).toEqual({ showOnToken: true });
  });
});

describe('SR4ActiveEffect.migrateData', () => {
  it('moves legacy flags to the system scope', () => {
    const source = {
      name: 'Sustaining',
      flags: { [LEGACY_FLAG_SCOPE]: { showOnToken: true } },
    };

    const migrated = SR4ActiveEffect.migrateData(source);

    expect(migrated.flags[SYSTEM_ID]).toEqual({ showOnToken: true });
  });

  it('leaves the legacy scope in the source for the world migration to delete', () => {
    const source = { flags: { [LEGACY_FLAG_SCOPE]: { showOnToken: true } } };

    SR4ActiveEffect.migrateData(source);

    expect(source.flags[LEGACY_FLAG_SCOPE]).toEqual({ showOnToken: true });
  });

  it('does not invent a system scope when there is nothing to migrate', () => {
    const source = { name: 'Sustaining', flags: { core: {} } };

    const migrated = SR4ActiveEffect.migrateData(source);

    expect(migrated.flags).not.toHaveProperty(SYSTEM_ID);
  });

  it.each([[{}], [{ flags: {} }], [{ flags: undefined }]])(
    'passes %j through untouched',
    (source) => {
      expect(() => SR4ActiveEffect.migrateData(source)).not.toThrow();
    }
  );
});

describe('effects stored under the legacy scope', () => {
  afterEach(() => {
    delete game.items;
    invalidateWorldEffectTemplateCache();
  });

  it('are still offered as world templates', () => {
    const effect = loadEffect({
      id: 'e1',
      flags: { [LEGACY_FLAG_SCOPE]: { isEffectTemplate: true } },
    });
    game.items = { contents: [{ effects: { contents: [effect] } }] };

    expect(getWorldEffectTemplates()).toHaveLength(1);
  });

  it('are still re-enabled when their power stops being suppressed', () => {
    const effect = loadEffect({
      id: 'e1',
      disabled: true,
      flags: { [LEGACY_FLAG_SCOPE]: { suppressedByPower: true } },
    });

    expect(planPowerEffectStates([effect], false)).toEqual([
      {
        _id: 'e1',
        disabled: false,
        flags: { [SYSTEM_ID]: { suppressedByPower: false } },
      },
    ]);
  });

  it('are still matched against the selected mentor choice', () => {
    const effect = loadEffect({
      id: 'e1',
      disabled: true,
      flags: {
        [LEGACY_FLAG_SCOPE]: {
          mentorChoice: { set: '1', name: 'Combat spells' },
        },
      },
    });

    expect(
      planMentorChoiceEffectStates([effect], { 1: 'Combat spells' })
    ).toEqual([{ _id: 'e1', disabled: false }]);
  });
});
