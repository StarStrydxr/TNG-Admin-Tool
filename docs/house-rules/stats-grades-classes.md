# House Rules — Stats, Grades and Classes

**Source:** Dan's JJK Discord RP server rules channel, Walker Masami's stat block as the worked
example, plus Dan's direct clarifications (2026-10-28). Screenshots in `source/`.
**Status:** Authoritative for this project. Supersedes JJK canon and anything from the 5e module
wherever the two disagree.

---

## 1. Design philosophy

> "Stats are NOT the defining factor in a fight. Powerscaling is cringe, so stats are only used as
> a requirement for certain things or as a reference. Your technique, how you apply it and your
> opponent's reaction all contribute to the effectiveness of a given action, stats do not define
> actions. In the same way, techniques can often massively amplify the destructive power of an
> attack without necessarily specifying an output increase."

**Implementation consequence:** stats are a *reference notation*, not a combat engine.

- ✅ Display stats. Store them. Let generators assign a Grade. Filter and sort by them.
- ✅ Use them as gates ("this technique requires Grade 2 or above").
- ❌ **No damage calculator, win-probability tool, or "who would win" comparison.** This is an
  explicit cultural rule of the server, not a missing feature.
- ❌ **No stat calculator either** — see §6.

---

## 2. The grade ladder

Every rung is **one grade gap** from its neighbours. One gap = **×2 power**.

Grades in bold are named by the server. Grades in *italics* are **implied rungs** — they exist
mechanically but the server "doesn't bother to note them down."

| Rank | Grade | Abbrev | Listed? |
| ---: | --- | --- | --- |
| — | **Civilian Grade** | `CIV` | floor |
| 0 | **Grade 4** | `G4` | ✅ |
| 1 | **Grade 3** | `G3` | ✅ |
| 2 | **Grade Semi-2** | `S-G2` | ✅ |
| 3 | **Grade 2** | `G2` | ✅ |
| 4 | **Grade Semi-1** | `S-G1` | ✅ |
| 5 | **Grade 1** | `G1` | ✅ |
| 6 | *Semi-Special Grade* | `S-SG` | implied |
| 7 | **Special Grade** | `SG` | ✅ |
| 8 | **Disaster Grade** | `DG` | ✅ |
| 9 | *Semi-Calamity Grade* | `S-CG` | implied |
| 10 | **Calamity Grade** | `CG` | ✅ |
| 11 | *Demi-Apocalypse Grade* | `D-AG` | implied |
| 12 | *Semi-Apocalypse Grade* | `S-AG` | implied |
| 13 | **Apocalypse Grade** | `AG` | ✅ |

### Gaps

Each gap is **measured from the last named grade**.

| Transition | Gap |
| --- | ---: |
| Grade 4 → Grade 3 → Grade Semi-2 → Grade 2 → Grade Semi-1 → Grade 1 | 1 each |
| **Grade 1 → Special Grade** | **2** |
| Special Grade → Disaster Grade | 1 |
| **Disaster Grade → Calamity Grade** | **2** |
| **Calamity Grade → Apocalypse Grade** | **3** |

### Semi / Demi naming — confirmed

- A **gap of 2** inserts one implied rung: `Semi-<grade>`.
- A **gap of 3** inserts two, **in the order `Demi-<grade>` then `Semi-<grade>`**.

So the 3-gap above Calamity reads: `Calamity → Demi-Apocalypse → Semi-Apocalypse → Apocalypse`.
Confirmed directly by Dan — this is no longer an inference.

### Power comparison

```
powerRatio(a, b) = 2 ** (rank(a) - rank(b))
```

Apocalypse Grade is 2¹³ ≈ **8,192×** Grade 4. Reference/display only — see §1.

---

## 3. Notation

```
G1[C3]        usual form — Grade 1, Class 3
S-SG[C1]      Semi-Special Grade, Class One
```

The long form `Grade 1 [Class 3]` also appears. Short form in dense views, long form on the sheet.

> ⚠️ Abbreviations for grades other than `G1`, `SG` and `S-SG` are **proposed, not taken from the
> server.** Note the `DG` (Disaster) / `D-AG` (Demi-Apocalypse) near-collision when confirming.

---

## 4. Class scale

**Classes run 1–5. 1 is the HIGHEST, 5 is the LOWEST.** Inverted from most systems — do not sort
ascending by accident.

| Class | Meaning |
| --- | --- |
| **Class 1** | Exceptional, borderlining the next grade |
| **Class 2** | Above average |
| **Class 3** | Average *(default)* |
| **Class 4** | Still below average but much closer to it |
| **Class 5** | Just barely clearing the hurdle to the given grade |

---

## 5. The stat list

Eight stats, from Walker Masami's sheet:

| Stat | Type |
| --- | --- |
| CE Output | graded |
| CE Control | graded |
| **CE Reserves** | **descriptive band — NOT graded** |
| CE Efficiency | graded |
| Perception | graded |
| Strength | graded |
| Speed | graded |
| Fortitude | graded |

**`CE Reserves` is a different kind of stat.** It takes a descriptive band, not a `Grade[Class]`
pair, so it is modelled separately from the seven graded stats.

Bands, shallowest first:

