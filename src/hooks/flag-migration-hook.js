import { migrateWorldFlagNamespace } from '@effects/flag-namespace-migration.js';
import { SYSTEM_ID } from '@utils/game/system-id.js';

export const FLAG_MIGRATION_VERSION = 1;

export class FlagMigrationHook {
  constructor() {
    Hooks.once('ready', () => this._run());
  }

  /**
   * @returns {Promise<void>}
   */
  async _run() {
    if (!game.user?.isGM) return;
    const done = game.settings.get(SYSTEM_ID, 'flagMigrationVersion') ?? 0;
    if (done >= FLAG_MIGRATION_VERSION) return;

    let migrated = 0;
    try {
      migrated = await migrateWorldFlagNamespace();
    } catch (error) {
      console.error('SR4 | flag namespace migration failed', error);
      ui.notifications?.error(
        game.i18n.localize('sr4.migration.flagNamespace.failed')
      );
      return;
    }

    await game.settings.set(
      SYSTEM_ID,
      'flagMigrationVersion',
      FLAG_MIGRATION_VERSION
    );
    if (migrated > 0) {
      ui.notifications?.info(
        game.i18n.format('sr4.migration.flagNamespace.done', {
          count: migrated,
        })
      );
    }
  }
}
