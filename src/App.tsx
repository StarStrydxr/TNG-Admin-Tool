import { useState } from 'react';

import { AppShell } from './components/AppShell';
import { AnnouncerProvider } from './hooks/useAnnouncer';
import { ClansProvider } from './hooks/useClans';
import { PrintProvider } from './hooks/usePrint';
import { SettingsProvider } from './hooks/useSettings';
import { MODULES, type ModuleId } from './routes/modules';

/**
 * A single window with a handful of panes. No router: there are no URLs to address, no back
 * button and no deep links, so a router would be a dependency earning nothing.
 */
function Shell() {
  const [activeId, setActiveId] = useState<ModuleId>('vault');

  const active = MODULES.find((module) => module.id === activeId);
  if (!active) throw new Error(`Unknown module: ${activeId}`);

  const { Page } = active;

  return (
    <AppShell activeId={activeId} active={active} onSelect={setActiveId}>
      <Page />
    </AppShell>
  );
}

export function App() {
  return (
    <SettingsProvider>
      <AnnouncerProvider>
        {/* Above PrintProvider: a printed character sheet resolves its clan bonus lines. */}
        <ClansProvider>
          <PrintProvider>
            <Shell />
          </PrintProvider>
        </ClansProvider>
      </AnnouncerProvider>
    </SettingsProvider>
  );
}
