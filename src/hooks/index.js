import { DataModelRegistrationHook } from './datamodel-registration-hook';
import { DefenseHook } from './defense-request-hook';
import { CombatSpellHook } from './combat-spell-hook';
import { CybercombatHook } from './cybercombat-hook';
import { DieChatHook } from './die-chat-hook';
import { InitiativeHook } from './initiative-hook';
import { SettingsHook } from './settings-hook';
import { ActorDirectoryHook } from './actor-directory-hook';
import { CompendiumDirectoryHook } from './compendium-directory-hook';
import { SummoningHook } from './summoning-hook';
import { LinkedActorCleanupHook } from './linked-actor-cleanup-hook';

export function registerHooks() {
  new SettingsHook();
  new DefenseHook();
  new CombatSpellHook();
  new CybercombatHook();
  new SummoningHook();
  new DataModelRegistrationHook();
  new InitiativeHook();
  new DieChatHook();
  new ActorDirectoryHook();
  new CompendiumDirectoryHook();
  new LinkedActorCleanupHook();
}
