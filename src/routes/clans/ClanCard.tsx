import { useEffect, useState } from 'react';

import { Insignia } from '../../components/Insignia';
import { hierarchySummary } from '../../domain/clans';
import { ROLE_LABELS } from '../../domain/roles';
import { readImage } from '../../services/images';
import type { Clan } from '../../domain/entities';

interface ClanCardProps {
  readonly clan: Clan;
  readonly active: boolean;
  /** How many saved characters name this clan. Computed by the caller, never stored. */
  readonly members: number;
  readonly onSelect: () => void;
}

/**
 * One clan, as a card.
 *
 * A missing picture is a gap, not an error (CLAUDE.md §9), so the card falls back to the
 * insignia and still looks like a card rather than a broken one.
 */
export function ClanCard({ clan, active, members, onSelect }: ClanCardProps) {
  const [picture, setPicture] = useState<string | null>(null);

  useEffect(() => {
    if (!clan.image) {
      setPicture(null);
      return;
    }
    let live = true;
    void readImage(clan.image).then((url) => {
      if (live) setPicture(url);
    });
    return () => {
      live = false;
    };
  }, [clan.image]);

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
          <Insignia kind="clan" size={26} className="text-ash-500" />
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 px-3 py-2.5">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate font-display text-sm text-ash-100">
            {clan.name || <span className="text-ash-500">Unnamed clan</span>}
          </span>
          {clan.status ? (
            <span className="shrink-0 rounded border border-void-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ash-500">
              {clan.status}
            </span>
          ) : null}
        </span>

        {clan.motto ? (
          <span className="line-clamp-2 text-xs italic leading-relaxed text-ash-400">
            {clan.motto}
          </span>
        ) : null}

        {clan.innateTechnique ? (
          <span className="truncate text-[11px] text-ash-500">{clan.innateTechnique}</span>
        ) : null}

        <span className="mt-auto flex items-center gap-2 pt-1 text-[10px] text-ash-500">
          <span className="truncate">{hierarchySummary(clan)}</span>
          <span className="shrink-0">
            · {members} {members === 1 ? 'member' : 'members'}
          </span>
          {clan.minRole !== 'player' ? (
            <span className="ml-auto shrink-0">{ROLE_LABELS[clan.minRole]}+</span>
          ) : null}
        </span>
      </div>
    </button>
  );
}