| # | Band |
| ---: | --- |
| 1 | Shallow |
| 2 | Average |
| 3 | Deep |
| 4 | Bottomless |
| 5 | Abysmal |
| 6 | Endless |

`Abysmal` here means *abyssally deep*, not *poor* — it sits second from the top. Worth a tooltip
in the UI, since the everyday sense of the word points the other way.

---

## 6. Stat arithmetic

### 🚫 The app does not compute this

Per Dan: *"The stats don't need to be calculated, just a gen of the grade works because C3 is the
average, and traits and defects affect the classes. These I will decide manually."*

So the application:

- generates **a Grade only**;
- defaults all seven graded stats to `<grade>[C3]`;
- makes each stat **directly editable**;
- **never** derives a stat from a trait list, and never auto-recalculates.

The rules below are recorded because they are true of the system and useful for validating
hand-entered values or explaining one in a tooltip. They are **not** an engine to run.

### The rules

1. Every stat starts at **the character's own Grade, Class 3**.
2. Traits and defects modify in **Grades** and **Classes**, either sign.
3. **5 Classes = 1 Grade rung.**
4. **Class overflow carries.** Up past `C1` moves to the next rung at `C5`; down past `C5` moves
   to the previous rung at `C1`.
5. `+N Grades` moves N rungs up the ladder in §2, **implied rungs included**.
6. A sheet shows the **final value**, with modifiers listed after it as the derivation.
7. **Floor:** anything pushed below `G4[C5]` becomes **Civilian Grade** in that stat.

### Reference implementation

Collapse grade and class into one linear `tier`, and every modifier becomes plain addition —
**1 Class = +1 tier, 1 Grade = +5 tiers**:

```ts
tier  = rank * 5 + (5 - classNumber)
rank  = Math.floor(tier / 5)
class = 5 - (tier % 5)
```

### Verification

**Walker Masami**, Grade 1 — base `G1[C3]`, tier 27:

| Stat | Modifiers | Computed | Sheet says | ✓ |
| --- | --- | --- | --- | --- |
| CE Output | — | `G1[C3]` | `G1[C3]` | ✅ |
| CE Control | +1 Gr, +2 Cl, +2 Cl | 27+5+4 = 36 → `SG[C4]` | `SG[C4]` | ✅ |
| CE Efficiency | +1 Gr, +1 Gr, +2 Cl | 27+10+2 = 39 → `SG[C1]` | `SG[C1]` | ✅ |
| Perception | +2 Grades | 27+10 = 37 → `SG[C3]` | `SG[C3]` | ✅ |
| Strength | −2 Classes | 27−2 = 25 → `G1[C5]` | `G1[C5]` | ✅ |
| Speed | +2 Classes | 27+2 = 29 → `G1[C1]` | `G1[C1]` | ✅ |
| Fortitude | — | `G1[C3]` | `G1[C3]` | ✅ |

**Dan's carry example**, given independently: `G4[C1] +2 Classes` → tier 4+2 = 6 → rank 1,
class 4 → **`G3[C4]`**. Matches his stated answer exactly.

CE Control is the strongest evidence that implied rungs are real: its four Class bonuses carry it
off the top of Grade 1 onto Semi-Special Grade, and only *then* does `+1 Grade` take it to Special
Grade. Without the implied rung it would land a grade short.

---

## 7. Traits, Arts, slots and awakenings

Characters hold **traits** and **arts**, each limited by **slots**. Slot counts depend on **grade**
and **awakenings**.

> Known anchor: **Grade One = base 3 trait slots / 3 art slots** ("3/3").

Traits supply the Class modifiers. Attested from Walker Masami's sheet:

| Trait | Grants |
| --- | --- |
| Eccentric Genius | +1 Grade (CE Control), +1 Grade (CE Efficiency), +2 Grades (Perception) |
| Hard Worker | +2 Classes (CE Control) |
| Corrective Authority | +2 Classes (CE Control) |
| Masami Mutation | +1 Grade (CE Efficiency) |
| Masami Bonus | +2 Classes (CE Efficiency), −2 Classes (Strength), +2 Classes (Speed) |

Structural observations:

- A single trait can modify **several stats by different amounts** (Eccentric Genius).
- A trait can be a **mixed blessing** — Masami Bonus gives Speed and Efficiency, costs Strength.
- Sources appear to span clan (`Masami Bonus`, `Masami Mutation`), background or personality
  (`Eccentric Genius`, `Hard Worker`), and position (`Corrective Authority`).
- **Defects** exist alongside traits and push Classes down.

> ⚠️ **Deferred — Dan will supply later:** the full slot formula across grades and awakenings,
> what an awakening is structurally, and what distinguishes an art from an innate technique.

---

## 8. Still open

1. **Does Civilian Grade subdivide into Classes**, or is it a flat floor?
2. **Ceiling behaviour** — anything above `AG[C1]`?
3. **Abbreviations** for grades other than `G1` / `SG` / `S-SG`.
4. **Arts vs innate techniques** — what's the distinction?
5. Whether grade and class change in play, and how promotion works.

Explicitly deferred by Dan: the trait/art slot formula, awakenings, and **binding vows**
("much later").
