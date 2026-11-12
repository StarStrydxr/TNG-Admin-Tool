/**
 * The two interfaces, and the marks the newer one puts on each page.
 *
 * **Jujutsu** is the overhauled shell: a board of plaques with a stamped icon and a kanji for
 * every page, title cards, a rank stamp, file-tab sections. **Classic** is the interface as it
 * shipped in v0.3.3 (Dan, 12 Nov 2026 — "retain the classic style as a preset for those who
 * may prefer it"), and choosing it gives back exactly that: the plain sidebar, the hairline
 * header, flat panels, bare grade codes, the line-art insignia and the system serif on
 * headings. Nothing about the data, the pages or the theme differs between them. It is one
 * setting, and it only changes how the same furniture is drawn.
 *
 * Pure (CLAUDE.md §3).
 */

import type { GlyphId } from './insignia';

export type InterfaceStyle = 'jujutsu' | 'classic';

export const INTERFACE_STYLES: readonly InterfaceStyle[] = ['jujutsu', 'classic'];

export const DEFAULT_INTERFACE_STYLE: InterfaceStyle = 'jujutsu';

export const INTERFACE_STYLE_LABELS: Record<InterfaceStyle, string> = {
  jujutsu: 'Jujutsu',
  classic: 'Classic',
};

export const INTERFACE_STYLE_NOTES: Record<InterfaceStyle, string> = {
  jujutsu:
    'A board of plaques with a stamped icon and a kanji for every page, title cards, a rank stamp, file-tab sections and squarer corners. The sidebar folds down to its icons.',
  classic:
    'The interface as it shipped in v0.3.3: a plain list down the side, plain headers and panels, the original line icons.',
};

export interface ShellSettings {
  readonly style: InterfaceStyle;
  /** The Jujutsu sidebar folded down to its icons. Classic has no icons to fold down to. */
  readonly railCollapsed: boolean;
}

export const DEFAULT_SHELL: ShellSettings = { style: DEFAULT_INTERFACE_STYLE, railCollapsed: false };

export function isInterfaceStyle(value: unknown): value is InterfaceStyle {
  return typeof value === 'string' && (INTERFACE_STYLES as readonly string[]).includes(value);
}

/**
 * Additive: a `config.json` written before this existed has no `shell` key and gets the
 * default — which is the new interface, because that is what was asked for. Classic is one
 * click away in Settings, and once chosen it is stored and stays chosen.
 */
export function parseShell(value: unknown): ShellSettings {
  const raw = value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    style: isInterfaceStyle(raw['style']) ? raw['style'] : DEFAULT_SHELL.style,
    railCollapsed: raw['railCollapsed'] === true,
  };
}

/** Every icon the Jujutsu set draws: one per record glyph, and four pages that are not records. */
export type ShellIconId = GlyphId | 'vault' | 'library' | 'situation' | 'settings';

export interface ModuleMark {
  readonly icon: ShellIconId;
  /**
   * Two kanji, printed beside the page's name. Real words, and where the series has its own
   * term for the thing — 術式, 任務, 呪物, 呪具 — that is the one used.
   */
  readonly kanji: string;
  /** What the kanji say, for the tooltip. They are decoration, but not a riddle. */
  readonly reading: string;
}

/**
 * ⚠️ **Every character a page uses must be in `KANJI_SUBSET`.** The display face ships only
 * the kanji the interface prints (thirty of them, 11 KB — the whole face is 2 MB). A
 * character outside the subset does not fail: it silently falls back to whatever Japanese
 * face Windows has, in a different style, beside twenty-nine that match. `shell.test.ts` is
 * what catches a page using one.
 *
 * This string is the one list. `kanjiUnicodeRange()` turns it into the `unicode-range` the
 * font is registered with (`appearance.ts`), so those two cannot disagree. The third party is
 * the font file itself, which nothing here can open: adding a character means re-cutting it
 * (CLAUDE.md §9) from this same string.
 */
export const KANJI_SUBSET = '事人任伝具務名呪定庫式性懸成承族書案欠氏物特生簿術記設賞録陥';

/** `U+4E8B, U+4EBA, …` — the CSS `unicode-range` for a set of characters. */
export function kanjiUnicodeRange(characters: string): string {
  return Array.from(new Set(Array.from(characters)))
    .map((character) => character.codePointAt(0) ?? 0)
    .sort((a, b) => a - b)
    .map((point) => `U+${point.toString(16).toUpperCase().padStart(4, '0')}`)
    .join(', ');
}

export const MODULE_MARKS = {
  vault: { icon: 'vault', kanji: '名簿', reading: 'meibo — the register of names' },
  library: { icon: 'library', kanji: '書庫', reading: 'shoko — the archive' },
  lore: { icon: 'lore', kanji: '伝承', reading: 'denshō — lore, what is handed down' },
  clans: { icon: 'clan', kanji: '氏族', reading: 'shizoku — clans' },
  traits: { icon: 'trait', kanji: '特性', reading: 'tokusei — traits' },
  defects: { icon: 'defect', kanji: '欠陥', reading: 'kekkan — defects' },
  'npc-generator': { icon: 'sorcerer', kanji: '人物', reading: 'jinbutsu — people' },
  'technique-generator': { icon: 'technique', kanji: '術式', reading: 'jutsushiki — cursed techniques' },
  'mission-generator': { icon: 'mission', kanji: '任務', reading: 'ninmu — missions' },
  'bounty-generator': { icon: 'bounty', kanji: '懸賞', reading: 'kenshō — bounties' },
  situation: { icon: 'situation', kanji: '事案', reading: 'jian — an incident' },
  'cursed-object-generator': { icon: 'object', kanji: '呪物', reading: 'jubutsu — cursed objects' },
  'cursed-tool-generator': { icon: 'tool', kanji: '呪具', reading: 'jugu — cursed tools' },
  settings: { icon: 'settings', kanji: '設定', reading: 'settei — settings' },
} as const satisfies Record<string, ModuleMark>;

export type MarkedModuleId = keyof typeof MODULE_MARKS;

/** The characters of a mark, one per element — a title card stacks them. */
export function kanjiOf(mark: ModuleMark): readonly string[] {
  return Array.from(mark.kanji);
}
