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
| **Traits** | Write a perk once — effect, cost, source, slot — and put it on any sheet |
| **Defects** | The same for drawbacks, and what taking one gives back |
| **NPC Generator** | Generate a Sorcerer, Curse User, or Curse |
| **Technique Generator** | Cursed techniques by type; shikigami techniques bring their own shikigami |
| **Mission Generator** | Generate a graded mission with location, target, complications and payout |
| **Bounties** | Generate a bounty posting in the server's format — two grades, pings, objectives and a purse |
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

Target platform: **Windows**, on **ARM64 and x64**. No Linux and no macOS build to maintain —
do not add conditionals for those unless asked.

⚠️ **x64 was added 10 Nov 2026** so the server's other staff could test on ordinary machines;
until then ARM64 was the single target. The two differ only in the Rust target triple. Nothing
in the app is architecture-aware and nothing should become so: if a change needs a `cfg` on the
architecture, that is a sign something is wrong, not a thing to add.

Dan's own machine is ARM64. Building x64 there is a cross-compile and needs both the Rust
target and the **x64 MSVC toolchain component** in Visual Studio Build Tools — the ARM64
component alone will not link it.

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
npm run tauri build      # installer for this machine's own architecture
npm run build:x64        # installer for Intel/AMD  (cross-compile from the ARM64 machine)
npm run build:arm64      # installer for Windows on ARM
npm run test             # vitest — domain + generators only
npm run typecheck        # tsc --noEmit
npm run version:set 0.4.0  # set the version in all three files that carry one
npm run release 0.4.0      # version, commit, tag, push — GitHub builds both and drafts a Release
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
│   └── missions|bounties|curses|cursed-objects|cursed-tools|techniques|shikigami|
│       lore|clans|traits|defects/
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

**Effective reserves** (Dan, 10 Nov 2026): **every grade CE Efficiency sits above CE Output is
one more stage of reserves** — Deep becomes Bottomless at one grade up, Abysmal at two.
Efficiency at or below Output changes nothing; the rule only ever adds, and it stops at
Endless while still reporting the grades that ran past it.

- ⚠️ **Derived for display, never written back.** `effectiveReserves()` in `domain/stats.ts`
  returns a second value to show beside the stored band; `stats.ceReserves` stays exactly what
  Dan typed. That is the line between this and the stat calculator forbidden above: nothing
  reads a trait, sums a modifier or changes a stored stat. It restates two stats he entered by
  a rule he stated, and a reader can check it at a glance. It is hidden entirely when the two
  stats are level, so an ordinary sheet reads as it always did.
- Rungs are counted on the **full ladder, implied rungs included**, because gap counting
  depends on them — Grade Semi-2 to Grade 2 is one grade, not nothing.
- A Civilian stat yields no shift either way: Civilian Efficiency cannot outrank anything, and
  Civilian Output would make every grade above it a step, which is far more likely a
  half-filled sheet than a real reading.
- Dan's own documents sometimes write CE Efficiency as a **plain count of grades above
  Output** (`0`, `1`). That is shorthand for this rule, not a second way of storing the stat —
  the record keeps `Grade[Class]`, confirmed twice (9 and 10 Nov 2026).
- ⚠️ A reserves band is sometimes written with a **`+`** (`Shallow+`, `Average+`, `Abyssal+`).
  Dan treats that narratively as a half-step and **does not want it in the enum** (10 Nov
  2026). Keep the six bands; put the `+` in a record's own free text where it appears.

**Black Flash** (Dan, 10 Nov 2026) — `domain/black-flash.ts`:

- **+2 Grades to Strength** for the attack, dropping to **+1 Grade** once the character is
  **Semi-Special Grade or above**. ⚠️ Measured on the **character's own grade**, not on
  Strength's: a Grade 2 sorcerer with freakish Special Grade Strength still gets the full +2.
- **+1 Class to every graded stat for 5 turns**, Strength included — it takes the grade jump
  *and* the class step. CE Reserves is excluded, being a band rather than a `Grade[Class]`.
- RCT fatigue resets. Narrative; nothing models it.
- The turn count is **stated, not tracked**. A timer would need the app to know a fight is
  happening, which it does not and should not.

- ⚠️ **Derived for display, never written back**, exactly like effective reserves above, and
  confirmed the same way. The arithmetic goes through `applyModifier` — the house rules' own
  carry rule — rather than a second implementation that could drift from it: a class is one
  tier, a grade is five, `G4[C1] +2 classes` is `G3[C4]`, and the top clamps at `AG[C1]`.
- ⚠️ **There is no damage figure anywhere in it**, and there must not be. Dan asked for a
  "Black Flash damage calculator"; what he described was a stat buff, a counter and a
  narrative note, and that is what was built. Damage stays the referee's call (§4, above).
- A **Civilian stat comes back unchanged** and is marked as not having moved, because §12.1 is
  still open on whether Civilian Grade has classes at all. Nothing is invented to fill it.
