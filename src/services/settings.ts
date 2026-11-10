/**
 * Settings persistence.
 *
 * Reads and writes `config.json` through the Rust side. A missing or unreadable config is not
 * an error — the app falls back to defaults and carries on, so a bad file can never lock the
 * user out of the settings pane that would let them fix it.
 */

import { parseSettings } from '../domain/settings-parse';
import { defaultSettings, type Settings } from '../domain/settings';
import { call, isTauriAvailable } from './transport';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await call<unknown>('config_load');
    return parseSettings(raw);
  } catch {
    return defaultSettings();
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  // In a browser preview there is no shell to save to. Changes still apply for the session;
  // nagging about a write that was never possible would just be noise.
  if (!isTauriAvailable()) return;
  await call<void>('config_save', { data: settings });
}
