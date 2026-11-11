# The Next Generation — GM and Admin Tool

A local-first desktop app for running a Jujutsu Kaisen Discord roleplay. It keeps the
characters, the clans, the traits and the lore, and it generates the rest of the world:
NPCs, curses, techniques, shikigami, missions, bounties, cursed objects and cursed tools.

Everything runs on this machine. **No cloud, no accounts, no telemetry, no network** — the only
outbound process is the local `claude` CLI, and only when you ask for it. Exports and the
Obsidian vault write to a plain folder, which is also how cloud sync works here: point them at
a Drive or OneDrive folder and that client does the syncing, with no API in this app.

See `CLAUDE.md` for the full project contract and `docs/house-rules/` for the Grade/Class
system this is built on.

> Your data lives in `%APPDATA%\jjk-rp-vault` — outside the repo, and keeping that name
> regardless of what the app is called, so an existing vault is never orphaned by a rename.

---

## Installing it (staff — no build needed)

Grab the installer from the [Releases page](https://github.com/StarStrydxr/TNG-Admin-Tool/releases)
and pick the one that matches your machine:

| Your PC | File |
| --- | --- |
| An ordinary Intel or AMD laptop | the **x64** `-setup.exe` |
| Windows on ARM (a Snapdragon machine) | the **arm64** `-setup.exe` |

Not sure? Settings → System → About → *System type*.

**Windows will warn you on first run.** "Windows protected your PC" — click *More info* →
*Run anyway*, once. That is SmartScreen reacting to an unsigned binary, not to anything the app
does. Signing needs a paid certificate, which is not worth it for a tool used by a handful of
people.

Nothing else to install: Windows 11 already ships WebView2, and the app is otherwise
self-contained. Your data goes to `%APPDATA%\jjk-rp-vault`, so updating or uninstalling the app
never touches it.

---

## What's in it

Fourteen modules, down the sidebar:

| | |
| --- | --- |
| **Character Vault** | Player characters and recurring NPCs, as the server's own OC template — section for section, so the app and Discord agree about what a character is. Search, filters, portraits, a mission log, and **importing a submitted sheet** pasted straight from Discord. |
| **Library** | Everything saved by the generators, in folders that are real directories on disk. Search, refile, re-rank, bulk actions. |
| **Lore** | Places, clans, organisations, incidents — the parts of the world no generator can roll. |
| **Clans** | A full clan editor: hierarchy seats by tier, bonuses, mutations, the clan vault, prevalent members, a computed member roster, and rolling an NPC straight into an empty seat. |
| **Traits** / **Defects** | Write a perk or a drawback once — its description, its named bonuses and drawbacks, rarity and cost — and put it on any sheet. |
| **NPC Generator** | Sorcerers, curse users and curses. |
| **Techniques** | Cursed techniques across eleven types, each with its own tables; shikigami techniques bring their own shikigami. |
| **Mission Generator** | Graded missions in the server's posting format, with difficulty tiers that decide the objectives, the slots and three buckets of rewards. |
| **Bounties** | A posting on somebody the Academy wants dealt with, in the server's format, with its own economy. |
| **Situation** | A mission, the curse actually in it and the tool left behind — one seed, saved pre-linked. |
| **Cursed Objects** / **Cursed Tools** | Sealed, dormant and active objects; graded tools with properties and costs. |
| **Settings** | Themes, readability, accessibility, export folder, backups, card styling, and an in-app editor for the export templates. |

And what they all share:

- **Generators are deterministic.** Same tables, same seed, same constraints ⇒ byte-identical
  output. Lock the fields you like and re-roll the rest; a re-roll of one field leaves the
  others untouched.
- **Output** — printable sheets and PDFs through the system print dialog (with a cover page for
  a booklet), markdown export through editable templates, Obsidian vault export and import that
  round-trips edits made outside the app, and **graphics**: character, clan and mission cards
  and backdrops, plus a tall mission briefing poster, exported as PNG, JPEG or editable SVG.
- **Two export formats.** Readable markdown for Obsidian and for paper, and the server's own
  Discord posting format — corner brackets, code fences and all — so a file pastes into a
  channel unchanged. Mission, technique, character and bounty have one; everything else falls
  back to the readable version rather than writing an empty file.
- **Ranks.** Every record carries the minimum staff rank that may see it. It is a view filter
  locally, and a real gate at the publish boundary: nothing filtered out is ever exported,
  printed or put in a booklet.
- **A problems panel** that finds what is quietly wrong — dangling links, missing pictures,
  duplicate names, a clan seat still claiming a deleted character.
- **The app never calculates a stat.** Generators roll a Grade and nothing else; every stat
  starts at Class 3 of that Grade and you set the rest by hand. Traits, clan bonuses and
  mutations are recorded, never applied — which is also what stops anything being counted
  twice. See `CLAUDE.md` §4; it is a deliberate rule of the server, not a gap.

---

## Building it from source

You only need this if you are changing the code or the canon tables.

### Prerequisites

1. **Node.js LTS** — matching your architecture, from <https://nodejs.org>
2. **Rust** — via `rustup` from <https://rustup.rs>, then add the target for your machine:
   ```
   rustup target add aarch64-pc-windows-msvc    # Windows on ARM
   rustup target add x86_64-pc-windows-msvc     # Intel / AMD
   ```
3. **Visual Studio Build Tools 2022** — this supplies `link.exe`, the MSVC linker.

   ⚠️ **The ARM64 compiler is not part of the C++ workload.** Selecting *Desktop development
   with C++* alone gives you x64/x86 tools only, and an ARM64 Rust toolchain will then fail
   with `linker 'link.exe' not found`. The ARM64 component has to be added explicitly:

   ```
   winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.VC.Tools.ARM64 --includeRecommended"
   ```

   Through the installer GUI instead: tick the **Desktop development with C++** workload, then
   on the **Individual components** tab also tick **MSVC v143 - VS 2022 C++ ARM64/ARM64EC build
   tools (Latest)**.

   Run `rustc -vV` to see which you need. `host: aarch64-pc-windows-msvc` needs the ARM64
   component above; `host: x86_64-pc-windows-msvc` is covered by the workload alone. Building
   the **x64** installer from an ARM64 machine is a cross-compile and needs *both*.

4. **WebView2** — already present on Windows 11, nothing to do

Then, from the project folder:

```
npm install
```

### Running it

```
npm run tauri dev
```

The first run compiles the Rust side and takes several minutes. Later runs are quick, and the
frontend hot-reloads without recompiling Rust — though a change to the Rust side does trigger a
recompile, so a brand-new vault collection will not appear until that finishes.

If the sidebar footer reads **`shell v0.3.0`** (whatever the current version is), the frontend,
the transport seam and the Rust command handler are all wired up correctly. If it reads
*Browser preview — no shell*, you started `npm run dev` instead of `npm run tauri dev`.

### A quick local .exe

```
build-app.cmd
```

That builds a release binary for **this** machine, copies it to
`%LOCALAPPDATA%\Programs\JJK RP Vault\`, and puts a shortcut on your Desktop. Run it again
whenever you change `data\canon\` — canon is compiled into the app, so table edits need a
rebuild. (Your own tables in `%APPDATA%\jjk-rp-vault\tables\` are read at startup and need no
rebuild.)

### A release for everybody

```
npm run release 0.4.0
```

That sets the version in all three files that carry one, commits, tags `v0.4.0` and pushes. The
tag push is what starts the build: GitHub Actions compiles **both** architectures in parallel
and attaches both installers to the same draft Release. Publishing it is a human looking at the
page and seeing two installers there before anyone downloads one.

It refuses to run on a dirty tree, off `main`, or onto a tag that already exists — each of those
produces a release that does not match anything anybody can check out.

`npm run version:set 0.4.0` does the version bump alone, without the commit, tag and push.

---

## Troubleshooting

**`error: linker 'link.exe' not found`**

The MSVC linker is missing or does not match your Rust host target. See prerequisite 3 above —
on an ARM64 machine this almost always means the C++ workload installed without the ARM64
component. After installing, **open a new terminal**: Rust discovers the toolchain at process
start, so an already-open shell will keep failing.

**Build succeeds but the window is blank**

Check the Vite dev server is on port 5173. `tauri.conf.json` pins `strictPort`, so another
process holding that port fails the dev run rather than silently moving.

**A section of the screen shows "could not load" with an error**

That is the error boundary doing its job: one broken part of the screen costs you that part and
nothing else. The message says what broke; the rest of the app, and everything on disk, is
untouched.

**A record vanished from a board**

Check the rank selector in Settings first — a record saved at a higher rank is hidden, not gone.
Failing that, the files are plain JSON in `%APPDATA%\jjk-rp-vault\vault\`, readable in Notepad.

---

## Other commands

| Command | What it does |
| --- | --- |
| `npm run typecheck` | TypeScript, strict, no emit |
| `npm test` | Unit tests for `domain/` and `generators/` |
| `npm run test:watch` | The same, watching |
| `npm run build` | Typecheck, then build the frontend |
| `npm run tauri build` | Installer for this machine's architecture |
| `npm run build:x64` | NSIS installer for Intel/AMD |
| `npm run build:arm64` | NSIS installer for Windows on ARM |
| `npm run version:set 0.4.0` | Set the version in all three files that carry one |
| `npm run release 0.4.0` | Version, commit, tag, push — GitHub builds both and drafts a Release |

There is no lint script: ESLint would be a new dependency, and the dependency list is kept short
on purpose. The whole app runs on React, Tailwind and the Tauri API — no UI library, no chart
library, no PDF writer.

## Layout

```
src/domain/        Pure rules and types. No React, no Tauri, no I/O. Unit tested.
src/generators/    Pure generators. (tables, seed) => draft. Deterministic.
src/services/      The only place that talks to Tauri.
src/routes/        One folder per module.
src/components/    Shared presentational components.
src/hooks/         Stateful glue between the routes and the services.
src-tauri/         The Rust shell.
data/canon/        Shipped tables. Read-only at runtime.
data/templates/    Shipped markdown export templates. Overridable per user.
docs/house-rules/  The server's rules, transcribed. (Screenshots are gitignored.)
scripts/           Version bump and release.
.github/workflows/ CI on every push; both installers on a version tag.
```

Your own data lives outside the project, in `%APPDATA%\jjk-rp-vault\` — characters, records,
your own table additions, images, exports, backups and logs.

---

## Where the project is up to

**v0.3.0, and working.**

- **Phases 0–2** — the shell, the domain model, vault CRUD, the character sheet, and the
  generator engine: seeded, deterministic, per-field locking, re-rolls from derived sub-seeds.
- **The server's own formats** — the character record *is* the OC template, missions and
  bounties are written in the posting format, and markdown export has a second Discord-format
  template set chosen per export. The harvester reads all three back, which needed NFKC folding
  to cope with Discord's mathematical-alphanumeric headings.
- **The admin half** — importing a submitted sheet, the mission log with its CR line, the
  problems panel, bulk actions, and rank-based visibility that gates every export.
- **Lore, Clans, Bounties, Traits and Defects** as editable records in their own right, each
  inheriting folders, cross-links, search, visibility, print and both export formats.
- **Derived readings, never written back** — effective CE Reserves from the gap between
  Efficiency and Output, and Black Flash shown beside the real stats for the turns it lasts.
  Both restate stats you entered by rules the server stated. Neither changes a stored value, and
  there is no damage figure anywhere.
- **Graphics** — character, clan and mission cards and backdrops and a tall mission briefing,
  built as SVG so PNG and JPEG come from a canvas already in the repo, PDF from the print dialog
  and the SVG itself opens in Inkscape. Each kind has its own fonts and colours in Settings.
- **Comfort** — word-triple seeds (`ash-gantry-nine`), undo/redo, keyboard rolling, duplicate
  warnings, backups with restore, themes including three faction palettes, per-kind insignia,
  a background image, and two vendored accessible typefaces.
- **Canon** — 1,869 entries across 143 tables, guarded by a test that rolls every generator at
  every grade and fails on a blank field, a missing table or too little variety.
- **628 unit tests** across 32 files, plus typecheck and tests on every push.

**Next — Phase 3**

Claude expansion for prose, the usage guard, and the two logs. Everything above works with
Claude unavailable, and always will: the generators never call it, and the rule is that Claude
writes prose and never decides mechanics.

**Then — Phase 4**

An in-app table editor, and JSON import/export.