- The log is `Character.blackFlashes[]`, additive, alongside the older `blackFlashCount`.
  ⚠️ **The total is the count plus the entries** (`blackFlashTotal`): recording one through the
  sheet appends an entry and leaves the count alone, so the two can never double-count and an
  old sheet keeps the number it already had. The count's field is labelled "Black Flashes
  before the log" for that reason.

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

**The trait system** was supplied 11 Nov 2026 and is no longer a guess. Traits are perks bought
with **Trait Points**: a character starts with **12** and earns more from attending events,
completing missions, giveaways and other methods. Each trait sits at one of six **rarities**,
and the rarity fixes the price:

| Rarity | TP | |
| --- | ---: | --- |
| Basic | 5 | |
| Uncommon | 6 | |
| Rare | 7 | |
| Exotic | 8 | |
| Legendary | 10 | Requires **Admin** permission; a roleplay sample when claiming |
| Extraordinary | 12 | Requires **Owner** permission; a roleplay sample when claiming |

Two tags sit beside the rarity rather than among them. **Inherent** — you have to start with
this trait. **Developed** — you have to develop it in play alongside earning a Feat. A trait
listed as neither "can still be started with but may also be developed later on", which is the
`either` default. Developing one later needs a free trait slot, the points, and a roleplay
intense enough to justify it.

⚠️ **Nothing totals the Trait Points**, confirmed by Dan when this landed. The balance is
tracked on the Discord server, so the app quotes a cost and never sums one — the same refusal
`cursedRating` makes in this section, and for the same reason: a total here that disagreed with
the one on Discord would be worse than no total at all.

⚠️ **Defects are a separate system and its rules have not been supplied.** The screenshots cover
traits only. A defect therefore has **no rarity and no fixed cost** — giving it one so the two
types line up would invent half a system (§10). See **Traits and defects** in §9.

⚠️ **TBD, Dan will supply later:** the slot formula across grades and awakenings, what an
awakening is structurally, what distinguishes an art from an innate technique, and the defect
rules. **Binding vows are deferred to much later** — leave the field, build nothing on it.

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

**Bounty**
`grade` (the threat it is posted at) · `targetGrade` (what the target is actually ranked) ·
`target` · `conspicuousity` · `state` · `pings[]` · `crime` · `briefing` · `warning` ·
`objectives[]` · `rewards[]` · `issuer`

⚠️ **The two grades are different questions and both stay.** Dan's own example posts a Special
Grade sorcerer as a Disaster Grade threat and says so in the posting's text — the gap is the
point, not an inconsistency to reconcile. See **Bounties** in §9.

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

**Shikigami**

`ShikigamiCore` carries the rolled fields, and both the standalone `Shikigami` entity and the
`EmbeddedShikigami` inside a technique extend it. Two fields were added 10 Nov 2026 for the Ten
Shadows rework, both additive so saved records still parse:

- **`stats`** — a `StatBlock` of its own, or **null** for one nobody has statted. Null rather
  than a default block, because absence is information: a generator rolls a grade and nothing
  else, so a rolled shikigami genuinely has no stats until somebody writes them, and a sheet
  full of Class 3s would claim otherwise. Read through `parseStatBlock`, the character's own
  parser, so a shikigami's stats are validated exactly like a sheet's.
- **`addendum`** — free text for what the stat block has no field for. "Divine Dog goes to
  Grade One in Totality", "Conditional True Dura Neg to Domains". ⚠️ **Dura Neg is a real
  mechanic with no written rules yet**, so it stays prose until Dan supplies them; guessing a
  shape would produce a plausible system that is wrong (§10).

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

Missions, bounties, curses, cursed objects, cursed tools, techniques, shikigami, lore,
clans, traits and defects are stored as **typed entities**
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

**Bounties**

A bounty is an entity (`vault/bounties/`) with a generator behind it, shaped to the server's
own posting — the format in Dan's screenshot, 10 Nov 2026.

- ⚠️ **Two grades, and they are not the same thing.** `grade` is the threat the bounty is
  posted at; `targetGrade` is what the target is actually ranked. Dan's own example posts a
  Special Grade sorcerer as a Disaster Grade threat and says so in the text. `threatNote()`
  writes that sentence, once, for both templates and the panel — the gap is the point.
- ⚠️ **`targetGrade` belongs in `NEVER_MERGED`**, like `grade`. It renders as "Special Grade"
  and stores `special-grade`, so an Obsidian round trip corrupts it otherwise. `obsidian.test.ts`
  walks every kind and caught this the moment the field existed; **any** grade-valued field
  added later needs the same line.
- ⚠️ `ownFields` exposes `targetGrade` **raw** to templates, because only `grade` goes through
  `gradeLabel()` in `common()`. `entityExportContext` overwrites it with the label — without
  that the posting reads "special-grade".
