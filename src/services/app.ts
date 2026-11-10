import { call, isTauriAvailable } from './transport';

/** Version reported by the Rust side. Doubles as a smoke test that the shell is wired up. */
export function getAppVersion(): Promise<string> {
  return call<string>('app_version');
}

export { isTauriAvailable };
