import { useEffect, useState } from 'react';

import { RELEASE_NAME } from '../release';
import { getAppVersion, isTauriAvailable } from '../services/app';

type Status =
  | { readonly kind: 'checking' }
  | { readonly kind: 'connected'; readonly version: string }
  | { readonly kind: 'browser' };

/**
 * The version and the release's name, read from the Rust side — which makes it a smoke test
 * too. If it reads "v0.4.0 Novax" the frontend, the transport seam and the Tauri command
 * handler are all wired up correctly; "Browser preview" means there is no shell behind it.
 */
interface ShellStatusProps {
  /** Just the light, with the sentence as its tooltip — for a sidebar folded to its icons. */
  readonly compact?: boolean | undefined;
}

export function ShellStatus({ compact = false }: ShellStatusProps) {
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

  const text =
    status.kind === 'checking'
      ? 'Connecting to shell…'
      : status.kind === 'connected'
        ? `v${status.version} ${RELEASE_NAME}`
        : 'Browser preview — no shell';

  if (compact) {
    return (
      <div className="flex justify-center border-t border-void-700 py-3" title={text}>
        <span
          role="img"
          aria-label={text}
          className={['h-1.5 w-1.5 rounded-full', connected ? 'bg-cursed-500' : 'bg-void-600'].join(' ')}
        />
      </div>
    );
  }

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
        {status.kind === 'connected' ? (
          <>
            <span className="text-ash-400">v{status.version}</span>
            <span className="font-display text-ash-300">{RELEASE_NAME}</span>
          </>
        ) : (
          text
        )}
      </span>
    </div>
  );
}