- **The target rolls like any other field, so it locks like any other field.** That is the
  "both, as a toggle" Dan asked for and it needed no new mechanism: roll the board for a
  stranger, or lock the two name fields and re-roll the posting around somebody real. Typing
  into the panel's Target box overrides the rolled name.
- **A fresh roll resets the purse and the target's ranking** to match what rolled, so a new
  posting reads consistently and the gap line stays quiet until somebody creates a gap on
  purpose. Anything typed over them holds until the next roll — the same bargain switching a
  mission's difficulty makes.
- ⚠️ **Bounties do not use the mission economy.** `domain/difficulty.ts` caps mission money at
  50,000 Yen on purpose; a bounty starts near where that ends and runs to millions (Dan, 10 Nov
  2026). `BOUNTY_PURSE` lives in `domain/bounty.ts` and `rollBountyPurse` in
  `generators/rewards.ts`, and **nothing reads across** — `bounty.test.ts` fails if the two
  ranges ever overlap. The amounts are **proposed, not approved**, scaled off the one real
  figure (¥1,000,000 for a Disaster Grade threat).
- **`conspicuousity`, `state` and `pings` are free text with suggestions**, the same bargain
  `clan` and `status` make. One known example of each and no written list anywhere; an invented
  enum would quietly become canon. Pings render `@{ Curse User }` in the Discord posting.
- **Bounty is the fourth kind with a Discord template**, because the server genuinely has that
  format. `exports.test.ts` holds the list.

**Pictures in an export**

`EntityBase.image` holds a file name, so every kind already has a picture; what was missing was
getting it *out*. `exportContext` now derives three keys from it:

- `image` — the bare file name.
- `imagePath` — relative, resolving from `exports/<collection>/<folder>/` back to `images/`.
  ⚠️ Correct for the **default** export folder only: pointed at `Settings.exportDirectory`
  somewhere else, the picture is not beside it and the link dangles. That is a property of
  exporting to an arbitrary directory, not something a cleverer path fixes.
- `imageEmbed` — `![[file]]`, which Obsidian resolves by searching the vault, so it survives
  the note being moved. The Obsidian-facing templates prefer it.

Discord cannot embed a local file from message text, so `bounty.discord.md` **names** the
picture in a spoiler line for Dan to attach rather than pretending to link it.

**Cards and backdrops**

A graphic of a record, made to be posted in a channel. Three kinds: **character** (card,
backdrop), **clan** (card, backdrop) and **mission** (card, backdrop, **briefing** — a tall
poster carrying the whole posting, offered to missions only by `presetsForKind`). The shared
furniture is `domain/card-blocks.ts`, the per-kind layouts are `card-character.ts`,
`card-clan.ts` and `card-mission.ts`, and `card-render.ts` is the one door into all three —
a fourth kind is a case in one switch rather than a change in the hook and the panel as well.

- **Built as SVG, and that bought three things for no dependency** (§10). PNG and JPEG come
  from `canvas.toBlob`, the same canvas `services/images.ts` already uses to downscale a
  portrait. PDF comes from the print dialog the app already drives — "Microsoft Print to PDF"
  is in every Windows print dialog, so a PDF writer would be a dependency bought for nothing
  (§9). And the SVG itself is a vector master that opens in Inkscape, Illustrator or Notepad,
  which is what makes a card editable *after* it leaves the app. A rasterizer such as
  html2canvas would have given the first two and neither of the last.
- ⚠️ **Every colour comes from `ThemeTokens`.** There are no hex literals in the card modules
  and there must not be — a generated graphic can smuggle one in exactly as a component can,
  and it would survive a theme change and look wrong the same way. `card.test.ts` scans the
  output and fails on any `fill`, `stroke` or `stop-color` that is not one of the fourteen
  token values. The `@media print` block stays the only place allowed to name a colour, and a
  card is screen output anyway.
- **Text measurement is injected, not taken.** `domain/` may not touch a canvas, so
  `characterCardSvg` receives a `Measurer`. `services/cards.ts` supplies the real one from a
  2D context's `measureText`, which is exact for the installed face;
  `approximateMeasurer` is the deterministic stand-in for tests and for a plain `npm run dev`
  tab. That is what keeps the layout pure *and* testable.
- **SVG has no text flow**, so `wrapText` breaks a paragraph into `<tspan>` lines itself, hard-
  splitting a word too long for any line and ellipsising at a line budget. ⚠️ It wraps in full
  and *then* clamps: stopping early has to decide mid-loop whether the line in hand is the
  last, which is where the first attempt dropped a line instead of keeping the budget.
- ⚠️ **An SVG loaded into an `Image` renders in an isolated context.** It cannot see the host
  document's stylesheets, so the `@font-face` rules in `styles/index.css` never reach it —
  only fonts *installed on the machine* do. The two vendored faces are webfonts installed
  nowhere, so when one is the chosen face it has to travel inside the document or the
  rasterized card silently falls back to a system sans. `embeddedFontCss` inlines it from the
  bundle via a lazy `?inline` glob, so the 310KB OpenDyslexic pair is not in the startup path
  for anyone using the default sans. Nothing is fetched (§1).
