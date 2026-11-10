import type { FolderFilter } from '../../hooks/useLibrary';

interface FolderTreeProps {
  readonly folders: readonly string[];
  readonly counts: ReadonlyMap<string, number>;
  readonly total: number;
  readonly active: FolderFilter;
  readonly onSelect: (folder: FolderFilter) => void;
}

function depthOf(path: string): number {
  return path.split('/').length - 1;
}

function leafName(path: string): string {
  return path.split('/').pop() ?? path;
}

/**
 * Flat list, indented by depth. A tree widget with expand arrows would be more machinery for
 * no gain at the handful of folders this will realistically hold — and every row stays
 * reachable by one Tab, which a collapsible tree would not.
 */
export function FolderTree({ folders, counts, total, active, onSelect }: FolderTreeProps) {
  function row(label: string, value: FolderFilter, count: number, depth: number) {
    const selected = active === value;
    return (
      <li key={value ?? '@all'}>
        <button
          type="button"
          onClick={() => onSelect(value)}
          aria-current={selected ? 'true' : undefined}
          style={{ paddingLeft: `${0.75 + depth * 0.85}rem` }}
          className={[
            'flex w-full items-center justify-between gap-2 rounded-md py-1.5 pr-2 text-left text-sm transition-colors',
            selected ? 'bg-void-700 text-ash-100' : 'text-ash-400 hover:bg-void-800 hover:text-ash-300',
          ].join(' ')}
        >
          <span className="truncate">{label}</span>
          <span className="shrink-0 font-mono text-[11px] text-ash-500">{count}</span>
        </button>
      </li>
    );
  }

  const rootCount = counts.size === 0 ? total : total - (counts.get(folders[0] ?? '') ?? 0);

  return (
    <nav aria-label="Folders">
      <ul className="flex flex-col gap-0.5">
        {row('All', null, total, 0)}
        {row('(root)', '', Math.max(0, rootCount >= 0 ? total - sumTopLevel(counts, folders) : 0), 0)}
        {folders.map((path) => row(leafName(path), path, counts.get(path) ?? 0, depthOf(path) + 1))}
      </ul>
    </nav>
  );
}

/** Records sitting directly in the collection root are those in no top-level folder. */
function sumTopLevel(counts: ReadonlyMap<string, number>, folders: readonly string[]): number {
  return folders
    .filter((path) => !path.includes('/'))
    .reduce((sum, path) => sum + (counts.get(path) ?? 0), 0);
}
