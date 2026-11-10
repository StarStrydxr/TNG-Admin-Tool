# CLAUDE.md — The Next Generation: GM and Admin Tool

Guidance for Claude Code when working in this repository. Read this fully before making changes.

---

## 1. What this project is

A **local-first desktop application** for running Dan's Jujutsu Kaisen Discord roleplay. Named
*The Next Generation — GM and Admin Tool* from v0.3.0; the repo folder is still `TNG-Claude`
and **the data folder is still `%APPDATA%\jjk-rp-vault`**. That name is pinned in
`vault.rs::APP_FOLDER` on purpose: renaming it is a migration, not a string change, and would
orphan every character, record, table and backup on disk. It holds
characters and generates the world around them: NPCs, missions, cursed objects and cursed tools.

Five modules:

| Module | Purpose |
| --- | --- |
| **Character Vault** | Create, edit, browse, search and export player characters and recurring NPCs; import a submitted sheet |
| **Library** | Browse saved generator output by kind and folder; refile, re-rank, delete, in bulk |
| **Lore** | Places, clans, organisations, incidents — the parts of the world no generator can roll |
| **Clans** | Edit a clan: hierarchy, bonuses, mutations, the clan vault, and rolling an NPC into an empty seat |
| **NPC Generator** | Generate a Sorcerer, Curse User, or Curse |
| **Technique Generator** | Cursed techniques by type; shikigami techniques bring their own shikigami |
| **Mission Generator** | Generate a graded mission with location, target, complications and payout |
| **Situation** | A mission, the curse actually in it and the tool left behind — one seed, saved linked |
| **Cursed Object Generator** | Generate a sealed or active cursed object |
| **Cursed Tool Generator** | Generate a graded cursed tool with properties and drawbacks |
| **Settings** | Theme (presets + custom), readability and accessibility |

### What this project is NOT

These are separate projects. Do not import from them, mirror their schemas, or assume their rules apply:

- ❌ **The JJK 5e FoundryVTT module** — that is D&D 5e. This project is **not** D&D-based.
  **One approved exception:** the 41 technique *names and flavour lines* were imported from the
  module's `Innate-Techniques` pack into `data/canon/technique-canonical.json`, with Dan's
  explicit say-so. Those blurbs are setting flavour and contain no 5e mechanics — that was
  checked, not assumed. Importing anything **mechanical** from the module (stat blocks, DCs,
  dice, levels, feats, classes, races) remains forbidden, and the exception does not widen on
  its own. Ask before pulling across another pack.
- ❌ **The web-hosted JJK DnD Character Vault** — this is a clean, standalone rebuild. No
  compatibility obligations, no legacy schema, no shared code.
- ❌ **The Sorcerer Registry** web app.

This vault targets the **Discord RP's Grade/Class system** only. See §4.

### Non-negotiables

- **Offline-first.** The app must be fully usable with no network. The *only* outbound process is
  the local `claude` CLI subprocess (§7).
- **No cloud, no telemetry, no analytics, no sync service.** Ever. Do not add one, do not suggest one.
  This rule was tested in Nov 2026 and held. Dan asked for Google Drive export/import; the
  answer was **not** an API client. Drive and OneDrive desktop clients keep a *local folder* in
  sync, so pointing the vault or export folder at `G:\My Drive\…` gives cloud sync with no
  network code, no OAuth and no tokens. If a real API client is ever genuinely wanted, that is
  an amendment to this line and must be asked for explicitly — not slipped in as a feature.
- **Single user, single machine.** No accounts, no auth, no multi-tenancy. The rank ladder in
  `domain/roles.ts` is **not** an exception to this — see §4a. It is a view filter and an export
  gate, not a login.
- **The user's data is files on disk**, in a documented format he can read and edit by hand.

---

## 2. Platform and stack

| Layer | Choice |
| --- | --- |
| Shell | **Tauri 2** (Rust) |
| Frontend | **React 18 + TypeScript (strict) + Vite** |
| Styling | **Tailwind CSS** |
| State | Zustand (or React context if it stays small — ask before adding Zustand) |
| Persistence | **JSON files on disk** via Rust commands. Not IndexedDB, not localStorage. |
| AI | **Claude Code CLI subprocess**, spawned from Rust (§7) |

Target platform: **Windows 11 on ARM64**. Single build target — there is no Linux or macOS build
to maintain. Do not add cross-platform conditionals unless asked.

### Prerequisites on the dev machine

- Node.js LTS (ARM64 build)
- Rust via `rustup`, target `aarch64-pc-windows-msvc`
- Visual Studio Build Tools 2022 → *Desktop development with C++*, including the **ARM64** toolchain component
- WebView2 — ships with Windows 11, no action needed
- Claude Code installed and **logged in to the Claude Pro subscription** (`claude` must run from a plain terminal)

### Commands

```bash
npm install              # once
npm run tauri dev        # dev — frontend hot-reloads; Rust changes trigger a recompile
npm run tauri build      # produce the installer
npm run test             # vitest — domain + generators only
npm run typecheck        # tsc --noEmit
```

There is no lint script yet — ESLint would be a new dependency, so ask before adding one.

> **Note on long builds:** the first `cargo build` takes several minutes and will exceed a single
> command timeout. Run it in the background and poll, rather than retrying it.

---

## 3. Architecture

```
TNG-Claude/
├── CLAUDE.md
├── src/                          # React frontend
│   ├── routes/                   # one folder per module (Vault, NpcGenerator, …)
│   ├── components/               # shared presentational components
│   ├── domain/                   # ⬅ PURE. Types + rules. No React, no Tauri, no I/O.
│   ├── generators/               # ⬅ PURE. (tables, seed) => draft. No React, no Tauri, no I/O.
│   ├── services/                 # ⬅ THE ONLY PLACE THAT CALLS TAURI
│   │   ├── storage.ts            #   vault read/write
│   │   ├── tables.ts             #   table loading + user overlay
│   │   ├── claude.ts             #   expansion requests
│   │   └── transport.ts          #   invoke() wrapper — the single swap point
│   ├── state/
│   └── styles/
├── src-tauri/                    # Rust
│   └── src/
│       ├── main.rs
│       ├── config.rs             # config.json — settings, later the usage guard
│       ├── vault.rs              # character CRUD on disk
│       ├── tables.rs             # USER table loading only — canon is bundled, see §5
│       ├── images.rs             # pictures on disk, read back as data URLs (§9)
│       ├── exports.rs            # user template overrides + writing markdown (§9)
│       ├── backup.rs             # dated folder copies of the whole data directory (§9)
│       ├── claude.rs             # spawns the claude CLI
│       └── usage.rs              # the usage guard (§8)
├── data/
│   ├── canon/                    # shipped tables — version controlled
│   ├── templates/                # shipped markdown export templates — overridable (§9)
│   └── schema/                   # JSON Schemas for tables and Claude outputs
└── prompts/                      # system prompt + per-generator expansion prompts
```

### Architectural rules — these are hard

1. **`domain/` and `generators/` are pure.** No `import { invoke }`, no React, no `fetch`, no
   `window`, no filesystem. They take data in and return data out. This is what makes them
   unit-testable and what keeps the generators deterministic.
2. **All Tauri `invoke()` calls live in `src/services/`.** Nowhere else. Components call services;
   services call transport; transport calls Tauri. If a component imports `@tauri-apps/api`
   directly, that is a bug.
3. **Rust owns the filesystem.** The frontend never constructs absolute paths. It asks for
   `vault.listCharacters()`, not for `C:\Users\...`.
4. **Generators never call Claude.** A generator produces a complete, usable result from tables
   alone. Claude expansion is a *separate, optional, later* step (§7). This is what keeps the app
   working offline and within usage limits.

### Where user data lives

```
%APPDATA%/jjk-rp-vault/
├── config.json              # settings, usage-guard thresholds
├── vault/
│   ├── characters/*.json
│   ├── npcs/*.json
│   └── missions|curses|cursed-objects|cursed-tools|techniques|shikigami|lore|clans/  # real subfolders
├── tables/                  # USER tables — overlay canon, never overwrite it
├── templates/               # USER export templates — override the bundled ones by file name
├── images/                  # portraits and reference pictures; records store only the name
├── exports/                 # markdown written by the export action, mirroring record folders
├── backups/                 # dated folder copies; never itself backed up
└── logs/
    ├── claude-usage.jsonl   # granular, one line per call
    └── digest-YYYY-MM-DD.md # human-readable daily summary
```

`data/canon/` ships with the app and is **read-only at runtime**. User additions go to
`%APPDATA%/.../tables/` and are merged over canon at load time, keyed by entry `id`. Never mutate
`data/canon/` from application code.