- **The picture is embedded, never linked**, and that is load-bearing twice over: an external
  `href` would taint the canvas and `toBlob` would throw, and a linked file would not travel
  with a shared SVG. Verified end to end in a real browser — 2000×2800, untainted.
- ⚠️ **A `defs` entry has to travel with the markup that references it.** `panelClip` built its
  `<clipPath>` and the document left it out, so `url(#card-panel)` resolved to nothing, the
  browser silently dropped the clip, and the bled picture squared off the panel's rounded
  corners. Silently is the problem: there is no error. `card.test.ts` now walks every `url(#…)`
  and `clip-path` and fails on an id the document does not declare.
- **The crop anchors to the top by default.** The band rarely matches the picture's aspect and
  `slice` crops rather than letterboxes, so something is always lost; centring loses it from
  the top and bottom equally, which decapitates an ordinary portrait. Hence a focus control.
- **The preview is the document, not a picture of one.** The panel drops the same SVG string
  into the page as markup, so what is on screen is byte-for-byte what the SVG export writes and
  what the PNG is drawn from — the bargain `DiscordPreview` already makes for markdown.
- ⚠️ **Nothing on a card calculates a stat.** It prints `character.stats` as typed. The one
  derived value is effective reserves, shown in the accent beside the stored band and never
  written back — the same line §4 draws for the sheet.
- ⚠️ **An export has to say so on screen.** The first version confirmed a write with
  `announce()` alone — the ARIA live region, which is invisible to anyone looking at the
  screen — so a successful export and a dead button were indistinguishable, and the first
  question back was where the files had gone. `useExport` already kept a `lastPath` and a
  reveal button for exactly this; the card panel now does too. Anything that writes a file
  shows the path it wrote.
**Card fonts and colours**

Each kind carries its own style (Dan, 11 Nov 2026) in `Settings.cardStyles`, so a clan banner
can read differently from a character card without dragging the other along. `domain/card-style.ts`.

- **A palette is six colours, not fourteen.** It is a `ThemeSeed` run through the same
  `buildThemeTokens` the app uses, which buys three things at once: the fourteen tokens stay
  internally consistent, `checkThemeContrast` gives the card editor the theme editor's own live
  WCAG readout, and **the layouts needed no change at all** — they already took `ThemeTokens`
  and never knew where those came from.
- ⚠️ **This does not loosen §9's colour rule, and the tests still enforce it.** That rule is
  about colour *literals in the source*, which survive a theme change and look wrong. A palette
  the user picked at runtime is data arriving through the door the theme already used. The card
  modules still cannot name a colour, and `card.test.ts` and `card-kinds.test.ts` still fail on
  one.
- **`followTheme` defaults to true on every kind**, so the day this landed nothing looked
  different. `highContrast` is threaded through whichever seed wins — a custom card palette
  cannot quietly opt out of an accessibility setting, the same way the background-opacity cap
  cannot.
- **Two font slots.** `display` letters names, headings and the grade chip; `body` letters
  values and prose. Emitted as one `.d` class against the document's two declared stacks, not
  as a `font-family` per element.
- ⚠️ **`FONT_STACKS` had to move to `domain/fonts.ts`.** Card styles live in settings, so
  `settings.ts → card-style.ts → settings.ts` was a cycle. Same split as `Clan`; `settings.ts`
  re-exports, so every existing import still resolves.
- ⚠️ **A font slot may name a family installed on this machine, and that string lands inside
  the `<style>` block of a generated SVG.** `safeFamily` whitelists it to letters, digits,
  spaces and hyphens — a quote or a brace would close the declaration and let the rest be read
  as CSS. A whitelist, not a sanitiser, for the same reason `images.rs` whitelists file names.
  Nothing is ever fetched (§1): a local family resolves or falls back to the sans stack.
- A locally-installed font bakes into a PNG or JPEG but **not** into a shared `.svg`, which
  renders with whatever the opener has. The editor says so when a slot holds one.

**Per-kind blocks, and what a graphic must never show**

- **One block id set, three meanings.** `stats` is a character's stat block, a clan's technique
  and bonuses, and a mission's objectives — the same slot in the layout carrying that kind's
  primary list. `CARD_BLOCKS` says which blocks a kind has (only missions have the third list,
  `extra`) and `CARD_BLOCK_LABELS` names them per kind. Generic ids with per-kind labels, rather
  than fifteen ids of which each uses five, because the layouts genuinely share the slots.
- ⚠️ **A mission graphic never shows `trueSituation`, `veil` or `support`.** The Discord export
  wraps those in `||spoilers||` (§9) — but **a picture has no spoiler tags**, so on a graphic
  the only safe thing is to leave them out entirely. `card-kinds.test.ts` asserts it for every
  mission shape, and any GM-only field added later needs the same line.
