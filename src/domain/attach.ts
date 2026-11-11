/**
 * Writing a saved record onto a vault character.
 *
 * A `Technique` entity carries more than a character's `innateTechnique` has room for — cost,
 * limitation, tell, and a shikigami household. Rather than drop those on the floor, the ones
 * without a home are appended to the description as a short labelled tail, so nothing from the
 * roll is lost and Dan can delete any line he does not want.
 *
 * Pure. Nothing here touches the stat block: a technique does not change a grade or a class
 * (CLAUDE.md §4 — the app does not calculate stats).
 */

import type { Character, InnateTechnique, Trait } from './character';
import type { Technique } from './entities';
import { entryLine, rarityLabel, traitCost, type TraitEntity } from './traits';

function paragraphs(parts: readonly string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join('\n\n');
}

/** The extra fields, as `Label: value` lines. Empty when the technique carries none. */
function tail(technique: Technique): string {
  const lines = [
    technique.cost ? `Cost: ${technique.cost}` : '',
    technique.limitation ? `Limitation: ${technique.limitation}` : '',
    technique.tell ? `Tell: ${technique.tell}` : '',
    technique.shikigami.length > 0
      ? `Shikigami: ${technique.shikigami
          .map((s) => [s.name || 'Unnamed', s.form].filter(Boolean).join(' — '))
          .join('; ')}`
      : '',
  ].filter(Boolean);

  return lines.join('\n');
}

export function techniqueToInnate(technique: Technique): InnateTechnique {
  return {
    name: technique.name,
    description: paragraphs([technique.principle, technique.application, tail(technique)]),
    extensions: technique.extensions,
    maximum: technique.maximum,
    domainExpansion: technique.domain,
  };
}

/** True when attaching would overwrite something the character already has. */
export function hasInnateTechnique(character: Character): boolean {
  const { name, description, extensions, maximum, domainExpansion } = character.innateTechnique;
  return Boolean(
    name.trim() || description.trim() || extensions.length > 0 || maximum.trim() || domainExpansion.trim(),
  );
}

/**
 * Replace the character's innate technique. `now` is injected so this stays pure and the caller
 * owns the clock.
 */
export function attachTechnique(
  character: Character,
  technique: Technique,
  now: string,
): Character {
  return {
    ...character,
    innateTechnique: techniqueToInnate(technique),
    updatedAt: now,
  };
}

/**
 * A vault trait or defect, as a line on a sheet.
 *
 * ⚠️ **A copy, not a link** (Dan, 11 Nov 2026) — the same choice `attachTechnique` makes, and
 * for a stronger reason here: a trait is a *historical* record of what this character took.
 * Editing "Masami Bonus" in the vault next year must not silently rewrite the sheet of someone
 * who took the old version, and deleting it must not empty their build. So the text travels and
 * the record is left behind.
 *
 * `effect` is the vault record's lines joined with a comma, because a character's `Trait.effect`
 * is one free-text field. Nothing is applied: §4 is unconditional, and Dan sets the resulting
 * Class himself in the Stats section.
 *
 * `id` is injected so this stays pure and the caller owns the clock.
 */
export function traitFromRecord(entry: TraitEntity, id: string): Trait {
  // Named entries flattened to one field, because a character's `Trait.effect` is one line of
  // free text. The names are kept rather than dropped — "Genius: +2 Grades to Perception" is
  // what the sheet should say, not a bare modifier with no idea which bonus it came from.
  const effect = entry.entries.map(entryLine).filter(Boolean).join('; ');

  return {
    id,
    name: entry.name,
    effect,
    // What the vault knows and a sheet line has nowhere else to put. Kept rather than dropped,
    // the same bargain `tail()` makes above.
    //
    // ⚠️ One line, not three. A character's `notes` is shown in a single-line input on the
    // sheet, so newlines here are invisible: the first version produced "Cost: 6 TPSource:
    // Background" on screen while looking perfectly correct in the data.
    notes: [
      entry.kind === 'trait' ? `${rarityLabel(entry.rarity)} — ${traitCost(entry)}` : '',
      entry.kind === 'defect' && entry.tpCost ? `Cost: ${entry.tpCost}` : '',
      entry.source ? `Source: ${entry.source}` : '',
      entry.requirements.length > 0 ? `Requires: ${entry.requirements.join('; ')}` : '',
    ]
      .filter(Boolean)
      .join(' \u00b7 '),
  };
}

/** Whether a sheet already carries a line of this name, so the picker can say so. */
export function alreadyCarries(lines: readonly Trait[], name: string): boolean {
  const wanted = name.trim().toLowerCase();
  return wanted.length > 0 && lines.some((line) => line.name.trim().toLowerCase() === wanted);
}
