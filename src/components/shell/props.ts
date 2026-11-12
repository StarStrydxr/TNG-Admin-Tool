import type { ReactNode } from 'react';

import type { ModuleDefinition, ModuleId } from '../../routes/modules';

/** What either shell is handed. Identical on purpose: the pages cannot tell which one they are in. */
export interface ShellProps {
  readonly activeId: ModuleId;
  readonly active: ModuleDefinition;
  readonly onSelect: (id: ModuleId) => void;
  readonly children: ReactNode;
}