- ⚠️ **A clan card carries no grade**, §4 again, and the device behind an absent picture is the
  clan's initial rather than an abbreviation. A test walks every grade abbreviation and fails if
  one appears.
- ⚠️ **The footer is pinned to the bottom while blocks stack down from the header**, so enough
  content puts the hosts line straight through the last complication — it did. `fits()` drops a
  block *whole* rather than drawing it over the footer: half a complication under a host handle
  is worse than no complications. A test crams twelve of everything in and asserts nothing is
  drawn past the page.

- Cards are written by `exports::write_card` into a **`cards` subfolder** of the export
  destination, with the record's folder mirrored beneath it: an export folder is often an
  Obsidian vault, and a picture of a record is a different artifact from the note about it.
  The extension is **whitelisted, not sanitised**, for the same reason `images.rs` whitelists
  the names it reads back. PDF is deliberately absent from that list — that route is print.

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

**A crash must not cost the whole screen**

`components/ErrorBoundary.tsx` wraps the routed module (keyed on the module id, so moving away
clears it) and the card panel separately. React unmounts the **entire** tree when a render
throws and nothing catches it, so one bad section took the sidebar, the record and everything
with it: the window went empty, the background image was all that was left, and there was no
message, no stack and nothing to act on. That happened to a character sheet.

Same bargain `tables.rs` makes for a malformed user table (§5): degrade to "this one was
skipped", never to a blank app. The error text is shown rather than swallowed, because the
first question is always *what* broke. It is the one place a class component is allowed —
`componentDidCatch` has no hook equivalent.

⚠️ **A prop rename spans two files, and half of it is worse than none.** `CardSection`'s prop
went from `character` to `subject`. The component was updated and shipped; `CharacterSheet.tsx`,
which passes it, was edited in the same breath but **left out of the write-back**. On the target
machine the new child then read a prop the old parent no longer sent, and the hook got
`undefined`.

Both of 11 Nov 2026's reported faults were that one omission, and nothing else:

- **A character sheet that went blank**, showing only the background image. No boundary existed
  yet, so the `TypeError` unmounted the whole tree.
- **`Cannot read properties of undefined (reading 'kind')`** in the card panel, once the
  boundary was there to catch it.

Two lessons, both about diagnosis rather than code:

- ⚠️ **Verify the write-back, do not assume it.** It reproduced nowhere locally for the obvious
  reason: the local tree was internally consistent and the target's was not. Listing the
  changed files and comparing sizes against the machine takes seconds and would have found it
  immediately. A fault that cannot be reproduced from the same code is evidence the code is
  *not* the same.
- ⚠️ **Do not offer a cause that has not been tested.** "A stale Vite module graph" was proposed
  here, written into this file, and was wrong. It was plausible, it fitted the symptom, and it
  sent the user to restart a dev server twice for nothing. Reproducing the *mechanism* (an
  undefined prop gives exactly that message) is not the same as establishing the *cause*.

`useCard` now throws a sentence naming what is wrong instead of a `TypeError` thirty frames
deep, which is what a guard at an entry point is for.

**Mutations and trait slots**

A `Mutation` carries `usesTraitSlot` (Dan, 11 Nov 2026) — some of them cost a trait slot as
well as Trait Points.

- ⚠️ **It is slot accounting, not a stat, and nothing is stored on the character.**
  `slotTakingMutations(clans, clanName, ids)` resolves the ticked ones and `traitSlotUsage`
  takes the count as an argument; no `Trait` is written into `character.traits`. A trait the
  app invented would double-count the moment Dan typed the same one in by hand — exactly what
  §4 warns about for clan bonuses. Computed where shown, like the members roster and backlinks.
- `domain/problems.ts` gets the clans out of the `records` list it was already handed, so it
  stays pure.
- Additive: a clan saved before the field parses with the box unticked.

⚠️ **A textarea backed by a parsed list must hold its own raw text.** The obvious version —
value derived from the list, re-parsed on every keystroke, blank lines filtered — makes a
newline impossible: pressing Enter gives `"…\n"`, the blank line is dropped, the value
re-renders without it, and the keystroke is undone as fast as it is typed. A second line is
unreachable. **This shipped**, on the clan mutation editor, and Dan hit it. The mechanism lives
in **`useLineBuffer`** (`components/form/fields.tsx`): it holds the raw text locally and sends
only the parsed list upward, taking the model back only when the model says something the text
does not. Use it for every list-in-a-textarea. Two wrappers sit over it — `LinesField` for the
form-field surfaces and `LinesArea` in `routes/clans/RowList.tsx` for the clan rows — because
the two live in differently styled contexts; the *mechanism*, not the markup, is the part that
must never be reimplemented. `AreaCell` is for plain prose.

**Traits and defects**

Two vaults of their own (Dan, 11 Nov 2026), so a trait can be written once and put on any
sheet. `TraitRecord` and `DefectRecord` are entities, which is what buys them folders,
cross-links, search, visibility, print and both export formats with no special-casing — the
same bargain `Lore`, `Curse` and `Clan` made. The rules themselves are in §4.

