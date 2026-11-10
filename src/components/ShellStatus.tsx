import { useEffect, useState } from 'react';

import { getAppVersion, isTauriAvailable } from '../services/app';

type Status =
  | { readonly kind: 'checking' }
  | { readonly kind: 'connected'; readonly version: string }
  | { readonly kind: 'browser' };

/**
 * Smoke test for the Rust side. If this reads "shell v0.1.0" the frontend, the transport
 * seam and the Tauri command handler are all wired up correctly.
 */
export function ShellStatus() {
  const [status, setStatus] = useState<Status>({ kind: 'checking' });

  useEffect(() => {
    if (!isTauriAvailable()) {
      setStatus({ kind: 'browser' });
      return;
    }

    let cancelled = false;
    getAppVersion()
      .then((version) => {
        if (!cancelled) setStatus({ kind: 'connected', version });
      })
      .catch(() => {
        if (!cancelled) setStatus({ kind: 'browser' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const connected = status.kind === 'connected';

  return (
    <div className="border-t border-void-700 px-5 py-3 text-xs text-ash-500">
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={[
            'h-1.5 w-1.5 rounded-full',
            connected ? 'bg-cursed-500' : 'bg-void-600',
          ].join(' ')}
        />
        {status.kind === 'checking' && 'Connecting to shell…'}
        {status.kind === 'connected' && `shell v${status.version}`}
        {status.kind === 'browser' && 'Browser preview — no shell'}
      </span>
    </div>
  );
}
