/**
 * The seam.
 *
 * This is the ONLY module that talks to Tauri. Components call services, services call
 * `call()`, and `call()` reaches the Rust side. Nothing else may import `@tauri-apps/api`
 * — see CLAUDE.md §3.
 *
 * Keeping it behind one function means the host can be swapped (a test double, or a
 * different shell entirely) without touching anything above it.
 */

import { invoke } from '@tauri-apps/api/core';

export interface Transport {
  call<T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

/** True when running inside the Tauri shell rather than a bare browser tab. */
export function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const tauriTransport: Transport = {
  call: <T,>(command: string, args?: Record<string, unknown>): Promise<T> =>
    invoke<T>(command, args),
};

/**
 * `npm run dev` without Tauri serves the UI in a plain browser, where no Rust side
 * exists. Fail with something readable instead of an opaque TypeError.
 */
const unavailableTransport: Transport = {
  call: <T,>(command: string): Promise<T> =>
    Promise.reject(
      new Error(
        `Cannot call "${command}": the app is not running inside Tauri. ` +
          'Start it with `npm run tauri dev` rather than `npm run dev`.',
      ),
    ),
};

let active: Transport = isTauriAvailable() ? tauriTransport : unavailableTransport;

/** Swap the transport. Intended for tests. */
export function setTransport(transport: Transport): void {
  active = transport;
}

export function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return active.call<T>(command, args);
}