- ⚠️ **They record. They do not apply.** §4 is unconditional, so picking one onto a sheet
  copies its lines in as text and changes no Class. This is the third surface to draw that
  line, after the clan bonus and slot-taking mutations, and for the same reason: a modifier
  Dan has already typed into a stat must never be counted a second time.
- ⚠️ **A copy, not a link** — his call, and the stronger reason is historical rather than
  technical: a trait on a sheet records what that character *took*. Editing "Eccentric Genius"
  in the vault next year must not rewrite the sheet of someone who took the old wording, and
  deleting it must not empty their build. `traitFromRecord` in `domain/attach.ts` does the
  conversion, beside `techniqueToInnate`, which made the same choice.

**A trait is not a list of effect lines.** It is a description plus a «Bonuses and Drawbacks»
block, and each entry in that block is a `TraitEntry`: a **name** ("Genius", "Severable Bond"),
the text, a bonus/drawback marker, an optional grey **note** under it, and an optional
**condition** grouping it under its own heading.

- ⚠️ **The bonus/drawback marker is stored, never read off the text.** This is the whole reason
  a `ClanModifier` could not be reused: `modifier()` decides direction from a leading + or −,
  and half the server's own entries carry neither. *Supervision — "every member of your team can
  receive one re-roll"* is a green bonus with no plus in it; *Quirky — "you must have one quirk
  of some kind"* is a red drawback with no minus. Inferring would colour both wrong. The editor
  toggles it with a button and `traits.test.ts` pins it.
- A **condition** is a string on each entry, not a nested list — "Whenever Alone (Team of One)",
  which Corrective Authority genuinely has. Flat means an entry moves between blocks by typing
  and nothing has to be restructured to add one; `entryGroups()` does the grouping, main block
  first.
- A third block, `➤『REQUIREMENTS』`, is **`requirements: string[]`** — a list, not a line.
  Biological Blueprint has two bullets and one of them is conditional on how the trait was
  acquired ("If Developed: Must have a heavily scrutinized reason"), which a single field would
  run together. The parser reads an older `prerequisite` string into a one-item list, so a file
  written before this reads fine.
- Bonuses and drawbacks export as **two lists**, not one. On paper and in Obsidian there is no
  colour to carry the distinction, so merging them would lose the shape of the block entirely.

**What the rarity decides.**

- The six rungs and their prices are **fixed in `domain/traits.ts`**, not editable in Settings
  (Dan, 11 Nov 2026) — the same standing as the grade ladder, and unlike the mission difficulty
  tiers, which a GM tunes. The server sets the price; the app only quotes it. The editor offers
  them as a dropdown.
- ⚠️ **`TraitRecord` has no `tpCost` field at all.** The cost is read back through
  `traitCost()`, so a saved record can never disagree with the published table. A `DefectRecord`
  *does* have one, free text, because the defect rules do not exist yet.
- Legendary and Extraordinary need Admin and Owner permission plus a roleplay sample;
  `rarityPermissionNote()` writes that sentence once, for the panel and both templates.
- ⚠️ **Every derived field belongs in `NEVER_MERGED`** (`obsidian-merge.ts`): `rarity` reads
  "Exotic" and stores `exotic`, exactly the trap `grade` is, and `cost`, `slot`, `acquisition`
  and `permission` are all sentences built from a non-string field. `mergeKind` skips most of
  them today only because no property of that name holds a string — an accident of the key, not
  a guarantee.

**The rest of the shape.**

- **Two kinds, not one with a polarity flag.** Separate folders on disk and separate boards on
  screen. They share `TraitLike` for what is genuinely common, and one parameterised hook and
  one parameterised board serve both — a second copy of either would be a field added to one
  surface and forgotten on the other, with nothing to catch it. That is the `CardSection` prop
  bug waiting to happen again. The *editor* is split into `TraitEditor.tsx` purely for length.
- ⚠️ **They are the third and fourth ungraded kinds**, after lore and clans. `entityGrade()` is
  a written-out `switch` rather than a lookup in a list, because `UNGRADED.includes(kind)` does
  not narrow the union and `entity.grade` then fails to typecheck — the compiler doing exactly
  the job that function exists to do. Do not "tidy" it into an array.
- ⚠️ **`usesTraitSlot` defaults the other way for a defect**, in both the constructor and the
  parser: a trait spends a slot, a defect hands points back. `traits.test.ts` pins that the two
  agree, because a hand-written file that omits the field must mean the same thing either way.
- ⚠️ **The copied notes are one line, not three.** A character's `Trait.notes` is shown in a
  single-line input, so newlines in it are invisible — the first version put
  "Cost: 6 TPSource: Background" on screen while looking perfectly correct in the data. The
  test pins the separator, not just the content.
- **The picker reads its collection when opened**, rather than through a provider.
  `ClansProvider` exists because three surfaces resolve a bonus against the same clans; this is
  one surface and one click, so a `TraitsProvider` would be machinery bought for nothing.
