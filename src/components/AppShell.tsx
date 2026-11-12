import { useInterfaceStyle } from '../hooks/useSettings';
import { ClassicShell } from './shell/ClassicShell';
import { JujutsuShell } from './shell/JujutsuShell';
import type { ShellProps } from './shell/props';

/**
 * The frame round every page — one of two, chosen in Settings.
 *
 * Both take the same props and both draw the same pages from `routes/modules.ts`, so a page
 * cannot tell which it is in and a page added there turns up in both. What differs is only
 * the furniture: see `shell/JujutsuShell.tsx` and `shell/ClassicShell.tsx`.
 */
export function AppShell(props: ShellProps) {
  const style = useInterfaceStyle();
  return style === 'classic' ? <ClassicShell {...props} /> : <JujutsuShell {...props} />;
}
