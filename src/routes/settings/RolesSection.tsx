import { SectionCard } from '../../components/SectionCard';
import { useSettings } from '../../hooks/useSettings';
import {
  ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  capabilitiesFor,
  type Role,
} from '../../domain/roles';

export function RolesSection() {
  const { settings, setRole } = useSettings();
  const active = settings.role;
  const caps = capabilitiesFor(active);

  const can = [
    ['Create records', caps.canCreate],
    ['Edit records', caps.canEdit],
    ['Delete records', caps.canDelete],
    ['Mark a record above their own rank', caps.canRaiseAboveSelf],
  ] as const;

  return (
    <SectionCard
      title="Rank"
      description="Mirrors the server hierarchy. Records are marked with the minimum rank that may see them."
    >
      <div className="flex flex-col gap-1">
        {ROLES.map((role: Role) => (
          <label key={role} className="flex cursor-pointer items-start gap-2.5 py-1">
            <input
              type="radio"
              name="active-role"
              className="mt-1 h-3.5 w-3.5 shrink-0 accent-cursed-500"
              checked={active === role}
              onChange={() => setRole(role)}
            />
            <span className="min-w-0">
              <span className="block text-sm text-ash-300">{ROLE_LABELS[role]}</span>
              <span className="block text-xs text-ash-500">{ROLE_DESCRIPTIONS[role]}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="mt-5 border-t border-void-800 pt-4">
        <h3 className="mb-2 text-xs font-medium tracking-wide text-ash-400">
          As {ROLE_LABELS[active]}
        </h3>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {can.map(([label, allowed]) => (
            <li key={label} className="text-xs text-ash-500">
              <span className={allowed ? 'text-cursed-400' : 'text-ash-500'}>
                {allowed ? '✓' : '✕'}
              </span>{' '}
              {label}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-5 rounded-md border border-void-700 bg-void-850 px-3 py-2.5 text-xs leading-relaxed text-ash-400">
        <strong className="text-ash-300">This is a view filter, not a lock.</strong> Your
        records are JSON files on this machine, and anyone at the keyboard can open them whatever
        rank is selected here. What it does do is keep higher-rank material off the screen —
        useful when you are sharing it — and, when a record is exported or handed to anything
        outside the app, the mark decides whether it leaves at all. That part is real, because
        withheld records never travel.
      </p>
    </SectionCard>
  );
}
