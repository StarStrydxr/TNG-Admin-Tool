import type { ReactNode } from 'react';

import {
  FOOTER_MODULES,
  MAIN_MODULES,
  type ModuleDefinition,
  type ModuleId,
} from '../routes/modules';
import { ShellStatus } from './ShellStatus';

interface NavButtonProps {
  readonly module: ModuleDefinition;
  readonly active: boolean;
  readonly onSelect: (id: ModuleId) => void;
}

function NavButton({ module, active, onSelect }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(module.id)}
      aria-current={active ? 'page' : undefined}
      className={[
        'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
        active ? 'bg-void-700 text-ash-100' : 'text-ash-400 hover:bg-void-800 hover:text-ash-300',
      ].join(' ')}
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={[
            'h-3.5 w-0.5 rounded-full',
            active ? 'bg-cursed-500' : 'bg-transparent',
          ].join(' ')}
        />
        {module.label}
      </span>
    </button>
  );
}

interface AppShellProps {
  readonly activeId: ModuleId;
  readonly active: ModuleDefinition;
  readonly onSelect: (id: ModuleId) => void;
  readonly children: ReactNode;
}

export function AppShell({ activeId, active, onSelect, children }: AppShellProps) {
  return (
    <div className="flex h-full">
      <nav className="flex w-60 shrink-0 flex-col border-r border-void-700 bg-void-900">
        <div className="border-b border-void-700 px-5 py-5">
          <div className="font-display text-lg leading-tight text-ash-100">
            The Next Generation
          </div>
          <div className="text-[11px] leading-tight text-ash-500">GM and Admin Tool</div>
          <div className="mt-0.5 text-xs text-ash-500">Jujutsu Kaisen roleplay companion</div>
        </div>

        <ul className="flex-1 overflow-y-auto p-2">
          {MAIN_MODULES.map((module) => (
            <li key={module.id}>
              <NavButton module={module} active={module.id === activeId} onSelect={onSelect} />
            </li>
          ))}
        </ul>

        <ul className="border-t border-void-800 p-2">
          {FOOTER_MODULES.map((module) => (
            <li key={module.id}>
              <NavButton module={module} active={module.id === activeId} onSelect={onSelect} />
            </li>
          ))}
        </ul>

        <ShellStatus />
      </nav>

      <main className="flex-1 overflow-y-auto">
        <header className="border-b border-void-800 px-8 py-6">
          <h1 className="font-display text-2xl text-ash-100">{active.label}</h1>
          <p className="mt-1 text-sm text-ash-500">{active.blurb}</p>
        </header>
        <div className="px-8 py-7">{children}</div>
      </main>
    </div>
  );
}