- **No generator**, as asked. A rolled perk is not a thing anybody wants, and §4 forbids the app
  deciding mechanics anyway. `createTrait` is the constructor, beside `createLore`.
- **No card layout.** `EntityDetail` offers the card panel to clans and missions only, and
  `CardSubject` is typed to the three kinds that have one — so there is nothing to gate.
- The glyphs are a cut gem and the same stone split. ⚠️ The first attempt drew a rounded
  rectangle with a peak inside it, which is the missing-image icon every app uses, so a trait
  card looked like a broken portrait. A glyph only works if it reads as its own thing at 14px.
- ⚠️ **No `w-full` in the entry editor's shared field class.** Two width utilities of equal
  specificity are decided by the order Tailwind *emits* them, not the order they sit in the
  attribute, so `${FIELD} w-40` left the name box full width and squeezed the effect box to
  nothing. Widths are set per input there.

**Dan's ten traits are seeded** (`domain/trait-seed.ts`): Eccentric Genius, Perfect Vessel,
Jujutsu Prodigy, Infamous and Medic (Extraordinary), Shikigami Master (Legendary), Corrective
Authority (Rare), Hard Worker (Uncommon), and Biological Blueprint and Waste Not (Basic),
written into the traits collection as he supplies them. Ids are derived from the name, so
seeding twice can only ever write the same files.

- ⚠️ **Seeded per id, NOT "only when the collection is empty" — and that distinction is a bug
  that shipped.** The first version copied `masamiSeed`'s guard, which is right for a clan (one
  record, written once) and wrong for a list that grows in batches. The day six more traits were
  added to the code the folder already held four, so the whole seed skipped and none of the six
  ever appeared. Dan ran it and they were not there.
- The decision is **`missingSeeds()` in `trait-seed.ts`** — pure, and tested for exactly that
  case. It lived inside the hook as `found.length === 0`, where nothing could catch it, because
  hooks are not unit-tested (§9). Logic that decides whether to write to disk belongs in
  `domain/` for that reason alone.
- Three conditions, each load-bearing: **not already on disk** (never overwrite a record he has
  edited), **not already recorded in `Settings.seededTraits`** (one he deleted on purpose stays
  deleted — which is what a plain "write whatever is missing" would silently resurrect, every
  time he opened the board), and **nothing in the collection failed to parse** (the one guard
  worth keeping from the clan version: writing into a folder whose bad file is being skipped
  would look exactly like losing it).
- `Settings.seededTraits` records every seed id, the ones already on disk included. Absent from
  an older `config.json`, it parses as none recorded, and the on-disk check is what stops the
  four already there being overwritten on the upgrade.
- ⚠️ **The board says what it wrote**, in a dismissible line — not only through `announce()`.
  Same lesson as the card export: a write nobody can see is indistinguishable from a dead
  button, and this one went unnoticed for exactly that reason the first time.

- ⚠️ **Transcribed, not corrected.** "untill", "schitzophrenia", "supress", "by staf" and the
  rest are reproduced as the server writes them, and tests pin several of them. The vault should say what the server
  says; silently fixing the spelling would make the two disagree in a way nobody would notice.
- They are **records in his vault, not entries in `data/canon/`**, for the same reason the
  Masami clan is: every file in `data/canon/` is parsed as a roll table, and nothing rolls a
  trait. Once written they are ordinary records — edit, rename or delete them.
- ⚠️ **A broken Discord reference is not content.** Medic's *Specialist* line is followed on
  screen by "see # unknown" — Discord failing to resolve a channel link, not something Dan
  wrote. It was left out rather than transcribed as if it were text. Several traits also point
  at other traits in prose ("You have the Soul Perception trait", "See: Mutated Body"); those
  stay as written, because the targets are not in the vault and a cross-link to nothing would
  dangle.
- A test asserts the **drawback markers for all ten**, by name. A mis-transcribed marker is
  otherwise a green line nobody notices.

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

**Shipping it — two architectures, one tag**

Staff test on ordinary x64 laptops; Dan develops on ARM64. Both installers are built by
GitHub Actions and attached to the same Release, so there is one place to download from and
no chance of the two drifting apart.

- ⚠️ **CI is a build pipeline, not a feature of the app.** §1 is untouched: the app still
  makes no network calls, carries no telemetry and syncs nothing. A workflow that compiles the
  app is not the app phoning home, and the distinction is worth keeping clear if anyone asks.
- **`npm run release 0.4.0`** does the whole thing — sets the version in all three files that
  carry one, commits, tags `v0.4.0`, pushes. The tag push is what starts the build. It refuses
  to run on a dirty tree, off `main`, or onto a tag that already exists, because each of those
  produces a release that does not match anything anybody can check out.
