import { useEffect, useState } from 'react';

import { Insignia } from '../../components/Insignia';
import { ROLE_LABELS } from '../../domain/roles';
import { readImage } from '../../services/images';
import type { Lore } from '../../domain/entities';

interface LoreCardProps {
  readonly entry: Lore;
  readonly active: boolean;
  readonly onSelect: () => void;
}

/**
 * One piece of lore, as a card.
 *
 * A missing picture is a gap, not an error — someone deleting a file from the images folder is
 * a legitimate thing to do (CLAUDE.md §9) — so the card falls back to the insignia and still
 * looks like a card rather than a broken one.
 */
export function LoreCard({ entry, active, onSelect }: LoreCardProps) {
  const [picture, setPicture] = useState<string | null>(null);

  useEffect(() => {
    if (!entry.image) {
      setPicture(null);
      return;
    }
    let live = true;
    void readImage(entry.image).then((url) => {
      if (live) setPicture(url);
    });
    return () => {
      live = false;
    };
  }, [entry.image]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex h-full w-full flex-col overflow-hidden rounded-lg border text-left transition-colors ${
        active
          ? 'border-cursed-600 bg-void-800'
          : 'border-void-700 bg-void-900 hover:border-void-600 hover:bg-void-850'
      }`}
    >
      <div className="flex h-24 items-center justify-center overflow-hidden border-b border-void-800 bg-void-850">
        {picture ? (
          <img src={picture} alt="" className="h-full w-full object-cover" />
        ) : (
          <Insignia kind="lore" size={24} className="text-ash-500" />
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 px-3 py-2.5">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-sm text-ash-100">
            {entry.name || <span className="text-ash-500">Untitled entry</span>}
          </span>
          {entry.loreType ? (
            <span className="shrink-0 rounded border border-void-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ash-500">
              {entry.loreType}
            </span>
          ) : null}
        </span>

        {entry.summary ? (
          <span className="line-clamp-3 text-xs leading-relaxed text-ash-400">
            {entry.summary}
          </span>
        ) : null}

        <span className="mt-auto flex items-center gap-2 pt-1 text-[10px] text-ash-500">
          {entry.era ? <span className="truncate">{entry.era}</span> : null}
          {entry.status ? <span className="truncate">· {entry.status}</span> : null}
          {entry.minRole !== 'player' ? (
            <span className="ml-auto shrink-0">{ROLE_LABELS[entry.minRole]}+</span>
          ) : null}
        </span>
      </div>
    </button>
  );
}
