import { DataModelRegistrationHook } from './datamodel-registration-hook';
import { DefenseHook } from './defense-request-hook';
import { DieChatHook } from './die-chat-hook';
import { InitiativeHook } from './initiative-hook';
import { SettingsHook } from './settings-hook';

export function registerHooks() {
  new SettingsHook();
  new DefenseHook();
  new DataModelRegistrationHook();
  new InitiativeHook();
  new DieChatHook();
}