---

## 4. Domain model — the Grade/Class system

> 📑 **The server's house rules are transcribed in `docs/house-rules/stats-grades-classes.md`,
> with the original screenshots in `docs/house-rules/source/`. That document is authoritative and
> supersedes JJK canon wherever they disagree. Read it before touching `domain/`.**
> Items still marked *TBD* below are genuinely unsupplied — stop and ask rather than inventing
> mechanics. Schema changes here cascade through every module, so get it right once.

### Stats are reference, not a combat engine

The server's rules open by stating that stats are not the defining factor in a fight and that
"powerscaling is cringe" — stats serve as requirements and reference points only. Technique and
its application decide outcomes.

**Therefore: do not build a damage calculator, a power-comparison tool, or any "who would win"
feature.** Store stats, display them, filter by them, gate content on them. Never resolve a
conflict from them. This is a deliberate cultural rule of the server, not a gap to be filled.

### Stat notation

Stats are written `G1[C3]` in the usual short form, or `Grade 1 [Class 3]` long. Every stat
**defaults to Class 3 of the character's own Grade**, then shifts via traits, vows and other
perks. Use the short form in dense views and the long form on the character sheet.

### Class scale — 1 is highest, 5 is lowest

| Class | Meaning |
| --- | --- |
| 1 | Exceptional, borderlining the next grade |
| 2 | Above average |
| 3 | Average *(default)* |
| 4 | Still below average but much closer to it |
| 5 | Just barely clearing the hurdle to the given grade |

⚠️ **This scale is inverted.** Lower number = stronger. Do not sort ascending by accident, and
name variables so the inversion is obvious (`classRank`, not `classLevel`).

### Grade ladder

Fourteen rungs, plus a **Civilian Grade** floor below them all. Each rung is one grade gap =
**×2 power**. Rungs in *italics* are **implied** — the server doesn't list them, but they exist
mechanically and gap counting depends on them.

| Rank | Grade | Abbrev | | Rank | Grade | Abbrev |
| ---: | --- | --- | --- | ---: | --- | --- |
| 0 | Grade 4 | `G4` | | 7 | Special Grade | `SG` |
| 1 | Grade 3 | `G3` | | 8 | Disaster Grade | `DG` |
| 2 | Grade Semi-2 | `S-G2` | | 9 | *Semi-Calamity Grade* | `S-CG` |
| 3 | Grade 2 | `G2` | | 10 | Calamity Grade | `CG` |
| 4 | Grade Semi-1 | `S-G1` | | 11 | *Demi-Apocalypse Grade* | `D-AG` |
| 5 | Grade 1 | `G1` | | 12 | *Semi-Apocalypse Grade* | `S-AG` |
| 6 | *Semi-Special Grade* | `S-SG` | | 13 | Apocalypse Grade | `AG` |

Below rank 0 sits **Civilian Grade** (`CIV`) — the floor. A stat pushed below `G4[C5]` by a defect
becomes Civilian Grade in that stat.

Declared gaps, each **measured from the last named grade**: 1 throughout the Grade 4 → Grade 1
run; **Grade 1 → Special Grade = 2**; Special → Disaster = 1; **Disaster → Calamity = 2**;
**Calamity → Apocalypse = 3**. A gap of 2 inserts one implied `Semi-<grade>` rung; a gap of 3
inserts `Demi-<grade>` then `Semi-<grade>`, in that order.

Curses additionally need `unregistered`. Define this as one ordered enum in `domain/grades.ts`;
never scatter grade strings as literals.

The abbreviations and the rung ordering are both **confirmed by Dan** (31 Oct 2026). Use them
as written; they appear in the UI, on printed sheets and in exported markdown.

### The stat block

Eight stats: **CE Output · CE Control · CE Reserves · CE Efficiency · Perception · Strength ·
Speed · Fortitude**.

**`CE Efficiency` *is* graded** — confirmed by Dan (9 Nov 2026) when the server's own OC template
appeared to write it as a plain number. It is not: "you can gain classes AND Grades from traits
and bonuses, and lose Classes in defects, making it difficult to calculate as a plain number."
The `NUMBER` in the Discord template is loose shorthand. Do not retype it.

⚠️ **`CE Reserves` is not graded.** It uses a descriptive band, not a `Grade[Class]` pair, so it
is typed separately from the other seven. The bands, shallowest first:

`Shallow` · `Average` · `Deep` · `Bottomless` · `Abysmal` · `Endless`

Note `Abysmal` means *abyssally deep* here, not *poor* — it sits near the top of the scale.

### ⚠️ The app does NOT calculate stats

**Generators roll a Grade and nothing else.** Every stat then sits at **Class 3 of that Grade**,
because C3 is average. Traits and defects shift individual Classes from there, and **Dan applies
those by hand.**

So:

- ✅ Generate the Grade. Default all seven graded stats to `<grade>[C3]`. Make each one directly
  editable.
- ❌ **Do not build a stat calculator.** No summing modifiers, no deriving final values from a
  trait list, no auto-recalculation when a trait is added. He decides these manually.

The system's own carry arithmetic *is* documented in §6 of the house-rules doc — it is real, and
useful for validating hand-entered values or explaining a value in a tooltip. But it is reference
material, not an engine the app runs. Don't quietly turn it into one.

Edge cases worth knowing for validation and display:

- `+2 Classes` on a `C1` carries up: `G4[C1] +2 Cl` → **`G3[C4]`** (5 Classes span one rung).
- A defect dropping a stat below `G4[C5]` makes it **Civilian Grade** in that stat.

### Traits, Arts and slots

Characters hold **traits** and **arts**, each limited by **slots**. Slot counts depend on **grade**
and **awakenings** — Grade One is a base **3 trait slots / 3 art slots**.

Traits supply Class modifiers. A single trait may modify several stats by different amounts, and
may be a mixed blessing (Masami Bonus: +2 Classes Speed, −2 Classes Strength). Sources appear to
include clan, background/personality, and position.

Model `traits[]`, `arts[]`, `traitSlots`, `artSlots` and `awakenings[]` on the character now, and
enforce the slot limits in the UI as a soft warning rather than a hard block.

⚠️ **TBD, Dan will supply later:** the slot formula across grades and awakenings, what an
awakening is structurally, and what distinguishes an art from an innate technique.
**Binding vows are deferred to much later** — leave the field, build nothing on it.

### Core entities (canon vocabulary — safe)

**Character / Sorcerer NPC**

Since 9 Nov 2026 the record **is the server's OC template**, section for section, so the app and
the Discord server agree about what a character is. Groupings follow the template's own headings:

- *«General»* — `name` · `nicknames` · `gender` · `race` · `subdivision` · `age` ·
  `dateOfBirth` · `sexuality`
- *«Appearance»* — `nationality` · `ethnicity` · `hairColour` · `eyeColour` · `height` ·
  `appearance` · `portrait?`
