/**
 * Staff ranks, mirroring the Discord server's hierarchy.
 *
 * ⚠️ **Read this before trusting it with anything.**
 *
 * A rank chosen inside an app running on someone's own machine is **not a security boundary**.
 * The records are JSON on their disk; anyone can open the folder. What this ladder actually
 * buys you is two real things:
 *
 *   1. **Locally — a view filter.** It stops spoilers appearing on screen during a share, and
 *      keeps a player's copy uncluttered. Protection against accidents, not against snooping.
 *   2. **At the publish boundary — real enforcement.** When a record is exported, handed to a
 *      bot, or sent anywhere, `minRole` decides whether it leaves at all. That part is genuine,
 *      because withheld data never travels.
 *
 * Say so in the UI. Never imply the local filter is a lock.
 *
 * If real local protection is wanted later, encrypt records at rest keyed by tier — the
 * `minRole` field below is the right hook and would not need redesigning.
 *
 * Pure.
 */

/** Lowest first. Index is the rank. */
export const ROLES = ['player', 'mod', 'admin', 'senior-admin', 'owner'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  player: 'Player',
  mod: 'Mod',
  admin: 'Admin',
  'senior-admin': 'Senior Admin',
  owner: 'Owner',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  player: 'Sees only what is published to everyone.',
  mod: 'Sees mod-level material; can create and edit records.',
  admin: 'Sees admin-level material; can delete records.',
  'senior-admin': 'Sees senior-admin material.',
  owner: 'Sees everything, including anything marked owner-only.',
};

export const DEFAULT_ROLE: Role = 'owner';

/** The rank a record requires by default — visible to everyone unless raised. */
export const DEFAULT_MIN_ROLE: Role = 'player';

export function roleRank(role: Role): number {
  return ROLES.indexOf(role);
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/** Negative when `a` is junior to `b`. */
export function compareRoles(a: Role, b: Role): number {
  return roleRank(a) - roleRank(b);
}

/**
 * Whether a viewer at `viewer` may see a record marked `minRole`.
 * The only rule the publish boundary needs.
 */
export function canSee(viewer: Role, minRole: Role): boolean {
  return roleRank(viewer) >= roleRank(minRole);
}

/* ------------------------------------------------------------------ */
/* Capabilities                                                        */
/* ------------------------------------------------------------------ */

export interface Capabilities {
  readonly canCreate: boolean;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  /** Raise a record above your own rank — reserved for the owner. */
  readonly canRaiseAboveSelf: boolean;
  readonly canManageRoles: boolean;
}

/**
 * Derived from rank rather than configured. One ladder, no permission matrix to get subtly
 * wrong; if a per-role matrix is ever wanted, it replaces this function and nothing else.
 */
export function capabilitiesFor(role: Role): Capabilities {
  const rank = roleRank(role);
  return {
    canCreate: rank >= roleRank('mod'),
    canEdit: rank >= roleRank('mod'),
    canDelete: rank >= roleRank('admin'),
    canRaiseAboveSelf: rank >= roleRank('owner'),
    canManageRoles: rank >= roleRank('owner'),
  };
}

/** Ranks this viewer may stamp on a record. Nobody hides a record from themselves by accident. */
export function assignableRoles(viewer: Role): readonly Role[] {
  return capabilitiesFor(viewer).canRaiseAboveSelf
    ? ROLES
    : ROLES.filter((role) => roleRank(role) <= roleRank(viewer));
}

/**
 * Filter a list for a viewer. The single place visibility is applied, so a new surface cannot
 * forget it — use this rather than comparing ranks inline.
 */
export function visibleTo<T extends { readonly minRole: Role }>(
  items: readonly T[],
  viewer: Role,
): readonly T[] {
  return items.filter((item) => canSee(viewer, item.minRole));
}
