import { describe, it, expect } from 'vitest';
import {
  LEGACY_FLAG_SCOPE,
  planFlagNamespaceMigration,
} from '../../src/effects/flag-namespace.js';
import { SYSTEM_ID } from '../../src/utils/game/system-id.js';

const DELETE_LEGACY = `-=${LEGACY_FLAG_SCOPE}`;

describe('planFlagNamespaceMigration', () => {
  it('rewrites the scope and marks the legacy subtree for deletion', () => {
    const effects = [
      { id: 'e1', flags: { [LEGACY_FLAG_SCOPE]: { showOnToken: true } } },
    ];

    expect(planFlagNamespaceMigration(effects)).toEqual([
      {
        _id: 'e1',
        flags: {
          [SYSTEM_ID]: { showOnToken: true },
          [DELETE_LEGACY]: null,
        },
      },
    ]);
  });

  it('keeps the newer value when both scopes carry the same flag', () => {
    const effects = [
      {
        id: 'e1',
        flags: {
          [LEGACY_FLAG_SCOPE]: { showOnToken: true, isEffectTemplate: true },
          [SYSTEM_ID]: { showOnToken: false },
        },
      },
    ];

    expect(planFlagNamespaceMigration(effects)[0].flags[SYSTEM_ID]).toEqual({
      showOnToken: false,
      isEffectTemplate: true,
    });
  });

  it('drops an empty legacy subtree instead of leaving it behind', () => {
    const effects = [{ id: 'e1', flags: { [LEGACY_FLAG_SCOPE]: {} } }];

    expect(planFlagNamespaceMigration(effects)).toEqual([
      { _id: 'e1', flags: { [SYSTEM_ID]: {}, [DELETE_LEGACY]: null } },
    ]);
  });

  it.each([
    ['no flags at all', { id: 'e1' }],
    ['an empty flags object', { id: 'e1', flags: {} }],
    [
      'only foreign scopes',
      { id: 'e1', flags: { core: { statusId: 'dead' } } },
    ],
    [
      'an already migrated effect',
      { id: 'e1', flags: { [SYSTEM_ID]: { showOnToken: true } } },
    ],
  ])('writes nothing for %s', (_label, effect) => {
    expect(planFlagNamespaceMigration([effect])).toEqual([]);
  });

  it('is idempotent, so an aborted run can safely be repeated', () => {
    const effects = [
      { id: 'e1', flags: { [LEGACY_FLAG_SCOPE]: { showOnToken: true } } },
    ];

    const [update] = planFlagNamespaceMigration(effects);
    const migrated = [
      { id: 'e1', flags: { [SYSTEM_ID]: update.flags[SYSTEM_ID] } },
    ];

    expect(planFlagNamespaceMigration(migrated)).toEqual([]);
  });

  it('plans only the effects that still carry legacy flags', () => {
    const effects = [
      { id: 'legacy', flags: { [LEGACY_FLAG_SCOPE]: { showOnToken: true } } },
      { id: 'clean', flags: { [SYSTEM_ID]: { showOnToken: true } } },
      { id: 'bare' },
    ];

    expect(planFlagNamespaceMigration(effects).map((u) => u._id)).toEqual([
      'legacy',
    ]);
  });
});