- **The version lives in three files** — `package.json`, `src-tauri/Cargo.toml`,
  `src-tauri/tauri.conf.json` — and nothing keeps them in step. `scripts/set-version.mjs`
  writes all three or none, and the Cargo edit is anchored to `[package]` so a dependency pin
  is never hit. `Cargo.lock` catches up on the next build.
- **`.github/workflows/release.yml`** runs a two-entry matrix: `windows-latest` for
  `x86_64-pc-windows-msvc`, and `windows-11-vs2026-arm` for `aarch64-pc-windows-msvc`. That
  ARM label went generally available in August 2026; the older preview label was
  `windows-11-arm`. `fail-fast: false`, so a broken ARM build still leaves staff something x64
  to test.
- ⚠️ **`npm install`, never `npm ci`, in CI.** Rollup and Tailwind ship their native binaries
  as per-platform optional dependencies, and a lockfile generated on one architecture can omit
  the others — the same npm behaviour `.gitignore` already warns about. `npm ci` would install
  that lockfile faithfully and then fail with no binary for the machine it is on.
- **NSIS only, both architectures.** MSI is WiX, and WiX does not do ARM64, so `targets: "all"`
  would fail half the matrix. One installer format also means one set of instructions for
  staff. `--bundles nsis,msi` on the x64 job is the change if a managed deployment ever needs
  the MSI.
- **The Release is drafted, not published.** Both jobs attach to it; publishing is a human
  looking at the page and seeing two installers before anyone downloads one.
- ⚠️ **The installers are unsigned**, so Windows SmartScreen warns on first run — *More info →
  Run anyway*. The release notes say so. A signing certificate is the only real fix and costs
  real money; until then, tell staff before they download rather than after.
- **`.github/workflows/ci.yml`** is deliberately not a build: typecheck and tests on Ubuntu,
  on every push, in well under a minute. Compiling Rust twice belongs on a tag.

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
| **3.9** | The trait and defect vaults. ✅ Two entity kinds of their own, two boards, and a picker on the character sheet that **copies** a record onto a build rather than linking it — so editing the vault later cannot rewrite somebody's sheet, and nothing applies a Class (§4, a third time). Then Dan supplied the real rules, so the schema was reshaped before anything was saved to those folders: six rarities with fixed TP costs, Inherent/Developed, and a trait's «Bonuses and Drawbacks» as **named entries** with a stored bonus/drawback marker — which is what a `ClanModifier` could not carry, since half the server's own entries have no sign to read. Conditional blocks, both export formats, and his four traits seeded in verbatim. |
| **3.8** | Clan and mission graphics, and card styling. ✅ Clan cards and backdrops, mission cards and a tall **briefing**, all through one `card-render.ts`. Each kind gained its own fonts and colours in Settings — a six-colour palette through the existing theme engine, so the live WCAG readout came free and the no-hardcoded-colour rule is untouched — plus display and body font slots that accept any font installed on the machine. Per-kind block sets, GM-only mission lines kept off every graphic, and a floor that stops content colliding with the footer. |
| **3.7** | Graphics. ✅ Character cards and backdrops, built as SVG so PNG and JPEG come from the canvas already in the repo, PDF from the print dialog, and the SVG itself is an editable vector master — no dependency added. Discord's own proportions, a live preview that is the document rather than a picture of it, and in-app controls for shape, picture focus, title and which blocks show. Clan and mission cards reuse `card-blocks.ts`. |
| **3.6** | Bounties. ✅ A new entity and generator in the server's own posting format: two grades (the threat it is posted at, and what the target is actually ranked), free-text Conspicuousity / State / Pings, rolled objectives and a **separate economy** running to millions rather than the mission cap. The target rolls like any other field, so locking it is the "roll around somebody real" toggle. 74 proposed canon entries, both export formats, and pictures now come out in an export at all — `imagePath` for markdown, `imageEmbed` for Obsidian, and a named attachment line for Discord. |
| **3.5** | Black Flash. ✅ A derived reading of the stat block while one lands — +2 Grades to Strength (+1 from Semi-Special Grade up, on the character's grade), +1 Class to everything for five turns, reserves excluded — shown beside the real stats and never written back. Plus a dated Black Flash log on the sheet, in the printed sheet and both export formats. **No damage figure**, deliberately. |
| **3.4** | Effective reserves and the Ten Shadows rework. ✅ A derived reserves band — one stage per grade CE Efficiency sits above CE Output (§4) — shown on the sheet, the printed sheet and both export formats, and never written back. Shikigami gained a stat block of their own and a free-text addendum, and Dan's Ten Shadows rework went into the vault: ten shikigami, each with its full stat block, the "+" reserves and the Dura Neg lines kept verbatim. |
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

**Batch 8** (10 Nov 2026) is the bounty tables — `bounty.crime` (24), `bounty.briefing` (16),
`bounty.warning` (14), `bounty.objective` (12) and `bounty.issuer` (8): **74 entries**, canon
now **1,869**. Grade-filtered where a charge only makes sense at a grade — a clan slaughter is
not a Grade 4 crime. **Proposed, not approved.**

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