- *«Personal»* — `affiliation` · `occupation` · `hobbies` · `likes` · `dislikes` ·
  `personality` · `background` *(the template's Backstory; the key predates it)*
- *«Sorcerer Profile»* — `grade` · `faction` · `clan` · `clanBonus` · `mutations[]` ·
  `ceApplications` · `arsenal` · `potential` · `feats[]` · `mastery`
- *Stats* — `stats`: the seven graded stats (CE Output, CE Control, CE Efficiency, Perception,
  Strength, Speed, Fortitude) each as `{ grade, class }`, defaulting to `<characterGrade>[C3]`;
  plus `ceReserves` as a descriptive band, typed separately
- *Build* — `traits[]` · `defects[]` · `arts[]` · `traitSlots` · `artSlots` · `awakenings[]`
- *Technique* — `innateTechnique` (`name`, `description`, `extensions[]`, `maximum?`,
  `domainExpansion?`) · `reverseCursedTechnique` (none / self / others) · `simpleDomain` ·
  `blackFlashCount` · `heavenlyRestriction?`
- *«Bonus»* — `themeSong` · `faceClaim`
- *Mission log* — `missionHistory[]`, each entry carrying `outcome` (success / failure /
  unresolved), `mvp`, `cr`, a title, a date and notes; plus `cursedRating` on the character
- *Links* — `cursedTools[]` · `relationships[]` · `bindingVows[]` *(deferred)*

Three notes on that mapping:

- ⚠️ **The template says Affiliation twice** — under Personal (the school or organisation) and
  under Sorcerer Profile ("Curses, Curse Users, Sorcerers or Neutral"). Those answer different
  questions, so they are two fields: `affiliation` and **`faction`**. The export templates write
  both back out under the heading the server expects, so the rename is invisible on Discord.
- `defects[]` reuses the `Trait` shape. A defect is a trait with the sign flipped and the app
  computes neither (see above), so a second near-identical type would buy nothing.
- Every field added for the template is **free text and additive**, so characters saved before
  it parse with `''` or `[]`. No migration was needed, and `character-parse.test.ts` pins that.
- ⚠️ **`clanBonus` and `mutations[]` record, they do not apply.** Ticking the clan bonus
  changes no Class — see **Clans** in §9. That is what stops a bonus already entered by hand
  from being counted a second time.
- ⚠️ **Nothing totals the CR.** Cursed Rating is tracked on the Discord server; `cursedRating`
  and each log line's `cr` are free text the app mirrors. A second total here that disagreed
  with the one on Discord would be worse than no total at all, so there is deliberately no
  arithmetic — and no promotion logic either (open question §12.4 is still open).
- `outcome` used to be free text. `parseOutcome` reads the old strings by keyword, and anything
  it does not recognise is kept in the entry's notes rather than dropped on the way to a tag.

Note there is no separate `cursedEnergy` block — CE Output, Control, Efficiency and Reserves are
stats, and live in `stats`.

**Curse**
`grade` · `registered` · `originFear` · `form` (humanoid / beast / aberrant / amalgam) ·
`intelligence` (unintelligent / semi-sentient / intelligent / special) · `habitat` ·
`behaviour` · `abilities[]` · `cursedTechnique?` · `domain?` · `weaknesses[]`

**Curse User** — a Character with `affiliation: curse-user` plus `motive` and `allegiance`.

**Mission**
`grade` · `missionType` (extermination / exorcism / investigation / escort / retrieval /
containment / surveillance / civilian-extraction / veil-maintenance / counter-curse-user) ·
`recommendedGrade` · `faction` (who it is open to) · `hosts[]` · `location` · `client` ·
`briefing` · `trueSituation` (what the
briefing gets wrong) · `objectives[]` · `complications[]` · `rewards[]` ·
`objectiveRewards[]` · `mvpRewards[]` · `hostRewards[]` · `difficulty` · `slots` · `veil` ·
`support` · `payout`

The server pays in **three buckets**, so they are three fields: `rewards` for taking part,
`objectiveRewards` only if every objective is completed, and `mvpRewards` as the referee's award
at the end. `hostRewards` is what a primary and a secondary host take home. All four are plain
string lists, so they export, print and round-trip through Obsidian with no special handling.

Shaped to the server's own posting format (9 Nov 2026) — Mission Type, Recommended Grade, Hosts,
𝖮𝖡𝖩𝖤𝖢𝖳𝖨𝖵𝖤𝖲, 𝖱𝖤𝖶𝖠𝖱𝖣𝖲 and Mission Slots — all additive over what was already saved.

⚠️ **`payout` and `rewards` are not the same thing and both stay.** `payout` is the in-fiction
fee the client is paying, which belongs in the briefing; `rewards` is the server economy —
Cursed Rating, Trait Points, Yen, chests. A mission can have one and not the other.

Every mission should carry a `trueSituation` that diverges from the `briefing` — misgraded
missions are the engine of JJK plots and the generator should lean into it.

**Cursed Object**
`grade` · `state` (sealed / active / dormant) · `appearance` · `origin` · `sealType` ·
`effectWhenUnsealed` · `containmentRequirements` · `knownIncidents[]`

**Cursed Tool**
`grade` · `form` (blade / polearm / chain / firearm / ornament / other) · `name` · `appearance` ·
`properties[]` · `drawbacks[]` · `cursedEnergyRequirement` · `provenance` · `attachedVows[]`

**Lore**
`loreType` (place / organisation / clan / event / rule / person / artefact / other) ·
`summary` · `body` · `era` · `status` · `location`

A place, a clan, an incident, a house rule — the parts of the world a generator cannot roll.
Lore had a folder wired up in `vault.rs` from the start and nothing behind it; making it an
entity means it inherits folders, links, search, visibility, print and export with no
special-casing, and it is the only kind created from nothing rather than from a draft
(`domain/lore.ts`).

⚠️ **Lore has no `grade`** — alone among the entities, and deliberately: a clan is not Grade 2,
and giving it one so the type lines up would put a wrong abbreviation on every card. Generic
code that reaches for a grade without knowing the kind goes through **`entityGrade()`**, which
returns null for lore. Search, the library row, the detail header, the Obsidian frontmatter and
the export context all do. Add a kind without a grade and that is the function to use.

Shared metadata on every generated entity: `id`, `createdAt`, `seed`, `tableVersion`,
`expandedByClaude` (bool), `userEdited` (bool).

---

## 4a. Ranks, visibility and saved entities

### The rank ladder is not security

`player` → `mod` → `admin` → `senior-admin` → `owner`, mirroring the Discord server's staff
hierarchy. Every saved record carries `minRole`: the minimum rank that may see it.

**Say plainly, in the UI and in conversation, that the local filter is not a lock.** The records
are JSON on the user's own disk; a rank selector cannot stop anyone reading them. What it
genuinely does:

- **Locally** — keeps higher-rank material off the screen. Good against screen-sharing and
  clutter. An accident-preventer, nothing more.
- **At the publish boundary** — decides whether a record leaves the machine at all. *That* is
  real enforcement, because withheld data never travels. Any export, bot hand-off or share
  **must** filter through `visibleTo()` before anything is emitted.

Capabilities derive from rank in `capabilitiesFor()` — one ladder, no permission matrix. If real
local protection is ever wanted, encrypt at rest keyed by `minRole`; that field is the hook and
would not need redesigning.

### Saved generator output

Missions, curses, cursed objects, cursed tools, techniques, shikigami, lore and clans are
stored as **typed entities**
(`domain/entities.ts`), one collection each under `vault/`. Characters remain separate and keep
their own schema.

- Converters live in `generators/to-entity.ts`, **one per generator**. Changing a spec's field
  keys means updating its converter — the standing cost of typed storage over generic.
- Provenance is `generated` on entities but `origin` on `Character`. A cursed object has its own
  `origin` and the clash was worse than the inconsistency. **Unify only at a real migration**,
  since that rewrites saved files.
- **Folders are real subdirectories**, and disk wins: the folder a file sits in on disk overrides
  the `folder` in its JSON, so reorganising in Explorer works. Rust validates every segment —
  depth, length, illegal characters, traversal.
- Saving a record whose folder changed **moves** it; `remove_strays` deletes the copy left behind.
- Field labels and order for reading come from `describeEntity()` in `domain/entities-display.ts`,
  not from the component. Add a field to an entity and add it there in the same change.
- `useLibrary` applies `visibleTo()` **once, before anything else sees the list** — the filtered
  array feeds the rows, the folder tree and the counts alike. Do not filter per-surface; a count
  computed from the unfiltered list is exactly how a higher-rank record leaks. Printing and
  markdown export both consume that same filtered array, which is what makes them safe.
- `EntityBase.image` holds a file name in the images folder, or `''`. Additive: records written
  before it existed parse with `''`, so no migration was needed. See the image rules in §9.
- **Bulk actions** (`components/library/BulkBar.tsx`) act on the *shown* selection, which is
  already `visibleTo()`-filtered, so no bulk action can reach a record the viewer's rank hides.
  Marks are kept by id and intersected with what is currently shown, so a mark stranded by a
  since-narrowed filter is not swept into a delete. Deleting asks twice; nothing else does.
- **`Curse` is an entity** (`vault/curses/`), following the shape in §4. It was added because a
  rolled curse previously had nowhere to go — `canSaveToVault` covers only sorcerers and curse
  users, and `entityFromDraft` had no curse case, so Save on a curse draft simply failed.
  Additive: a new kind and a new collection, nothing on disk needed rewriting.

---

## 5. The generators

### Contract

```ts
generateX(tables: TableSet, seed: string, constraints: XConstraints): XDraft
```

- **Deterministic.** Same tables + same seed + same constraints ⇒ byte-identical output. Use the
  seeded PRNG in `generators/rng.ts`. Never call `Math.random()`.
- **Pure.** No I/O, no clock reads, no Claude.
- **Complete.** The result must be immediately usable at the table with no AI step.
- Every generated entity **stores its seed and table version**, so any result can be reproduced or
  re-rolled identically later.

### Where canon lives

**Canon is bundled into the frontend at build time** (`import.meta.glob` over `data/canon/*.json`),
not shipped as a Tauri resource. That keeps resource-path resolution out of the app entirely, and
`data/canon/` stays version-controlled exactly as this section already required. The trade: editing
a canon file needs a rebuild. The user overlay is the live path, which is what it is for.

So `src-tauri/src/tables.rs` loads **only** the user's tables from `%APPDATA%/.../tables/`.

### Table format

A table file maps table ids to arrays of weighted, grade-filtered entries. One file may hold
several tables, and `data/schema/table.schema.json` is the authority:

```json
{
  "curse.form": [
    {
      "id": "amalgam",
      "value": "An amalgam of fused bodies, faces still moving under the surface",
      "weight": 3,
      "grades": ["grade-2", "grade-1", "special-grade"],
      "tags": ["body-horror", "crowd-origin"]
    }
  ]
}
```

`source` is **not** written by hand — the loader stamps every entry `canon` or `user`.

- `weight` — relative draw probability; omit for 1.
- `grades` — which grade bands may draw this entry; omit for all.
- `tags` — coherence filtering, and it is **implemented** (`coherentPool` in `generators/draft.ts`).
  The rule is one-sided: an untagged entry is always allowed, and a tagged one is dropped only
  when it shares no tag with what the draft has already drawn. So tags *exclude*, never require,
  and an untagged table behaves exactly as it did before. Write them as **affordances on the
  scene-setting entry and a requirement on the dependent one** — a location is tagged with every
  class it offers (`indoor`, `water`, `urban`…), a complication with the one class it needs.
  Field order in the spec therefore matters: a field is influenced by the ones above it.
- `source` — `"canon"` or `"user"`. Set automatically by the loader, not by hand.
- `note` — subtitle shown when an entry is **picked** from a list rather than rolled. Never part
  of the generated value.

**Pickable tables.** A field may offer a fixed list instead of a roll via `pickTableId` on its
`FieldSpec` — that is how the technique generator offers the 41 canonical techniques. A picked
entry overrides the roll and survives re-rolls, and its **first tag**, if it names a variant,
pins that variant.

Tables should be **detailed and numerous**. Sparse tables produce repetitive results and that is
the main failure mode of this kind of tool. When adding a table, aim for depth over breadth, and
write entries as evocative fragments rather than single words.

### Manual additions

The user must be able to add his own entries in two ways, both equally supported:

1. **In the app** — a table editor UI that writes to `%APPDATA%/.../tables/`.
2. **By hand** — opening those JSON files in an editor.

User entries are merged over canon by `id`. A user entry with an existing canon `id` **overrides**
it; a new `id` **adds** to the pool. Canon files are never rewritten. Validate user tables against
`data/schema/table.schema.json` on load and surface errors in the UI without crashing — a malformed
user table must degrade to "this file was skipped", never to a blank app.

---

## 6. Interaction model

The generator flow is **roll → review → expand → keep**:

1. User sets constraints (grade, type, any locked fields) and rolls.
2. Tables produce a complete draft, instantly, offline.
3. User can re-roll individual fields while **locking** others. Locking is essential — most of the
   value is in rolling one field twenty times while the rest holds still.
4. *Optionally*, user clicks **Expand with Claude** for prose.
5. User edits anything by hand and saves to the vault.

Every generated entity is editable after generation. Nothing the generator produces is immutable.

---

## 7. Claude expansion

### The rule that matters most

> **Claude writes prose. Claude never decides mechanics.**

The tables have already chosen the grade, the technique, the form, the drawbacks. Claude's job is
to turn that skeleton into evocative description. The response schema must contain **only prose
fields**. If Claude returns a different grade or invents a new ability, that is a bug in the schema
— fix the schema, don't accept the drift.

This keeps results reproducible, keeps the user in control of his own canon, and means the app is
never *dependent* on Claude being available.

### Invocation

Spawned from Rust (`src-tauri/src/claude.rs`) as a child process:

```
claude -p "<prompt>"
  --output-format json
  --json-schema <schema for this generator>
  --append-system-prompt-file prompts/system.md
  --disallowedTools "*"
  --permission-mode dontAsk
  --permission-prompts none
  --max-turns 1
  --max-budget-usd <per-call cap from config>
  --model <from config; default sonnet>
```

Flag notes — each of these is deliberate:

- **Never pass `--bare`.** Bare mode does not read the subscription login and requires
  `ANTHROPIC_API_KEY`. Dan is subscription-only; `--bare` would silently break that or start
  metered billing. This is the single most important line in this section.
- `--disallowedTools "*"` removes every tool from Claude's context. This is pure text generation;
  it must not touch the filesystem or run commands.
- `--permission-mode dontAsk` + `--permission-prompts none` — nobody is at a terminal to answer a
  prompt. Fail closed instead of hanging.
- `--max-turns 1` — with no tools there is nothing to iterate on.
- `--json-schema` gives validated structured output in the response's `structured_output` field.

### Response handling

Parse stdout as JSON. Relevant fields: `result` (text), `structured_output` (schema-conforming
object), `session_id`, `total_cost_usd`.

- **`structured_output` may be absent** — e.g. if Claude declined. Always check for it before use.
- Exit code 0 = success; non-zero = failure. Some in-run failures (such as auth problems) are
  printed as the *result* on stdout with exit 0, so check the payload too, not just the code.
- On any failure: keep the table-generated draft, show a non-blocking error, never lose the roll.

### Prompts

Live in `prompts/` as files, not as string literals in Rust or TypeScript, so they can be iterated
on without a rebuild. `prompts/system.md` holds the JJK tone and setting guidance; one
`expand-<entity>.md` per generator.

---

## 8. Usage guard

Driving Claude Code from the app consumes Dan's Pro subscription usage. The guard is **required**,
not optional.

Behaviour:

- **Warn** as usage approaches the configured threshold — visible in the UI, not just a log line.
- **Hard stop** at the cutoff. Expansion calls are blocked outright; the rest of the app keeps
  working normally, because the generators never needed Claude.
- **Log every call.**

Config lives in `config.json` with user-editable thresholds: calls per rolling window, cumulative
estimated spend, and per-call `--max-budget-usd`.

> **Be honest about the limitation in the UI:** the CLI does not expose how much subscription quota
> remains. `total_cost_usd` is a *client-side estimate of API-equivalent cost*, not a reading of
> subscription consumption. The guard is therefore a **local proxy** — call counts and estimated
> spend that the user configures — not a live quota meter. Do not label it as one.

Two logs, deliberately separate:

- `logs/claude-usage.jsonl` — granular, one JSON line per call: timestamp, generator, model, seed,
  estimated cost, duration, outcome.
- `logs/digest-YYYY-MM-DD.md` — human-readable daily summary.

---

## 9. Conventions

**TypeScript**
- `strict: true`. No `any`. No non-null `!` without a comment justifying it.
- Types for domain entities live in `domain/`, are exported from there, and are the single source
  of truth. Do not redeclare shapes locally.
- Prefer discriminated unions over optional-field soup.

**React**
- Function components, hooks. No class components.
- Components are presentational where possible; logic belongs in `domain/`, `generators/` or hooks.
- Keep files under ~300 lines. Split before that becomes a problem.

**Theming — this one is easy to break**
- **Never hardcode a colour.** Always use the token classes (`bg-void-900`, `text-ash-300`,
  `border-void-700`, `text-cursed-400`, `text-blood-500`). Every one of them is a CSS custom
  property the user can repaint from Settings.
- A hardcoded hex, a Tailwind stock colour (`bg-slate-800`), or `dark:` variants will all survive
  a theme change and look wrong. There is no `dark:` in this project — the theme *is* the mode.
- Themes derive fourteen tokens from six seed colours in `domain/theme.ts`. Add a token there and
  in `styles/index.css` together, or the two drift.
- `src/appearance.ts` is the only module allowed to touch `document` directly.
- Respect the accessibility settings: no animation that ignores `data-reduced-motion`, no
  removing focus outlines, no `px` font sizes in components (text must scale with the root).

**One scrollbar**

The shell owns the scrolling and nothing above it does: `html`, `body` and `#root` are
`height: 100%; overflow: hidden`, and the single scrollable region on screen is `<main>` in
`AppShell`. Without that the page scrolled *as well as* the main pane, so a long generator put
two bars side by side and neither moved what you were looking at. This is a desktop window, not
a document.

- Do not add a second `overflow-y-auto` that can be tall at the same time as `main` — a nested
  scroll is only right inside a pane that is itself height-constrained, like a master list.
- The `@media print` block releases it (`height: auto; overflow: visible`), because a printed
  sheet does need the page to grow.

**Printing — the one colour exception**

Sheets must come out as ink on paper whatever theme is active; the dark default would otherwise
print as a black rectangle, or get stripped by the browser and come out pale grey on white. So
the `@media print` block in `styles/index.css` declares its own four-token palette —
`--print-paper`, `--print-ink`, `--print-muted`, `--print-rule` — and that block is the **only**
place in the project allowed to name a colour literally.

The exception is that block and nothing else. Components still never hardcode a colour: they
carry `print-*` classes, and the print stylesheet supplies the ink. The chosen typeface is
deliberately *not* overridden, so OpenDyslexic on screen is OpenDyslexic on paper; only the text
*scale* resets, because a 1.5× reading scale wrecks A4 pagination.

- `domain/sheet.ts` is the pure printable model — `Sheet` → `SheetSection` → `SheetField`.
  Entities reuse `describeEntity()`, so a field added there prints with no further work.
- `hooks/usePrint.tsx` renders the queued sheets into a hidden root and calls `window.print()`.
  No PDF dependency: "Microsoft Print to PDF" is already in the Windows print dialog.
- Print hides app chrome with `#root > *:not(.print-root)`, so anything rendered beside the
  shell must sit inside `#root` or it will print.
- **A booklet is an export.** Anything printing more than one record prints an already
  `visibleTo()`-filtered list (§4a) — never the raw collection.
- More than one record gets a **cover page** (`bookletCover`, `PrintCover`): folder, a count
  per kind, the date, and the contents in printing order. One record gets none — a single
  sheet is its own cover.

**Images**

A record stores a **file name**, never the picture. The bytes live in
`%APPDATA%\jjk-rp-vault\images\`; `EntityBase.image` and `Character.portrait` hold the name, or
`''`. Two reasons: a vault file stays something Dan can open and read, and the same picture can
be shared by several records.

- Downscaling happens in the **browser**, in `services/images.ts`, before anything crosses to
  Rust — a canvas is already there, where resizing in Rust would mean an image crate. Longest
  edge 1024px; a GIF is stored untouched, because re-encoding one through a canvas keeps only
  the first frame.
- Reading returns a `data:` URL. That avoids registering the asset protocol and loosening the
  webview CSP just to show a portrait. `src-tauri/src/images.rs` carries a twenty-line base64
  encoder for the same reason — no crate for that.
- File names are **generated, then whitelisted** on the way back in. That whitelist is what
  stops a hand-edited record reading a file elsewhere on the disk, so do not relax it into a
  sanitiser.
- A missing file shows a gap in the UI and prints nothing. It is never an error — someone
  deleting a picture from the folder is a legitimate thing to do.

**Export templates**

Markdown export renders a record through a template. The templates are **files**, not string
literals, because Dan specifies the formats (CLAUDE.md §11, phase 2.4) and must be able to
change one in Notepad without a rebuild.

- Defaults ship in `data/templates/<kind>.md`, bundled at build time like canon. A file of the
  same name in `%APPDATA%\jjk-rp-vault\templates\` **replaces** it wholesale — this is an
  override, not a merge, unlike the table overlay.
- The syntax is a **Mustache subset** (`domain/template.ts`): `{{key}}`, `{{#key}}…{{/key}}`,
  `{{^key}}…{{/key}}`, `{{! comment }}`. Mustache rather than a dialect invented here, so the
  behaviour is something Dan can look up. No HTML escaping — the output is markdown.
- A section over a list repeats once per item, which is right for the items and wrong for a
  heading above them. `exportContext()` derives an `anyThing` flag for every list key; use
  `{{#anyComplications}}` for the heading and `{{#complications}}` for the rows.
- Template keys come from `domain/export-context.ts`. An entity's own string and string-list
  fields are exposed automatically under their real key names, so a new field is addressable
  with no change there — the same bargain `describeEntity()` makes.
- The in-app editor is `routes/settings/TemplatesSection.tsx`: edit with a live preview against
  a real record of that kind (a sample when the vault has none), the unused `{{keys}}` listed
  beneath. It writes the same file Notepad would, so both ways of editing stay interchangeable.
- `src/services/exports.test.ts` renders every shipped template against a fixture of each kind.
  A template is a file nothing typechecks, so that test is the only thing standing between a
  typo and a broken export. Add a record kind, add it there.

**Seeds, history, links and search**

Four small pure modules under `domain/`, each worth knowing before touching its surface:

- **`seed-words.ts`** — seeds are minted as word triples (`ash-gantry-nine`), because a seed is
  a label as much as a number: it prints on the sheet and gets read aloud between GMs. Nothing
  about determinism changed. **Any string is still a valid seed**, so every hex seed already
  saved reproduces exactly what it always did. Never "migrate" old seeds; there is nothing to
  migrate.
- **`history.ts`** — undo/redo as a past/present/future value, used by the generator draft and
  the character sheet through `hooks/useHistory.ts`. Pushes carry a `coalesceKey` so a run of
  changes to one field is **one** undo step; the vault keys this on which fields a patch
  touches. The shortcuts deliberately do nothing while focus is in an input — the browser's own
  undo is better there, and stealing it is infuriating.
- **`links.ts`** — cross-links between records. A link stores the target's **id and its name**:
  the live name wins when the target is found, and the stored one is what a dangling link shows
  so it reads as something fixable rather than a bare id. Links are one-directional and
  unenforced — deleting a target does not hunt down its referrers, because a folder of files
  someone reorganises in Explorer cannot promise referential integrity. Backlinks are computed,
  never stored. Characters may be link *targets*; only entities carry links.
- **`character-search.ts`** — the same thing for the vault, which had no search at all until
  Nov 2026: free text plus grade, faction, clan and has-a-portrait. The haystack is walked from
  the record rather than a hand-kept list, so an OC-template field is searchable the moment it
  exists — but `NOT_SEARCHABLE` keeps ids and timestamps out of it. Left in, they broke the
  all-terms rule: a search for `ito grade 1` matched the Grade **3** Ito, because the "1"
  landed in a uuid.
- **`entity-search.ts`** — free text plus grade, visibility and has-a-picture filters. It
  searches a record's own fields without being told which, to a bounded depth, so a new field
  is searchable the moment it exists — including a clan's seats and the things in its vault,
  which are objects inside objects. It keeps its own `NOT_SEARCHABLE` set for the same reason
  the character search does: an id left in the haystack breaks the all-terms rule invisibly.
  **It is not a visibility mechanism**: `visibleTo()` runs first and separately in
  `useLibrary`, and search narrows what rank already permits (§4a).

**Situations, duplicates and keyboard rolling**

- **`generators/situation.ts`** rolls a mission, the curse in it and the tool left behind from
  one seed. The curse is drawn at or *above* the posting (`gradeDrift`) because §4 says
  misgraded missions are the engine of these plots; the tool sits a rung below. That is a
  choice of which grade to roll at, not arithmetic on stats — the app still never calculates
  one. Saving writes all three and links them both ways (`hooks/useSituation.ts`).
- **`domain/similarity.ts`** flags a draft that closely resembles something already saved.
  Jaccard overlap of significant words, within the same kind only, shown as a note beside the
  save button. **Never a block** — two similar missions are often deliberate.
- **`hooks/useGeneratorKeys.ts`** — Space re-rolls unlocked, R rolls fresh, 1–9 toggle a
  field's lock, L/U lock or unlock all. Inert while focus is in an input, a button or a link:
  Space already means "press this" on a button, and stealing it would be worse than having no
  shortcuts. The legend on the panel is part of the feature; an invisible shortcut is unused.

**Feeding in your own writing**

`domain/harvest.ts` reads missions and techniques Dan has written and adds fragments of them
to the tables, so rolls draw on his vocabulary. Say plainly what this is: **nothing is
trained.** The generators are deterministic table rolls; "more accurate generation" means his
lines are in the pools.

- A fragment is placed **only from structure he wrote** — an inline `Label:`, a `##` heading, or
  one of the server's own decorated headings (`➤ 『𝐃𝐄𝐒𝐂𝐑𝐈𝐏𝐓𝐈𝐎𝐍』`, `«𝐆𝐞𝐧𝐞𝐫𝐚𝐥»`,
  `` `[ Extensions ]` ``) — matched against the generator specs, so the mapping cannot drift
  from the fields that exist. Anything else is returned unassigned for him to place or discard.
- ⚠️ **`normaliseLabel` must NFKC-normalise before stripping to `[a-z0-9]`.** Discord headers are
  typed in mathematical alphanumerics — `𝐃𝐄𝐒𝐂𝐑𝐈𝐏𝐓𝐈𝐎𝐍` is U+1D403 and friends, not ASCII `D` —
  so stripping first reduces every one of them to the empty string and nothing ever matches.
  That was a real bug: the harvester could not read a single one of Dan's actual postings.
- A heading's parenthetical guidance is ignored, so `𝖮𝖡𝖩𝖤𝖢𝖳𝖨𝖵𝖤𝖲 (typically 1-3)` still finds the
  objectives table. Code fences are skipped as punctuation, so a fenced briefing is still read.
- Field **labels match the server's wording** where they differ — the mission type field is
  labelled "Mission type", not "Type", so a pasted `Mission Type:` line lands somewhere. Keys
  are untouched when a label changes.
- **Do not add a keyword guesser.** Filing "the client was nervous" under `client` because it
  contains the word produces tables full of near-misses, and nobody audits a hundred of those.
  An unassigned fragment is a better outcome than a wrongly assigned one.
- Approved entries go to one user table file, `my-material.json`, with ids derived from the
  text (`mine-<slug>-<hash>`), so re-importing is idempotent and deleting that one file undoes
  the whole import. Canon is never touched (§5).
- `tables.rs::save` validates the JSON before writing. Writing a malformed user table from the
  app would degrade it to "this file was skipped" by its own loader.

**Clans**

A clan is an **editable entity** (`vault/clans/`), not a registry. It was a hardcoded constant
in `domain/clans.ts` until Dan asked for an editor; making it a record means it inherits
folders, cross-links, search, visibility, print and both export formats with no special-casing
— the same bargain `Lore` and `Curse` made — and lets a seat point at the character sitting in
it. Content is Dan's: the Masami Clan document, 9 Nov 2026.

- ⚠️ **It records a bonus. It does not apply one.** §4 is unconditional, so ticking "clan bonus
  applies" marks that the bonus is live and puts the numbers on screen beside the stat block;
  it touches no Class. That is also the direct answer to double-counting: Walker's
  `+2 Speed / −2 Strength` are already in his stats because they were typed there, and the
  tick adds nothing to them — it only stops the sheet being silent about *why* they are what
  they are. A `ClanModifier`'s `direction` is read off the sign for **colour only**.
- ⚠️ **A clan has no `grade`**, the second kind after lore. Go through `entityGrade()`.
- **The shapes live in `domain/entities.ts`**, not in `clans.ts` — `Clan extends EntityBase`,
  so declaring it beside its constructor would make the import circular. Same split as `Lore`
  (type in `entities.ts`, `createLore` in `lore.ts`). `clans.ts` re-exports them so existing
  imports still resolve.
- **The helpers take the clan list.** `describeClanBonus(clans, name)` and friends are pure and
  cannot read the vault, so whoever has the clans loaded passes them in — `ClansProvider`
  (`hooks/useClans.tsx`), one load for the whole window, shared by the character sheet, the
  printed sheet and both exports. Given no list they return nothing, which is exactly what a
  hand-typed clan with no record already did. `characterSheet`, `exportContext`, `buildSheet`
  and `renderRecord` all take it as a trailing optional argument for that reason.
- **The Masami are seeded into an empty collection on first run** (`masamiSeed`), so the editor
  opens on something real and the clan Walker's sheet names resolves. Once saved it is an
  ordinary record — edited, renamed or deleted like any other, and never written over again.
  Skipped the moment the collection holds anything, or a file failed to parse: seeding over a
  vault whose one clan file has a typo in it would look exactly like losing it.
- **Mutations are a list.** A character may carry several, so `Character.mutations` holds ids
  and the UI is checkboxes rather than a single dropdown. An id matching no mutation renders as
  itself instead of vanishing (`describeMutations`), for the same reason a dangling link shows
  its stored name: deleting a mutation must not silently empty a saved sheet.
- **Clan stays free text on the character.** The records supply suggestions and the bonus block
  appears only for a clan that has one; a hand-typed clan is perfectly valid and simply has no
  record yet. ⚠️ The consequence: **renaming a clan record does not retarget the characters**
  pointing at its old name. The members roster says so on screen.
- **A seat is a position, not a person.** `tier` is the rung and several seats share one — one
  Clan Head above five Archangels. Emptying a holder leaves the seat behind. `holderId` links
  to a character where one exists, and because it is not an `EntityLink` the dangling-link
  check cannot see it — hence the `orphan-seat` problem in `domain/problems.ts`.
- **Prevalent members are separate from the hierarchy.** Akira Masami held the Clan Head seat a
  thousand years ago and the seat outlived her, so `figures[]` carries the biographies the clan
  document actually contains. Most of a clan's history has no character sheet behind it.
- ⚠️ **The clan vault's money is free text and nothing totals it.** Same reasoning as Cursed
  Rating (§4): a total computed here would eventually disagree with the one the clan has. A
  holding may point at a saved cursed tool or object by `recordId`, or at nothing at all.
- **The members roster is computed, never stored** — characters whose clan field names this
  clan. Same reasoning as backlinks (§9).
- **Filling a seat** rolls a sorcerer from the existing tables (`rollDraft(SORCERER_SPEC…)` →
  `draftToCharacter`), saves it as an NPC with the clan set and the bonus ticked, writes the
  name into the seat and links the clan to it. The NPC's stats come out at Class 3 of the
  rolled grade, as every generated NPC's do — nothing here calculates one.
- There is **no `clan.discord.md`**. Only mission, technique and character have a server
  posting format; a clan falls back to the readable template, which is what `templateFor` is
  for.
- None of this lives in `data/canon/`, because every file there is parsed as a roll table by
  `import.meta.glob` (§5). A named tool or technique *can* — as a pick list, like
  `technique.canonical` and `cursed-tool.canonical`.

**Importing a submitted sheet**

`domain/oc-import.ts` reads a sheet in the server's own OC format back into a character — the
inverse of `character.discord.md`, and the piece that turns this from Dan's tool into the
server's. Three things keep it honest:

- ⚠️ **Section-aware, because the template says *Affiliation* twice** — the school under
  «Personal», the side under «Sorcerer Profile». A flat label map silently puts one in the
  other's field. Every label is looked up under the heading it appeared beneath, and
  `oc-import.test.ts` pins exactly that.
- **NFKC first**, through `normaliseLabel`, for the same reason the harvester needs it.
- **Nothing is guessed.** An unknown label is *reported*, not filed somewhere plausible — the
  same rule as the harvester's refusal to add a keyword guesser.

A value runs from after the colon to the next label or heading, so a multi-paragraph backstory
survives. `statFromText` is tolerant by design: the template tells players to write the bonus
in brackets beside the stat, so `C3(+2 from [Inhuman Physicality](link))` is normal input and
is read as C3, not as a failure. The result is a **patch**, merged over a fresh character and
then run through `parseCharacter` — the vault's own reader, so an imported record is validated
exactly like one off disk — and it lands as an unsaved draft. Nothing reaches the disk until
Dan looks at it, which is the point of the review panel beside the paste box.

**The problems panel**

`domain/problems.ts` finds what is quietly wrong: dangling links, pictures whose file is gone,
two records of one kind sharing a name, unnamed records, characters over their slot limits, and
a clan seat still claiming a character who has been deleted (`holderId` is not an `EntityLink`,
so the dangling-link check cannot see it).
Nothing here is new information — the value is that nobody goes looking, and each of these is
harmless until the worst moment.

- **A problem is a note, never a block.** Several are legitimate on purpose: a character over
  slots is a soft warning by design (§4) and a missing picture is "never an error" (§9). A
  checker that nagged about deliberate choices would be switched off within a week, and then
  it would not be there for the one that mattered.
- Image names are **passed in**, not read — the module is pure. `null` means the caller could
  not find out, and the picture check is then skipped rather than reporting every record as
  broken. `images::list` in Rust is what supplies the set.

**Mission difficulty**

`domain/difficulty.ts` holds the server's three tiers — **Easy, Medium, Hard** — plus an
editable **Custom**. Each decides how many objectives and complications a posting rolls, how far
above the posting the real threat may sit, the default slot count, and three buckets of rewards.
**The amounts are Dan's own**, supplied 9 Nov 2026, with his summaries kept as the descriptions:

| Tier | Shape |
| --- | --- |
| Easy | Low CR (max 50), very little TP if any (max 3), a **Grade Up for Grade 2 and below**, and more slots (6) to let lower-grade characters in. No money. |
| Medium | High CR (150–200), medium-high TP (max 6–8) — the rare resource, and what really sets the difficulty — money capped at 50,000 Yen so the economy grows slowly, and one **Gold** chest to the MVP. |
| Hard | Low base, most of the reward behind completing **every** objective, the rest in the referee's MVP award with a **Diamond** chest. Should almost guarantee a character death. |

- **Three buckets, because the server pays three ways.** `base` for taking part, `objective`
  only if every objective is completed, `mvp` decided by the referee at the end — and not given
  at all if the event concludes early. They are separate fields rather than one list because
  the host multipliers do arithmetic on them and a GM edits one without disturbing the others.
- **A chest is a tier, not a count** — Wooden → Iron → Gold → Diamond. Gold is normally the
  highest handed out; Diamond is Hard's. A bucket's chest renders as "1 Gold chest".
- **Host payout.** Primary hosts (who made and ran the event) take 3×, secondary hosts 2×.
  **Chests are never multiplied**, and neither is a Grade Up; the output says so in its own
  closing line. The multipliers live in `Settings.hostRewards`.
  ⚠️ `basis` is the one genuinely ambiguous part — "3x rewards" could mean three times the base
  package or three times everything a clearing player sees. It defaults to **base only**, the
  conservative reading, and is a setting so the other reading is one click away. Ask before
  changing the default.
- **Rewards are bands, not tables**, and that is the one place in the project where a generated
  number is arithmetic rather than a draw. The reason is in the file's own header: what a
  posting pays is a range, not a list of evocative fragments, and a table per tier per bucket
  would be files of numbers nobody would read. `generators/rewards.ts` rolls them,
  deterministically, each bucket against its own derived seed so adding a reward to one does
  not shift the numbers in another. Money is rounded to the nearest thousand, because a payout
  of 23,117 Yen reads as a bug.
- **This is not the stat calculator §4 forbids.** Nothing here reads or writes a stat;
  `gradeDrift` picks *which grade to roll at*, exactly as `generators/situation.ts` already
  does, and the rest is currency.
- ⚠️ **Hard's slot count was not supplied** and is a guess (4, between Easy's 6 and Medium's 4).
  Everything else in the three tiers came from Dan directly.
- `settings-parse.ts` merges a partial edit onto the shipped preset by id, so changing one band
  does not lose the rest, and a fifth preset added by hand survives. Host multipliers are
  clamped, and `gradeUpMaxGrade` treats an explicit `null` as "no Grade Up" while absence keeps
  the default.
- Difficulty reaches the engine through `RollConstraints.counts`, a general per-field count
  override kept on the `Draft` so a re-roll honours it. A spec's own `count` stays the default.
- **Switching difficulty rewrites the derived parts immediately** — the three reward buckets and
  the slot count, which the preset decides outright. It deliberately does *not* re-roll the
  objectives or complications: those counts apply to the next roll, because silently discarding
  fields someone locked or edited is worse than a posting whose objective count lags its tier.
- An empty reward box shows the preset's own midpoints as greyed placeholder text
  (`exampleRewardLines`), so an admin writing a posting by hand can see what the tier expects.
  Midpoints and not a roll: a placeholder that moved every render would read as a value.

**Two export formats**

Export renders through one of two template sets, chosen per export:

- `plain` — the readable markdown the app has always written. For Obsidian, for paper, for
  anything read as a document.
- `discord` — the server's own posting format, corner brackets and code fences and all, so the
  file pastes into a channel unchanged. Templates are named `<kind>.discord.md`.

Neither is a lossy version of the other: one is arranged for a page, the other for a channel.
Only **mission, technique and character** have a Discord template, because those are the three
formats the server actually has; anything else falls back to the readable one rather than
writing an empty file. `templateFor()` is where that fallback lives, and `exports.test.ts`
covers both sets.

`components/DiscordPreview.tsx` shows what the export will write **before** it writes it, from
the generator panel and from the library. It renders through `templateFor` and `renderRecord` —
the very same path the export uses, not a second one — so a preview that looks right cannot be
followed by a file that does not, and it offers both formats and a copy button, because a
posting goes into a channel far more often than it goes onto disk.

GM-only lines — the true situation, the veil, support, notes, the host payout — are written into
the Discord output inside `||spoilers||` rather than dropped. The record is already rank-filtered at the
publish boundary (§4a); this is about not spoiling a posting for the players reading it.

**Obsidian vaults**

Export writes an Obsidian vault; import reads one back. Any local folder, which is what makes a
Drive- or OneDrive-synced folder work with no network code (§1).

- **Frontmatter is identity and filing; the body is content, one `## Heading` per field.** All
  of frontmatter round-trips perfectly but reads badly in Obsidian; all of body reads well but
  cannot round-trip, because nothing says which paragraph was which field. The split is the
  compromise, and the failure mode — a renamed heading — loses one field, not the record.
- Headings are the labels from `describeEntity()`, so the exporter and the importer read the
  same source and cannot drift apart. That is why `EntityField` carries a `key`.
- **Import merges onto the record already in the vault; it never constructs one.** A note whose
  id matches nothing is *reported*, not invented. A note without the `jjk-vault` marker is
  someone's own note in the same vault and is left strictly alone.
- `NEVER_MERGED` in `obsidian-merge.ts` holds `grade` and `links`, and the merge skips any
  property that is not a string or a string list. Both guards matter: `grade` reads as
  "Grade 2" but stores `grade-2`, and a technique's `shikigami` is objects rendered as text.
  Without them an import corrupts typed fields with display strings.
- Links are wikilinks in frontmatter, **quoted** — a bare `[[x]]` is a nested flow sequence in
  YAML. They are not written into the body as well, or import could not tell which copy wins.

**Backups and the export folder**

- `backup.rs` makes a **dated folder copy**, not an archive. A zip needs a crate or a
  hand-rolled zip writer and buys nothing: a folder drags onto a stick, opens in Explorer, and
  restores by copying back. Backups live inside the data folder and are skipped when copying
  it, or each would contain every one before it.
- **Restoring** replaces the data folder with a backup, and takes a safety backup *first* so a
  mistaken restore is undoable. It clears the live files before copying, so the result is the
  backup exactly rather than the backup merged over what was there. `backups/` is never
  touched by either operation. The app does not reload itself — tell the user to restart.
- `Settings.exportDirectory` sends markdown exports somewhere else — a shared folder another GM
  can read. It must be absolute and is created if missing. A text field, not a picker: the
  native-dialog plugin was declined (phase 2.3).
- Neither is an exception to §1. There is still no cloud, no sync and no account; these just
  make moving data off the machine something the user does deliberately.

**Insignia and the faction themes**

- Three presets — `sorcerer`, `curse-user`, `curse` — sit alongside the others and go through
  the same derivation and the same contrast checking. A theme with a story is not an excuse for
  one that cannot be read; the test holds every preset to AAA body text.
- **Record kinds are told apart by shape, not colour** (`domain/insignia.ts`,
  `components/Insignia.tsx`). Eight fixed accents would be eight hardcoded hex values, every
  one of which survives a theme change and looks wrong. A glyph also works for a colour-blind
  reader and in a monochrome print. Everything inherits `currentColor`.
- Themes never change on their own. A palette shifting as you move between records was
  considered and rejected as disorienting; `FACTION_THEME_FOR` is a suggestion the UI may
  offer, not something that applies itself.
- The **background image** is a fixed pseudo-element behind everything, with opacity capped at
  `BACKGROUND_OPACITY_MAX` and blur on by default. The cap is an accessibility guarantee, not a
  style preference, and it is enforced in `settings-parse.ts` as well as in the slider — so
  hand-editing `config.json` cannot wash out the text. It never prints.

**Accessibility**
- Two faces are **vendored** in `src/assets/fonts/` — OpenDyslexic and Atkinson Hyperlegible,
  both SIL OFL 1.1. The licence files sit beside them and must stay there and ship with any
  build. Never swap these for a CDN link; that would break the offline rule.
- Any action whose result appears somewhere other than the focused element must announce
  itself: `useAnnouncer().announce('…')`. Rolling, saving and deleting are otherwise silent to
  a screen reader. The ARIA live region is always active; the spoken voice is opt-in.
- There is exactly one live region, rendered by `AnnouncerProvider`. Do not add more.

**Rust**
- Tauri commands are thin: validate, call a module function, return. No business logic in `main.rs`.
- Return `Result<T, String>` with messages that are safe and useful to show in the UI.
- Never panic on user data. Malformed JSON is an error to surface, not a crash.

**Testing**
- `domain/` and `generators/` have unit tests. They are pure, so there is no excuse.
- Every generator needs a determinism test: same seed ⇒ same output.
- UI and Rust I/O are not unit-tested unless asked.

**Git**
- Conventional commits: `feat:`, `fix:`, `refactor:`, `data:`, `docs:`, `chore:`.
- Use `data:` for table content changes so canon edits are easy to find in history.

---

## 10. Working agreements for Claude

**Ask before:**
- Adding **any** npm or cargo dependency. The dependency list stays short and deliberate.
- Changing anything in `domain/` — schema changes cascade through every module and every saved file.
- Editing `data/canon/**`. That is Dan's canon, not yours. Propose entries; let him approve them.
- Writing a schema migration, or anything that touches already-saved vault files.
- Filling in a *TBD* in §4. Those are house rules. Guessing them produces a plausible-looking
  system that is wrong, which is worse than an empty section.

**Never:**
- Add network calls, telemetry, cloud sync, or an account system.
- Pass `--bare` to `claude`.
- Call Claude from inside a generator.
- Write to `data/canon/` at runtime.
- Introduce a UI component library without being asked.
- Reach into the FoundryVTT 5e module or the old web vault for schemas or mechanical content.
  (The technique names and flavour lines in `technique-canonical.json` are the one approved
  import — see §1. Anything further needs asking.)

**Always:**
- Keep the app fully functional with Claude unavailable.
- Preserve the user's roll on any failure.
- Prefer adding table depth over adding features. A generator with rich tables beats a generator
  with more knobs.

---

## 11. Roadmap

| Phase | Deliverable |
| --- | --- |
| **0** | Tauri 2 + React/TS/Vite/Tailwind scaffold. Window opens, routing, theme, empty module shells. |
| **1** | Domain types (pending §4 answers) + vault CRUD on disk + character sheet UI. |
| **2** | Table loader with user overlay, seeded RNG, all four generators — tables only, no AI. |
| **3** | Claude expansion + usage guard + both logs. |
| **4** | In-app table editor for manual additions; JSON import/export. |
| **5** | Polish: search, filtering, portraits, print/export sheets. |

Requested after the original plan, and slotted ahead of 3–5:

| Phase | Deliverable |
| --- | --- |
| **2.1** | Settings: theme presets, custom palette with live WCAG contrast, accessibility. ✅ |
| **2.2** | Technique generator (extensive) and Shikigami generator. ✅ Engine gained **variants** (`{variant}` in a table id routes to per-type tables, falling back to `*.common.*`) and **grade gating** (`minGrade` — a Maximum Technique only exists from Grade 1 up). Attaching a rolled technique to a vault character ✅ — `domain/attach.ts`, a copy rather than a link (§12.7 is still open). |
| **2.3** | Images on every generator and on characters. ✅ File input and drag-and-drop — **no** native-dialog plugin; that was declined to avoid the dependency. See the image rules in §9. |
| **2.4** | Markdown export for every entity. ✅ Templates live as editable files, not string literals, because Dan will specify the formats later. See the template rules in §9. |
| **2.5** | Printable sheets, and PDFs through the system print dialog. ✅ One record, or a whole folder as a booklet. No PDF dependency; see the printing rules in §9. |
| **2.9** | v0.3.0, renamed *The Next Generation — GM and Admin Tool*. ✅ Feeding Dan's own missions and techniques into the tables (§9), plus the repo's `.gitignore` and README for publishing. |
| **2.8** | Obsidian vaults (export and import, any local folder — the Drive answer, see §1), the three faction themes, per-kind insignia, and a custom background image. ✅ |
| **2.7** | Second quality-of-life pass. ✅ Tag coherence made real, technique tables for all eleven types, the Situation roller, duplicate warnings, keyboard rolling, restore-from-backup, the in-app template editor, and booklet covers. `Curse` became a saveable entity along the way. |
| **3.0** | The server's own formats. ✅ The character record became the OC template (§4), missions gained the posting format with rolled objectives and rewards, markdown export gained a second Discord-format template set chosen per export, and the harvester learned to read all three — NFKC folding plus the decorated headings, without which it could not read a single real posting. Difficulty then landed properly: Easy / Medium / Hard with Dan's own CR, TP, Yen and chest amounts, three reward buckets, Grade Ups, and the 3×/2× host payout (§9). Then the posting controls — a recommended-grade picker, slot steppers, a faction the posting is open to, placeholder rewards from the tier — plus an export preview, and the double scrollbar fixed. |
| **3.3** | The Clan editor. ✅ Clans became an editable entity (§9) with a board and a full editor: hierarchy seats by tier, bonus and mutation editing, a clan vault of money and holdings, the clan's own history and its prevalent members, a computed member roster, and **rolling an NPC straight into an empty seat** from the existing sorcerer tables. The Masami seed carries the whole clan document rather than just its numbers. `ClansProvider` loads the clans once for the window, so the character sheet, the printed sheet and both exports resolve a bonus against the same records. |
| **3.2** | The Masami Clan. ✅ A clan registry with bonuses and mutations (§9), a clan-bonus tick box and multi-select mutations on the sheet, and the **Holy Sinner's Blade** as a pickable canonical cursed tool — written into the vault and linked to Walker, with his stats left exactly as he had entered them. |
| **3.1** | The admin half. ✅ Importing a submitted OC sheet (§9), the mission log with SUCCESS / FAILURE / MVP tags and a CR line, search and filters in the vault, **Lore** as a real entity with a board of its own, the problems panel, and bulk actions in the library. |
| **2.6** | Quality-of-life pass, v0.2.0. ✅ Word-triple seeds, undo/redo on both editing surfaces, library search and filters, cross-links between records, backups, and a configurable export folder. See §9. |

Phases 0, 1 and 2 are done. The remaining *TBD* items in §4 (slot formula, awakenings, binding
vows) are additive — they add fields to a character, they don't reshape one — so they can land in
a later phase without a migration.

Canon table content is written in **batches for Dan's approval** (§10), never dropped in
wholesale. Batches 1 and 2 covered every table thinly. **Batch 3** (31 Oct 2026) was the depth
pass on the tables that get rolled most — missions, sorcerers, curse users and curses — taking
canon from roughly 400 entries to just over 1,000. **Batch 4** (9 Nov 2026) wrote the six
tables each for the nine technique types that had been falling back to `technique.common.*`,
plus coherence tags on mission locations and complications: 1,370 entries in all.

**Batch 5** (9 Nov 2026) was small and came with the format rework: `mission.objective` (34
entries, grade-filtered and coherence-tagged against the location classes) and one addition to
`mission.type` — **Extermination**, which is the server's own word for a clearing job and sits
beside Exorcism rather than replacing it. Both are **proposed, not approved**; revert either if
they are wrong.

**Batch 6** (9 Nov 2026) was the depth pass on the three kinds left at batch-1 depth: cursed
objects 49 → 168, cursed tools 54 → 184, shikigami 72 → 212. Canon now holds **1,794 entries**.
As always these are **proposed, not approved** — read them and cut what does not sound like the
server.

**Batch 7** (9 Nov 2026) added `cursed-tool.canonical` — named tools from the setting, picked
rather than rolled, the same mechanism as the 41 canonical techniques. It holds one entry so
far, the **Holy Sinner's Blade**, which is Dan's own writing rather than proposed content.

No table is now at batch-1 depth. The next content job is whatever rolls badly in play.

`src/generators/canon.test.ts` guards the content: it rolls every generator at every grade and
fails on a blank field, a missing table, too little variety across sixty seeds, **a technique
type with no tables of its own**, or two types producing the same principle at one seed. Run it
after any `data:` change — table files are data that nothing typechecks.

---

## 12. Open questions

Still open, none blocking:

1. **Does Civilian Grade subdivide into Classes**, or is it a flat floor?
2. **Ceiling behaviour** — is there anything above `AG[C1]`?
3. **Arts** — what distinguishes an art from an innate technique?
4. How are **grade promotions** handled — do characters advance in play?
5. Should **player characters and NPCs** share one schema with a flag, or be separate types?
6. Are **cursed tools owned by a character** references into a shared registry, or embedded
   copies? Cross-links (§9) now cover the *reference* case without deciding this — a character
   can be linked to a tool without owning it.
10. **The technique format has fields the technique record does not.** The server's layout has
    `` `[ Reversal ]` `` and `` `[ Imaginary ]` `` lines, and breaks a Domain Expansion down
    into Type / Range / Effect Type / Refinement. `technique.discord.md` already has blocks for
    all six, rendering nothing until the fields exist — adding them to `domain/entities.ts` is
    additive and about an hour's work, but it is a §10 schema change and needs asking first.

Deferred by Dan — leave the fields, build nothing on them:

7. **Trait/art slot formula** across grades and awakenings (Grade One = 3/3 is the known anchor).
8. **Awakenings** — structure and how they are acquired.
9. **Binding vows** — "much later."
