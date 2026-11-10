# The Next Generation — GM and Admin Tool

A local-first desktop app for running a Jujutsu Kaisen Discord roleplay: a character vault, a
library of saved material, and generators for NPCs, curses, techniques, shikigami, missions,
cursed objects and cursed tools.

Everything runs on this machine. **No cloud, no accounts, no telemetry, no network** — the only
outbound process is the local `claude` CLI, and only when you ask for it. Exports and the
Obsidian vault write to a plain folder, which is also how cloud sync works here: point them at
a Drive or OneDrive folder and that client does the syncing, with no API in this app.

See `CLAUDE.md` for the full project contract and `docs/house-rules/` for the Grade/Class
system this is built on.

> Your data lives in `%APPDATA%\jjk-rp-vault` — outside the repo, and keeping that name
> regardless of what the app is called, so an existing vault is never orphaned by a rename.

---

## First-time setup (Windows 11 on ARM64)

You need four things installed before the app will build:

1. **Node.js LTS** — the ARM64 build, from <https://nodejs.org>
2. **Rust** — via `rustup` from <https://rustup.rs>, then:
   ```
   rustup target add aarch64-pc-windows-msvc
   ```
3. **Visual Studio Build Tools 2022** — this supplies `link.exe`, the MSVC linker.

   ⚠️ The ARM64 compiler is **not** part of the C++ workload. Selecting *Desktop development with
   C++* alone gives you x64/x86 tools only, and an ARM64 Rust toolchain will then fail with
   `linker 'link.exe' not found`. The ARM64 component has to be added explicitly:

   ```
   winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.VC.Tools.ARM64 --includeRecommended"
   ```

   Through the installer GUI instead: tick the **Desktop development with C++** workload, then on
   the **Individual components** tab also tick **MSVC v143 - VS 2022 C++ ARM64/ARM64EC build
   tools (Latest)**.

   Run `rustc -vV` to see which you need. `host: aarch64-pc-windows-msvc` needs the ARM64
   component above; `host: x86_64-pc-windows-msvc` is covered by the workload alone.

4. **WebView2** — already present on Windows 11, nothing to do

Then, from the project folder:

```
npm install
```

## Running it

```
npm run tauri dev
```

The first run compiles the Rust side and takes several minutes. Later runs are quick, and the
frontend hot-reloads without recompiling Rust.

If the sidebar footer reads **`shell v0.1.0`**, the frontend, the transport seam and the Rust
command handler are all wired up correctly. If it reads *Browser preview — no shell*, you started
`npm run dev` instead of `npm run tauri dev`.

## Making a real .exe

```
build-app.cmd
```

That builds a release binary, copies it to
`%LOCALAPPDATA%\Programs\JJK RP Vault\`, and puts a shortcut on your Desktop. Run it again
whenever you change `data\canon\` — canon is compiled into the app, so table edits need a
rebuild. (Your own tables in `%APPDATA%\jjk-rp-vault\tables\` are read at startup and need no
rebuild.)

The result is one self-contained executable: the frontend, the canon tables and the Rust shell
are all inside it. Nothing to install alongside it — Windows 11 already has WebView2.

**First launch shows a SmartScreen warning.** "Windows protected your PC", because the binary
isn't code-signed. Click *More info* → *Run anyway*, once. Signing requires a paid certificate
and isn't worth it for a personal tool.

**Your data is not inside the app.** Characters, your tables and logs live in
`%APPDATA%\jjk-rp-vault`, so rebuilding, moving or deleting the .exe never touches them.

### If you'd rather have a proper installer

```
npm run tauri build
```

This additionally produces an `.msi` and an NSIS `-setup.exe` under
`src-tauri\target\release\bundle\`, which give you a Start Menu entry and an uninstaller. It's
slower, and the first run downloads the WiX and NSIS toolchains.

## Troubleshooting

**`error: linker 'link.exe' not found`**

The MSVC linker is missing or does not match your Rust host target. See prerequisite 3 above —
on an ARM64 machine this almost always means the C++ workload installed without the ARM64
component. After installing, **open a new terminal**: Rust discovers the toolchain at process
start, so an already-open shell will keep failing.

**Build succeeds but the window is blank**

Check the Vite dev server is on port 5173. `tauri.conf.json` pins `strictPort`, so another
process holding that port fails the dev run rather than silently moving.

## Other commands

| Command | What it does |
| --- | --- |
| `npm run typecheck` | TypeScript, strict, no emit |
| `npm test` | Unit tests for `domain/` and `generators/` |
| `npm run test:watch` | The same, watching |
| `npm run build` | Typecheck, then build the frontend |
| `npm run tauri build` | Produce the installer |

## Layout

```
src/domain/       Pure rules and types. No React, no Tauri, no I/O. Unit tested.
src/generators/   Pure generators. (tables, seed) => draft. Deterministic.
src/services/     The only place that talks to Tauri.
src/routes/       One folder per module.
src/components/   Shared presentational components.
src-tauri/        The Rust shell.
data/canon/       Shipped tables. Read-only at runtime.
data/templates/   Shipped markdown export templates. Overridable per user.
docs/house-rules/ The server's rules, transcribed. (Screenshots are gitignored.)
```

Your own data lives outside the project, in `%APPDATA%\jjk-rp-vault\` — characters, your own
table additions, exports and logs.

---

## Where the project is up to

**Done**

- **Phases 0–2** — the shell, the domain model, vault CRUD, the character sheet, and the
  generator engine: seeded, deterministic, with per-field locking and re-roll from derived
  sub-seeds, so re-rolling one field leaves the rest byte-identical.
- **Generators** — sorcerer, curse user, curse, technique (eleven types, each with its own
  tables), shikigami, mission, cursed object, cursed tool. Plus **Situation**, which rolls a
  mission, the curse actually in it and the tool left behind from one seed, saved pre-linked.
- **Library** — folders that are real directories on disk, search and filters, cross-links
  between records, a rank-based visibility filter that also gates every export.
- **Output** — printable sheets and PDFs through the system print dialog (with a cover page
  for a booklet), markdown export through editable templates, and Obsidian vault export and
  import that round-trips edits made outside the app.
- **Comfort** — word-triple seeds (`ash-gantry-nine`), undo/redo, keyboard rolling, duplicate
  warnings, backups with restore, themes including three faction palettes, per-kind insignia,
  and a background image.
- **Canon** — 1,370 entries across 136 tables, guarded by a test that rolls every generator at
  every grade and fails on a blank field or too little variety.
- 372 unit tests.

**Next — Phase 3**

Claude expansion for prose, the usage guard, and the two logs. Everything above works with
Claude unavailable, and always will: the generators never call it.

**Then — Phase 4**

An in-app table editor, and JSON import/export.
